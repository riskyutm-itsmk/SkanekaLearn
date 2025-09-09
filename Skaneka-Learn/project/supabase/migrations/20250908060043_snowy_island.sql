/*
  # Create demo users for testing

  1. Demo Users
    - Admin user with admin role
    - Teacher user with guru role  
    - Student user with siswa role
  
  2. Security
    - All users have simple passwords for demo
    - Can be used for testing login functionality
*/

-- Insert demo users if they don't exist
INSERT INTO users (nama, email, password, role, auth_id) VALUES
  ('Admin Demo', 'admin@school.com', 'admin123', 'admin', NULL),
  ('Guru Demo', 'guru@school.com', 'guru123', 'guru', NULL),
  ('Siswa Demo', 'siswa@school.com', 'siswa123', 'siswa', NULL)
ON CONFLICT (email) DO NOTHING;