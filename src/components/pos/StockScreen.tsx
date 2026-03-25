import { stockItems } from "@/data/pos-data";
import { POSStatCard } from "./POSStatCard";
import { POSBadge } from "./POSBadge";

export function StockScreen() {
  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide space-y-5">
      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        <POSStatCard icon="📦" label="วัตถุดิบทั้งหมด"  value="42"  sub="รายการ"              color="primary" />
        <POSStatCard icon="⚠️" label="ใกล้หมด"          value="3"   sub="รายการ ต้องสั่งซื้อ" color="warning" />
        <POSStatCard icon="🚨" label="หมดแล้ว"           value="1"   sub="รายการ วิกฤต!"        color="danger"  />
        <POSStatCard icon="🤖" label="AI แนะนำสั่ง"      value="4"   sub="รายการ พรุ่งนี้เช้า"  color="accent"  />
      </div>

      {/* Stock table */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="text-[15px] font-bold mb-4">📦 สต๊อกวัตถุดิบ</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-foreground/40 font-semibold border-b border-border text-left">
                <th className="pb-2.5 pr-6">วัตถุดิบ</th>
                <th className="pb-2.5 pr-6">คงเหลือ</th>
                <th className="pb-2.5 pr-6">ขั้นต่ำ</th>
                <th className="pb-2.5 pr-6">สถานะ</th>
                <th className="pb-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {stockItems.map((s) => (
                <tr key={s.name}>
                  <td className="py-3 pr-6 font-semibold">{s.name}</td>
                  <td className={`py-3 pr-6 font-mono font-bold tabular-nums ${
                    s.status === "critical" ? "text-danger" :
                    s.status === "low"      ? "text-warning" : "text-foreground"
                  }`}>
                    {s.qty} {s.unit}
                  </td>
                  <td className="py-3 pr-6 text-muted-foreground">
                    {s.min} {s.unit}
                  </td>
                  <td className="py-3 pr-6">
                    <POSBadge
                      color={s.status === "critical" ? "danger" : s.status === "low" ? "warning" : "success"}
                    >
                      {s.status === "critical" ? "🚨 หมด!" : s.status === "low" ? "⚠️ ใกล้หมด" : "✅ ปกติ"}
                    </POSBadge>
                  </td>
                  <td className="py-3">
                    {s.status !== "ok" && (
                      <button className="px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-semibold shadow-[0_2px_8px_hsl(var(--primary)/0.4)] hover:bg-primary/90 transition-colors">
                        📝 สั่งซื้อ
                      </button>
                    )}
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
