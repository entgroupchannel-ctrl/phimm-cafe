
-- PART 1: เพิ่ม stock_items ที่ยังขาด
INSERT INTO stock_items (name, unit, qty, min_threshold, cost_per_unit, is_active) VALUES
('น้ำตาลปี๊บ', 'kg', 3, 1, 45, true),
('แป้งข้าวเหนียว', 'kg', 2, 0.5, 40, true),
('ใบเตย', 'มัด', 5, 2, 10, true),
('ถั่วลิสง', 'kg', 2, 0.5, 80, true),
('น้ำปลา', 'ขวด', 3, 1, 25, true),
('น้ำมะขามเปียก', 'ขวด', 2, 1, 35, true),
('กระเทียม', 'kg', 2, 0.5, 60, true),
('ผักชี', 'กำ', 10, 3, 10, true),
('ข้าวเหนียว', 'kg', 5, 2, 40, true),
('น้ำโซดา', 'ขวด', 12, 4, 12, true),
('น้ำเชื่อม', 'ขวด', 3, 1, 30, true),
('ตะไคร้', 'กำ', 5, 2, 15, true),
('ใบมะกรูด', 'กำ', 5, 2, 15, true),
('พริกแกงเขียวหวาน', 'kg', 1, 0.3, 150, true),
('มะเขือเปราะ', 'kg', 2, 0.5, 40, true),
('ใบโหระพา', 'กำ', 5, 2, 10, true),
('มะละกอ', 'kg', 3, 1, 30, true),
('ถั่วฝักยาว', 'kg', 2, 0.5, 35, true),
('นมข้นจืด', 'กระป๋อง', 6, 2, 22, true)
ON CONFLICT DO NOTHING;

-- PART 2: สร้างสูตร (recipes)
INSERT INTO stock_recipes (menu_item_id, stock_item_id, qty_used)
SELECT 'd67f0c5c-0853-461d-a5f8-8b6b62560bdb', id,
  CASE name WHEN 'ไข่ไก่' THEN 2 WHEN 'กะทิ' THEN 0.1 END
FROM stock_items WHERE name IN ('ไข่ไก่', 'กะทิ')
AND (CASE name WHEN 'ไข่ไก่' THEN 2 WHEN 'กะทิ' THEN 0.1 END) IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO stock_recipes (menu_item_id, stock_item_id, qty_used)
SELECT 'd67f0c5c-0853-461d-a5f8-8b6b62560bdb', id,
  CASE name WHEN 'แป้งข้าวเหนียว' THEN 0.05 WHEN 'น้ำตาลปี๊บ' THEN 0.03 WHEN 'ใบเตย' THEN 0.5 END
FROM stock_items WHERE name IN ('แป้งข้าวเหนียว', 'น้ำตาลปี๊บ', 'ใบเตย')
AND (CASE name WHEN 'แป้งข้าวเหนียว' THEN 0.05 WHEN 'น้ำตาลปี๊บ' THEN 0.03 WHEN 'ใบเตย' THEN 0.5 END) IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO stock_recipes (menu_item_id, stock_item_id, qty_used)
SELECT '6d79d483-2f87-4365-a4f9-2226aaf1c64a', id,
  CASE name WHEN 'กะทิ' THEN 0.15 WHEN 'น้ำตาลปี๊บ' THEN 0.02 WHEN 'ข้าวเหนียว' THEN 0.03 END
FROM stock_items WHERE name IN ('กะทิ', 'น้ำตาลปี๊บ', 'ข้าวเหนียว')
AND (CASE name WHEN 'กะทิ' THEN 0.15 WHEN 'น้ำตาลปี๊บ' THEN 0.02 WHEN 'ข้าวเหนียว' THEN 0.03 END) IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO stock_recipes (menu_item_id, stock_item_id, qty_used)
SELECT 'de311f6c-6dc4-46ed-b9dc-bdd4e08ac2e2', id,
  CASE name WHEN 'กาแฟ' THEN 0.015 WHEN 'นมข้นหวาน' THEN 0.1 WHEN 'น้ำเชื่อม' THEN 0.05 END
FROM stock_items WHERE name IN ('กาแฟ', 'นมข้นหวาน', 'น้ำเชื่อม')
AND (CASE name WHEN 'กาแฟ' THEN 0.015 WHEN 'นมข้นหวาน' THEN 0.1 WHEN 'น้ำเชื่อม' THEN 0.05 END) IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO stock_recipes (menu_item_id, stock_item_id, qty_used)
SELECT '99b82d01-4f43-4a51-b82a-a4a92a57a238', id,
  CASE name WHEN 'มะนาว' THEN 2 WHEN 'น้ำโซดา' THEN 1 WHEN 'น้ำเชื่อม' THEN 0.07 END
FROM stock_items WHERE name IN ('มะนาว', 'น้ำโซดา', 'น้ำเชื่อม')
AND (CASE name WHEN 'มะนาว' THEN 2 WHEN 'น้ำโซดา' THEN 1 WHEN 'น้ำเชื่อม' THEN 0.07 END) IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO stock_recipes (menu_item_id, stock_item_id, qty_used)
SELECT '21eb93ce-22c9-49c6-8100-270980a903b1', id,
  CASE name WHEN 'ไก่' THEN 0.15 WHEN 'กะทิ' THEN 0.2 WHEN 'พริกแกงเขียวหวาน' THEN 0.03 WHEN 'มะเขือเปราะ' THEN 0.05 WHEN 'ใบโหระพา' THEN 0.5 WHEN 'ข้าวสาร' THEN 0.2 WHEN 'น้ำปลา' THEN 0.03 END
FROM stock_items WHERE name IN ('ไก่', 'กะทิ', 'พริกแกงเขียวหวาน', 'มะเขือเปราะ', 'ใบโหระพา', 'ข้าวสาร', 'น้ำปลา')
AND (CASE name WHEN 'ไก่' THEN 0.15 WHEN 'กะทิ' THEN 0.2 WHEN 'พริกแกงเขียวหวาน' THEN 0.03 WHEN 'มะเขือเปราะ' THEN 0.05 WHEN 'ใบโหระพา' THEN 0.5 WHEN 'ข้าวสาร' THEN 0.2 WHEN 'น้ำปลา' THEN 0.03 END) IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO stock_recipes (menu_item_id, stock_item_id, qty_used)
SELECT '5166cd73-2dc7-4b58-9a4c-df225ae1cba3', id,
  CASE name WHEN 'ไก่' THEN 0.2 WHEN 'ข้าวสาร' THEN 0.25 WHEN 'กระเทียม' THEN 0.01 WHEN 'น้ำมันพืช' THEN 0.02 WHEN 'ผักชี' THEN 0.5 END
FROM stock_items WHERE name IN ('ไก่', 'ข้าวสาร', 'กระเทียม', 'น้ำมันพืช', 'ผักชี')
AND (CASE name WHEN 'ไก่' THEN 0.2 WHEN 'ข้าวสาร' THEN 0.25 WHEN 'กระเทียม' THEN 0.01 WHEN 'น้ำมันพืช' THEN 0.02 WHEN 'ผักชี' THEN 0.5 END) IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO stock_recipes (menu_item_id, stock_item_id, qty_used)
SELECT 'b61b2f32-1e33-4207-82ef-07efefba7403', id,
  CASE name WHEN 'มะละกอ' THEN 0.2 WHEN 'มะนาว' THEN 1 WHEN 'พริกสด' THEN 0.015 WHEN 'ถั่วลิสง' THEN 0.02 WHEN 'ถั่วฝักยาว' THEN 0.03 WHEN 'น้ำปลา' THEN 0.02 WHEN 'น้ำตาลปี๊บ' THEN 0.01 END
FROM stock_items WHERE name IN ('มะละกอ', 'มะนาว', 'พริกสด', 'ถั่วลิสง', 'ถั่วฝักยาว', 'น้ำปลา', 'น้ำตาลปี๊บ')
AND (CASE name WHEN 'มะละกอ' THEN 0.2 WHEN 'มะนาว' THEN 1 WHEN 'พริกสด' THEN 0.015 WHEN 'ถั่วลิสง' THEN 0.02 WHEN 'ถั่วฝักยาว' THEN 0.03 WHEN 'น้ำปลา' THEN 0.02 WHEN 'น้ำตาลปี๊บ' THEN 0.01 END) IS NOT NULL
ON CONFLICT DO NOTHING;

-- PART 3: สร้าง Test Orders 30 วัน
DO $$
DECLARE
  v_day date;
  v_num_orders int;
  v_order_id uuid;
  v_dow int;
  v_menu record;
  v_items_count int;
  v_table_ids uuid[];
  v_table_id uuid;
  v_total numeric;
BEGIN
  SELECT array_agg(id) INTO v_table_ids FROM tables WHERE is_active = true;

  FOR d IN 1..30 LOOP
    v_day := current_date - d;
    v_dow := extract(dow FROM v_day)::int;

    v_num_orders := CASE
      WHEN v_dow IN (5, 6) THEN 10 + floor(random() * 6)::int
      WHEN v_dow = 0 THEN 8 + floor(random() * 5)::int
      ELSE 5 + floor(random() * 4)::int
    END;

    FOR o IN 1..v_num_orders LOOP
      v_table_id := v_table_ids[1 + floor(random() * array_length(v_table_ids, 1))::int];

      INSERT INTO orders (
        order_number, table_id, order_type, channel, status,
        guest_count, paid_at, created_at
      ) VALUES (
        'TEST-' || to_char(v_day, 'MMDD') || '-' || lpad(o::text, 2, '0'),
        v_table_id, 'dine_in', 'walk_in', 'paid',
        1 + floor(random() * 4)::int,
        v_day + (interval '10 hours' + (random() * interval '10 hours')),
        v_day + (interval '10 hours' + (random() * interval '10 hours'))
      ) RETURNING id INTO v_order_id;

      v_items_count := 1 + floor(random() * 4)::int;
      v_total := 0;

      FOR i IN 1..v_items_count LOOP
        SELECT * INTO v_menu FROM menu_items WHERE is_available = true ORDER BY random() LIMIT 1;

        INSERT INTO order_items (
          order_id, menu_item_id, name, price, qty, status, sent_at
        ) VALUES (
          v_order_id, v_menu.id, v_menu.name, v_menu.price,
          1 + floor(random() * 2)::int,
          'served',
          v_day + (interval '10 hours' + (random() * interval '10 hours'))
        );

        v_total := v_total + v_menu.price * (1 + floor(random() * 2)::int);
      END LOOP;

      UPDATE orders SET
        total = v_total,
        subtotal = v_total,
        paid_amount = v_total,
        payment_method = (CASE WHEN random() > 0.5 THEN 'cash' ELSE 'promptpay' END)::payment_method
      WHERE id = v_order_id;
    END LOOP;
  END LOOP;
END;
$$;
