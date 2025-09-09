/*
  # Update teacher attendance to be per schedule/subject

  1. Changes
    - Drop existing teacher_attendance table
    - Create new teacher_attendance table with schedule_id reference
    - Add unique constraint for guru_id, schedule_id, tanggal
    - Update RLS policies for new structure

  2. New Structure
    - Each attendance record is tied to a specific schedule (mapel)
    - Teachers must mark attendance for each subject they teach
    - Multiple attendance records per day if teaching multiple subjects
*/

-- Drop existing table and recreate with new structure
DROP TABLE IF EXISTS teacher_attendance;

CREATE TABLE teacher_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guru_id uuid REFERENCES users(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE,
  tanggal date NOT NULL,
  jam_masuk time,
  jam_pulang time,
  status text DEFAULT 'hadir' CHECK (status IN ('hadir', 'tidak_hadir', 'izin', 'sakit')),
  keterangan text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(guru_id, schedule_id, tanggal)
);

-- Enable RLS
ALTER TABLE teacher_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can manage own attendance"
  ON teacher_attendance
  FOR ALL
  TO authenticated
  USING (guru_id = auth.uid())
  WITH CHECK (guru_id = auth.uid());

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

-- Create index for better performance
CREATE INDEX idx_teacher_attendance_guru_tanggal ON teacher_attendance(guru_id, tanggal);
CREATE INDEX idx_teacher_attendance_schedule ON teacher_attendance(schedule_id);