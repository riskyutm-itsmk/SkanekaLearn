/*
  # Add auth_id column to users table

  1. Changes
    - Add `auth_id` column to `users` table as UUID type
    - Set up foreign key relationship with `auth.users(id)`
    - Update existing records to use `id` as `auth_id` temporarily
    - Add unique constraint on `auth_id`

  2. Security
    - Update RLS policies to work with new column structure
*/

-- Add auth_id column to users table
ALTER TABLE users ADD COLUMN auth_id uuid;

-- Update existing records to use id as auth_id (temporary fix for existing data)
UPDATE users SET auth_id = id WHERE auth_id IS NULL;

-- Add foreign key constraint
ALTER TABLE users ADD CONSTRAINT users_auth_id_fkey 
  FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add unique constraint
ALTER TABLE users ADD CONSTRAINT users_auth_id_key UNIQUE (auth_id);

-- Update RLS policies to work with auth_id
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_id);

CREATE POLICY "Admins can manage all users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );