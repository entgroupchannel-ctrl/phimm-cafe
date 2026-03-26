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

export function StockScreen() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    fetchStock();

    const channel = supabase
      .channel("stock-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_items" }, () => fetchStock())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchStock() {
    const { data, error } = await supabase
      .from("stock_items")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (!error && data) {
      setStocks(data.map(s => ({
        ...s,
        qty: Number(s.qty),
        min_threshold: Number(s.min_threshold),
        cost_per_unit: Number(s.cost_per_unit),
        status: Number(s.qty) <= 0 ? "critical" as const
              : Number(s.qty) <= Number(s.min_threshold) ? "low" as const
              : "ok" as const,
      })));
    }
    setLoading(false);
  }

  async function restockItem(stockId: string, addQty: number) {
    const item = stocks.find(s => s.id === stockId);
    if (!item || addQty <= 0) return;

    const { error } = await supabase
      .from("stock_items")
      .update({ qty: item.qty + addQty, updated_at: new Date().toISOString() })
      .eq("id", stockId);

    if (!error) {
      await supabase.from("stock_logs").insert({
        stock_item_id: stockId,
        change_qty: addQty,
        reason: "restock",
      });
      fetchStock();
    }
    setRestockingId(null);
    setRestockQty("");
  }

  async function fetchLogs() {
    const { data } = await supabase
      .from("stock_logs")
      .select("*, stock_items(name)")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setLogs(data);
  }

  const totalItems = stocks.length;
  const lowItems = stocks.filter(s => s.status === "low").length;
  const criticalItems = stocks.filter(s => s.status === "critical").length;
  const totalValue = Math.round(stocks.reduce((sum, s) => sum + s.qty * s.cost_per_unit, 0));

  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide space-y-5 bg-background">
      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        <POSStatCard icon="📦" label="วัตถุดิบทั้งหมด" value={String(totalItems)} sub="รายการ" color="primary" />
        <POSStatCard icon="⚠️" label="ใกล้หมด" value={String(lowItems)} sub="รายการ ต้องสั่งซื้อ" color="warning" />
        <POSStatCard icon="🚨" label="หมดแล้ว" value={String(criticalItems)} sub="รายการ วิกฤต!" color="danger" />
        <POSStatCard icon="💰" label="มูลค่าสต๊อก" value={`฿${totalValue.toLocaleString()}`} sub="รวมทั้งหมด" color="accent" />
      </div>

      {/* Stock table */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="text-[15px] font-bold text-foreground">📦 สต๊อกวัตถุดิบ</div>
          <button
            onClick={() => { setShowLogs(!showLogs); if (!showLogs) fetchLogs(); }}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[12px] font-bold border transition-all",
              showLogs ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-border"
            )}
          >
            📜 ประวัติ
          </button>
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
                    <td className={cn(
                      "py-3.5 pr-6 font-mono font-bold tabular-nums",
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
                          <input
                            type="number"
                            value={restockQty}
                            onChange={e => setRestockQty(e.target.value)}
                            placeholder="จำนวน"
                            className="w-20 h-8 px-2 rounded-lg border border-border bg-background text-foreground text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                            autoFocus
                          />
                          <button
                            onClick={() => restockItem(s.id, Number(restockQty))}
                            disabled={!restockQty || Number(restockQty) <= 0}
                            className="px-3 py-1.5 rounded-lg bg-success text-white text-[11px] font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => { setRestockingId(null); setRestockQty(""); }}
                            className="px-2 py-1.5 rounded-lg border border-border text-muted-foreground text-[11px] hover:bg-muted transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ) : s.status !== "ok" ? (
                        <button
                          onClick={() => setRestockingId(s.id)}
                          className="px-3.5 py-1.5 rounded-lg gradient-primary text-white text-[12px] font-semibold shadow-primary hover:shadow-primary-lg transition-shadow"
                        >
                          📝 เติมสต๊อก
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {stocks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">ยังไม่มีข้อมูลสต๊อก</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock logs */}
      {showLogs && (
        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="text-[15px] font-bold text-foreground">📜 ประวัติการเคลื่อนไหว</div>
          </div>
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
                    <td className={cn(
                      "py-3 pr-6 font-mono font-bold tabular-nums",
                      Number(log.change_qty) > 0 ? "text-success" : "text-danger"
                    )}>
                      {Number(log.change_qty) > 0 ? "+" : ""}{log.change_qty}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {log.reason === "restock" ? "📦 เติมสต๊อก" : log.reason === "order" ? "🍳 ตัดจากออเดอร์" : log.reason}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">ยังไม่มีประวัติ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
