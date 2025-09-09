/*
  # Add password column to users table

  1. Changes
    - Add password column to users table for simple authentication
    - Update existing users with default passwords for testing

  2. Security
    - In production, passwords should be hashed
    - This is a simple implementation for development
*/

-- Add password column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password text;

-- Set default passwords for existing users (for testing)
UPDATE users SET password = 'password123' WHERE password IS NULL;

-- Add constraint to ensure password is not null for new users
ALTER TABLE users ALTER COLUMN password SET NOT NULL;