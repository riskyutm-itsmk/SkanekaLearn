/*
  # Fix Teacher Attendance RLS Policy

  1. Security Changes
    - Drop existing problematic policies
    - Create simple, working policies for teacher attendance
    - Allow teachers to manage their own attendance records
    - Allow admins to view all attendance records

  2. Policy Logic
    - Teachers can INSERT/UPDATE/DELETE their own attendance
    - Admins can SELECT all attendance records
    - Use direct user ID matching without complex JOINs
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can manage own attendance" ON teacher_attendance;
DROP POLICY IF EXISTS "Admins can view all teacher attendance" ON teacher_attendance;

-- Create simple working policies
CREATE POLICY "Teachers can manage own attendance" ON teacher_attendance
  FOR ALL
  TO authenticated
  USING (guru_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
  WITH CHECK (guru_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Admins can view all teacher attendance" ON teacher_attendance
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() AND role = 'admin'
  ));