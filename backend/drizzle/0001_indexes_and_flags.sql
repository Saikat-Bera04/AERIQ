-- Verify and create required performance & spatial indexes + report_flags table
CREATE INDEX IF NOT EXISTS readings_station_observed_desc_idx ON readings (station_id, observed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS readings_unique_idx ON readings (station_id, pollutant, observed_at, kind);
CREATE INDEX IF NOT EXISTS stations_point_gist_idx ON stations USING GIST (point);
CREATE INDEX IF NOT EXISTS community_reports_point_gist_idx ON community_reports USING GIST (rounded_point);
CREATE INDEX IF NOT EXISTS plans_user_date_idx ON plans (user_id, date);
CREATE INDEX IF NOT EXISTS messages_conv_created_idx ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS report_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES community_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS report_flags_unique_idx ON report_flags (report_id, user_id);
