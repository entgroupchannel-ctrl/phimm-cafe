-- Staff weekly schedule template
create table if not exists staff_schedules (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff(id) on delete cascade,
  day_of_week int not null,
  shift_start time not null,
  shift_end time not null,
  is_day_off boolean default false,
  created_at timestamptz default now(),
  unique(staff_id, day_of_week)
);

alter table staff_schedules enable row level security;
create policy "staff_schedules_all" on staff_schedules
  for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table staff_schedules;

-- Customer feedback
create table if not exists customer_feedback (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  customer_id uuid references customers(id),
  rating int not null,
  comment text,
  created_at timestamptz default now()
);

alter table customer_feedback enable row level security;
create policy "feedback_all" on customer_feedback
  for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table customer_feedback;

-- Enrich daily_summaries with more analytics columns
alter table daily_summaries
  add column if not exists total_guests int default 0,
  add column if not exists avg_order_value numeric(10,2) default 0,
  add column if not exists total_discount numeric(10,2) default 0,
  add column if not exists total_service_charge numeric(10,2) default 0,
  add column if not exists payment_breakdown jsonb default '{}',
  add column if not exists channel_breakdown jsonb default '{}',
  add column if not exists top_items jsonb default '[]',
  add column if not exists hourly_revenue jsonb default '[]',
  add column if not exists new_customers int default 0,
  add column if not exists loyalty_points_earned int default 0;

-- Add avatar_emoji to staff (optional display)
alter table staff add column if not exists avatar_emoji text default '👤';

-- Add break_minutes to staff_sessions
alter table staff_sessions add column if not exists break_minutes int default 0;

-- RPC: generate daily summary from orders
create or replace function generate_daily_summary(p_date date)
returns void language plpgsql security definer as $$
declare
  v_revenue numeric;
  v_orders int;
  v_guests int;
  v_avg numeric;
  v_discount numeric;
  v_vat numeric;
  v_sc numeric;
  v_payment jsonb;
  v_channel jsonb;
  v_top jsonb;
  v_hourly jsonb;
  v_new_cust int;
  v_points int;
begin
  select
    coalesce(sum(total), 0),
    count(*),
    coalesce(sum(guest_count), 0),
    coalesce(avg(total), 0),
    coalesce(sum(discount_amount), 0),
    coalesce(sum(vat_amount), 0),
    coalesce(sum(service_charge), 0)
  into v_revenue, v_orders, v_guests, v_avg, v_discount, v_vat, v_sc
  from orders
  where status = 'paid'
    and paid_at::date = p_date;

  select coalesce(jsonb_object_agg(pm, cnt), '{}')
  into v_payment
  from (
    select payment_method::text as pm, count(*) as cnt
    from orders
    where status = 'paid' and paid_at::date = p_date
    group by payment_method
  ) x;

  select coalesce(jsonb_object_agg(ch, cnt), '{}')
  into v_channel
  from (
    select coalesce(channel::text, 'walk_in') as ch, count(*) as cnt
    from orders
    where status = 'paid' and paid_at::date = p_date
    group by channel
  ) x;

  select coalesce(jsonb_agg(row_to_json(t)), '[]')
  into v_top
  from (
    select oi.name, sum(oi.qty) as total_qty,
           sum(oi.price * oi.qty) as total_sales
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.status = 'paid' and o.paid_at::date = p_date
    group by oi.name
    order by total_qty desc
    limit 10
  ) t;

  select coalesce(jsonb_agg(row_to_json(h)), '[]')
  into v_hourly
  from (
    select extract(hour from paid_at)::int as hour,
           coalesce(sum(total), 0) as revenue,
           count(*) as orders
    from orders
    where status = 'paid' and paid_at::date = p_date
    group by extract(hour from paid_at)
    order by hour
  ) h;

  select count(*) into v_new_cust
  from customers
  where created_at::date = p_date;

  select coalesce(sum(points_change), 0) into v_points
  from loyalty_transactions
  where created_at::date = p_date and points_change > 0;

  insert into daily_summaries (
    date, total_income, total_orders, total_guests,
    avg_order_value, total_discount, vat_collected, total_service_charge,
    payment_breakdown, channel_breakdown, top_items, hourly_revenue,
    new_customers, loyalty_points_earned, net_profit,
    cash_amount, promptpay_amount, card_amount
  ) values (
    p_date, v_revenue, v_orders, v_guests,
    v_avg, v_discount, v_vat, v_sc,
    v_payment, v_channel, v_top, v_hourly,
    v_new_cust, v_points, v_revenue - v_discount,
    0, 0, 0
  )
  on conflict (date) do update set
    total_income = excluded.total_income,
    total_orders = excluded.total_orders,
    total_guests = excluded.total_guests,
    avg_order_value = excluded.avg_order_value,
    total_discount = excluded.total_discount,
    vat_collected = excluded.vat_collected,
    total_service_charge = excluded.total_service_charge,
    payment_breakdown = excluded.payment_breakdown,
    channel_breakdown = excluded.channel_breakdown,
    top_items = excluded.top_items,
    hourly_revenue = excluded.hourly_revenue,
    new_customers = excluded.new_customers,
    loyalty_points_earned = excluded.loyalty_points_earned;
end;
$$;
