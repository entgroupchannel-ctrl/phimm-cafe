import { useState, useEffect, useRef } from "react";
import phimmLogo from "@/assets/phimm-logo.png";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

// ── Types ─────────────────────────────────────────────────
interface KioskMenuItem {
  id: string;
  name: string;
  price: number;
  cat: string;
  img: string;
  cal: number | null;
  popular: boolean;
  allergens: string[];
  desc: string;
}

interface OptionGroup {
  id: string;
  name: string;
  type: string;
  required: boolean;
  menu_options: { id: string; name: string; price_add: number; is_default: boolean; sort_order: number }[];
}

interface CartEntry {
  id: string;
  name: string;
  price: number;
  img: string;
  cat: string;
  qty: number;
  note: string;
  options: { group: string; name: string; price_add: number }[];
  optionsText: string;
  priceAdd: number;
  cartId: number;
}

interface KioskScreenProps {
  tableId?: string | null;
  tableLabel?: string | null;
  isPublic?: boolean;
}

const STEPS = { WELCOME: 0, MENU: 1, PAYMENT: 2, DONE: 3 };

// ── Welcome ───────────────────────────────────────────────
function WelcomeScreen({ onStart, tableLabel }: { onStart: (type: "dinein" | "takeaway") => void; tableLabel?: string | null }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)]" />
      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-6 relative">
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150" />
          <img src={phimmLogo} alt="Phimm Cafe" className="relative w-28 h-28 object-contain drop-shadow-[0_8px_24px_hsl(var(--primary)/0.25)]" />
        </div>
        <h1 className="text-[38px] font-black text-foreground leading-tight mb-1 text-balance">Phimm Cafe</h1>
        {tableLabel && <p className="text-[15px] font-bold text-primary mb-1">📍 {tableLabel}</p>}
        <p className="text-[15px] text-muted-foreground mb-1 tracking-wide">ยินดีต้อนรับ</p>
        <p className="text-[14px] text-muted-foreground mb-10 max-w-sm">
          สั่งอาหาร · จ่ายเงิน · รับอาหาร<br />ทั้งหมดจากหน้าจอนี้ — ไม่ต้องรอพนักงาน
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {!tableLabel && (
            <button onClick={() => onStart("dinein")}
              className="w-full py-4 rounded-2xl text-[16px] font-bold text-white gradient-primary shadow-primary-lg hover:opacity-90 transition-opacity">
              🪑 ทานที่ร้าน
            </button>
          )}
          {tableLabel && (
            <button onClick={() => onStart("dinein")}
              className="w-full py-4 rounded-2xl text-[16px] font-bold text-white gradient-primary shadow-primary-lg hover:opacity-90 transition-opacity">
              🪑 สั่งอาหาร — {tableLabel}
            </button>
          )}
          <button onClick={() => onStart("takeaway")}
            className="w-full py-4 rounded-2xl text-[16px] font-bold text-white bg-accent hover:opacity-90 transition-opacity"
            style={{ boxShadow: "0 4px 20px hsl(var(--accent)/0.35)" }}>
            📦 สั่งกลับบ้าน
          </button>
        </div>
        <div className="flex gap-5 mt-8 text-[11px] text-muted-foreground">
          <span>🌐 EN / 中文 / 日本語</span>
          <span>♿ ช่วยเหลือพิเศษ</span>
        </div>
      </div>
    </div>
  );
}

// ── Customize Modal ───────────────────────────────────────
function CustomizeModal({
  item, optionGroups, onClose, onAdd,
}: {
  item: KioskMenuItem;
  optionGroups: OptionGroup[];
  onClose: () => void;
  onAdd: (entry: Omit<CartEntry, "cartId">) => void;
}) {
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    optionGroups.forEach(g => {
      const defaults = g.menu_options.filter(o => o.is_default).map(o => o.name);
      if (defaults.length > 0) init[g.id] = defaults;
      else if (g.type === 'single' && g.menu_options.length > 0) init[g.id] = [g.menu_options[0].name];
    });
    return init;
  });
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  const selectedOptions: { group: string; name: string; price_add: number }[] = [];
  let priceAdd = 0;
  optionGroups.forEach(g => {
    (selections[g.id] || []).forEach(optName => {
      const opt = g.menu_options.find(o => o.name === optName);
      if (opt) {
        selectedOptions.push({ group: g.name, name: opt.name, price_add: Number(opt.price_add) });
        priceAdd += Number(opt.price_add);
      }
    });
  });

  const total = (item.price + priceAdd) * qty;
  const optionsText = selectedOptions.map(o => o.price_add > 0 ? `${o.name} +฿${o.price_add}` : o.name).join(', ');

  const toggleOption = (groupId: string, optName: string, type: string) => {
    setSelections(prev => {
      const current = prev[groupId] || [];
      if (type === 'single') return { ...prev, [groupId]: [optName] };
      return { ...prev, [groupId]: current.includes(optName) ? current.filter(n => n !== optName) : [...current, optName] };
    });
  };

  const isMobile = useIsMobile();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={cn("bg-card border border-border rounded-3xl w-full shadow-[0_24px_60px_rgba(0,0,0,0.15)] overflow-hidden", isMobile ? "max-w-full mx-2 max-h-[90vh] flex flex-col" : "max-w-2xl")}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
          <button onClick={onClose} className="w-9 h-9 rounded-xl border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-[18px]">←</button>
          <div className="text-[17px] font-bold text-foreground">ปรับแต่ง: {item.name}</div>
        </div>

        <div className={cn("flex gap-0 overflow-hidden", isMobile ? "flex-col flex-1 min-h-0" : "max-h-[70vh]")}>
          <div className={cn("shrink-0 border-border flex flex-col items-center text-center bg-background/50",
            isMobile ? "px-4 py-3 flex-row gap-3 border-b" : "w-52 p-6 border-r")}>
            <div className={cn("leading-none", isMobile ? "text-[40px]" : "text-[64px] mb-3")}>{item.img}</div>
            <div className={cn(isMobile ? "text-left flex-1 min-w-0" : "")}>
              <div className="text-[15px] font-extrabold text-foreground mb-1">{item.name}</div>
              {!isMobile && <div className="text-[12px] text-muted-foreground mb-3">{item.desc}</div>}
              <div className={cn("flex flex-wrap gap-1", isMobile ? "" : "justify-center mb-3")}>
                {item.cal && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">🔥 {item.cal} cal</span>}
                {item.allergens.map(a => (
                  <span key={a} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/10 text-danger border border-danger/20">⚠️ {a}</span>
                ))}
              </div>
            </div>
            <div className="shrink-0">
              <div className="font-mono text-[24px] font-extrabold text-primary">฿{total}</div>
              {priceAdd > 0 && <div className="text-[11px] text-muted-foreground">รวม Add-ons +฿{priceAdd}</div>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {optionGroups.map(group => (
              <div key={group.id} className="bg-background rounded-2xl p-4 border border-border">
                <div className="text-[13px] font-bold text-foreground mb-3 flex items-center gap-2">
                  {group.name}
                  {group.required && <span className="text-[10px] text-danger font-bold">* จำเป็น</span>}
                  <span className="text-[10px] text-muted-foreground">{group.type === 'single' ? '(เลือก 1)' : '(เลือกได้หลายอย่าง)'}</span>
                </div>
                <div className={group.type === 'single' ? "flex gap-2 flex-wrap" : "space-y-2"}>
                  {group.menu_options.map(opt => {
                    const on = (selections[group.id] || []).includes(opt.name);
                    if (group.type === 'single') {
                      return (
                        <button key={opt.id} onClick={() => toggleOption(group.id, opt.name, group.type)}
                          className={cn(
                            "flex-1 min-w-[80px] py-2.5 px-2 rounded-xl border-2 text-[12px] font-semibold transition-all min-h-[48px]",
                            on ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-border"
                          )}>
                          {opt.name}
                          {Number(opt.price_add) > 0 && <div className="text-[10px] text-accent mt-0.5">+฿{opt.price_add}</div>}
                        </button>
                      );
                    }
                    return (
                      <div key={opt.id} onClick={() => toggleOption(group.id, opt.name, group.type)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all min-h-[48px]",
                          on ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-border"
                        )}>
                        <span className="flex-1 text-[13px] font-semibold text-foreground">{opt.name}</span>
                        {Number(opt.price_add) > 0 && <span className="font-mono text-[13px] font-bold text-accent">+฿{opt.price_add}</span>}
                        <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                          on ? "border-primary bg-primary" : "border-border bg-background")}>
                          {on && <span className="text-white text-[10px] font-black">✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="bg-background rounded-2xl p-4 border border-border">
              <div className="text-[13px] font-bold text-foreground mb-2">📝 หมายเหตุพิเศษ</div>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder='เช่น "ไม่ใส่ผักชี" หรือ "เพิ่มน้ำจิ้ม"...'
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={2} />
            </div>

            <div className="bg-background rounded-2xl p-4 border border-border flex items-center justify-center gap-4">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-xl border border-border bg-card text-foreground text-[18px] font-bold flex items-center justify-center hover:bg-muted transition-colors">−</button>
              <span className="font-mono text-[24px] font-black tabular-nums w-8 text-center">{qty}</span>
              <button onClick={() => setQty(q => q + 1)}
                className="w-10 h-10 rounded-xl gradient-primary text-white text-[18px] font-bold flex items-center justify-center">+</button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border shrink-0">
          <button onClick={() => {
            onAdd({ id: item.id, name: item.name, price: item.price, img: item.img, cat: item.cat, qty, note, options: selectedOptions, optionsText, priceAdd });
            onClose();
          }} className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white gradient-primary shadow-primary hover:opacity-90 transition-opacity">
            เพิ่มลงตะกร้า — ฿{total}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Menu Screen ───────────────────────────────────────────
function MenuScreen({ cart, setCart, orderType, onCheckout, menuItems, categories, optionGroups, allergensList }: {
  cart: CartEntry[];
  setCart: React.Dispatch<React.SetStateAction<CartEntry[]>>;
  orderType: string;
  onCheckout: () => void;
  menuItems: KioskMenuItem[];
  categories: string[];
  optionGroups: Record<string, OptionGroup[]>;
  allergensList: string[];
}) {
  const [activeCat, setActiveCat] = useState("ทั้งหมด");
  const [allergenFilter, setAllergenFilter] = useState<string[]>([]);
  const [customizing, setCustomizing] = useState<KioskMenuItem | null>(null);

  const filtered = menuItems.filter(m => {
    if (activeCat === "⭐ ยอดนิยม") return m.popular;
    if (activeCat !== "ทั้งหมด" && m.cat !== activeCat) return false;
    if (allergenFilter.length > 0 && m.allergens.some(a => allergenFilter.includes(a))) return false;
    return true;
  });

  const addToCart = (entry: Omit<CartEntry, "cartId">) => {
    setCart(prev => [...prev, { ...entry, cartId: Date.now() + Math.random() }]);
  };

  const handleItemClick = (item: KioskMenuItem) => {
    const groups = optionGroups[item.id];
    if (groups && groups.length > 0) {
      setCustomizing(item);
    } else {
      addToCart({ id: item.id, name: item.name, price: item.price, img: item.img, cat: item.cat, qty: 1, note: '', options: [], optionsText: '', priceAdd: 0 });
    }
  };

  const removeItem = (cartId: number) => setCart(prev => prev.filter(c => c.cartId !== cartId));
  const incItem = (cartId: number) => setCart(prev => prev.map(c => c.cartId === cartId ? { ...c, qty: c.qty + 1 } : c));

  const total = cart.reduce((s, c) => s + (c.price + c.priceAdd) * c.qty, 0);
  const totalItems = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-card flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
            orderType === "dinein" ? "bg-primary/10 text-primary border-primary/30" : "bg-accent/10 text-accent border-accent/30"
          )}>
            {orderType === "dinein" ? "🪑 ทานที่ร้าน" : "📦 กลับบ้าน"}
          </span>
          <span className="text-[14px] font-bold text-foreground">เลือกเมนู</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">กรองสารก่อภูมิแพ้:</span>
          {allergensList.map(a => {
            const on = allergenFilter.includes(a);
            return (
              <button key={a} onClick={() => setAllergenFilter(prev => on ? prev.filter(x => x !== a) : [...prev, a])}
                className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors",
                  on ? "border-danger/50 bg-danger/10 text-danger" : "border-border bg-background text-muted-foreground hover:border-border")}>
                {on ? "🚫 " : ""}{a}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[120px] shrink-0 bg-card border-r border-border p-2 flex flex-col gap-1 overflow-y-auto">
          {categories.map(c => (
            <button key={c} onClick={() => setActiveCat(c)}
              className={cn("px-2 py-2.5 rounded-xl text-[12px] font-semibold text-left transition-all",
                activeCat === c ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-background")}>
              {c}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {allergenFilter.length > 0 && (
            <div className="px-3 py-2 rounded-xl bg-danger/5 border border-danger/20 text-[12px] text-danger font-semibold mb-3">
              🛡️ กรองเมนูที่มี: {allergenFilter.join(", ")} ออกแล้ว — ปลอดภัยสำหรับคุณ
            </div>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {filtered.map(item => {
              const inCart = cart.filter(c => c.id === item.id).reduce((s, c) => s + c.qty, 0);
              return (
                <div key={item.id} onClick={() => handleItemClick(item)}
                  className={cn(
                    "relative bg-card border-2 rounded-2xl p-3.5 cursor-pointer transition-all hover:shadow-card-hover",
                    inCart > 0 ? "border-primary shadow-primary/20 shadow-md" : "border-border shadow-card hover:border-border"
                  )}>
                  {inCart > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full gradient-primary text-white text-[12px] font-extrabold flex items-center justify-center shadow-primary">{inCart}</div>
                  )}
                  {item.popular && (
                    <div className="absolute top-2 left-2">
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-warning/10 text-warning border border-warning/30">🔥 HOT</span>
                    </div>
                  )}
                  <div className="text-center mt-3">
                    <div className="text-[44px] leading-none mb-2">{item.img}</div>
                    <div className="text-[13px] font-bold text-foreground leading-tight mb-1">{item.name}</div>
                    {item.cal && <div className="text-[10px] text-muted-foreground mb-2">{item.cal} cal</div>}
                    <div className="font-mono text-[17px] font-extrabold text-primary">฿{item.price}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-[280px] shrink-0 border-l border-border bg-card flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
            <span className="text-[14px] font-extrabold text-foreground">🛒 ตะกร้า</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">{totalItems} ชิ้น</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pb-8">
                <div className="text-[36px] mb-2">🛒</div>
                <div className="text-[13px]">แตะเมนูเพื่อเริ่มสั่ง</div>
              </div>
            ) : cart.map(item => (
              <div key={item.cartId} className="flex items-center gap-2 px-2 py-2 rounded-xl border border-border bg-background">
                <span className="text-[22px]">{item.img}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-foreground truncate">{item.name}</div>
                  {item.optionsText && <div className="text-[10px] text-muted-foreground truncate">{item.optionsText}</div>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); removeItem(item.cartId); }}
                    className="w-5 h-5 rounded-md border border-border bg-card text-muted-foreground text-[13px] flex items-center justify-center hover:text-danger transition-colors">−</button>
                  <span className="font-mono text-[12px] font-bold w-4 text-center tabular-nums">{item.qty}</span>
                  <button onClick={(e) => { e.stopPropagation(); incItem(item.cartId); }}
                    className="w-5 h-5 rounded-md gradient-primary text-white text-[13px] flex items-center justify-center">+</button>
                </div>
                <span className="font-mono text-[12px] font-bold text-primary w-12 text-right shrink-0 tabular-nums">฿{(item.price + item.priceAdd) * item.qty}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border shrink-0">
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>รวม {totalItems} ชิ้น</span>
              <span>VAT 7% รวมแล้ว</span>
            </div>
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-[15px] font-extrabold text-foreground">ยอดรวม</span>
              <span className="font-mono text-[22px] font-black text-primary tabular-nums">฿{total.toLocaleString()}</span>
            </div>
            <button onClick={onCheckout} disabled={cart.length === 0}
              className="w-full py-3 rounded-2xl text-[14px] font-bold text-white gradient-primary shadow-primary hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
              ยืนยันออเดอร์ →
            </button>
          </div>
        </div>
      </div>

      {customizing && (
        <CustomizeModal
          item={customizing}
          optionGroups={optionGroups[customizing.id] || []}
          onClose={() => setCustomizing(null)}
          onAdd={entry => addToCart(entry)}
        />
      )}
    </div>
  );
}

// ── Payment Screen ────────────────────────────────────────
function KioskPaymentScreen({ total, onPay }: { total: number; onPay: () => void }) {
  const [method, setMethod] = useState<string | null>(null);
  const METHODS = [
    { id: "qr",   label: "QR PromptPay",            icon: "📱", desc: "สแกนจ่ายด้วยแอปธนาคาร",         color: "primary" },
    { id: "card", label: "บัตรเครดิต/เดบิต",         icon: "💳", desc: "Visa, Mastercard, JCB",         color: "accent"  },
    { id: "cash", label: "เงินสด (จ่ายที่เคาน์เตอร์)", icon: "💵", desc: "รับใบเสร็จไปจ่ายที่แคชเชียร์", color: "success" },
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_70%)]" />
      <div className="relative w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] text-center">
        <div className="text-[20px] font-extrabold text-foreground mb-4">💳 เลือกวิธีชำระเงิน</div>
        <div className="font-mono text-[42px] font-black text-primary tabular-nums mb-1">฿{total.toLocaleString()}</div>
        <div className="text-[13px] text-muted-foreground mb-6">รวม VAT 7% แล้ว</div>
        <div className="flex flex-col gap-2.5 mb-6">
          {METHODS.map(m => (
            <button key={m.id} onClick={() => setMethod(m.id)}
              className={cn(
                "flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 text-left transition-all",
                method === m.id
                  ? m.color === "primary" ? "border-primary bg-primary/5" : m.color === "accent" ? "border-accent bg-accent/5" : "border-success bg-success/5"
                  : "border-border bg-background hover:border-border"
              )}>
              <span className="text-[26px]">{m.icon}</span>
              <div className="flex-1">
                <div className={cn("text-[14px] font-bold",
                  method === m.id ? (m.color === "primary" ? "text-primary" : m.color === "accent" ? "text-accent" : "text-success") : "text-foreground"
                )}>{m.label}</div>
                <div className="text-[12px] text-muted-foreground">{m.desc}</div>
              </div>
              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                method === m.id ? m.color === "primary" ? "border-primary" : m.color === "accent" ? "border-accent" : "border-success" : "border-border")}>
                {method === m.id && <div className={cn("w-2.5 h-2.5 rounded-full",
                  m.color === "primary" ? "bg-primary" : m.color === "accent" ? "bg-accent" : "bg-success")} />}
              </div>
            </button>
          ))}
        </div>
        {method === "qr" && (
          <div className="mb-5">
            <div className="w-44 h-44 mx-auto rounded-2xl bg-white border-2 border-border p-3 flex items-center justify-center">
              <div className="w-full h-full rounded-lg opacity-70"
                style={{ background: "repeating-conic-gradient(hsl(var(--foreground)) 0% 25%, white 0% 50%) 0 0 / 14px 14px" }} />
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">สแกน QR ด้านบนด้วยแอปธนาคาร</div>
          </div>
        )}
        <button onClick={onPay} disabled={!method}
          className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white gradient-primary shadow-primary hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
          {method === "cash" ? "📄 พิมพ์ใบเสร็จไปจ่าย" : "✅ ยืนยันชำระเงิน"}
        </button>
      </div>
    </div>
  );
}

// ── Done Screen ───────────────────────────────────────────
function DoneScreen({ orderNumber, onReset }: { orderNumber: string; onReset: () => void }) {
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    timerRef.current = setTimeout(onReset, 15000);
    return () => clearTimeout(timerRef.current);
  }, [onReset]);

  const steps = [
    { label: "รับออเดอร์แล้ว",      icon: "✅", done: true  },
    { label: "กำลังเตรียมอาหาร",   icon: "👨‍🍳", done: false },
    { label: "เสร็จแล้ว — รับอาหาร", icon: "🍽️", done: false },
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--success)/0.06),transparent_70%)]" />
      <div className="relative max-w-md w-full text-center">
        <div className="text-[72px] leading-none mb-4">✅</div>
        <h2 className="text-[28px] font-black text-success mb-2">สั่งอาหารสำเร็จ!</h2>
        <div className="text-[15px] text-foreground mb-1">หมายเลขออเดอร์</div>
        <div className="font-mono text-[48px] font-black text-primary mb-6 tabular-nums tracking-widest">{orderNumber}</div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card mb-5 text-left">
          <div className="text-[13px] font-bold text-foreground mb-3">📍 สถานะออเดอร์</div>
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-[15px] border-2 transition-all",
                s.done ? "border-success bg-success/10 text-success" : "border-border bg-background text-muted-foreground")}>
                {s.done ? "✓" : s.icon}
              </div>
              <span className={cn("text-[13px] flex-1", s.done ? "font-bold text-foreground" : "text-muted-foreground")}>{s.label}</span>
              {i === 1 && !s.done && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-warning/10 text-warning border border-warning/20">~5-8 นาที</span>
              )}
            </div>
          ))}
        </div>
        <div className="text-[12px] text-muted-foreground mb-5">กลับหน้าหลักอัตโนมัติใน 15 วินาที</div>
        <button onClick={onReset}
          className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white gradient-primary shadow-primary hover:opacity-90 transition-opacity">
          🏠 กลับหน้าหลัก
        </button>
      </div>
    </div>
  );
}

// ── Main Kiosk Screen ─────────────────────────────────────
export function KioskScreen({ tableId, tableLabel, isPublic }: KioskScreenProps) {
  const [step, setStep] = useState(STEPS.WELCOME);
  const [orderType, setOrderType] = useState<"dinein" | "takeaway">("dinein");
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [orderNumber, setOrderNumber] = useState("");

  // DB data
  const [menuItems, setMenuItems] = useState<KioskMenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [optionGroups, setOptionGroups] = useState<Record<string, OptionGroup[]>>({});
  const [allergensList, setAllergensList] = useState<string[]>([]);

  useEffect(() => { fetchKioskData(); }, []);

  async function fetchKioskData() {
    const { data: menu } = await supabase
      .from('menu_items')
      .select('*, menu_categories(name, icon)')
      .eq('is_available', true)
      .order('sort_order');

    if (menu) {
      setMenuItems(menu.map((m: any) => ({
        id: m.id, name: m.name, price: Number(m.price),
        cat: (m.menu_categories as any)?.name || '', img: m.emoji || '🍽',
        cal: m.calories, popular: m.is_popular || false,
        allergens: m.allergens || [], desc: m.description || '',
      })));

      const allAllergens = new Set<string>();
      menu.forEach((m: any) => (m.allergens || []).forEach((a: string) => allAllergens.add(a)));
      setAllergensList(Array.from(allAllergens));

      const cats = new Set<string>();
      menu.forEach((m: any) => { if ((m.menu_categories as any)?.name) cats.add((m.menu_categories as any).name); });
      setCategories(["ทั้งหมด", "⭐ ยอดนิยม", ...Array.from(cats)]);
    }

    const { data: groups } = await supabase
      .from('menu_option_groups')
      .select('*, menu_options(*)')
      .order('sort_order');

    if (groups) {
      const grouped: Record<string, OptionGroup[]> = {};
      groups.forEach((g: any) => {
        const key = g.menu_item_id;
        if (!key) return;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
          id: g.id, name: g.name, type: g.type || 'single', required: g.required || false,
          menu_options: (g.menu_options || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)),
        });
      });
      setOptionGroups(grouped);
    }
  }

  const total = cart.reduce((s, c) => s + (c.price + c.priceAdd) * c.qty, 0);

  async function submitKioskOrder() {
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_number: 'temp',
        table_id: tableId || null,
        order_type: (orderType === 'dinein' ? 'dine_in' : 'takeaway') as any,
        channel: 'kiosk' as any,
        status: 'sent' as any,
        guest_count: 1,
      })
      .select()
      .single();

    if (error || !order) { console.error('Kiosk order error:', error); return; }

    const items = cart.map(c => ({
      order_id: order.id,
      menu_item_id: c.id,
      name: c.name,
      price: c.price + c.priceAdd,
      qty: c.qty,
      note: c.note || null,
      options: c.options || [],
      options_text: c.optionsText || null,
      price_add: c.priceAdd || 0,
      status: 'sent' as any,
      sent_at: new Date().toISOString(),
    }));

    await supabase.from('order_items').insert(items);

    setOrderNumber(order.order_number);
    setStep(STEPS.DONE);
  }

  const reset = () => { setStep(STEPS.WELCOME); setCart([]); setOrderNumber(''); };

  return (
    <div className={cn("flex-1 flex flex-col overflow-hidden bg-background text-foreground", isPublic && "h-screen")}>
      {/* Kiosk top bar */}
      {!isPublic && (
        <div className="px-5 py-2.5 bg-card border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <img src={phimmLogo} alt="Phimm Cafe" className="w-8 h-8 object-contain" />
            <span className="text-[15px] font-extrabold text-gradient-primary">Phimm Cafe</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">Self-Service</span>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
            <span>☕ Phimm Cafe</span>
            {step !== STEPS.WELCOME && (
              <button onClick={reset} className="px-3 py-1 rounded-lg text-[11px] font-semibold border border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 transition-colors">
                ✕ ยกเลิก
              </button>
            )}
          </div>
        </div>
      )}

      {isPublic && (
        <div className="px-5 py-2.5 bg-card border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <img src={phimmLogo} alt="Phimm Cafe" className="w-8 h-8 object-contain" />
            <span className="text-[15px] font-extrabold text-gradient-primary">Phimm Cafe</span>
            {tableLabel && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">📍 {tableLabel}</span>}
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">QR Order</span>
          </div>
          {step !== STEPS.WELCOME && (
            <button onClick={reset} className="px-3 py-1 rounded-lg text-[11px] font-semibold border border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 transition-colors">
              ✕ ยกเลิก
            </button>
          )}
        </div>
      )}

      {step === STEPS.WELCOME && <WelcomeScreen tableLabel={tableLabel} onStart={(type) => { setOrderType(tableId ? "dinein" : type); setStep(STEPS.MENU); }} />}
      {step === STEPS.MENU && (
        <MenuScreen cart={cart} setCart={setCart} orderType={orderType}
          onCheckout={() => setStep(STEPS.PAYMENT)}
          menuItems={menuItems} categories={categories}
          optionGroups={optionGroups} allergensList={allergensList} />
      )}
      {step === STEPS.PAYMENT && <KioskPaymentScreen total={total} onPay={submitKioskOrder} />}
      {step === STEPS.DONE && <DoneScreen orderNumber={orderNumber} onReset={reset} />}
    </div>
  );
}
