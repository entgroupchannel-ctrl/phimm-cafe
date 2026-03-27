
create or replace function forecast_stock_demand(
  p_stock_item_id uuid, p_days int default 7
) returns jsonb language sql security definer set search_path = public as $fn$
  with dow_daily as (
    select o2.paid_at::date as dt, extract(dow from o2.paid_at)::int as dow_val,
           sum(oi2.qty * sr2.qty_used) as day_total
    from order_items oi2
    join orders o2 on o2.id = oi2.order_id
    join stock_recipes sr2 on sr2.menu_item_id = oi2.menu_item_id
    where sr2.stock_item_id = p_stock_item_id
      and o2.status = 'paid'
      and o2.paid_at >= now() - interval '28 days'
    group by o2.paid_at::date, extract(dow from o2.paid_at)::int
  ),
  dow_avgs as (
    select dow_val as dow, coalesce(avg(day_total), 0) as avg_usage
    from dow_daily
    group by dow_val
  ),
  dow_lookup as (
    select d.n as dow, coalesce(da.avg_usage, 0) as avg_usage
    from generate_series(0, 6) as d(n)
    left join dow_avgs da on da.dow = d.n
  ),
  forecast_days as (
    select
      (current_date + d.n) as forecast_date,
      extract(dow from current_date + d.n)::int as dow,
      coalesce(dl.avg_usage, 0) as predicted_usage
    from generate_series(0, p_days - 1) as d(n)
    left join dow_lookup dl on dl.dow = extract(dow from current_date + d.n)::int
  ),
  totals as (
    select
      coalesce(sum(predicted_usage), 0) as forecast_total,
      case when coalesce(sum(predicted_usage), 0) > 0 then sum(predicted_usage)::numeric / p_days else 0 end as avg_daily
    from forecast_days
  ),
  stock_info as (
    select qty, lead_time_days, safety_factor from stock_items where id = p_stock_item_id
  )
  select jsonb_build_object(
    'stock_item_id', p_stock_item_id,
    'current_qty', si.qty,
    'avg_daily_usage', round(t.avg_daily::numeric, 2),
    'forecast_total', round(t.forecast_total::numeric, 2),
    'days_until_empty', case when t.avg_daily > 0
      then round((si.qty / t.avg_daily)::numeric, 1) else 999 end,
    'reorder_point', round((t.avg_daily * coalesce(si.lead_time_days, 2) * coalesce(si.safety_factor, 1.2))::numeric, 2),
    'should_order_now', si.qty <= (t.avg_daily * coalesce(si.lead_time_days, 2) * coalesce(si.safety_factor, 1.2)),
    'suggested_order_qty', greatest(0, round((t.forecast_total + t.avg_daily * coalesce(si.lead_time_days, 2) * coalesce(si.safety_factor, 1.2) - si.qty)::numeric, 1)),
    'daily_forecast', (select coalesce(jsonb_agg(jsonb_build_object('date', fd.forecast_date, 'dow', fd.dow, 'predicted_usage', round(fd.predicted_usage::numeric, 2)) order by fd.forecast_date), '[]') from forecast_days fd)
  )
  from totals t, stock_info si;
$fn$;
