CREATE TABLE IF NOT EXISTS vehicle_decoders (
 id TEXT PRIMARY KEY NOT NULL,
 vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 manufacturer TEXT NOT NULL DEFAULT '',
 model TEXT NOT NULL DEFAULT '',
 address INTEGER,
 sound_project TEXT NOT NULL DEFAULT '',
 manual_url TEXT NOT NULL DEFAULT '',
 notes TEXT NOT NULL DEFAULT '',
 cvs TEXT NOT NULL DEFAULT '[]',
 sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS vehicle_decoders_vehicle_idx ON vehicle_decoders(vehicle_id);
