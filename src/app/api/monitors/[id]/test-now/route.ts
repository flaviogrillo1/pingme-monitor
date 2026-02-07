import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { fetchAndParse, extractSelectorText, generateHash, evaluateCondition } from '@/lib/utils/checking-engine';

interface RouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get monitor
    const { data: monitor, error: monitorError } = await supabaseAdmin
      .from('monitors')
      .select(`
        *,
        conditions:monitor_conditions(*)
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (monitorError || !monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });
    }

    // Rate limit: max 5 manual checks per hour per monitor
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const { count: recentChecks } = await supabaseAdmin
      .from('monitor_checks')
      .select('*', { count: 'exact', head: true })
      .eq('monitor_id', monitor.id)
      .gte('checked_at', oneHourAgo.toISOString());

    if (recentChecks && recentChecks >= 5) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: maximum 5 manual checks per hour' },
        { status: 429 }
      );
    }

    // Fetch URL
    const checkResult = await fetchAndParse(monitor.url);

    // Save check result
    await supabaseAdmin.from('monitor_checks').insert({
      monitor_id: monitor.id,
      checked_at: new Date().toISOString(),
      result: checkResult.success ? 'OK' : 'ERROR',
      details: {
        statusCode: checkResult.statusCode,
        latency: checkResult.latency,
        error: checkResult.error,
      },
    });

    if (!checkResult.success || !checkResult.plainText) {
      // Update monitor with error
      await supabaseAdmin
        .from('monitors')
        .update({
          last_check_at: new Date().toISOString(),
          last_status: 'ERROR',
          last_error: checkResult.error,
        })
        .eq('id', monitor.id);

      return NextResponse.json({
        success: false,
        error: checkResult.error,
      });
    }

    // Get previous snapshot
    const { data: previousSnapshot } = await supabaseAdmin
      .from('monitor_snapshots')
      .select('*')
      .eq('monitor_id', monitor.id)
      .order('observed_at', { ascending: false })
      .limit(1)
      .single();

    // Extract data based on conditions
    const currentData: Record<string, string> = {
      plainText: checkResult.plainText,
    };

    // Check if any condition needs selector
    const needsSelector = monitor.conditions.some(c => c.type === 'STATUS_CHANGE' || c.type === 'SELECTOR_CHANGE');

    if (needsSelector) {
      // Use auto selector for status (first h1, title, or specific class)
      const statusSelector = monitor.conditions.find(c => c.type === 'STATUS_CHANGE')?.config.status_selector as string | undefined;
      const selector = statusSelector || 'h1, title, .status, [class*="status"]';
      const selectorText = extractSelectorText(checkResult.content || '', selector);
      if (selectorText) {
        currentData.selectorText = selectorText;
      }
    }

    // Save snapshot
    const contentHash = generateHash(checkResult.plainText);
    await supabaseAdmin.from('monitor_snapshots').insert({
      monitor_id: monitor.id,
      observed_at: new Date().toISOString(),
      content_hash: contentHash,
      extracted_status: currentData.selectorText || null,
      extracted_selector_text: currentData.selectorText || null,
      extracted_plain_text_preview: checkResult.plainText.substring(0, 2000),
      raw_excerpt: checkResult.content?.substring(0, 2000) || null,
    });

    // Evaluate conditions
    let triggered = false;
    let triggeredReason = '';
    let triggeredData: Record<string, unknown> = {};

    for (const condition of monitor.conditions) {
      const evaluation = evaluateCondition(
        condition,
        previousSnapshot,
        currentData
      );

      if (evaluation.triggered) {
        triggered = true;
        triggeredReason = evaluation.reason;

        // Check cooldown
        const cooldownEndsAt = new Date(Date.now() - monitor.cooldown_minutes * 60 * 1000);
        const { data: lastEvent } = await supabaseAdmin
          .from('monitor_events')
          .select('*')
          .eq('monitor_id', monitor.id)
          .eq('type', 'TRIGGERED')
          .gte('event_at', cooldownEndsAt.toISOString())
          .order('event_at', { ascending: false })
          .limit(1)
          .single();

        if (!lastEvent) {
          // Create event
          await supabaseAdmin.from('monitor_events').insert({
            monitor_id: monitor.id,
            event_at: new Date().toISOString(),
            type: 'TRIGGERED',
            reason: evaluation.reason,
            payload: {
              before: evaluation.before,
              after: evaluation.after,
              condition_id: condition.id,
            },
          });

          // TODO: Send email (implement in cron, not here for manual checks)
        }

        triggeredData = {
          conditionId: condition.id,
          before: evaluation.before,
          after: evaluation.after,
        };
        break;
      }
    }

    // Update monitor
    await supabaseAdmin
      .from('monitors')
      .update({
        last_check_at: new Date().toISOString(),
        last_status: triggered ? 'TRIGGERED' : 'OK',
        last_error: null,
      })
      .eq('id', monitor.id);

    return NextResponse.json({
      success: true,
      triggered,
      reason: triggeredReason,
      data: triggeredData,
    });
  } catch (error: unknown) {
    console.error('Error testing monitor:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to test monitor' },
      { status: 500 }
    );
  }
}
