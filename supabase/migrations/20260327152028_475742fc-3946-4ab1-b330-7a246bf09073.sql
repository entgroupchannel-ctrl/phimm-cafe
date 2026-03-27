
create or replace function calc_expected_stock(
  p_stock_item_id uuid,
  p_from date default current_date - interval '7 days',
  p_to date default current_date
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_start_qty numeric;
  v_purchases numeric;
  v_expected_usage numeric;
  v_actual_usage numeric;
  v_result jsonb;
begin
  select si.qty into v_start_qty from stock_items si where si.id = p_stock_item_id;
  select coalesce(sum(sl.change_qty), 0) into v_purchases
  from stock_logs sl where sl.stock_item_id = p_stock_item_id
    and sl.created_at::date between p_from and p_to and sl.change_qty > 0;
  select coalesce(sum(oi.qty * sr.qty_used), 0) into v_expected_usage
  from order_items oi join orders o on o.id = oi.order_id
  join stock_recipes sr on sr.menu_item_id = oi.menu_item_id
  where sr.stock_item_id = p_stock_item_id and o.status = 'paid'
    and o.paid_at::date between p_from and p_to;
  select coalesce(abs(sum(sl.change_qty)), 0) into v_actual_usage
  from stock_logs sl where sl.stock_item_id = p_stock_item_id
    and sl.created_at::date between p_from and p_to and sl.change_qty < 0;
  v_result := jsonb_build_object(
    'stock_item_id', p_stock_item_id, 'period_from', p_from, 'period_to', p_to,
    'purchases', v_purchases, 'expected_usage', v_expected_usage,
    'actual_usage', v_actual_usage,
    'waste_or_loss', v_actual_usage - v_expected_usage,
    'waste_pct', case when v_expected_usage > 0
      then round(((v_actual_usage - v_expected_usage) / v_expected_usage * 100)::numeric, 1)
      else 0 end,
    'current_qty', v_start_qty
  );
  return v_result;
end;
$fn$;
