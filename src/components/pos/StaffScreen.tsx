import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Download, Plus, Clock, Users, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const DAYS_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  manager: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  chef: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  waiter: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800",
  cashier: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
};

const AVATARS = ["👨‍🍳", "👩‍🍳", "👨‍💼", "👩‍💼", "🧑‍🤝‍🧑", "👤", "🧑‍🍳", "💁‍♀️", "🧑"];

function getRoleColor(roleName: string) {
  if (roleName.includes('owner') || roleName.includes('เจ้าของ')) return ROLE_COLORS.owner;
  if (roleName.includes('manager') || roleName.includes('ผู้จัดการ')) return ROLE_COLORS.manager;
  if (roleName.includes('chef') || roleName.includes('ครัว') || roleName.includes('พ่อครัว')) return ROLE_COLORS.chef;
  if (roleName.includes('waiter') || roleName.includes('เสิร์ฟ')) return ROLE_COLORS.waiter;
  if (roleName.includes('cashier') || roleName.includes('แคชเชียร์')) return ROLE_COLORS.cashier;
  return ROLE_COLORS.waiter;
}

// ═══════════════════════════════════════════
// TAB 1: Staff List + Clock-in/out
// ═══════════════════════════════════════════
function StaffListTab() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editStaff, setEditStaff] = useState<any | null>(null);
  const [revealPins, setRevealPins] = useState<Set<string>>(new Set());

  // Form state
  const [formName, setFormName] = useState("");
  const [formNickname, setFormNickname] = useState("");
  const [formRoleId, setFormRoleId] = useState("");
  const [formPin, setFormPin] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRate, setFormRate] = useState("0");
  const [formEmoji, setFormEmoji] = useState("👤");
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const [staffRes, shiftsRes, rolesRes] = await Promise.all([
      supabase.from('staff').select('*, roles(name, label)').order('name'),
      supabase.from('staff_sessions').select('*').gte('clock_in', `${today}T00:00:00`),
      supabase.from('roles').select('*').order('sort_order'),
    ]);
    setStaff(staffRes.data || []);
    setShifts(shiftsRes.data || []);
    setRoles(rolesRes.data || []);
    setLoading(false);
  }

  function getActiveShift(staffId: string) {
    return shifts.find(s => s.staff_id === staffId && !s.clock_out);
  }

  async function clockIn(staffId: string) {
    const { error } = await supabase.from('staff_sessions').insert({ staff_id: staffId });
    if (error) { toast({ title: "❌ Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "🟢 ลงเวลาเข้าแล้ว" });
    fetchAll();
  }

  async function clockOut(staffId: string) {
    const shift = getActiveShift(staffId);
    if (!shift) return;
    const now = new Date();
    const clockIn = new Date(shift.clock_in);
    const hours = (now.getTime() - clockIn.getTime()) / 3600000;
    const { error } = await supabase.from('staff_sessions')
      .update({ clock_out: now.toISOString(), total_hours: Math.round(hours * 100) / 100 })
      .eq('id', shift.id);
    if (error) { toast({ title: "❌ Error", description: error.message, variant: "destructive" }); return; }
    const s = staff.find(st => st.id === staffId);
    const cost = Math.round(hours * Number(s?.hourly_rate || 0));
    toast({ title: "🔴 ลงเวลาออกแล้ว", description: `ทำงาน ${hours.toFixed(1)} ชม. = ฿${cost.toLocaleString()}` });
    fetchAll();
  }

  function openAdd() {
    setEditStaff(null);
    setFormName(""); setFormNickname(""); setFormRoleId(roles[0]?.id || "");
    setFormPin(""); setFormPhone(""); setFormRate("0"); setFormEmoji("👤");
    setShowAdd(true);
  }

  function openEdit(s: any) {
    setEditStaff(s);
    setFormName(s.name); setFormNickname(s.nickname || ""); setFormRoleId(s.role_id);
    setFormPin(s.pin || ""); setFormPhone(s.phone || ""); setFormRate(String(s.hourly_rate || 0));
    setFormEmoji(s.avatar_emoji || "👤");
    setShowAdd(true);
  }

  async function saveStaff() {
    const payload: any = {
      name: formName, nickname: formNickname, role_id: formRoleId,
      pin: formPin, phone: formPhone, hourly_rate: Number(formRate), avatar_emoji: formEmoji,
    };
    if (editStaff) {
      await supabase.from('staff').update(payload).eq('id', editStaff.id);
      toast({ title: "✅ อัปเดตแล้ว" });
    } else {
      await supabase.from('staff').insert(payload);
      toast({ title: "✅ เพิ่มพนักงานแล้ว" });
    }
    setShowAdd(false);
    fetchAll();
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-2"/>กำลังโหลด...</div>;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[13px] text-muted-foreground">{staff.length} พนักงาน · {shifts.filter(s => !s.clock_out).length} กำลังทำงาน</div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-bold bg-primary text-white shadow-[0_2px_8px_hsl(var(--primary)/0.3)] hover:opacity-90 transition-opacity">
          <Plus size={14} /> เพิ่มพนักงาน
        </button>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {staff.map(s => {
          const activeShift = getActiveShift(s.id);
          const isWorking = !!activeShift;
          const roleName = s.roles?.name || '';
          const roleLabel = s.roles?.label || roleName;
          return (
            <div key={s.id} className={cn(
              "bg-[hsl(var(--surface))] border rounded-2xl p-4 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
              isWorking ? "border-[hsl(var(--success)/0.4)]" : "border-border",
              !s.is_active && "opacity-50"
            )}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-[32px]">{s.avatar_emoji || '👤'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-foreground truncate">{s.nickname || s.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{s.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", getRoleColor(roleName))}>
                      {roleLabel}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">฿{Number(s.hourly_rate || 0)}/hr</span>
                  </div>
                </div>
                <div className={cn("w-3 h-3 rounded-full shrink-0 mt-1", isWorking ? "bg-[hsl(var(--success))] shadow-[0_0_8px_hsl(var(--success)/0.5)]" : "bg-muted")} />
              </div>

              {/* PIN */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-[10px] text-muted-foreground">PIN:</span>
                <button onClick={() => {
                  const next = new Set(revealPins);
                  next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                  setRevealPins(next);
                }} className="text-[12px] font-mono tracking-widest text-foreground hover:text-primary transition-colors">
                  {revealPins.has(s.id) ? (s.pin || '—') : '●●●●'}
                </button>
              </div>

              {/* Status */}
              <div className={cn("text-[11px] font-semibold px-3 py-2 rounded-xl mb-3 text-center",
                isWorking ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.2)]"
                          : "bg-muted text-muted-foreground border border-border"
              )}>
                {isWorking ? `🟢 กำลังทำงาน — เข้า ${new Date(activeShift.clock_in).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}` : '⚪ ไม่ได้ลงเวลา'}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => openEdit(s)}
                  className="flex-1 h-10 rounded-xl border border-border bg-muted text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  ✏️ แก้ไข
                </button>
                {isWorking ? (
                  <button onClick={() => clockOut(s.id)}
                    className="flex-1 h-10 rounded-xl bg-[hsl(var(--danger)/0.1)] text-[hsl(var(--danger))] border border-[hsl(var(--danger)/0.2)] text-[11px] font-bold hover:bg-[hsl(var(--danger)/0.15)] transition-colors">
                    🕐 ลงเวลาออก
                  </button>
                ) : (
                  <button onClick={() => clockIn(s.id)}
                    className="flex-1 h-10 rounded-xl bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.2)] text-[11px] font-bold hover:bg-[hsl(var(--success)/0.15)] transition-colors">
                    🕐 ลงเวลาเข้า
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md p-0 gap-0 rounded-2xl border-border bg-[hsl(var(--surface))]" aria-describedby={undefined}>
          <div className="px-5 py-4 border-b border-border">
            <DialogTitle className="text-[15px] font-bold text-foreground">{editStaff ? '✏️ แก้ไขพนักงาน' : '➕ เพิ่มพนักงาน'}</DialogTitle>
          </div>
          <div className="p-5 space-y-3">
            {/* Avatar emoji picker */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Avatar</label>
              <div className="flex gap-2 flex-wrap">
                {AVATARS.map(a => (
                  <button key={a} onClick={() => setFormEmoji(a)}
                    className={cn("w-10 h-10 rounded-xl text-[22px] flex items-center justify-center border-2 transition-all",
                      formEmoji === a ? "border-primary bg-primary/10" : "border-border bg-muted hover:border-primary/30")}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ชื่อเต็ม</label>
                <input value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ชื่อเล่น</label>
                <input value={formNickname} onChange={e => setFormNickname(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ตำแหน่ง</label>
              <select value={formRoleId} onChange={e => setFormRoleId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">PIN</label>
                <input value={formPin} onChange={e => setFormPin(e.target.value)} maxLength={6}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[13px] text-foreground font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">เบอร์โทร</label>
                <input value={formPhone} onChange={e => setFormPhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">฿/ชม.</label>
                <input type="number" value={formRate} onChange={e => setFormRate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[13px] text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-border flex gap-2">
            <button onClick={() => setShowAdd(false)}
              className="flex-1 h-11 rounded-xl border border-border bg-muted text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
              ยกเลิก
            </button>
            <button onClick={saveStaff} disabled={!formName || !formRoleId}
              className="flex-1 h-11 rounded-xl bg-primary text-white text-[12px] font-bold shadow-[0_2px_8px_hsl(var(--primary)/0.3)] hover:opacity-90 transition-opacity disabled:opacity-40">
              💾 บันทึก
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ═══════════════════════════════════════════
// TAB 2: Weekly Schedule
// ═══════════════════════════════════════════
function ScheduleTab() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCell, setEditCell] = useState<{ staffId: string; staffName: string; dayOfWeek: number } | null>(null);
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [isDayOff, setIsDayOff] = useState(false);

  const todayDow = new Date().getDay(); // 0=Sun

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [staffRes, schedRes] = await Promise.all([
      supabase.from('staff').select('id, name, nickname, roles(name, label)').eq('is_active', true).order('name'),
      supabase.from('staff_schedules').select('*'),
    ]);
    setStaff(staffRes.data || []);
    setSchedules(schedRes.data || []);
    setLoading(false);
  }

  function getSchedule(staffId: string, dow: number) {
    return schedules.find(s => s.staff_id === staffId && s.day_of_week === dow);
  }

  async function saveSchedule() {
    if (!editCell) return;
    const existing = getSchedule(editCell.staffId, editCell.dayOfWeek);
    const payload = {
      staff_id: editCell.staffId,
      day_of_week: editCell.dayOfWeek,
      shift_start: shiftStart,
      shift_end: shiftEnd,
      is_day_off: isDayOff,
    };

    if (existing) {
      await supabase.from('staff_schedules').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('staff_schedules').insert(payload);
    }
    toast({ title: "✅ บันทึกตารางงานแล้ว" });
    setEditCell(null);
    fetchData();
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-2"/>กำลังโหลด...</div>;

  return (
    <>
      <div className="bg-[hsl(var(--surface))] border border-border rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-x-auto">
        <table className="w-full text-[12px] min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-[140px]">พนักงาน</th>
              {DAYS.map((d, i) => (
                <th key={i} className={cn("px-2 py-3 text-center font-semibold",
                  i === todayDow ? "text-primary bg-primary/5" : "text-muted-foreground"
                )}>
                  {DAYS_SHORT[i]}
                  {i === todayDow && <div className="text-[8px] text-primary mt-0.5">วันนี้</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id} className="border-b border-border/30 last:border-b-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="text-[12px] font-bold text-foreground truncate">{s.nickname || s.name}</div>
                  <div className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5", getRoleColor(s.roles?.name || ''))}>
                    {s.roles?.label || ''}
                  </div>
                </td>
                {DAYS.map((_, dow) => {
                  const sched = getSchedule(s.id, dow);
                  return (
                    <td key={dow} className={cn("px-1 py-2 text-center", dow === todayDow && "bg-primary/5")}>
                      <button onClick={() => {
                        setEditCell({ staffId: s.id, staffName: s.nickname || s.name, dayOfWeek: dow });
                        if (sched) {
                          setShiftStart(sched.shift_start?.slice(0, 5) || "09:00");
                          setShiftEnd(sched.shift_end?.slice(0, 5) || "17:00");
                          setIsDayOff(sched.is_day_off);
                        } else {
                          setShiftStart("09:00"); setShiftEnd("17:00"); setIsDayOff(false);
                        }
                      }} className={cn(
                        "w-full py-2 px-1 rounded-lg text-[10px] font-semibold transition-colors",
                        sched?.is_day_off ? "bg-muted text-muted-foreground" :
                        sched ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15" :
                        "text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground"
                      )}>
                        {sched?.is_day_off ? "หยุด" : sched ? `${sched.shift_start?.slice(0,5)}-${sched.shift_end?.slice(0,5)}` : "—"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit schedule modal */}
      <Dialog open={!!editCell} onOpenChange={open => { if (!open) setEditCell(null); }}>
        <DialogContent className="max-w-sm p-0 gap-0 rounded-2xl border-border bg-[hsl(var(--surface))]" aria-describedby={undefined}>
          <div className="px-5 py-4 border-b border-border">
            <DialogTitle className="text-[15px] font-bold text-foreground">📅 ตั้งค่ากะ</DialogTitle>
            <p className="text-[12px] text-muted-foreground mt-0.5">{editCell?.staffName} — {editCell ? DAYS[editCell.dayOfWeek] : ''}</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-[12px] font-semibold text-foreground">วันหยุด</label>
              <button onClick={() => setIsDayOff(!isDayOff)}
                className={cn("w-12 h-7 rounded-full transition-colors relative",
                  isDayOff ? "bg-[hsl(var(--danger))]" : "bg-muted border border-border"
                )}>
                <div className={cn("w-5 h-5 rounded-full bg-white shadow absolute top-1 transition-all",
                  isDayOff ? "left-6" : "left-1"
                )} />
              </button>
            </div>
            {!isDayOff && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">เข้า</label>
                  <input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[13px] text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ออก</label>
                  <input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[13px] text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            )}
          </div>
          <div className="px-5 py-4 border-t border-border flex gap-2">
            <button onClick={() => setEditCell(null)} className="flex-1 h-11 rounded-xl border border-border bg-muted text-[12px] font-semibold text-muted-foreground">ยกเลิก</button>
            <button onClick={saveSchedule} className="flex-1 h-11 rounded-xl bg-primary text-white text-[12px] font-bold shadow-[0_2px_8px_hsl(var(--primary)/0.3)] hover:opacity-90">💾 บันทึก</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ═══════════════════════════════════════════
// TAB 3: Work Hours Stats
// ═══════════════════════════════════════════
function WorkStatsTab() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Monday
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 7); // Sunday
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => { fetchData(); }, [dateFrom, dateTo]);

  async function fetchData() {
    setLoading(true);
    const [staffRes, sessRes] = await Promise.all([
      supabase.from('staff').select('id, name, nickname, hourly_rate, roles(label)').eq('is_active', true),
      supabase.from('staff_sessions').select('*').gte('clock_in', `${dateFrom}T00:00:00`).lte('clock_in', `${dateTo}T23:59:59`),
    ]);
    setStaff(staffRes.data || []);
    setSessions(sessRes.data || []);
    setLoading(false);
  }

  const stats = useMemo(() => {
    return staff.map(s => {
      const mySessions = sessions.filter(se => se.staff_id === s.id && se.clock_out);
      const totalHours = mySessions.reduce((sum, se) => sum + Number(se.total_hours || 0), 0);
      const totalBreak = mySessions.reduce((sum, se) => sum + (se.break_minutes || 0), 0);
      const netHours = totalHours - totalBreak / 60;
      const cost = Math.round(netHours * Number(s.hourly_rate || 0));
      const daysWorked = new Set(mySessions.map(se => new Date(se.clock_in).toISOString().slice(0, 10))).size;
      return { ...s, totalHours: Math.round(totalHours * 10) / 10, totalBreak, netHours: Math.round(netHours * 10) / 10, cost, daysWorked, avgHoursPerDay: daysWorked > 0 ? Math.round(totalHours / daysWorked * 10) / 10 : 0 };
    });
  }, [staff, sessions]);

  const totalAllHours = stats.reduce((s, st) => s + st.totalHours, 0);
  const totalCost = stats.reduce((s, st) => s + st.cost, 0);
  const avgPerDay = stats.length > 0 ? (totalAllHours / Math.max(1, stats.length)).toFixed(1) : "0";

  function exportCSV() {
    const header = "staff_name,date,clock_in,clock_out,hours,break_min,cost\n";
    const rows = sessions.filter(se => se.clock_out).map(se => {
      const s = staff.find(st => st.id === se.staff_id);
      const h = Number(se.total_hours || 0);
      return `${s?.name || '-'},${new Date(se.clock_in).toISOString().slice(0,10)},${se.clock_in},${se.clock_out},${h.toFixed(1)},${se.break_minutes || 0},${Math.round(h * Number(s?.hourly_rate || 0))}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `phimm-staff-hours-${dateFrom}.csv`;
    a.click();
    toast({ title: "📥 Export สำเร็จ" });
  }

  // Daily chart data
  const chartData = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};
    sessions.filter(se => se.clock_out).forEach(se => {
      const date = new Date(se.clock_in).toISOString().slice(0, 10);
      const s = staff.find(st => st.id === se.staff_id);
      const name = s?.nickname || s?.name || 'Unknown';
      if (!dateMap[date]) dateMap[date] = {};
      dateMap[date][name] = (dateMap[date][name] || 0) + Number(se.total_hours || 0);
    });
    return Object.entries(dateMap).sort().map(([date, staffHours]) => ({
      date: date.slice(5), // MM-DD
      ...staffHours,
    }));
  }, [sessions, staff]);

  const staffNames = [...new Set(sessions.map(se => {
    const s = staff.find(st => st.id === se.staff_id);
    return s?.nickname || s?.name || 'Unknown';
  }))];

  const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--accent))", "hsl(var(--danger))", "#8884d8"];

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-2"/>กำลังโหลด...</div>;

  return (
    <div className="space-y-4">
      {/* Date range + export */}
      <div className="flex items-center gap-3 flex-wrap">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="h-10 px-3 rounded-xl border border-border bg-[hsl(var(--surface))] text-[12px] font-semibold text-foreground" />
        <span className="text-muted-foreground">→</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="h-10 px-3 rounded-xl border border-border bg-[hsl(var(--surface))] text-[12px] font-semibold text-foreground" />
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold bg-muted text-muted-foreground border border-border hover:text-foreground transition-colors ml-auto">
          <Download size={12} /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[160px] bg-[hsl(var(--surface))] border border-border rounded-2xl p-4 text-center">
          <Clock size={18} className="mx-auto text-primary mb-1" />
          <div className="text-[10px] text-muted-foreground mb-1">ชม. ทำงานรวม</div>
          <div className="font-mono text-[24px] font-black tabular-nums text-foreground">{totalAllHours.toFixed(1)}</div>
        </div>
        <div className="flex-1 min-w-[160px] bg-[hsl(var(--surface))] border border-border rounded-2xl p-4 text-center">
          <DollarSign size={18} className="mx-auto text-[hsl(var(--warning))] mb-1" />
          <div className="text-[10px] text-muted-foreground mb-1">ค่าแรงรวม</div>
          <div className="font-mono text-[24px] font-black tabular-nums text-[hsl(var(--warning))]">฿{totalCost.toLocaleString()}</div>
        </div>
        <div className="flex-1 min-w-[160px] bg-[hsl(var(--surface))] border border-border rounded-2xl p-4 text-center">
          <Users size={18} className="mx-auto text-[hsl(var(--accent))] mb-1" />
          <div className="text-[10px] text-muted-foreground mb-1">เฉลี่ย/คน/วัน</div>
          <div className="font-mono text-[24px] font-black tabular-nums text-[hsl(var(--accent))]">{avgPerDay} ชม.</div>
        </div>
      </div>

      {/* Stacked bar chart */}
      {chartData.length > 0 && (
        <div className="bg-[hsl(var(--surface))] border border-border rounded-2xl p-5">
          <div className="text-[14px] font-bold text-foreground mb-3">📊 ชั่วโมงรายวัน</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {staffNames.map((name, i) => (
                <Bar key={name} dataKey={name} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={i === staffNames.length - 1 ? [4, 4, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Staff table */}
      <div className="bg-[hsl(var(--surface))] border border-border rounded-2xl overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-left">
              <th className="px-4 py-3 font-semibold">พนักงาน</th>
              <th className="px-3 py-3 font-semibold">ตำแหน่ง</th>
              <th className="px-3 py-3 font-semibold text-right">วันทำงาน</th>
              <th className="px-3 py-3 font-semibold text-right">ชม. รวม</th>
              <th className="px-3 py-3 font-semibold text-right">พัก (นาที)</th>
              <th className="px-3 py-3 font-semibold text-right">ชม. สุทธิ</th>
              <th className="px-3 py-3 font-semibold text-right">ค่าแรง</th>
              <th className="px-4 py-3 font-semibold text-right">เฉลี่ย/วัน</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.id} className="border-b border-border/30 last:border-b-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-bold text-foreground">{s.nickname || s.name}</td>
                <td className="px-3 py-3 text-muted-foreground">{s.roles?.label || ''}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums">{s.daysWorked}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums font-bold">{s.totalHours}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-muted-foreground">{s.totalBreak}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums">{s.netHours}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums font-bold text-primary">฿{s.cost.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{s.avgHoursPerDay}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Main StaffScreen with 3 tabs
// ═══════════════════════════════════════════
export function StaffScreen() {
  const [tab, setTab] = useState(0);
  const tabs = [
    { label: "👥 พนักงาน", key: "list" },
    { label: "📅 ตารางงาน", key: "schedule" },
    { label: "📊 สถิติเวลา", key: "stats" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-[hsl(var(--surface))] shrink-0">
        <h1 className="text-[15px] font-bold text-foreground">👥 จัดการพนักงาน</h1>
        <p className="text-[11px] text-muted-foreground">Staff Management</p>
        <div className="flex gap-1 mt-3">
          {tabs.map((t, i) => (
            <button key={t.key} onClick={() => setTab(i)}
              className={cn(
                "px-4 py-2 rounded-xl text-[12px] font-semibold transition-all",
                tab === i
                  ? "bg-primary text-white shadow-[0_2px_8px_hsl(var(--primary)/0.3)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
        {tab === 0 && <StaffListTab />}
        {tab === 1 && <ScheduleTab />}
        {tab === 2 && <WorkStatsTab />}
      </div>
    </div>
  );
}
