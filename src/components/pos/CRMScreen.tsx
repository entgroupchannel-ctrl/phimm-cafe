import { useState } from "react";
import { cn } from "@/lib/utils";

// ── Data ──────────────────────────────────────────────────
const PLANS = [
  {
    id: "silver", name: "Silver", price: 199, icon: "🥈",
    gradient: "linear-gradient(135deg,#94A3B8,#64748B)",
    colorClass: "text-muted-foreground border-muted-foreground/40",
    perks: ["ส่วนลด 5% ทุกออเดอร์","สะสมแต้ม 1x","วันเกิดรับของหวานฟรี","แจ้งเตือนโปรโมชัน"],
    members: 142, revenue: "28,258", retention: "72%",
  },
  {
    id: "gold", name: "Gold", price: 399, icon: "🥇", popular: true,
    gradient: "linear-gradient(135deg,#F59E0B,#D97706,#B45309)",
    colorClass: "text-warning border-warning/40",
    perks: ["ส่วนลด 10% ทุกออเดอร์","สะสมแต้ม 2x","เมนูพิเศษ Gold Only","จองโต๊ะล่วงหน้า 7 วัน","วันเกิด: 1 เมนูฟรี","ส่งฟรี (Delivery)"],
    members: 89, revenue: "35,511", retention: "86%",
  },
  {
    id: "platinum", name: "Platinum", price: 799, icon: "💎",
    gradient: "linear-gradient(135deg,#EC4899,#8B5CF6)",
    colorClass: "text-accent border-accent/40",
    perks: ["ส่วนลด 15% ทุกออเดอร์","สะสมแต้ม 3x","เมนู Chef's Table","จองโต๊ะ VIP ได้ทุกเมื่อ","วันเกิด: Set meal ฟรี","ส่งฟรีไม่จำกัด","ชิมเมนูใหม่ก่อนใคร","Priority service"],
    members: 23, revenue: "18,377", retention: "95%",
  },
];

const CUSTOMERS = [
  {
    name: "คุณสมชาย", phone: "081-xxx-4567", tier: "Gold", since: "ม.ค. 2025", avatar: "🧔",
    visits: 48, totalSpent: 18420, avgBill: 384, lastVisit: "วันนี้ 12:30",
    favItems: ["ผัดไทย (28x)","ต้มยำกุ้ง (15x)","ชาเย็น (42x)"],
    allergies: ["ถั่ว"],
    visitPeak: "เที่ยง วันจันทร์-ศุกร์", visitFreq: "2.1 ครั้ง/สัปดาห์",
    points: 2840, pointsToNext: 1160,
    history: [
      { date: "วันนี้ 12:30",    items: "ผัดไทย, ชาเย็น",                  amount: 134, channel: "หน้าร้าน" },
      { date: "เมื่อวาน 12:15",  items: "ต้มยำกุ้ง, ข้าว, น้ำมะนาว",      amount: 229, channel: "หน้าร้าน" },
      { date: "20 มี.ค.",        items: "ข้าวผัดกุ้ง x2, ชาเย็น x2",       amount: 268, channel: "LINE MAN" },
      { date: "18 มี.ค.",        items: "ผัดไทย, กาแฟเย็น",                amount: 134, channel: "หน้าร้าน" },
      { date: "15 มี.ค.",        items: "ส้มตำ, ข้าวมันไก่, ชาเย็น",        amount: 179, channel: "Grab"     },
    ],
    sentiment: 92,
    aiInsights: [
      "📈 ยอดใช้จ่ายเพิ่มขึ้น 18% ใน 3 เดือนที่ผ่านมา",
      "🎂 วันเกิด 15 เมษายน — เตรียมส่งโปรโมชัน",
      "🔄 มาทุกวันจันทร์-ศุกร์ ช่วงเที่ยง — เหมาะกับ Lunch Set สมาชิก",
      "💡 ไม่เคยสั่งของหวาน — ลองแนะนำข้าวเหนียวมะม่วง",
    ],
  },
  {
    name: "คุณนภา", phone: "092-xxx-1234", tier: "Platinum", since: "มี.ค. 2024", avatar: "👩",
    visits: 124, totalSpent: 52800, avgBill: 426, lastVisit: "วันนี้ 18:45",
    favItems: ["แกงเขียวหวาน (38x)","ข้าวเหนียวมะม่วง (31x)","กาแฟเย็น (52x)"],
    allergies: ["กลูเตน","นม"],
    visitPeak: "เย็น วันศุกร์-อาทิตย์", visitFreq: "3.2 ครั้ง/สัปดาห์",
    points: 8920, pointsToNext: 1080,
    history: [
      { date: "วันนี้ 18:45",   items: "แกงเขียวหวาน, กาแฟเย็น", amount: 154, channel: "หน้าร้าน" },
      { date: "เมื่อวาน 19:00", items: "Chef's Table Set",         amount: 599, channel: "หน้าร้าน" },
      { date: "22 มี.ค.",       items: "ข้าวเหนียวมะม่วง x2",     amount: 178, channel: "LINE MAN" },
    ],
    sentiment: 98,
    aiInsights: [
      "👑 Top 5% ลูกค้า — พิจารณา Personal VIP treatment",
      "⚠️ แพ้กลูเตนและนม — AI กรองเมนูให้อัตโนมัติแล้ว",
      "🏆 ใกล้ครบ 10,000 แต้ม — แจ้งเตือนรับของรางวัลพิเศษ",
      "📊 ชอบมาวันศุกร์เย็น — เตรียมโต๊ะ VIP ไว้ล่วงหน้า",
    ],
  },
];

const TIERS = [
  { name:"Member",   icon:"🌱", min:0,    colorCls:"text-muted-foreground border-border bg-background",           members:580, perks:["สะสมแต้ม 1x","แจ้งเตือนโปรโมชัน"]                             },
  { name:"Silver",   icon:"🥈", min:500,  colorCls:"text-muted-foreground border-muted-foreground/30 bg-muted/20", members:142, perks:["สะสมแต้ม 1.5x","ส่วนลด 5%","ของหวานฟรีวันเกิด"]             },
  { name:"Gold",     icon:"🥇", min:2000, colorCls:"text-warning border-warning/30 bg-warning/10",                 members:89,  perks:["สะสมแต้ม 2x","ส่วนลด 10%","เมนู Gold Only","จองโต๊ะล่วงหน้า"] },
  { name:"Platinum", icon:"💎", min:5000, colorCls:"text-accent border-accent/30 bg-accent/10",                   members:23,  perks:["สะสมแต้ม 3x","ส่วนลด 15%","Chef's Table","Priority"]          },
];

const REWARDS = [
  { name:"ชาเย็นฟรี",    points:200,  img:"🧋", redeemed:234 },
  { name:"ของหวานฟรี",   points:400,  img:"🍨", redeemed:156 },
  { name:"ส่วนลด ฿100",  points:800,  img:"💰", redeemed:98  },
  { name:"Set Meal ฟรี", points:1500, img:"🍽️", redeemed:45  },
  { name:"Dinner for 2", points:3000, img:"🥂", redeemed:12  },
  { name:"VIP Party",    points:5000, img:"🎉", redeemed:3   },
];

const CHALLENGES = [
  { name:"มา 5 วันติด",        reward:"+500 pts",  progress:3, total:5, icon:"🔥", colorCls:"bg-warning"  },
  { name:"ลองเมนูใหม่ 3 เมนู",  reward:"+300 pts",  progress:1, total:3, icon:"🆕", colorCls:"bg-accent"   },
  { name:"สั่ง Delivery 3 ครั้ง", reward:"+200 pts", progress:2, total:3, icon:"🛵", colorCls:"bg-success"  },
  { name:"ชวนเพื่อนมา 1 คน",    reward:"+1000 pts", progress:0, total:1, icon:"👫", colorCls:"bg-primary"  },
];

const CAMPAIGNS = [
  {
    name:"🎂 Happy Birthday", status:"active", type:"auto",
    trigger:"วันเกิดลูกค้า", channel:"LINE", target:24,
    sent:18, opened:16, redeemed:12, revenue:8400,
    message:"สุขสันต์วันเกิด! รับส่วนลด 20% + ของหวานฟรี วันนี้เท่านั้น 🎉",
  },
  {
    name:"🔄 Win-back ลูกค้าหาย", status:"active", type:"ai",
    trigger:"ไม่มา > 14 วัน", channel:"SMS + LINE", target:45,
    sent:45, opened:32, redeemed:14, revenue:12600,
    message:"คิดถึงคุณนะ! กลับมาทานได้ส่วนลด 15% ใช้ได้ถึงสิ้นเดือน ❤️",
  },
  {
    name:"☔ Rainy Day Special", status:"active", type:"ai",
    trigger:"สภาพอากาศ: ฝนตก", channel:"Push + LINE", target:248,
    sent:248, opened:156, redeemed:42, revenue:18900,
    message:"ฝนตกทั้งวัน 🌧 สั่ง Delivery วันนี้ ส่งฟรี + ต้มยำลด 20%!",
  },
  {
    name:"⭐ VIP Exclusive Menu", status:"scheduled", type:"manual",
    trigger:"ทุกวันศุกร์ 16:00", channel:"LINE", target:23,
    sent:0, opened:0, redeemed:0, revenue:0,
    message:"เมนูพิเศษ Chef's Table สุดสัปดาห์นี้: เป็ดย่างน้ำผึ้ง 🦆 จองเลย!",
  },
];

// ── Helpers ───────────────────────────────────────────────
function Stat({ icon, label, value, sub, trend, colorCls = "text-primary" }: {
  icon:string; label:string; value:string; sub:string; trend?:number; colorCls?:string;
}) {
  return (
    <div className="flex-1 min-w-[130px] bg-card border border-border rounded-2xl p-4 relative overflow-hidden shadow-card">
      <div className="absolute top-0 right-0 w-14 h-14 rounded-bl-full bg-primary/5" />
      <div className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">{icon} {label}</div>
      <div className={cn("font-mono text-[22px] font-black tabular-nums", colorCls)}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
        {trend != null && (
          <span className={trend > 0 ? "text-success font-bold" : "text-danger font-bold"}>
            {trend > 0 ? "▲" : "▼"}{Math.abs(trend)}%
          </span>
        )}
        {sub}
      </div>
    </div>
  );
}

function tierColorCls(tier: string) {
  if (tier === "Platinum") return "text-accent border-accent/40 bg-accent/10";
  if (tier === "Gold")     return "text-warning border-warning/40 bg-warning/10";
  if (tier === "Silver")   return "text-muted-foreground border-muted-foreground/30 bg-muted/20";
  return "text-primary border-primary/30 bg-primary/10";
}
function tierTextColor(tier: string) {
  if (tier === "Platinum") return "text-accent";
  if (tier === "Gold")     return "text-warning";
  return "text-primary";
}

// ── Tab 1: Subscription ───────────────────────────────────
function SubscriptionTab() {
  const [selected, setSelected] = useState("gold");
  const totalRevenue = PLANS.reduce((s, p) => s + parseInt(p.revenue.replace(",", "")), 0);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <Stat icon="👥" label="สมาชิก Subscription" value="254" sub="คน" trend={15} colorCls="text-primary" />
        <Stat icon="💰" label="รายได้/เดือน" value={`฿${totalRevenue.toLocaleString()}`} sub="recurring" trend={22} colorCls="text-success" />
        <Stat icon="🔄" label="Retention เฉลี่ย" value="84%" sub="ต่ออายุสมาชิก" trend={5} colorCls="text-accent" />
        <Stat icon="📈" label="ยอดเพิ่ม/สมาชิก" value="+38%" sub="vs ลูกค้าปกติ" colorCls="text-warning" />
      </div>

      {/* Plan cards */}
      <div className="flex gap-4">
        {PLANS.map(plan => (
          <div key={plan.id} onClick={() => setSelected(plan.id)}
            className={cn(
              "flex-1 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 border-2",
              selected === plan.id ? cn("shadow-lg", plan.colorClass) : "border-border"
            )}
            style={{ transform: selected === plan.id ? "translateY(-4px)" : "none" }}>
            {/* Gradient header */}
            <div className="p-5 relative text-white" style={{ background: plan.gradient }}>
              {plan.popular && (
                <div className="absolute top-3 right-3 bg-white text-[10px] font-extrabold px-2.5 py-1 rounded-full" style={{ color: "#D97706" }}>
                  ⭐ ยอดนิยม
                </div>
              )}
              <div className="text-[32px] leading-none">{plan.icon}</div>
              <div className="text-[20px] font-black mt-2">{plan.name}</div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-mono text-[34px] font-black">฿{plan.price}</span>
                <span className="text-[13px] opacity-70">/เดือน</span>
              </div>
            </div>
            {/* Perks */}
            <div className="p-4 bg-card">
              {plan.perks.map((p, i) => (
                <div key={i} className={cn("flex items-center gap-2 py-1.5 text-[13px]")}>
                  <span className={cn("text-[13px]", plan.colorClass.split(" ")[0])}>✓</span>
                  <span className="text-foreground">{p}</span>
                </div>
              ))}
              {/* Stats */}
              <div className="mt-3 pt-3 border-t border-border flex gap-2">
                {[
                  { l:"สมาชิก",   v: plan.members },
                  { l:"รายได้/ด.", v: `฿${plan.revenue}` },
                  { l:"Retention", v: plan.retention },
                ].map((s, i) => (
                  <div key={i} className="flex-1 text-center">
                    <div className="text-[9px] text-muted-foreground">{s.l}</div>
                    <div className={cn("text-[13px] font-extrabold font-mono", plan.colorClass.split(" ")[0])}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue projection */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card flex items-center gap-5">
        <div className="text-[32px]">📊</div>
        <div className="flex-1">
          <div className="text-[13px] font-bold text-foreground">Subscription Revenue Projection</div>
          <div className="text-[12px] text-muted-foreground">ถ้าสมาชิกเติบโต 15%/ปี (ตามเทรนด์ตลาด)</div>
        </div>
        <div className="flex gap-6 text-center">
          {[
            { y:"ปีที่ 1", v:"฿985K",  cls:"text-primary" },
            { y:"ปีที่ 2", v:"฿1.4M",  cls:"text-accent"  },
            { y:"ปีที่ 3", v:"฿2.1M",  cls:"text-success" },
          ].map((p, i) => (
            <div key={i}>
              <div className="text-[10px] text-muted-foreground">{p.y}</div>
              <div className={cn("font-mono text-[18px] font-black tabular-nums", p.cls)}>{p.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Customer 360 ───────────────────────────────────
function Customer360Tab() {
  const [sel, setSel] = useState(0);
  const c = CUSTOMERS[sel];

  return (
    <div className="space-y-4">
      {/* Customer selector */}
      <div className="flex gap-3">
        {CUSTOMERS.map((cust, i) => (
          <button key={i} onClick={() => setSel(i)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl border-2 cursor-pointer transition-all",
              sel === i ? cn(tierColorCls(cust.tier)) : "border-border bg-card"
            )}>
            <span className="text-[24px]">{cust.avatar}</span>
            <div className="text-left">
              <div className="text-[14px] font-bold text-foreground">{cust.name}</div>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", tierColorCls(cust.tier))}>
                {cust.tier}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Left: profile */}
        <div className="w-72 shrink-0 space-y-3">
          {/* Profile card */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card text-center">
            <div className={cn("w-16 h-16 rounded-2xl mx-auto mb-2 flex items-center justify-center text-[32px] border-2", tierColorCls(c.tier))}>
              {c.avatar}
            </div>
            <div className="text-[17px] font-extrabold text-foreground">{c.name}</div>
            <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-md border", tierColorCls(c.tier))}>
              {c.tier} Member
            </span>
            <div className="text-[11px] text-muted-foreground mt-1">{c.since} · {c.phone}</div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                { l:"มาแล้ว",      v:`${c.visits} ครั้ง` },
                { l:"ใช้จ่ายรวม", v:`฿${c.totalSpent.toLocaleString()}` },
                { l:"เฉลี่ย/บิล",  v:`฿${c.avgBill}` },
                { l:"ล่าสุด",      v:c.lastVisit },
              ].map((s, i) => (
                <div key={i} className="bg-background rounded-xl p-2 text-center">
                  <div className="text-[9px] text-muted-foreground">{s.l}</div>
                  <div className="text-[12px] font-bold font-mono text-foreground">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Points */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
            <div className="text-[13px] font-bold text-foreground mb-2">🎁 แต้มสะสม</div>
            <div className={cn("font-mono text-[24px] font-black tabular-nums", tierTextColor(c.tier))}>
              {c.points.toLocaleString()} pts
            </div>
            <div className="h-2 rounded-full bg-border mt-2 mb-1 overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", c.tier === "Gold" ? "bg-warning" : "bg-accent")}
                style={{ width: `${(c.points / (c.points + c.pointsToNext)) * 100}%` }} />
            </div>
            <div className="text-[10px] text-muted-foreground">อีก {c.pointsToNext.toLocaleString()} แต้ม → อัปเกรดระดับถัดไป</div>
          </div>

          {/* Allergies */}
          {c.allergies.length > 0 && (
            <div className="bg-card border border-danger/30 rounded-2xl p-4 shadow-card">
              <div className="text-[13px] font-bold text-danger mb-2">⚠️ แพ้อาหาร</div>
              <div className="flex gap-1.5 flex-wrap">
                {c.allergies.map(a => (
                  <span key={a} className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-danger/10 text-danger border border-danger/30">{a}</span>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">🤖 AI กรองเมนูที่มีสารเหล่านี้ออกอัตโนมัติ</div>
            </div>
          )}

          {/* Sentiment */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
            <div className="text-[13px] font-bold text-foreground mb-2">😊 ความพึงพอใจ (AI Score)</div>
            <div className="flex items-center gap-3">
              <div className={cn("font-mono text-[28px] font-black tabular-nums",
                c.sentiment > 90 ? "text-success" : c.sentiment > 70 ? "text-warning" : "text-danger")}>
                {c.sentiment}%
              </div>
              <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                <div className={cn("h-full rounded-full transition-all",
                  c.sentiment > 90 ? "bg-success" : c.sentiment > 70 ? "bg-warning" : "bg-danger")}
                  style={{ width: `${c.sentiment}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: details */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Fav + Visit pattern */}
          <div className="flex gap-3">
            <div className="flex-1 bg-card border border-border rounded-2xl p-4 shadow-card">
              <div className="text-[13px] font-bold text-foreground mb-3">❤️ เมนูโปรด</div>
              {c.favItems.map((item, i) => (
                <div key={i} className={cn("flex items-center gap-2 py-2", i > 0 && "border-t border-border")}>
                  <span className="text-[12px] font-semibold text-foreground flex-1">{item}</span>
                  <div className="w-14 h-1.5 rounded-full bg-border overflow-hidden">
                    <div className={cn("h-full rounded-full", i === 0 ? "bg-primary" : i === 1 ? "bg-accent" : "bg-muted-foreground")}
                      style={{ width: `${100 - i * 25}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex-1 bg-card border border-border rounded-2xl p-4 shadow-card">
              <div className="text-[13px] font-bold text-foreground mb-3">📅 รูปแบบการมา</div>
              <div className="bg-background rounded-xl p-3 mb-2">
                <div className="text-[10px] text-muted-foreground">ช่วงที่มาบ่อย</div>
                <div className="text-[13px] font-bold text-foreground">{c.visitPeak}</div>
              </div>
              <div className="bg-background rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground">ความถี่</div>
                <div className="text-[13px] font-bold text-foreground">{c.visitFreq}</div>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
            <div className="text-[13px] font-bold text-foreground mb-3">📋 ประวัติล่าสุด</div>
            {c.history.map((h, i) => (
              <div key={i} className={cn("flex items-center gap-3 py-2.5 text-[13px]", i > 0 && "border-t border-border")}>
                <span className="text-[11px] text-muted-foreground w-24 shrink-0">{h.date}</span>
                <span className="flex-1 text-foreground">{h.items}</span>
                <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0",
                  h.channel === "LINE MAN" ? "bg-success/10 text-success border-success/30" :
                  h.channel === "Grab" ? "bg-warning/10 text-warning border-warning/30" :
                  "bg-primary/10 text-primary border-primary/30")}>
                  {h.channel}
                </span>
                <span className="font-mono text-[13px] font-bold text-accent w-12 text-right shrink-0 tabular-nums">฿{h.amount}</span>
              </div>
            ))}
          </div>

          {/* AI Insights */}
          <div className="bg-card border border-primary/20 rounded-2xl p-4 shadow-card">
            <div className="text-[13px] font-bold text-foreground mb-3 flex items-center gap-2">
              🤖 <span className="text-gradient-primary">AI Insights — {c.name}</span>
            </div>
            <div className="space-y-2">
              {c.aiInsights.map((ins, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/5 border border-border text-[12px] text-muted-foreground">
                  <span className="flex-1 leading-relaxed">{ins}</span>
                  <button className="px-3 py-1.5 rounded-lg gradient-primary text-white text-[11px] font-bold shrink-0 hover:opacity-90 transition-opacity shadow-primary">
                    ดำเนินการ
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Loyalty Gamification ───────────────────────────
function LoyaltyTab() {
  return (
    <div className="space-y-4">
      {/* Tier journey */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="text-[14px] font-bold text-foreground mb-4">🏆 ระดับสมาชิก — Tier Journey</div>
        <div className="flex gap-3">
          {TIERS.map((tier, i) => (
            <div key={i} className="flex-1">
              <div className={cn("p-4 rounded-2xl border text-center", tier.colorCls)}>
                <div className="text-[28px] leading-none">{tier.icon}</div>
                <div className="text-[13px] font-extrabold mt-2">{tier.name}</div>
                <div className="text-[10px] text-muted-foreground">{tier.min.toLocaleString()}+ pts</div>
                <div className="font-mono text-[18px] font-black mt-1 tabular-nums">{tier.members}</div>
                <div className="text-[9px] text-muted-foreground">สมาชิก</div>
              </div>
              <div className="mt-2 space-y-0.5">
                {tier.perks.map((p, j) => (
                  <div key={j} className="text-[10px] text-muted-foreground">✓ {p}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Rewards catalog */}
        <div className="flex-1 bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-[14px] font-bold text-foreground mb-3">🎁 แลกของรางวัล</div>
          <div className="grid grid-cols-2 gap-2.5">
            {REWARDS.map((r, i) => (
              <div key={i} className="bg-background border border-border rounded-xl p-3 text-center cursor-pointer hover:border-primary/40 transition-colors">
                <div className="text-[30px] leading-none">{r.img}</div>
                <div className="text-[12px] font-bold text-foreground mt-2">{r.name}</div>
                <div className="font-mono text-[14px] font-extrabold text-primary mt-1 tabular-nums">{r.points.toLocaleString()} pts</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">แลกแล้ว {r.redeemed} ครั้ง</div>
              </div>
            ))}
          </div>
        </div>

        {/* Challenges */}
        <div className="flex-1 bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="text-[14px] font-bold text-foreground mb-3">🎮 ชาเลนจ์ประจำสัปดาห์</div>
          <div className="space-y-2.5">
            {CHALLENGES.map((ch, i) => (
              <div key={i} className="bg-background border border-border rounded-xl p-3.5">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-[20px]">{ch.icon}</span>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-foreground">{ch.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      รางวัล: <span className="font-bold text-success">{ch.reward}</span>
                    </div>
                  </div>
                  <span className={cn(
                    "font-mono text-[13px] font-extrabold tabular-nums",
                    ch.progress >= ch.total ? "text-success" : "text-foreground"
                  )}>
                    {ch.progress}/{ch.total}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", ch.colorCls)}
                    style={{ width: `${(ch.progress / ch.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground text-center">
            🤖 AI สร้างชาเลนจ์เฉพาะบุคคลตามพฤติกรรมลูกค้า
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 4: AI Campaigns ───────────────────────────────────
function CampaignTab() {
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <Stat icon="📨" label="แคมเปญ/เดือน"    value="4"      sub="แคมเปญ"           colorCls="text-primary" />
        <Stat icon="👁" label="อัตราเปิดอ่าน"   value="68%"    sub="เฉลี่ย" trend={12} colorCls="text-accent"  />
        <Stat icon="🎯" label="ใช้โปรโมชัน"     value="31%"    sub="ของคนเปิดอ่าน" trend={8} colorCls="text-success" />
        <Stat icon="💰" label="รายได้จากแคมเปญ" value="฿39.9K" sub="/เดือน" trend={24} colorCls="text-warning" />
      </div>

      {/* Campaign cards */}
      {CAMPAIGNS.map((camp, i) => (
        <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex gap-4">
            {/* Left */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-[15px] font-extrabold text-foreground">{camp.name}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-bold border",
                  camp.status === "active"
                    ? "bg-success/10 text-success border-success/30 shadow-[0_0_8px_hsl(var(--success)/0.2)]"
                    : "bg-warning/10 text-warning border-warning/30"
                )}>
                  {camp.status === "active" ? "🟢 Active" : "📅 Scheduled"}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-bold border",
                  camp.type === "ai" ? "bg-primary/10 text-primary border-primary/30" : "bg-accent/10 text-accent border-accent/30"
                )}>
                  {camp.type === "ai" ? "🤖 AI" : "⚡ Auto"}
                </span>
              </div>
              <div className="text-[12px] text-muted-foreground mb-3">
                <strong className="text-foreground">Trigger:</strong> {camp.trigger} ·{" "}
                <strong className="text-foreground">ช่องทาง:</strong> {camp.channel} ·{" "}
                <strong className="text-foreground">กลุ่มเป้าหมาย:</strong> {camp.target} คน
              </div>
              <div className="bg-background border border-border rounded-xl px-3.5 py-2.5 text-[13px] text-muted-foreground italic leading-relaxed">
                "{camp.message}"
              </div>
            </div>

            {/* Right: funnel */}
            <div className="w-64 shrink-0">
              <div className="text-[11px] font-bold text-muted-foreground mb-2">📊 Conversion Funnel</div>
              {[
                { label:"ส่งถึง",        value: camp.sent,     total: camp.target, cls:"bg-primary" },
                { label:"เปิดอ่าน",      value: camp.opened,   total: camp.sent,   cls:"bg-accent"  },
                { label:"ใช้โปรโมชัน",  value: camp.redeemed, total: camp.opened, cls:"bg-success" },
              ].map((f, j) => (
                <div key={j} className="mb-2">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-mono font-bold text-foreground tabular-nums">
                      {f.value}/{f.total} ({f.total > 0 ? Math.round(f.value / f.total * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", f.cls)}
                      style={{ width: `${f.total > 0 ? (f.value / f.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
              {camp.revenue > 0 && (
                <div className="mt-3 py-2 px-3 rounded-xl bg-success/5 border border-success/20 text-center">
                  <div className="text-[9px] text-muted-foreground">รายได้จากแคมเปญ</div>
                  <div className="font-mono text-[17px] font-black text-success tabular-nums">
                    ฿{camp.revenue.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* AI suggestion */}
      <div className="bg-card border border-primary/25 rounded-2xl p-5 shadow-card flex items-center gap-4">
        <div className="text-[36px] shrink-0">🤖</div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-gradient-primary mb-1">AI แนะนำแคมเปญถัดไป</div>
          <div className="text-[12px] text-muted-foreground leading-relaxed">
            จากข้อมูลพบว่า ลูกค้า Gold 12 คน ยังไม่ได้ลองเมนูใหม่ "เป็ดย่างน้ำผึ้ง" — แนะนำส่ง LINE พร้อมส่วนลด 10%
          </div>
          <div className="text-[11px] text-accent mt-1">📊 คาดรายได้เพิ่ม ~฿5,400 (Conversion ≈ 35%)</div>
        </div>
        <button className="px-4 py-2.5 rounded-xl gradient-primary text-white text-[13px] font-bold shrink-0 shadow-primary hover:opacity-90 transition-opacity">
          🚀 สร้างแคมเปญ
        </button>
      </div>
    </div>
  );
}

// ── Main CRM Screen ───────────────────────────────────────
const TABS = [
  { label: "💳 Subscription"          },
  { label: "👤 Customer 360"          },
  { label: "🏆 Loyalty & Gamification" },
  { label: "📨 AI Campaigns"          },
];

export function CRMScreen() {
  const [tab, setTab] = useState(0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Tab bar */}
      <div className="px-5 pt-4 pb-0 border-b border-border bg-card shrink-0">
        <div className="flex items-end gap-1">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={cn(
                "px-4 py-2.5 rounded-t-xl text-[13px] font-semibold border-b-2 transition-all whitespace-nowrap",
                tab === i
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background"
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
        {tab === 0 && <SubscriptionTab />}
        {tab === 1 && <Customer360Tab />}
        {tab === 2 && <LoyaltyTab />}
        {tab === 3 && <CampaignTab />}
      </div>
    </div>
  );
}
