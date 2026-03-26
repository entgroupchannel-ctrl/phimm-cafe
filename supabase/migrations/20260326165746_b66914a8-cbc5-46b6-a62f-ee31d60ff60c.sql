
DROP POLICY IF EXISTS "auth_all_purchase_orders" ON public.purchase_orders;
CREATE POLICY "auth_all_purchase_orders" ON public.purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_all_purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "auth_all_purchase_order_items" ON public.purchase_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
