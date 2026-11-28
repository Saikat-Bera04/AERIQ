CREATE INDEX IF NOT EXISTS readings_station_observed_desc_idx ON readings (station_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS stations_point_gist_idx ON stations USING GIST (point);
CREATE INDEX IF NOT EXISTS community_reports_point_gist_idx ON community_reports USING GIST (rounded_point);
