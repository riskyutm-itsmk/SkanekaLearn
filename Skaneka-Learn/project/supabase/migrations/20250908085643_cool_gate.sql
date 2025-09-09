/*
  # Create announcements system

  1. New Tables
    - `announcements`
      - `id` (uuid, primary key)
      - `judul` (text, announcement title)
      - `konten` (text, announcement content)
      - `tipe` (text, type: 'umum' for all, 'kelas' for specific class)
      - `target_role` (text, target audience: 'semua', 'guru', 'siswa')
      - `kelas_id` (uuid, optional, for class-specific announcements)
      - `created_by` (uuid, user who created the announcement)
      - `is_active` (boolean, whether announcement is active)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `announcements` table
    - Add policies for admins to manage all announcements
    - Add policies for teachers to manage class announcements
    - Add policies for users to read relevant announcements

  3. Functions
    - Trigger to update `updated_at` timestamp
*/

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul text NOT NULL,
  konten text NOT NULL,
  tipe text NOT NULL DEFAULT 'umum',
  target_role text NOT NULL DEFAULT 'semua',
  kelas_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints
ALTER TABLE announcements ADD CONSTRAINT announcements_tipe_check 
  CHECK (tipe = ANY (ARRAY['umum'::text, 'kelas'::text]));

ALTER TABLE announcements ADD CONSTRAINT announcements_target_role_check 
  CHECK (target_role = ANY (ARRAY['semua'::text, 'guru'::text, 'siswa'::text]));

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policies for admins (can manage all announcements)
CREATE POLICY "Admins can manage all announcements"
  ON announcements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policies for teachers (can manage their class announcements)
CREATE POLICY "Teachers can manage their class announcements"
  ON announcements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'guru'
      AND users.id = announcements.created_by
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'guru'
      AND users.id = announcements.created_by
    )
  );

-- Policies for reading announcements
CREATE POLICY "Users can read relevant announcements"
  ON announcements
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND (
      -- General announcements for all
      (tipe = 'umum' AND target_role = 'semua') OR
      
      -- Role-specific general announcements
      (tipe = 'umum' AND target_role = (
        SELECT role FROM users WHERE auth_id = auth.uid()
      )) OR
      
      -- Class-specific announcements for students
      (tipe = 'kelas' AND target_role = 'siswa' AND kelas_id IN (
        SELECT kelas_id FROM students_classes 
        WHERE siswa_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        AND status = 'aktif'
      )) OR
      
      -- Class-specific announcements for teachers teaching that class
      (tipe = 'kelas' AND target_role = 'guru' AND kelas_id IN (
        SELECT kelas_id FROM schedules 
        WHERE guru_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      ))
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();