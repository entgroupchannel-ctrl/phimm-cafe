import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Brain, RefreshCw, ChevronDown, ChevronUp, TrendingDown, ShoppingCart, AlertTriangle, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line, CartesianGrid } from "recharts";

// ── Types ──────────────────────────────────────────────────
interface StockItem {
  id: string; name: string; unit: string; qty: number;
  min_threshold: number; cost_per_unit: number;
  lead_time_days: number; category: string | null;
}

interface ForecastData {
  stock_item_id: string; current_qty: number; avg_daily_usage: number;
  forecast_total: number; days_until_empty: number; reorder_point: number;
  should_order_now: boolean; suggested_order_qty: number;
  daily_forecast: { date: string; dow: number; predicted_usage: number }[];
}

interface WasteData {
  stock_item_id: string; purchases: number; expected_usage: number;
  actual_usage: number; waste_or_loss: number; waste_pct: number;
  current_qty: number;
}

interface InsightRow {
  id: string; insight_type: string; stock_item_id: string;
  data: any; severity: string; is_acknowledged: boolean;
  acknowledged_by: string | null; created_at: string;
  stock_items?: { name: string } | null;
}

// ── Helpers ────────────────────────────────────────────────
const DOW_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function urgencyBadge(days: number) {
  if (days <= 1) return { text: "หมดวันนี้!", color: "bg-red-500/15 text-red-400 border-red-500/30" };
  if (days <= 3) return { text: `${days} วัน`, color: "bg-orange-500/15 text-orange-400 border-orange-500/30" };
  if (days <= 7) return { text: `${days} วัน`, color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  return { text: `${days} วัน`, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
}

function wasteBadge(pct: number) {
  if (pct <= 2) return { text: "ปกติ", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
  if (pct <= 5) return { text: "พอรับได้", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  if (pct <= 10) return { text: "สูง — ตรวจสอบ", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" };
  return { text: "ผิดปกติ!", color: "bg-red-500/15 text-red-400 border-red-500/30" };
}

const INSIGHT_BADGES: Record<string, { label: string; cls: string }> = {
  demand_forecast: { label: "📈 Forecast", cls: "bg-teal-500/15 text-teal-400 border-teal-500/30" },
  waste_detection: { label: "🗑️ Waste", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  smart_reorder: { label: "🛒 Reorder", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  fraud_alert: { label: "🔍 Fraud", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  summary: { label: "📊 Summary", cls: "bg-muted text-muted-foreground border-border" },
};

const SEVERITY_BADGE: Record<string, string> = {
  info: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
};

// ── Main Component ─────────────────────────────────────────
export function StockAIScreen() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [forecasts, setForecasts] = useState<Record<string, ForecastData>>({});
  const [wasteData, setWasteData] = useState<Record<string, WasteData>>({});
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [wastePeriod, setWastePeriod] = useState(7);
  const [expandedForecast, setExpandedForecast] = useState<string | null>(null);
  const [expandedWaste, setExpandedWaste] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadWaste(); }, [wastePeriod]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadStockItems(), loadInsights()]);
    setLoading(false);
  }

  async function loadStockItems() {
    const { data } = await supabase.from("stock_items").select("*").eq("is_active", true).order("name");
    if (data) {
      setStockItems(data as any);
      await Promise.all([loadForecasts(data as any), loadWasteForItems(data as any)]);
    }
  }

  async function loadForecasts(items: StockItem[]) {
    const results: Record<string, ForecastData> = {};
    await Promise.all(items.map(async (item) => {
      const { data } = await supabase.rpc("forecast_stock_demand", {
        p_stock_item_id: item.id, p_days: 7
      });
      if (data) results[item.id] = data as any;
    }));
    setForecasts(results);
  }

  async function loadWasteForItems(items: StockItem[]) {
    const results: Record<string, WasteData> = {};
    const from = new Date(); from.setDate(from.getDate() - wastePeriod);
    await Promise.all(items.map(async (item) => {
      const { data } = await supabase.rpc("calc_expected_stock", {
        p_stock_item_id: item.id,
        p_from: from.toISOString().split("T")[0],
        p_to: new Date().toISOString().split("T")[0],
      });
      if (data) results[item.id] = data as any;
    }));
    setWasteData(results);
  }

  async function loadWaste() {
    if (stockItems.length > 0) await loadWasteForItems(stockItems);
  }

  async function loadInsights() {
    const { data } = await supabase
      .from("ai_stock_insights")
      .select("*, stock_items(name)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setInsights(data as any);
      if (data.length > 0) setLastAnalyzed(data[0].created_at);
    }
  }

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.rpc("run_stock_ai_analysis");
      if (error) throw error;
      const result = data as any;
      toast.success(`วิเคราะห์เสร็จ — พบ ${result?.alerts_created || 0} alerts`);
      await loadAll();
    } catch (err: any) {
      toast.error("วิเคราะห์ล้มเหลว: " + (err.message || "Unknown error"));
    }
    setAnalyzing(false);
  }

  async function acknowledgeInsight(id: string) {
    await supabase.from("ai_stock_insights").update({
      is_acknowledged: true, acknowledged_at: new Date().toISOString()
    }).eq("id", id);
    setInsights(prev => prev.map(i => i.id === id ? { ...i, is_acknowledged: true } : i));
  }

  // ── Computed ──
  const forecastItems = stockItems.map(si => ({
    ...si, forecast: forecasts[si.id]
  })).sort((a, b) => (a.forecast?.days_until_empty ?? 999) - (b.forecast?.days_until_empty ?? 999));

  const wasteItems = stockItems.map(si => ({
    ...si, waste: wasteData[si.id]
  })).filter(i => i.waste).sort((a, b) => (b.waste?.waste_pct ?? 0) - (a.waste?.waste_pct ?? 0));

  const reorderItems = forecastItems.filter(i => i.forecast?.should_order_now);

  const lowCount = forecastItems.filter(i => (i.forecast?.days_until_empty ?? 999) <= 3).length;
  const soonCount = forecastItems.filter(i => {
    const d = i.forecast?.days_until_empty ?? 999;
    return d > 3 && d <= 7;
  }).length;
  const okCount = forecastItems.filter(i => (i.forecast?.days_until_empty ?? 999) > 7).length;

  const wasteHighCount = wasteItems.filter(i => (i.waste?.waste_pct ?? 0) > 5).length;
  const wasteCritCount = wasteItems.filter(i => (i.waste?.waste_pct ?? 0) > 10).length;
  const totalWasteValue = wasteItems.reduce((s, i) => {
    const diff = Math.max(0, (i.waste?.waste_or_loss ?? 0));
    return s + diff * (i.cost_per_unit || 0);
  }, 0);

  // Fraud checks
  const fraudFlags: { type: string; icon: string; title: string; items: any[] }[] = [];

  // Check 1: Stock shrinkage > 10%
  const shrinkageItems = wasteItems.filter(i => (i.waste?.waste_pct ?? 0) > 10);
  if (shrinkageItems.length > 0) {
    fraudFlags.push({
      type: "shrinkage", icon: "📉", title: "ส่วนต่างสต๊อกสูง (Shrinkage)",
      items: shrinkageItems.map(i => ({
        name: i.name, detail: `ส่วนต่าง ${i.waste?.waste_pct?.toFixed(1)}%`,
        severity: (i.waste?.waste_pct ?? 0) > 15 ? "critical" : "warning"
      }))
    });
  }

  // Check 3: Portion variance
  const portionIssues = wasteItems.filter(i => {
    const w = i.waste;
    return w && w.waste_pct > 5 && w.actual_usage > w.expected_usage;
  });
  if (portionIssues.length > 0) {
    fraudFlags.push({
      type: "portion", icon: "📏", title: "ตักเกินสูตร (Portion Variance)",
      items: portionIssues.map(i => ({
        name: i.name,
        detail: `ใช้จริง ${i.waste?.actual_usage?.toFixed(1)} vs คาด ${i.waste?.expected_usage?.toFixed(1)} (${i.waste?.waste_pct?.toFixed(1)}%)`,
        severity: "warning"
      }))
    });
  }

  // Check 4: Purchase anomaly
  const purchaseAnomalies = reorderItems.filter(i => {
    const suggested = i.forecast?.suggested_order_qty ?? 0;
    return suggested > 0 && i.qty > suggested * 1.5;
  });
  if (purchaseAnomalies.length > 0) {
    fraudFlags.push({
      type: "purchase", icon: "🛒", title: "สั่งซื้อเกินความต้องการ",
      items: purchaseAnomalies.map(i => ({
        name: i.name,
        detail: `มีอยู่ ${i.qty} แต่แนะนำสั่ง ${i.forecast?.suggested_order_qty}`,
        severity: "warning"
      }))
    });
  }

  const totalFlags = fraudFlags.reduce((s, f) => s + f.items.length, 0);
  const riskLevel = totalFlags === 0 ? "safe" : totalFlags <= 5 ? "caution" : "danger";

  // ── Render ──
  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide bg-background p-4 md:p-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" /> AI Stock Intelligence
          </h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            วิเคราะห์สต๊อก — Forecast, Waste, Reorder, Fraud
            {lastAnalyzed && (
              <span className="ml-2 text-muted-foreground/60">
                · วิเคราะห์ล่าสุด: {new Date(lastAnalyzed).toLocaleString("th-TH")}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all select-none min-h-[44px]",
            "bg-primary text-white shadow-[0_2px_10px_hsl(var(--primary)/0.3)] hover:opacity-90 disabled:opacity-50"
          )}
        >
          <RefreshCw className={cn("w-4 h-4", analyzing && "animate-spin")} />
          {analyzing ? "กำลังวิเคราะห์..." : "🔄 Run Analysis"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-[13px]">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> กำลังโหลดข้อมูล...
        </div>
      ) : (
        <>
          {/* ── MODULE 1: Demand Forecast ── */}
          <ModuleCard title="📈 Demand Forecast — พยากรณ์ความต้องการ" borderColor="border-l-teal-500">
            <div className="flex flex-wrap gap-2 mb-4">
              <StatPill label="ใกล้หมด ≤3 วัน" count={lowCount} color="bg-red-500/15 text-red-400" />
              <StatPill label="ต้องสั่งเร็วๆ ≤7 วัน" count={soonCount} color="bg-amber-500/15 text-amber-400" />
              <StatPill label="ปลอดภัย >7 วัน" count={okCount} color="bg-emerald-500/15 text-emerald-400" />
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_60px_70px_70px_80px_100px] gap-0 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 px-3 py-2.5 border-b border-border">
                <span>วัตถุดิบ</span><span>หน่วย</span><span className="text-right">คงเหลือ</span>
                <span className="text-right">เฉลี่ย/วัน</span><span className="text-right">เหลือ</span><span className="text-center">สถานะ</span>
              </div>
              {forecastItems.map(item => {
                const f = item.forecast;
                const days = f?.days_until_empty ?? 999;
                const badge = urgencyBadge(days);
                const expanded = expandedForecast === item.id;
                return (
                  <div key={item.id}>
                    <button
                      onClick={() => setExpandedForecast(expanded ? null : item.id)}
                      className={cn(
                        "w-full grid grid-cols-[1fr_60px_70px_70px_80px_100px] gap-0 px-3 py-2.5 text-[12px] border-b border-border/50 transition-colors text-left min-h-[44px] items-center",
                        days <= 1 && "bg-red-500/5",
                        !expanded && "hover:bg-muted/30"
                      )}
                    >
                      <span className="font-semibold text-foreground truncate">{item.name}</span>
                      <span className="text-muted-foreground">{item.unit}</span>
                      <span className="text-right font-mono tabular-nums text-foreground">{item.qty}</span>
                      <span className="text-right font-mono tabular-nums text-muted-foreground">{f?.avg_daily_usage?.toFixed(1) ?? "—"}</span>
                      <span className="text-right font-mono tabular-nums">{days >= 999 ? "∞" : days}</span>
                      <span className="flex justify-center">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", badge.color)}>{badge.text}</span>
                      </span>
                    </button>
                    {expanded && f && <ForecastDetail forecast={f} item={item} />}
                  </div>
                );
              })}
            </div>
          </ModuleCard>

          {/* ── MODULE 2: Waste Detection ── */}
          <ModuleCard title="🗑️ Waste Detection — ตรวจจับของเสีย" borderColor="border-l-amber-500">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <StatPill label="Waste > 5%" count={wasteHighCount} color="bg-amber-500/15 text-amber-400" />
              <StatPill label="Waste > 10%" count={wasteCritCount} color="bg-red-500/15 text-red-400" />
              <StatPill label={`มูลค่าเสียหาย ฿${Math.round(totalWasteValue).toLocaleString()}`} count={null} color="bg-muted text-muted-foreground" />
              <div className="ml-auto flex gap-1">
                {[7, 14, 30].map(d => (
                  <button key={d} onClick={() => setWastePeriod(d)}
                    className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all min-h-[32px]",
                      wastePeriod === d ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground")}>
                    {d} วัน
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_80px_60px_70px_80px_90px] gap-0 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 px-3 py-2.5 border-b border-border">
                <span>วัตถุดิบ</span><span className="text-right">คาดว่าใช้</span><span className="text-right">ใช้จริง</span>
                <span className="text-right">ส่วนต่าง</span><span className="text-right">Waste %</span><span className="text-right">มูลค่า</span><span className="text-center">สถานะ</span>
              </div>
              {wasteItems.map(item => {
                const w = item.waste!;
                const badge = wasteBadge(w.waste_pct);
                const valueLost = Math.max(0, w.waste_or_loss) * (item.cost_per_unit || 0);
                const expanded = expandedWaste === item.id;
                return (
                  <div key={item.id}>
                    <button
                      onClick={() => setExpandedWaste(expanded ? null : item.id)}
                      className={cn(
                        "w-full grid grid-cols-[1fr_80px_80px_60px_70px_80px_90px] gap-0 px-3 py-2.5 text-[12px] border-b border-border/50 transition-colors text-left min-h-[44px] items-center",
                        w.waste_pct > 10 && "bg-red-500/5",
                        !expanded && "hover:bg-muted/30"
                      )}
                    >
                      <span className="font-semibold text-foreground truncate">{item.name}</span>
                      <span className="text-right font-mono tabular-nums text-muted-foreground">{w.expected_usage?.toFixed(1)}</span>
                      <span className="text-right font-mono tabular-nums text-foreground">{w.actual_usage?.toFixed(1)}</span>
                      <span className="text-right font-mono tabular-nums text-foreground">{w.waste_or_loss?.toFixed(1)}</span>
                      <span className="text-right font-mono tabular-nums">{w.waste_pct?.toFixed(1)}%</span>
                      <span className="text-right font-mono tabular-nums text-muted-foreground">฿{Math.round(valueLost).toLocaleString()}</span>
                      <span className="flex justify-center">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", badge.color)}>{badge.text}</span>
                      </span>
                    </button>
                    {expanded && <WasteDetail waste={w} item={item} />}
                  </div>
                );
              })}
              {wasteItems.length === 0 && (
                <div className="p-6 text-center text-muted-foreground text-[13px]">ไม่มีข้อมูลในช่วงนี้</div>
              )}
            </div>
          </ModuleCard>

          {/* ── MODULE 3: Smart Reorder ── */}
          <ModuleCard title="🛒 Smart Reorder — สั่งซื้ออัจฉริยะ" borderColor="border-l-blue-500">
            {reorderItems.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-[13px]">✅ ไม่มีรายการที่ต้องสั่งซื้อตอนนี้</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {reorderItems.map(item => {
                    const f = item.forecast!;
                    const days = f.days_until_empty;
                    const lead = item.lead_time_days || 2;
                    const urgency = days <= lead ? "critical" : days <= lead + 2 ? "warning" : "info";
                    const urgLabel = urgency === "critical" ? "🔴 สั่งทันที!" : urgency === "warning" ? "🟠 สั่งเร็วๆ นี้" : "🟡 วางแผนสั่ง";
                    const estCost = (f.suggested_order_qty || 0) * (item.cost_per_unit || 0);
                    return (
                      <div key={item.id} className={cn(
                        "p-4 rounded-xl border transition-all",
                        urgency === "critical" ? "border-red-500/40 bg-red-500/5" :
                        urgency === "warning" ? "border-amber-500/30 bg-amber-500/5" :
                        "border-border bg-[hsl(var(--surface))]"
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-[13px] text-foreground">{item.name}</span>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border",
                            urgencyBadge(days).color)}>
                            หมดใน {days >= 999 ? "∞" : days} วัน
                          </span>
                        </div>
                        <div className="text-[12px] text-muted-foreground mb-1">
                          คงเหลือ: <span className="font-mono font-bold text-foreground">{item.qty} {item.unit}</span>
                        </div>
                        <div className="text-[12px] font-bold text-primary">
                          สั่ง {f.suggested_order_qty} {item.unit}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          ราคาประมาณ ฿{Math.round(estCost).toLocaleString()} · Lead time {lead} วัน
                        </div>
                        <div className="text-[11px] font-bold mt-2">{urgLabel}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                  <span className="text-[12px] text-muted-foreground">
                    ค่าใช้จ่ายสั่งซื้อรวมประมาณ{" "}
                    <span className="font-bold text-foreground">
                      ฿{Math.round(reorderItems.reduce((s, i) => s + (i.forecast?.suggested_order_qty || 0) * (i.cost_per_unit || 0), 0)).toLocaleString()}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">{reorderItems.length} รายการ</span>
                </div>
              </>
            )}
          </ModuleCard>

          {/* ── MODULE 4: Fraud Detection ── */}
          <ModuleCard title="🔍 Fraud Detection — ตรวจจับทุจริต" borderColor="border-l-red-500">
            <div className="flex items-center gap-3 mb-4">
              <span className={cn("text-[12px] font-bold px-3 py-1.5 rounded-lg border",
                riskLevel === "safe" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                riskLevel === "caution" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                "bg-red-500/15 text-red-400 border-red-500/30"
              )}>
                {riskLevel === "safe" ? "🟢 ปกติ — ไม่มีสิ่งผิดปกติ" :
                 riskLevel === "caution" ? `🟡 ควรตรวจสอบ (${totalFlags} flags)` :
                 `🔴 ต้องตรวจสอบด่วน (${totalFlags} flags)`}
              </span>
            </div>

            {fraudFlags.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-[13px]">✅ ไม่พบสิ่งผิดปกติ</div>
            ) : (
              <div className="space-y-3">
                {fraudFlags.map(flag => (
                  <div key={flag.type} className="rounded-xl border border-border p-4 bg-[hsl(var(--surface))]">
                    <div className="text-[13px] font-bold text-foreground mb-2">{flag.icon} {flag.title}</div>
                    <div className="space-y-1.5">
                      {flag.items.map((fi, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[12px] px-2 py-1.5 rounded-lg bg-muted/30">
                          <span className="text-foreground font-medium">{fi.name}</span>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border",
                            fi.severity === "critical" ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          )}>{fi.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ModuleCard>

          {/* ── Alert History ── */}
          <div className="rounded-2xl border border-border bg-[hsl(var(--surface))]">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between p-4 text-left min-h-[44px]"
            >
              <span className="text-[13px] font-bold text-foreground">📜 ประวัติ AI Insights ({insights.length})</span>
              {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showHistory && (
              <div className="border-t border-border overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                      <th className="text-left px-3 py-2">วันที่</th>
                      <th className="text-left px-3 py-2">ประเภท</th>
                      <th className="text-left px-3 py-2">รายการ</th>
                      <th className="text-center px-3 py-2">ความรุนแรง</th>
                      <th className="text-center px-3 py-2">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.map(ins => {
                      const badge = INSIGHT_BADGES[ins.insight_type] || INSIGHT_BADGES.summary;
                      return (
                        <tr key={ins.id} className="border-t border-border/40 hover:bg-muted/20">
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {new Date(ins.created_at).toLocaleDateString("th-TH")}
                          </td>
                          <td className="px-3 py-2">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", badge.cls)}>{badge.label}</span>
                          </td>
                          <td className="px-3 py-2 text-foreground">{(ins.stock_items as any)?.name || "—"}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", SEVERITY_BADGE[ins.severity] || SEVERITY_BADGE.info)}>
                              {ins.severity}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {ins.is_acknowledged ? (
                              <span className="text-[10px] text-emerald-400">✅</span>
                            ) : (
                              <button onClick={() => acknowledgeInsight(ins.id)}
                                className="text-[10px] font-bold px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors min-h-[28px]">
                                รับทราบ
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {insights.length === 0 && (
                      <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">ยังไม่มีข้อมูล — กด Run Analysis ก่อน</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function ModuleCard({ title, borderColor, children }: { title: string; borderColor: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-[hsl(var(--surface))] p-4 md:p-5 border-l-4", borderColor)}>
      <h2 className="text-[14px] font-bold text-foreground mb-4">{title}</h2>
      {children}
    </div>
  );
}

function StatPill({ label, count, color }: { label: string; count: number | null; color: string }) {
  return (
    <span className={cn("text-[11px] font-bold px-3 py-1.5 rounded-lg border border-transparent", color)}>
      {count !== null && <span className="mr-1">{count}</span>}{label}
    </span>
  );
}

function ForecastDetail({ forecast: f, item }: { forecast: ForecastData; item: StockItem }) {
  const chartData = f.daily_forecast?.map(d => ({
    date: new Date(d.date).toLocaleDateString("th-TH", { weekday: "short", day: "numeric" }),
    usage: d.predicted_usage,
  })) || [];

  return (
    <div className="px-4 py-4 bg-muted/20 border-b border-border space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">พยากรณ์ 7 วัน</p>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 11, background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="usage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <ReferenceLine y={f.current_qty} stroke="hsl(var(--danger))" strokeDasharray="4 4" label={{ value: `คงเหลือ ${f.current_qty}`, position: "right", fontSize: 10, fill: "hsl(var(--danger))" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">คำแนะนำ</p>
          <div className="space-y-2 text-[12px]">
            <div className="p-3 rounded-lg bg-[hsl(var(--surface))] border border-border">
              <span className="text-muted-foreground">ควรสั่ง:</span>{" "}
              <span className="font-bold text-primary">{f.suggested_order_qty} {item.unit}</span>{" "}
              <span className="text-muted-foreground">ภายใน {Math.max(0, Math.floor(f.days_until_empty - (item.lead_time_days || 2)))} วัน</span>
            </div>
            <div className="p-3 rounded-lg bg-[hsl(var(--surface))] border border-border">
              <span className="text-muted-foreground">ราคาประมาณ:</span>{" "}
              <span className="font-bold text-foreground">฿{Math.round(f.suggested_order_qty * (item.cost_per_unit || 0)).toLocaleString()}</span>
            </div>
            <div className="p-3 rounded-lg bg-[hsl(var(--surface))] border border-border">
              <span className="text-muted-foreground">Reorder Point:</span>{" "}
              <span className="font-mono text-foreground">{f.reorder_point} {item.unit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WasteDetail({ waste: w, item }: { waste: WasteData; item: StockItem }) {
  const causes = [];
  if (w.waste_pct > 0 && w.waste_pct <= 5) causes.push("📏 สูตรไม่ตรง — ตรวจสอบ stock_recipes");
  if (w.waste_pct > 5 && w.waste_pct <= 10) causes.push("🗑️ ของเสียจากการปรุง — อาจต้องปรับวิธี");
  if (w.waste_pct > 10) causes.push("⚠️ ส่วนต่างสูงผิดปกติ — อาจมีการรั่วไหล");

  return (
    <div className="px-4 py-4 bg-muted/20 border-b border-border space-y-3">
      <div className="grid grid-cols-3 gap-3 text-[12px]">
        <div className="p-3 rounded-lg bg-[hsl(var(--surface))] border border-border text-center">
          <div className="text-muted-foreground">คาดว่าใช้</div>
          <div className="font-mono font-bold text-foreground">{w.expected_usage?.toFixed(1)} {item.unit}</div>
        </div>
        <div className="p-3 rounded-lg bg-[hsl(var(--surface))] border border-border text-center">
          <div className="text-muted-foreground">ใช้จริง</div>
          <div className="font-mono font-bold text-foreground">{w.actual_usage?.toFixed(1)} {item.unit}</div>
        </div>
        <div className="p-3 rounded-lg bg-[hsl(var(--surface))] border border-border text-center">
          <div className="text-muted-foreground">มูลค่าเสียหาย</div>
          <div className="font-mono font-bold text-red-400">฿{Math.round(Math.max(0, w.waste_or_loss) * (item.cost_per_unit || 0)).toLocaleString()}</div>
        </div>
      </div>
      {causes.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">สาเหตุที่เป็นไปได้</p>
          <div className="space-y-1">
            {causes.map((c, i) => (
              <div key={i} className="text-[12px] text-foreground px-3 py-2 rounded-lg bg-[hsl(var(--surface))] border border-border">{c}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
