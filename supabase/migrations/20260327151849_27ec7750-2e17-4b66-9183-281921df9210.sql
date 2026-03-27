
-- Tables were created in previous migration attempt, but functions failed.
-- Re-create tables with IF NOT EXISTS (safe), then add columns.

create table if not exists stock_count_sessions (
  id uuid primary key default gen_random_uuid(),
  counted_by text,
  started_at timestamptz default now(),
  completed_at timestamptz,
  status text default 'in_progress',
  total_items int default 0,
  items_with_diff int default 0,
  total_diff_value numeric(12,2) default 0,
  note text
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_count_sessions' AND policyname = 'stock_count_sessions_all') THEN
    alter table stock_count_sessions enable row level security;
    create policy "stock_count_sessions_all" on stock_count_sessions for all to authenticated using (true) with check (true);
  END IF;
END $$;

create table if not exists stock_count_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references stock_count_sessions(id) on delete cascade,
  stock_item_id uuid references stock_items(id) on delete cascade,
  system_qty numeric(12,3) not null,
  actual_qty numeric(12,3),
  difference numeric(12,3) generated always as (actual_qty - system_qty) stored,
  diff_value numeric(12,2),
  note text
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_count_items' AND policyname = 'stock_count_items_all') THEN
    alter table stock_count_items enable row level security;
    create policy "stock_count_items_all" on stock_count_items for all to authenticated using (true) with check (true);
  END IF;
END $$;

create table if not exists ai_stock_insights (
  id uuid primary key default gen_random_uuid(),
  insight_type text not null,
  stock_item_id uuid references stock_items(id),
  data jsonb not null default '{}',
  severity text default 'info',
  is_acknowledged boolean default false,
  acknowledged_by text,
  acknowledged_at timestamptz,
  created_at timestamptz default now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_stock_insights' AND policyname = 'ai_stock_insights_all') THEN
    alter table ai_stock_insights enable row level security;
    create policy "ai_stock_insights_all" on ai_stock_insights for all to authenticated using (true) with check (true);
  END IF;
END $$;

alter table stock_items
  add column if not exists lead_time_days int default 2,
  add column if not exists shelf_life_days int,
  add column if not exists safety_factor numeric(3,1) default 1.2;
