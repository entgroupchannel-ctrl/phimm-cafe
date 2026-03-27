import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { POSStatCard } from "./POSStatCard";
import { POSBadge } from "./POSBadge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Minus, Pencil, BarChart3, ClipboardCheck, Printer, Package, History, ShoppingCart, Store } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

// ─── Types ───────────────────────────────────────
interface StockItem {
  id: string; name: string; unit: string; qty: number;
  min_threshold: number; cost_per_unit: number;
  supplier: string | null; category: string | null;
  is_active: boolean; updated_at: string;
  status: "ok" | "low" | "critical";
}
interface Supplier {
  id: string; name: string; contact_name: string | null;
  phone: string | null; email: string | null;
  line_id: string | null; address: string | null;
  note: string | null; is_active: boolean; created_at: string;
}
interface StockLog {
  id: string; stock_item_id: string; change_qty: number;
  reason: string; movement_type: string | null; created_at: string;
  ref_order_id: string | null; staff_id: string | null;
  stock_items: { name: string; unit: string } | null;
}
interface PO {
  id: string; po_number: string; supplier: string | null;
  status: string; total_amount: number; note: string | null;
  created_at: string; ordered_at: string | null; received_at: string | null;
  staff_id: string | null;
}

type Tab = "stock" | "history" | "po" | "suppliers";
const CATEGORIES = ["ทั้งหมด", "เนื้อสัตว์", "อาหารทะเล", "ผัก", "เครื่องปรุง", "ธัญพืช/แป้ง", "เครื่องดื่ม", "อื่นๆ"];
const STATUS_FILTERS = ["ทั้งหมด", "ปกติ", "ใกล้หมด", "หมดแล้ว"];
const REASON_LABELS: Record<string, { label: string; color: string }> = {
  restock: { label: "📦 เติมสต๊อก", color: "success" },
  order: { label: "🍳 ตัดจากออเดอร์", color: "warning" },
  waste: { label: "🗑️ เสียหาย/ทิ้ง", color: "danger" },
  manual_adjust: { label: "🔧 ปรับสต๊อก", color: "primary" },
  po_receive: { label: "📦 รับจาก PO", color: "success" },
  count_correct: { label: "📊 ตรวจนับ", color: "primary" },
};
const MOVEMENT_LABELS: Record<string, { label: string; color: string }> = {
  usage: { label: "🍳 ใช้งาน", color: "warning" },
  purchase: { label: "📦 ซื้อเข้า", color: "success" },
  waste: { label: "🗑️ เสียหาย", color: "danger" },
  count_correct: { label: "📊 ตรวจนับ", color: "primary" },
  manual: { label: "🔧 ปรับเอง", color: "accent" },
};

// ─── Main Component ──────────────────────────────
export function StockScreen() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("stock");

  // Stock state
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [catFilter, setCatFilter] = useState("ทั้งหมด");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");

  // Quick adjust modal
  const [adjustModal, setAdjustModal] = useState<{ item: StockItem; mode: "add" | "remove" } | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  // Add/Edit modal
  const [editModal, setEditModal] = useState<StockItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formMin, setFormMin] = useState("");
  const [formCost, setFormCost] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formSupplier, setFormSupplier] = useState("");

  // Stock Count
  const [showStockCount, setShowStockCount] = useState(false);
  const [countData, setCountData] = useState<{ id: string; name: string; unit: string; systemQty: number; actualQty: string }[]>([]);

  // PO state
  const [pos, setPos] = useState<PO[]>([]);
  const [poLoading, setPoLoading] = useState(false);
  const [poStatusFilter, setPoStatusFilter] = useState("ทั้งหมด");
  const [showPoForm, setShowPoForm] = useState(false);
  const [poLines, setPoLines] = useState<{ stock_item_id: string; qty: string; unit_cost: string }[]>([]);
  const [poSupplier, setPoSupplier] = useState("");
  const [poNote, setPoNote] = useState("");

  // History state
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logReasonFilter, setLogReasonFilter] = useState("ทั้งหมด");
  const [logItemFilter, setLogItemFilter] = useState("ทั้งหมด");

  // Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppLoading, setSuppLoading] = useState(false);
  const [showSuppModal, setShowSuppModal] = useState(false);
  const [editSupp, setEditSupp] = useState<Supplier | null>(null);
  const [suppForm, setSuppForm] = useState({ name: "", contact_name: "", phone: "", email: "", line_id: "", address: "", note: "" });

  // ─── Fetch data ────────────────────────────────
  useEffect(() => {
    fetchStock();
    fetchSuppliers();
    const channel = supabase.channel("stock-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_items" }, () => fetchStock())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (tab === "po") fetchPOs();
    if (tab === "history") fetchLogs();
  }, [tab]);

  async function fetchStock() {
    const { data } = await supabase.from("stock_items").select("*").eq("is_active", true).order("name");
    if (data) {
      setStocks(data.map(s => ({
        ...s, qty: Number(s.qty), min_threshold: Number(s.min_threshold), cost_per_unit: Number(s.cost_per_unit),
        status: Number(s.qty) <= 0 ? "critical" as const : Number(s.qty) <= Number(s.min_threshold) ? "low" as const : "ok" as const,
      })));
    }
    setLoading(false);
  }

  async function fetchPOs() {
    setPoLoading(true);
    const { data } = await supabase.from("purchase_orders").select("*").order("created_at", { ascending: false });
    if (data) setPos(data as any);
    setPoLoading(false);
  }

  async function fetchLogs() {
    setLogsLoading(true);
    const { data } = await supabase.from("stock_logs").select("*, stock_items(name, unit)").order("created_at", { ascending: false }).limit(200);
    if (data) setLogs(data as any);
    setLogsLoading(false);
  }

  async function fetchSuppliers() {
    setSuppLoading(true);
    const { data } = await supabase.from("suppliers").select("*").order("name");
    if (data) setSuppliers(data as any);
    setSuppLoading(false);
  }

  // ─── Stock actions ─────────────────────────────
  async function handleAdjustStock() {
    if (!adjustModal || !adjustQty) return;
    const qty = Number(adjustQty);
    if (qty <= 0) return;
    const change = adjustModal.mode === "add" ? qty : -qty;
    const reason = adjustModal.mode === "add" ? "restock" : "waste";
    const { error } = await supabase.rpc("adjust_stock", {
      p_stock_item_id: adjustModal.item.id,
      p_quantity_change: change,
      p_reason: reason,
      p_note: adjustNote || null,
    } as any);
    if (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      toast({ title: adjustModal.mode === "add" ? "เติมสต๊อกสำเร็จ" : "ตัดสต๊อกสำเร็จ" });
      fetchStock();
    }
    setAdjustModal(null); setAdjustQty(""); setAdjustNote("");
  }

  async function handleSaveItem() {
    if (!formName || !formUnit) return;
    if (editModal) {
      await supabase.from("stock_items").update({
        name: formName, unit: formUnit, min_threshold: Number(formMin) || 0,
        cost_per_unit: Number(formCost) || 0, category: formCategory || null, supplier: formSupplier || null,
      }).eq("id", editModal.id);
      toast({ title: "บันทึกสำเร็จ" });
    } else {
      await supabase.from("stock_items").insert({
        name: formName, unit: formUnit, qty: Number(formQty) || 0,
        min_threshold: Number(formMin) || 0, cost_per_unit: Number(formCost) || 0,
        category: formCategory || null, supplier: formSupplier || null,
      });
      toast({ title: "เพิ่มวัตถุดิบสำเร็จ" });
    }
    setEditModal(null); setShowAddModal(false); fetchStock();
  }

  function openEditModal(item: StockItem) {
    setFormName(item.name); setFormUnit(item.unit); setFormQty(String(item.qty));
    setFormMin(String(item.min_threshold)); setFormCost(String(item.cost_per_unit));
    setFormCategory(item.category || ""); setFormSupplier(item.supplier || "");
    setEditModal(item);
  }

  function openAddModal() {
    setFormName(""); setFormUnit(""); setFormQty(""); setFormMin("");
    setFormCost(""); setFormCategory(""); setFormSupplier("");
    setShowAddModal(true);
  }

  // ─── Stock Count ───────────────────────────────
  function openStockCount() {
    setCountData(stocks.map(s => ({ id: s.id, name: s.name, unit: s.unit, systemQty: s.qty, actualQty: String(s.qty) })));
    setShowStockCount(true);
  }

  async function saveStockCount() {
    let adjusted = 0;
    for (const row of countData) {
      const actual = Number(row.actualQty);
      const diff = actual - row.systemQty;
      if (diff !== 0) {
        await supabase.rpc("adjust_stock", {
          p_stock_item_id: row.id,
          p_quantity_change: diff,
          p_reason: "count_correct",
          p_note: `ตรวจนับ: ระบบ ${row.systemQty} → นับได้ ${actual}`,
        } as any);
        adjusted++;
      }
    }
    toast({ title: `ตรวจนับเสร็จสิ้น`, description: `ปรับปรุง ${adjusted} รายการ` });
    setShowStockCount(false); fetchStock();
  }

  // ─── PO actions ────────────────────────────────
  async function createPO() {
    const validLines = poLines.filter(l => l.stock_item_id && Number(l.qty) > 0 && Number(l.unit_cost) > 0);
    if (validLines.length === 0) return;
    const totalAmount = validLines.reduce((s, l) => s + Number(l.qty) * Number(l.unit_cost), 0);
    const { data: po, error } = await supabase.from("purchase_orders").insert({
      po_number: "temp", supplier: poSupplier || null,
      note: poNote || null, total_amount: totalAmount, status: "draft",
    }).select().single();
    if (error || !po) return;
    await supabase.from("purchase_order_items").insert(
      validLines.map(l => ({ po_id: po.id, stock_item_id: l.stock_item_id, qty: Number(l.qty), unit_cost: Number(l.unit_cost) }))
    );
    setShowPoForm(false); setPoLines([]); setPoSupplier(""); setPoNote("");
    fetchPOs(); toast({ title: "สร้าง PO สำเร็จ" });
  }

  async function updatePoStatus(poId: string, newStatus: string) {
    if (newStatus === "received") {
      await supabase.rpc("receive_purchase_order", { p_po_id: poId });
    } else {
      const update: Record<string, any> = { status: newStatus };
      if (newStatus === "ordered") update.ordered_at = new Date().toISOString();
      await supabase.from("purchase_orders").update(update).eq("id", poId);
    }
    fetchPOs(); fetchStock();
    toast({ title: newStatus === "received" ? "รับสินค้าสำเร็จ — สต๊อกอัปเดตแล้ว" : "อัปเดตสถานะสำเร็จ" });
  }

  function openAutoFillPO() {
    const lowItems = stocks.filter(s => s.status !== "ok");
    setPoLines(lowItems.map(s => ({
      stock_item_id: s.id,
      qty: String(Math.max(1, Math.round(s.min_threshold * 3 - s.qty))),
      unit_cost: String(s.cost_per_unit),
    })));
    setShowPoForm(true);
  }

  // ─── Supplier actions ──────────────────────────
  function openSuppAdd() {
    setSuppForm({ name: "", contact_name: "", phone: "", email: "", line_id: "", address: "", note: "" });
    setEditSupp(null); setShowSuppModal(true);
  }
  function openSuppEdit(s: Supplier) {
    setSuppForm({ name: s.name, contact_name: s.contact_name || "", phone: s.phone || "", email: s.email || "", line_id: s.line_id || "", address: s.address || "", note: s.note || "" });
    setEditSupp(s); setShowSuppModal(true);
  }
  async function saveSupplier() {
    if (!suppForm.name) return;
    const payload = { name: suppForm.name, contact_name: suppForm.contact_name || null, phone: suppForm.phone || null, email: suppForm.email || null, line_id: suppForm.line_id || null, address: suppForm.address || null, note: suppForm.note || null };
    if (editSupp) {
      await supabase.from("suppliers").update(payload).eq("id", editSupp.id);
    } else {
      await supabase.from("suppliers").insert(payload);
    }
    setShowSuppModal(false); fetchSuppliers();
    toast({ title: editSupp ? "แก้ไขผู้ค้าสำเร็จ" : "เพิ่มผู้ค้าสำเร็จ" });
  }

  // ─── Filtered data ─────────────────────────────
  const filteredStocks = useMemo(() => {
    let list = stocks;
    if (searchQ) list = list.filter(s => s.name.toLowerCase().includes(searchQ.toLowerCase()));
    if (catFilter !== "ทั้งหมด") list = list.filter(s => s.category === catFilter);
    if (statusFilter === "ปกติ") list = list.filter(s => s.status === "ok");
    else if (statusFilter === "ใกล้หมด") list = list.filter(s => s.status === "low");
    else if (statusFilter === "หมดแล้ว") list = list.filter(s => s.status === "critical");
    return list;
  }, [stocks, searchQ, catFilter, statusFilter]);

  const filteredLogs = useMemo(() => {
    let list = logs;
    if (logReasonFilter !== "ทั้งหมด") list = list.filter(l => l.reason === logReasonFilter);
    if (logItemFilter !== "ทั้งหมด") list = list.filter(l => l.stock_item_id === logItemFilter);
    return list;
  }, [logs, logReasonFilter, logItemFilter]);

  const filteredPOs = useMemo(() => {
    if (poStatusFilter === "ทั้งหมด") return pos;
    return pos.filter(p => p.status === poStatusFilter);
  }, [pos, poStatusFilter]);

  // Chart data for history
  const chartData = useMemo(() => {
    const byDate: Record<string, { date: string; in: number; out: number }> = {};
    logs.forEach(l => {
      const d = new Date(l.created_at).toLocaleDateString("th-TH", { day: "2-digit", month: "short" });
      if (!byDate[d]) byDate[d] = { date: d, in: 0, out: 0 };
      if (Number(l.change_qty) > 0) byDate[d].in += Number(l.change_qty);
      else byDate[d].out += Math.abs(Number(l.change_qty));
    });
    return Object.values(byDate).reverse().slice(-14);
  }, [logs]);

  const totalItems = stocks.length;
  const lowItems = stocks.filter(s => s.status === "low").length;
  const criticalItems = stocks.filter(s => s.status === "critical").length;
  const totalValue = Math.round(stocks.reduce((sum, s) => sum + s.qty * s.cost_per_unit, 0));

  const TABS: { key: Tab; label: string; Icon: any }[] = [
    { key: "stock", label: "วัตถุดิบ", Icon: Package },
    { key: "history", label: "ประวัติ", Icon: History },
    { key: "po", label: "ใบสั่งซื้อ", Icon: ShoppingCart },
    { key: "suppliers", label: "ผู้ค้า", Icon: Store },
  ];

  // ═══════════════════════════════════════════════
  // STOCK COUNT FULL-SCREEN MODE
  // ═══════════════════════════════════════════════
  if (showStockCount) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="shrink-0 px-6 py-4 border-b border-border flex items-center justify-between bg-[hsl(var(--surface))]">
          <div className="text-[15px] font-bold text-foreground">📊 ตรวจนับสต๊อก</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowStockCount(false)}>ยกเลิก</Button>
            <Button size="sm" onClick={saveStockCount}>💾 บันทึกผลตรวจนับ</Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-muted-foreground font-semibold border-b border-border text-left bg-muted/30">
                  <th className="py-3 px-5 font-semibold">วัตถุดิบ</th>
                  <th className="py-3 px-4 font-semibold">หน่วย</th>
                  <th className="py-3 px-4 font-semibold text-right">สต๊อกในระบบ</th>
                  <th className="py-3 px-4 font-semibold text-center">นับได้จริง</th>
                  <th className="py-3 px-4 font-semibold text-right">ผลต่าง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {countData.map((row, i) => {
                  const diff = Number(row.actualQty) - row.systemQty;
                  return (
                    <tr key={row.id} className="hover:bg-muted/20">
                      <td className="py-3 px-5 font-semibold text-foreground">{row.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{row.unit}</td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">{row.systemQty}</td>
                      <td className="py-3 px-4 text-center">
                        <input type="number" value={row.actualQty}
                          onChange={e => { const n = [...countData]; n[i].actualQty = e.target.value; setCountData(n); }}
                          className="w-24 h-8 px-2 rounded-lg border border-border bg-background text-foreground text-[13px] font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </td>
                      <td className={cn("py-3 px-4 text-right font-mono font-bold tabular-nums",
                        diff > 0 ? "text-success" : diff < 0 ? "text-danger" : "text-muted-foreground"
                      )}>
                        {diff === 0 ? "✓" : diff > 0 ? `+${diff}` : String(diff)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Low stock alert banner */}
      {(lowItems + criticalItems) > 0 && tab === "stock" && (
        <div onClick={() => setStatusFilter("ใกล้หมด")}
          className="shrink-0 px-6 py-2.5 bg-warning/10 border-b border-warning/30 text-warning text-[13px] font-semibold cursor-pointer hover:bg-warning/15 transition-colors">
          ⚠️ {lowItems + criticalItems} วัตถุดิบใกล้หมดหรือหมดแล้ว — คลิกเพื่อดูรายละเอียด
        </div>
      )}

      {/* Tab bar */}
      <div className="shrink-0 px-6 pt-5 pb-3 flex items-center gap-2">
        {TABS.map(t => {
          const Icon = t.Icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-[13px] font-bold border transition-all flex items-center gap-1.5",
                tab === t.key
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-border hover:text-foreground"
              )}>
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-6 space-y-5">

        {/* ═══ TAB: Stock ═══ */}
        {tab === "stock" && (
          <>
            <div className="flex gap-4 flex-wrap">
              <POSStatCard icon="📦" label="วัตถุดิบทั้งหมด" value={String(totalItems)} sub="รายการ" color="primary" />
              <POSStatCard icon="⚠️" label="ใกล้หมด" value={String(lowItems)} sub="ต้องสั่งซื้อ" color="warning" />
              <POSStatCard icon="🚨" label="หมดแล้ว" value={String(criticalItems)} sub="วิกฤต!" color="danger" />
              <POSStatCard icon="💰" label="มูลค่าสต๊อก" value={`฿${totalValue.toLocaleString()}`} sub="รวม" color="accent" />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="ค้นหาวัตถุดิบ..." className="pl-9 h-9 rounded-xl text-[13px]" />
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30">
                {STATUS_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Button size="sm" variant="outline" onClick={openStockCount}>
                <ClipboardCheck size={14} className="mr-1" /> ตรวจนับสต๊อก
              </Button>
              <Button size="sm" onClick={openAddModal}>
                <Plus size={14} className="mr-1" /> เพิ่มวัตถุดิบ
              </Button>
            </div>

            {/* Stock table */}
            <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-muted-foreground font-semibold border-b border-border text-left bg-muted/20">
                        <th className="py-3 px-5 font-semibold">ชื่อ</th>
                        <th className="py-3 px-4 font-semibold">หมวดหมู่</th>
                        <th className="py-3 px-4 font-semibold text-right">สต๊อก</th>
                        <th className="py-3 px-4 font-semibold">หน่วย</th>
                        <th className="py-3 px-4 font-semibold text-right">ต้นทุน/หน่วย</th>
                        <th className="py-3 px-4 font-semibold">สถานะ</th>
                        <th className="py-3 px-4 font-semibold text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredStocks.map(s => (
                        <tr key={s.id} className={cn("hover:bg-muted/30 transition-colors",
                          s.status === "low" && "bg-warning/5",
                          s.status === "critical" && "bg-danger/5"
                        )}>
                          <td className="py-3.5 px-5 font-semibold text-foreground">{s.name}</td>
                          <td className="py-3.5 px-4 text-muted-foreground text-[12px]">{s.category || "—"}</td>
                          <td className={cn("py-3.5 px-4 text-right font-mono font-bold tabular-nums",
                            s.status === "critical" ? "text-danger" : s.status === "low" ? "text-warning" : "text-foreground"
                          )}>{s.qty}</td>
                          <td className="py-3.5 px-4 text-muted-foreground">{s.unit}</td>
                          <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">฿{s.cost_per_unit}</td>
                          <td className="py-3.5 px-4">
                            <POSBadge color={s.status === "critical" ? "danger" : s.status === "low" ? "warning" : "success"}>
                              {s.status === "critical" ? "🔴 หมดแล้ว" : s.status === "low" ? "🟡 ใกล้หมด" : "🟢 ปกติ"}
                            </POSBadge>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setAdjustModal({ item: s, mode: "add" })} title="เติมสต๊อก"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-success hover:bg-success/10 transition-colors">
                                <Plus size={14} />
                              </button>
                              <button onClick={() => setAdjustModal({ item: s, mode: "remove" })} title="ตัดสต๊อก"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-danger hover:bg-danger/10 transition-colors">
                                <Minus size={14} />
                              </button>
                              <button onClick={() => openEditModal(s)} title="แก้ไข"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                                <Pencil size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredStocks.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">ไม่พบรายการ</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ TAB: History ═══ */}
        {tab === "history" && (
          <>
            {/* Chart */}
            {chartData.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="text-[13px] font-bold text-foreground mb-3">📊 สรุปการเคลื่อนไหวรายวัน</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="in" name="เข้า" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="out" name="ออก" fill="hsl(var(--danger))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <select value={logItemFilter} onChange={e => setLogItemFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-border bg-background text-foreground text-[13px]">
                <option value="ทั้งหมด">ทุกวัตถุดิบ</option>
                {stocks.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={logReasonFilter} onChange={e => setLogReasonFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-border bg-background text-foreground text-[13px]">
                <option value="ทั้งหมด">ทุกประเภท</option>
                {Object.entries(REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {/* Logs table */}
            <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              {logsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-muted-foreground font-semibold border-b border-border text-left bg-muted/20">
                        <th className="py-3 px-5 font-semibold">วันเวลา</th>
                        <th className="py-3 px-4 font-semibold">วัตถุดิบ</th>
                        <th className="py-3 px-4 font-semibold">ประเภท</th>
                        <th className="py-3 px-4 font-semibold text-right">จำนวน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredLogs.map(log => {
                        const r = REASON_LABELS[log.reason] || { label: log.reason, color: "muted" };
                        return (
                          <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-5 text-muted-foreground text-[12px]">
                              {new Date(log.created_at).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="py-3 px-4 font-semibold text-foreground">
                              {log.stock_items?.name || "—"}
                            </td>
                            <td className="py-3 px-4">
                              <POSBadge color={r.color as any}>{r.label}</POSBadge>
                            </td>
                            <td className={cn("py-3 px-4 text-right font-mono font-bold tabular-nums",
                              Number(log.change_qty) > 0 ? "text-success" : "text-danger"
                            )}>
                              {Number(log.change_qty) > 0 ? "+" : ""}{log.change_qty} {log.stock_items?.unit || ""}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredLogs.length === 0 && (
                        <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">ไม่พบรายการ</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ TAB: Purchase Orders ═══ */}
        {tab === "po" && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <select value={poStatusFilter} onChange={e => setPoStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-border bg-background text-foreground text-[13px]">
                <option value="ทั้งหมด">ทุกสถานะ</option>
                <option value="draft">แบบร่าง</option>
                <option value="ordered">สั่งแล้ว</option>
                <option value="received">รับแล้ว</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={openAutoFillPO}>
                  ⚡ PO อัตโนมัติ
                </Button>
                <Button size="sm" onClick={() => { setPoLines([{ stock_item_id: "", qty: "", unit_cost: "" }]); setShowPoForm(true); }}>
                  <Plus size={14} className="mr-1" /> สร้าง PO ใหม่
                </Button>
              </div>
            </div>

            {/* PO Form */}
            {showPoForm && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="text-[14px] font-bold text-foreground">📝 สร้างใบสั่งซื้อใหม่</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ผู้จำหน่าย</label>
                    <select value={poSupplier} onChange={e => setPoSupplier(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-[13px]">
                      <option value="">เลือกผู้ค้า...</option>
                      {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">หมายเหตุ</label>
                    <Input value={poNote} onChange={e => setPoNote(e.target.value)} placeholder="หมายเหตุ (ถ้ามี)" className="h-9 rounded-xl text-[13px]" />
                  </div>
                </div>

                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="py-2 text-left font-semibold">วัตถุดิบ</th>
                      <th className="py-2 text-left font-semibold w-24">จำนวน</th>
                      <th className="py-2 text-left font-semibold w-28">ราคา/หน่วย</th>
                      <th className="py-2 text-right font-semibold w-24">รวม</th>
                      <th className="py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {poLines.map((line, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-2">
                          <select value={line.stock_item_id} onChange={e => {
                            const newLines = [...poLines]; newLines[i].stock_item_id = e.target.value;
                            const item = stocks.find(s => s.id === e.target.value);
                            if (item) newLines[i].unit_cost = String(item.cost_per_unit);
                            setPoLines(newLines);
                          }} className="w-full h-8 px-2 rounded-lg border border-border bg-background text-foreground text-[12px]">
                            <option value="">เลือก...</option>
                            {stocks.map(s => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <input type="number" value={line.qty} onChange={e => { const n = [...poLines]; n[i].qty = e.target.value; setPoLines(n); }}
                            className="w-full h-8 px-2 rounded-lg border border-border bg-background text-foreground text-[12px] font-mono" />
                        </td>
                        <td className="py-2 pr-2">
                          <input type="number" value={line.unit_cost} onChange={e => { const n = [...poLines]; n[i].unit_cost = e.target.value; setPoLines(n); }}
                            className="w-full h-8 px-2 rounded-lg border border-border bg-background text-foreground text-[12px] font-mono" />
                        </td>
                        <td className="py-2 text-right font-mono font-bold text-foreground">
                          ฿{(Number(line.qty || 0) * Number(line.unit_cost || 0)).toLocaleString()}
                        </td>
                        <td className="py-2 text-center">
                          <button onClick={() => setPoLines(poLines.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-danger text-sm">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center justify-between">
                  <button onClick={() => setPoLines([...poLines, { stock_item_id: "", qty: "", unit_cost: "" }])}
                    className="text-[12px] text-primary font-semibold hover:underline">+ เพิ่มรายการ</button>
                  <div className="text-[14px] font-bold text-foreground">
                    รวม: <span className="font-mono text-accent">
                      ฿{poLines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.unit_cost || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowPoForm(false)}>ยกเลิก</Button>
                  <Button size="sm" onClick={createPO}>💾 บันทึก Draft</Button>
                </div>
              </div>
            )}

            {/* PO List */}
            <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
              {poLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-muted-foreground font-semibold border-b border-border text-left bg-muted/20">
                        <th className="py-3 px-5 font-semibold">เลขที่</th>
                        <th className="py-3 px-4 font-semibold">ผู้จำหน่าย</th>
                        <th className="py-3 px-4 font-semibold text-right">ยอดรวม</th>
                        <th className="py-3 px-4 font-semibold">สถานะ</th>
                        <th className="py-3 px-4 font-semibold">วันที่</th>
                        <th className="py-3 px-4 font-semibold text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredPOs.map(po => (
                        <tr key={po.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-5 font-mono font-bold text-foreground">{po.po_number}</td>
                          <td className="py-3 px-4 text-foreground">{po.supplier || "—"}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-accent">฿{Number(po.total_amount).toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <POSBadge color={
                              po.status === "received" ? "success" : po.status === "ordered" ? "warning" :
                              po.status === "cancelled" ? "danger" : "muted"
                            }>
                              {po.status === "draft" ? "⚪ แบบร่าง" : po.status === "ordered" ? "🔵 สั่งแล้ว" :
                               po.status === "received" ? "🟢 รับแล้ว" : "🔴 ยกเลิก"}
                            </POSBadge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-[12px]">
                            {new Date(po.created_at).toLocaleDateString("th-TH", { day: "2-digit", month: "short" })}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {po.status === "draft" && (
                                <Button size="sm" variant="outline" onClick={() => updatePoStatus(po.id, "ordered")}>
                                  📦 สั่งซื้อ
                                </Button>
                              )}
                              {po.status === "ordered" && (
                                <Button size="sm" onClick={() => updatePoStatus(po.id, "received")}>
                                  ✅ รับของ
                                </Button>
                              )}
                              {(po.status === "draft" || po.status === "ordered") && (
                                <Button size="sm" variant="ghost" onClick={() => updatePoStatus(po.id, "cancelled")}>✕</Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredPOs.length === 0 && (
                        <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">ไม่พบใบสั่งซื้อ</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ TAB: Suppliers ═══ */}
        {tab === "suppliers" && (
          <>
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-bold text-foreground">🏪 ผู้ค้า/ผู้จำหน่าย</div>
              <Button size="sm" onClick={openSuppAdd}>
                <Plus size={14} className="mr-1" /> เพิ่มผู้ค้า
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {suppLoading ? (
                <div className="col-span-full flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : suppliers.map(s => {
                const itemCount = stocks.filter(si => si.supplier === s.name).length;
                return (
                  <div key={s.id} className="bg-card border border-border rounded-2xl p-4 space-y-2 hover:shadow-card transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[14px] font-bold text-foreground">{s.name}</div>
                        {s.contact_name && <div className="text-[12px] text-muted-foreground">{s.contact_name}</div>}
                      </div>
                      <button onClick={() => openSuppEdit(s)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
                        <Pencil size={13} />
                      </button>
                    </div>
                    <div className="space-y-1 text-[12px] text-muted-foreground">
                      {s.phone && <div>📞 {s.phone}</div>}
                      {s.email && <div>📧 {s.email}</div>}
                      {s.line_id && <div>💬 LINE: {s.line_id}</div>}
                      {s.note && <div className="text-[11px] italic">{s.note}</div>}
                    </div>
                    <div className="pt-1 border-t border-border/50">
                      <span className="text-[11px] text-muted-foreground">วัตถุดิบที่จัดส่ง: </span>
                      <span className="text-[11px] font-bold text-foreground">{itemCount} รายการ</span>
                    </div>
                  </div>
                );
              })}
              {!suppLoading && suppliers.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-8">ยังไม่มีข้อมูลผู้ค้า</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Adjust Stock Modal */}
      <Dialog open={!!adjustModal} onOpenChange={() => { setAdjustModal(null); setAdjustQty(""); setAdjustNote(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{adjustModal?.mode === "add" ? "➕ เติมสต๊อก" : "➖ ตัดสต๊อก"} — {adjustModal?.item.name}</DialogTitle>
            <DialogDescription>คงเหลือ: {adjustModal?.item.qty} {adjustModal?.item.unit}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)}
              placeholder="จำนวน" autoFocus className="text-[14px] font-mono" />
            <Input value={adjustNote} onChange={e => setAdjustNote(e.target.value)}
              placeholder="หมายเหตุ (ถ้ามี)" className="text-[13px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModal(null)}>ยกเลิก</Button>
            <Button onClick={handleAdjustStock} disabled={!adjustQty || Number(adjustQty) <= 0}>
              {adjustModal?.mode === "add" ? "เติม" : "ตัด"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Modal */}
      <Dialog open={showAddModal || !!editModal} onOpenChange={() => { setShowAddModal(false); setEditModal(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editModal ? "✏️ แก้ไขวัตถุดิบ" : "➕ เพิ่มวัตถุดิบใหม่"}</DialogTitle>
            <DialogDescription>กรอกข้อมูลวัตถุดิบ</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ชื่อ</label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="ชื่อวัตถุดิบ" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">หน่วย</label>
              <Input value={formUnit} onChange={e => setFormUnit(e.target.value)} placeholder="กก., ลิตร, ขวด" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">หมวดหมู่</label>
              <select value={formCategory} onChange={e => setFormCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground text-[13px]">
                <option value="">ไม่ระบุ</option>
                {CATEGORIES.filter(c => c !== "ทั้งหมด").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {!editModal && (
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">จำนวนเริ่มต้น</label>
                <Input type="number" value={formQty} onChange={e => setFormQty(e.target.value)} placeholder="0" />
              </div>
            )}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">จุดสั่งซื้อ (ขั้นต่ำ)</label>
              <Input type="number" value={formMin} onChange={e => setFormMin(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ต้นทุน/หน่วย (฿)</label>
              <Input type="number" value={formCost} onChange={e => setFormCost(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ผู้จำหน่าย</label>
              <select value={formSupplier} onChange={e => setFormSupplier(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground text-[13px]">
                <option value="">ไม่ระบุ</option>
                {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddModal(false); setEditModal(null); }}>ยกเลิก</Button>
            <Button onClick={handleSaveItem} disabled={!formName || !formUnit}>💾 บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Modal */}
      <Dialog open={showSuppModal} onOpenChange={() => setShowSuppModal(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editSupp ? "✏️ แก้ไขผู้ค้า" : "➕ เพิ่มผู้ค้าใหม่"}</DialogTitle>
            <DialogDescription>กรอกข้อมูลผู้ค้า</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ชื่อบริษัท/ร้าน</label>
              <Input value={suppForm.name} onChange={e => setSuppForm({ ...suppForm, name: e.target.value })} placeholder="ชื่อ" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ผู้ติดต่อ</label>
              <Input value={suppForm.contact_name} onChange={e => setSuppForm({ ...suppForm, contact_name: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">โทรศัพท์</label>
              <Input value={suppForm.phone} onChange={e => setSuppForm({ ...suppForm, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Email</label>
              <Input value={suppForm.email} onChange={e => setSuppForm({ ...suppForm, email: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">LINE ID</label>
              <Input value={suppForm.line_id} onChange={e => setSuppForm({ ...suppForm, line_id: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">หมายเหตุ</label>
              <Input value={suppForm.note} onChange={e => setSuppForm({ ...suppForm, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuppModal(false)}>ยกเลิก</Button>
            <Button onClick={saveSupplier} disabled={!suppForm.name}>💾 บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
