-- ENHANCE EXISTING: add movement_type to stock_logs
alter table stock_logs
  add column if not exists movement_type text default 'manual';

-- ENHANCE EXISTING: add fields to stock_items
alter table stock_items
  add column if not exists last_restocked_at timestamptz,
  add column if not exists supplier_id uuid;

-- AUTO-DEDUCT trigger (recreate with movement_type support)
create or replace function trigger_deduct_stock_on_sent()
returns trigger language plpgsql security definer as $$
declare v_recipe record;
begin
  if new.status = 'sent' and (old.status is null or old.status != 'sent') then
    for v_recipe in
      select sr.stock_item_id, sr.qty_used * new.qty as total_used
      from stock_recipes sr
      where sr.menu_item_id = new.menu_item_id
    loop
      insert into stock_logs (stock_item_id, change_qty, reason, ref_order_id, movement_type)
      values (v_recipe.stock_item_id, -v_recipe.total_used,
        'Auto-deduct: ' || new.name || ' x' || new.qty,
        new.order_id, 'usage');

      update stock_items
      set qty = qty - v_recipe.total_used,
          updated_at = now()
      where id = v_recipe.stock_item_id;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_deduct_stock_on_sent on order_items;
create trigger trg_deduct_stock_on_sent
  after insert or update of status on order_items
  for each row execute function trigger_deduct_stock_on_sent();

-- LOW-STOCK CHECK RPC
create or replace function check_low_stock_and_disable_menu()
returns jsonb language plpgsql security definer as $$
declare v_result jsonb := '[]';
begin
  update menu_items set is_available = false
  where id in (
    select distinct sr.menu_item_id
    from stock_recipes sr
    join stock_items si on si.id = sr.stock_item_id
    where si.qty <= 0 and si.is_active = true
  ) and is_available = true;

  select coalesce(jsonb_agg(row_to_json(r)), '[]') into v_result
  from (
    select si.id, si.name, si.qty, si.min_threshold, si.unit
    from stock_items si
    where si.qty <= si.min_threshold and si.is_active = true
    order by si.qty asc
  ) r;

  return v_result;
end;
$$;

-- NUTRITION: add missing columns to menu_items
alter table menu_items
  add column if not exists sugar_g numeric(6,1),
  add column if not exists saturated_fat_g numeric(6,1),
  add column if not exists cholesterol_mg numeric(8,1),
  add column if not exists serving_size text,
  add column if not exists serving_unit text default 'จาน',
  add column if not exists ingredients_detail jsonb default '[]',
  add column if not exists nutrition_published boolean default true;

-- ALLERGEN TYPES reference table
create table if not exists allergen_types (
  id uuid primary key default gen_random_uuid(),
  name_th text not null, name_en text not null,
  icon text default '⚠️', severity text default 'warning',
  sort_order int default 0
);
alter table allergen_types enable row level security;
drop policy if exists "allergen_all" on allergen_types;
create policy "allergen_all" on allergen_types
  for all to authenticated using (true) with check (true);
drop policy if exists "allergen_anon_read" on allergen_types;
create policy "allergen_anon_read" on allergen_types
  for select to anon using (true);

-- DIET TAG TYPES reference table
create table if not exists diet_tag_types (
  id uuid primary key default gen_random_uuid(),
  name_th text not null, name_en text not null,
  short_code text not null, icon text default '🏷',
  color text default '#888', sort_order int default 0
);
alter table diet_tag_types enable row level security;
drop policy if exists "diet_tag_all" on diet_tag_types;
create policy "diet_tag_all" on diet_tag_types
  for all to authenticated using (true) with check (true);
drop policy if exists "diet_tag_anon_read" on diet_tag_types;
create policy "diet_tag_anon_read" on diet_tag_types
  for select to anon using (true);