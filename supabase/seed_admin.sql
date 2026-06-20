-- First System Admin — run AFTER schema.sql
-- Login: Employee ID 632 / Password 632 (forced change on first login)

INSERT INTO users (
  employee_id,
  name,
  designation,
  department,
  role,
  password_hash,
  password_changed,
  is_active
) VALUES (
  '632',
  'System Admin',
  'IT Manager',
  'IT',
  'admin',
  '$2b$10$OyYW4KJJIAFNnI1sSwopJup8txD2iNYY380LQRPXpb5Na2JeeP7DK',
  false,
  true
) ON CONFLICT (employee_id) DO NOTHING;
