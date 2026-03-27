
-- Kitchen stations
create table if not exists kitchen_stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  icon text default '🍳',
  color text default '#888780',
  sort_order int default 0,
  is_active boolean default true,
  printer_name text,
  printer_ip text,
  display_device_id uuid,
  auto_accept boolean default true,
  avg_prep_minutes int default 10,
  created_at timestamptz default now()
);

alter table kitchen_stations enable row level security;
create policy "kitchen_stations_all" on kitchen_stations
  for all to authenticated using (true) with check (true);

-- Menu category → station routing
create table if not exists menu_station_routing (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references menu_categories(id) on delete cascade,
  station_id uuid references kitchen_stations(id) on delete cascade,
  priority int default 1,
  is_active boolean default true,
  unique(category_id, station_id)
);

alter table menu_station_routing enable row level security;
create policy "routing_all" on menu_station_routing
  for all to authenticated using (true) with check (true);

-- Per-item override
create table if not exists menu_item_station_override (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid references menu_items(id) on delete cascade,
  station_id uuid references kitchen_stations(id) on delete cascade,
  unique(menu_item_id)
);

alter table menu_item_station_override enable row level security;
create policy "override_all" on menu_item_station_override
  for all to authenticated using (true) with check (true);

-- KDS device enrollment
create table if not exists kds_devices (
  id uuid primary key default gen_random_uuid(),
  device_name text not null,
  device_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  station_id uuid references kitchen_stations(id),
  device_type text default 'tablet' check (device_type in (
    'tablet', 'panel_pc', 'phone', 'desktop'
  )),
  last_seen_at timestamptz,
  is_active boolean default true,
  screen_mode text default 'station' check (screen_mode in (
    'station', 'all', 'expeditor'
  )),
  created_at timestamptz default now()
);

alter table kds_devices enable row level security;
create policy "kds_devices_all" on kds_devices
  for all to authenticated using (true) with check (true);

-- Add station_id to order_items
alter table order_items
  add column if not exists station_id uuid references kitchen_stations(id),
  add column if not exists station_done_at timestamptz;

-- Order consolidation tracking
create table if not exists order_station_status (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  station_id uuid references kitchen_stations(id) on delete cascade,
  items_total int default 0,
  items_done int default 0,
  status text default 'pending' check (status in (
    'pending', 'in_progress', 'done'
  )),
  started_at timestamptz,
  completed_at timestamptz,
  unique(order_id, station_id)
);

alter table order_station_status enable row level security;
create policy "oss_all" on order_station_status
  for all to authenticated using (true) with check (true);

-- Table zones
alter table tables
  add column if not exists zone_id uuid,
  add column if not exists pos_x int default 0,
  add column if not exists pos_y int default 0,
  add column if not exists width int default 80,
  add column if not exists height int default 80,
  add column if not exists shape text default 'square';

create table if not exists table_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text default '#888780',
  floor int default 1,
  sort_order int default 0,
  is_active boolean default true
);

alter table table_zones enable row level security;
create policy "zones_all" on table_zones
  for all to authenticated using (true) with check (true);

-- RPC: route order items to stations
create or replace function route_order_to_stations(p_order_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_item record;
  v_station_id uuid;
  v_result jsonb := '[]';
  v_stations_used uuid[] := '{}';
begin
  for v_item in
    select oi.id as item_id, oi.menu_item_id, mi.category_id
    from order_items oi
    join menu_items mi on mi.id = oi.menu_item_id
    where oi.order_id = p_order_id
      and oi.station_id is null
  loop
    select miso.station_id into v_station_id
    from menu_item_station_override miso
    where miso.menu_item_id = v_item.menu_item_id;

    if v_station_id is null then
      select msr.station_id into v_station_id
      from menu_station_routing msr
      where msr.category_id = v_item.category_id
        and msr.is_active = true
      order by msr.priority
      limit 1;
    end if;

    if v_station_id is not null then
      update order_items set station_id = v_station_id
      where id = v_item.item_id;

      if not v_station_id = any(v_stations_used) then
        v_stations_used := array_append(v_stations_used, v_station_id);
      end if;
    end if;
  end loop;

  if v_stations_used is not null and array_length(v_stations_used, 1) > 0 then
    for i in 1..array_length(v_stations_used, 1) loop
      insert into order_station_status (order_id, station_id, items_total)
      select p_order_id, v_stations_used[i], count(*)
      from order_items
      where order_id = p_order_id and station_id = v_stations_used[i]
      on conflict (order_id, station_id) do update set
        items_total = excluded.items_total;
    end loop;
  end if;

  select jsonb_agg(jsonb_build_object(
    'station_id', ks.id,
    'station_name', ks.name,
    'item_count', (
      select count(*) from order_items
      where order_id = p_order_id and station_id = ks.id
    )
  )) into v_result
  from kitchen_stations ks
  where ks.id = any(v_stations_used);

  return coalesce(v_result, '[]');
end;
$$;

-- RPC: mark station item done + check consolidation
create or replace function mark_station_item_done(p_item_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_order_id uuid;
  v_station_id uuid;
  v_order_all_done boolean;
begin
  select order_id, station_id into v_order_id, v_station_id
  from order_items where id = p_item_id;

  update order_items set station_done_at = now() where id = p_item_id;

  if v_station_id is not null then
    update order_station_status
    set items_done = (
      select count(*) from order_items
      where order_id = v_order_id and station_id = v_station_id and station_done_at is not null
    ),
    status = case
      when (select count(*) from order_items
            where order_id = v_order_id and station_id = v_station_id and station_done_at is null) = 0
      then 'done' else 'in_progress' end,
    completed_at = case
      when (select count(*) from order_items
            where order_id = v_order_id and station_id = v_station_id and station_done_at is null) = 0
      then now() else null end
    where order_id = v_order_id and station_id = v_station_id;
  end if;

  select not exists(
    select 1 from order_station_status
    where order_id = v_order_id and status != 'done'
  ) into v_order_all_done;

  return jsonb_build_object(
    'order_id', v_order_id,
    'station_id', v_station_id,
    'all_stations_done', coalesce(v_order_all_done, true)
  );
end;
$$;

-- Trigger: auto-route when order items status changes to sent
create or replace function trigger_route_on_send()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'sent' and (old.status is null or old.status != 'sent') then
    if exists(select 1 from kitchen_stations where is_active = true) then
      perform route_order_to_stations(new.order_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_route_on_send on order_items;
create trigger trg_route_on_send
  after update of status on order_items
  for each row execute function trigger_route_on_send();

-- Trigger on insert with status='sent' (from Kiosk)
create or replace function trigger_route_on_insert_sent()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'sent' then
    if exists(select 1 from kitchen_stations where is_active = true) then
      perform route_order_to_stations(new.order_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_route_on_insert on order_items;
create trigger trg_route_on_insert
  after insert on order_items
  for each row execute function trigger_route_on_insert_sent();

-- Seed default stations
insert into kitchen_stations (name, short_name, icon, color, sort_order) values
  ('เตาผัด / Wok', 'WOK', '🔥', '#D85A30', 1),
  ('ย่าง-ทอด / Grill', 'GRILL', '🥩', '#BA7517', 2),
  ('เครื่องดื่ม / Drinks', 'DRINK', '☕', '#185FA5', 3),
  ('ของหวาน / Dessert', 'SWEET', '🍰', '#1D9E75', 4);

-- Seed default zones
insert into table_zones (name, color, floor, sort_order) values
  ('หน้าร้าน', '#4338CA', 1, 1),
  ('ในร้าน', '#0891B2', 1, 2),
  ('ระเบียง', '#059669', 1, 3),
  ('VIP', '#D97706', 1, 4);
