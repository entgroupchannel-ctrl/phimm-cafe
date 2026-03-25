import { POSStatCard } from "./POSStatCard";
import { POSBadge } from "./POSBadge";
import { TrendingUp, Clock, Receipt, Users, Star, Bot } from "lucide-react";

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
  { icon: <TrendingUp size={13} />, text: "ช่วง 18:00–19:00 ยอดพุ่งสูงสุด ควรเพิ่มพนักงาน 1 คน", warn: false },
  { icon: "⚠️",                     text: "กุ้งเหลือ 2.1 kg คาดว่าหมดภายในพรุ่งนี้เช้า",            warn: true  },
  { icon: "🎯",                     text: "ลูกค้าขาประจำ 'คุณสมชาย' มา 5 ครั้ง/เดือน แนะนำส่วนลด VIP", warn: false },
  { icon: "💡",                     text: "ผัดไทยขายดีขึ้น 40% เทียบสัปดาห์ก่อน ควรเพิ่มวัตถุดิบ",  warn: false },
];

function statusColor(s: string) {
  if (s === "เสร็จแล้ว")  return "success" as const;
  if (s === "เสิร์ฟแล้ว") return "accent"  as const;
  return "warning" as const;
}

// Shared card shell
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-card border border-border rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.05)] ${className ?? ""}`}>
      {children}
    </div>
  );
}

function SectionHeader({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/60">
      <span className="text-[14px] font-bold text-foreground">{children}</span>
      {right}
    </div>
  );
}

export function DashboardScreen() {
  return (
    <div className="flex-1 p-5 overflow-y-auto scrollbar-hide space-y-4 bg-background">

      {/* ── Stat cards ── */}
      <div className="flex gap-3 flex-wrap">
        <POSStatCard
          icon={<span>💰</span>}
          label="ยอดขายวันนี้" value="฿28,430" sub="vs เมื่อวาน" color="success" trend={12.4} />
        <POSStatCard
          icon={<Receipt size={18} strokeWidth={1.8} />}
          label="จำนวนบิล" value="47" sub="เฉลี่ย ฿605/บิล" color="primary" trend={8} />
        <POSStatCard
          icon={<Users size={18} strokeWidth={1.8} />}
          label="ลูกค้า" value="124" sub="walk-in + delivery" color="accent" trend={-3} />
        <POSStatCard
          icon={<Star size={18} strokeWidth={1.8} />}
          label="เมนูขายดี" value="ผัดไทย" sub="32 จาน วันนี้" color="warning" />
      </div>

      {/* ── Chart + AI row ── */}
      <div className="flex gap-3">

        {/* Bar chart */}
        <Card className="flex-[2]">
          <SectionHeader
            right={<POSBadge color="success" glow>● LIVE</POSBadge>}
          >
            <span className="flex items-center gap-1.5">
              <TrendingUp size={15} strokeWidth={2} className="text-primary" />
              ยอดขายรายชั่วโมง
            </span>
          </SectionHeader>
          <div className="px-5 pb-5 pt-4">
            <div className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1">
              <Clock size={11} />
              วันนี้ 10:00 – 21:00
            </div>
            <div className="flex items-end gap-1.5 h-36">
              {SALES.map((v, i) => {
                const isPeak = i === 8;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[8px] text-muted-foreground/50 font-mono tabular-nums">
                      {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                    </span>
                    <div
                      className="w-full rounded-t-[5px] rounded-b-[3px] transition-all duration-500"
                      style={{
                        height: `${(v / MAX) * 100}px`,
                        background: isPeak
                          ? "hsl(var(--primary))"
                          : "hsl(var(--primary) / 0.14)",
                        boxShadow: isPeak ? "0 4px 12px hsl(var(--primary)/0.35)" : undefined,
                      }}
                    />
                    <span className="text-[9px] text-muted-foreground/50">{HOURS[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* AI Insights */}
        <Card className="flex-1">
          <SectionHeader>
            <span className="flex items-center gap-1.5">
              <Bot size={15} strokeWidth={2} className="text-primary" />
              AI Insights
            </span>
          </SectionHeader>
          <div className="p-4 space-y-2">
            {INSIGHTS.map((ins, i) => (
              <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-[12px] leading-relaxed text-foreground/80 ${
                ins.warn
                  ? "bg-warning/6 border-warning/20"
                  : "bg-muted/50 border-border/60"
              }`}>
                <span className={`mt-0.5 shrink-0 ${ins.warn ? "text-warning" : "text-primary"}`}>
                  {ins.icon}
                </span>
                <span>{ins.text}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Recent orders ── */}
      <Card>
        <SectionHeader right={
          <span className="text-[11px] text-muted-foreground font-medium">4 รายการล่าสุด</span>
        }>
          <span className="flex items-center gap-1.5">
            <Receipt size={15} strokeWidth={2} className="text-primary" />
            ออเดอร์ล่าสุด
          </span>
        </SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-muted-foreground text-left">
                <th className="px-5 py-3 font-semibold border-b border-border/60">บิล</th>
                <th className="px-3 py-3 font-semibold border-b border-border/60">โต๊ะ</th>
                <th className="px-3 py-3 font-semibold border-b border-border/60">รายการ</th>
                <th className="px-3 py-3 font-semibold border-b border-border/60">ยอด</th>
                <th className="px-3 py-3 font-semibold border-b border-border/60">ช่องทาง</th>
                <th className="px-5 py-3 font-semibold border-b border-border/60">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {RECENT.map((r, i) => (
                <tr key={r.id}
                  className="hover:bg-muted/40 transition-colors">
                  <td className={`px-5 py-3.5 font-mono font-bold text-foreground ${i < RECENT.length - 1 ? "border-b border-border/40" : ""}`}>{r.id}</td>
                  <td className={`px-3 py-3.5 font-semibold text-foreground ${i < RECENT.length - 1 ? "border-b border-border/40" : ""}`}>{r.table}</td>
                  <td className={`px-3 py-3.5 text-muted-foreground ${i < RECENT.length - 1 ? "border-b border-border/40" : ""}`}>{r.items}</td>
                  <td className={`px-3 py-3.5 font-mono font-bold tabular-nums ${i < RECENT.length - 1 ? "border-b border-border/40" : ""}`} style={{ color: "hsl(var(--primary))" }}>{r.total}</td>
                  <td className={`px-3 py-3.5 ${i < RECENT.length - 1 ? "border-b border-border/40" : ""}`}>
                    <POSBadge color={r.channel === "LINE MAN" ? "success" : "primary"}>{r.channel}</POSBadge>
                  </td>
                  <td className={`px-5 py-3.5 ${i < RECENT.length - 1 ? "border-b border-border/40" : ""}`}>
                    <POSBadge color={statusColor(r.status)}>{r.status}</POSBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
