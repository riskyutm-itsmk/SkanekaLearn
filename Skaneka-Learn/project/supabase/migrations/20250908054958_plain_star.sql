/*
  # Fix Teacher Attendance RLS Policy

  1. Drop all existing policies
  2. Create simple policies that work with our auth system
  3. Enable RLS properly
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Teachers can manage own attendance" ON teacher_attendance;
DROP POLICY IF EXISTS "Admins can view all teacher attendance" ON teacher_attendance;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON teacher_attendance;

-- Disable RLS temporarily to clean up
ALTER TABLE teacher_attendance DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE teacher_attendance ENABLE ROW LEVEL SECURITY;

-- Create simple policy that allows teachers to manage their own attendance
-- Since we're using simple auth (not Supabase Auth), we need to match by guru_id directly
CREATE POLICY "Teachers can manage own attendance" ON teacher_attendance
  FOR ALL
  TO authenticated
  USING (guru_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
  WITH CHECK (guru_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Create policy for admins to view all attendance
CREATE POLICY "Admins can view all teacher attendance" ON teacher_attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Grant necessary permissions
GRANT ALL ON teacher_attendance TO authenticated;
GRANT USAGE ON SEQUENCE teacher_attendance_id_seq TO authenticated;