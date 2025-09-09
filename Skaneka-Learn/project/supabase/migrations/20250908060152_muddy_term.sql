/*
  # Disable RLS completely for all tables

  1. Disable RLS on all tables
  2. Drop all existing policies
  3. Grant full access to authenticated and anon users
*/

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE majors DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE students_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE journals DISABLE ROW LEVEL SECURITY;
ALTER TABLE points DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_attendance DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON users;

DROP POLICY IF EXISTS "Enable delete for majors" ON majors;
DROP POLICY IF EXISTS "Enable insert for majors" ON majors;
DROP POLICY IF EXISTS "Enable read access for majors" ON majors;
DROP POLICY IF EXISTS "Enable update for majors" ON majors;

DROP POLICY IF EXISTS "Enable delete for classes" ON classes;
DROP POLICY IF EXISTS "Enable insert for classes" ON classes;
DROP POLICY IF EXISTS "Enable read access for classes" ON classes;
DROP POLICY IF EXISTS "Enable update for classes" ON classes;

DROP POLICY IF EXISTS "Admins can manage student enrollment" ON students_classes;
DROP POLICY IF EXISTS "Students can read own class enrollment" ON students_classes;
DROP POLICY IF EXISTS "Teachers can read their students' enrollment" ON students_classes;

DROP POLICY IF EXISTS "Enable delete for subjects" ON subjects;
DROP POLICY IF EXISTS "Enable insert for subjects" ON subjects;
DROP POLICY IF EXISTS "Enable read access for subjects" ON subjects;
DROP POLICY IF EXISTS "Enable update for subjects" ON subjects;

DROP POLICY IF EXISTS "Enable delete for schedules" ON schedules;
DROP POLICY IF EXISTS "Enable insert for schedules" ON schedules;
DROP POLICY IF EXISTS "Enable read access for schedules" ON schedules;
DROP POLICY IF EXISTS "Enable update for schedules" ON schedules;

DROP POLICY IF EXISTS "Admins can manage all attendance" ON attendance;
DROP POLICY IF EXISTS "Students can read own attendance" ON attendance;
DROP POLICY IF EXISTS "Teachers can manage attendance for their classes" ON attendance;

DROP POLICY IF EXISTS "Students can read materials for their classes" ON materials;
DROP POLICY IF EXISTS "Teachers can manage their materials" ON materials;

DROP POLICY IF EXISTS "Students can read tasks for their classes" ON tasks;
DROP POLICY IF EXISTS "Teachers can manage their tasks" ON tasks;

DROP POLICY IF EXISTS "Students can manage own submissions" ON task_submissions;
DROP POLICY IF EXISTS "Teachers can manage submissions for their tasks" ON task_submissions;

DROP POLICY IF EXISTS "Students can read questions for tasks they can access" ON quiz_questions;
DROP POLICY IF EXISTS "Teachers can manage questions for their tasks" ON quiz_questions;

DROP POLICY IF EXISTS "Students can manage own quiz answers" ON quiz_answers;
DROP POLICY IF EXISTS "Teachers can read quiz answers for their tasks" ON quiz_answers;

DROP POLICY IF EXISTS "Students can read journals for their classes" ON journals;
DROP POLICY IF EXISTS "Teachers can manage their journals" ON journals;

DROP POLICY IF EXISTS "Students can read own points" ON points;
DROP POLICY IF EXISTS "Teachers can manage points" ON points;

DROP POLICY IF EXISTS "Admins can view all teacher attendance" ON teacher_attendance;
DROP POLICY IF EXISTS "Teachers can manage own attendance" ON teacher_attendance;

-- Grant full access to all roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;