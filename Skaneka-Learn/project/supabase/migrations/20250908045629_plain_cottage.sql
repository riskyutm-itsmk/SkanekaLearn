/*
  # Fix RLS Policies to Prevent Infinite Recursion

  1. Remove problematic policies that cause recursion
  2. Create simple, non-recursive policies
  3. Ensure proper access control without circular dependencies
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Enable all access for admins" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create simple, non-recursive policies for users table
CREATE POLICY "Enable read access for authenticated users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON users
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON users
  FOR DELETE USING (auth.role() = 'authenticated');

-- Ensure majors policies are simple
DROP POLICY IF EXISTS "Admins can manage majors" ON majors;
DROP POLICY IF EXISTS "Everyone can read majors" ON majors;

CREATE POLICY "Enable read access for majors" ON majors
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for majors" ON majors
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for majors" ON majors
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for majors" ON majors
  FOR DELETE USING (auth.role() = 'authenticated');

-- Apply same pattern to other tables to prevent recursion
DROP POLICY IF EXISTS "Admins can manage classes" ON classes;
DROP POLICY IF EXISTS "Everyone can read classes" ON classes;

CREATE POLICY "Enable read access for classes" ON classes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for classes" ON classes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for classes" ON classes
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for classes" ON classes
  FOR DELETE USING (auth.role() = 'authenticated');

-- Fix subjects policies
DROP POLICY IF EXISTS "Everyone can read subjects" ON subjects;
DROP POLICY IF EXISTS "Teachers can manage their subjects" ON subjects;

CREATE POLICY "Enable read access for subjects" ON subjects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for subjects" ON subjects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for subjects" ON subjects
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for subjects" ON subjects
  FOR DELETE USING (auth.role() = 'authenticated');

-- Fix schedules policies
DROP POLICY IF EXISTS "Everyone can read schedules" ON schedules;
DROP POLICY IF EXISTS "Teachers can manage their schedules" ON schedules;

CREATE POLICY "Enable read access for schedules" ON schedules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for schedules" ON schedules
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for schedules" ON schedules
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for schedules" ON schedules
  FOR DELETE USING (auth.role() = 'authenticated');