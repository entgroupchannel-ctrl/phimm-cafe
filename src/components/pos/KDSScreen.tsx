import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ── Types ─────────────────────────────────────────────────
interface KDSItem {
  id: string;
  name: string;
  qty: number;
  station: string | null;
  stationId: string | null;
  note: string | null;
  status: string;
  optionsText: string | null;
  cookingStartedAt: string | null;
  cookingSeconds: number | null;
}

interface KDSOrder {
  orderId: string;
  orderNumber: string;
  table: string;
  delivery: boolean;
  channel: string | null;
  items: KDSItem[];
  sentAt: string | null;
  status: "new" | "cooking" | "ready";
}

interface KitchenStation {
  id: string;
  name: string;
  short_name: string;
  icon: string;
  color: string;
  is_active: boolean;
}

// Legacy stations for backward compat when no DB stations
const LEGACY_STATIONS = [
  { id: "all",     label: "ทั้งหมด",     icon: "📋", colorVar: "primary" },
  { id: "wok",     label: "เตาผัด",     icon: "🍳", colorVar: "warning"  },
  { id: "soup",    label: "ต้ม/แกง",    icon: "🍲", colorVar: "danger"   },
  { id: "grill",   label: "ย่าง/นึ่ง",  icon: "🔥", colorVar: "warning"  },
  { id: "fry",     label: "ทอด",        icon: "🍟", colorVar: "warning"  },
  { id: "salad",   label: "สลัด/ยำ",    icon: "🥗", colorVar: "success"  },
  { id: "dessert", label: "ของหวาน",    icon: "🍨", colorVar: "accent"   },
  { id: "drinks",  label: "เครื่องดื่ม", icon: "🧋", colorVar: "accent"   },
  { id: "rice",    label: "ข้าว",        icon: "🍚", colorVar: "primary"  },
];

function stationColor(colorVar: string) {
  const map: Record<string, string> = {
    primary: "text-primary border-primary/40 bg-primary/10",
    warning: "text-warning border-warning/40 bg-warning/10",
    danger:  "text-danger  border-danger/40  bg-danger/10",
    success: "text-success border-success/40 bg-success/10",
    accent:  "text-accent  border-accent/40  bg-accent/10",
  };
  return map[colorVar] ?? map.primary;
}

function playAlert() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1100, ctx.currentTime);
        osc2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.2);
      } catch {}
    }, 350);
  } catch {}
}

function playSuccess() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
      osc.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.2);
    });
  } catch {}
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Order Card ────────────────────────────────────────────
function OrderCard({ order, now, onBumpItem, onHandoff, soundOn }: {
  order: KDSOrder;
  now: number;
  onBumpItem: (itemId: string, currentStatus: string) => void;
  onHandoff: (order: KDSOrder) => void;
  soundOn: boolean;
}) {
  const isNew     = order.status === "new";
  const isCooking = order.status === "cooking";
  const isReady   = order.status === "ready";

  const elapsed = order.sentAt ? Math.max(0, Math.floor((now - new Date(order.sentAt).getTime()) / 1000)) : 0;
  const elapsedMins = elapsed / 60;
  const isLate = elapsedMins > 10 && !isReady;

  const cardBorder = isReady
    ? "border-success/60 shadow-[0_0_20px_hsl(var(--success)/0.12)]"
    : isNew
    ? "border-danger/60 shadow-[0_0_20px_hsl(var(--danger)/0.15)] animate-pulse"
    : isLate
    ? "border-danger/50"
    : "border-border";

  const headerBg = isReady ? "bg-success/8" : isNew ? "bg-danger/8" : "bg-card";
  const readyCount = order.items.filter(i => i.status === "ready" || i.status === "served").length;
  const allReady = readyCount === order.items.length;

  return (
    <div className={cn("bg-card border-2 rounded-2xl overflow-hidden transition-all duration-200", cardBorder)}>
      {/* Header */}
      <div className={cn("px-4 py-2.5 border-b border-border flex items-center justify-between", headerBg)}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-black text-[17px] text-foreground">{order.orderNumber}</span>
          {order.delivery && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-success/10 text-success border border-success/30">
              🛵 {order.channel || "Delivery"}
            </span>
          )}
          {isLate && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-danger/15 text-danger border border-danger/40 animate-pulse">
              🔴 ล่าช้า!
            </span>
          )}
        </div>
        <span className={cn(
          "font-mono text-[15px] font-extrabold tabular-nums",
          isReady ? "text-success" : elapsedMins > 10 ? "text-danger" : elapsedMins > 5 ? "text-warning" : "text-foreground"
        )}>
          ⏱ {formatTime(elapsed)}
        </span>
      </div>

      {/* Table row */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-foreground">
            {order.delivery ? "🛵" : "🪑"} {order.table}
          </span>
          <span className={cn(
            "px-2 py-0.5 rounded-md text-[10px] font-bold border",
            isNew ? "bg-danger/10 text-danger border-danger/30" :
            isReady ? "bg-success/10 text-success border-success/30" :
            "bg-warning/10 text-warning border-warning/30"
          )}>
            {isNew ? "🆕 ใหม่" : isReady ? "✅ พร้อมเสิร์ฟ" : "🔥 กำลังทำ"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground tabular-nums">{readyCount}/{order.items.length}</span>
          <div className="w-12 h-1.5 rounded-full bg-border overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-300", allReady ? "bg-success" : "bg-warning")}
              style={{ width: `${order.items.length > 0 ? (readyCount / order.items.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-1">
        {order.items.map((item, i) => {
          const isDone = item.status === "ready" || item.status === "served";
          const isCk = item.status === "cooking";
          const st = STATIONS.find(s => s.id === item.station);

          // Cooking timer
          let cookingTimer: string | null = null;
          let timerColor = "text-success";
          if (isCk && item.cookingStartedAt) {
            const diff = Math.max(0, Math.floor((now - new Date(item.cookingStartedAt).getTime()) / 1000));
            cookingTimer = formatTime(diff);
            const mins = diff / 60;
            if (mins > 10) timerColor = "text-danger animate-pulse";
            else if (mins > 5) timerColor = "text-warning";
          }

          return (
            <div key={item.id}
              onClick={() => !isDone && onBumpItem(item.id, item.status)}
              className={cn(
                "flex items-start gap-2.5 py-2.5 cursor-pointer select-none transition-opacity",
                i < order.items.length - 1 && "border-b border-border",
                isDone && "opacity-40"
              )}>
              <div className={cn(
                "w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black border-2 transition-all shrink-0 mt-0.5",
                isDone ? "bg-success border-success text-white" : isCk ? "bg-warning border-warning text-white" : "border-border bg-background"
              )}>
                {isDone ? "✓" : isCk ? "🔥" : ""}
              </div>
              {st && (
                <span className={cn("px-1.5 py-0.5 rounded-md text-[10px] font-bold border shrink-0 mt-0.5", stationColor(st.colorVar))}>
                  {st.icon}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[13px] font-bold",
                    isDone ? "line-through text-muted-foreground" : "text-foreground"
                  )}>
                    {item.name} <span className="font-mono text-accent">×{item.qty}</span>
                  </span>
                  {cookingTimer && (
                    <span className={cn("font-mono text-[11px] font-extrabold tabular-nums", timerColor)}>
                      🔥 {cookingTimer}
                    </span>
                  )}
                  {isDone && item.cookingSeconds && (
                    <span className="font-mono text-[10px] text-success tabular-nums">⏱ {formatTime(item.cookingSeconds)}</span>
                  )}
                </div>
                {item.optionsText && (
                  <div className="text-[10px] text-warning font-semibold mt-0.5">⚠️ {item.optionsText}</div>
                )}
                {item.note && !item.optionsText?.includes(item.note) && (
                  <div className="text-[10px] text-primary font-semibold mt-0.5">📝 {item.note}</div>
                )}
              </div>
              {!isDone && (
                <span className={cn(
                  "shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg border min-h-[32px] flex items-center",
                  isCk ? "bg-warning/10 text-warning border-warning/30" : "bg-danger/10 text-danger border-danger/30"
                )}>
                  {isCk ? "กดเมื่อเสร็จ →" : "กดเริ่มทำ →"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="px-3 py-3 flex gap-2">
        {isNew && (
          <button onClick={() => order.items.forEach(it => { if (it.status === "sent") onBumpItem(it.id, "sent"); })}
            className="flex-1 min-h-[44px] py-2.5 rounded-xl text-[13px] font-bold text-white bg-warning hover:opacity-90 transition-opacity">
            🔥 เริ่มทำทั้งหมด
          </button>
        )}
        {isCooking && !allReady && (
          <button onClick={() => order.items.forEach(it => { if (it.status === "cooking") onBumpItem(it.id, "cooking"); })}
            className="flex-1 min-h-[44px] py-2.5 rounded-xl text-[13px] font-bold border border-success/40 text-success bg-success/10 hover:bg-success/20 transition-colors">
            ✅ เสร็จทั้งหมด
          </button>
        )}
        {allReady && (
          <button onClick={() => onHandoff(order)}
            className={cn(
              "flex-1 min-h-[56px] py-3 rounded-xl text-[16px] font-extrabold text-white bg-[hsl(142_64%_38%)] shadow-[0_4px_16px_hsl(142_64%_38%/0.35)] hover:bg-[hsl(142_64%_34%)] transition-all",
              isReady && "animate-pulse"
            )}>
            🍽 ส่งมอบ
          </button>
        )}
      </div>
    </div>
  );
}

// ── Handoff Modal ─────────────────────────────────────────
function HandoffModal({ order, open, onClose, onConfirm }: {
  order: KDSOrder | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!order) return null;

  const cookedItems = order.items.filter(i => i.cookingSeconds && i.cookingSeconds > 0);
  const maxSecs = cookedItems.length > 0 ? Math.max(...cookedItems.map(i => i.cookingSeconds!)) : 0;
  const avgSecs = cookedItems.length > 0 ? Math.round(cookedItems.reduce((s, i) => s + i.cookingSeconds!, 0) / cookedItems.length) : 0;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden rounded-2xl border-border bg-[hsl(var(--surface))]">
        <div className="px-5 py-4 border-b border-border">
          <div className="text-[16px] font-black text-foreground">🍽 ส่งมอบออเดอร์ {order.orderNumber}</div>
          <div className="text-[12px] text-muted-foreground mt-0.5">{order.delivery ? "🛵" : "🪑"} {order.table}</div>
        </div>
        <div className="px-5 py-3 space-y-2 max-h-[40vh] overflow-y-auto">
          {order.items.map(item => (
            <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-semibold text-foreground">{item.name} <span className="font-mono text-accent">×{item.qty}</span></span>
                {item.optionsText && <div className="text-[10px] text-warning truncate">{item.optionsText}</div>}
              </div>
              {item.cookingSeconds && item.cookingSeconds > 0 && (
                <span className="font-mono text-[12px] text-muted-foreground tabular-nums shrink-0 ml-2">⏱ {formatTime(item.cookingSeconds)}</span>
              )}
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-border space-y-1 text-[12px] text-muted-foreground">
          <div>⏱ เวลารวม: <strong className="text-foreground font-mono">{formatTime(maxSecs)}</strong> (นานสุด)</div>
          <div>📊 เฉลี่ย: <strong className="text-foreground font-mono">{formatTime(avgSecs)}</strong> ต่อจาน</div>
        </div>
        <div className="px-5 pb-5 space-y-2">
          <button onClick={onConfirm}
            className="w-full h-14 rounded-2xl bg-[hsl(142_64%_38%)] text-white text-[15px] font-extrabold flex items-center justify-center gap-2 shadow-[0_4px_16px_hsl(142_64%_38%/0.35)] hover:bg-[hsl(142_64%_34%)] transition-colors active:scale-[0.98]">
            ✅ ยืนยันส่งมอบ
          </button>
          <button onClick={onClose}
            className="w-full h-10 rounded-2xl border border-border bg-muted text-muted-foreground text-[13px] font-semibold hover:text-foreground transition-colors">
            ยกเลิก
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main KDS ──────────────────────────────────────────────
export function KDSScreen() {
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [station, setStation] = useState("all");
  const [now, setNow] = useState(Date.now());
  const [soundOn, setSoundOn] = useState(true);
  const [stats, setStats] = useState({ served: 0, avgSec: 0, minSec: 0, maxSec: 0, onTime: 100, cancelled: 0 });
  const [handoffOrder, setHandoffOrder] = useState<KDSOrder | null>(null);
  const prevCountRef = useRef(0);
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchKDSOrders();
    fetchStats();
    const channel = supabase
      .channel("kds-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, (payload) => {
        fetchKDSOrders();
        if (soundOn && (payload.eventType === "INSERT" || (payload.eventType === "UPDATE" && (payload.new as any).status === "sent"))) {
          playAlert();
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => { fetchKDSOrders(); fetchStats(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [soundOn]);

  async function fetchKDSOrders() {
    const { data, error } = await supabase
      .from("order_items")
      .select(`
        id, name, qty, note, status, station, sent_at, ready_at, options_text, cooking_started_at, cooking_seconds,
        order_id,
        orders!inner (
          id, order_number, table_id, order_type, channel,
          tables ( label )
        )
      `)
      .in("status", ["sent", "cooking", "ready"])
      .order("sent_at", { ascending: true });

    if (error || !data) return;

    const grouped: Record<string, KDSOrder> = {};
    (data as any[]).forEach((item: any) => {
      const oid = item.order_id;
      if (!grouped[oid]) {
        const ord = item.orders;
        const tableLabel = ord?.tables?.label;
        const ch = ord?.channel;
        const isDelivery = ch && !["walk_in", "kiosk", "qr_order"].includes(ch);
        grouped[oid] = {
          orderId: oid,
          orderNumber: ord?.order_number || oid.slice(0, 8),
          table: tableLabel || (isDelivery ? "Delivery" : "?"),
          delivery: !!isDelivery,
          channel: ch,
          items: [],
          sentAt: item.sent_at,
          status: "ready",
        };
      }
      grouped[oid].items.push({
        id: item.id, name: item.name, qty: item.qty,
        station: item.station, note: item.note, status: item.status,
        optionsText: item.options_text, cookingStartedAt: item.cooking_started_at,
        cookingSeconds: item.cooking_seconds,
      });
      if (item.status === "sent") grouped[oid].status = "new";
      else if (item.status === "cooking" && grouped[oid].status !== "new") grouped[oid].status = "cooking";
    });

    const list = Object.values(grouped);
    if (list.length > prevCountRef.current && prevCountRef.current > 0 && soundOn) playAlert();
    prevCountRef.current = list.length;
    setOrders(list);
  }

  async function fetchStats() {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("order_items")
      .select("status, cooking_seconds")
      .gte("created_at", today + "T00:00:00")
      .in("status", ["served", "ready", "cooking", "sent", "cancelled"]);

    if (!data) return;
    const served = data.filter(d => d.status === "served").length;
    const cancelled = data.filter(d => d.status === "cancelled").length;
    const cooked = data.filter(d => (d as any).cooking_seconds > 0);
    const avgSec = cooked.length > 0 ? Math.round(cooked.reduce((s, d) => s + (d as any).cooking_seconds, 0) / cooked.length) : 0;
    const minSec = cooked.length > 0 ? Math.min(...cooked.map(d => (d as any).cooking_seconds)) : 0;
    const maxSec = cooked.length > 0 ? Math.max(...cooked.map(d => (d as any).cooking_seconds)) : 0;
    const onTime = cooked.length > 0
      ? Math.round(cooked.filter(d => (d as any).cooking_seconds <= 600).length / cooked.length * 100)
      : 100;
    setStats({ served, avgSec, minSec, maxSec, onTime, cancelled });
  }

  async function bumpItem(itemId: string, currentStatus: string) {
    if (currentStatus === "sent") {
      await supabase.from("order_items").update({
        status: "cooking" as any,
        cooking_started_at: new Date().toISOString(),
      }).eq("id", itemId);
    } else if (currentStatus === "cooking") {
      // Fetch cooking_started_at to calculate duration
      const { data: item } = await supabase.from("order_items").select("cooking_started_at").eq("id", itemId).single();
      const startedAt = item?.cooking_started_at ? new Date(item.cooking_started_at) : null;
      const cookingSeconds = startedAt ? Math.round((Date.now() - startedAt.getTime()) / 1000) : null;

      await supabase.from("order_items").update({
        status: "ready" as any,
        ready_at: new Date().toISOString(),
        cooking_seconds: cookingSeconds,
      }).eq("id", itemId);
    }
  }

  async function handoffConfirm() {
    if (!handoffOrder) return;
    await supabase.from("order_items").update({
      status: "served" as any,
      served_at: new Date().toISOString(),
      handed_at: new Date().toISOString(),
    }).eq("order_id", handoffOrder.orderId).in("status", ["ready"]);

    await supabase.from("orders").update({ status: "served" as any }).eq("id", handoffOrder.orderId);

    playSuccess();
    toast({ title: "ส่งมอบเรียบร้อย! 🍽", description: `ออเดอร์ ${handoffOrder.orderNumber} ถูกส่งไปเสิร์ฟแล้ว` });
    setHandoffOrder(null);
    fetchStats();
  }

  const filtered = station === "all" ? orders : orders.filter(o => o.items.some(it => it.station === station));
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === "new" && b.status !== "new") return -1;
    if (a.status !== "new" && b.status === "new") return 1;
    if (a.status === "ready" && b.status !== "ready") return 1;
    const aTime = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const bTime = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    return aTime - bTime;
  });

  const newCount     = orders.filter(o => o.status === "new").length;
  const cookingCount = orders.filter(o => o.status === "cooking").length;
  const readyCount   = orders.filter(o => o.status === "ready").length;
  const lateCount    = orders.filter(o => {
    if (!o.sentAt || o.status === "ready") return false;
    return (now - new Date(o.sentAt).getTime()) / 60000 > 10;
  }).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <div className="px-5 py-3 bg-card border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white font-extrabold text-[16px] shadow-primary">K</div>
          <div>
            <div className="text-[15px] font-extrabold text-gradient-primary leading-tight">POSAI Kitchen Display</div>
            <div className="text-[10px] text-muted-foreground">Smart KDS · Realtime · Cooking Timer</div>
          </div>
        </div>

        <div className="flex gap-2">
          {[
            { label: "ใหม่",        val: newCount,     color: "danger",  glow: newCount > 0 },
            { label: "กำลังทำ",     val: cookingCount, color: "warning", glow: false },
            { label: "พร้อมเสิร์ฟ", val: readyCount,   color: "success", glow: readyCount > 0 },
            { label: "ล่าช้า",       val: lateCount,    color: "danger",  glow: lateCount > 0 },
          ].map((s, i) => (
            <div key={i} className={cn(
              "px-3 py-1.5 rounded-xl text-center border transition-all",
              s.glow
                ? s.color === "danger" ? "bg-danger/10 border-danger/40 shadow-[0_0_12px_hsl(var(--danger)/0.2)]" : "bg-success/10 border-success/40"
                : "bg-background border-border"
            )}>
              <div className="text-[9px] text-muted-foreground font-semibold">{s.label}</div>
              <div className={cn("font-mono text-[17px] font-black tabular-nums",
                s.color === "danger" ? "text-danger" : s.color === "warning" ? "text-warning" : "text-success"
              )}>{s.val}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setSoundOn(!soundOn)}
            className={cn("px-3 py-1.5 rounded-xl text-[12px] font-bold border transition-all",
              soundOn ? "border-success/50 bg-success/10 text-success" : "border-border text-muted-foreground"
            )}>
            {soundOn ? "🔊" : "🔇"}
          </button>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-success/10 text-success border border-success/30">
            🔴 LIVE
          </span>
        </div>
      </div>

      {/* Station filter */}
      <div className="px-4 py-2.5 border-b border-border bg-card flex items-center gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
        {STATIONS.map(s => {
          const count = s.id === "all" ? orders.length : orders.filter(o => o.items.some(it => it.station === s.id)).length;
          return (
            <button key={s.id} onClick={() => setStation(s.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border-2 whitespace-nowrap shrink-0 transition-all",
                station === s.id ? stationColor(s.colorVar) : "border-border text-muted-foreground hover:border-border"
              )}>
              {s.icon} {s.label}
              {count > 0 && <span className="px-1.5 rounded-full text-[10px] font-extrabold font-mono">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Order board */}
      <div className="flex-1 overflow-y-auto p-4">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pb-8">
            <div className="text-[48px] mb-3">🎉</div>
            <div className="text-[18px] font-bold text-foreground mb-1">ไม่มีออเดอร์ค้าง</div>
            <div className="text-[13px]">ครัวว่าง — พร้อมรับออเดอร์ใหม่</div>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", alignItems: "start" }}>
            {sorted.map(order => (
              <OrderCard key={order.orderId} order={order} now={now} onBumpItem={bumpItem} onHandoff={setHandoffOrder} soundOn={soundOn} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom stats */}
      <div className="px-5 py-2.5 bg-card border-t border-border flex items-center justify-between shrink-0">
        <div className="flex gap-5 text-[12px]">
          <span className="text-muted-foreground">📊 วันนี้: เสิร์ฟแล้ว <strong className="text-success font-mono">{stats.served}</strong></span>
          <span className="text-muted-foreground">⏱ เฉลี่ย <strong className="text-accent font-mono">{formatTime(stats.avgSec)}</strong></span>
          <span className="text-muted-foreground">🏆 เร็วสุด <strong className="text-success font-mono">{formatTime(stats.minSec)}</strong></span>
          <span className="text-muted-foreground">🐌 ช้าสุด <strong className="text-warning font-mono">{formatTime(stats.maxSec)}</strong></span>
          <span className="text-muted-foreground">🎯 ตรงเวลา <strong className="text-success font-mono">{stats.onTime}%</strong></span>
          <span className="text-muted-foreground">❌ ยกเลิก <strong className={cn("font-mono", stats.cancelled > 0 ? "text-danger" : "text-success")}>{stats.cancelled}</strong></span>
        </div>
        <button onClick={() => setSoundOn(!soundOn)}
          className="flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
          <span>{soundOn ? "🔊 เสียงเปิด" : "🔇 เสียงปิด"}</span>
        </button>
      </div>

      {/* Handoff Modal */}
      <HandoffModal order={handoffOrder} open={!!handoffOrder} onClose={() => setHandoffOrder(null)} onConfirm={handoffConfirm} />
    </div>
  );
}
