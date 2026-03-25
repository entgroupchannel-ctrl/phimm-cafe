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
const CATS   = ["ทั้งหมด", "ยอดนิยม", "อาหารจานเดียว", "เครื่องดื่ม", "ของหวาน"];

export function OrderScreen({ cart, setCart, onPay }: OrderScreenProps) {
  const [activeCat, setActiveCat]   = useState("ทั้งหมด");
  const [activeTable, setActiveTable] = useState("T3");

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

      {/* ── Left: Menu ── */}
      <div className="flex-1 flex flex-col px-6 py-5 overflow-hidden bg-background">

        {/* Table selector */}
        <div className="flex items-center gap-3 mb-4">
          <div className="gradient-primary px-4 py-2 rounded-xl text-[14px] font-bold text-white shadow-primary">
            โต๊ะ {activeTable}
          </div>
          <div className="flex gap-2">
            {TABLES.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTable(t)}
                className={cn(
                  "w-10 h-10 rounded-xl text-[12px] font-semibold border transition-all duration-150",
                  t === activeTable
                    ? "border-primary/40 bg-primary/8 text-primary shadow-[0_2px_8px_hsl(var(--primary)/0.15)]"
                    : "border-border bg-card text-muted-foreground hover:border-border-light hover:text-foreground shadow-card"
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
                "px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all duration-150",
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

      {/* ── Right: Cart ── */}
      <div className="w-[300px] bg-surface border-l border-border flex flex-col p-5 shadow-[-4px_0_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[15px] font-bold text-foreground">🧾 ออเดอร์ปัจจุบัน</span>
          <POSBadge color="accent">{cart.length} รายการ</POSBadge>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-[14px]">
              <div className="text-3xl mb-3 opacity-40">🛒</div>
              แตะเมนูเพื่อเพิ่มออเดอร์
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3 border-b border-border/60 animate-fade-in">
                <span className="text-2xl">{item.img}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate text-foreground">{item.name}</div>
                  <div className="text-[12px] text-muted-foreground font-mono">฿{item.price} × {item.qty}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="w-7 h-7 rounded-lg border border-border bg-muted text-muted-foreground flex items-center justify-center text-sm hover:border-border-light hover:text-foreground transition-colors"
                  >−</button>
                  <span className="font-mono font-bold text-[13px] w-5 text-center tabular-nums text-foreground">{item.qty}</span>
                  <button
                    onClick={() => addToCart(item)}
                    className="w-7 h-7 rounded-lg gradient-primary text-white flex items-center justify-center text-sm shadow-primary"
                  >+</button>
                </div>
                <div className="font-mono font-bold text-[13px] text-accent min-w-[48px] text-right tabular-nums">
                  ฿{item.price * item.qty}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border space-y-3 mt-2">
          <div className="flex justify-between text-[13px] text-muted-foreground">
            <span>รวม {totalQty} ชิ้น</span>
            <span>ก่อน VAT</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[16px] font-bold text-foreground">ยอดรวม</span>
            <span className="font-mono text-[24px] font-extrabold text-accent tabular-nums">฿{total.toLocaleString()}</span>
          </div>
          <button
            onClick={onPay}
            className="w-full py-3.5 rounded-xl gradient-primary text-white font-bold text-[15px] shadow-primary hover:shadow-primary-lg transition-shadow"
          >
            💳 ชำระเงิน
          </button>
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 rounded-xl border border-border bg-muted text-muted-foreground text-[13px] font-medium hover:border-border-light hover:text-foreground transition-colors">
              🖨 พิมพ์
            </button>
            <button className="flex-1 py-2.5 rounded-xl border border-border bg-muted text-muted-foreground text-[13px] font-medium hover:border-border-light hover:text-foreground transition-colors">
              📤 พักบิล
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
