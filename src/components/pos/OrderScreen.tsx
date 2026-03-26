import { useState } from "react";
import { menuItems, MenuItem } from "@/data/pos-data";
import { cn } from "@/lib/utils";
import { Search, Minus, Plus, Trash2, ChefHat, Receipt, ChevronLeft } from "lucide-react";

export type CartItem = MenuItem & { qty: number };

interface OrderScreenProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onPay?: () => void;
  onBack?: () => void;
  tableLabel?: string;
}

const CATS = [
  { key: "ทั้งหมด",     label: "ทั้งหมด"       },
  { key: "ยอดนิยม",     label: "อาหารจานหลัก"   },
  { key: "เครื่องดื่ม", label: "เครื่องดื่ม"    },
  { key: "ของทานเล่น",  label: "ของทานเล่น"    },
  { key: "ของหวาน",     label: "ของหวาน"        },
];

const SERVED_ITEMS = [
  { id: 101, name: "ปอเปี๊ยะทอด",         nameEn: "Fried Spring Rolls",        price: 90,  qty: 1 },
  { id: 102, name: "ข้าวผัดกะเพราหมูสับ",  nameEn: "Basil Pork Fried Rice",     price: 80,  qty: 1 },
  { id: 103, name: "น้ำมะนาว",             nameEn: "Lime Juice",                price: 50,  qty: 2 },
  { id: 104, name: "บัวลอยน้ำขิง",         nameEn: "Glutinous Rice Balls",      price: 70,  qty: 1 },
  { id: 105, name: "ผัดไทยกุ้งสด",         nameEn: "Pad Thai with Shrimp",      price: 180, qty: 1 },
  { id: 106, name: "ยำวุ้นเส้นทะเล",       nameEn: "Seafood Glass Noodle Salad",price: 220, qty: 1 },
];

export function OrderScreen({ cart, setCart, onPay, onBack, tableLabel = "3" }: OrderScreenProps) {
  const [activeCat, setActiveCat] = useState("ทั้งหมด");
  const [search, setSearch]       = useState("");

  const filtered = menuItems.filter(item => {
    const matchCat    = activeCat === "ทั้งหมด" || activeCat === "ยอดนิยม" || item.cat === activeCat;
    const matchSearch = search === "" || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addToCart = (item: MenuItem) =>
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id);
      if (ex) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });

  const removeFromCart = (id: number) =>
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c).filter(c => c.qty > 0));

  const deleteFromCart = (id: number) =>
    setCart(prev => prev.filter(c => c.id !== id));

  const servedTotal = SERVED_ITEMS.reduce((s, i) => s + i.price * i.qty, 0);
  const cartTotal   = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const grandTotal  = servedTotal + cartTotal;
  const totalQty    = SERVED_ITEMS.reduce((s, i) => s + i.qty, 0) + cart.reduce((s, c) => s + c.qty, 0);

  return (
    <div className="flex flex-1 overflow-hidden bg-background">

      {/* ─── LEFT: Menu panel ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">

        {/* Search */}
        <div className="px-4 py-3 border-b border-border bg-[hsl(var(--surface))]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาเมนู / Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-border bg-muted/60 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 overflow-x-auto scrollbar-hide bg-[hsl(var(--surface))]">
          {CATS.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCat(cat.key)}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all duration-150 select-none active:scale-[0.97]",
                activeCat === cat.key
                  ? "bg-primary text-white border-transparent shadow-[0_2px_8px_hsl(var(--primary)/0.28)]"
                  : "bg-muted/60 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Menu grid */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {filtered.map(item => {
              const inCart = cart.find(c => c.id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={cn(
                    "relative flex flex-col items-start text-left p-3.5 rounded-2xl border transition-all duration-150 select-none active:scale-[0.97]",
                    "bg-[hsl(var(--surface))] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.04)]",
                    inCart
                      ? "border-primary/40 shadow-[0_0_0_2px_hsl(var(--primary)/0.15),0_4px_12px_rgba(0,0,0,0.06)]"
                      : "border-border hover:border-border-light hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                  )}
                >
                  {inCart && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-[0_2px_6px_hsl(var(--primary)/0.4)] z-10">
                      {inCart.qty}
                    </span>
                  )}
                  {item.popular && (
                    <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.25)] leading-none">
                      วันนี้
                    </span>
                  )}
                  <span className="text-[28px] leading-none mb-2">{item.img}</span>
                  <div className="text-[13px] font-bold text-foreground leading-tight mb-0.5 line-clamp-2">{item.name}</div>
                  <div className="text-[10px] text-muted-foreground mb-2 truncate w-full">{item.cat}</div>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono font-bold text-[14px] tabular-nums" style={{ color: "hsl(var(--primary))" }}>
                      ฿{item.price}.00
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">{item.popular ? "10น." : "5น."}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── RIGHT: Order panel ────────────────────────────────── */}
      <div className="w-[340px] shrink-0 flex flex-col bg-[hsl(var(--surface))] border-l border-border">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors shrink-0"
              title="กลับหน้าโต๊ะ"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-black text-foreground">โต๊ะ {tableLabel}</span>
                <span className="text-[11px] text-muted-foreground font-medium">/ โต๊ะ {tableLabel}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                <span>👥 4 คน</span>
                <span>🕐 156ชม. 22น.</span>
                <span>{totalQty} รายการ</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="h-8 px-3 rounded-xl border border-border bg-muted text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              🔗 Party
            </button>
            <button className="h-8 px-3 rounded-xl border border-border bg-muted text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              🔄 ย้ายโต๊ะ
            </button>
          </div>
        </div>

        {/* Order list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {SERVED_ITEMS.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-foreground truncate">{item.name}</div>
                <div className="text-[11px] text-muted-foreground">{item.nameEn}</div>
              </div>
              <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[hsl(142_64%_38%/0.12)] text-[hsl(142_64%_35%)] border border-[hsl(142_64%_38%/0.25)]">
                เสิร์ฟแล้ว
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-6 h-6 flex items-center justify-center rounded-full border border-border bg-muted text-muted-foreground text-[12px] font-bold">−</span>
                <span className="w-5 text-center font-mono font-bold text-[13px] tabular-nums">{item.qty}</span>
                <span className="w-6 h-6 flex items-center justify-center rounded-full border border-border bg-muted text-muted-foreground text-[12px] font-bold">+</span>
              </div>
              <div className="font-mono font-bold text-[13px] tabular-nums text-foreground w-16 text-right shrink-0">
                ฿{(item.price * item.qty).toLocaleString()}.00
              </div>
            </div>
          ))}

          {cart.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-[hsl(var(--primary)/0.03)]">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-foreground truncate">{item.name}</div>
                <div className="text-[11px] text-muted-foreground">฿{item.price} / รายการ</div>
              </div>
              <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.25)]">
                ใหม่
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => removeFromCart(item.id)}
                  className="w-6 h-6 flex items-center justify-center rounded-full border border-border bg-muted text-muted-foreground hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))] transition-colors">
                  <Minus size={11} />
                </button>
                <span className="w-5 text-center font-mono font-bold text-[13px] tabular-nums">{item.qty}</span>
                <button onClick={() => addToCart(item)}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white shadow-[0_1px_4px_hsl(var(--primary)/0.35)]">
                  <Plus size={11} />
                </button>
              </div>
              <div className="font-mono font-bold text-[13px] tabular-nums text-foreground w-16 text-right shrink-0">
                ฿{(item.price * item.qty).toLocaleString()}.00
              </div>
              <button onClick={() => deleteFromCart(item.id)} className="text-muted-foreground/40 hover:text-[hsl(var(--danger))] transition-colors shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {cart.length === 0 && SERVED_ITEMS.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-3 opacity-20">🛒</div>
              <div className="text-[12px]">แตะเมนูเพื่อเพิ่มออเดอร์</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pt-3 pb-4 border-t border-border/60 space-y-3 bg-[hsl(var(--surface))]">
          <div className="flex justify-between items-baseline">
            <span className="text-[12px] text-muted-foreground">ยอดรวม / Subtotal</span>
            <span className="font-mono text-[22px] font-black tabular-nums text-foreground">
              ฿{grandTotal.toLocaleString()}.00
            </span>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 h-12 rounded-2xl bg-[hsl(211_100%_50%/0.12)] text-primary border border-[hsl(211_100%_50%/0.25)] font-semibold text-[13px] flex items-center justify-center gap-2 hover:bg-[hsl(211_100%_50%/0.18)] transition-colors active:scale-[0.98]">
              <ChefHat size={16} />
              ส่งครัว / Send to Kitchen
            </button>
            <button
              onClick={onPay}
              className="flex-1 h-12 rounded-2xl bg-[hsl(38_92%_50%)] text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-[0_4px_16px_hsl(38_92%_50%/0.35)] hover:bg-[hsl(38_92%_45%)] transition-colors active:scale-[0.98]"
            >
              <Receipt size={16} />
              เช็คบิล / Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
