-- Enable PostGIS for geography(Point, 4326) station and report distance queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- GIST spatial index on stations.point and community_reports.rounded_point
CREATE INDEX IF NOT EXISTS stations_point_gist_idx ON stations USING GIST (point);
CREATE INDEX IF NOT EXISTS community_reports_point_gist_idx ON community_reports USING GIST (rounded_point);
