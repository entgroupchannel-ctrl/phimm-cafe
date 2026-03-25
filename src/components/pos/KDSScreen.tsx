import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────
type OrderStatus = "new" | "cooking" | "ready" | "served";
type Priority = "low" | "normal" | "high";

interface KDSItem {
  name: string;
  qty: number;
  station: string;
  mods: string[];
  done: boolean;
}

interface KDSOrder {
  id: string;
  table: string;
  type: "dinein" | "delivery";
  items: KDSItem[];
  time: number;
  status: OrderStatus;
  priority: Priority;
  rush: boolean;
  platform?: string;
}

// ── Data ──────────────────────────────────────────────────
const INITIAL_ORDERS: KDSOrder[] = [
  { id:"#0251", table:"T3", type:"dinein", items:[
    { name:"ต้มยำกุ้ง",     qty:1, station:"soup",   mods:["เผ็ดมาก"],     done:false },
    { name:"ผัดไทยกุ้งสด", qty:2, station:"wok",    mods:["ไม่ใส่ถั่ว"],  done:false },
  ], time:0,   status:"new",     priority:"normal", rush:false },

  { id:"#0250", table:"T1", type:"dinein", items:[
    { name:"แกงเขียวหวาน", qty:1, station:"soup",    mods:[],              done:true  },
    { name:"ข้าวสวย",      qty:1, station:"rice",    mods:[],              done:true  },
  ], time:480, status:"ready",   priority:"normal", rush:false },

  { id:"#0249", table:"D1", type:"delivery", items:[
    { name:"ข้าวมันไก่",   qty:3, station:"grill",   mods:["ไม่ใส่ผักชี"], done:false },
    { name:"ส้มตำไทย",     qty:1, station:"salad",   mods:["เผ็ดน้อย"],   done:true  },
  ], time:180, status:"cooking", priority:"high",   rush:false, platform:"LINE MAN" },

  { id:"#0248", table:"T7", type:"dinein", items:[
    { name:"ข้าวผัดกุ้ง",  qty:1, station:"wok",    mods:[],              done:true  },
    { name:"ชาเย็น",        qty:2, station:"drinks", mods:[],              done:false },
  ], time:320, status:"cooking", priority:"normal", rush:false },

  { id:"#0247", table:"T5", type:"dinein", items:[
    { name:"ปีกไก่ทอด",    qty:2, station:"fry",    mods:[],              done:false },
    { name:"เฟรนช์ฟรายส์", qty:1, station:"fry",    mods:[],              done:false },
    { name:"น้ำมะนาวโซดา", qty:2, station:"drinks", mods:[],              done:true  },
  ], time:90,  status:"cooking", priority:"normal", rush:false },

  { id:"#0246", table:"T2", type:"dinein", items:[
    { name:"ข้าวเหนียวมะม่วง", qty:2, station:"dessert", mods:[],         done:false },
  ], time:60,  status:"new",     priority:"low",    rush:false },
];

const STATIONS = [
  { id:"all",     label:"ทั้งหมด",    icon:"📋", colorVar:"primary" },
  { id:"wok",     label:"เตาผัด",    icon:"🍳", colorVar:"warning"  },
  { id:"soup",    label:"ต้ม/แกง",   icon:"🍲", colorVar:"danger"   },
  { id:"grill",   label:"ย่าง/นึ่ง", icon:"🔥", colorVar:"warning"  },
  { id:"fry",     label:"ทอด",       icon:"🍟", colorVar:"warning"  },
  { id:"salad",   label:"สลัด/ยำ",   icon:"🥗", colorVar:"success"  },
  { id:"dessert", label:"ของหวาน",   icon:"🍨", colorVar:"accent"   },
  { id:"drinks",  label:"เครื่องดื่ม",icon:"🧋", colorVar:"accent"   },
  { id:"rice",    label:"ข้าว",       icon:"🍚", colorVar:"primary"  },
];

const STOCK_ALERTS = [
  { ingredient:"กุ้ง",    remaining:"1.8 kg",    menus:["ต้มยำกุ้ง","ผัดไทยกุ้งสด","ข้าวผัดกุ้ง"], status:"low",      ordersLeft:6 },
  { ingredient:"กะทิ",    remaining:"0.3 ลิตร", menus:["แกงเขียวหวาน","ข้าวเหนียวมะม่วง"],          status:"critical", ordersLeft:1 },
  { ingredient:"มะม่วง",  remaining:"4 ลูก",    menus:["ข้าวเหนียวมะม่วง"],                          status:"low",      ordersLeft:2 },
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Station color helper ───────────────────────────────────
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

// ── Order Card ────────────────────────────────────────────
function OrderCard({ order, onUpdateStatus, onToggleItem, onToggleRush }: {
  order: KDSOrder;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onToggleItem: (id: string, idx: number) => void;
  onToggleRush: (id: string) => void;
}) {
  const isNew     = order.status === "new";
  const isCooking = order.status === "cooking";
  const isReady   = order.status === "ready";
  const isLate    = order.time > 600 && !isReady;
  const isRush    = order.rush || order.priority === "high";
  const allDone   = order.items.every(i => i.done);
  const doneCount = order.items.filter(i => i.done).length;

  const cardBorder = isReady
    ? "border-success/60 shadow-[0_0_20px_hsl(var(--success)/0.12)]"
    : isNew
    ? "border-danger/60 shadow-[0_0_20px_hsl(var(--danger)/0.15)] animate-pulse"
    : isLate
    ? "border-danger/50"
    : isRush
    ? "border-warning/60"
    : "border-border";

  const headerBg = isReady
    ? "bg-success/8"
    : isNew
    ? "bg-danger/8"
    : "bg-card";

  return (
    <div className={cn("bg-card border-2 rounded-2xl overflow-hidden transition-all duration-200", cardBorder)}>
      {/* Header */}
      <div className={cn("px-4 py-2.5 border-b border-border flex items-center justify-between", headerBg)}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-black text-[17px] text-foreground">{order.id}</span>
          {order.type === "delivery" && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-success/10 text-success border border-success/30">
              🛵 {order.platform ?? "Delivery"}
            </span>
          )}
          {isRush && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-danger/10 text-danger border border-danger/30 shadow-[0_0_8px_hsl(var(--danger)/0.3)]">
              ⚡ RUSH
            </span>
          )}
          {isLate && !isReady && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-danger/15 text-danger border border-danger/40">
              🔴 ล่าช้า!
            </span>
          )}
        </div>
        <span className={cn(
          "font-mono text-[15px] font-extrabold tabular-nums",
          isReady ? "text-success" : order.time > 600 ? "text-danger" : order.time > 300 ? "text-warning" : "text-foreground"
        )}>
          ⏱ {formatTime(order.time)}
        </span>
      </div>

      {/* Table row */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-foreground">
            {order.type === "delivery" ? "🛵" : "🪑"} {order.table}
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
          <span className="text-[10px] text-muted-foreground tabular-nums">{doneCount}/{order.items.length}</span>
          <div className="w-12 h-1.5 rounded-full bg-border overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-300", allDone ? "bg-success" : "bg-warning")}
              style={{ width: `${(doneCount / order.items.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-1">
        {order.items.map((item, i) => {
          const stockAlert = STOCK_ALERTS.find(sa => sa.menus.includes(item.name) && sa.status === "critical");
          const st = STATIONS.find(s => s.id === item.station);
          return (
            <div key={i} onClick={() => onToggleItem(order.id, i)}
              className={cn(
                "flex items-center gap-2.5 py-2 cursor-pointer select-none transition-opacity",
                i < order.items.length - 1 && "border-b border-border",
                item.done && "opacity-40"
              )}>
              {/* Checkbox */}
              <div className={cn(
                "w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black border-2 transition-all shrink-0",
                item.done ? "bg-success border-success text-white" : "border-border bg-background"
              )}>
                {item.done && "✓"}
              </div>
              {/* Station */}
              {st && (
                <span className={cn("px-1.5 py-0.5 rounded-md text-[10px] font-bold border shrink-0", stationColor(st.colorVar))}>
                  {st.icon}
                </span>
              )}
              {/* Detail */}
              <div className="flex-1 min-w-0">
                <span className={cn(
                  "text-[13px] font-bold",
                  item.done ? "line-through text-muted-foreground" : "text-foreground"
                )}>
                  {item.name} <span className="font-mono text-accent">×{item.qty}</span>
                </span>
                {item.mods.length > 0 && (
                  <div className="text-[10px] text-warning font-semibold mt-0.5">⚠️ {item.mods.join(", ")}</div>
                )}
                {stockAlert && (
                  <div className="text-[10px] text-danger font-bold mt-0.5">
                    🚨 วัตถุดิบใกล้หมด! เหลือ {stockAlert.ordersLeft} ออเดอร์
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="px-3 py-3 flex gap-2">
        {isNew && (
          <button onClick={() => onUpdateStatus(order.id, "cooking")}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white bg-warning hover:opacity-90 transition-opacity">
            🔥 เริ่มทำ
          </button>
        )}
        {isCooking && !allDone && (
          <button onClick={() => onToggleRush(order.id)}
            className={cn(
              "px-3 py-2.5 rounded-xl text-[12px] font-bold border transition-all",
              isRush ? "border-danger/50 bg-danger/10 text-danger" : "border-border text-muted-foreground hover:border-border-light"
            )}>
            {isRush ? "⚡ Rush!" : "⚡"}
          </button>
        )}
        {isCooking && allDone && (
          <button onClick={() => onUpdateStatus(order.id, "ready")}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white bg-success hover:opacity-90 transition-opacity shadow-[0_4px_16px_hsl(var(--success)/0.3)]">
            ✅ พร้อมเสิร์ฟ
          </button>
        )}
        {isReady && (
          <button onClick={() => onUpdateStatus(order.id, "served")}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white gradient-primary shadow-primary hover:opacity-90 transition-opacity">
            🍽 เสิร์ฟแล้ว
          </button>
        )}
        {(isNew || isCooking) && (
          <button className="px-3 py-2.5 rounded-xl text-[12px] border border-border text-muted-foreground hover:border-border-light transition-colors">
            🖨
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main KDS ──────────────────────────────────────────────
export function KDSScreen() {
  const [orders, setOrders] = useState<KDSOrder[]>(INITIAL_ORDERS);
  const [station, setStation] = useState("all");
  const [showStock, setShowStock] = useState(false);

  // Live timer
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders(prev => prev.map(o =>
        o.status !== "ready" && o.status !== "served" ? { ...o, time: o.time + 1 } : o
      ));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = (id: string, status: OrderStatus) =>
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));

  const toggleItem = (orderId: string, itemIdx: number) =>
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const items = o.items.map((it, i) => i === itemIdx ? { ...it, done: !it.done } : it);
      return { ...o, items };
    }));

  const toggleRush = (id: string) =>
    setOrders(prev => prev.map(o => o.id === id ? { ...o, rush: !o.rush } : o));

  // Filter & sort
  const active = orders.filter(o => o.status !== "served");
  const filtered = station === "all"
    ? active
    : active.filter(o => o.items.some(it => it.station === station));

  const sorted = [...filtered].sort((a, b) => {
    if (a.rush && !b.rush) return -1;
    if (!a.rush && b.rush) return 1;
    if (a.status === "new" && b.status !== "new") return -1;
    if (a.status !== "new" && b.status === "new") return 1;
    if (a.status === "ready" && b.status !== "ready") return 1;
    return b.time - a.time;
  });

  const newCount     = active.filter(o => o.status === "new").length;
  const cookingCount = active.filter(o => o.status === "cooking").length;
  const readyCount   = active.filter(o => o.status === "ready").length;
  const lateCount    = active.filter(o => o.time > 600 && o.status !== "ready").length;
  const avgMin       = active.length > 0
    ? Math.round(active.reduce((s, o) => s + o.time, 0) / active.length / 60)
    : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">

      {/* ── Top bar ── */}
      <div className="px-5 py-3 bg-card border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white font-extrabold text-[16px] shadow-primary">K</div>
          <div>
            <div className="text-[15px] font-extrabold text-gradient-primary leading-tight">POSAI Kitchen Display</div>
            <div className="text-[10px] text-muted-foreground">Smart KDS · เชื่อมสต๊อก · จัดลำดับอัตโนมัติ · แจ้งเตือนล่าช้า</div>
          </div>
        </div>

        {/* Live stats */}
        <div className="flex gap-2">
          {[
            { label: "ใหม่",        val: newCount,         color: "danger",  glow: newCount > 0    },
            { label: "กำลังทำ",     val: cookingCount,     color: "warning", glow: false           },
            { label: "พร้อมเสิร์ฟ", val: readyCount,       color: "success", glow: readyCount > 0  },
            { label: "ล่าช้า",       val: lateCount,        color: "danger",  glow: lateCount > 0   },
            { label: "เวลาเฉลี่ย",  val: `${avgMin}m`,     color: avgMin > 8 ? "danger" : "accent", glow: false },
          ].map((s, i) => (
            <div key={i} className={cn(
              "px-3 py-1.5 rounded-xl text-center border transition-all",
              s.glow
                ? s.color === "danger" ? "bg-danger/10 border-danger/40 shadow-[0_0_12px_hsl(var(--danger)/0.2)]"
                                       : "bg-success/10 border-success/40"
                : "bg-background border-border"
            )}>
              <div className="text-[9px] text-muted-foreground font-semibold">{s.label}</div>
              <div className={cn(
                "font-mono text-[17px] font-black tabular-nums",
                s.color === "danger" ? "text-danger" : s.color === "warning" ? "text-warning" :
                s.color === "success" ? "text-success" : "text-accent"
              )}>{s.val}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowStock(!showStock)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[12px] font-bold border transition-all",
              showStock ? "border-warning/50 bg-warning/10 text-warning" : "border-border text-muted-foreground hover:border-border-light"
            )}>
            📦 สต๊อก
            {STOCK_ALERTS.some(s => s.status === "critical") && (
              <span className="ml-1 text-danger">●</span>
            )}
          </button>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-success/10 text-success border border-success/30 shadow-[0_0_10px_hsl(var(--success)/0.2)]">
            🔴 LIVE
          </span>
        </div>
      </div>

      {/* ── Station filter ── */}
      <div className="px-4 py-2.5 border-b border-border bg-card flex items-center gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
        {STATIONS.map(s => {
          const count = s.id === "all"
            ? active.length
            : active.filter(o => o.items.some(it => it.station === s.id)).length;
          const colorCls = stationColor(s.colorVar);
          return (
            <button key={s.id} onClick={() => setStation(s.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border-2 whitespace-nowrap shrink-0 transition-all",
                station === s.id ? colorCls : "border-border text-muted-foreground hover:border-border-light"
              )}>
              {s.icon} {s.label}
              {count > 0 && (
                <span className={cn(
                  "px-1.5 rounded-full text-[10px] font-extrabold font-mono",
                  station === s.id ? "" : "text-muted-foreground"
                )}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Stock alert panel ── */}
      {showStock && (
        <div className="px-4 py-3 border-b border-border bg-warning/5 flex gap-3 overflow-x-auto scrollbar-hide shrink-0">
          {STOCK_ALERTS.map((sa, i) => (
            <div key={i} className={cn(
              "px-4 py-3 rounded-xl border shrink-0 min-w-[210px]",
              sa.status === "critical" ? "bg-danger/8 border-danger/30" : "bg-warning/8 border-warning/30"
            )}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[14px] font-bold text-foreground">{sa.ingredient}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-bold border",
                  sa.status === "critical" ? "bg-danger/10 text-danger border-danger/30" : "bg-warning/10 text-warning border-warning/30"
                )}>
                  {sa.status === "critical" ? "🚨 หมด!" : "⚠️ ใกล้หมด"}
                </span>
              </div>
              <div className="text-[12px] text-muted-foreground mb-1">
                เหลือ <strong className={cn("font-mono", sa.status === "critical" ? "text-danger" : "text-warning")}>{sa.remaining}</strong>
                {" "}· ทำได้อีก <strong className="text-foreground">{sa.ordersLeft}</strong> ออเดอร์
              </div>
              <div className="text-[10px] text-muted-foreground">เมนูที่ใช้: {sa.menus.join(", ")}</div>
            </div>
          ))}
          <button className="px-4 py-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 min-w-[180px] shrink-0 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors">
            <span className="text-[13px] font-bold text-primary">📝 สั่งซื้อวัตถุดิบ</span>
            <span className="text-[11px] text-muted-foreground">สร้าง PO อัตโนมัติ</span>
          </button>
        </div>
      )}

      {/* ── Order board ── */}
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
              <OrderCard
                key={order.id}
                order={order}
                onUpdateStatus={updateStatus}
                onToggleItem={toggleItem}
                onToggleRush={toggleRush}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom performance bar ── */}
      <div className="px-5 py-2.5 bg-card border-t border-border flex items-center justify-between shrink-0">
        <div className="flex gap-5 text-[12px]">
          <span className="text-muted-foreground">📊 วันนี้: เสิร์ฟแล้ว <strong className="text-success font-mono">47</strong> ออเดอร์</span>
          <span className="text-muted-foreground">⏱ เวลาเฉลี่ย <strong className="text-accent font-mono">6.2 นาที</strong></span>
          <span className="text-muted-foreground">🎯 ตรงเวลา <strong className="text-success font-mono">94%</strong></span>
          <span className="text-muted-foreground">❌ ออเดอร์ผิด <strong className="text-success font-mono">0</strong></span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span>🔊 เสียงแจ้งเตือน</span>
          <div className="w-9 h-5 rounded-full bg-success/20 relative cursor-pointer">
            <div className="w-3.5 h-3.5 rounded-full bg-success absolute top-0.5 right-0.5 shadow-[0_0_6px_hsl(var(--success)/0.5)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
