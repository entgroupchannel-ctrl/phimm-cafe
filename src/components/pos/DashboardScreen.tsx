import { POSStatCard } from "./POSStatCard";
import { POSBadge } from "./POSBadge";

const HOURS  = ["10","11","12","13","14","15","16","17","18","19","20","21"];
const SALES  = [1200, 3400, 8900, 7200, 4100, 3800, 5200, 7800, 12400, 9800, 6200, 2100];
const MAX    = Math.max(...SALES);

const RECENT = [
  { id: "#0250", table: "T1", items: "แกงเขียวหวาน x2",          total: "฿198", channel: "หน้าร้าน", status: "เสร็จแล้ว"  },
  { id: "#0249", table: "D1", items: "ข้าวมันไก่ x3, ส้มตำ x1", total: "฿264", channel: "LINE MAN",  status: "กำลังทำ"   },
  { id: "#0248", table: "T7", items: "ข้าวผัดกุ้ง x1, ชาเย็น x2",total: "฿179", channel: "หน้าร้าน", status: "กำลังทำ"   },
  { id: "#0247", table: "T3", items: "ต้มยำกุ้ง x1, ผัดไทย x2",  total: "฿317", channel: "หน้าร้าน", status: "เสิร์ฟแล้ว" },
];

const INSIGHTS = [
  { icon: "📈", text: "ช่วง 18:00–19:00 ยอดพุ่งสูงสุด ควรเพิ่มพนักงาน 1 คน", warn: false },
  { icon: "⚠️", text: "กุ้งเหลือ 2.1 kg คาดว่าหมดภายในพรุ่งนี้เช้า",            warn: true  },
  { icon: "🎯", text: "ลูกค้าขาประจำ 'คุณสมชาย' มา 5 ครั้ง/เดือน แนะนำส่วนลด VIP", warn: false },
  { icon: "💡", text: "ผัดไทยขายดีขึ้น 40% เทียบสัปดาห์ก่อน ควรเพิ่มวัตถุดิบ",   warn: false },
];

function statusColor(s: string) {
  if (s === "เสร็จแล้ว")  return "success" as const;
  if (s === "เสิร์ฟแล้ว") return "accent"  as const;
  return "warning" as const;
}

export function DashboardScreen() {
  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide space-y-5">
      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        <POSStatCard icon="💰" label="ยอดขายวันนี้"  value="฿28,430" sub="vs เมื่อวาน"              color="success" trend={12.4} />
        <POSStatCard icon="🧾" label="จำนวนบิล"       value="47"      sub="เฉลี่ย ฿605/บิล"          color="primary" trend={8}    />
        <POSStatCard icon="👥" label="ลูกค้า"          value="124"     sub="คน (walk-in + delivery)"  color="accent"  trend={-3}   />
        <POSStatCard icon="⭐" label="เมนูขายดี"       value="ผัดไทย" sub="32 จาน วันนี้"            color="warning" />
      </div>

      {/* Charts + AI */}
      <div className="flex gap-4">
        {/* Bar chart */}
        <div className="flex-[2] bg-card border border-border rounded-2xl p-5">
          <div className="flex justify-between items-start mb-5">
            <div>
              <div className="text-[15px] font-bold">📊 ยอดขายรายชั่วโมง</div>
              <div className="text-[12px] text-foreground/40 mt-0.5">วันนี้ 10:00 – 21:00</div>
            </div>
            <POSBadge color="success" glow>LIVE</POSBadge>
          </div>
          <div className="flex items-end gap-1.5 h-40 pb-6 relative">
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
                      ? "linear-gradient(135deg, hsl(var(--primary)), hsl(263 70% 64%), hsl(250 82% 76%))"
                      : "hsl(var(--primary)/0.25)",
                    border: i === 8 ? "none" : "1px solid hsl(var(--primary)/0.2)",
                    boxShadow: i === 8 ? "0 0 20px hsl(var(--primary)/0.4)" : "none",
                  }}
                />
                <span className="text-[10px] text-foreground/30">{HOURS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="flex-1 bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-primary/10" />
          <div className="text-[15px] font-bold mb-4 flex items-center gap-1.5">
            🤖 <span className="text-gradient-primary">AI Insights</span>
          </div>
          <div className="space-y-2">
            {INSIGHTS.map((ins, i) => (
              <div
                key={i}
                className={`px-3 py-2.5 rounded-xl border text-[12px] leading-relaxed text-muted-foreground ${
                  ins.warn
                    ? "bg-warning/8 border-warning/25"
                    : "bg-primary/5 border-border"
                }`}
              >
                <span className="mr-1.5">{ins.icon}</span>{ins.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="text-[15px] font-bold mb-4">📋 ออเดอร์ล่าสุด</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-foreground/40 font-semibold border-b border-border text-left">
                <th className="pb-2.5 pr-4">บิล</th>
                <th className="pb-2.5 pr-4">โต๊ะ</th>
                <th className="pb-2.5 pr-4 flex-1">รายการ</th>
                <th className="pb-2.5 pr-4">ยอด</th>
                <th className="pb-2.5 pr-4">ช่องทาง</th>
                <th className="pb-2.5">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {RECENT.map((r) => (
                <tr key={r.id} className="text-foreground/90">
                  <td className="py-2.5 pr-4 font-mono font-bold">{r.id}</td>
                  <td className="py-2.5 pr-4">{r.table}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{r.items}</td>
                  <td className="py-2.5 pr-4 font-mono font-bold text-accent">{r.total}</td>
                  <td className="py-2.5 pr-4">
                    <POSBadge color={r.channel === "LINE MAN" ? "success" : "primary"}>
                      {r.channel}
                    </POSBadge>
                  </td>
                  <td className="py-2.5">
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
