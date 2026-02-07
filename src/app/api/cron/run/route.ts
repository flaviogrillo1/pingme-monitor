import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { fetchAndParse, extractSelectorText, generateHash, evaluateCondition } from '@/lib/utils/checking-engine';
import { sendMonitorTriggerEmail } from '@/lib/db/resend';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    let processedCount = 0;
    let triggeredCount = 0;
    let errorCount = 0;

    // Get monitors due for checking
    const now = new Date().toISOString();
    const { data: monitors, error: fetchError } = await supabaseAdmin
      .from('monitors')
      .select(`
        *,
        conditions:monitor_conditions(*),
        user:user_id,
        subscription:subscription_state(plan)
      `)
      .eq('is_active', true)
      .lte('next_check_at', now)
      .limit(50); // Process max 50 at a time

    if (fetchError) {
      console.error('Error fetching monitors:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch monitors' }, { status: 500 });
    }

    if (!monitors || monitors.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        triggered: 0,
        errors: 0,
        duration: Date.now() - startTime,
      });
    }

    // Process each monitor
    for (const monitor of monitors as any[]) {
      try {
        processedCount++;

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

          errorCount++;
          continue;
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
        const needsSelector = monitor.conditions.some((c: any) =>
          c.type === 'STATUS_CHANGE' || c.type === 'SELECTOR_CHANGE'
        );

        if (needsSelector && checkResult.content) {
          // Use auto selector for status
          const statusSelector = monitor.conditions.find((c: any) => c.type === 'STATUS_CHANGE')?.config?.status_selector;
          const selector = statusSelector || 'h1, title, .status, [class*="status"]';
          const selectorText = extractSelectorText(checkResult.content, selector);
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

        for (const condition of monitor.conditions) {
          const evaluation = evaluateCondition(
            condition,
            previousSnapshot,
            currentData
          );

          if (evaluation.triggered) {
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
              triggered = true;
              triggeredCount++;

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

              // Get user email
              const { data: userData } = await supabaseAdmin.auth.admin.getUserById(monitor.user_id);
              const userEmail = userData.user?.email;

              if (userEmail) {
                // Send email
                await sendMonitorTriggerEmail({
                  to: userEmail,
                  monitorName: monitor.name,
                  monitorId: monitor.id,
                  url: monitor.url,
                  condition: evaluation.reason,
                  timestamp: new Date().toLocaleString(),
                  before: evaluation.before,
                  after: evaluation.after,
                }).catch(err => {
                  console.error('Failed to send email:', err);
                });
              }

              break;
            }
          }
        }

        // Update monitor
        await supabaseAdmin
          .from('monitors')
          .update({
            last_check_at: new Date().toISOString(),
            last_status: triggered ? 'TRIGGERED' : 'OK',
            last_error: null,
            next_check_at: new Date(Date.now() + monitor.check_interval_minutes * 60 * 1000).toISOString(),
          })
          .eq('id', monitor.id);

      } catch (err) {
        console.error(`Error processing monitor ${monitor.id}:`, err);
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processed: processedCount,
      triggered: triggeredCount,
      errors: errorCount,
      duration,
    });
  } catch (error: unknown) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron execution failed' },
      { status: 500 }
    );
  }
}
