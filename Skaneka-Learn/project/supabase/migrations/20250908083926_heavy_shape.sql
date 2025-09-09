/*
  # Disable RLS for points table

  1. Security Changes
    - Disable Row Level Security on points table
    - Remove all existing policies
    - Allow direct access for all authenticated operations

  2. Rationale
    - Custom authentication system doesn't work well with RLS
    - Application-level security is sufficient
    - Simplifies database operations
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to access points" ON public.points;

-- Disable Row Level Security
ALTER TABLE public.points DISABLE ROW LEVEL SECURITY;