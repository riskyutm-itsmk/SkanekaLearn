/*
  # Fix Teacher Attendance RLS Policies

  1. Security Updates
    - Drop existing policies that may be too restrictive
    - Create proper RLS policies for teacher attendance
    - Allow teachers to manage their own attendance records
    - Allow admins to view all attendance records

  2. Policies Created
    - Teachers can manage own attendance (INSERT, UPDATE, SELECT)
    - Admins can view all teacher attendance
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can manage own attendance" ON teacher_attendance;
DROP POLICY IF EXISTS "Admins can view all teacher attendance" ON teacher_attendance;

-- Create proper RLS policies for teacher_attendance
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
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Ensure RLS is enabled
ALTER TABLE teacher_attendance ENABLE ROW LEVEL SECURITY;