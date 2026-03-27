import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

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

// ── Urgency helpers ───────────────────────────────────────
function getUrgency(elapsedMins: number) {
  if (elapsedMins >= 15) return { border: "hsl(var(--danger))", label: "ด่วนมาก!", bg: "bg-danger", text: "text-danger" };
  if (elapsedMins >= 10) return { border: "hsl(38, 92%, 50%)", label: "เร่งด่วน", bg: "bg-warning", text: "text-warning" };
  if (elapsedMins >= 5)  return { border: "hsl(38, 92%, 50%)", label: "รอนาน", bg: "bg-warning/80", text: "text-warning" };
  return { border: "hsl(var(--success))", label: "ปกติ", bg: "bg-success", text: "text-success" };
}

// ── Card animation variants ──────────────────────────────
const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
  exit: { opacity: 0, scale: 0.94, y: -10, transition: { duration: 0.2, ease: "easeIn" as const } },
};

// ── Kanban Order Card ────────────────────────────────────
function KanbanCard({ order, now, onBumpItem, onHandoff }: {
  order: KDSOrder;
  now: number;
  onBumpItem: (itemId: string, currentStatus: string) => void;
  onHandoff: (order: KDSOrder) => void;
}) {
  const isNew     = order.status === "new";
  const isCooking = order.status === "cooking";
  const isReady   = order.status === "ready";

  const elapsed = order.sentAt ? Math.max(0, Math.floor((now - new Date(order.sentAt).getTime()) / 1000)) : 0;
  const elapsedMins = elapsed / 60;

  const urgency = isReady
    ? { border: "hsl(var(--success))", label: "พร้อมเสิร์ฟ", bg: "bg-success", text: "text-success" }
    : getUrgency(elapsedMins);

  const readyCount = order.items.filter(i => i.status === "ready" || i.status === "served").length;
  const cookingCount = order.items.filter(i => i.status === "cooking").length;
  const allReady = readyCount === order.items.length;
  const progressPct = order.items.length > 0 ? (readyCount / order.items.length) * 100 : 0;

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="bg-card rounded-2xl overflow-hidden transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]"
      style={{
        boxShadow: "var(--shadow-card)",
        borderLeft: `4px solid ${urgency.border}`,
      }}
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-[15px] text-foreground">{order.orderNumber}</span>
          <span className="text-[12px] text-muted-foreground">
            {order.delivery ? "🛵" : "🪑"} {order.table}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold text-white", urgency.bg)}>
            {urgency.label}
          </span>
          <span className={cn("font-mono text-[13px] font-extrabold tabular-nums", urgency.text)}>
            {formatTime(elapsed)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-3.5 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full", allReady ? "bg-success" : cookingCount > 0 ? "bg-warning" : "bg-primary")}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <span className="text-[10px] font-mono tabular-nums text-muted-foreground shrink-0">
            {readyCount}/{order.items.length}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="px-3.5 pb-1">
        {order.items.map((item, i) => {
          const isDone = item.status === "ready" || item.status === "served";
          const isCk = item.status === "cooking";
          const st = LEGACY_STATIONS.find(s => s.id === item.station);

          let cookingTimer: string | null = null;
          let timerColor = "text-success";
          if (isCk && item.cookingStartedAt) {
            const diff = Math.max(0, Math.floor((now - new Date(item.cookingStartedAt).getTime()) / 1000));
            cookingTimer = formatTime(diff);
            const mins = diff / 60;
            if (mins > 10) timerColor = "text-danger";
            else if (mins > 5) timerColor = "text-warning";
          }

          return (
            <motion.div
              key={item.id}
              layout
              onClick={() => !isDone && onBumpItem(item.id, item.status)}
              className={cn(
                "flex items-center gap-2 py-2 cursor-pointer select-none transition-all",
                i < order.items.length - 1 && "border-b border-border/50",
                isDone && "opacity-40"
              )}
              whileTap={!isDone ? { scale: 0.97 } : undefined}
            >
              {/* Status indicator */}
              <motion.div
                className={cn(
                  "w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
                  isDone ? "bg-success text-white" : isCk ? "bg-warning text-white" : "bg-muted border border-border"
                )}
                animate={isDone ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {isDone ? "✓" : isCk ? "🔥" : ""}
              </motion.div>

              {st && (
                <span className={cn("px-1.5 py-0.5 rounded-md text-[9px] font-bold border shrink-0", stationColor(st.colorVar))}>
                  {st.icon}
                </span>
              )}

              <div className="flex-1 min-w-0">
                <span className={cn(
                  "text-[12px] font-semibold leading-tight",
                  isDone ? "line-through text-muted-foreground" : "text-foreground"
                )}>
                  {item.name} <span className="font-mono text-primary/70">×{item.qty}</span>
                </span>
                {item.optionsText && (
                  <div className="text-[9px] text-warning font-medium mt-0.5 truncate">⚠️ {item.optionsText}</div>
                )}
                {item.note && !item.optionsText?.includes(item.note) && (
                  <div className="text-[9px] text-primary font-medium mt-0.5 truncate">📝 {item.note}</div>
                )}
              </div>

              {cookingTimer && (
                <span className={cn("font-mono text-[10px] font-bold tabular-nums shrink-0", timerColor)}>
                  {cookingTimer}
                </span>
              )}
              {isDone && item.cookingSeconds && (
                <span className="font-mono text-[9px] text-success tabular-nums shrink-0">⏱ {formatTime(item.cookingSeconds)}</span>
              )}
              {!isDone && (
                <span className={cn(
                  "shrink-0 text-[9px] font-bold px-2 py-1 rounded-lg transition-colors",
                  isCk ? "bg-success/10 text-success hover:bg-success/20" : "bg-warning/10 text-warning hover:bg-warning/20"
                )}>
                  {isCk ? "เสร็จ →" : "เริ่ม →"}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="px-3 pb-3 pt-1 flex gap-2">
        {isNew && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => order.items.forEach(it => { if (it.status === "sent") onBumpItem(it.id, "sent"); })}
            className="flex-1 min-h-[40px] py-2 rounded-xl text-[12px] font-bold text-white bg-warning hover:bg-warning/90 transition-colors"
          >
            🔥 เริ่มทำทั้งหมด
          </motion.button>
        )}
        {isCooking && !allReady && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => order.items.forEach(it => { if (it.status === "cooking") onBumpItem(it.id, "cooking"); })}
            className="flex-1 min-h-[40px] py-2 rounded-xl text-[12px] font-bold border border-success/40 text-success bg-success/10 hover:bg-success/20 transition-colors"
          >
            ✅ เสร็จทั้งหมด
          </motion.button>
        )}
        {allReady && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onHandoff(order)}
            className="flex-1 min-h-[48px] py-2.5 rounded-xl text-[14px] font-extrabold text-white bg-success shadow-[0_4px_16px_hsl(var(--success)/0.35)] hover:brightness-110 transition-all"
          >
            🍽 ส่งมอบ
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ── Kanban Column ────────────────────────────────────────
function KanbanColumn({ title, icon, count, color, children, className }: {
  title: string;
  icon: string;
  count: number;
  color: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[16px]">{icon}</span>
          <span className="text-[13px] font-bold text-foreground">{title}</span>
        </div>
        <span className={cn(
          "min-w-[24px] h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white px-1.5",
          color
        )}>
          {count}
        </span>
      </div>
      {/* Column body */}
      <div className="flex-1 overflow-y-auto space-y-2.5 px-1 pb-2 scrollbar-hide">
        {children}
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
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden rounded-2xl border-border bg-card">
        <DialogTitle className="px-5 py-4 border-b border-border text-[16px] font-black text-foreground">
          🍽 ส่งมอบออเดอร์ {order.orderNumber}
        </DialogTitle>
        <DialogDescription className="sr-only">ยืนยันการส่งมอบออเดอร์</DialogDescription>
        <div className="px-5 py-1 text-[12px] text-muted-foreground">{order.delivery ? "🛵" : "🪑"} {order.table}</div>
        <div className="px-5 py-3 space-y-2 max-h-[40vh] overflow-y-auto">
          {order.items.map(item => (
            <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-semibold text-foreground">{item.name} <span className="font-mono text-primary/70">×{item.qty}</span></span>
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
            className="w-full h-14 rounded-2xl bg-success text-white text-[15px] font-extrabold flex items-center justify-center gap-2 shadow-[0_4px_16px_hsl(var(--success)/0.35)] hover:brightness-110 transition-all active:scale-[0.98]">
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

// ── Live Stats Pill ───────────────────────────────────────
function LiveStatPill({ icon, label, value, color }: { icon: string; label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/50">
      <span className="text-[11px]">{icon}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-[11px] font-bold tabular-nums", color || "text-foreground")}>{value}</span>
    </div>
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

  // Multi-station support
  const [kdsMode, setKdsMode] = useState<"loading" | "select" | "all" | "station" | "expeditor">("loading");
  const [dbStations, setDbStations] = useState<KitchenStation[]>([]);
  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const [stationPendingCounts, setStationPendingCounts] = useState<Record<string, number>>({});

  // On mount: check if DB stations exist
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("kitchen_stations").select("*").eq("is_active", true).order("sort_order");
      if (data && data.length > 0) {
        setDbStations(data as any);
        setKdsMode("select");
      } else {
        setKdsMode("all");
      }
    })();
  }, []);

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
    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select("id, name, qty, note, status, station, station_id, sent_at, ready_at, options_text, cooking_started_at, cooking_seconds, order_id")
      .in("status", ["sent", "cooking", "ready"])
      .order("sent_at", { ascending: true });

    if (itemsErr || !items || items.length === 0) {
      setOrders([]);
      return;
    }

    const orderIds = [...new Set(items.map(i => i.order_id))];
    const { data: ordersData, error: ordersErr } = await supabase
      .from("orders")
      .select("id, order_number, table_id, order_type, channel, tables!orders_table_id_fkey(label)")
      .in("id", orderIds);

    if (ordersErr) {
      console.error("Error fetching orders for KDS:", ordersErr.message);
      setOrders([]);
      return;
    }

    const orderMap: Record<string, any> = {};
    (ordersData || []).forEach((o: any) => { orderMap[o.id] = o; });

    const grouped: Record<string, KDSOrder> = {};
    items.forEach((item: any) => {
      const oid = item.order_id;
      if (!grouped[oid]) {
        const ord = orderMap[oid];
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
        station: item.station, stationId: item.station_id || null,
        note: item.note, status: item.status,
        optionsText: item.options_text,
        cookingStartedAt: item.cooking_started_at,
        cookingSeconds: item.cooking_seconds,
      });

      if (item.status === "sent") grouped[oid].status = "new";
      else if (item.status === "cooking" && grouped[oid].status !== "new")
        grouped[oid].status = "cooking";
    });

    const list = Object.values(grouped);
    if (list.length > prevCountRef.current && prevCountRef.current > 0 && soundOn)
      playAlert();
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
    try {
      if (currentStatus === "sent") {
        const { error } = await supabase.from("order_items").update({
          status: "cooking" as any,
          cooking_started_at: new Date().toISOString(),
        }).eq("id", itemId);

        if (error) {
          console.error("KDS bump sent→cooking failed:", error.message);
          toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
          return;
        }
      } else if (currentStatus === "cooking") {
        const { data: item } = await supabase.from("order_items").select("cooking_started_at").eq("id", itemId).single();
        const startedAt = item?.cooking_started_at ? new Date(item.cooking_started_at) : null;
        const cookingSeconds = startedAt ? Math.round((Date.now() - startedAt.getTime()) / 1000) : null;

        const { error } = await supabase.from("order_items").update({
          status: "ready" as any,
          ready_at: new Date().toISOString(),
          cooking_seconds: cookingSeconds,
        }).eq("id", itemId);

        if (error) {
          console.error("KDS bump cooking→ready failed:", error.message);
          toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
          return;
        }
      }

      console.log("KDS bump success:", itemId, currentStatus, "→", currentStatus === "sent" ? "cooking" : "ready");
      fetchKDSOrders();
    } catch (err) {
      console.error("KDS bump exception:", err);
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

  // Filter by station
  const filtered = activeStationId
    ? orders.map(o => ({ ...o, items: o.items.filter(it => it.stationId === activeStationId) })).filter(o => o.items.length > 0)
    : station === "all" ? orders : orders.filter(o => o.items.some(it => it.station === station));

  // Split into Kanban columns
  const newOrders = filtered.filter(o => o.status === "new").sort((a, b) => {
    const aT = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const bT = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    return aT - bT;
  });
  const cookingOrders = filtered.filter(o => o.status === "cooking").sort((a, b) => {
    const aT = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const bT = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    return aT - bT;
  });
  const readyOrders = filtered.filter(o => o.status === "ready").sort((a, b) => {
    const aT = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const bT = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    return bT - aT; // newest ready first
  });

  const lateCount = orders.filter(o => {
    if (!o.sentAt || o.status === "ready") return false;
    return (now - new Date(o.sentAt).getTime()) / 60000 > 10;
  }).length;

  // Fetch pending counts for station selection
  useEffect(() => {
    if (kdsMode !== "select" || dbStations.length === 0) return;
    (async () => {
      const { data } = await supabase.from("order_items").select("station_id").in("status", ["sent", "cooking"]).not("station_id", "is", null);
      if (data) {
        const counts: Record<string, number> = {};
        (data as any[]).forEach(i => { counts[i.station_id] = (counts[i.station_id] || 0) + 1; });
        setStationPendingCounts(counts);
      }
    })();
  }, [kdsMode, dbStations]);

  // ── Loading ──
  if (kdsMode === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // ── Station Selection ──
  if (kdsMode === "select") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-8">
        <div className="text-[48px] mb-4">👨‍🍳</div>
        <h1 className="text-[20px] font-black text-foreground mb-1">เลือกสถานีครัว</h1>
        <p className="text-[13px] text-muted-foreground mb-8">Select Kitchen Station</p>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(dbStations.length + 2, 4)}, 1fr)` }}>
          {dbStations.map(s => (
            <button key={s.id} onClick={() => { setActiveStationId(s.id); setKdsMode("station"); }}
              className="relative flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-border bg-card hover:shadow-[var(--shadow-card-hover)] hover:scale-[1.03] transition-all min-w-[140px]"
              style={{ borderColor: s.color + "44" }}>
              <span className="text-[36px]">{s.icon}</span>
              <span className="text-[14px] font-bold text-foreground">{s.name}</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: s.color + "15", color: s.color }}>{s.short_name}</span>
              {(stationPendingCounts[s.id] || 0) > 0 && (
                <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-danger text-white text-[11px] font-bold flex items-center justify-center">
                  {stationPendingCounts[s.id]}
                </span>
              )}
            </button>
          ))}
          <button onClick={() => { setActiveStationId(null); setKdsMode("all"); }}
            className="flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-border bg-card hover:shadow-[var(--shadow-card-hover)] hover:scale-[1.03] transition-all min-w-[140px]">
            <span className="text-[36px]">📋</span>
            <span className="text-[14px] font-bold text-foreground">ดูทั้งหมด</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary">ALL</span>
          </button>
          <button onClick={() => { setKdsMode("expeditor"); }}
            className="flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-border bg-card hover:shadow-[var(--shadow-card-hover)] hover:scale-[1.03] transition-all min-w-[140px]">
            <span className="text-[36px]">👨‍🍳</span>
            <span className="text-[14px] font-bold text-foreground">Expeditor</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-warning/10 text-warning">EXP</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Expeditor View ──
  if (kdsMode === "expeditor") {
    const expOrders = orders.map(o => {
      const stationGroups: Record<string, { total: number; done: number }> = {};
      o.items.forEach(it => {
        const sid = it.stationId;
        if (!sid) return;
        if (!stationGroups[sid]) stationGroups[sid] = { total: 0, done: 0 };
        stationGroups[sid].total++;
        if (it.status === "ready" || it.status === "served") stationGroups[sid].done++;
      });
      return {
        orderId: o.orderId, orderNumber: o.orderNumber, table: o.table,
        sentAt: o.sentAt, status: o.status,
        totalItems: o.items.length, doneItems: o.items.filter(i => i.status === "ready" || i.status === "served").length,
        stations: Object.entries(stationGroups).map(([sid, g]) => {
          const s = dbStations.find(st => st.id === sid);
          return { stationId: sid, name: s?.name || "?", icon: s?.icon || "?", color: s?.color || "#888", ...g };
        }),
      };
    });

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="px-5 py-3 bg-card border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setKdsMode("select")} className="text-muted-foreground hover:text-foreground text-[18px] transition-colors">←</button>
            <div>
              <div className="text-[15px] font-extrabold text-foreground">👨‍🍳 Expeditor View</div>
              <div className="text-[10px] text-muted-foreground">ดูความคืบหน้าทุกสถานี</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-success/10 text-success border border-success/30">🔴 LIVE</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", alignItems: "start" }}>
            {expOrders.map(o => {
              const allDone = o.doneItems === o.totalItems;
              const sentAt = o.sentAt ? Math.max(0, Math.floor((now - new Date(o.sentAt).getTime()) / 1000)) : 0;
              return (
                <motion.div key={o.orderId} layout variants={cardVariants} initial="initial" animate="animate"
                  className={cn("rounded-2xl border-2 bg-card overflow-hidden",
                    allDone ? "border-success/60" : o.status === "new" ? "border-danger/60" : "border-border")}
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className={cn("px-4 py-2.5 border-b border-border flex items-center justify-between",
                    allDone ? "bg-success/5" : "bg-card")}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-[15px] text-foreground">{o.orderNumber}</span>
                      <span className="text-[12px] text-muted-foreground">🪑 {o.table}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground tabular-nums">{o.doneItems}/{o.totalItems}</span>
                      <span className={cn("font-mono text-[13px] font-bold tabular-nums",
                        allDone ? "text-success" : sentAt > 600 ? "text-danger" : "text-foreground")}>
                        ⏱ {formatTime(sentAt)}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {o.stations.map(s => {
                      const pct = s.total > 0 ? (s.done / s.total) * 100 : 0;
                      return (
                        <div key={s.stationId} className="flex items-center gap-2">
                          <span className="text-[14px] shrink-0">{s.icon}</span>
                          <span className="text-[11px] font-bold shrink-0 w-14 truncate" style={{ color: s.color }}>{s.name.split("/")[0].trim()}</span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.4 }}
                              style={{ backgroundColor: pct === 100 ? "hsl(var(--success))" : s.color }}
                            />
                          </div>
                          <span className="text-[10px] font-mono tabular-nums text-muted-foreground shrink-0">{s.done}/{s.total}</span>
                          {pct === 100 && <span className="text-[10px]">✅</span>}
                        </div>
                      );
                    })}
                    {allDone && (
                      <div className="mt-1 text-center text-[12px] font-bold text-success">✅ พร้อมเสิร์ฟ</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          {expOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <div className="text-[48px] mb-3">🎉</div>
              <div className="text-[18px] font-bold text-foreground mb-1">ไม่มีออเดอร์</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active station info for header
  const activeDbStation = activeStationId ? dbStations.find(s => s.id === activeStationId) : null;
  const totalItems = filtered.reduce((s, o) => s + o.items.length, 0);
  const totalReady = filtered.reduce((s, o) => s + o.items.filter(i => i.status === "ready" || i.status === "served").length, 0);
  const overallProgress = totalItems > 0 ? Math.round((totalReady / totalItems) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* ── Top bar ── */}
      <div className="px-4 py-2.5 bg-card border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {activeDbStation ? (
            <button onClick={() => setKdsMode("select")} className="text-muted-foreground hover:text-foreground text-[18px] transition-colors">←</button>
          ) : null}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-extrabold text-[14px] shadow-[var(--shadow-primary)]">
              {activeDbStation ? activeDbStation.icon : "K"}
            </div>
            <div>
              <div className="text-[14px] font-extrabold text-foreground leading-tight">
                {activeDbStation ? activeDbStation.name : "Kitchen Display"}
              </div>
              <div className="text-[9px] text-muted-foreground">Kanban · Realtime</div>
            </div>
          </div>
        </div>

        {/* Live stats */}
        <div className="hidden md:flex items-center gap-1.5">
          <LiveStatPill icon="📊" label="เสิร์ฟแล้ว" value={stats.served} color="text-success" />
          <LiveStatPill icon="⏱" label="เฉลี่ย" value={formatTime(stats.avgSec)} color="text-primary" />
          <LiveStatPill icon="🎯" label="ตรงเวลา" value={`${stats.onTime}%`} color="text-success" />
          {lateCount > 0 && <LiveStatPill icon="⚠️" label="ล่าช้า" value={lateCount} color="text-danger" />}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setSoundOn(!soundOn)}
            className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-[14px] border transition-all",
              soundOn ? "border-success/50 bg-success/10" : "border-border bg-muted"
            )}>
            {soundOn ? "🔊" : "🔇"}
          </button>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-success/10 border border-success/30">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-bold text-success">LIVE</span>
          </div>
        </div>
      </div>

      {/* ── Station filter (legacy) ── */}
      {!activeStationId && (
        <div className="px-4 py-2 border-b border-border bg-card/50 flex items-center gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
          {LEGACY_STATIONS.map(s => {
            const count = s.id === "all" ? orders.length : orders.filter(o => o.items.some(it => it.station === s.id)).length;
            return (
              <button key={s.id} onClick={() => setStation(s.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border whitespace-nowrap shrink-0 transition-all",
                  station === s.id ? stationColor(s.colorVar) : "border-transparent text-muted-foreground hover:bg-muted"
                )}>
                {s.icon} {s.label}
                {count > 0 && <span className="px-1.5 rounded-full text-[10px] font-extrabold font-mono">{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Overall progress ── */}
      {totalItems > 0 && (
        <div className="px-4 py-1.5 bg-card/50 border-b border-border flex items-center gap-3 shrink-0">
          <span className="text-[10px] text-muted-foreground">ความคืบหน้ารวม</span>
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden max-w-[300px]">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-[10px] font-mono font-bold tabular-nums text-foreground">{overallProgress}%</span>
        </div>
      )}

      {/* ── Kanban Board ── */}
      <div className="flex-1 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pb-8">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-[56px] mb-4">🎉</motion.div>
            <div className="text-[18px] font-bold text-foreground mb-1">ไม่มีออเดอร์ค้าง</div>
            <div className="text-[13px]">ครัวว่าง — พร้อมรับออเดอร์ใหม่</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 h-full gap-0 divide-x divide-border">
            {/* Column 1: รอทำ (New) */}
            <KanbanColumn title="รอทำ" icon="🆕" count={newOrders.length} color="bg-danger" className="overflow-hidden">
              <AnimatePresence mode="popLayout">
                {newOrders.map(order => (
                  <KanbanCard key={order.orderId} order={order} now={now} onBumpItem={bumpItem} onHandoff={setHandoffOrder} />
                ))}
              </AnimatePresence>
              {newOrders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-[12px]">ไม่มีออเดอร์ใหม่</div>
              )}
            </KanbanColumn>

            {/* Column 2: กำลังทำ (Cooking) */}
            <KanbanColumn title="กำลังทำ" icon="🔥" count={cookingOrders.length} color="bg-warning" className="overflow-hidden">
              <AnimatePresence mode="popLayout">
                {cookingOrders.map(order => (
                  <KanbanCard key={order.orderId} order={order} now={now} onBumpItem={bumpItem} onHandoff={setHandoffOrder} />
                ))}
              </AnimatePresence>
              {cookingOrders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-[12px]">ไม่มีรายการกำลังทำ</div>
              )}
            </KanbanColumn>

            {/* Column 3: พร้อมเสิร์ฟ (Ready) */}
            <KanbanColumn title="พร้อมเสิร์ฟ" icon="✅" count={readyOrders.length} color="bg-success" className="overflow-hidden">
              <AnimatePresence mode="popLayout">
                {readyOrders.map(order => (
                  <KanbanCard key={order.orderId} order={order} now={now} onBumpItem={bumpItem} onHandoff={setHandoffOrder} />
                ))}
              </AnimatePresence>
              {readyOrders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-[12px]">ยังไม่มีรายการพร้อม</div>
              )}
            </KanbanColumn>
          </div>
        )}
      </div>

      {/* ── Bottom stats (mobile) ── */}
      <div className="md:hidden px-4 py-2 bg-card border-t border-border flex items-center gap-2 overflow-x-auto scrollbar-hide shrink-0">
        <LiveStatPill icon="📊" label="เสิร์ฟ" value={stats.served} color="text-success" />
        <LiveStatPill icon="⏱" label="เฉลี่ย" value={formatTime(stats.avgSec)} color="text-primary" />
        <LiveStatPill icon="🎯" label="ตรงเวลา" value={`${stats.onTime}%`} color="text-success" />
      </div>

      {/* ── Desktop bottom bar ── */}
      <div className="hidden md:flex px-5 py-2 bg-card border-t border-border items-center justify-between shrink-0">
        <div className="flex gap-4 text-[11px]">
          <span className="text-muted-foreground">📊 เสิร์ฟแล้ว <strong className="text-success font-mono">{stats.served}</strong></span>
          <span className="text-muted-foreground">⏱ เฉลี่ย <strong className="text-primary font-mono">{formatTime(stats.avgSec)}</strong></span>
          <span className="text-muted-foreground">🏆 เร็วสุด <strong className="text-success font-mono">{formatTime(stats.minSec)}</strong></span>
          <span className="text-muted-foreground">🐌 ช้าสุด <strong className="text-warning font-mono">{formatTime(stats.maxSec)}</strong></span>
          <span className="text-muted-foreground">🎯 ตรงเวลา <strong className="text-success font-mono">{stats.onTime}%</strong></span>
          {stats.cancelled > 0 && <span className="text-muted-foreground">❌ ยกเลิก <strong className="text-danger font-mono">{stats.cancelled}</strong></span>}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {soundOn ? "🔊 เสียงเปิด" : "🔇 เสียงปิด"}
        </span>
      </div>

      {/* Handoff Modal */}
      <HandoffModal order={handoffOrder} open={!!handoffOrder} onClose={() => setHandoffOrder(null)} onConfirm={handoffConfirm} />
    </div>
  );
}
