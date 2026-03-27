import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Plus, Calculator, Check, DollarSign, FileText, Download, Eye, RefreshCw } from "lucide-react";

export function PayrollScreen() {
  const { toast } = useToast();
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<any | null>(null);
  const [payrollItems, setPayrollItems] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [showPaySlip, setShowPaySlip] = useState<any | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  // Create form
  const [formName, setFormName] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");

  useEffect(() => { fetchPeriods(); }, []);

  async function fetchPeriods() {
    setLoading(true);
    const [pRes, sRes] = await Promise.all([
      supabase.from("payroll_periods").select("*").order("created_at", { ascending: false }),
      supabase.from("staff").select("*, roles(label)").eq("is_active", true),
    ]);
    setPeriods(pRes.data || []);
    setStaff(sRes.data || []);
    setLoading(false);
  }

  async function createPeriod() {
    if (!formName || !formStart || !formEnd) return;
    const { error } = await supabase.from("payroll_periods").insert({
      period_name: formName, start_date: formStart, end_date: formEnd,
    });
    if (error) { toast({ title: "❌ Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "✅ สร้างงวด Payroll แล้ว" });
    setShowCreate(false);
    fetchPeriods();
  }

  async function calculatePayroll(periodId: string) {
    toast({ title: "🧮 กำลังคำนวณ..." });
    const { error } = await supabase.rpc("calculate_payroll", { p_period_id: periodId });
    if (error) { toast({ title: "❌ Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "✅ คำนวณเสร็จแล้ว" });
    fetchPeriods();
    viewDetail(periodId);
  }

  async function viewDetail(periodId: string) {
    const period = periods.find(p => p.id === periodId) || (await supabase.from("payroll_periods").select("*").eq("id", periodId).single()).data;
    const { data: items } = await supabase.from("payroll_items").select("*, staff(name, nickname, roles(label), bank_name, bank_account, start_date)").eq("period_id", periodId);
    const { data: sess } = await supabase.from("staff_sessions").select("*")
      .gte("clock_in", `${period.start_date}T00:00:00`)
      .lte("clock_in", `${period.end_date}T23:59:59`);
    setSelectedPeriod(period);
    setPayrollItems(items || []);
    setSessions(sess || []);
  }

  async function approvePeriod(periodId: string) {
    await supabase.from("payroll_periods").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", periodId);
    toast({ title: "✅ อนุมัติเงินเดือนแล้ว" });
    fetchPeriods();
    if (selectedPeriod?.id === periodId) viewDetail(periodId);
  }

  async function markPaid(periodId: string) {
    await supabase.from("payroll_periods").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", periodId);
    // Notify staff
    const items = payrollItems.length > 0 ? payrollItems : (await supabase.from("payroll_items").select("staff_id, net_pay").eq("period_id", periodId)).data || [];
    for (const item of items) {
      await supabase.from("staff_notifications").insert({
        staff_id: item.staff_id, type: "payroll_ready",
        title: "💰 เงินเดือนโอนแล้ว",
        body: `เงินเดือน ฿${Number(item.net_pay).toLocaleString()} โอนเข้าบัญชีแล้ว`,
        channel: "in_app",
      });
    }
    toast({ title: "💸 บันทึกจ่ายเงินเดือนแล้ว" });
    fetchPeriods();
    if (selectedPeriod?.id === periodId) viewDetail(periodId);
  }

  async function deletePeriod(periodId: string) {
    await supabase.from("payroll_periods").delete().eq("id", periodId);
    toast({ title: "🗑️ ลบงวดแล้ว" });
    if (selectedPeriod?.id === periodId) setSelectedPeriod(null);
    fetchPeriods();
  }

  function exportCSV() {
    if (!selectedPeriod || payrollItems.length === 0) return;
    const header = "staff_name,role,days_worked,regular_hours,ot_hours,regular_pay,ot_pay,gross_pay,deductions,net_pay,bank_name,bank_account\n";
    const rows = payrollItems.map(i => {
      const s = i.staff;
      const deductions = Number(i.deduction_late || 0) + Number(i.deduction_leave || 0) + Number(i.deduction_social_security || 0) + Number(i.deduction_other || 0);
      return `${s?.name || '-'},${s?.roles?.label || '-'},${i.days_worked},${i.regular_hours},${i.ot_hours},${i.regular_pay},${i.ot_pay},${i.gross_pay},${deductions},${i.net_pay},${s?.bank_name || '-'},${s?.bank_account || '-'}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payroll-${selectedPeriod.period_name}.csv`;
    a.click();
    toast({ title: "📥 Export สำเร็จ" });
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      calculated: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      paid: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    };
    const labels: Record<string, string> = { draft: "แบบร่าง", calculated: "คำนวณแล้ว", approved: "อนุมัติ", paid: "จ่ายแล้ว" };
    return <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", map[status] || map.draft)}>{labels[status] || status}</span>;
  };

  // Auto-suggest period name
  function openCreate() {
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleDateString("th-TH", { month: "long" });
    const year = now.getFullYear() + 543;
    if (day <= 15) {
      setFormName(`1-15 ${month} ${year}`);
      setFormStart(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
      setFormEnd(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`);
    } else {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      setFormName(`16-${lastDay} ${month} ${year}`);
      setFormStart(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-16`);
      setFormEnd(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`);
    }
    setShowCreate(true);
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-2" />กำลังโหลด...</div>;

  // Pay slip modal
  if (showPaySlip) {
    const item = showPaySlip;
    const s = item.staff;
    const totalDeductions = Number(item.deduction_late || 0) + Number(item.deduction_leave || 0) + Number(item.deduction_social_security || 0) + Number(item.deduction_tax || 0) + Number(item.deduction_other || 0);
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="px-5 py-3 border-b border-border bg-[hsl(var(--surface))] shrink-0 flex items-center gap-3">
          <button onClick={() => setShowPaySlip(null)} className="text-[12px] text-muted-foreground hover:text-foreground">← กลับ</button>
          <h1 className="text-[15px] font-bold text-foreground">📄 ใบจ่ายเงินเดือน</h1>
          <button onClick={() => window.print()} className="ml-auto px-3 py-2 rounded-xl text-[11px] font-bold bg-muted text-muted-foreground border border-border hover:text-foreground">🖨 พิมพ์</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-lg mx-auto bg-[hsl(var(--surface))] border border-border rounded-2xl p-6 space-y-4 print:shadow-none print:border-0">
            <div className="text-center border-b border-border pb-4">
              <div className="text-[18px] font-black text-foreground">Phimm Cafe</div>
              <div className="text-[12px] text-muted-foreground">ใบจ่ายเงินเดือน / Pay Slip</div>
              <div className="text-[11px] text-muted-foreground mt-1">งวด: {selectedPeriod?.period_name}</div>
            </div>
            <div className="flex justify-between text-[12px]">
              <div><span className="text-muted-foreground">พนักงาน:</span> <span className="font-bold text-foreground">{s?.nickname || s?.name}</span></div>
              <div><span className="text-muted-foreground">ตำแหน่ง:</span> <span className="font-bold text-foreground">{s?.roles?.label}</span></div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <div className="text-[11px] font-bold text-foreground mb-2">💰 รายได้</div>
              <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">เวลาปกติ {Number(item.regular_hours).toFixed(1)} ชม.</span><span className="font-mono tabular-nums text-foreground">฿{Number(item.regular_pay).toLocaleString()}</span></div>
              <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">OT {Number(item.ot_hours).toFixed(1)} ชม.</span><span className="font-mono tabular-nums text-foreground">฿{Number(item.ot_pay).toLocaleString()}</span></div>
              {Number(item.bonus) > 0 && <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">โบนัส</span><span className="font-mono tabular-nums text-foreground">฿{Number(item.bonus).toLocaleString()}</span></div>}
              <div className="flex justify-between text-[12px] font-bold border-t border-border pt-2"><span>รวมรายได้</span><span className="font-mono tabular-nums text-primary">฿{Number(item.gross_pay).toLocaleString()}</span></div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <div className="text-[11px] font-bold text-foreground mb-2">📉 รายการหัก</div>
              {Number(item.deduction_late) > 0 && <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">สาย ({item.days_late} วัน)</span><span className="font-mono tabular-nums text-red-500">-฿{Number(item.deduction_late).toLocaleString()}</span></div>}
              {Number(item.deduction_leave) > 0 && <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">ลาไม่รับเงิน</span><span className="font-mono tabular-nums text-red-500">-฿{Number(item.deduction_leave).toLocaleString()}</span></div>}
              {Number(item.deduction_social_security) > 0 && <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">ประกันสังคม 5% (สูงสุด ฿750)</span><span className="font-mono tabular-nums text-red-500">-฿{Number(item.deduction_social_security).toLocaleString()}</span></div>}
              {Number(item.deduction_tax) > 0 && <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">ภาษี</span><span className="font-mono tabular-nums text-red-500">-฿{Number(item.deduction_tax).toLocaleString()}</span></div>}
              {Number(item.deduction_other) > 0 && <div className="flex justify-between text-[12px]"><span className="text-muted-foreground">อื่นๆ {item.deduction_note ? `(${item.deduction_note})` : ''}</span><span className="font-mono tabular-nums text-red-500">-฿{Number(item.deduction_other).toLocaleString()}</span></div>}
              <div className="flex justify-between text-[12px] font-bold border-t border-border pt-2"><span>รวมหัก</span><span className="font-mono tabular-nums text-red-500">-฿{totalDeductions.toLocaleString()}</span></div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="text-[14px] font-bold text-foreground">เงินเดือนสุทธิ</span>
                <span className="text-[20px] font-black font-mono tabular-nums text-primary">฿{Number(item.net_pay).toLocaleString()}</span>
              </div>
              {s?.bank_name && <div className="text-[11px] text-muted-foreground mt-2">โอนเข้า: {s.bank_name} {s.bank_account}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedPeriod) {
    const totalRegular = payrollItems.reduce((s, i) => s + Number(i.regular_pay || 0), 0);
    const totalOT = payrollItems.reduce((s, i) => s + Number(i.ot_pay || 0), 0);
    const totalDeductions = payrollItems.reduce((s, i) => s + Number(i.deduction_late || 0) + Number(i.deduction_leave || 0) + Number(i.deduction_social_security || 0) + Number(i.deduction_other || 0), 0);
    const totalNet = payrollItems.reduce((s, i) => s + Number(i.net_pay || 0), 0);

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="px-5 py-3 border-b border-border bg-[hsl(var(--surface))] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedPeriod(null)} className="text-[12px] text-muted-foreground hover:text-foreground">← กลับ</button>
            <h1 className="text-[15px] font-bold text-foreground">💰 {selectedPeriod.period_name}</h1>
            {statusBadge(selectedPeriod.status)}
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {selectedPeriod.status === "calculated" && (
              <>
                <button onClick={() => approvePeriod(selectedPeriod.id)} className="px-3 py-2 rounded-xl text-[11px] font-bold bg-green-600 text-white hover:opacity-90"><Check size={12} className="inline mr-1" />อนุมัติ</button>
                <button onClick={() => calculatePayroll(selectedPeriod.id)} className="px-3 py-2 rounded-xl text-[11px] font-bold bg-muted text-muted-foreground border border-border hover:text-foreground"><RefreshCw size={12} className="inline mr-1" />คำนวณใหม่</button>
              </>
            )}
            {selectedPeriod.status === "approved" && (
              <button onClick={() => markPaid(selectedPeriod.id)} className="px-3 py-2 rounded-xl text-[11px] font-bold bg-purple-600 text-white hover:opacity-90"><DollarSign size={12} className="inline mr-1" />จ่ายเงินเดือน</button>
            )}
            <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-[11px] font-bold bg-muted text-muted-foreground border border-border hover:text-foreground ml-auto"><Download size={12} className="inline mr-1" />Export CSV</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "เงินเดือนปกติ", value: totalRegular, color: "text-foreground" },
              { label: "ค่า OT", value: totalOT, color: "text-blue-500" },
              { label: "รวมหัก", value: totalDeductions, color: "text-red-500" },
              { label: "จ่ายสุทธิ", value: totalNet, color: "text-primary" },
            ].map(c => (
              <div key={c.label} className="bg-[hsl(var(--surface))] border border-border rounded-2xl p-4 text-center">
                <div className="text-[10px] text-muted-foreground">{c.label}</div>
                <div className={cn("font-mono text-[18px] font-black tabular-nums mt-1", c.color)}>฿{c.value.toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-[hsl(var(--surface))] border border-border rounded-2xl overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="px-4 py-3 font-semibold">พนักงาน</th>
                  <th className="px-2 py-3 font-semibold text-right">วัน</th>
                  <th className="px-2 py-3 font-semibold text-right">ชม.</th>
                  <th className="px-2 py-3 font-semibold text-right">ปกติ</th>
                  <th className="px-2 py-3 font-semibold text-right">OT</th>
                  <th className="px-2 py-3 font-semibold text-right">รวมรายได้</th>
                  <th className="px-2 py-3 font-semibold text-right">หัก</th>
                  <th className="px-2 py-3 font-semibold text-right">สุทธิ</th>
                  <th className="px-3 py-3 font-semibold text-center">ใบจ่าย</th>
                </tr>
              </thead>
              <tbody>
                {payrollItems.map(item => {
                  const s = item.staff;
                  const deductions = Number(item.deduction_late || 0) + Number(item.deduction_leave || 0) + Number(item.deduction_social_security || 0) + Number(item.deduction_other || 0);
                  const isExpanded = expandedRow === item.id;
                  const staffSessions = sessions.filter(se => se.staff_id === item.staff_id && se.clock_out);
                  return (
                    <>
                      <tr key={item.id} onClick={() => setExpandedRow(isExpanded ? null : item.id)} className="border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground">{s?.nickname || s?.name}</div>
                          <div className="text-[9px] text-muted-foreground">{s?.roles?.label}</div>
                        </td>
                        <td className="px-2 py-3 text-right font-mono tabular-nums">{item.days_worked}</td>
                        <td className="px-2 py-3 text-right font-mono tabular-nums">{Number(item.regular_hours).toFixed(1)}</td>
                        <td className="px-2 py-3 text-right font-mono tabular-nums">฿{Number(item.regular_pay).toLocaleString()}</td>
                        <td className="px-2 py-3 text-right font-mono tabular-nums text-blue-500">฿{Number(item.ot_pay).toLocaleString()}</td>
                        <td className="px-2 py-3 text-right font-mono tabular-nums font-bold">฿{Number(item.gross_pay).toLocaleString()}</td>
                        <td className="px-2 py-3 text-right font-mono tabular-nums text-red-500">{deductions > 0 ? `-฿${deductions.toLocaleString()}` : '-'}</td>
                        <td className="px-2 py-3 text-right font-mono tabular-nums font-bold text-primary">฿{Number(item.net_pay).toLocaleString()}</td>
                        <td className="px-3 py-3 text-center">
                          <button onClick={(e) => { e.stopPropagation(); setShowPaySlip(item); }} className="text-primary hover:underline text-[10px] font-bold">📄</button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${item.id}-detail`}>
                          <td colSpan={9} className="px-4 py-3 bg-muted/20">
                            <div className="text-[10px] font-bold text-muted-foreground mb-2">รายละเอียดกะงาน</div>
                            <div className="space-y-1">
                              {staffSessions.map(se => (
                                <div key={se.id} className="flex gap-4 text-[10px] font-mono">
                                  <span className="text-muted-foreground">{new Date(se.clock_in).toLocaleDateString("th-TH", { day: "2-digit", month: "short" })}</span>
                                  <span>{new Date(se.clock_in).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} - {new Date(se.clock_out).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
                                  <span>{Number(se.total_hours || 0).toFixed(1)} ชม.</span>
                                  {se.is_late && <span className="text-red-500">สาย {se.late_minutes} นาที</span>}
                                  {Number(se.ot_minutes || 0) > 0 && <span className="text-blue-500">OT {se.ot_minutes} นาที</span>}
                                </div>
                              ))}
                              {staffSessions.length === 0 && <div className="text-[10px] text-muted-foreground">ไม่มีข้อมูลกะงาน</div>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Period list view
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="px-5 py-3 border-b border-border bg-[hsl(var(--surface))] shrink-0">
        <h1 className="text-[15px] font-bold text-foreground">💰 Payroll — เงินเดือน</h1>
        <p className="text-[11px] text-muted-foreground">จัดการงวดเงินเดือนและคำนวณค่าแรง</p>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex justify-end">
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-bold bg-primary text-white shadow-[0_2px_8px_hsl(var(--primary)/0.3)] hover:opacity-90">
            <Plus size={14} /> สร้างงวดใหม่
          </button>
        </div>

        {periods.length === 0 && <div className="text-center text-muted-foreground py-20 text-[13px]">ยังไม่มีงวด Payroll — กดปุ่มด้านบนเพื่อสร้าง</div>}

        <div className="space-y-3">
          {periods.map(p => (
            <div key={p.id} className="bg-[hsl(var(--surface))] border border-border rounded-2xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-[14px] font-bold text-foreground">{p.period_name}</div>
                {statusBadge(p.status)}
              </div>
              <div className="text-[11px] text-muted-foreground mb-3">{p.start_date} → {p.end_date} · รวม ฿{Number(p.total_amount || 0).toLocaleString()}</div>
              <div className="flex gap-2 flex-wrap">
                {p.status === "draft" && (
                  <>
                    <button onClick={() => calculatePayroll(p.id)} className="px-3 py-2 rounded-xl text-[10px] font-bold bg-blue-600 text-white hover:opacity-90"><Calculator size={11} className="inline mr-1" />คำนวณ</button>
                    <button onClick={() => deletePeriod(p.id)} className="px-3 py-2 rounded-xl text-[10px] font-bold bg-muted text-red-500 border border-border hover:bg-red-50 dark:hover:bg-red-900/20">🗑️ ลบ</button>
                  </>
                )}
                {p.status === "calculated" && (
                  <>
                    <button onClick={() => viewDetail(p.id)} className="px-3 py-2 rounded-xl text-[10px] font-bold bg-muted text-muted-foreground border border-border hover:text-foreground"><Eye size={11} className="inline mr-1" />ดูรายละเอียด</button>
                    <button onClick={() => approvePeriod(p.id)} className="px-3 py-2 rounded-xl text-[10px] font-bold bg-green-600 text-white hover:opacity-90"><Check size={11} className="inline mr-1" />อนุมัติ</button>
                    <button onClick={() => calculatePayroll(p.id)} className="px-3 py-2 rounded-xl text-[10px] font-bold bg-muted text-muted-foreground border border-border hover:text-foreground"><RefreshCw size={11} className="inline mr-1" />คำนวณใหม่</button>
                  </>
                )}
                {(p.status === "approved" || p.status === "paid") && (
                  <>
                    <button onClick={() => viewDetail(p.id)} className="px-3 py-2 rounded-xl text-[10px] font-bold bg-muted text-muted-foreground border border-border hover:text-foreground"><Eye size={11} className="inline mr-1" />ดู</button>
                    {p.status === "approved" && <button onClick={() => markPaid(p.id)} className="px-3 py-2 rounded-xl text-[10px] font-bold bg-purple-600 text-white hover:opacity-90"><DollarSign size={11} className="inline mr-1" />จ่ายเงินเดือน</button>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm p-0 gap-0 rounded-2xl border-border bg-[hsl(var(--surface))]" aria-describedby={undefined}>
          <div className="px-5 py-4 border-b border-border">
            <DialogTitle className="text-[15px] font-bold text-foreground">💰 สร้างงวด Payroll</DialogTitle>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ชื่องวด</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">เริ่ม</label>
                <input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">สิ้นสุด</label>
                <input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-border bg-background text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-border flex gap-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 h-11 rounded-xl border border-border bg-muted text-[12px] font-semibold text-muted-foreground">ยกเลิก</button>
            <button onClick={createPeriod} disabled={!formName || !formStart || !formEnd} className="flex-1 h-11 rounded-xl bg-primary text-white text-[12px] font-bold shadow-[0_2px_8px_hsl(var(--primary)/0.3)] hover:opacity-90 disabled:opacity-40">สร้าง</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
