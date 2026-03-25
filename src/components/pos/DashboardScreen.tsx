import { POSStatCard } from "./POSStatCard";
import { POSBadge } from "./POSBadge";

const HOURS = ["10","11","12","13","14","15","16","17","18","19","20","21"];
const SALES = [1200, 3400, 8900, 7200, 4100, 3800, 5200, 7800, 12400, 9800, 6200, 2100];
const MAX   = Math.max(...SALES);

const RECENT = [
  { id: "#0250", table: "T1", items: "แกงเขียวหวาน x2",           total: "฿198", channel: "หน้าร้าน", status: "เสร็จแล้ว"  },
  { id: "#0249", table: "D1", items: "ข้าวมันไก่ x3, ส้มตำ x1",  total: "฿264", channel: "LINE MAN",  status: "กำลังทำ"   },
  { id: "#0248", table: "T7", items: "ข้าวผัดกุ้ง x1, ชาเย็น x2",total: "฿179", channel: "หน้าร้าน", status: "กำลังทำ"   },
  { id: "#0247", table: "T3", items: "ต้มยำกุ้ง x1, ผัดไทย x2",  total: "฿317", channel: "หน้าร้าน", status: "เสิร์ฟแล้ว" },
];

const INSIGHTS = [
  { icon: "📈", text: "ช่วง 18:00–19:00 ยอดพุ่งสูงสุด ควรเพิ่มพนักงาน 1 คน", warn: false },
  { icon: "⚠️", text: "กุ้งเหลือ 2.1 kg คาดว่าหมดภายในพรุ่งนี้เช้า",            warn: true  },
  { icon: "🎯", text: "ลูกค้าขาประจำ 'คุณสมชาย' มา 5 ครั้ง/เดือน แนะนำส่วนลด VIP", warn: false },
  { icon: "💡", text: "ผัดไทยขายดีขึ้น 40% เทียบสัปดาห์ก่อน ควรเพิ่มวัตถุดิบ",  warn: false },
];

function statusColor(s: string) {
  if (s === "เสร็จแล้ว")  return "success" as const;
  if (s === "เสิร์ฟแล้ว") return "accent"  as const;
  return "warning" as const;
}

export function DashboardScreen() {
  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide space-y-5 bg-background">
      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        <POSStatCard icon="💰" label="ยอดขายวันนี้"   value="฿28,430" sub="vs เมื่อวาน"             color="success" trend={12.4} />
        <POSStatCard icon="🧾" label="จำนวนบิล"        value="47"      sub="เฉลี่ย ฿605/บิล"         color="primary" trend={8} />
        <POSStatCard icon="👥" label="ลูกค้า"           value="124"     sub="คน (walk-in + delivery)" color="accent"  trend={-3} />
        <POSStatCard icon="⭐" label="เมนูขายดี"        value="ผัดไทย" sub="32 จาน วันนี้"           color="warning" />
      </div>

      {/* Chart + AI */}
      <div className="flex gap-4">
        {/* Bar chart */}
        <div className="flex-[2] bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex justify-between items-start mb-5">
            <div>
              <div className="text-[15px] font-bold text-foreground">📊 ยอดขายรายชั่วโมง</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">วันนี้ 10:00 – 21:00</div>
            </div>
            <POSBadge color="success" glow>● LIVE</POSBadge>
          </div>
          <div className="flex items-end gap-1.5 h-40 pb-6">
            {SALES.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-foreground/30 font-mono tabular-nums">
                  {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                </span>
                <div
                  className="w-full max-w-8 rounded-t-md rounded-b-sm transition-all duration-500"
                  style={{
                    height: `${(v / MAX) * 100}px`,
                    background: i === 8
                      ? "var(--gradient-primary)"
                      : "hsl(var(--primary) / 0.15)",
                    border: i !== 8 ? "1px solid hsl(var(--primary) / 0.2)" : "none",
                    boxShadow: i === 8 ? "var(--shadow-primary)" : "none",
                  }}
                />
                <span className="text-[10px] text-foreground/30">{HOURS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="flex-1 bg-card border border-border rounded-2xl p-5 shadow-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-primary/5" />
          <div className="text-[15px] font-bold mb-4 flex items-center gap-1.5 relative">
            🤖 <span className="text-gradient-primary">AI Insights</span>
          </div>
          <div className="space-y-2 relative">
            {INSIGHTS.map((ins, i) => (
              <div key={i} className={`px-3 py-2.5 rounded-xl border text-[13px] leading-relaxed text-muted-foreground ${
                ins.warn ? "bg-warning/6 border-warning/20" : "bg-primary/4 border-border"
              }`}>
                <span className="mr-1.5">{ins.icon}</span>{ins.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="text-[15px] font-bold mb-4 text-foreground">📋 ออเดอร์ล่าสุด</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-muted-foreground font-semibold border-b border-border text-left">
                <th className="pb-3 pr-4 font-semibold">บิล</th>
                <th className="pb-3 pr-4 font-semibold">โต๊ะ</th>
                <th className="pb-3 pr-4 font-semibold">รายการ</th>
                <th className="pb-3 pr-4 font-semibold">ยอด</th>
                <th className="pb-3 pr-4 font-semibold">ช่องทาง</th>
                <th className="pb-3 font-semibold">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {RECENT.map((r) => (
                <tr key={r.id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="py-3 pr-4 font-mono font-bold text-foreground">{r.id}</td>
                  <td className="py-3 pr-4 font-medium">{r.table}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{r.items}</td>
                  <td className="py-3 pr-4 font-mono font-bold text-accent tabular-nums">{r.total}</td>
                  <td className="py-3 pr-4">
                    <POSBadge color={r.channel === "LINE MAN" ? "success" : "primary"}>{r.channel}</POSBadge>
                  </td>
                  <td className="py-3">
                    <POSBadge color={statusColor(r.status)}>{r.status}</POSBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
