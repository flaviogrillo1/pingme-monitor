-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_state ENABLE ROW LEVEL SECURITY;

-- Monitors policies
CREATE POLICY "Users can view their own monitors"
  ON monitors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monitors"
  ON monitors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monitors"
  ON monitors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monitors"
  ON monitors FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass for cron jobs
CREATE POLICY "Service role can access all monitors"
  ON monitors FOR ALL
  TO service_role
  USING (true);

-- Monitor conditions policies (via monitor_id join)
CREATE POLICY "Users can view conditions for their monitors"
  ON monitor_conditions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM monitors
      WHERE monitors.id = monitor_conditions.monitor_id
      AND monitors.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert conditions for their monitors"
  ON monitor_conditions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM monitors
      WHERE monitors.id = monitor_conditions.monitor_id
      AND monitors.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can access all conditions"
  ON monitor_conditions FOR ALL
  TO service_role
  USING (true);

-- Monitor snapshots policies
CREATE POLICY "Users can view snapshots for their monitors"
  ON monitor_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM monitors
      WHERE monitors.id = monitor_snapshots.monitor_id
      AND monitors.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can access all snapshots"
  ON monitor_snapshots FOR ALL
  TO service_role
  USING (true);

-- Monitor checks policies
CREATE POLICY "Users can view checks for their monitors"
  ON monitor_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM monitors
      WHERE monitors.id = monitor_checks.monitor_id
      AND monitors.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can access all checks"
  ON monitor_checks FOR ALL
  TO service_role
  USING (true);

-- Monitor events policies
CREATE POLICY "Users can view events for their monitors"
  ON monitor_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM monitors
      WHERE monitors.id = monitor_events.monitor_id
      AND monitors.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can access all events"
  ON monitor_events FOR ALL
  TO service_role
  USING (true);

-- Subscription state policies
CREATE POLICY "Users can view their own subscription"
  ON subscription_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON subscription_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON subscription_state FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can access all subscriptions"
  ON subscription_state FOR ALL
  TO service_role
  USING (true);

-- Create function to get user plan
CREATE OR REPLACE FUNCTION get_user_plan(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(plan, 'FREE') FROM subscription_state WHERE user_id = user_uuid;
$$ LANGUAGE SQL STABLE;

-- Create function to count user monitors
CREATE OR REPLACE FUNCTION count_user_monitors(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*) FROM monitors WHERE user_id = user_uuid AND is_active = true;
$$ LANGUAGE SQL STABLE;

-- Create function to count monitor conditions
CREATE OR REPLACE FUNCTION count_monitor_conditions(monitor_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*) FROM monitor_conditions WHERE monitor_id = monitor_uuid;
$$ LANGUAGE SQL STABLE;
