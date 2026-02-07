import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { updateMonitorSchema } from '@/lib/validators/monitors';
import { PLAN_LIMITS } from '@/lib/db/supabase';

interface RouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: monitor, error } = await supabaseAdmin
      .from('monitors')
      .select(`
        *,
        conditions:monitor_conditions(*),
        snapshots:monitor_snapshots(order=observed_at.desc, limit=5),
        checks:monitor_checks(order=checked_at.desc, limit=10),
        events:monitor_events(order=event_at.desc, limit=10)
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });
    }

    return NextResponse.json({ monitor });
  } catch (error: unknown) {
    console.error('Error fetching monitor:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch monitor' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateMonitorSchema.parse(body);

    // Get existing monitor
    const { data: existingMonitor } = await supabaseAdmin
      .from('monitors')
      .select('*, conditions:monitor_conditions(*)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (!existingMonitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });
    }

    // Get user's plan
    const { data: subscription } = await supabaseAdmin
      .from('subscription_state')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    const plan = (subscription?.plan as 'FREE' | 'PRO') || 'FREE';
    const limits = PLAN_LIMITS[plan];

    // Enforce limits if updating interval
    if (validatedData.check_interval_minutes !== undefined) {
      if (validatedData.check_interval_minutes < limits.minIntervalMinutes) {
        return NextResponse.json(
          { error: `Your ${plan} plan requires minimum interval of ${limits.minIntervalMinutes} minutes` },
          { status: 403 }
        );
      }
    }

    // Update monitor
    const updateData: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.url !== undefined) updateData.url = validatedData.url;
    if (validatedData.check_interval_minutes !== undefined) {
      updateData.check_interval_minutes = validatedData.check_interval_minutes;
    }
    if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active;

    const { data: monitor, error } = await supabaseAdmin
      .from('monitors')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ monitor });
  } catch (error: unknown) {
    console.error('Error updating monitor:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update monitor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from('monitors')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting monitor:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete monitor' },
      { status: 500 }
    );
  }
}
