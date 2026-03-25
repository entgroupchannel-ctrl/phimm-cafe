import { POSStatCard } from "./POSStatCard";
import { POSBadge } from "./POSBadge";

const CUSTOMERS = [
  { name: "คุณสมชาย",  visits: 12, spent: 4280, lastVisit: "วันนี้",          tier: "VIP",    phone: "081-xxx-4567", fav: "ผัดไทย"          },
  { name: "คุณนภา",    visits: 8,  spent: 2890, lastVisit: "เมื่อวาน",        tier: "Gold",   phone: "092-xxx-1234", fav: "ต้มยำกุ้ง"        },
  { name: "คุณวิชัย",  visits: 5,  spent: 1650, lastVisit: "3 วันก่อน",       tier: "Silver", phone: "089-xxx-9876", fav: "ข้าวผัดกุ้ง"      },
  { name: "คุณแพร",    visits: 15, spent: 6420, lastVisit: "วันนี้",          tier: "VIP",    phone: "064-xxx-5555", fav: "แกงเขียวหวาน"     },
  { name: "คุณธนา",    visits: 3,  spent: 870,  lastVisit: "1 สัปดาห์ก่อน",  tier: "Member", phone: "095-xxx-3210", fav: "ชาเย็น"           },
  { name: "คุณมาลี",   visits: 7,  spent: 2100, lastVisit: "4 วันก่อน",       tier: "Gold",   phone: "082-xxx-7777", fav: "ข้าวมันไก่"       },
];

const LOYALTY = [
  { tier: "Member", rule: "สมัครสมาชิก",  reward: "ส่วนลด 5%",                      color: "muted"   as const },
  { tier: "Silver", rule: "มา 5 ครั้ง",    reward: "ส่วนลด 8%",                      color: "muted"   as const },
  { tier: "Gold",   rule: "มา 8 ครั้ง",    reward: "ส่วนลด 10% + ของหวานฟรี",       color: "warning" as const },
  { tier: "VIP",    rule: "มา 10 ครั้ง",   reward: "ส่วนลด 15% + เมนูพิเศษ",        color: "primary" as const },
];

const AI_TIPS = [
  "🎂 คุณนภา ครบรอบสมาชิก 1 ปี สัปดาห์หน้า — ส่งส่วนลดพิเศษ?",
  "📉 คุณวิชัย ไม่มา 3 วัน (ปกติมาทุกวัน) — ส่ง LINE แจ้งโปรโมชัน?",
  "🏆 คุณแพร ใกล้ครบ 20 ครั้ง — อัปเกรดเป็น VIP+?",
];

function tierColor(tier: string): "primary" | "warning" | "muted" | "accent" {
  if (tier === "VIP")    return "primary";
  if (tier === "Gold")   return "warning";
  if (tier === "Silver") return "muted";
  return "accent";
}

export function CRMScreen() {
  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide space-y-5">
      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        <POSStatCard icon="👥" label="สมาชิกทั้งหมด"      value="248"  sub="คน"                   color="primary" trend={18} />
        <POSStatCard icon="⭐" label="VIP"                value="32"   sub="คน (มา ≥10 ครั้ง)"    color="warning" />
        <POSStatCard icon="🔄" label="ลูกค้ากลับมาซื้อซ้ำ" value="67%"  sub="ของสมาชิกทั้งหมด"    color="success" trend={5} />
        <POSStatCard icon="💰" label="ยอดใช้จ่ายเฉลี่ย"    value="฿580" sub="ต่อครั้ง/คน"         color="accent"  trend={12} />
      </div>

      <div className="flex gap-4">
        {/* Customer List */}
        <div className="flex-[2] bg-card border border-border rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="text-[15px] font-bold">👥 รายชื่อลูกค้า</div>
            <button className="px-4 py-2 rounded-xl gradient-primary text-white text-[12px] font-bold shadow-[0_2px_12px_hsl(var(--primary)/0.4)] hover:shadow-[0_2px_20px_hsl(var(--primary)/0.6)] transition-shadow">
              + เพิ่มสมาชิก
            </button>
          </div>
          <div className="divide-y divide-border/20">
            {CUSTOMERS.map((c, i) => (
              <div key={i} className="flex items-center gap-3.5 py-3.5 cursor-pointer hover:bg-surface-hover/40 -mx-1 px-1 rounded-xl transition-colors">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-extrabold text-base shrink-0">
                  {c.name.charAt(3)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold">{c.name}</span>
                    <POSBadge color={tierColor(c.tier)} glow={c.tier === "VIP"}>{c.tier}</POSBadge>
                  </div>
                  <div className="text-[12px] text-foreground/40 truncate">{c.phone} · เมนูโปรด: {c.fav}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-[14px] font-bold text-accent tabular-nums">฿{c.spent.toLocaleString()}</div>
                  <div className="text-[11px] text-foreground/40">{c.visits} ครั้ง · {c.lastVisit}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Loyalty tiers */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-[15px] font-bold mb-4">🎁 โปรแกรมสะสมแต้ม</div>
            <div className="space-y-2">
              {LOYALTY.map((t) => (
                <div
                  key={t.tier}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${
                    t.color === "primary" ? "bg-primary/5 border-primary/20"
                    : t.color === "warning" ? "bg-warning/5 border-warning/20"
                    : "bg-surface border-border/50"
                  }`}
                >
                  <POSBadge color={t.color}>{t.tier}</POSBadge>
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold">{t.rule}</div>
                    <div className="text-[11px] text-foreground/40">{t.reward}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI suggestions */}
          <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full bg-primary/10" />
            <div className="text-[15px] font-bold mb-3 flex items-center gap-1.5 relative">
              🤖 <span className="text-gradient-primary">AI แนะนำ</span>
            </div>
            <div className="space-y-2 relative">
              {AI_TIPS.map((tip, i) => (
                <div key={i} className="px-3 py-2.5 rounded-xl bg-primary/5 border border-border text-[12px] leading-relaxed text-muted-foreground">
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
