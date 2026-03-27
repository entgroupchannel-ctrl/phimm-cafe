import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Home, Calendar, Clock, Palmtree, User } from "lucide-react";

// ── Staff PIN Auth (separate from main auth) ──
function StaffPinLogin({ onLogin }: { onLogin: (staff: any) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  async function submit() {
    if (pin.length < 4) return;
    const { data } = await supabase.rpc("verify_pin", { input_pin: pin });
    if (data && data.length > 0) {
      const s = data[0];
      const staffInfo = { id: s.staff_id, name: s.staff_name, nickname: s.staff_nickname, roleLabel: s.role_label };
      sessionStorage.setItem("staff_app_user", JSON.stringify(staffInfo));
      onLogin(staffInfo);
    } else {
      setError("PIN ไม่ถูกต้อง");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin("");
    }
  }

  const addDigit = (d: string) => { if (pin.length < 6) setPin(pin + d); };
  const backspace = () => setPin(pin.slice(0, -1));

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="text-[24px] font-black text-gray-900 mb-1">Phimm Cafe</div>
      <div className="text-[13px] text-gray-500 mb-8">ลงชื่อเข้าใช้สำหรับพนักงาน</div>
      <div className={cn("transition-transform", shake && "animate-[shake_0.3s_ease-in-out]")}>
        <div className="flex gap-3 mb-6 justify-center">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className={cn("w-4 h-4 rounded-full border-2 transition-all",
              i < pin.length ? "bg-blue-600 border-blue-600" : "border-gray-300")} />
          ))}
        </div>
      </div>
      {error && <div className="text-red-500 text-[12px] mb-4">{error}</div>}
      <div className="grid grid-cols-3 gap-3 max-w-[280px] w-full">
        {["1","2","3","4","5","6","7","8","9","","0","⌫"].map(d => (
          <button key={d} onClick={() => d === "⌫" ? backspace() : d ? addDigit(d) : null} disabled={!d}
            className={cn("h-14 rounded-2xl text-[20px] font-bold transition-colors select-none",
              !d ? "invisible" : d === "⌫" ? "bg-gray-100 text-gray-600 active:bg-gray-200" : "bg-gray-100 text-gray-900 active:bg-blue-100")}>
            {d}
          </button>
        ))}
      </div>
      <button onClick={submit} disabled={pin.length < 4}
        className="mt-6 w-full max-w-[280px] h-14 rounded-2xl bg-blue-600 text-white text-[15px] font-bold disabled:opacity-40 active:opacity-80 transition-opacity">
        เข้าสู่ระบบ
      </button>
    </div>
  );
}

// ── Home Tab ──
function HomeTab({ staff }: { staff: any }) {
  const [schedule, setSchedule] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState({ hoursThisWeek: 0, lateThisMonth: 0, leaveRemaining: 0 });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const today = new Date();
    const dow = today.getDay();
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay() + 1);
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

    const [schedRes, sessRes, notifRes, weekSessRes, monthSessRes] = await Promise.all([
      supabase.from("staff_schedules").select("*").eq("staff_id", staff.id).eq("day_of_week", dow).maybeSingle(),
      supabase.from("staff_sessions").select("*").eq("staff_id", staff.id).gte("clock_in", `${today.toISOString().slice(0, 10)}T00:00:00`).is("clock_out", null).maybeSingle(),
      supabase.from("staff_notifications").select("*").eq("staff_id", staff.id).order("sent_at", { ascending: false }).limit(10),
      supabase.from("staff_sessions").select("total_hours").eq("staff_id", staff.id).gte("clock_in", weekStart.toISOString().slice(0, 10) + "T00:00:00"),
      supabase.from("staff_sessions").select("is_late").eq("staff_id", staff.id).gte("clock_in", monthStart + "T00:00:00").eq("is_late", true),
    ]);
    setSchedule(schedRes.data);
    setSession(sessRes.data);
    setNotifications(notifRes.data || []);
    setStats({
      hoursThisWeek: (weekSessRes.data || []).reduce((s: number, r: any) => s + Number(r.total_hours || 0), 0),
      lateThisMonth: monthSessRes.data?.length || 0,
      leaveRemaining: 0,
    });
  }

  return (
    <div className="space-y-4">
      <div className="text-[20px] font-black text-gray-900">สวัสดี, {staff.nickname || staff.name}! 👋</div>
      <div className="text-[12px] text-gray-500">{staff.roleLabel} · {new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}</div>

      {/* Today's shift */}
      <div className="bg-blue-50 rounded-2xl p-5">
        {schedule ? (
          schedule.is_day_off ? (
            <div className="text-center text-[15px] font-bold text-blue-700">วันนี้: วันหยุด 🎉</div>
          ) : (
            <div>
              <div className="text-[12px] text-blue-600 mb-1">กะวันนี้</div>
              <div className="text-[20px] font-black text-blue-800">{schedule.shift_start?.slice(0, 5)} - {schedule.shift_end?.slice(0, 5)}</div>
              {session ? (
                <div className="mt-3 text-[12px] text-green-600 font-bold">🟢 เข้างาน {new Date(session.clock_in).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</div>
              ) : (
                <div className="mt-3 text-[12px] text-gray-500">ยังไม่ได้ลงเวลาเข้า</div>
              )}
            </div>
          )
        ) : (
          <div className="text-center text-[13px] text-gray-500">ไม่มีตารางงานวันนี้</div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-gray-500">ชม. สัปดาห์นี้</div>
          <div className="text-[18px] font-black text-gray-900 tabular-nums">{stats.hoursThisWeek.toFixed(1)}</div>
        </div>
        <div className="bg-gray-50 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-gray-500">สายเดือนนี้</div>
          <div className="text-[18px] font-black text-red-600 tabular-nums">{stats.lateThisMonth}</div>
        </div>
        <div className="bg-gray-50 rounded-2xl p-3 text-center">
          <div className="text-[9px] text-gray-500">วันลาเหลือ</div>
          <div className="text-[18px] font-black text-green-600 tabular-nums">—</div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div>
          <div className="text-[13px] font-bold text-gray-900 mb-2">🔔 การแจ้งเตือน</div>
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className={cn("p-3 rounded-xl text-[12px]", n.is_read ? "bg-gray-50" : "bg-blue-50 border border-blue-200")}>
                <div className="font-bold text-gray-900">{n.title}</div>
                {n.body && <div className="text-gray-600 mt-0.5">{n.body}</div>}
                <div className="text-[9px] text-gray-400 mt-1">{new Date(n.sent_at).toLocaleString("th-TH")}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Schedule Tab ──
function ScheduleTab({ staff }: { staff: any }) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const todayDow = new Date().getDay();

  useEffect(() => {
    supabase.from("staff_schedules").select("*").eq("staff_id", staff.id).then(({ data }) => setSchedules(data || []));
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-[15px] font-bold text-gray-900">📅 ตารางงานของฉัน</div>
      <div className="space-y-2">
        {DAYS.map((day, i) => {
          const sched = schedules.find(s => s.day_of_week === i);
          const isToday = i === todayDow;
          return (
            <div key={i} className={cn("flex items-center gap-3 p-4 rounded-2xl", isToday ? "bg-blue-50 border border-blue-200" : "bg-gray-50")}>
              <div className="w-[80px]">
                <div className={cn("text-[13px] font-bold", isToday ? "text-blue-700" : "text-gray-900")}>{day}</div>
                {isToday && <div className="text-[9px] text-blue-500 font-bold">วันนี้</div>}
              </div>
              <div className="flex-1">
                {sched?.is_day_off ? (
                  <span className="text-[13px] text-gray-400">หยุด</span>
                ) : sched ? (
                  <span className="text-[15px] font-bold text-gray-900">{sched.shift_start?.slice(0, 5)} - {sched.shift_end?.slice(0, 5)}</span>
                ) : (
                  <span className="text-[13px] text-gray-400">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Clock Tab ──
function ClockTab({ staff }: { staff: any }) {
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [time, setTime] = useState(new Date());
  const [recentShifts, setRecentShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    fetchData();
    return () => clearInterval(timer);
  }, []);

  async function fetchData() {
    const today = new Date().toISOString().slice(0, 10);
    const dow = new Date().getDay();
    const [sessRes, schedRes, recentRes] = await Promise.all([
      supabase.from("staff_sessions").select("*").eq("staff_id", staff.id).gte("clock_in", `${today}T00:00:00`).is("clock_out", null).maybeSingle(),
      supabase.from("staff_schedules").select("*").eq("staff_id", staff.id).eq("day_of_week", dow).maybeSingle(),
      supabase.from("staff_sessions").select("*").eq("staff_id", staff.id).order("clock_in", { ascending: false }).limit(7),
    ]);
    setSession(sessRes.data);
    setSchedule(schedRes.data);
    setRecentShifts(recentRes.data || []);
  }

  async function clockIn() {
    setLoading(true);
    let lat: number | null = null, lng: number | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }));
      lat = pos.coords.latitude; lng = pos.coords.longitude;
    } catch { /* GPS not available */ }

    // Late detection
    let isLate = false, lateMinutes = 0;
    if (schedule && !schedule.is_day_off) {
      const now = new Date();
      const [h, m] = schedule.shift_start.split(":").map(Number);
      const scheduled = new Date(); scheduled.setHours(h, m, 0, 0);
      const diff = Math.floor((now.getTime() - scheduled.getTime()) / 60000);
      if (diff > 5) { isLate = true; lateMinutes = diff; }
    }

    const { error } = await supabase.from("staff_sessions").insert({
      staff_id: staff.id, clock_in_lat: lat, clock_in_lng: lng, clock_in_method: lat ? "gps" : "pin",
      is_late: isLate, late_minutes: lateMinutes,
    });
    setLoading(false);
    if (error) { toast({ title: "❌ Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: isLate ? `⚠️ ลงเวลาเข้าแล้ว — สาย ${lateMinutes} นาที` : "🟢 ลงเวลาเข้าแล้ว" });
    fetchData();
  }

  async function clockOut() {
    if (!session) return;
    setLoading(true);
    let lat: number | null = null, lng: number | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }));
      lat = pos.coords.latitude; lng = pos.coords.longitude;
    } catch { /* GPS not available */ }

    const now = new Date();
    const clockInTime = new Date(session.clock_in);
    const totalHours = (now.getTime() - clockInTime.getTime()) / 3600000 - (session.break_minutes || 0) / 60;
    const regularHours = Math.min(8, totalHours);
    const otMinutes = Math.max(0, Math.round((totalHours - 8) * 60));

    // Get staff rate
    const { data: staffData } = await supabase.from("staff").select("hourly_rate, ot_rate_multiplier, salary_type, daily_rate, monthly_salary").eq("id", staff.id).single();
    let hourlyRate = Number(staffData?.hourly_rate || 0);
    if (staffData?.salary_type === "daily") hourlyRate = Number(staffData?.daily_rate || 0) / 8;
    if (staffData?.salary_type === "monthly") hourlyRate = Number(staffData?.monthly_salary || 0) / 26 / 8;
    const otAmount = Math.round(otMinutes / 60 * hourlyRate * Number(staffData?.ot_rate_multiplier || 1.5));
    const totalPay = Math.round(regularHours * hourlyRate + otAmount);

    const { error } = await supabase.from("staff_sessions").update({
      clock_out: now.toISOString(), clock_out_lat: lat, clock_out_lng: lng,
      total_hours: Math.round(totalHours * 100) / 100, regular_hours: Math.round(regularHours * 100) / 100,
      ot_minutes: otMinutes, ot_amount: otAmount, total_pay: totalPay,
    }).eq("id", session.id);
    setLoading(false);
    if (error) { toast({ title: "❌ Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `🔴 ลงเวลาออก — ฿${totalPay.toLocaleString()}` });
    fetchData();
  }

  const elapsed = session ? (time.getTime() - new Date(session.clock_in).getTime()) / 1000 : 0;
  const elapsedH = Math.floor(elapsed / 3600);
  const elapsedM = Math.floor((elapsed % 3600) / 60);

  return (
    <div className="space-y-6">
      {/* Current time */}
      <div className="text-center">
        <div className="text-[48px] font-black text-gray-900 tabular-nums">{time.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
        {schedule && !schedule.is_day_off && <div className="text-[12px] text-gray-500">กะวันนี้เริ่ม {schedule.shift_start?.slice(0, 5)}</div>}
      </div>

      {/* Clock in/out button */}
      {!session ? (
        <button onClick={clockIn} disabled={loading}
          className="w-full h-16 rounded-2xl bg-green-600 text-white text-[18px] font-black active:opacity-80 disabled:opacity-50 transition-opacity shadow-lg">
          {loading ? "กำลังลงเวลา..." : "⏰ ลงเวลาเข้างาน"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-green-50 rounded-2xl p-5 text-center">
            <div className="text-[12px] text-green-600">เข้างาน {new Date(session.clock_in).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="text-[28px] font-black text-green-800 tabular-nums mt-1">{elapsedH} ชม. {elapsedM} นาที</div>
            {session.is_late && <div className="text-[11px] text-red-500 font-bold mt-1">⚠️ สาย {session.late_minutes} นาที</div>}
          </div>
          <button onClick={clockOut} disabled={loading}
            className="w-full h-16 rounded-2xl bg-red-600 text-white text-[18px] font-black active:opacity-80 disabled:opacity-50 transition-opacity shadow-lg">
            {loading ? "กำลังลงเวลา..." : "🔴 ลงเวลาออก"}
          </button>
        </div>
      )}

      {/* Recent shifts */}
      {recentShifts.length > 0 && (
        <div>
          <div className="text-[13px] font-bold text-gray-900 mb-2">ประวัติ 7 วันล่าสุด</div>
          <div className="space-y-1">
            {recentShifts.filter(s => s.clock_out).map(s => (
              <div key={s.id} className="flex items-center gap-3 text-[11px] p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-500 w-[60px]">{new Date(s.clock_in).toLocaleDateString("th-TH", { day: "2-digit", month: "short" })}</span>
                <span className="font-mono text-gray-900">{new Date(s.clock_in).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} - {new Date(s.clock_out).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="text-gray-600">{Number(s.total_hours || 0).toFixed(1)}h</span>
                {s.is_late && <span className="text-red-500 text-[9px]">สาย</span>}
                {Number(s.ot_minutes || 0) > 0 && <span className="text-blue-500 text-[9px]">OT</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Leave Tab ──
function LeaveAppTab({ staff }: { staff: any }) {
  const { toast } = useToast();
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [formTypeId, setFormTypeId] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formReason, setFormReason] = useState("");
  const currentYear = new Date().getFullYear();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [tRes, bRes, rRes] = await Promise.all([
      supabase.from("leave_types").select("*").order("sort_order"),
      supabase.from("leave_balances").select("*, leave_types(name_th, icon)").eq("staff_id", staff.id).eq("year", currentYear),
      supabase.from("leave_requests").select("*, leave_types(name_th, icon, color)").eq("staff_id", staff.id).order("created_at", { ascending: false }),
    ]);
    setLeaveTypes(tRes.data || []);
    setBalances(bRes.data || []);
    setRequests(rRes.data || []);
  }

  async function createRequest() {
    if (!formTypeId || !formStart || !formEnd) return;
    const days = Math.max(1, Math.ceil((new Date(formEnd).getTime() - new Date(formStart).getTime()) / 86400000) + 1);
    await supabase.from("leave_requests").insert({
      staff_id: staff.id, leave_type_id: formTypeId, start_date: formStart, end_date: formEnd, days_count: days, reason: formReason,
    });
    toast({ title: "✅ ส่งคำขอลาแล้ว" });
    setShowCreate(false);
    fetchData();
  }

  const statusColors: Record<string, string> = { pending: "bg-amber-100 text-amber-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700" };
  const statusLabels: Record<string, string> = { pending: "รออนุมัติ", approved: "อนุมัติ", rejected: "ไม่อนุมัติ", cancelled: "ยกเลิก" };

  return (
    <div className="space-y-4">
      <div className="text-[15px] font-bold text-gray-900">🏖️ การลา</div>

      {/* Balance cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
        {leaveTypes.map(lt => {
          const bal = balances.find(b => b.leave_type_id === lt.id);
          const used = Number(bal?.used || 0);
          const total = Number(bal?.entitlement || lt.days_per_year);
          const remaining = total - used;
          const pct = total > 0 ? (used / total) * 100 : 0;
          return (
            <div key={lt.id} className="min-w-[140px] bg-gray-50 rounded-2xl p-4 shrink-0">
              <div className="text-[18px] mb-1">{lt.icon}</div>
              <div className="text-[11px] font-bold text-gray-900">{lt.name_th}</div>
              <div className="text-[10px] text-gray-500">ใช้ {used}/{total}</div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2">
                <div className={cn("h-full rounded-full", pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-green-500")} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <div className="text-[10px] text-gray-500 mt-1">เหลือ {remaining} วัน</div>
            </div>
          );
        })}
      </div>

      <button onClick={() => { setShowCreate(true); setFormTypeId(leaveTypes[0]?.id || ""); setFormStart(""); setFormEnd(""); setFormReason(""); }}
        className="w-full h-12 rounded-2xl bg-blue-600 text-white text-[14px] font-bold active:opacity-80">+ ขอลา</button>

      {/* My requests */}
      <div className="space-y-2">
        {requests.map(r => (
          <div key={r.id} className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: `${r.leave_types?.color}20`, color: r.leave_types?.color }}>{r.leave_types?.icon} {r.leave_types?.name_th}</span>
              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-md", statusColors[r.status] || "")}>{statusLabels[r.status] || r.status}</span>
            </div>
            <div className="text-[12px] text-gray-900">{r.start_date} → {r.end_date} ({r.days_count} วัน)</div>
            {r.reason && <div className="text-[11px] text-gray-500 mt-1">{r.reason}</div>}
            {r.status === "rejected" && r.reviewer_note && <div className="text-[11px] text-red-500 mt-1">เหตุผล: {r.reviewer_note}</div>}
            {r.status === "pending" && (
              <button onClick={async () => { await supabase.from("leave_requests").update({ status: "cancelled" }).eq("id", r.id); fetchData(); }}
                className="mt-2 text-[10px] text-red-500 font-bold">ยกเลิก</button>
            )}
          </div>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="text-[15px] font-bold text-gray-900">🏖️ ขอลา</div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">ประเภท</label>
              <select value={formTypeId} onChange={e => setFormTypeId(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[14px]">
                {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.icon} {lt.name_th}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">เริ่ม</label>
                <input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} className="w-full h-12 px-3 rounded-xl border border-gray-200 text-[13px]" />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">สิ้นสุด</label>
                <input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="w-full h-12 px-3 rounded-xl border border-gray-200 text-[13px]" />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">เหตุผล</label>
              <input value={formReason} onChange={e => setFormReason(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[14px]" placeholder="ระบุเหตุผล..." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 h-12 rounded-xl border border-gray-200 text-[14px] font-bold text-gray-500">ยกเลิก</button>
              <button onClick={createRequest} disabled={!formTypeId || !formStart || !formEnd} className="flex-1 h-12 rounded-xl bg-blue-600 text-white text-[14px] font-bold disabled:opacity-40">ส่งคำขอ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Me Tab ──
function MeTab({ staff, onLogout }: { staff: any; onLogout: () => void }) {
  const { toast } = useToast();
  const [staffData, setStaffData] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("staff").select("*, roles(label)").eq("id", staff.id).single().then(({ data }) => setStaffData(data));
    supabase.from("payroll_items").select("*, payroll_periods(period_name, status, start_date, end_date)").eq("staff_id", staff.id).then(({ data }) => {
      setPayslips((data || []).filter(p => p.payroll_periods?.status === "paid"));
    });
  }, []);

  async function enablePush() {
    if (!("Notification" in window)) {
      toast({ title: "เบราว์เซอร์ไม่รองรับ Push — ใช้ LINE Notify แทน", variant: "destructive" });
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      // Save basic subscription info
      await supabase.from("staff").update({ push_subscription: { enabled: true, granted_at: new Date().toISOString() } }).eq("id", staff.id);
      toast({ title: "✅ เปิด Push Notification สำเร็จ" });
    } else {
      toast({ title: "ไม่ได้รับอนุญาต Push", variant: "destructive" });
    }
  }

  const rate = staffData?.salary_type === "monthly" ? `฿${Number(staffData?.monthly_salary || 0).toLocaleString()}/เดือน`
    : staffData?.salary_type === "daily" ? `฿${Number(staffData?.daily_rate || 0).toLocaleString()}/วัน`
    : `฿${Number(staffData?.hourly_rate || 0).toLocaleString()}/ชม.`;

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-2xl p-5 text-center">
        <div className="text-[48px] mb-2">{staffData?.avatar_emoji || '👤'}</div>
        <div className="text-[18px] font-black text-gray-900">{staff.nickname || staff.name}</div>
        <div className="text-[12px] text-gray-500">{staff.roleLabel}</div>
        {staffData?.phone && <div className="text-[11px] text-gray-400 mt-1">📱 {staffData.phone}</div>}
        {staffData?.start_date && <div className="text-[11px] text-gray-400">ทำงานตั้งแต่ {staffData.start_date}</div>}
      </div>

      <div className="bg-blue-50 rounded-2xl p-4">
        <div className="text-[11px] text-blue-600 mb-1">💰 อัตราค่าจ้าง</div>
        <div className="text-[18px] font-black text-blue-800">{rate}</div>
        {staffData?.bank_name && <div className="text-[11px] text-blue-500 mt-1">🏦 {staffData.bank_name} ****{staffData.bank_account?.slice(-4)}</div>}
      </div>

      {/* Pay slips */}
      {payslips.length > 0 && (
        <div>
          <div className="text-[13px] font-bold text-gray-900 mb-2">📄 ใบจ่ายเงินเดือน</div>
          {payslips.map(p => (
            <div key={p.id} className="bg-gray-50 rounded-xl p-3 mb-2">
              <div className="text-[12px] font-bold text-gray-900">{p.payroll_periods?.period_name}</div>
              <div className="text-[14px] font-black text-green-700 tabular-nums">฿{Number(p.net_pay).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Settings */}
      <div className="space-y-2">
        <button onClick={enablePush} className="w-full h-12 rounded-2xl bg-gray-100 text-gray-900 text-[13px] font-bold active:bg-gray-200">🔔 เปิด Push Notification</button>
        <button onClick={onLogout} className="w-full h-12 rounded-2xl bg-red-50 text-red-600 text-[13px] font-bold active:bg-red-100">🚪 ออกจากระบบ</button>
      </div>
    </div>
  );
}

// ── Main App ──
export default function StaffApp() {
  const [staff, setStaff] = useState<any>(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const saved = sessionStorage.getItem("staff_app_user");
    if (saved) { try { setStaff(JSON.parse(saved)); } catch { /* ignore */ } }
  }, []);

  function logout() {
    sessionStorage.removeItem("staff_app_user");
    setStaff(null);
  }

  if (!staff) return <StaffPinLogin onLogin={setStaff} />;

  const tabs = [
    { icon: Home, label: "Home" },
    { icon: Calendar, label: "ตาราง" },
    { icon: Clock, label: "ลงเวลา" },
    { icon: Palmtree, label: "ลา" },
    { icon: User, label: "ฉัน" },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[480px] mx-auto">
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-24">
        {tab === 0 && <HomeTab staff={staff} />}
        {tab === 1 && <ScheduleTab staff={staff} />}
        {tab === 2 && <ClockTab staff={staff} />}
        {tab === 3 && <LeaveAppTab staff={staff} />}
        {tab === 4 && <MeTab staff={staff} onLogout={logout} />}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 max-w-[480px] mx-auto">
        {tabs.map((t, i) => {
          const Icon = t.icon;
          return (
            <button key={i} onClick={() => setTab(i)}
              className={cn("flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors",
                tab === i ? "text-blue-600" : "text-gray-400")}>
              <Icon size={22} strokeWidth={tab === i ? 2.2 : 1.5} />
              <span className="text-[9px] font-bold">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
