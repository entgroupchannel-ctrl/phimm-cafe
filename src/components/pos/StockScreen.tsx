import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { POSStatCard } from "./POSStatCard";
import { POSBadge } from "./POSBadge";
import { cn } from "@/lib/utils";

interface StockItem {
  id: string;
  name: string;
  unit: string;
  qty: number;
  min_threshold: number;
  cost_per_unit: number;
  supplier: string | null;
  status: "ok" | "low" | "critical";
}

interface PO {
  id: string;
  po_number: string;
  supplier: string | null;
  status: string;
  total_amount: number;
  note: string | null;
  created_at: string;
  ordered_at: string | null;
  received_at: string | null;
}

type Tab = "stock" | "po" | "history";

export function StockScreen() {
  const [tab, setTab] = useState<Tab>("stock");
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState("");

  // PO state
  const [pos, setPos] = useState<PO[]>([]);
  const [poLoading, setPoLoading] = useState(false);
  const [showPoForm, setShowPoForm] = useState(false);
  const [poLines, setPoLines] = useState<{ stock_item_id: string; qty: string; unit_cost: string }[]>([]);
  const [poSupplier, setPoSupplier] = useState("");
  const [poNote, setPoNote] = useState("");

  // Logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    fetchStock();
    const channel = supabase
      .channel("stock-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_items" }, () => fetchStock())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (tab === "po") fetchPOs();
    if (tab === "history") fetchLogs();
  }, [tab]);

  async function fetchStock() {
    const { data, error } = await supabase
      .from("stock_items").select("*").eq("is_active", true).order("name");
    if (!error && data) {
      setStocks(data.map(s => ({
        ...s,
        qty: Number(s.qty), min_threshold: Number(s.min_threshold), cost_per_unit: Number(s.cost_per_unit),
        status: Number(s.qty) <= 0 ? "critical" as const : Number(s.qty) <= Number(s.min_threshold) ? "low" as const : "ok" as const,
      })));
    }
    setLoading(false);
  }

  async function restockItem(stockId: string, addQty: number) {
    const item = stocks.find(s => s.id === stockId);
    if (!item || addQty <= 0) return;
    await supabase.from("stock_items").update({ qty: item.qty + addQty, updated_at: new Date().toISOString() }).eq("id", stockId);
    await supabase.from("stock_logs").insert({ stock_item_id: stockId, change_qty: addQty, reason: "restock" });
    fetchStock();
    setRestockingId(null);
    setRestockQty("");
  }

  async function fetchPOs() {
    setPoLoading(true);
    const { data } = await supabase.from("purchase_orders").select("*").order("created_at", { ascending: false });
    if (data) setPos(data as any);
    setPoLoading(false);
  }

  async function createPO() {
    const validLines = poLines.filter(l => l.stock_item_id && Number(l.qty) > 0 && Number(l.unit_cost) > 0);
    if (validLines.length === 0) return;

    const totalAmount = validLines.reduce((s, l) => s + Number(l.qty) * Number(l.unit_cost), 0);
    const { data: po, error } = await supabase.from("purchase_orders").insert({
      po_number: "temp",
      supplier: poSupplier || null,
      note: poNote || null,
      total_amount: totalAmount,
      status: "draft",
    }).select().single();

    if (error || !po) return;

    await supabase.from("purchase_order_items").insert(
      validLines.map(l => ({
        po_id: po.id,
        stock_item_id: l.stock_item_id,
        qty: Number(l.qty),
        unit_cost: Number(l.unit_cost),
      }))
    );

    setShowPoForm(false);
    setPoLines([]);
    setPoSupplier("");
    setPoNote("");
    fetchPOs();
  }

  async function updatePoStatus(poId: string, newStatus: string) {
    if (newStatus === "received") {
      await supabase.rpc("receive_purchase_order", { p_po_id: poId });
    } else {
      const update: Record<string, any> = { status: newStatus };
      if (newStatus === "ordered") update.ordered_at = new Date().toISOString();
      await supabase.from("purchase_orders").update(update).eq("id", poId);
    }
    fetchPOs();
    fetchStock();
  }

  async function fetchLogs() {
    setLogsLoading(true);
    const { data } = await supabase
      .from("stock_logs")
      .select("*, stock_items(name, unit)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setLogs(data);
    setLogsLoading(false);
  }

  function openAutoFillPO() {
    const lowItems = stocks.filter(s => s.status !== "ok");
    setPoLines(lowItems.map(s => ({
      stock_item_id: s.id,
      qty: String(Math.max(0, s.min_threshold * 2 - s.qty)),
      unit_cost: String(s.cost_per_unit),
    })));
    setShowPoForm(true);
  }

  const totalItems = stocks.length;
  const lowItems = stocks.filter(s => s.status === "low").length;
  const criticalItems = stocks.filter(s => s.status === "critical").length;
  const totalValue = Math.round(stocks.reduce((sum, s) => sum + s.qty * s.cost_per_unit, 0));

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "stock", label: "วัตถุดิบ", icon: "📦" },
    { key: "po", label: "ใบสั่งซื้อ", icon: "📝" },
    { key: "history", label: "ประวัติ", icon: "📊" },
  ];

  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide space-y-5 bg-background">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2.5 rounded-xl text-[13px] font-bold border transition-all",
              tab === t.key
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-border hover:text-foreground"
            )}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: Stock Items ═══ */}
      {tab === "stock" && (
        <>
          <div className="flex gap-4 flex-wrap">
            <POSStatCard icon="📦" label="วัตถุดิบทั้งหมด" value={String(totalItems)} sub="รายการ" color="primary" />
            <POSStatCard icon="⚠️" label="ใกล้หมด" value={String(lowItems)} sub="ต้องสั่งซื้อ" color="warning" />
            <POSStatCard icon="🚨" label="หมดแล้ว" value={String(criticalItems)} sub="วิกฤต!" color="danger" />
            <POSStatCard icon="💰" label="มูลค่าสต๊อก" value={`฿${totalValue.toLocaleString()}`} sub="รวม" color="accent" />
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="text-[15px] font-bold text-foreground">📦 สต๊อกวัตถุดิบ</div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="px-5 pb-3">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-muted-foreground font-semibold border-b border-border text-left">
                      <th className="py-3 pr-6 font-semibold">วัตถุดิบ</th>
                      <th className="py-3 pr-6 font-semibold">คงเหลือ</th>
                      <th className="py-3 pr-6 font-semibold">ขั้นต่ำ</th>
                      <th className="py-3 pr-6 font-semibold">ต้นทุน/หน่วย</th>
                      <th className="py-3 pr-6 font-semibold">สถานะ</th>
                      <th className="py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {stocks.map(s => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 pr-6 font-semibold text-foreground">
                          {s.name}
                          {s.supplier && <span className="text-[10px] text-muted-foreground ml-2">({s.supplier})</span>}
                        </td>
                        <td className={cn("py-3.5 pr-6 font-mono font-bold tabular-nums",
                          s.status === "critical" ? "text-danger" : s.status === "low" ? "text-warning" : "text-foreground"
                        )}>
                          {s.qty} {s.unit}
                        </td>
                        <td className="py-3.5 pr-6 text-muted-foreground">{s.min_threshold} {s.unit}</td>
                        <td className="py-3.5 pr-6 text-muted-foreground font-mono">฿{s.cost_per_unit}</td>
                        <td className="py-3.5 pr-6">
                          <POSBadge color={s.status === "critical" ? "danger" : s.status === "low" ? "warning" : "success"}>
                            {s.status === "critical" ? "🚨 หมด!" : s.status === "low" ? "⚠️ ใกล้หมด" : "✅ ปกติ"}
                          </POSBadge>
                        </td>
                        <td className="py-3.5">
                          {restockingId === s.id ? (
                            <div className="flex items-center gap-2">
                              <input type="number" value={restockQty} onChange={e => setRestockQty(e.target.value)} placeholder="จำนวน" autoFocus
                                className="w-20 h-8 px-2 rounded-lg border border-border bg-background text-foreground text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
                              <button onClick={() => restockItem(s.id, Number(restockQty))} disabled={!restockQty || Number(restockQty) <= 0}
                                className="px-3 py-1.5 rounded-lg bg-success text-white text-[11px] font-bold hover:opacity-90 disabled:opacity-40">✓</button>
                              <button onClick={() => { setRestockingId(null); setRestockQty(""); }}
                                className="px-2 py-1.5 rounded-lg border border-border text-muted-foreground text-[11px] hover:bg-muted">✕</button>
                            </div>
                          ) : s.status !== "ok" ? (
                            <button onClick={() => setRestockingId(s.id)}
                              className="px-3.5 py-1.5 rounded-lg gradient-primary text-white text-[12px] font-semibold shadow-primary hover:shadow-primary-lg transition-shadow">
                              📝 เติมสต๊อก
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    {stocks.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">ยังไม่มีข้อมูลสต๊อก</td></tr>
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-bold text-foreground">📝 ใบสั่งซื้อ (Purchase Orders)</div>
            <div className="flex gap-2">
              <button onClick={openAutoFillPO}
                className="px-4 py-2 rounded-xl border border-warning/40 bg-warning/10 text-warning text-[12px] font-bold hover:bg-warning/20 transition-colors">
                ⚡ สร้าง PO อัตโนมัติ
              </button>
              <button onClick={() => { setPoLines([{ stock_item_id: "", qty: "", unit_cost: "" }]); setShowPoForm(true); }}
                className="px-4 py-2 rounded-xl gradient-primary text-white text-[12px] font-bold shadow-primary">
                + สร้างใบสั่งซื้อ
              </button>
            </div>
          </div>

          {/* PO Form */}
          {showPoForm && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">ผู้จำหน่าย</label>
                  <input value={poSupplier} onChange={e => setPoSupplier(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="ชื่อผู้จำหน่าย" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">หมายเหตุ</label>
                  <input value={poNote} onChange={e => setPoNote(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-foreground text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="หมายเหตุ (ถ้ามี)" />
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
                          const newLines = [...poLines];
                          newLines[i].stock_item_id = e.target.value;
                          const item = stocks.find(s => s.id === e.target.value);
                          if (item) newLines[i].unit_cost = String(item.cost_per_unit);
                          setPoLines(newLines);
                        }}
                          className="w-full h-8 px-2 rounded-lg border border-border bg-background text-foreground text-[12px]">
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
                <button onClick={() => setShowPoForm(false)}
                  className="px-4 py-2 rounded-xl border border-border text-muted-foreground text-[12px] font-medium hover:text-foreground">
                  ยกเลิก
                </button>
                <button onClick={createPO}
                  className="px-4 py-2 rounded-xl gradient-primary text-white text-[12px] font-bold shadow-primary">
                  💾 บันทึก Draft
                </button>
              </div>
            </div>
          )}

          {/* PO List */}
          <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 pb-3">
              {poLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-muted-foreground font-semibold border-b border-border text-left">
                      <th className="py-3 pr-4 font-semibold">เลขที่</th>
                      <th className="py-3 pr-4 font-semibold">ผู้จำหน่าย</th>
                      <th className="py-3 pr-4 font-semibold">ยอดรวม</th>
                      <th className="py-3 pr-4 font-semibold">สถานะ</th>
                      <th className="py-3 pr-4 font-semibold">วันที่</th>
                      <th className="py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {pos.map(po => (
                      <tr key={po.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4 font-mono font-bold text-foreground">{po.po_number}</td>
                        <td className="py-3 pr-4 text-foreground">{po.supplier || "—"}</td>
                        <td className="py-3 pr-4 font-mono font-bold text-accent">฿{Number(po.total_amount).toLocaleString()}</td>
                        <td className="py-3 pr-4">
                          <POSBadge color={
                            po.status === "received" ? "success" : po.status === "ordered" ? "warning" :
                            po.status === "cancelled" ? "danger" : "muted"
                          }>
                            {po.status === "draft" ? "📋 Draft" : po.status === "ordered" ? "📦 สั่งแล้ว" :
                             po.status === "received" ? "✅ รับแล้ว" : "❌ ยกเลิก"}
                          </POSBadge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground text-[12px]">
                          {new Date(po.created_at).toLocaleDateString("th-TH", { day: "2-digit", month: "short" })}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1.5">
                            {po.status === "draft" && (
                              <button onClick={() => updatePoStatus(po.id, "ordered")}
                                className="px-3 py-1 rounded-lg bg-warning/10 text-warning text-[11px] font-bold border border-warning/30 hover:bg-warning/20">
                                📦 สั่งซื้อ
                              </button>
                            )}
                            {po.status === "ordered" && (
                              <button onClick={() => updatePoStatus(po.id, "received")}
                                className="px-3 py-1 rounded-lg bg-success/10 text-success text-[11px] font-bold border border-success/30 hover:bg-success/20">
                                ✅ รับของ
                              </button>
                            )}
                            {(po.status === "draft" || po.status === "ordered") && (
                              <button onClick={() => updatePoStatus(po.id, "cancelled")}
                                className="px-2 py-1 rounded-lg border border-border text-muted-foreground text-[11px] hover:text-danger hover:border-danger/30">
                                ✕
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pos.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">ยังไม่มีใบสั่งซื้อ</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: History ═══ */}
      {tab === "history" && (
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="text-[15px] font-bold text-foreground">📊 ประวัติการเคลื่อนไหว</div>
          </div>
          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="px-5 pb-3">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-muted-foreground font-semibold border-b border-border text-left">
                    <th className="py-3 pr-6 font-semibold">เวลา</th>
                    <th className="py-3 pr-6 font-semibold">วัตถุดิบ</th>
                    <th className="py-3 pr-6 font-semibold">เปลี่ยนแปลง</th>
                    <th className="py-3 font-semibold">เหตุผล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-6 text-muted-foreground text-[12px]">
                        {new Date(log.created_at).toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                      </td>
                      <td className="py-3 pr-6 font-semibold text-foreground">
                        {(log.stock_items as any)?.name || "—"}
                      </td>
                      <td className={cn("py-3 pr-6 font-mono font-bold tabular-nums",
                        Number(log.change_qty) > 0 ? "text-success" : "text-danger"
                      )}>
                        {Number(log.change_qty) > 0 ? "+" : ""}{log.change_qty} {(log.stock_items as any)?.unit || ""}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {log.reason === "restock" ? "📦 เติมสต๊อก" : log.reason === "order" ? "🍳 ตัดจากออเดอร์" : log.reason}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">ยังไม่มีประวัติ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
