/*
  # Fix Teacher Attendance RLS Policies

  1. Security
    - Drop existing problematic policies
    - Create new policies that properly match guru_id with auth.uid()
    - Allow teachers to manage their own attendance records
    - Allow admins to view all teacher attendance
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can manage own attendance" ON teacher_attendance;
DROP POLICY IF EXISTS "Admins can view all teacher attendance" ON teacher_attendance;

-- Create new policies that work with the current data structure
CREATE POLICY "Teachers can manage own attendance"
  ON teacher_attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.id = teacher_attendance.guru_id
      AND users.role = 'guru'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.id = teacher_attendance.guru_id
      AND users.role = 'guru'
    )
  );

CREATE POLICY "Admins can view all teacher attendance"
  ON teacher_attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'admin'
    )
  );