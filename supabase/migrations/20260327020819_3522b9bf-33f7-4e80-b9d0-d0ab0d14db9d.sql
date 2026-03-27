
-- ═══ TASK 1: Staff + Payroll + Leave DB Migration ═══

-- 1. Enhanced staff fields (email already exists, skip it)
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS line_token text,
  ADD COLUMN IF NOT EXISTS line_user_id text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS start_date date DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS salary_type text DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS monthly_salary numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_rate numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ot_rate_multiplier numeric(4,2) DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS social_security_id text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS emergency_phone text,
  ADD COLUMN IF NOT EXISTS push_subscription jsonb;

-- 2. Enhanced staff_sessions (clock-in tracking)
ALTER TABLE staff_sessions
  ADD COLUMN IF NOT EXISTS clock_in_method text DEFAULT 'pin',
  ADD COLUMN IF NOT EXISTS clock_in_lat numeric(10,7),
  ADD COLUMN IF NOT EXISTS clock_in_lng numeric(10,7),
  ADD COLUMN IF NOT EXISTS clock_out_lat numeric(10,7),
  ADD COLUMN IF NOT EXISTS clock_out_lng numeric(10,7),
  ADD COLUMN IF NOT EXISTS is_late boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_minutes int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ot_minutes int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ot_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regular_hours numeric(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_pay numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS shift_status text DEFAULT 'pending';

-- 3. Leave types
CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_th text NOT NULL,
  name_en text NOT NULL,
  icon text DEFAULT '📋',
  days_per_year int DEFAULT 0,
  is_paid boolean DEFAULT true,
  deduct_from_pay boolean DEFAULT false,
  color text DEFAULT '#888780',
  sort_order int DEFAULT 0
);

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leave_types_all' AND tablename = 'leave_types') THEN
    CREATE POLICY "leave_types_all" ON leave_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  leave_type_id uuid REFERENCES leave_types(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count numeric(4,1) NOT NULL DEFAULT 1,
  reason text,
  status text DEFAULT 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leave_requests_all' AND tablename = 'leave_requests') THEN
    CREATE POLICY "leave_requests_all" ON leave_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Leave balances
CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  leave_type_id uuid REFERENCES leave_types(id),
  year int NOT NULL,
  entitlement numeric(5,1) DEFAULT 0,
  used numeric(5,1) DEFAULT 0,
  remaining numeric(5,1) GENERATED ALWAYS AS (entitlement - used) STORED,
  UNIQUE(staff_id, leave_type_id, year)
);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leave_bal_all' AND tablename = 'leave_balances') THEN
    CREATE POLICY "leave_bal_all" ON leave_balances FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. Payroll periods
CREATE TABLE IF NOT EXISTS payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'draft',
  total_amount numeric(14,2) DEFAULT 0,
  approved_by text,
  approved_at timestamptz,
  paid_at timestamptz,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payroll_periods_all' AND tablename = 'payroll_periods') THEN
    CREATE POLICY "payroll_periods_all" ON payroll_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 7. Payroll items
CREATE TABLE IF NOT EXISTS payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid REFERENCES payroll_periods(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id),
  regular_hours numeric(6,2) DEFAULT 0,
  ot_hours numeric(6,2) DEFAULT 0,
  regular_pay numeric(10,2) DEFAULT 0,
  ot_pay numeric(10,2) DEFAULT 0,
  gross_pay numeric(10,2) DEFAULT 0,
  deduction_late numeric(10,2) DEFAULT 0,
  deduction_leave numeric(10,2) DEFAULT 0,
  deduction_social_security numeric(10,2) DEFAULT 0,
  deduction_tax numeric(10,2) DEFAULT 0,
  deduction_other numeric(10,2) DEFAULT 0,
  deduction_note text,
  bonus numeric(10,2) DEFAULT 0,
  bonus_note text,
  net_pay numeric(10,2) DEFAULT 0,
  days_worked int DEFAULT 0,
  days_late int DEFAULT 0,
  days_absent int DEFAULT 0,
  days_leave int DEFAULT 0
);

ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payroll_items_all' AND tablename = 'payroll_items') THEN
    CREATE POLICY "payroll_items_all" ON payroll_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 8. Schedule publishes
CREATE TABLE IF NOT EXISTS schedule_publishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  published_by text,
  published_at timestamptz DEFAULT now(),
  notify_method text[] DEFAULT '{}'
);

ALTER TABLE schedule_publishes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'schedule_pub_all' AND tablename = 'schedule_publishes') THEN
    CREATE POLICY "schedule_pub_all" ON schedule_publishes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 9. Staff notifications
CREATE TABLE IF NOT EXISTS staff_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  channel text,
  is_read boolean DEFAULT false,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE staff_notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_notif_all' AND tablename = 'staff_notifications') THEN
    CREATE POLICY "staff_notif_all" ON staff_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 10. Seed leave types (Thai labor law)
INSERT INTO leave_types (name_th, name_en, icon, days_per_year, is_paid, color, sort_order) VALUES
  ('ลาป่วย', 'Sick Leave', '🤒', 30, true, '#E24B4A', 1),
  ('ลากิจ', 'Personal Leave', '📋', 3, true, '#185FA5', 2),
  ('ลาพักร้อน', 'Annual Leave', '🏖️', 6, true, '#1D9E75', 3),
  ('ลาคลอด', 'Maternity Leave', '👶', 98, true, '#D4537E', 4),
  ('ลาบวช', 'Ordination Leave', '🙏', 15, true, '#D97706', 5),
  ('ลาไม่รับค่าจ้าง', 'Unpaid Leave', '⏸️', 0, false, '#888780', 6)
ON CONFLICT DO NOTHING;

-- 11. RPC: calculate payroll (uses staff_sessions not staff_shifts)
CREATE OR REPLACE FUNCTION calculate_payroll(p_period_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_period record;
  v_staff record;
  v_regular_hrs numeric;
  v_ot_hrs numeric;
  v_regular_pay numeric;
  v_ot_pay numeric;
  v_gross numeric;
  v_deduct_late numeric;
  v_deduct_leave numeric;
  v_deduct_ss numeric;
  v_net numeric;
  v_days_worked int;
  v_days_late int;
  v_days_leave int;
  v_hourly numeric;
BEGIN
  SELECT * INTO v_period FROM payroll_periods WHERE id = p_period_id;

  -- Delete existing items for recalculation
  DELETE FROM payroll_items WHERE period_id = p_period_id;

  FOR v_staff IN SELECT * FROM staff WHERE is_active = true
  LOOP
    v_hourly := CASE v_staff.salary_type
      WHEN 'hourly' THEN COALESCE(v_staff.hourly_rate, 0)
      WHEN 'daily' THEN COALESCE(v_staff.daily_rate, 0) / 8
      WHEN 'monthly' THEN COALESCE(v_staff.monthly_salary, 0) / 26 / 8
      ELSE COALESCE(v_staff.hourly_rate, 0)
    END;

    SELECT
      COALESCE(SUM(LEAST(8, COALESCE(ss.total_hours, 0) - COALESCE(ss.break_minutes, 0) / 60.0)), 0),
      COALESCE(SUM(GREATEST(0, COALESCE(ss.total_hours, 0) - COALESCE(ss.break_minutes, 0) / 60.0 - 8)), 0),
      COUNT(DISTINCT ss.clock_in::date),
      COUNT(DISTINCT ss.clock_in::date) FILTER (WHERE ss.is_late = true)
    INTO v_regular_hrs, v_ot_hrs, v_days_worked, v_days_late
    FROM staff_sessions ss
    WHERE ss.staff_id = v_staff.id
      AND ss.clock_in::date BETWEEN v_period.start_date AND v_period.end_date
      AND ss.clock_out IS NOT NULL;

    SELECT COALESCE(SUM(lr.days_count), 0) INTO v_days_leave
    FROM leave_requests lr
    WHERE lr.staff_id = v_staff.id
      AND lr.status = 'approved'
      AND lr.start_date BETWEEN v_period.start_date AND v_period.end_date;

    v_regular_pay := ROUND(v_regular_hrs * v_hourly, 2);
    v_ot_pay := ROUND(v_ot_hrs * v_hourly * COALESCE(v_staff.ot_rate_multiplier, 1.5), 2);
    v_gross := v_regular_pay + v_ot_pay;

    v_deduct_late := ROUND(v_days_late * v_hourly * 0.5, 2);

    SELECT COALESCE(SUM(
      CASE WHEN lt.is_paid = false THEN lr.days_count * v_hourly * 8 ELSE 0 END
    ), 0) INTO v_deduct_leave
    FROM leave_requests lr
    JOIN leave_types lt ON lt.id = lr.leave_type_id
    WHERE lr.staff_id = v_staff.id
      AND lr.status = 'approved'
      AND lr.start_date BETWEEN v_period.start_date AND v_period.end_date;

    v_deduct_ss := CASE WHEN v_gross > 0 THEN LEAST(ROUND(v_gross * 0.05, 2), 750) ELSE 0 END;

    v_net := v_gross - v_deduct_late - v_deduct_leave - v_deduct_ss;

    INSERT INTO payroll_items (
      period_id, staff_id, regular_hours, ot_hours,
      regular_pay, ot_pay, gross_pay,
      deduction_late, deduction_leave, deduction_social_security,
      net_pay, days_worked, days_late, days_leave
    ) VALUES (
      p_period_id, v_staff.id, v_regular_hrs, v_ot_hrs,
      v_regular_pay, v_ot_pay, v_gross,
      v_deduct_late, v_deduct_leave, v_deduct_ss,
      v_net, v_days_worked, v_days_late, v_days_leave
    );
  END LOOP;

  UPDATE payroll_periods SET
    status = 'calculated',
    total_amount = (SELECT COALESCE(SUM(net_pay), 0) FROM payroll_items WHERE period_id = p_period_id)
  WHERE id = p_period_id;
END;
$$;
