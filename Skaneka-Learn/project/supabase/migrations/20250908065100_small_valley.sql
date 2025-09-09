/*
  # Add location-based attendance settings

  1. New Tables
    - `location_settings`
      - `id` (uuid, primary key)
      - `name` (text) - nama lokasi (contoh: "Sekolah Utama")
      - `latitude` (decimal) - koordinat latitude
      - `longitude` (decimal) - koordinat longitude
      - `radius` (integer) - radius dalam meter
      - `is_active` (boolean) - status aktif/nonaktif
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `location_settings` table
    - Add policies for admin access only
</script>

CREATE TABLE IF NOT EXISTS location_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  radius integer NOT NULL DEFAULT 100,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE location_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage location settings
CREATE POLICY "Admins can manage location settings"
  ON location_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Teachers can only read active location settings
CREATE POLICY "Teachers can read active location settings"
  ON location_settings
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'guru'
    )
  );

-- Insert default location (example coordinates for Jakarta)
INSERT INTO location_settings (name, latitude, longitude, radius, is_active)
VALUES ('Sekolah Utama', -6.2088, 106.8456, 100, true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_location_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_location_settings_updated_at
  BEFORE UPDATE ON location_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_location_settings_updated_at();