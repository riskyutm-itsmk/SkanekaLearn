/*
  # Create teacher attendance table

  1. New Tables
    - `teacher_attendance`
      - `id` (uuid, primary key)
      - `guru_id` (uuid, foreign key to users)
      - `tanggal` (date)
      - `jam_masuk` (time)
      - `jam_pulang` (time)
      - `status` (text, check constraint)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `teacher_attendance` table
    - Add policies for teachers to manage their own attendance
    - Add policies for admins to view all attendance
*/

CREATE TABLE IF NOT EXISTS teacher_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guru_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tanggal date NOT NULL,
  jam_masuk time,
  jam_pulang time,
  status text DEFAULT 'hadir' CHECK (status IN ('hadir', 'tidak_hadir', 'izin', 'sakit')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(guru_id, tanggal)
);

ALTER TABLE teacher_attendance ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own attendance
CREATE POLICY "Teachers can manage own attendance"
  ON teacher_attendance
  FOR ALL
  TO authenticated
  USING (guru_id = auth.uid())
  WITH CHECK (guru_id = auth.uid());

-- Admins can view all teacher attendance
CREATE POLICY "Admins can view all teacher attendance"
  ON teacher_attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );