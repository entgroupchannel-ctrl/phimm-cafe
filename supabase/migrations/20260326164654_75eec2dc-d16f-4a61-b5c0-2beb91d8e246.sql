
-- Enable pgcrypto for PIN hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- สร้าง RPC function สำหรับ PIN verification
CREATE OR REPLACE FUNCTION public.verify_pin(input_pin TEXT)
RETURNS TABLE(
  staff_id UUID,
  staff_name TEXT,
  staff_nickname TEXT,
  role_id UUID,
  role_name TEXT,
  role_label TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.nickname, s.role_id, r.name, r.label
  FROM public.staff s
  JOIN public.roles r ON r.id = s.role_id
  WHERE s.pin = crypt(input_pin, s.pin)
    AND s.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- สร้าง RPC function สำหรับดึง permissions ของ role
CREATE OR REPLACE FUNCTION public.get_role_permissions(p_role_id UUID)
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT rp.permission_key
    FROM public.role_permissions rp
    WHERE rp.role_id = p_role_id AND rp.allowed = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- อนุญาต anon เรียก RPC ได้
GRANT EXECUTE ON FUNCTION public.verify_pin(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_role_permissions(UUID) TO anon;

-- Seed staff data
INSERT INTO public.staff (role_id, name, nickname, pin, hourly_rate) VALUES
  ((SELECT id FROM roles WHERE name='cashier'),  'อรทัย',   'ทัย',   crypt('2222', gen_salt('bf')), 60),
  ((SELECT id FROM roles WHERE name='kitchen'),  'สมศักดิ์', 'ศักดิ์', crypt('3333', gen_salt('bf')), 75),
  ((SELECT id FROM roles WHERE name='kitchen'),  'ธีร์',    'ธีร์',   crypt('4444', gen_salt('bf')), 70),
  ((SELECT id FROM roles WHERE name='waiter'),   'ณัฐ',     'ณัฐ',   crypt('5555', gen_salt('bf')), 55),
  ((SELECT id FROM roles WHERE name='waiter'),   'พลอย',    'พลอย',  crypt('6666', gen_salt('bf')), 55),
  ((SELECT id FROM roles WHERE name='manager'),  'ผู้จัดการ', 'แม็ก',  crypt('7777', gen_salt('bf')), 80)
ON CONFLICT DO NOTHING;

-- Owner (PIN only for now)
INSERT INTO public.staff (role_id, name, nickname, pin, hourly_rate)
VALUES (
  (SELECT id FROM roles WHERE name = 'owner'),
  'เจ้าของร้าน', 'Boss',
  crypt('1234', gen_salt('bf')), 0
)
ON CONFLICT DO NOTHING;
