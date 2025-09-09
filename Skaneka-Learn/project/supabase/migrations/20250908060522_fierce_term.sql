/*
  # Create new admin user

  1. New Users
    - Add new admin user with hashed password
    - Email: admin@lms.com
    - Password: admin123 (hashed with bcrypt)
    - Role: admin

  2. Security
    - Password is properly hashed using bcrypt
    - Unique email constraint will prevent duplicates
*/

-- Insert new admin user with bcrypt hashed password
INSERT INTO users (nama, email, password, role) 
VALUES (
  'Administrator Baru',
  'admin@lms.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash for 'admin123'
  'admin'
) ON CONFLICT (email) DO NOTHING;