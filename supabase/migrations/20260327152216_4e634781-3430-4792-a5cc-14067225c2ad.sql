
create or replace function run_stock_ai_analysis()
returns jsonb language sql security definer set search_path = public as $fn$
  with active_items as (
    select id, name, qty, min_threshold, lead_time_days, cost_per_unit
    from stock_items where is_active = true
  ),
  forecasts as (
    select ai.id as item_id, ai.name as item_name, ai.qty as current_qty,
           ai.lead_time_days, ai.cost_per_unit,
           forecast_stock_demand(ai.id, 7) as forecast,
           calc_expected_stock(ai.id, current_date - 7, current_date) as expected
    from active_items ai
  ),
  with_metrics as (
    select f.*,
           coalesce((f.expected->>'waste_pct')::numeric, 0) as waste_pct,
           coalesce((f.forecast->>'days_until_empty')::numeric, 999) as days_left,
           coalesce((f.forecast->>'should_order_now')::boolean, false) as should_order
    from forecasts f
  ),
  inserted_forecasts as (
    insert into ai_stock_insights (insight_type, stock_item_id, data, severity)
    select 'demand_forecast', wm.item_id, wm.forecast,
           case when wm.days_left <= 1 then 'critical' else 'warning' end
    from with_metrics wm
    where wm.days_left <= coalesce(wm.lead_time_days, 2) + 1
    returning id
  ),
  inserted_waste as (
    insert into ai_stock_insights (insight_type, stock_item_id, data, severity)
    select 'waste_detection', wm.item_id, wm.expected,
           case when wm.waste_pct > 10 then 'critical' else 'warning' end
    from with_metrics wm
    where wm.waste_pct > 5
    returning id
  ),
  inserted_reorder as (
    insert into ai_stock_insights (insight_type, stock_item_id, data, severity)
    select 'smart_reorder', wm.item_id,
           jsonb_build_object(
             'suggested_qty', wm.forecast->'suggested_order_qty',
             'days_until_empty', wm.forecast->'days_until_empty',
             'cost_estimate', round(((wm.forecast->>'suggested_order_qty')::numeric * coalesce(wm.cost_per_unit, 0))::numeric, 2)
           ), 'info'
    from with_metrics wm
    where wm.should_order = true
    returning id
  )
  select jsonb_build_object(
    'analyzed_at', now(),
    'total_items', (select count(*) from with_metrics),
    'alerts_created', (select count(*) from inserted_forecasts) + (select count(*) from inserted_waste) + (select count(*) from inserted_reorder),
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
      'item_id', wm.item_id, 'item_name', wm.item_name,
      'current_qty', wm.current_qty, 'days_until_empty', wm.days_left,
      'waste_pct', wm.waste_pct, 'should_order', wm.should_order,
      'forecast', wm.forecast, 'expected', wm.expected
    )), '[]') from with_metrics wm)
  );
$fn$;
