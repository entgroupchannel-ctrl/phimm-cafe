import { useState } from "react";
import { POSBadge } from "./POSBadge";
import { POSStatCard } from "./POSStatCard";
import { cn } from "@/lib/utils";

// ── Tab types ────────────────────────────────────────────────
type AITab = "pricing" | "forecast" | "menu";

const TABS: { key: AITab; label: string }[] = [
  { key: "pricing",  label: "💰 Dynamic Pricing"  },
  { key: "forecast", label: "📈 Sales Forecast"   },
  { key: "menu",     label: "🧠 AI เมนู"          },
];

// ════════════════════════════════════════════════════════════
// FEATURE 1: Dynamic Pricing Engine
// ════════════════════════════════════════════════════════════
const BASE_MENUS = [
  { name: "ต้มยำกุ้ง",        base: 159, img: "🍲", cat: "ร้อน"    },
  { name: "ผัดไทย",           base: 79,  img: "🍜", cat: "ร้อน"    },
  { name: "ส้มตำ",             base: 69,  img: "🥗", cat: "เย็น"    },
  { name: "ชาเย็น",           base: 45,  img: "🧋", cat: "เย็น"    },
  { name: "ข้าวเหนียวมะม่วง", base: 89,  img: "🥭", cat: "ของหวาน" },
  { name: "กาแฟเย็น",         base: 55,  img: "☕", cat: "เย็น"    },
];

function getPriceAdj(menu: { name: string; base: number; cat: string }, hour: number, weather: string, event: string) {
  let adj = 0;
  const reasons: string[] = [];

  if (hour >= 11 && hour <= 13)       { adj += 10; reasons.push("🕐 Lunch Rush +10%");       }
  else if (hour >= 17 && hour <= 19)  { adj += 15; reasons.push("🕐 Dinner Peak +15%");       }
  else if (hour >= 14 && hour <= 16)  { adj -= 15; reasons.push("🕐 Off-peak ลด 15%");        }
  else if (hour >= 20)                 { adj -= 20; reasons.push("🕐 ใกล้ปิดร้าน ลด 20%");    }

  if (weather === "rainy" && menu.cat === "ร้อน")  { adj += 12; reasons.push("🌧 ฝนตก → อาหารร้อน +12%");    }
  if (weather === "rainy" && menu.cat === "เย็น")  { adj -= 10; reasons.push("🌧 ฝนตก → เครื่องดื่มเย็น -10%"); }
  if (weather === "hot"   && menu.cat === "เย็น")  { adj += 15; reasons.push("☀️ ร้อนจัด → เครื่องดื่มเย็น +15%"); }

  if (event === "concert")  { adj += 20; reasons.push("🎵 คอนเสิร์ตใกล้ร้าน +20%"); }
  if (event === "holiday")  { adj += 10; reasons.push("🎉 วันหยุดยาว +10%");         }

  return { adj, reasons, newPrice: Math.round(menu.base * (1 + adj / 100)) };
}

function DynamicPricing() {
  const [hour, setHour]       = useState(12);
  const [weather, setWeather] = useState("sunny");
  const [event, setEvent]     = useState("none");

  const avgAdj = Math.round(
    BASE_MENUS.reduce((s, m) => s + getPriceAdj(m, hour, weather, event).adj, 0) / BASE_MENUS.length
  );

  return (
    <div className="space-y-4">
      <div className="text-[13px] text-muted-foreground">
        AI ปรับราคาเมนูอัตโนมัติตามเวลา สภาพอากาศ และอีเวนต์ — เพิ่มกำไรสูงสุดโดยไม่ต้องตั้งค่าเอง
      </div>

      {/* Controls */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
        {/* Time slider */}
        <div>
          <div className="text-[12px] font-semibold text-muted-foreground mb-2">
            🕐 เวลา: <span className="font-mono text-[17px] font-bold text-accent tabular-nums">{hour}:00</span>
          </div>
          <input type="range" min={9} max={22} value={hour}
            onChange={(e) => setHour(+e.target.value)}
            className="w-full accent-primary h-1.5 cursor-pointer" />
          <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1">
            <span>09:00</span><span>12:00 Lunch</span><span>15:00</span><span>18:00 Dinner</span><span>22:00</span>
          </div>
        </div>

        <div className="flex gap-6 flex-wrap">
          {/* Weather */}
          <div>
            <div className="text-[12px] font-semibold text-muted-foreground mb-2">🌤 สภาพอากาศ</div>
            <div className="flex gap-2">
              {[{ k: "sunny", l: "☀️ แดด" }, { k: "rainy", l: "🌧 ฝน" }, { k: "hot", l: "🔥 ร้อนจัด" }].map((w) => (
                <button key={w.k} onClick={() => setWeather(w.k)}
                  className={cn("px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
                    weather === w.k ? "border-accent/50 bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:border-border-light hover:text-foreground")}>
                  {w.l}
                </button>
              ))}
            </div>
          </div>

          {/* Event */}
          <div>
            <div className="text-[12px] font-semibold text-muted-foreground mb-2">🎉 อีเวนต์ใกล้ร้าน</div>
            <div className="flex gap-2">
              {[{ k: "none", l: "ไม่มี" }, { k: "concert", l: "🎵 คอนเสิร์ต" }, { k: "holiday", l: "🎉 วันหยุด" }].map((e) => (
                <button key={e.k} onClick={() => setEvent(e.k)}
                  className={cn("px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
                    event === e.k ? "border-warning/50 bg-warning/10 text-warning" : "border-border bg-card text-muted-foreground hover:border-border-light hover:text-foreground")}>
                  {e.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Price Cards */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {BASE_MENUS.map((menu) => {
          const { adj, reasons, newPrice } = getPriceAdj(menu, hour, weather, event);
          const isUp   = adj > 0;
          const isDown = adj < 0;
          return (
            <div key={menu.name} className={cn(
              "bg-card border rounded-2xl p-4 relative overflow-hidden shadow-card transition-all",
              Math.abs(adj) >= 15 ? "border-primary/30" : "border-border"
            )}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[34px]">{menu.img}</span>
                <div>
                  <div className="text-[14px] font-bold text-foreground">{menu.name}</div>
                  <POSBadge color="muted" className="text-[10px]">{menu.cat}</POSBadge>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                {adj !== 0 && (
                  <span className="font-mono text-[12px] text-muted-foreground line-through">฿{menu.base}</span>
                )}
                <span className={cn(
                  "font-mono text-[26px] font-extrabold tabular-nums",
                  isUp ? "text-warning" : isDown ? "text-success" : "text-foreground"
                )}>฿{newPrice}</span>
                {adj !== 0 && (
                  <POSBadge color={isUp ? "warning" : "success"} glow>
                    {isUp ? "▲" : "▼"} {Math.abs(adj)}%
                  </POSBadge>
                )}
              </div>

              <div className="border-t border-border pt-2 space-y-0.5">
                {reasons.length > 0
                  ? reasons.map((r, i) => <div key={i} className="text-[11px] text-muted-foreground leading-relaxed">{r}</div>)
                  : <div className="text-[11px] text-muted-foreground/60">ราคาปกติ — ไม่มีปัจจัยกระทบ</div>
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue impact */}
      <div className="bg-card border border-primary/20 rounded-2xl p-4 shadow-card flex items-center gap-5">
        <span className="text-[36px]">📊</span>
        <div className="flex-1">
          <div className="text-[13px] font-bold text-foreground mb-0.5">ผลกระทบต่อรายได้ (จำลอง)</div>
          <div className="text-[12px] text-muted-foreground">
            เวลา {hour}:00 · อากาศ {weather === "rainy" ? "ฝน" : weather === "hot" ? "ร้อนจัด" : "แดด"} · อีเวนต์ {event === "none" ? "ไม่มี" : event === "concert" ? "คอนเสิร์ต" : "วันหยุด"}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] text-muted-foreground">รายได้เพิ่มขึ้น (ประมาณ)</div>
          <div className={cn(
            "font-mono text-[28px] font-extrabold tabular-nums",
            avgAdj >= 0 ? "text-success" : "text-danger"
          )}>
            {avgAdj >= 0 ? "+" : ""}{Math.max(-30, avgAdj)}%
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FEATURE 2: Sales Forecasting
// ════════════════════════════════════════════════════════════
const ACTUAL   = [28400, 31200, 26800, 35600, 42100, 38900, 29500];
const FORECAST = [31000, 33500, 28200, 37800, 44500, 41200, 30800, 32400, 35100, 29900, 38200, 45800, 42500, 31500];
const DAYS     = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

const STAFF_REC = [
  { day: "จ.",  staff: 3, reason: "ยอดปกติ",        high: false },
  { day: "อ.",  staff: 3, reason: "ยอดปกติ",        high: false },
  { day: "พ.",  staff: 2, reason: "ยอดต่ำ — ลดคน", high: false },
  { day: "พฤ.", staff: 4, reason: "ยอดสูง — เพิ่มคน", high: true },
  { day: "ศ.",  staff: 5, reason: "Peak! +2 คน",     high: true },
  { day: "ส.",  staff: 4, reason: "ยอดสูง",          high: true },
  { day: "อา.", staff: 3, reason: "ยอดปกติ",         high: false },
];

const STOCK_PRED = [
  { name: "กุ้ง",       current: 5.2, needed: 8.5, unit: "kg",    urgent: true  },
  { name: "เส้นผัดไทย", current: 3.0, needed: 6.0, unit: "kg",    urgent: true  },
  { name: "ไข่ไก่",    current: 120, needed: 85,  unit: "ฟอง",   urgent: false },
  { name: "กะทิ",       current: 1.5, needed: 4.0, unit: "ลิตร", urgent: true  },
  { name: "ข้าวสาร",   current: 20,  needed: 12,  unit: "kg",    urgent: false },
];

function SalesForecast() {
  const [days, setDays] = useState(7);

  const displayForecast = days === 7 ? FORECAST.slice(0, 7) : FORECAST;
  const maxVal = Math.max(...ACTUAL, ...displayForecast);

  return (
    <div className="space-y-4">
      <div className="text-[13px] text-muted-foreground">
        พยากรณ์ยอดขายล่วงหน้า 7–14 วัน พร้อมแนะนำจำนวนพนักงานและวัตถุดิบที่ต้องเตรียม
      </div>

      {/* Stat cards */}
      <div className="flex gap-3 flex-wrap">
        <POSStatCard icon="📈" label="Accuracy" value="94.2%" sub="AI model v2.1"       color="success" />
        <POSStatCard icon="📊" label="ยอดพยากรณ์ (7 วัน)" value="฿231k" sub="+8% จากสัปดาห์นี้" color="primary" trend={8} />
        <POSStatCard icon="🧑‍💼" label="ประหยัดค่าแรง"  value="฿4,200" sub="ต่อสัปดาห์"       color="accent"  />
        <POSStatCard icon="📦" label="ต้องสั่งด่วน"    value="3 รายการ" sub="ภายในพรุ่งนี้"   color="warning" />
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-[14px] font-bold text-foreground">กราฟพยากรณ์ยอดขาย</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">แถบทึบ = ยอดจริง · แถบประ = AI พยากรณ์</div>
          </div>
          <div className="flex gap-1.5">
            {[7, 14].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={cn("px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors",
                  days === d ? "border-primary/40 bg-primary/8 text-primary" : "border-border text-muted-foreground hover:border-border-light")}>
                {d} วัน
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-1.5 pb-5" style={{ height: 180 }}>
          {/* Actual bars */}
          {ACTUAL.map((v, i) => (
            <div key={`a${i}`} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-muted-foreground font-mono">{(v / 1000).toFixed(1)}k</span>
              <div className="w-full max-w-7 rounded-t-md rounded-b-sm gradient-primary transition-all"
                style={{ height: `${(v / maxVal) * 110}px`, boxShadow: "var(--shadow-primary)" }} />
              <span className="text-[10px] text-foreground font-semibold">{DAYS[i]}</span>
            </div>
          ))}

          {/* Divider */}
          <div className="w-px self-stretch mx-1 opacity-40"
            style={{ backgroundImage: "repeating-linear-gradient(to bottom, hsl(var(--accent)) 0 4px, transparent 4px 8px)" }} />

          {/* Forecast bars */}
          {displayForecast.map((v, i) => (
            <div key={`f${i}`} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-accent font-mono">{(v / 1000).toFixed(1)}k</span>
              <div className="w-full max-w-7 rounded-t-md rounded-b-sm border border-dashed border-accent/60 bg-accent/10 transition-all"
                style={{ height: `${(v / maxVal) * 110}px` }} />
              <span className="text-[10px] text-accent font-semibold">{DAYS[i + (days === 14 ? 0 : 7)]}</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-4 justify-center text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded-sm gradient-primary inline-block" />ยอดจริง
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded-sm border border-dashed border-accent/60 bg-accent/10 inline-block" />AI พยากรณ์
          </span>
        </div>
      </div>

      {/* Staff + Stock */}
      <div className="flex gap-4">
        {/* Staff */}
        <div className="flex-1 bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-[14px] font-bold text-foreground mb-3 flex items-center gap-1.5">
            🧑‍💼 <span className="text-gradient-primary">AI แนะนำพนักงาน</span>
          </div>
          <div className="divide-y divide-border/40">
            {STAFF_REC.map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <span className={cn("text-[12px] font-bold w-8", s.high ? "text-warning" : "text-foreground")}>{s.day}</span>
                <div className="flex gap-1">
                  {Array.from({ length: s.staff }).map((_, j) => (
                    <div key={j} className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center text-[11px] border",
                      j < 3 ? "bg-primary/10 border-primary/25 text-primary" : "bg-warning/10 border-warning/25 text-warning"
                    )}>👤</div>
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground flex-1">{s.reason}</span>
                <span className={cn("font-mono text-[13px] font-bold tabular-nums", s.high ? "text-warning" : "text-foreground")}>
                  {s.staff} คน
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 px-3 py-2.5 rounded-xl bg-success/5 border border-success/20 text-[12px] text-muted-foreground">
            💡 ประหยัดค่าแรงได้ ~฿4,200/สัปดาห์ จากการจัดคนตาม AI
          </div>
        </div>

        {/* Stock */}
        <div className="flex-1 bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-[14px] font-bold text-foreground mb-3 flex items-center gap-1.5">
            📦 <span className="text-gradient-primary">AI แนะนำสั่งซื้อวัตถุดิบ</span>
          </div>
          <div className="divide-y divide-border/40">
            {STOCK_PRED.map((s, i) => {
              const pct    = Math.min(100, (s.current / s.needed) * 100);
              const enough = s.current >= s.needed;
              return (
                <div key={i} className="py-2.5">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-[13px] font-semibold text-foreground">{s.name}</span>
                    <span className={cn("text-[11px] font-mono font-bold tabular-nums", enough ? "text-success" : "text-danger")}>
                      {s.current}{s.unit} / ต้องการ {s.needed}{s.unit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500",
                      enough ? "bg-success" : pct < 50 ? "bg-danger" : "bg-warning")}
                      style={{ width: `${pct}%` }} />
                  </div>
                  {s.urgent && (
                    <div className="text-[11px] text-danger mt-1 font-semibold">
                      ⚠️ ต้องสั่งเพิ่ม {(s.needed - s.current).toFixed(1)} {s.unit} ภายในพรุ่งนี้
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button className="w-full mt-3 py-2.5 rounded-xl gradient-primary text-white text-[13px] font-bold shadow-primary hover:shadow-primary-lg transition-shadow">
            📝 สร้างใบสั่งซื้ออัตโนมัติ (PO)
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FEATURE 3: AI Dynamic Menu
// ════════════════════════════════════════════════════════════
type CustomerKey = "new" | "regular" | "health" | "vip";

const CUSTOMERS: Record<CustomerKey, { name: string; visits: number; pref: string[]; allergies: string[]; budget: string }> = {
  new:     { name: "ลูกค้าใหม่",    visits: 0,  pref: [],                                    allergies: [],              budget: "กลาง" },
  regular: { name: "คุณสมชาย",      visits: 12, pref: ["ผัดไทย", "ต้มยำกุ้ง", "ชาเย็น"],     allergies: ["ถั่ว"],        budget: "สูง"  },
  health:  { name: "คุณนภา",        visits: 8,  pref: ["ส้มตำ", "ยำ"],                        allergies: ["กลูเตน", "นม"], budget: "กลาง" },
  vip:     { name: "คุณแพร (VIP)",  visits: 22, pref: ["แกงเขียวหวาน", "ข้าวเหนียวมะม่วง"],  allergies: [],              budget: "สูง"  },
};

type RecItem = { name: string; price: number; reason: string; confidence: number; img: string; tag: string };

function getMenuRec(customer: CustomerKey, mealTime: string): RecItem[] {
  if (customer === "regular") return [
    { name: "ผัดไทยกุ้งสด",     price: 99,  reason: "📊 สั่งบ่อยสุด (8/12 ครั้ง)",      confidence: 96, img: "🍜", tag: "เมนูโปรด"   },
    { name: "ต้มยำกุ้งน้ำข้น",  price: 179, reason: "🔥 เมนูใหม่ คล้ายที่ชอบ",          confidence: 88, img: "🍲", tag: "แนะนำใหม่"  },
    { name: "ชาเย็นพิเศษ",       price: 55,  reason: "🧋 สั่งทุกครั้ง — จับคู่ดี",       confidence: 94, img: "🧋", tag: "จับคู่"     },
    { name: "ข้าวเหนียวมะม่วง",  price: 89,  reason: "🎯 Upsell — 67% สั่งเพิ่ม",       confidence: 72, img: "🥭", tag: "Upsell"     },
  ];
  if (customer === "health") return [
    { name: "ส้มตำ (ไม่ใส่ถั่ว)", price: 69,  reason: "💚 ปลอดกลูเตน + ปลอดนม",          confidence: 92, img: "🥗", tag: "Safe"       },
    { name: "ยำวุ้นเส้นทะเล",    price: 99,  reason: "🌿 Low-cal ไม่มีนม/กลูเตน",        confidence: 87, img: "🥬", tag: "Healthy"    },
    { name: "น้ำมะนาวสด",         price: 35,  reason: "🍋 เครื่องดื่ม safe ไม่มีนม",     confidence: 90, img: "🍋", tag: "Safe"       },
    { name: "ผลไม้รวม",           price: 59,  reason: "🎯 ของหวาน healthy",               confidence: 78, img: "🍇", tag: "Upsell"     },
  ];
  if (customer === "vip") return [
    { name: "แกงเขียวหวานพรีเมียม", price: 159, reason: "👑 VIP เมนูพิเศษเฉพาะคุณ",       confidence: 95, img: "🍛", tag: "VIP Only"   },
    { name: "เป็ดย่างน้ำผึ้ง",    price: 249, reason: "🔥 Chef's Special วันนี้",          confidence: 82, img: "🦆", tag: "พิเศษ"      },
    { name: "ข้าวเหนียวมะม่วง",   price: 89,  reason: "📊 สั่งทุก 2 ครั้ง",               confidence: 91, img: "🥭", tag: "โปรด"       },
    { name: "ไวน์แก้ว",           price: 190, reason: "🍷 VIP pairing — กำไรสูง",          confidence: 68, img: "🍷", tag: "High Margin" },
  ];
  // new customer
  if (mealTime === "lunch") return [
    { name: "ข้าวผัดกุ้ง",        price: 89,  reason: "🏆 เมนูขายดีอันดับ 1 ช่วงเที่ยง", confidence: 88, img: "🍛", tag: "Best Seller" },
    { name: "ข้าวมันไก่",         price: 65,  reason: "💰 คุ้มค่า ราคาเข้าถึงง่าย",       confidence: 85, img: "🍗", tag: "คุ้มค่า"    },
    { name: "ชาเย็น",             price: 45,  reason: "🧋 เครื่องดื่มยอดนิยมคู่อาหาร",   confidence: 82, img: "🧋", tag: "จับคู่"     },
    { name: "บัวลอย",             price: 45,  reason: "🎯 ของหวานยอดนิยม ช่วงเที่ยง",    confidence: 70, img: "🍡", tag: "Upsell"     },
  ];
  return [
    { name: "ต้มยำกุ้ง",          price: 159, reason: "🌙 ยอดนิยมอันดับ 1 ช่วงเย็น",     confidence: 90, img: "🍲", tag: "Best Seller" },
    { name: "ผัดไทย",             price: 79,  reason: "🔥 Trending บน Social",             confidence: 84, img: "🍜", tag: "Trending"   },
    { name: "กาแฟเย็น",           price: 55,  reason: "☕ เครื่องดื่มยอดนิยม ช่วงค่ำ",   confidence: 78, img: "☕", tag: "จับคู่"     },
    { name: "ข้าวเหนียวมะม่วง",   price: 89,  reason: "🥭 Season มะม่วง! ยอดพุ่ง 2x",    confidence: 86, img: "🥭", tag: "Seasonal"   },
  ];
}

const TAG_COLOR: Record<string, "primary" | "accent" | "success" | "warning" | "danger" | "muted"> = {
  "เมนูโปรด":   "primary", "แนะนำใหม่": "accent",  "จับคู่":  "muted",
  "Upsell":      "warning", "Safe":      "success", "Healthy": "success",
  "VIP Only":    "danger",  "พิเศษ":     "danger",  "โปรด":    "primary",
  "High Margin": "warning", "Best Seller":"danger", "คุ้มค่า": "success",
  "Trending":    "accent",  "Seasonal":  "warning",
};

function AIDynamicMenu() {
  const [customer, setCustomer] = useState<CustomerKey>("new");
  const [mealTime, setMealTime] = useState("lunch");

  const c    = CUSTOMERS[customer];
  const recs = getMenuRec(customer, mealTime);

  return (
    <div className="space-y-4">
      <div className="text-[13px] text-muted-foreground">
        เมนูปรับเปลี่ยนตามโปรไฟล์ลูกค้า ประวัติสั่ง อาการแพ้ และเทรนด์ — เพิ่มยอดต่อบิลอัตโนมัติ
      </div>

      {/* Controls */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex gap-6 flex-wrap">
          <div>
            <div className="text-[12px] font-semibold text-muted-foreground mb-2">👤 เลือกลูกค้า</div>
            <div className="flex gap-2">
              {([["new","🆕 ลูกค้าใหม่"],["regular","🔄 ขาประจำ"],["health","💚 แพ้อาหาร"],["vip","👑 VIP"]] as [CustomerKey, string][]).map(([k, l]) => (
                <button key={k} onClick={() => setCustomer(k)}
                  className={cn("px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
                    customer === k ? "border-primary/40 bg-primary/8 text-primary" : "border-border bg-card text-muted-foreground hover:border-border-light hover:text-foreground")}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {customer === "new" && (
            <div>
              <div className="text-[12px] font-semibold text-muted-foreground mb-2">🕐 มื้ออาหาร</div>
              <div className="flex gap-2">
                {[["lunch","🌞 เที่ยง"],["dinner","🌙 เย็น"]].map(([k, l]) => (
                  <button key={k} onClick={() => setMealTime(k)}
                    className={cn("px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
                      mealTime === k ? "border-accent/40 bg-accent/8 text-accent" : "border-border bg-card text-muted-foreground hover:border-border-light hover:text-foreground")}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Customer profile */}
        {customer !== "new" && (
          <div className="flex items-center gap-3 px-4 py-3 bg-surface-alt rounded-xl border border-border">
            <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-white font-extrabold text-[16px] shadow-primary shrink-0">
              {c.name.charAt(3)}
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-foreground">{c.name}</div>
              <div className="text-[12px] text-muted-foreground">มา {c.visits} ครั้ง · เมนูโปรด: {c.pref.join(", ")}</div>
            </div>
            {c.allergies.length > 0 && (
              <div>
                <div className="text-[11px] text-danger font-semibold mb-1">⚠️ แพ้อาหาร:</div>
                <div className="flex gap-1">
                  {c.allergies.map((a) => <POSBadge key={a} color="danger">{a}</POSBadge>)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recommendation cards */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {recs.map((r, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 shadow-card relative overflow-hidden flex flex-col">
            <div className="absolute top-3 right-3">
              <POSBadge color={TAG_COLOR[r.tag] ?? "primary"} glow>{r.tag}</POSBadge>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[36px]">{r.img}</span>
              <div>
                <div className="text-[14px] font-bold text-foreground">{r.name}</div>
                <div className="font-mono text-[20px] font-extrabold text-accent tabular-nums">฿{r.price}</div>
              </div>
            </div>
            <div className="text-[12px] text-muted-foreground mb-3 flex-1 leading-relaxed">{r.reason}</div>
            {/* Confidence */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-muted-foreground">AI ความมั่นใจ</span>
                <span className={cn("font-mono font-bold tabular-nums",
                  r.confidence > 85 ? "text-success" : r.confidence > 70 ? "text-warning" : "text-muted-foreground")}>
                  {r.confidence}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500",
                  r.confidence > 85 ? "bg-success" : r.confidence > 70 ? "bg-warning" : "bg-muted-foreground/40")}
                  style={{ width: `${r.confidence}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Impact stats */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="text-[13px] font-bold text-muted-foreground mb-4">📊 ผลลัพธ์จากระบบ AI Personalization</div>
        <div className="grid grid-cols-4 gap-4 text-center">
          {[
            { label: "ยอดต่อบิลเพิ่มขึ้น", value: "+23%",  icon: "💰", color: "text-success"  },
            { label: "อัตราสั่ง Upsell",  value: "34%",   icon: "🎯", color: "text-warning"  },
            { label: "ลดเมนูที่แพ้ 100%", value: "✅",    icon: "🛡️", color: "text-primary"  },
            { label: "ความพึงพอใจลูกค้า", value: "4.8/5", icon: "⭐", color: "text-accent"   },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-[24px] mb-1">{s.icon}</div>
              <div className={cn("font-mono text-[22px] font-extrabold tabular-nums", s.color)}>{s.value}</div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN AI SCREEN
// ════════════════════════════════════════════════════════════
export function AIScreen() {
  const [tab, setTab] = useState<AITab>("pricing");

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide bg-background">
      {/* Sub-header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[16px] font-bold text-foreground flex items-center gap-2">
              🤖 <span className="text-gradient-primary">AI Features</span>
              <POSBadge color="primary" glow>Phase 3 Preview</POSBadge>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">ฟีเจอร์ AI ที่คู่แข่งยังไม่มี — ตัวเปลี่ยนเกมสำหรับร้านอาหาร SME</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-surface-alt rounded-xl p-1 border border-border">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("px-4 py-2 rounded-lg text-[12px] font-bold transition-all",
                tab === t.key
                  ? "gradient-primary text-white shadow-primary"
                  : "text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {tab === "pricing"  && <DynamicPricing />}
        {tab === "forecast" && <SalesForecast />}
        {tab === "menu"     && <AIDynamicMenu />}
      </div>
    </div>
  );
}
