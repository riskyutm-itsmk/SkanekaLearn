/*
  # Fix users table foreign key constraint

  1. Remove problematic foreign key constraints
  2. Make auth_id nullable and optional
  3. Allow users to be created without Supabase Auth integration
*/

-- Remove the foreign key constraint that's causing issues
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_id_fkey;

-- Make sure auth_id is nullable (it should be already)
ALTER TABLE users ALTER COLUMN auth_id DROP NOT NULL;

-- Update any existing records with invalid auth_id references
UPDATE users SET auth_id = NULL WHERE auth_id IS NOT NULL AND auth_id NOT IN (SELECT id FROM auth.users);

-- Add back a proper foreign key constraint for auth_id (optional)
ALTER TABLE users ADD CONSTRAINT users_auth_id_fkey 
  FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Ensure the id column has proper default
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();