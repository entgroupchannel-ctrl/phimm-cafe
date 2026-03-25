import { useState } from "react";
import { menuItems, MenuItem } from "@/data/pos-data";
import { POSBadge } from "./POSBadge";
import { cn } from "@/lib/utils";

export type CartItem = MenuItem & { qty: number };

interface OrderScreenProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onPay?: () => void;
}

const CATS = ["ทั้งหมด", "ยอดนิยม", "อาหารจานเดียว", "เครื่องดื่ม", "ของหวาน"];

// ── Floor plan data ──────────────────────────────────────────
type TableStatus = "empty" | "occupied" | "reserved";

interface FloorTable {
  id: string;
  x: number; y: number;   // percent
  w: number; h: number;   // percent
  seats: number;
  shape: "rect" | "round";
  status: TableStatus;
  order?: string;
}

const FLOOR_TABLES: FloorTable[] = [
  { id: "T1", x:  5, y: 8,  w: 13, h: 16, seats: 4, shape: "rect",  status: "empty"    },
  { id: "T2", x: 22, y: 8,  w: 13, h: 16, seats: 4, shape: "rect",  status: "reserved" },
  { id: "T3", x: 39, y: 8,  w: 13, h: 16, seats: 4, shape: "rect",  status: "occupied", order: "฿317" },
  { id: "T4", x: 56, y: 8,  w: 13, h: 16, seats: 4, shape: "rect",  status: "empty"    },
  { id: "T5", x: 75, y: 7,  w: 10, h: 10, seats: 2, shape: "round", status: "occupied", order: "฿179" },
  { id: "T6", x:  5, y: 42, w: 10, h: 10, seats: 2, shape: "round", status: "empty"    },
  { id: "T7", x: 22, y: 38, w: 13, h: 16, seats: 4, shape: "rect",  status: "occupied", order: "฿264" },
  { id: "T8", x: 39, y: 38, w: 13, h: 16, seats: 4, shape: "rect",  status: "reserved" },
  { id: "T9", x: 56, y: 38, w: 18, h: 16, seats: 6, shape: "rect",  status: "empty"    },
  { id: "T10",x: 77, y: 38, w: 10, h: 10, seats: 2, shape: "round", status: "empty"    },
];

const STATUS_STYLE: Record<TableStatus, { bg: string; border: string; text: string; badge: string }> = {
  empty:    { bg: "bg-success/10",  border: "border-success/40",  text: "text-success",  badge: "bg-success/15  text-success  border-success/30"  },
  occupied: { bg: "bg-warning/10",  border: "border-warning/50",  text: "text-warning",  badge: "bg-warning/15  text-warning  border-warning/30"  },
  reserved: { bg: "bg-primary/8",   border: "border-primary/40",  text: "text-primary",  badge: "bg-primary/12  text-primary  border-primary/30"  },
};

const STATUS_LABEL: Record<TableStatus, string> = {
  empty: "ว่าง", occupied: "มีลูกค้า", reserved: "จอง",
};

// ── Floor Map Component ──────────────────────────────────────
function FloorMap({
  activeTable,
  onSelect,
  onClose,
}: {
  activeTable: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const counts = {
    empty:    FLOOR_TABLES.filter((t) => t.status === "empty").length,
    occupied: FLOOR_TABLES.filter((t) => t.status === "occupied").length,
    reserved: FLOOR_TABLES.filter((t) => t.status === "reserved").length,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background px-5 py-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-foreground">🗺 แผนผังร้าน</span>
          <span className="text-[12px] text-muted-foreground">— กินดี สุขุมวิท</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-2.5 text-[12px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-success/30 border border-success/50 inline-block" />
              <span className="text-muted-foreground">ว่าง ({counts.empty})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-warning/30 border border-warning/50 inline-block" />
              <span className="text-muted-foreground">มีลูกค้า ({counts.occupied})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary/20 border border-primary/40 inline-block" />
              <span className="text-muted-foreground">จอง ({counts.reserved})</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground text-[12px] font-medium hover:text-foreground hover:border-border-light transition-colors"
          >
            ← กลับเมนู
          </button>
        </div>
      </div>

      {/* Floor plan */}
      <div className="flex-1 relative rounded-2xl border border-border overflow-hidden"
        style={{ background: "hsl(var(--surface-alt))" }}>

        {/* Room grid pattern */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,hsl(var(--foreground)) 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,hsl(var(--foreground)) 0 1px,transparent 1px 40px)" }} />

        {/* Kitchen zone */}
        <div className="absolute right-0 top-0 bottom-0 w-[13%] bg-muted/60 border-l border-dashed border-border flex flex-col items-center justify-center gap-1">
          <span className="text-[20px]">👨‍🍳</span>
          <span className="text-[10px] font-semibold text-muted-foreground tracking-wide">ครัว</span>
        </div>

        {/* Entrance */}
        <div className="absolute bottom-0 left-[38%] right-[38%] h-[7%] bg-success/8 border border-dashed border-success/30 rounded-t-xl flex items-center justify-center">
          <span className="text-[10px] font-semibold text-success/60 tracking-widest">ENTRANCE</span>
        </div>

        {/* Bar counter */}
        <div className="absolute top-0 left-0 w-[2%] h-[32%] bg-muted/50 border-r border-dashed border-border" />

        {/* Tables */}
        {FLOOR_TABLES.map((table) => {
          const style = STATUS_STYLE[table.status];
          const isActive = activeTable === table.id;
          const isRound = table.shape === "round";

          return (
            <button
              key={table.id}
              onClick={() => { onSelect(table.id); onClose(); }}
              className={cn(
                "absolute flex flex-col items-center justify-center gap-0.5 border-2 transition-all duration-200 group",
                isRound ? "rounded-full" : "rounded-xl",
                style.bg, style.border,
                isActive && "ring-2 ring-offset-2 ring-primary ring-offset-surface-alt scale-105 shadow-primary z-10",
                !isActive && "hover:scale-105 hover:shadow-card-hover hover:z-10",
              )}
              style={{
                left:   `${table.x}%`,
                top:    `${table.y}%`,
                width:  `${table.w}%`,
                height: `${table.h}%`,
              }}
            >
              <span className={cn("text-[11px] font-extrabold tracking-tight", style.text)}>
                {table.id}
              </span>
              <span className="text-[9px] text-muted-foreground/70">{table.seats} ที่นั่ง</span>
              {table.order && (
                <span className={cn("text-[9px] font-bold px-1 py-px rounded border mt-0.5", style.badge)}>
                  {table.order}
                </span>
              )}
              {isActive && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full gradient-primary border-2 border-card shadow-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main OrderScreen ─────────────────────────────────────────
export function OrderScreen({ cart, setCart, onPay }: OrderScreenProps) {
  const [activeCat, setActiveCat]     = useState("ทั้งหมด");
  const [activeTable, setActiveTable] = useState("T3");
  const [showMap, setShowMap]         = useState(false);

  const TABLES = FLOOR_TABLES.map((t) => t.id);
  const activeFloor = FLOOR_TABLES.find((t) => t.id === activeTable);

  const filtered =
    activeCat === "ทั้งหมด"   ? menuItems
    : activeCat === "ยอดนิยม" ? menuItems.filter((m) => m.popular)
    : menuItems.filter((m) => m.cat === activeCat);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.id === item.id);
      if (ex) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id: number) =>
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, qty: c.qty - 1 } : c).filter((c) => c.qty > 0));

  const total    = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const totalQty = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ── Left: Menu or Map ── */}
      {showMap ? (
        <FloorMap
          activeTable={activeTable}
          onSelect={setActiveTable}
          onClose={() => setShowMap(false)}
        />
      ) : (
        <div className="flex-1 flex flex-col px-5 py-4 overflow-hidden bg-background">

          {/* Table selector */}
          <div className="flex items-center gap-2 mb-3">
            {/* Active table pill */}
            <button
              onClick={() => setShowMap(true)}
              className="flex items-center gap-2 gradient-primary px-3.5 py-2 rounded-xl text-[13px] font-bold text-white shadow-primary hover:shadow-primary-lg transition-shadow shrink-0"
            >
              <span>โต๊ะ {activeTable}</span>
              {activeFloor && (
                <span className={cn(
                  "text-[9px] font-semibold px-1.5 py-px rounded border leading-tight",
                  activeFloor.status === "empty"    && "bg-white/20 border-white/30",
                  activeFloor.status === "occupied" && "bg-warning/30 border-warning/50",
                  activeFloor.status === "reserved" && "bg-primary/30 border-primary/50",
                )}>
                  {STATUS_LABEL[activeFloor.status]}
                </span>
              )}
              <span className="text-white/70 text-[11px]">🗺</span>
            </button>

            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {TABLES.map((t) => {
                const tf = FLOOR_TABLES.find((f) => f.id === t)!;
                return (
                  <button
                    key={t}
                    onClick={() => setActiveTable(t)}
                    className={cn(
                      "w-10 h-9 rounded-xl text-[12px] font-semibold border transition-all duration-150 shrink-0 relative",
                      t === activeTable
                        ? "border-primary/40 bg-primary/8 text-primary shadow-[0_2px_8px_hsl(var(--primary)/0.15)]"
                        : "border-border bg-card text-muted-foreground hover:border-border-light hover:text-foreground shadow-card"
                    )}
                  >
                    {t}
                    <span className={cn(
                      "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                      tf.status === "empty"    && "bg-success",
                      tf.status === "occupied" && "bg-warning",
                      tf.status === "reserved" && "bg-primary",
                    )} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-[12px] font-semibold border transition-all duration-150",
                  activeCat === c
                    ? "border-primary/40 bg-primary/8 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-light shadow-card"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          <div
            className="grid gap-2 overflow-y-auto flex-1 scrollbar-hide pb-2 content-start"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}
          >
            {filtered.map((item) => {
              const inCart = cart.find((c) => c.id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={cn(
                    "relative bg-card border rounded-xl px-3 py-3 flex flex-col items-center gap-1.5 transition-all duration-150 h-[110px] justify-center",
                    inCart
                      ? "border-primary/40 shadow-primary bg-primary/[0.03]"
                      : "border-border hover:border-border-light hover:shadow-card-hover shadow-card"
                  )}
                >
                  {inCart && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full gradient-primary text-white text-[10px] font-extrabold flex items-center justify-center shadow-primary z-10">
                      {inCart.qty}
                    </span>
                  )}
                  {item.popular && (
                    <span className="absolute top-1.5 left-1.5">
                      <POSBadge color="warning" className="text-[9px] py-px px-1.5">HOT</POSBadge>
                    </span>
                  )}
                  <span className="text-[28px] leading-none">{item.img}</span>
                  <span className="text-[12px] font-semibold text-center leading-tight text-foreground">{item.name}</span>
                  <span className="font-mono text-[13px] font-bold text-accent">฿{item.price}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Right: Cart ── */}
      <div className="w-[280px] bg-surface border-l border-border flex flex-col p-4 shadow-[-4px_0_20px_-4px_rgba(0,0,0,0.05)] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[14px] font-bold text-foreground">🧾 ออเดอร์ปัจจุบัน</span>
          <POSBadge color="accent">{cart.length} รายการ</POSBadge>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-[13px]">
              <div className="text-3xl mb-2 opacity-40">🛒</div>
              แตะเมนูเพื่อเพิ่มออเดอร์
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 py-2.5 border-b border-border/60 animate-fade-in">
                <span className="text-xl">{item.img}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold truncate text-foreground">{item.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">฿{item.price} × {item.qty}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="w-6 h-6 rounded-lg border border-border bg-muted text-muted-foreground flex items-center justify-center text-xs hover:border-border-light hover:text-foreground transition-colors"
                  >−</button>
                  <span className="font-mono font-bold text-[12px] w-4 text-center tabular-nums text-foreground">{item.qty}</span>
                  <button
                    onClick={() => addToCart(item)}
                    className="w-6 h-6 rounded-lg gradient-primary text-white flex items-center justify-center text-xs shadow-primary"
                  >+</button>
                </div>
                <div className="font-mono font-bold text-[12px] text-accent min-w-[44px] text-right tabular-nums">
                  ฿{item.price * item.qty}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border space-y-2.5 mt-1">
          <div className="flex justify-between text-[12px] text-muted-foreground">
            <span>รวม {totalQty} ชิ้น</span>
            <span>ก่อน VAT</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[15px] font-bold text-foreground">ยอดรวม</span>
            <span className="font-mono text-[22px] font-extrabold text-accent tabular-nums">฿{total.toLocaleString()}</span>
          </div>
          <button
            onClick={onPay}
            className="w-full py-3 rounded-xl gradient-primary text-white font-bold text-[14px] shadow-primary hover:shadow-primary-lg transition-shadow"
          >
            💳 ชำระเงิน
          </button>
          <div className="flex gap-2">
            <button className="flex-1 py-2 rounded-xl border border-border bg-muted text-muted-foreground text-[12px] font-medium hover:border-border-light hover:text-foreground transition-colors">
              🖨 พิมพ์
            </button>
            <button className="flex-1 py-2 rounded-xl border border-border bg-muted text-muted-foreground text-[12px] font-medium hover:border-border-light hover:text-foreground transition-colors">
              📤 พักบิล
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
