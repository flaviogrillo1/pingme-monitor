-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create monitors table
CREATE TABLE IF NOT EXISTS monitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  plan_snapshot TEXT NOT NULL DEFAULT 'FREE',
  check_interval_minutes INTEGER NOT NULL DEFAULT 360,
  next_check_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_check_at TIMESTAMPTZ,
  last_status TEXT,
  last_error TEXT,
  cooldown_minutes INTEGER DEFAULT 360,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create monitor_conditions table
CREATE TABLE IF NOT EXISTS monitor_conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('STATUS_CHANGE', 'TEXT_MATCH', 'SELECTOR_CHANGE')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create monitor_snapshots table
CREATE TABLE IF NOT EXISTS monitor_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  content_hash TEXT,
  extracted_status TEXT,
  extracted_selector_text TEXT,
  extracted_plain_text_preview TEXT,
  raw_excerpt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create monitor_checks table
CREATE TABLE IF NOT EXISTS monitor_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result TEXT NOT NULL CHECK (result IN ('OK', 'TRIGGERED', 'ERROR')),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create monitor_events table
CREATE TABLE IF NOT EXISTS monitor_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('TRIGGERED', 'PAUSED', 'RESUMED', 'DELETED', 'ERROR')),
  reason TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscription_state table
CREATE TABLE IF NOT EXISTS subscription_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PRO')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monitors_user_id ON monitors(user_id);
CREATE INDEX IF NOT EXISTS idx_monitors_next_check_at ON monitors(next_check_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_monitors_is_active ON monitors(is_active);
CREATE INDEX IF NOT EXISTS idx_monitor_conditions_monitor_id ON monitor_conditions(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitor_snapshots_monitor_id ON monitor_snapshots(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitor_snapshots_observed_at ON monitor_snapshots(observed_at);
CREATE INDEX IF NOT EXISTS idx_monitor_checks_monitor_id ON monitor_checks(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitor_checks_checked_at ON monitor_checks(checked_at);
CREATE INDEX IF NOT EXISTS idx_monitor_events_monitor_id ON monitor_events(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitor_events_event_at ON monitor_events(event_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_monitors_updated_at BEFORE UPDATE ON monitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_state_updated_at BEFORE UPDATE ON subscription_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
