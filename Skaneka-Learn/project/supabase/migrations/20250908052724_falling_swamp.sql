/*
  # Fix users table ID constraint

  1. Changes
    - Make sure id column has proper default value
    - Update existing records if needed
    - Ensure proper UUID generation
*/

-- Make sure the id column has proper default
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Update any existing records that might have null id (shouldn't happen but just in case)
UPDATE users SET id = gen_random_uuid() WHERE id IS NULL;