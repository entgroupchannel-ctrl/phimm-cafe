
-- 1. Menu Option Groups
CREATE TABLE IF NOT EXISTS public.menu_option_groups (
  id            UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  menu_item_id  UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT DEFAULT 'single',
  required      BOOLEAN DEFAULT false,
  sort_order    INT DEFAULT 0
);

-- 2. Menu Options
CREATE TABLE IF NOT EXISTS public.menu_options (
  id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  option_group_id UUID NOT NULL REFERENCES public.menu_option_groups(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  price_add       NUMERIC(10,2) DEFAULT 0,
  is_default      BOOLEAN DEFAULT false,
  sort_order      INT DEFAULT 0
);

-- 3. Add columns to order_items
ALTER TABLE public.order_items 
  ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS options_text TEXT,
  ADD COLUMN IF NOT EXISTS price_add NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cooking_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cooking_seconds INT,
  ADD COLUMN IF NOT EXISTS handed_to TEXT,
  ADD COLUMN IF NOT EXISTS handed_at TIMESTAMPTZ;

-- 4. RLS
ALTER TABLE public.menu_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_menu_option_groups" ON public.menu_option_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_menu_options" ON public.menu_options FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_option_groups" ON public.menu_option_groups FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_options" ON public.menu_options FOR SELECT TO anon USING (true);

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_option_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_options;

-- 6. Seed: ระดับเผ็ด for อาหารจานเดียว
DO $$
DECLARE
  menu_rec RECORD;
  group_id UUID;
BEGIN
  FOR menu_rec IN 
    SELECT mi.id FROM public.menu_items mi
    JOIN public.menu_categories mc ON mc.id = mi.category_id
    WHERE mc.name = 'อาหารจานเดียว'
  LOOP
    INSERT INTO public.menu_option_groups (menu_item_id, name, type, required, sort_order)
    VALUES (menu_rec.id, 'ระดับเผ็ด', 'single', false, 1)
    RETURNING id INTO group_id;

    INSERT INTO public.menu_options (option_group_id, name, price_add, is_default, sort_order) VALUES
      (group_id, 'ไม่เผ็ด', 0, false, 1),
      (group_id, 'เผ็ดน้อย', 0, false, 2),
      (group_id, 'ปกติ', 0, true, 3),
      (group_id, 'เผ็ดมาก', 0, false, 4),
      (group_id, 'เผ็ดสุดๆ', 0, false, 5);
  END LOOP;
END $$;

-- 7. Seed: เพิ่มเติม (toppings) for อาหารจานเดียว
DO $$
DECLARE
  menu_rec RECORD;
  group_id UUID;
BEGIN
  FOR menu_rec IN 
    SELECT mi.id FROM public.menu_items mi
    JOIN public.menu_categories mc ON mc.id = mi.category_id
    WHERE mc.name = 'อาหารจานเดียว'
  LOOP
    INSERT INTO public.menu_option_groups (menu_item_id, name, type, required, sort_order)
    VALUES (menu_rec.id, 'เพิ่มเติม', 'multi', false, 2)
    RETURNING id INTO group_id;

    INSERT INTO public.menu_options (option_group_id, name, price_add, is_default, sort_order) VALUES
      (group_id, 'ไข่ดาว', 15, false, 1),
      (group_id, 'ไข่เจียว', 15, false, 2),
      (group_id, 'ข้าวเพิ่ม', 10, false, 3),
      (group_id, 'ผักเพิ่ม', 10, false, 4),
      (group_id, 'กุ้งเพิ่ม', 30, false, 5);
  END LOOP;
END $$;

-- 8. Seed: ไม่ใส่ for อาหารจานเดียว
DO $$
DECLARE
  menu_rec RECORD;
  group_id UUID;
BEGIN
  FOR menu_rec IN 
    SELECT mi.id FROM public.menu_items mi
    JOIN public.menu_categories mc ON mc.id = mi.category_id
    WHERE mc.name = 'อาหารจานเดียว'
  LOOP
    INSERT INTO public.menu_option_groups (menu_item_id, name, type, required, sort_order)
    VALUES (menu_rec.id, 'ไม่ใส่', 'multi', false, 3)
    RETURNING id INTO group_id;

    INSERT INTO public.menu_options (option_group_id, name, price_add, is_default, sort_order) VALUES
      (group_id, 'ไม่ใส่ผักชี', 0, false, 1),
      (group_id, 'ไม่ใส่พริก', 0, false, 2),
      (group_id, 'ไม่ใส่หอมใหญ่', 0, false, 3),
      (group_id, 'ไม่ใส่ถั่ว', 0, false, 4),
      (group_id, 'ไม่ใส่กระเทียม', 0, false, 5);
  END LOOP;
END $$;

-- 9. Seed: ระดับหวาน + ขนาด for เครื่องดื่ม
DO $$
DECLARE
  menu_rec RECORD;
  group_id UUID;
BEGIN
  FOR menu_rec IN 
    SELECT mi.id FROM public.menu_items mi
    JOIN public.menu_categories mc ON mc.id = mi.category_id
    WHERE mc.name = 'เครื่องดื่ม'
  LOOP
    INSERT INTO public.menu_option_groups (menu_item_id, name, type, required, sort_order)
    VALUES (menu_rec.id, 'ระดับหวาน', 'single', false, 1)
    RETURNING id INTO group_id;

    INSERT INTO public.menu_options (option_group_id, name, price_add, is_default, sort_order) VALUES
      (group_id, 'ไม่หวาน', 0, false, 1),
      (group_id, 'หวานน้อย', 0, false, 2),
      (group_id, 'ปกติ', 0, true, 3),
      (group_id, 'หวานมาก', 0, false, 4);

    INSERT INTO public.menu_option_groups (menu_item_id, name, type, required, sort_order)
    VALUES (menu_rec.id, 'ขนาด', 'single', false, 2)
    RETURNING id INTO group_id;

    INSERT INTO public.menu_options (option_group_id, name, price_add, is_default, sort_order) VALUES
      (group_id, 'ปกติ', 0, true, 1),
      (group_id, 'ไซส์ L', 15, false, 2);
  END LOOP;
END $$;

-- 10. Cooking performance view
CREATE OR REPLACE VIEW public.cooking_performance AS
SELECT 
  oi.menu_item_id,
  mi.name AS menu_name,
  mi.station,
  COUNT(*) AS total_cooked,
  ROUND(AVG(oi.cooking_seconds), 0) AS avg_seconds,
  MIN(oi.cooking_seconds) AS min_seconds,
  MAX(oi.cooking_seconds) AS max_seconds,
  ROUND(AVG(oi.cooking_seconds) / 60.0, 1) AS avg_minutes
FROM public.order_items oi
JOIN public.menu_items mi ON mi.id = oi.menu_item_id
WHERE oi.cooking_seconds IS NOT NULL AND oi.cooking_seconds > 0
GROUP BY oi.menu_item_id, mi.name, mi.station
ORDER BY total_cooked DESC;
