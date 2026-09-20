CREATE TABLE IF NOT EXISTS vehicle_speed_profiles (
  vehicle_id INTEGER PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
  profile TEXT NOT NULL CHECK (json_valid(profile)),
  updated_at TEXT NOT NULL
);
