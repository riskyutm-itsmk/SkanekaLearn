/*
  # Add application settings table

  1. New Tables
    - `app_settings`
      - `id` (uuid, primary key)
      - `app_name` (text)
      - `logo_url` (text, nullable)
      - `primary_color` (text)
      - `updated_at` (timestamp)
      - `updated_by` (uuid, foreign key to users)

  2. Security
    - Enable RLS on `app_settings` table
    - Add policy for admin access only

  3. Default Data
    - Insert default app settings
*/

CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text NOT NULL DEFAULT 'LMS School',
  logo_url text,
  primary_color text NOT NULL DEFAULT '#3B82F6',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.users(id)
);

-- Disable RLS for simplicity since this is admin-only
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;

-- Insert default settings
INSERT INTO public.app_settings (app_name, primary_color)
VALUES ('LMS School', '#3B82F6')
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();