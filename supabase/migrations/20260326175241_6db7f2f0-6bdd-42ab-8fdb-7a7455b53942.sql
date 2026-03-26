
-- Suppliers table
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  line_id text,
  address text,
  note text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table suppliers enable row level security;
create policy "suppliers_all" on suppliers for all to authenticated using (true) with check (true);

-- Add category to stock_items
alter table stock_items add column if not exists category text;

-- Seed suppliers
insert into suppliers (name, contact_name, phone, note) values
  ('ตลาดไท', 'คุณสมชาย', '081-234-5678', 'ผักสด ผลไม้'),
  ('ซีพี ฟู้ดส์', 'คุณวิภา', '02-123-4567', 'เนื้อสัตว์ อาหารแช่แข็ง'),
  ('มาลี กรุ๊ป', 'คุณมาลี', '089-876-5432', 'เครื่องดื่ม น้ำผลไม้'),
  ('แม็คโคร', null, '1432', 'วัตถุดิบทั่วไป'),
  ('ร้านนมวัว', 'คุณแดง', '086-111-2222', 'นม ครีม ชีส');

-- RPC: adjust stock with movement log
create or replace function public.adjust_stock(
  p_stock_item_id uuid,
  p_quantity_change numeric,
  p_reason text,
  p_note text default null,
  p_ref_order_id uuid default null,
  p_staff_id uuid default null
) returns void language plpgsql security definer as $$
declare
  v_before numeric;
  v_after numeric;
begin
  select qty into v_before from stock_items where id = p_stock_item_id for update;
  v_after := greatest(0, v_before + p_quantity_change);

  update stock_items set qty = v_after, updated_at = now() where id = p_stock_item_id;

  insert into stock_logs (stock_item_id, change_qty, reason, ref_order_id, staff_id)
  values (p_stock_item_id, p_quantity_change, p_reason, p_ref_order_id, p_staff_id);
end;
$$;
