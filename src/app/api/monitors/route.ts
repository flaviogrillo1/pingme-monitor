import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createMonitorSchema } from '@/lib/validators/monitors';
import { supabaseAdmin } from '@/lib/db/supabase';
import { PLAN_LIMITS } from '@/lib/db/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: monitors, error } = await supabaseAdmin
      .from('monitors')
      .select(`
        *,
        conditions:monitor_conditions(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ monitors });
  } catch (error: unknown) {
    console.error('Error fetching monitors:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch monitors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createMonitorSchema.parse(body);

    // Get user's subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscription_state')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    const plan = (subscription?.plan as 'FREE' | 'PRO') || 'FREE';
    const limits = PLAN_LIMITS[plan];

    // Count current monitors
    const { count: currentMonitors } = await supabaseAdmin
      .from('monitors')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Enforce plan limits
    if (currentMonitors && currentMonitors >= limits.maxMonitors) {
      return NextResponse.json(
        { error: `Your ${plan} plan allows maximum ${limits.maxMonitors} monitors` },
        { status: 403 }
      );
    }

    if (validatedData.check_interval_minutes < limits.minIntervalMinutes) {
      return NextResponse.json(
        { error: `Your ${plan} plan requires minimum interval of ${limits.minIntervalMinutes} minutes` },
        { status: 403 }
      );
    }

    if (validatedData.conditions.length > limits.maxConditionsPerMonitor) {
      return NextResponse.json(
        { error: `Your ${plan} plan allows maximum ${limits.maxConditionsPerMonitor} conditions per monitor` },
        { status: 403 }
      );
    }

    // Check PRO features
    if (plan === 'FREE') {
      const hasRegexCondition = validatedData.conditions.some(
        c => c.type === 'TEXT_MATCH' && c.config.match_mode === 'regex'
      );
      const hasSelectorCondition = validatedData.conditions.some(
        c => c.type === 'SELECTOR_CHANGE'
      );

      if (hasRegexCondition || hasSelectorCondition) {
        return NextResponse.json(
          { error: 'Regex and selector monitoring require PRO plan' },
          { status: 403 }
        );
      }
    }

    // Calculate next check time
    const nextCheckAt = new Date(Date.now() + validatedData.check_interval_minutes * 60 * 1000);

    // Create monitor
    const { data: monitor, error: monitorError } = await supabaseAdmin
      .from('monitors')
      .insert({
        user_id: user.id,
        name: validatedData.name,
        url: validatedData.url,
        check_interval_minutes: validatedData.check_interval_minutes,
        next_check_at: nextCheckAt.toISOString(),
        plan_snapshot: plan,
      })
      .select()
      .single();

    if (monitorError) throw monitorError;

    // Create conditions
    const conditions = validatedData.conditions.map(condition => ({
      monitor_id: monitor.id,
      type: condition.type,
      config: condition.config,
    }));

    const { error: conditionsError } = await supabaseAdmin
      .from('monitor_conditions')
      .insert(conditions);

    if (conditionsError) throw conditionsError;

    return NextResponse.json({ monitor }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating monitor:', error);
    if (error instanceof Error && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create monitor' },
      { status: 500 }
    );
  }
}
