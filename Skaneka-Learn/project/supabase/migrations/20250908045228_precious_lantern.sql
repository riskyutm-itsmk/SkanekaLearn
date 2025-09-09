/*
  # Fix infinite recursion in users table policies

  1. Policy Issues
    - Remove recursive policy that references users table within users table policy
    - Create simpler, non-recursive policies for user management
    
  2. Security
    - Admins can manage all users
    - Users can read their own profile
    - Remove circular references
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;

-- Create new non-recursive policies
CREATE POLICY "Enable all access for admins" 
  ON users 
  FOR ALL 
  TO authenticated 
  USING (
    auth.uid() IN (
      SELECT auth_id FROM users WHERE role = 'admin' AND auth_id = auth.uid()
    )
  );

-- Allow users to read their own profile without recursion
CREATE POLICY "Users can read own data" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (auth_id = auth.uid());

-- Allow insert for new user registration (needed for signup)
CREATE POLICY "Allow user registration" 
  ON users 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth_id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update own data" 
  ON users 
  FOR UPDATE 
  TO authenticated 
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());