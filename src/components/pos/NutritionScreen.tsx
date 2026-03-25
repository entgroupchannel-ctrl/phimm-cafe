import { useState } from "react";
import { POSBadge } from "./POSBadge";
import { POSStatCard } from "./POSStatCard";
import { cn } from "@/lib/utils";

// ── Menu data with full nutrition ──────────────────────────
const MENU = [
  { id: 1, name: "ข้าวผัดกุ้ง",       img: "🍛", price:  89, cat: "จานหลัก",
    cal: 520, protein: 22, carb: 68, fat: 16, fiber: 3, sodium: 890,  sugar: 4,
    allergens: ["กุ้ง"],              dietTags: ["ไม่มีนม"],
    ingredients: [
      { name: "กุ้งสด",       source: "ฟาร์มกุ้งสมุทรสาคร",   organic: false, local: true,  cert: "GAP"               },
      { name: "ข้าวหอมมะลิ",  source: "นาข้าวบุรีรัมย์",       organic: true,  local: true,  cert: "Organic Thailand"  },
      { name: "ไข่ไก่",        source: "ฟาร์มไข่ CP",           organic: false, local: true,  cert: "มาตรฐาน อย."       },
      { name: "น้ำมันรำข้าว", source: "King",                   organic: false, local: true,  cert: ""                  },
      { name: "ผักสด",         source: "สวนผักปทุมธานี",        organic: true,  local: true,  cert: "PGS Organic"       },
    ], healthScore: 72 },

  { id: 2, name: "ต้มยำกุ้ง",         img: "🍲", price: 159, cat: "จานหลัก",
    cal: 280, protein: 28, carb: 18, fat: 12, fiber: 4, sodium: 1200, sugar: 3,
    allergens: ["กุ้ง"],              dietTags: ["Low-carb","Keto-friendly","ไม่มีกลูเตน"],
    ingredients: [
      { name: "กุ้งแม่น้ำ",   source: "แม่น้ำเจ้าพระยา",       organic: false, local: true,  cert: ""                  },
      { name: "เห็ดฟาง",      source: "ฟาร์มเห็ดนครปฐม",       organic: true,  local: true,  cert: "Organic"           },
      { name: "ตะไคร้/ใบมะกรูด", source: "สวนสมุนไพรราชบุรี",  organic: true,  local: true,  cert: "Organic"           },
      { name: "น้ำปลา",        source: "ปลาดี",                  organic: false, local: true,  cert: "อย."               },
      { name: "พริกสด",        source: "ไร่พริกเชียงใหม่",      organic: false, local: true,  cert: ""                  },
    ], healthScore: 88 },

  { id: 3, name: "ส้มตำไทย",          img: "🥗", price:  69, cat: "จานหลัก",
    cal: 180, protein:  8, carb: 24, fat:  6, fiber: 6, sodium:  980, sugar: 12,
    allergens: ["ถั่ว","กุ้ง(แห้ง)"], dietTags: ["Low-cal","High-fiber","ไม่มีกลูเตน","ไม่มีนม"],
    ingredients: [
      { name: "มะละกอ",        source: "สวนมะละกอสระบุรี",      organic: true,  local: true,  cert: "Organic"           },
      { name: "ถั่วลิสง",      source: "ไร่ถั่วลพบุรี",          organic: false, local: true,  cert: ""                  },
      { name: "กุ้งแห้ง",      source: "ท่าเรือมหาชัย",          organic: false, local: true,  cert: ""                  },
      { name: "มะเขือเทศ",     source: "สวนผักเชียงใหม่",        organic: true,  local: true,  cert: "PGS"               },
    ], healthScore: 91 },

  { id: 4, name: "แกงเขียวหวาน",      img: "🍛", price:  99, cat: "จานหลัก",
    cal: 380, protein: 24, carb: 22, fat: 22, fiber: 3, sodium:  850, sugar: 6,
    allergens: ["นม(กะทิ)"],          dietTags: ["ไม่มีกลูเตน"],
    ingredients: [
      { name: "ไก่",            source: "ฟาร์มไก่ CP",           organic: false, local: true,  cert: "มาตรฐาน อย."       },
      { name: "กะทิ",           source: "ชาวสวนประจวบฯ",          organic: true,  local: true,  cert: "Organic"           },
      { name: "พริกแกง",        source: "ทำเอง (สูตรร้าน)",       organic: false, local: true,  cert: "—"                 },
      { name: "มะเขือ",         source: "สวนผักปทุมธานี",          organic: true,  local: true,  cert: "PGS"               },
    ], healthScore: 68 },

  { id: 5, name: "น้ำมะนาวโซดา",      img: "🍋", price:  45, cat: "เครื่องดื่ม",
    cal:  80, protein:  0, carb: 20, fat:  0, fiber: 0, sodium:   15, sugar: 18,
    allergens: [],                    dietTags: ["Vegan","ไม่มีกลูเตน","ไม่มีนม","ไม่มีถั่ว"],
    ingredients: [
      { name: "มะนาว",          source: "สวนมะนาวราชบุรี",        organic: true,  local: true,  cert: "Organic"           },
      { name: "น้ำตาลอ้อย",    source: "โรงงานน้ำตาลกาญจนบุรี", organic: false, local: true,  cert: ""                  },
      { name: "โซดา",           source: "Schweppes",               organic: false, local: false, cert: ""                  },
    ], healthScore: 65 },

  { id: 6, name: "ข้าวเหนียวมะม่วง",  img: "🥭", price:  89, cat: "ของหวาน",
    cal: 420, protein:  6, carb: 78, fat: 12, fiber: 3, sodium:  120, sugar: 42,
    allergens: ["นม(กะทิ)"],          dietTags: ["ไม่มีกลูเตน","Vegan-option"],
    ingredients: [
      { name: "มะม่วงน้ำดอกไม้", source: "สวนมะม่วงฉะเชิงเทรา", organic: true,  local: true,  cert: "ThaiGAP"           },
      { name: "ข้าวเหนียว",      source: "นาข้าวเชียงราย",        organic: true,  local: true,  cert: "Organic Thailand"  },
      { name: "กะทิ",             source: "ชาวสวนประจวบฯ",         organic: true,  local: true,  cert: "Organic"           },
    ], healthScore: 52 },
];

const DIETS = ["ทั้งหมด","Low-cal","Low-carb","High-fiber","Keto-friendly","Vegan","ไม่มีกลูเตน","ไม่มีนม","ไม่มีถั่ว"];
const ALLERGEN_OPTS = ["กุ้ง","ถั่ว","นม","ไข่","กลูเตน"];

// ── Macro Ring SVG ─────────────────────────────────────────
function MacroRing({ label, value, max, unit, colorClass, size = 64 }: {
  label: string; value: number; max: number; unit: string; colorClass: string; size?: number;
}) {
  const r      = (size - 8) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, (value / max) * 100) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" className="stroke-border" strokeWidth={4} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={4}
            className={colorClass} strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-mono font-extrabold tabular-nums", colorClass.includes("accent") ? "text-accent" : colorClass.includes("warning") ? "text-warning" : colorClass.includes("success") ? "text-success" : colorClass.includes("danger") ? "text-danger" : "text-foreground")}
            style={{ fontSize: size * 0.22 }}>{value}{unit}</span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

// ── Health score badge ─────────────────────────────────────
function HealthScore({ score }: { score: number }) {
  const color = score >= 80 ? "success" : score >= 60 ? "warning" : "danger";
  const label = score >= 80 ? "ดีมาก" : score >= 60 ? "ปานกลาง" : "ควรระวัง";
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className={cn(
        "w-11 h-11 rounded-xl flex items-center justify-center font-mono font-extrabold text-[16px] border",
        color === "success" ? "bg-success/10 border-success/30 text-success" :
        color === "warning" ? "bg-warning/10 border-warning/30 text-warning" :
                               "bg-danger/10  border-danger/30  text-danger"
      )}>{score}</div>
      <div>
        <div className={cn("text-[12px] font-bold", color === "success" ? "text-success" : color === "warning" ? "text-warning" : "text-danger")}>{label}</div>
        <div className="text-[10px] text-muted-foreground">Health Score</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// TAB 1: Nutrition Explorer
// ════════════════════════════════════════════════
function NutritionTab() {
  const [selectedId, setSelectedId]       = useState(2);
  const [dietFilter, setDietFilter]       = useState("ทั้งหมด");
  const [allergenFilter, setAllergenFilter] = useState<string[]>([]);

  const filtered = MENU.filter(m => {
    if (dietFilter !== "ทั้งหมด" && !m.dietTags.includes(dietFilter)) return false;
    if (allergenFilter.length > 0 && m.allergens.some(a => allergenFilter.some(af => a.includes(af)))) return false;
    return true;
  });

  const sel = MENU.find(m => m.id === selectedId) ?? MENU[0];

  const MACROS = [
    { label: "แคลอรี",       value: sel.cal,     max: 800,  unit: "",    col: "stroke-warning"  },
    { label: "โปรตีน",       value: sel.protein, max: 50,   unit: "g",   col: "stroke-accent"   },
    { label: "คาร์บ",         value: sel.carb,    max: 100,  unit: "g",   col: "stroke-warning"  },
    { label: "ไขมัน",         value: sel.fat,     max: 40,   unit: "g",   col: "stroke-danger"   },
    { label: "ไฟเบอร์",       value: sel.fiber,   max: 10,   unit: "g",   col: "stroke-success"  },
  ];

  const BARS = [
    { label: "แคลอรี",        value: sel.cal,     max: 800,  unit: "kcal", dv: Math.round(sel.cal/2000*100),     hi: false      },
    { label: "โปรตีน",        value: sel.protein, max: 50,   unit: "g",    dv: Math.round(sel.protein/50*100),   hi: false      },
    { label: "คาร์โบไฮเดรต", value: sel.carb,    max: 100,  unit: "g",    dv: Math.round(sel.carb/300*100),     hi: false      },
    { label: "ไขมัน",          value: sel.fat,     max: 40,   unit: "g",    dv: Math.round(sel.fat/65*100),       hi: false      },
    { label: "ไฟเบอร์",        value: sel.fiber,   max: 10,   unit: "g",    dv: Math.round(sel.fiber/25*100),     hi: false      },
    { label: "โซเดียม",        value: sel.sodium,  max: 2000, unit: "mg",   dv: Math.round(sel.sodium/2300*100),  hi: sel.sodium>1000 },
    { label: "น้ำตาล",         value: sel.sugar,   max: 50,   unit: "g",    dv: Math.round(sel.sugar/50*100),     hi: sel.sugar>20    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex gap-6 flex-wrap">
          <div>
            <div className="text-[12px] font-semibold text-muted-foreground mb-2">🥗 กรองตามไลฟ์สไตล์</div>
            <div className="flex gap-1.5 flex-wrap">
              {DIETS.map(d => (
                <button key={d} onClick={() => setDietFilter(d)}
                  className={cn("px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors",
                    dietFilter === d
                      ? "border-success/50 bg-success/10 text-success"
                      : "border-border bg-card text-muted-foreground hover:border-border-light hover:text-foreground")}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-muted-foreground mb-2">⚠️ กรองสารก่อภูมิแพ้</div>
            <div className="flex gap-1.5 flex-wrap">
              {ALLERGEN_OPTS.map(a => {
                const on = allergenFilter.includes(a);
                return (
                  <button key={a} onClick={() => setAllergenFilter(prev => on ? prev.filter(x => x !== a) : [...prev, a])}
                    className={cn("px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors",
                      on ? "border-danger/50 bg-danger/10 text-danger" : "border-border bg-card text-muted-foreground hover:border-border-light")}>
                    {on ? "🚫 " : ""}{a}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {(dietFilter !== "ทั้งหมด" || allergenFilter.length > 0) && (
          <div className="px-3 py-2 rounded-xl bg-success/5 border border-success/20 text-[12px] text-success font-semibold">
            🛡️ กรองแล้ว: แสดง {filtered.length}/{MENU.length} เมนูที่ปลอดภัยสำหรับคุณ
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {/* Menu list */}
        <div className="w-[280px] shrink-0 space-y-2">
          {filtered.map(m => (
            <button key={m.id} onClick={() => setSelectedId(m.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                selectedId === m.id
                  ? "border-primary/50 bg-primary/8"
                  : "border-border bg-card hover:border-border-light shadow-card"
              )}>
              <span className="text-[26px]">{m.img}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-foreground">{m.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[11px] font-bold text-accent">{m.cal} cal</span>
                  {m.allergens.length > 0 && <POSBadge color="danger" className="text-[9px]">⚠️ {m.allergens.length}</POSBadge>}
                </div>
              </div>
              <HealthScore score={m.healthScore} />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-[13px]">
              <div className="text-[28px] mb-2">🚫</div>ไม่มีเมนูที่ตรงเงื่อนไข
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Header + macro rings */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <div className="flex gap-5 flex-wrap">
              <div className="text-center">
                <div className="text-[56px] leading-none">{sel.img}</div>
                <div className="text-[17px] font-extrabold text-foreground mt-2">{sel.name}</div>
                <div className="font-mono text-[16px] font-extrabold text-accent mt-0.5">฿{sel.price}</div>
                <div className="flex gap-1 justify-center mt-2 flex-wrap">
                  {sel.dietTags.map(dt => <POSBadge key={dt} color="success" className="text-[9px]">{dt}</POSBadge>)}
                </div>
                {sel.allergens.length > 0 && (
                  <div className="flex gap-1 justify-center mt-1.5 flex-wrap">
                    {sel.allergens.map(a => <POSBadge key={a} color="danger" className="text-[9px]">⚠️ {a}</POSBadge>)}
                  </div>
                )}
              </div>
              <div className="flex-1 flex items-center justify-center gap-5 flex-wrap">
                {MACROS.map(m => (
                  <MacroRing key={m.label} label={m.label} value={m.value} max={m.max} unit={m.unit} colorClass={m.col} size={68} />
                ))}
              </div>
            </div>
          </div>

          {/* Nutrition bars */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <div className="text-[14px] font-bold text-foreground mb-4">📊 รายละเอียดโภชนาการ (ต่อจาน)</div>
            <div className="space-y-2">
              {BARS.map((n, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[12px] text-muted-foreground w-[100px] shrink-0">{n.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500",
                      n.hi ? "bg-danger" : i === 0 ? "bg-warning" : i === 1 ? "bg-accent" : i === 2 ? "bg-warning" : i === 3 ? "bg-danger" : "bg-success")}
                      style={{ width: `${Math.min(100, (n.value / n.max) * 100)}%` }} />
                  </div>
                  <span className={cn("font-mono text-[13px] font-bold tabular-nums w-[62px] text-right shrink-0",
                    n.hi ? "text-danger" : "text-foreground")}>
                    {n.value}{n.unit}
                  </span>
                  <span className="text-[11px] text-muted-foreground w-[44px] text-right shrink-0">{n.dv}% DV</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground/60 mt-3">* DV = % Daily Value อ้างอิงพลังงาน 2,000 kcal/วัน</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// TAB 2: Ingredient Sourcing
// ════════════════════════════════════════════════
function SourcingTab() {
  const [selectedId, setSelectedId] = useState(2);
  const sel = MENU.find(m => m.id === selectedId) ?? MENU[0];

  const allIng = MENU.flatMap(m => m.ingredients);
  const organicPct = Math.round(allIng.filter(i => i.organic).length / allIng.length * 100);
  const localPct   = Math.round(allIng.filter(i => i.local).length   / allIng.length * 100);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <POSStatCard icon="🌿" label="Organic"            value={`${organicPct}%`}  sub="ของวัตถุดิบทั้งหมด"     color="success" />
        <POSStatCard icon="📍" label="วัตถุดิบท้องถิ่น"  value={`${localPct}%`}    sub="จากแหล่งในไทย"           color="accent"  />
        <POSStatCard icon="📜" label="ได้รับการรับรอง"   value="68%"               sub="GAP/Organic/อย."         color="primary" />
        <POSStatCard icon="🔄" label="อัปเดตล่าสุด"      value="วันนี้"             sub="ข้อมูลเรียลไทม์"         color="warning" />
      </div>

      {/* Menu selector */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {MENU.map(m => (
          <button key={m.id} onClick={() => setSelectedId(m.id)}
            className={cn("flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold border whitespace-nowrap transition-colors",
              selectedId === m.id
                ? "border-success/50 bg-success/10 text-success"
                : "border-border bg-card text-muted-foreground hover:border-border-light")}>
            {m.img} {m.name}
          </button>
        ))}
      </div>

      {/* Traceability */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex justify-between items-center mb-4">
          <div className="text-[15px] font-bold text-foreground">🔍 แหล่งที่มาวัตถุดิบ — {sel.name} {sel.img}</div>
          <POSBadge color="success" glow>✅ Traceable</POSBadge>
        </div>

        <div className="divide-y divide-border/50">
          {sel.ingredients.map((ing, i) => (
            <div key={i} className="flex items-center gap-4 py-4">
              {/* Icon */}
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center text-[20px] border shrink-0",
                ing.organic ? "bg-success/10 border-success/30" : "bg-muted/30 border-border"
              )}>
                {ing.organic ? "🌿" : "📦"}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-bold text-foreground">{ing.name}</span>
                  {ing.organic && <POSBadge color="success">Organic</POSBadge>}
                  {ing.local   && <POSBadge color="accent">🇹🇭 ท้องถิ่น</POSBadge>}
                  {ing.cert && ing.cert !== "—" && ing.cert !== "" && <POSBadge color="primary">{ing.cert}</POSBadge>}
                </div>
                <div className="text-[12px] text-muted-foreground mt-0.5">📍 {ing.source}</div>
              </div>

              {/* Cert badge */}
              <div className="text-center shrink-0">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center font-mono font-extrabold text-[13px] border",
                  ing.cert && ing.cert !== "—" && ing.cert !== ""
                    ? "bg-success/10 border-success/30 text-success"
                    : "bg-warning/10 border-warning/30 text-warning"
                )}>
                  {ing.cert && ing.cert !== "—" && ing.cert !== "" ? "✓" : "?"}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">
                  {ing.cert && ing.cert !== "—" && ing.cert !== "" ? "ได้รับรอง" : "ไม่ระบุ"}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* QR strip */}
        <div className="mt-4 flex items-center gap-4 px-4 py-3 rounded-xl bg-success/5 border border-success/20">
          {/* Mock QR */}
          <div className="w-12 h-12 rounded-lg bg-foreground/5 border border-border flex items-center justify-center shrink-0">
            <div className="w-9 h-9 rounded opacity-60"
              style={{ backgroundImage: "repeating-conic-gradient(hsl(var(--foreground)) 0% 25%, transparent 0% 50%)", backgroundSize: "6px 6px" }} />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-bold text-success">📱 QR Code ความโปร่งใส</div>
            <div className="text-[12px] text-muted-foreground">ลูกค้าสแกนที่โต๊ะ → เห็นแหล่งที่มาวัตถุดิบทุกจานทันที</div>
          </div>
          <POSBadge color="success" glow>Trust Score: 92%</POSBadge>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// TAB 3: AI Dietary Assistant
// ════════════════════════════════════════════════
type GoalId = "lose" | "maintain" | "gain" | "keto";
const GOALS: { id: GoalId; label: string; emoji: string; cal: number; desc: string }[] = [
  { id: "lose",     label: "ลดน้ำหนัก",      emoji: "🏃", cal: 500, desc: "คุมแคลอรี ไขมันต่ำ"       },
  { id: "maintain", label: "รักษาน้ำหนัก",   emoji: "⚖️", cal: 700, desc: "สมดุลทุกสารอาหาร"         },
  { id: "gain",     label: "เพิ่มกล้ามเนื้อ",emoji: "💪", cal: 900, desc: "โปรตีนสูง คาร์บเพียงพอ"   },
  { id: "keto",     label: "Keto",            emoji: "🥑", cal: 600, desc: "ไขมันสูง คาร์บต่ำ"        },
];

function DietaryAssistantTab() {
  const [goal, setGoal]                   = useState<GoalId>("lose");
  const [calTarget, setCalTarget]         = useState(500);
  const [restrictions, setRestrictions]   = useState<string[]>([]);

  const currentGoal = GOALS.find(g => g.id === goal)!;

  const recs = MENU.filter(m => {
    if (restrictions.includes("กุ้ง") && m.allergens.some(a => a.includes("กุ้ง"))) return false;
    if (restrictions.includes("ถั่ว") && m.allergens.some(a => a.includes("ถั่ว"))) return false;
    if (restrictions.includes("นม")   && m.allergens.some(a => a.includes("นม")))   return false;
    if (m.cal > calTarget) return false;
    return true;
  }).sort((a, b) =>
    goal === "lose" ? a.cal - b.cal :
    goal === "gain" ? b.protein - a.protein :
    goal === "keto" ? a.carb - b.carb :
    a.cal - b.cal
  ).slice(0, 4).map(r => ({
    ...r,
    reason: goal === "lose" ? `Low-cal ${r.cal} kcal` :
            goal === "gain" ? `High-protein ${r.protein}g` :
            goal === "keto" ? `Low-carb ${r.carb}g` : "Balanced",
    match: 80 + ((r.healthScore % 20)),
  }));

  const totalCal = recs.reduce((s, r) => s + r.cal, 0);

  return (
    <div className="space-y-4">
      {/* Goal selector */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
        <div className="text-[14px] font-bold text-foreground">🎯 เป้าหมายของคุณ</div>
        <div className="grid grid-cols-4 gap-2">
          {GOALS.map(g => (
            <button key={g.id} onClick={() => { setGoal(g.id); setCalTarget(g.cal); }}
              className={cn(
                "flex flex-col items-center px-3 py-3.5 rounded-xl border transition-all",
                goal === g.id ? "border-primary/50 bg-primary/8" : "border-border bg-surface-alt hover:border-border-light"
              )}>
              <div className="text-[24px]">{g.emoji}</div>
              <div className={cn("text-[13px] font-bold mt-1", goal === g.id ? "text-primary" : "text-foreground")}>{g.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 text-center">{g.desc}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-6 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="text-[12px] font-semibold text-muted-foreground mb-2">
              🔥 เป้าแคลอรี/มื้อ:{" "}
              <span className="font-mono text-[18px] font-extrabold text-accent tabular-nums">{calTarget} kcal</span>
            </div>
            <input type="range" min={300} max={1200} step={50} value={calTarget}
              onChange={e => setCalTarget(+e.target.value)}
              className="w-full accent-primary h-1.5 cursor-pointer" />
            <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1">
              <span>300</span><span>700</span><span>1200</span>
            </div>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-muted-foreground mb-2">⚠️ แพ้อาหาร</div>
            <div className="flex gap-1.5">
              {["กุ้ง","ถั่ว","นม"].map(a => {
                const on = restrictions.includes(a);
                return (
                  <button key={a} onClick={() => setRestrictions(prev => on ? prev.filter(x => x !== a) : [...prev, a])}
                    className={cn("px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
                      on ? "border-danger/50 bg-danger/10 text-danger" : "border-border bg-card text-muted-foreground hover:border-border-light")}>
                    {on ? "🚫 " : ""}{a}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="flex justify-between items-center">
        <div className="text-[15px] font-bold text-foreground flex items-center gap-2">
          🤖 <span className="text-gradient-primary">AI แนะนำสำหรับ {currentGoal.emoji} {currentGoal.label}</span>
        </div>
        <div className="text-[13px] text-muted-foreground">
          รวม{" "}
          <span className={cn("font-mono font-bold tabular-nums", totalCal <= calTarget * 1.2 ? "text-success" : "text-warning")}>
            {totalCal} kcal
          </span>
          {" "}/ เป้า {calTarget} kcal
        </div>
      </div>

      {recs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-[13px]">
          <div className="text-[32px] mb-2">😕</div>
          ไม่มีเมนูที่ตรงกับเงื่อนไข — ลองปรับแคลอรีหรือเงื่อนไขการแพ้อาหาร
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {recs.map((r, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[34px]">{r.img}</span>
                <div className="flex-1">
                  <div className="text-[14px] font-bold text-foreground">{r.name}</div>
                  <div className="font-mono text-[17px] font-extrabold text-accent tabular-nums">฿{r.price}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/30 flex items-center justify-center font-mono text-[13px] font-extrabold text-success shrink-0">
                  {r.match}%
                </div>
              </div>

              {/* Mini macros */}
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {[
                  { l: "Cal",  v: `${r.cal}`,     c: "text-warning" },
                  { l: "P",    v: `${r.protein}g`, c: "text-accent"  },
                  { l: "C",    v: `${r.carb}g`,    c: "text-warning" },
                  { l: "F",    v: `${r.fat}g`,     c: "text-danger"  },
                ].map((m, j) => (
                  <div key={j} className="text-center py-1 rounded-lg bg-muted/20">
                    <div className={cn("font-mono text-[12px] font-extrabold tabular-nums", m.c)}>{m.v}</div>
                    <div className="text-[9px] text-muted-foreground">{m.l}</div>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-muted-foreground">
                🎯 {r.reason}
                {r.dietTags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1.5">
                    {r.dietTags.slice(0, 3).map(dt => <POSBadge key={dt} color="success" className="text-[9px]">{dt}</POSBadge>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Meal plan */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="text-[14px] font-bold text-foreground mb-4">
          📋 ตัวอย่าง Meal Plan วันนี้ ({currentGoal.emoji} {currentGoal.label})
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { meal: "🌅 เช้า",  items: "ข้าวต้มปลา + น้ำเต้าหู้", cal: 320           },
            { meal: "🌞 เที่ยง", items: recs[0]?.name ?? "—",        cal: recs[0]?.cal ?? 0 },
            { meal: "🌙 เย็น",  items: recs[1]?.name ?? "—",        cal: recs[1]?.cal ?? 0 },
            { meal: "🍎 ว่าง",  items: "ผลไม้รวม",                  cal: 120           },
          ].map((m, i) => (
            <div key={i} className="text-center px-3 py-3.5 rounded-xl bg-surface-alt border border-border">
              <div className="text-[13px] mb-1">{m.meal}</div>
              <div className="text-[12px] font-semibold text-foreground mb-1.5 leading-tight">{m.items}</div>
              <div className="font-mono text-[15px] font-extrabold text-accent tabular-nums">{m.cal} cal</div>
            </div>
          ))}
        </div>
        <div className="text-center mt-4 text-[13px] text-muted-foreground">
          รวมทั้งวัน:{" "}
          <span className="font-mono font-extrabold text-success text-[18px] tabular-nums">
            {320 + (recs[0]?.cal ?? 0) + (recs[1]?.cal ?? 0) + 120} kcal
          </span>
          {" "}/ เป้า 2,000 kcal
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════
type NutritionTab = "nutrition" | "sourcing" | "dietary";

const TABS: { key: NutritionTab; label: string }[] = [
  { key: "nutrition", label: "📊 Nutrition Explorer" },
  { key: "sourcing",  label: "🔍 แหล่งที่มาวัตถุดิบ"  },
  { key: "dietary",   label: "🤖 AI Dietary Assistant" },
];

export function NutritionScreen() {
  const [tab, setTab] = useState<NutritionTab>("nutrition");

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide bg-background">
      {/* Sub-header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <div className="text-[15px] font-bold text-foreground flex items-center gap-2">
            🥗 <span className="text-gradient-primary">Food Transparency & Nutrition</span>
            <POSBadge color="success" glow>Food Intelligence</POSBadge>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            โภชนาการโปร่งใส · แหล่งที่มาวัตถุดิบ · AI แนะนำอาหารตามเป้าหมาย
          </div>
        </div>

        <div className="flex gap-1.5 bg-surface-alt rounded-xl p-1 border border-border">
          {TABS.map(t => (
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

      <div className="p-6">
        {tab === "nutrition" && <NutritionTab />}
        {tab === "sourcing"  && <SourcingTab />}
        {tab === "dietary"   && <DietaryAssistantTab />}
      </div>
    </div>
  );
}
