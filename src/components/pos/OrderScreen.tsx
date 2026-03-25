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

const TABLES = ["T1", "T2", "T3", "T4", "T5", "T7"];
const CATS = ["ทั้งหมด", "ยอดนิยม", "อาหารจานเดียว", "เครื่องดื่ม", "ของหวาน"];

export function OrderScreen({ cart, setCart, onPay }: OrderScreenProps) {
  const [activeCat, setActiveCat] = useState("ทั้งหมด");
  const [activeTable, setActiveTable] = useState("T3");

  const filtered =
    activeCat === "ทั้งหมด" ? menuItems
    : activeCat === "ยอดนิยม" ? menuItems.filter((m) => m.popular)
    : menuItems.filter((m) => m.cat === activeCat);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart((prev) =>
      prev.map((c) => c.id === id ? { ...c, qty: c.qty - 1 } : c).filter((c) => c.qty > 0)
    );
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const totalQty = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Left: Menu ── */}
      <div className="flex-1 flex flex-col px-6 py-5 overflow-hidden">

        {/* Table selector */}
        <div className="flex items-center gap-3 mb-4">
          <div className="gradient-primary px-3.5 py-1.5 rounded-lg text-sm font-bold text-white shadow-[0_4px_16px_hsl(var(--primary)/0.4)]">
            โต๊ะ {activeTable}
          </div>
          <div className="flex gap-1.5">
            {TABLES.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTable(t)}
                className={cn(
                  "w-9 h-9 rounded-lg text-[11px] font-semibold border transition-all duration-150",
                  t === activeTable
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-border-light hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-[13px] font-semibold border transition-all duration-150",
                activeCat === c
                  ? "border-primary/50 bg-primary/12 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-light"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid gap-2.5 overflow-y-auto flex-1 scrollbar-hide pb-2"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(136px, 1fr))" }}>
          {filtered.map((item) => {
            const inCart = cart.find((c) => c.id === item.id);
            return (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className={cn(
                  "relative bg-card border rounded-2xl p-3.5 flex flex-col items-center gap-1.5 text-left transition-all duration-150 group",
                  inCart
                    ? "border-primary/60 shadow-[0_0_20px_hsl(var(--primary)/0.25)] bg-primary/5"
                    : "border-border hover:border-border-light hover:bg-surface-hover"
                )}
              >
                {/* Cart qty badge */}
                {inCart && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-[11px] font-extrabold flex items-center justify-center shadow-[0_2px_8px_hsl(var(--primary)/0.5)] z-10">
                    {inCart.qty}
                  </span>
                )}
                {/* Hot badge */}
                {item.popular && (
                  <span className="absolute top-1.5 left-1.5">
                    <POSBadge color="warning" className="text-[9px] px-1.5 py-0">HOT</POSBadge>
                  </span>
                )}
                <span className="text-4xl mt-1">{item.img}</span>
                <span className="text-[12px] font-semibold text-center leading-tight text-foreground">{item.name}</span>
                <span className="font-mono text-[14px] font-bold text-accent">฿{item.price}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right: Cart ── */}
      <div className="w-[300px] bg-surface border-l border-border flex flex-col p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[15px] font-bold">🧾 ออเดอร์ปัจจุบัน</span>
          <POSBadge color="accent">{cart.length} รายการ</POSBadge>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-0">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              แตะเมนูเพื่อเพิ่มออเดอร์
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 py-2.5 border-b border-border/50 animate-fade-in">
                <span className="text-2xl">{item.img}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold truncate">{item.name}</div>
                  <div className="text-[11px] text-foreground/40 font-mono">฿{item.price} × {item.qty}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="w-6 h-6 rounded-md border border-border bg-card text-muted-foreground flex items-center justify-center text-sm hover:border-border-light transition-colors"
                  >−</button>
                  <span className="font-mono font-bold text-[13px] w-5 text-center tabular-nums">{item.qty}</span>
                  <button
                    onClick={() => addToCart(item)}
                    className="w-6 h-6 rounded-md bg-primary text-white flex items-center justify-center text-sm hover:bg-primary/90 transition-colors"
                  >+</button>
                </div>
                <div className="font-mono font-bold text-[13px] text-accent min-w-[44px] text-right tabular-nums">
                  ฿{item.price * item.qty}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border space-y-3 mt-2">
          <div className="flex justify-between text-[12px] text-muted-foreground">
            <span>รวม {totalQty} ชิ้น</span>
            <span>ก่อน VAT</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-lg font-bold">ยอดรวม</span>
            <span className="font-mono text-[24px] font-extrabold text-accent tabular-nums">฿{total.toLocaleString()}</span>
          </div>
          <button
            onClick={onPay}
            className="w-full py-3.5 rounded-xl gradient-primary text-white font-bold text-[15px] shadow-[0_4px_24px_hsl(var(--primary)/0.4)] hover:shadow-[0_4px_32px_hsl(var(--primary)/0.6)] transition-shadow"
          >
            💳 ชำระเงิน
          </button>
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 rounded-lg border border-border bg-card text-muted-foreground text-[12px] font-semibold hover:border-border-light hover:text-foreground transition-colors">
              🖨 พิมพ์
            </button>
            <button className="flex-1 py-2.5 rounded-lg border border-border bg-card text-muted-foreground text-[12px] font-semibold hover:border-border-light hover:text-foreground transition-colors">
              📤 พักบิล
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
