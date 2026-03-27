import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Plus, Check, X, Settings } from "lucide-react";

export function LeaveTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Create form
  const [formStaffId, setFormStaffId] = useState("");
  const [formTypeId, setFormTypeId] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formReason, setFormReason] = useState("");

  // Config form
  const [editType, setEditType] = useState<any | null>(null);
  const [cfgNameTh, setCfgNameTh] = useState("");
  const [cfgNameEn, setCfgNameEn] = useState("");
  const [cfgIcon, setCfgIcon] = useState("");
  const [cfgDays, setCfgDays] = useState("0");
  const [cfgPaid, setCfgPaid] = useState(true);

  const currentYear = new Date().getFullYear();

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [rRes, tRes, bRes, sRes] = await Promise.all([
      supabase.from("leave_requests").select("*, staff(name, nickname, avatar_emoji, roles(label)), leave_types(name_th, icon, color)").order("created_at", { ascending: false }),
      supabase.from("leave_types").select("*").order("sort_order"),
      supabase.from("leave_balances").select("*, staff(name, nickname), leave_types(name_th, icon)").eq("year", currentYear),
      supabase.from("staff").select("id, name, nickname").eq("is_active", true).order("name"),
    ]);
    setRequests(rRes.data || []);
    setLeaveTypes(tRes.data || []);
    setBalances(bRes.data || []);
    setStaff(sRes.data || []);
    setLoading(false);
  }

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const approvedThisMonth = requests.filter(r => r.status === "approved" && r.start_date?.startsWith(selectedMonth)).length;
  const onLeaveToday = requests.filter(r => {
    const today = new Date().toISOString().slice(0, 10);
    return r.status === "approved" && r.start_date <= today && r.end_date >= today;
  });

  async function approveRequest(id: string) {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    await supabase.from("leave_requests").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", id);
    // Update balance
    await supabase.from("leave_balances").upsert({
      staff_id: req.staff_id, leave_type_id: req.leave_type_id, year: currentYear,
      entitlement: leaveTypes.find(t => t.id === req.leave_type_id)?.days_per_year || 0,
      used: (balances.find(b => b.staff_id === req.staff_id && b.leave_type_id === req.leave_type_id)?.used || 0) + Number(req.days_count),
    }, { onConflict: "staff_id,leave_type_id,year" });
    // Notify
    await supabase.from("staff_notifications").insert({
      staff_id: req.staff_id, type: "leave_response", title: "✅ อนุมัติการลา",
      body: `${req.leave_types?.name_th} ${req.start_date} - ${req.end_date} อนุมัติแล้ว`, channel: "in_app",
    });
    toast({ title: "✅ อนุมัติแล้ว" });
    fetchAll();
  }

  async function rejectRequest(id: string, note: string) {
    const req = requests.find(r => r.id === id);
    await supabase.from("leave_requests").update({ status: "rejected", reviewer_note: note, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (req) {
      await supabase.from("staff_notifications").insert({
        staff_id: req.staff_id, type: "leave_response", title: "❌ ไม่อนุมัติการลา",
        body: `${req.leave_types?.name_th} ไม่อนุมัติ: ${note}`, channel: "in_app",
      });
    }
    toast({ title: "❌ ไม่อนุมัติ" });
    fetchAll();
  }

  async function createRequest() {
    if (!formStaffId || !formTypeId || !formStart || !formEnd) return;
    const days = Math.max(1, Math.ceil((new Date(formEnd).getTime() - new Date(formStart).getTime()) / 86400000) + 1);
    await supabase.from("leave_requests").insert({
      staff_id: formStaffId, leave_type_id: formTypeId,
      start_date: formStart, end_date: formEnd, days_count: days, reason: formReason,
    });
    toast({ title: "✅ ส่งคำขอลาแล้ว" });
    setShowCreate(false);
    fetchAll();
  }

  async function saveLeaveType() {
    const payload = { name_th: cfgNameTh, name_en: cfgNameEn, icon: cfgIcon, days_per_year: Number(cfgDays), is_paid: cfgPaid };
    if (editType) {
      await supabase.from("leave_types").update(payload).eq("id", editType.id);
    } else {
      await supabase.from("leave_types").insert(payload);
    }
    toast({ title: "✅ บันทึกประเภทการลาแล้ว" });
    setEditType(null);
    setCfgNameTh(""); setCfgNameEn(""); setCfgIcon("📋"); setCfgDays("0"); setCfgPaid(true);
    fetchAll();
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      cancelled: "bg-muted text-muted-foreground",
    };
    const labels: Record<string, string> = { pending: "รออนุมัติ", approved: "อนุมัติ", rejected: "ไม่อนุมัติ", cancelled: "ยกเลิก" };
    return <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-md", map[status] || "")}>{labels[status] || status}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-2" />กำลังโหลด...</div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[140px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-center">
          <div className="text-[10px] text-amber-600 dark:text-amber-400">รออนุมัติ</div>
          <div className="text-[24px] font-black text-amber-700 dark:text-amber-400 tabular-nums">{pendingCount}</div>
        </div>
        <div className="flex-1 min-w-[140px] bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-center">
          <div className="text-[10px] text-green-600 dark:text-green-400">อนุมัติเดือนนี้</div>
          <div className="text-[24px] font-black text-green-700 dark:text-green-400 tabular-nums">{approvedThisMonth}</div>
        </div>
        <div className="flex-1 min-w-[140px] bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 text-center">
          <div className="text-[10px] text-blue-600 dark:text-blue-400">ลาวันนี้</div>
          <div className="text-[24px] font-black text-blue-700 dark:text-blue-400 tabular-nums">{onLeaveToday.length}</div>
          {onLeaveToday.length > 0 && <div className="text-[9px] text-blue-500 mt-1">{onLeaveToday.map(r => r.staff?.nickname || r.staff?.name).join(", ")}</div>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button onClick={() => setShowConfig(true)} className="px-3 py-2 rounded-xl text-[11px] font-bold bg-muted text-muted-foreground border border-border hover:text-foreground"><Settings size={12} className="inline mr-1" />ตั้งค่าประเภท</button>
        <button onClick={() => { setShowCreate(true); setFormStaffId(staff[0]?.id || ""); setFormTypeId(leaveTypes[0]?.id || ""); setFormStart(""); setFormEnd(""); setFormReason(""); }}
          className="px-4 py-2 rounded-xl text-[11px] font-bold bg-primary text-white shadow-[0_2px_8px_hsl(var(--primary)/0.3)] hover:opacity-90"><Plus size={12} className="inline mr-1" />ส่งคำขอลา</button>
      </div>

      {/* Pending requests */}
      {requests.filter(r => r.status === "pending").length > 0 && (
        <div>
          <div className="text-[13px] font-bold text-foreground mb-2">📋 รออนุมัติ</div>
          <div className="space-y-2">
            {requests.filter(r => r.status === "pending").map(r => (
              <div key={r.id} className="bg-[hsl(var(--surface))] border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-[28px]">{r.staff?.avatar_emoji || '👤'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-foreground">{r.staff?.nickname || r.staff?.name}</div>
                    <div className="text-[10px] text-muted-foreground">{r.staff?.roles?.label}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: `${r.leave_types?.color}20`, color: r.leave_types?.color }}>{r.leave_types?.icon} {r.leave_types?.name_th}</span>
                      <span className="text-[10px] text-muted-foreground">{r.start_date} → {r.end_date} ({r.days_count} วัน)</span>
                    </div>
                    {r.reason && <div className="text-[11px] text-muted-foreground mt-1">เหตุผล: {r.reason}</div>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => approveRequest(r.id)} className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center hover:opacity-80"><Check size={16} /></button>
                    <button onClick={() => { const note = prompt("เหตุผลที่ไม่อนุมัติ:"); if (note) rejectRequest(r.id, note); }}
                      className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center hover:opacity-80"><X size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave balance table */}
      <div>
        <div className="text-[13px] font-bold text-foreground mb-2">📊 สิทธิ์การลาปี {currentYear + 543}</div>
        <div className="bg-[hsl(var(--surface))] border border-border rounded-2xl overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">พนักงาน</th>
                {leaveTypes.map(lt => (
                  <th key={lt.id} className="px-2 py-3 text-center font-semibold text-muted-foreground">
                    <span>{lt.icon}</span>
                    <div className="text-[9px]">{lt.name_th}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id} className="border-b border-border/30 hover:bg-muted/30">
                  <td className="px-4 py-3 font-bold text-foreground">{s.nickname || s.name}</td>
                  {leaveTypes.map(lt => {
                    const bal = balances.find(b => b.staff_id === s.id && b.leave_type_id === lt.id);
                    const used = Number(bal?.used || 0);
                    const total = Number(bal?.entitlement || lt.days_per_year || 0);
                    const pct = total > 0 ? (used / total) * 100 : 0;
                    return (
                      <td key={lt.id} className="px-2 py-3 text-center">
                        <div className="text-[10px] font-mono tabular-nums">
                          <span className={cn(pct > 80 ? "text-red-500" : pct > 50 ? "text-amber-500" : "text-green-600 dark:text-green-400")}>{used}</span>
                          <span className="text-muted-foreground">/{total}</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-1">
                          <div className={cn("h-full rounded-full", pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-green-500")} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All requests */}
      <div>
        <div className="text-[13px] font-bold text-foreground mb-2">📝 ประวัติการลาทั้งหมด</div>
        <div className="space-y-2">
          {requests.filter(r => r.status !== "pending").slice(0, 20).map(r => (
            <div key={r.id} className="bg-[hsl(var(--surface))] border border-border rounded-xl p-3 flex items-center gap-3">
              <span className="text-[20px]">{r.staff?.avatar_emoji || '👤'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-foreground">{r.staff?.nickname || r.staff?.name}</div>
                <div className="text-[10px] text-muted-foreground">{r.leave_types?.icon} {r.leave_types?.name_th} · {r.start_date} → {r.end_date} ({r.days_count} วัน)</div>
              </div>
              {statusBadge(r.status)}
            </div>
          ))}
        </div>
      </div>

      {/* Create request modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm p-0 gap-0 rounded-2xl border-border bg-[hsl(var(--surface))]" aria-describedby={undefined}>
          <div className="px-5 py-4 border-b border-border"><DialogTitle className="text-[15px] font-bold text-foreground">🏖️ ส่งคำขอลา</DialogTitle></div>
          <div className="p-5 space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">พนักงาน</label>
              <select value={formStaffId} onChange={e => setFormStaffId(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[13px] text-foreground">
                {staff.map(s => <option key={s.id} value={s.id}>{s.nickname || s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ประเภท</label>
              <select value={formTypeId} onChange={e => setFormTypeId(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[13px] text-foreground">
                {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.icon} {lt.name_th}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">เริ่ม</label>
                <input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[12px] text-foreground" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">สิ้นสุด</label>
                <input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[12px] text-foreground" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">เหตุผล</label>
              <input value={formReason} onChange={e => setFormReason(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[13px] text-foreground" />
            </div>
          </div>
          <div className="px-5 py-4 border-t border-border flex gap-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 h-11 rounded-xl border border-border bg-muted text-[12px] font-semibold text-muted-foreground">ยกเลิก</button>
            <button onClick={createRequest} disabled={!formStaffId || !formTypeId || !formStart || !formEnd} className="flex-1 h-11 rounded-xl bg-primary text-white text-[12px] font-bold shadow-[0_2px_8px_hsl(var(--primary)/0.3)] hover:opacity-90 disabled:opacity-40">ส่งคำขอ</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Config modal */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-md p-0 gap-0 rounded-2xl border-border bg-[hsl(var(--surface))]" aria-describedby={undefined}>
          <div className="px-5 py-4 border-b border-border"><DialogTitle className="text-[15px] font-bold text-foreground">⚙️ ประเภทการลา</DialogTitle></div>
          <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
            {leaveTypes.map(lt => (
              <div key={lt.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <span className="text-[20px]">{lt.icon}</span>
                <div className="flex-1">
                  <div className="text-[12px] font-bold text-foreground">{lt.name_th}</div>
                  <div className="text-[10px] text-muted-foreground">{lt.days_per_year} วัน/ปี · {lt.is_paid ? "จ่ายเงิน" : "ไม่จ่าย"}</div>
                </div>
                <button onClick={() => { setEditType(lt); setCfgNameTh(lt.name_th); setCfgNameEn(lt.name_en); setCfgIcon(lt.icon); setCfgDays(String(lt.days_per_year)); setCfgPaid(lt.is_paid); }}
                  className="text-[10px] text-primary font-bold">แก้ไข</button>
              </div>
            ))}
            {editType && (
              <div className="border border-primary/30 rounded-xl p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input value={cfgNameTh} onChange={e => setCfgNameTh(e.target.value)} placeholder="ชื่อไทย" className="h-9 px-3 rounded-lg border border-border bg-background text-[12px] text-foreground" />
                  <input value={cfgNameEn} onChange={e => setCfgNameEn(e.target.value)} placeholder="English" className="h-9 px-3 rounded-lg border border-border bg-background text-[12px] text-foreground" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input value={cfgIcon} onChange={e => setCfgIcon(e.target.value)} placeholder="Icon" className="h-9 px-3 rounded-lg border border-border bg-background text-[12px] text-foreground text-center" />
                  <input type="number" value={cfgDays} onChange={e => setCfgDays(e.target.value)} placeholder="วัน/ปี" className="h-9 px-3 rounded-lg border border-border bg-background text-[12px] text-foreground" />
                  <button onClick={() => setCfgPaid(!cfgPaid)} className={cn("h-9 rounded-lg text-[10px] font-bold", cfgPaid ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>{cfgPaid ? "จ่ายเงิน" : "ไม่จ่าย"}</button>
                </div>
                <button onClick={saveLeaveType} className="w-full h-9 rounded-lg bg-primary text-white text-[11px] font-bold">💾 บันทึก</button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
