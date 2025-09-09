/*
  # Fix demo users with plaintext passwords

  1. Updates
    - Update existing demo users with plaintext passwords
    - Ensure passwords are simple and match the login form
*/

-- Update demo users with plaintext passwords
UPDATE users SET password = 'admin123' WHERE email = 'admin@school.com';
UPDATE users SET password = 'guru123' WHERE email = 'guru@school.com';  
UPDATE users SET password = 'siswa123' WHERE email = 'siswa@school.com';
UPDATE users SET password = 'admin123' WHERE email = 'admin@lms.com';

-- Insert demo users if they don't exist (with plaintext passwords)
INSERT INTO users (nama, email, password, role) VALUES 
('Administrator', 'admin@school.com', 'admin123', 'admin'),
('Guru Demo', 'guru@school.com', 'guru123', 'guru'),
('Siswa Demo', 'siswa@school.com', 'siswa123', 'siswa'),
('Administrator Baru', 'admin@lms.com', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;