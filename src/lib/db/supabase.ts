import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for use in browser (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for backend operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Database types
export interface Monitor {
  id: string;
  user_id: string;
  name: string;
  url: string;
  is_active: boolean;
  plan_snapshot: string;
  check_interval_minutes: number;
  next_check_at: string;
  last_check_at: string | null;
  last_status: string | null;
  last_error: string | null;
  cooldown_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface MonitorCondition {
  id: string;
  monitor_id: string;
  type: 'STATUS_CHANGE' | 'TEXT_MATCH' | 'SELECTOR_CHANGE';
  config: Record<string, unknown>;
  created_at: string;
}

export interface MonitorSnapshot {
  id: string;
  monitor_id: string;
  observed_at: string;
  content_hash: string | null;
  extracted_status: string | null;
  extracted_selector_text: string | null;
  extracted_plain_text_preview: string | null;
  raw_excerpt: string | null;
  created_at: string;
}

export interface MonitorCheck {
  id: string;
  monitor_id: string;
  checked_at: string;
  result: 'OK' | 'TRIGGERED' | 'ERROR';
  details: Record<string, unknown>;
  created_at: string;
}

export interface MonitorEvent {
  id: string;
  monitor_id: string;
  event_at: string;
  type: 'TRIGGERED' | 'PAUSED' | 'RESUMED' | 'DELETED' | 'ERROR';
  reason: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface SubscriptionState {
  user_id: string;
  plan: 'FREE' | 'PRO';
  status: 'active' | 'canceled' | 'past_due';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  updated_at: string;
}

// Plan limits
export const PLAN_LIMITS = {
  FREE: {
    maxMonitors: 2,
    minIntervalMinutes: 360, // 6 hours
    maxConditionsPerMonitor: 1,
    features: ['email', 'basic_matching'],
  },
  PRO: {
    maxMonitors: 20,
    minIntervalMinutes: 30,
    maxConditionsPerMonitor: 2,
    features: ['email', 'history', 'regex', 'selector_change', 'custom_cooldown'],
  },
} as const;
