import { useState } from "react";
import phimmLogo from "@/assets/phimm-logo.png";
import { cn } from "@/lib/utils";

// ── Data ──────────────────────────────────────────────────
const KIOSK_MENU = [
  { id: 1,  name: "ข้าวผัดกุ้ง",      price: 89,  cat: "จานหลัก",    img: "🍛", cal: 520, popular: true,  allergens: ["กุ้ง"],           desc: "ข้าวผัดกุ้งสด ไข่ดาว ผักสด"         },
  { id: 2,  name: "ต้มยำกุ้ง",        price: 159, cat: "จานหลัก",    img: "🍲", cal: 280, popular: true,  allergens: ["กุ้ง"],           desc: "ต้มยำกุ้งน้ำข้น เข้มข้น หอมสมุนไพร" },
  { id: 3,  name: "ส้มตำไทย",         price: 69,  cat: "จานหลัก",    img: "🥗", cal: 180, popular: false, allergens: ["ถั่ว"],           desc: "ส้มตำไทยรสจัด กุ้งแห้ง ถั่วลิสง"   },
  { id: 4,  name: "ผัดไทยกุ้งสด",     price: 89,  cat: "จานหลัก",    img: "🍜", cal: 450, popular: true,  allergens: ["กุ้ง","ถั่ว","ไข่"], desc: "ผัดไทยเส้นจันท์ กุ้งสด ไข่ ถั่วงอก" },
  { id: 5,  name: "แกงเขียวหวาน",     price: 99,  cat: "จานหลัก",    img: "🍛", cal: 380, popular: false, allergens: ["นม"],             desc: "แกงเขียวหวานไก่ กะทิสด"             },
  { id: 6,  name: "ข้าวมันไก่",       price: 65,  cat: "จานหลัก",    img: "🍗", cal: 480, popular: true,  allergens: [],                 desc: "ข้าวมันไก่ต้ม น้ำจิ้มสูตรเด็ด"      },
  { id: 7,  name: "ชาเย็น",           price: 45,  cat: "เครื่องดื่ม", img: "🧋", cal: 220, popular: true,  allergens: ["นม"],             desc: "ชาไทยเย็น หวานมัน"                  },
  { id: 8,  name: "กาแฟเย็น",         price: 55,  cat: "เครื่องดื่ม", img: "☕", cal: 150, popular: false, allergens: ["นม"],             desc: "กาแฟโรบัสต้าเย็น"                   },
  { id: 9,  name: "น้ำมะนาวโซดา",     price: 45,  cat: "เครื่องดื่ม", img: "🍋", cal: 80,  popular: false, allergens: [],                 desc: "น้ำมะนาวโซดาสดชื่น"                 },
  { id: 10, name: "สมูทตี้เบอร์รี่",   price: 75,  cat: "เครื่องดื่ม", img: "🫐", cal: 180, popular: false, allergens: ["นม"],             desc: "มิกซ์เบอร์รี่ปั่น โยเกิร์ต"         },
  { id: 11, name: "ข้าวเหนียวมะม่วง",  price: 89,  cat: "ของหวาน",    img: "🥭", cal: 350, popular: true,  allergens: ["นม"],             desc: "มะม่วงน้ำดอกไม้ กะทิสด"            },
  { id: 12, name: "ไอศกรีมกะทิ",      price: 49,  cat: "ของหวาน",    img: "🍨", cal: 250, popular: false, allergens: ["นม","ถั่ว"],      desc: "ไอศกรีมกะทิ ถั่วลิสง ข้าวเหนียว"   },
  { id: 13, name: "บัวลอยไข่หวาน",    price: 55,  cat: "ของหวาน",    img: "🍡", cal: 200, popular: false, allergens: ["ไข่","นม"],       desc: "บัวลอยน้ำกะทิ ไข่หวาน"             },
  { id: 14, name: "เฟรนช์ฟรายส์",     price: 59,  cat: "ของทานเล่น", img: "🍟", cal: 320, popular: false, allergens: ["กลูเตน"],         desc: "มันฝรั่งทอดกรอบ ซอสพิเศษ"          },
  { id: 15, name: "ปีกไก่ทอด",        price: 79,  cat: "ของทานเล่น", img: "🍗", cal: 420, popular: true,  allergens: ["กลูเตน"],         desc: "ปีกไก่ทอดกรอบ 6 ชิ้น"              },
];

const UPSELL_RULES = [
  { trigger: "จานหลัก",    suggest: "เครื่องดื่ม", msg: "🧋 เพิ่มเครื่องดื่มคู่กัน?",  discount: 10 },
  { trigger: "จานหลัก",    suggest: "ของทานเล่น", msg: "🍟 เพิ่มของทานเล่น?",           discount: 15 },
  { trigger: "เครื่องดื่ม", suggest: "ของหวาน",    msg: "🍨 ปิดท้ายด้วยของหวาน?",       discount: 10 },
];

const CATS = ["ทั้งหมด", "⭐ ยอดนิยม", "จานหลัก", "เครื่องดื่ม", "ของหวาน", "ของทานเล่น"];
const ALL_ALLERGENS = ["กุ้ง", "ถั่ว", "นม", "ไข่", "กลูเตน"];
const SPICE_LEVELS = ["ไม่เผ็ด", "เผ็ดน้อย", "ปกติ", "เผ็ดมาก", "เผ็ดสุดๆ"];
const ADDONS = [
  { name: "ไข่ดาว",   price: 15, img: "🍳" },
  { name: "ข้าวเพิ่ม", price: 10, img: "🍚" },
  { name: "ผักเพิ่ม",  price: 10, img: "🥬" },
  { name: "กุ้งเพิ่ม", price: 30, img: "🦐" },
];

type KioskItem = typeof KIOSK_MENU[number];
type CartEntry = KioskItem & { cartId: number; qty: number; spice: string; addons: string[]; note: string; };

const STEPS = { WELCOME: 0, MENU: 1, PAYMENT: 2, DONE: 3 };

// ── Welcome ───────────────────────────────────────────────
function WelcomeScreen({ onStart }: { onStart: (type: "dinein" | "takeaway") => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center relative overflow-hidden">
      {/* radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)]" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="text-[80px] leading-none mb-4 drop-shadow-sm">🍽️</div>
        <h1 className="text-[38px] font-black text-foreground leading-tight mb-2 text-balance">ยินดีต้อนรับ</h1>
        <p className="text-[16px] text-muted-foreground mb-1">
          ร้าน <span className="font-bold text-primary">Phimm Cafe</span>
        </p>
        <p className="text-[14px] text-muted-foreground mb-10 max-w-sm">
          สั่งอาหาร · จ่ายเงิน · รับอาหาร<br />ทั้งหมดจากหน้าจอนี้ — ไม่ต้องรอพนักงาน
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => onStart("dinein")}
            className="w-full py-4 rounded-2xl text-[16px] font-bold text-white gradient-primary shadow-primary-lg hover:opacity-90 transition-opacity"
          >
            🪑 ทานที่ร้าน
          </button>
          <button
            onClick={() => onStart("takeaway")}
            className="w-full py-4 rounded-2xl text-[16px] font-bold text-white bg-accent hover:opacity-90 transition-opacity"
            style={{ boxShadow: "0 4px 20px hsl(var(--accent)/0.35)" }}
          >
            📦 สั่งกลับบ้าน
          </button>
        </div>

        <div className="flex gap-5 mt-8 text-[11px] text-muted-foreground">
          <span>🌐 EN / 中文 / 日本語</span>
          <span>♿ ช่วยเหลือพิเศษ</span>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-6 text-[10px] text-muted-foreground whitespace-nowrap">
        <span>📊 ลูกค้า 61% ชอบ Kiosk มากกว่าสั่งกับพนักงาน</span>
        <span>💰 ยอดสั่งเพิ่ม 72% เมื่อสั่งผ่าน Kiosk</span>
      </div>
    </div>
  );
}

// ── Customize Modal ───────────────────────────────────────
function CustomizeModal({
  item, onClose, onAdd,
}: { item: KioskItem; onClose: () => void; onAdd: (entry: Omit<CartEntry, "cartId">) => void }) {
  const [spice, setSpice] = useState("ปกติ");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const addonTotal = ADDONS.filter(a => selectedAddons.includes(a.name)).reduce((s, a) => s + a.price, 0);
  const total = item.price + addonTotal;

  const toggleAddon = (name: string) =>
    setSelectedAddons(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-3xl w-full max-w-2xl shadow-[0_24px_60px_rgba(0,0,0,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-[18px]">
            ←
          </button>
          <div className="text-[17px] font-bold text-foreground">ปรับแต่ง: {item.name}</div>
        </div>

        <div className="flex gap-0 max-h-[70vh] overflow-hidden">
          {/* Left: item card */}
          <div className="w-52 shrink-0 p-6 border-r border-border flex flex-col items-center text-center bg-background/50">
            <div className="text-[64px] leading-none mb-3">{item.img}</div>
            <div className="text-[15px] font-extrabold text-foreground mb-1">{item.name}</div>
            <div className="text-[12px] text-muted-foreground mb-3">{item.desc}</div>
            <div className="flex flex-wrap gap-1 justify-center mb-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">🔥 {item.cal} cal</span>
              {item.allergens.map(a => (
                <span key={a} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/10 text-danger border border-danger/20">⚠️ {a}</span>
              ))}
            </div>
            <div className="font-mono text-[24px] font-extrabold text-primary">฿{total}</div>
            {addonTotal > 0 && <div className="text-[11px] text-muted-foreground">รวม Add-ons +฿{addonTotal}</div>}
          </div>

          {/* Right: options */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Spice level */}
            <div className="bg-background rounded-2xl p-4 border border-border">
              <div className="text-[13px] font-bold text-foreground mb-3">🌶️ ระดับความเผ็ด</div>
              <div className="flex gap-2">
                {SPICE_LEVELS.map((lv, i) => (
                  <button key={lv} onClick={() => setSpice(lv)}
                    className={cn(
                      "flex-1 py-2.5 px-1 rounded-xl border-2 text-[11px] font-semibold transition-all",
                      spice === lv
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-border-light"
                    )}>
                    <div>{i === 0 ? "—" : "🌶️".repeat(i)}</div>
                    <div className="mt-0.5">{lv}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Add-ons */}
            <div className="bg-background rounded-2xl p-4 border border-border">
              <div className="text-[13px] font-bold text-foreground mb-3">➕ เพิ่มเติม</div>
              <div className="space-y-2">
                {ADDONS.map(addon => {
                  const on = selectedAddons.includes(addon.name);
                  return (
                    <div key={addon.name}
                      onClick={() => toggleAddon(addon.name)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all",
                        on ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-border-light"
                      )}>
                      <span className="text-[22px]">{addon.img}</span>
                      <span className="flex-1 text-[13px] font-semibold text-foreground">{addon.name}</span>
                      <span className="font-mono text-[13px] font-bold text-accent">+฿{addon.price}</span>
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                        on ? "border-primary bg-primary" : "border-border bg-background"
                      )}>
                        {on && <span className="text-white text-[10px] font-black">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Special note */}
            <div className="bg-background rounded-2xl p-4 border border-border">
              <div className="text-[13px] font-bold text-foreground mb-2">📝 หมายเหตุพิเศษ</div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder='เช่น "ไม่ใส่ผักชี" หรือ "เพิ่มน้ำจิ้ม"...'
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <button
            onClick={() => { onAdd({ ...item, qty: 1, spice, addons: selectedAddons, note }); onClose(); }}
            className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white gradient-primary shadow-primary hover:opacity-90 transition-opacity">
            เพิ่มลงตะกร้า — ฿{total}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Menu Screen ───────────────────────────────────────────
function MenuScreen({ cart, setCart, orderType, onCheckout }: {
  cart: CartEntry[]; setCart: React.Dispatch<React.SetStateAction<CartEntry[]>>;
  orderType: string; onCheckout: () => void;
}) {
  const [activeCat, setActiveCat] = useState("ทั้งหมด");
  const [allergenFilter, setAllergenFilter] = useState<string[]>([]);
  const [customizing, setCustomizing] = useState<KioskItem | null>(null);
  const [upsell, setUpsell] = useState<{ rule: typeof UPSELL_RULES[number]; suggestions: typeof KIOSK_MENU } | null>(null);

  const filtered = KIOSK_MENU.filter(m => {
    if (activeCat === "⭐ ยอดนิยม") return m.popular;
    if (activeCat !== "ทั้งหมด" && m.cat !== activeCat) return false;
    if (allergenFilter.length > 0 && m.allergens.some(a => allergenFilter.includes(a))) return false;
    return true;
  });

  const addToCart = (entry: Omit<CartEntry, "cartId">) => {
    setCart(prev => [...prev, { ...entry, cartId: Date.now() + Math.random() }]);
    const rule = UPSELL_RULES.find(r => r.trigger === entry.cat && !cart.some(c => c.cat === r.suggest));
    if (rule) {
      const suggestions = KIOSK_MENU.filter(m => m.cat === rule.suggest).slice(0, 3);
      setUpsell({ rule, suggestions });
    }
  };

  const removeItem = (cartId: number) => setCart(prev => prev.filter(c => c.cartId !== cartId));
  const incItem = (cartId: number) => setCart(prev => prev.map(c => c.cartId === cartId ? { ...c, qty: c.qty + 1 } : c));

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const totalItems = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* top bar */}
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
        {/* Allergen filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">กรองสารก่อภูมิแพ้:</span>
          {ALL_ALLERGENS.map(a => {
            const on = allergenFilter.includes(a);
            return (
              <button key={a} onClick={() => setAllergenFilter(prev => on ? prev.filter(x => x !== a) : [...prev, a])}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors",
                  on ? "border-danger/50 bg-danger/10 text-danger" : "border-border bg-background text-muted-foreground hover:border-border-light"
                )}>
                {on ? "🚫 " : ""}{a}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Category sidebar */}
        <div className="w-[120px] shrink-0 bg-card border-r border-border p-2 flex flex-col gap-1 overflow-y-auto">
          {CATS.map(c => (
            <button key={c} onClick={() => setActiveCat(c)}
              className={cn(
                "px-2 py-2.5 rounded-xl text-[12px] font-semibold text-left transition-all",
                activeCat === c ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-background"
              )}>
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
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
                <div key={item.id} onClick={() => setCustomizing(item)}
                  className={cn(
                    "relative bg-card border-2 rounded-2xl p-3.5 cursor-pointer transition-all hover:shadow-card-hover",
                    inCart > 0 ? "border-primary shadow-primary/20 shadow-md" : "border-border shadow-card hover:border-border-light"
                  )}>
                  {inCart > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full gradient-primary text-white text-[12px] font-extrabold flex items-center justify-center shadow-primary">
                      {inCart}
                    </div>
                  )}
                  {item.popular && (
                    <div className="absolute top-2 left-2">
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-warning/10 text-warning border border-warning/30">🔥 HOT</span>
                    </div>
                  )}
                  <div className="text-center mt-3">
                    <div className="text-[44px] leading-none mb-2">{item.img}</div>
                    <div className="text-[13px] font-bold text-foreground leading-tight mb-1">{item.name}</div>
                    <div className="text-[10px] text-muted-foreground mb-2">{item.cal} cal</div>
                    <div className="font-mono text-[17px] font-extrabold text-primary">฿{item.price}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart sidebar */}
        <div className="w-[280px] shrink-0 border-l border-border bg-card flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
            <span className="text-[14px] font-extrabold text-foreground">🛒 ตะกร้า</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
              {totalItems} ชิ้น
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pb-8">
                <div className="text-[36px] mb-2">🛒</div>
                <div className="text-[13px]">แตะเมนูเพื่อเริ่มสั่ง</div>
              </div>
            ) : cart.map((item) => (
              <div key={item.cartId} className="flex items-center gap-2 px-2 py-2 rounded-xl border border-border bg-background">
                <span className="text-[22px]">{item.img}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-foreground truncate">{item.name}</div>
                  <div className="text-[10px] text-muted-foreground">{item.spice}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => removeItem(item.cartId)}
                    className="w-5 h-5 rounded-md border border-border bg-card text-muted-foreground text-[13px] flex items-center justify-center hover:text-danger transition-colors">
                    −
                  </button>
                  <span className="font-mono text-[12px] font-bold w-4 text-center tabular-nums">{item.qty}</span>
                  <button onClick={() => incItem(item.cartId)}
                    className="w-5 h-5 rounded-md gradient-primary text-white text-[13px] flex items-center justify-center">
                    +
                  </button>
                </div>
                <span className="font-mono text-[12px] font-bold text-primary w-10 text-right shrink-0 tabular-nums">฿{item.price * item.qty}</span>
              </div>
            ))}
          </div>

          {/* Upsell */}
          {upsell && (
            <div className="mx-3 mb-2 p-3 rounded-2xl bg-warning/5 border border-warning/20">
              <div className="text-[12px] font-bold text-warning mb-2 flex items-center gap-1.5">
                {upsell.rule.msg}
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-danger/10 text-danger border border-danger/20">
                  ลด {upsell.rule.discount}%
                </span>
              </div>
              <div className="flex gap-1.5">
                {upsell.suggestions.map(s => (
                  <button key={s.id} onClick={() => { addToCart({ ...s, qty: 1, spice: "ปกติ", addons: [], note: "" }); setUpsell(null); }}
                    className="flex-1 px-1 py-2 rounded-xl border border-border bg-card text-center hover:border-primary/40 transition-colors">
                    <div className="text-[20px]">{s.img}</div>
                    <div className="text-[9px] font-semibold text-foreground mt-0.5">{s.name}</div>
                    <div className="font-mono text-[10px] font-bold text-success">฿{Math.round(s.price * (1 - upsell.rule.discount / 100))}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setUpsell(null)}
                className="w-full mt-1.5 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                ไม่เพิ่ม ขอบคุณ
              </button>
            </div>
          )}

          {/* Total */}
          <div className="px-4 py-3 border-t border-border shrink-0">
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>รวม {totalItems} ชิ้น</span>
              <span>VAT 7% รวมแล้ว</span>
            </div>
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-[15px] font-extrabold text-foreground">ยอดรวม</span>
              <span className="font-mono text-[22px] font-black text-primary tabular-nums">฿{total.toLocaleString()}</span>
            </div>
            <button
              onClick={onCheckout}
              disabled={cart.length === 0}
              className="w-full py-3 rounded-2xl text-[14px] font-bold text-white gradient-primary shadow-primary hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
              ยืนยันออเดอร์ →
            </button>
          </div>
        </div>
      </div>

      {/* Customize modal */}
      {customizing && (
        <CustomizeModal
          item={customizing}
          onClose={() => setCustomizing(null)}
          onAdd={(entry) => addToCart(entry)}
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
                  : "border-border bg-background hover:border-border-light"
              )}>
              <span className="text-[26px]">{m.icon}</span>
              <div className="flex-1">
                <div className={cn(
                  "text-[14px] font-bold",
                  method === m.id ? (m.color === "primary" ? "text-primary" : m.color === "accent" ? "text-accent" : "text-success") : "text-foreground"
                )}>{m.label}</div>
                <div className="text-[12px] text-muted-foreground">{m.desc}</div>
              </div>
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                method === m.id
                  ? m.color === "primary" ? "border-primary" : m.color === "accent" ? "border-accent" : "border-success"
                  : "border-border"
              )}>
                {method === m.id && (
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    m.color === "primary" ? "bg-primary" : m.color === "accent" ? "bg-accent" : "bg-success"
                  )} />
                )}
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

        <button
          onClick={onPay}
          disabled={!method}
          className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white gradient-primary shadow-primary hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
          {method === "cash" ? "📄 พิมพ์ใบเสร็จไปจ่าย" : "✅ ยืนยันชำระเงิน"}
        </button>
      </div>
    </div>
  );
}

// ── Done Screen ───────────────────────────────────────────
function DoneScreen({ orderNumber, onReset }: { orderNumber: string; onReset: () => void }) {
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
        <div className="font-mono text-[48px] font-black text-primary mb-6 tabular-nums tracking-widest">#{orderNumber}</div>

        {/* Progress tracker */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card mb-5 text-left">
          <div className="text-[13px] font-bold text-foreground mb-3">📍 สถานะออเดอร์</div>
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-[15px] border-2 transition-all",
                s.done ? "border-success bg-success/10 text-success" : "border-border bg-background text-muted-foreground"
              )}>
                {s.done ? "✓" : s.icon}
              </div>
              <span className={cn("text-[13px] flex-1", s.done ? "font-bold text-foreground" : "text-muted-foreground")}>{s.label}</span>
              {i === 1 && !s.done && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-warning/10 text-warning border border-warning/20">~5-8 นาที</span>
              )}
            </div>
          ))}
        </div>

        <div className="text-[12px] text-muted-foreground mb-5">📱 สแกน QR เพื่อติดตามสถานะผ่าน LINE</div>

        <button onClick={onReset}
          className="w-full py-3.5 rounded-2xl text-[15px] font-bold text-white gradient-primary shadow-primary hover:opacity-90 transition-opacity">
          🏠 กลับหน้าหลัก
        </button>
      </div>
    </div>
  );
}

// ── Main Kiosk Screen ─────────────────────────────────────
export function KioskScreen() {
  const [step, setStep] = useState(STEPS.WELCOME);
  const [orderType, setOrderType] = useState<"dinein" | "takeaway">("dinein");
  const [cart, setCart] = useState<CartEntry[]>([]);

  const orderNumber = String(251 + Math.floor(Math.random() * 10)).padStart(4, "0");
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const reset = () => { setStep(STEPS.WELCOME); setCart([]); };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background text-foreground">
      {/* Kiosk top bar */}
      <div className="px-5 py-2.5 bg-card border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/src/assets/phimm-logo.png" alt="Phimm Cafe" className="w-8 h-8 object-contain" />
          <span className="text-[15px] font-extrabold text-gradient-primary">Phimm Cafe</span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">Self-Service</span>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
          <span>☕ Phimm Cafe</span>
          {step !== STEPS.WELCOME && (
            <button onClick={reset}
              className="px-3 py-1 rounded-lg text-[11px] font-semibold border border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 transition-colors">
              ✕ ยกเลิก
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {step === STEPS.WELCOME && (
        <WelcomeScreen onStart={(type) => { setOrderType(type); setStep(STEPS.MENU); }} />
      )}
      {step === STEPS.MENU && (
        <MenuScreen cart={cart} setCart={setCart} orderType={orderType} onCheckout={() => setStep(STEPS.PAYMENT)} />
      )}
      {step === STEPS.PAYMENT && (
        <KioskPaymentScreen total={total} onPay={() => setStep(STEPS.DONE)} />
      )}
      {step === STEPS.DONE && (
        <DoneScreen orderNumber={orderNumber} onReset={reset} />
      )}
    </div>
  );
}
