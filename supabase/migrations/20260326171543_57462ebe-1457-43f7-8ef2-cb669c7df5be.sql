
-- ============================================================
-- Phase 3 Migration — CRM, Loyalty, Kiosk enhancements
-- ============================================================

-- 1. Loyalty Tiers config
CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
  id            UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name          TEXT UNIQUE NOT NULL,
  label         TEXT NOT NULL,
  min_points    INT DEFAULT 0,
  icon          TEXT,
  color         TEXT,
  multiplier    NUMERIC(3,1) DEFAULT 1.0,
  discount_pct  NUMERIC(5,2) DEFAULT 0,
  perks         TEXT[] DEFAULT '{}',
  sort_order    INT DEFAULT 0
);

-- 2. Loyalty transactions
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id            UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  customer_id   UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES public.orders(id),
  points_change INT NOT NULL,
  type          TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customer visit log
CREATE TABLE IF NOT EXISTS public.customer_visits (
  id            UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  customer_id   UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES public.orders(id),
  visit_date    DATE DEFAULT CURRENT_DATE,
  amount_spent  NUMERIC(12,2) DEFAULT 0,
  channel       TEXT DEFAULT 'walk_in'
);

-- 4. Add customer_phone to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- 5. RLS for new tables
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_loyalty_tiers" ON public.loyalty_tiers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_loyalty_tx" ON public.loyalty_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_visits" ON public.customer_visits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_tiers" ON public.loyalty_tiers FOR SELECT TO anon USING (true);

-- 6. Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_transactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Seed Loyalty Tiers
INSERT INTO public.loyalty_tiers (name, label, min_points, icon, color, multiplier, discount_pct, perks, sort_order) VALUES
  ('member',   'สมาชิก',    0,    '🌱', '#94A3B8', 1.0, 0,  '{"สะสมแต้ม 1x","แจ้งเตือนโปรโมชัน"}', 1),
  ('silver',   'Silver',    500,  '🥈', '#94A3B8', 1.5, 5,  '{"สะสมแต้ม 1.5x","ส่วนลด 5%","ของหวานฟรีวันเกิด"}', 2),
  ('gold',     'Gold',      2000, '🥇', '#F59E0B', 2.0, 10, '{"สะสมแต้ม 2x","ส่วนลด 10%","เมนู Gold Only","จองโต๊ะล่วงหน้า 7 วัน","วันเกิด: 1 เมนูฟรี"}', 3),
  ('platinum', 'Platinum',  5000, '💎', '#A78BFA', 3.0, 15, '{"สะสมแต้ม 3x","ส่วนลด 15%","Chef''s Table","Priority service","ชิมเมนูใหม่ก่อนใคร"}', 4)
ON CONFLICT (name) DO NOTHING;

-- 8. Seed customers
INSERT INTO public.customers (name, phone, tier, points, total_spent, visit_count, allergens, birthday, last_visit_at) VALUES
  ('สมชาย วงษ์สกุล', '081-234-5678', 'gold',     2840, 18420, 48, '{"ถั่ว"}',      '1990-04-15', NOW() - INTERVAL '1 day'),
  ('นภา สุขใจ',      '092-345-6789', 'platinum', 8920, 52800, 124, '{"กลูเตน","นม"}', '1988-08-22', NOW()),
  ('อรทัย มั่นคง',    '083-456-7890', 'silver',   680,  4200,  12, '{}',             '1995-01-10', NOW() - INTERVAL '3 days'),
  ('ธีรภัทร ศรีสุข',  '084-567-8901', 'member',   120,  980,   4,  '{}',             '2000-12-05', NOW() - INTERVAL '7 days'),
  ('พิมพ์ลดา แก้วใส', '085-678-9012', 'gold',     3200, 22100, 56, '{"กุ้ง"}',       '1992-06-18', NOW() - INTERVAL '2 days');

-- 9. Auto-upgrade tier function
CREATE OR REPLACE FUNCTION public.update_customer_tier(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
  current_points INT;
  new_tier TEXT;
BEGIN
  SELECT points INTO current_points FROM public.customers WHERE id = p_customer_id;
  SELECT name INTO new_tier FROM public.loyalty_tiers 
  WHERE min_points <= current_points 
  ORDER BY min_points DESC LIMIT 1;
  UPDATE public.customers SET tier = COALESCE(new_tier, 'member') WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Earn points after payment
CREATE OR REPLACE FUNCTION public.earn_loyalty_points(
  p_customer_id UUID,
  p_order_id UUID,
  p_amount NUMERIC
) RETURNS INT AS $$
DECLARE
  tier_mult NUMERIC;
  earned INT;
BEGIN
  SELECT lt.multiplier INTO tier_mult
  FROM public.customers c
  JOIN public.loyalty_tiers lt ON lt.name = c.tier
  WHERE c.id = p_customer_id;
  
  earned := FLOOR(p_amount / 10 * COALESCE(tier_mult, 1.0));
  
  UPDATE public.customers SET 
    points = points + earned,
    total_spent = total_spent + p_amount,
    visit_count = visit_count + 1,
    last_visit_at = NOW()
  WHERE id = p_customer_id;
  
  INSERT INTO public.loyalty_transactions (customer_id, order_id, points_change, type, description)
  VALUES (p_customer_id, p_order_id, earned, 'earn', 'ได้รับแต้มจากออเดอร์ ฿' || p_amount::TEXT);
  
  INSERT INTO public.customer_visits (customer_id, order_id, amount_spent)
  VALUES (p_customer_id, p_order_id, p_amount);
  
  PERFORM update_customer_tier(p_customer_id);
  
  RETURN earned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.earn_loyalty_points(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_customer_tier(UUID) TO authenticated;

-- 11. Anon read stock_items for kiosk availability check
DO $$ BEGIN
  CREATE POLICY "anon_read_stock_items" ON public.stock_items FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
