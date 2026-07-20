-- Create a simple key-value settings table
CREATE TABLE IF NOT EXISTS global_settings (
  id text PRIMARY KEY,
  value text NOT NULL
);

-- Insert the default settings
INSERT INTO global_settings (id, value) VALUES ('auto_email_time', '21:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO global_settings (id, value) VALUES ('auto_email_active', 'false') ON CONFLICT (id) DO NOTHING;
INSERT INTO global_settings (id, value) VALUES ('last_auto_email_date', '') ON CONFLICT (id) DO NOTHING;

-- Set up RLS to allow public access (since the app uses anon key)
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on global_settings" 
  ON global_settings FOR SELECT USING (true);

CREATE POLICY "Allow public update access on global_settings" 
  ON global_settings FOR UPDATE USING (true);

CREATE POLICY "Allow public insert access on global_settings" 
  ON global_settings FOR INSERT WITH CHECK (true);
