import { useState } from "react";
import { kdsOrders } from "@/data/pos-data";
import { POSBadge } from "./POSBadge";
import { cn } from "@/lib/utils";

type KDSStatus = "new" | "cooking" | "ready";

export function KDSScreen() {
  const [orders, setOrders] = useState(kdsOrders.map(o => ({ ...o })));

  const advance = (id: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const next: KDSStatus = o.status === "new" ? "cooking" : o.status === "cooking" ? "ready" : "ready";
      return { ...o, status: next };
    }));
  };

  const counts = {
    new:     orders.filter(o => o.status === "new").length,
    cooking: orders.filter(o => o.status === "cooking").length,
    ready:   orders.filter(o => o.status === "ready").length,
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="text-[18px] font-bold">👨‍🍳 จอครัว (Kitchen Display)</div>
        <div className="flex gap-2">
          <POSBadge color="danger" glow>ใหม่ {counts.new}</POSBadge>
          <POSBadge color="warning">กำลังทำ {counts.cooking}</POSBadge>
          <POSBadge color="success">พร้อมเสิร์ฟ {counts.ready}</POSBadge>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {orders.map((order) => {
          const isNew    = order.status === "new";
          const isReady  = order.status === "ready";
          const isCooking = order.status === "cooking";

          return (
            <div
              key={order.id}
              className={cn(
                "bg-card rounded-2xl p-5 relative border-2 transition-all duration-300",
                isNew    && "border-danger shadow-[0_0_24px_hsl(var(--danger)/0.25)] animate-pulse-border",
                isCooking && "border-warning",
                isReady  && "border-success"
              )}
            >
              {order.delivery && (
                <div className="absolute top-3 right-3">
                  <POSBadge color="success" glow>🛵 Delivery</POSBadge>
                </div>
              )}

              <div className="flex items-center gap-2.5 mb-3">
                <span className="font-mono font-extrabold text-[18px]">{order.id}</span>
                <POSBadge color={isNew ? "danger" : isReady ? "success" : "warning"}>
                  {isNew ? "🔴 ใหม่!" : isReady ? "✅ พร้อมเสิร์ฟ" : "🔥 กำลังทำ"}
                </POSBadge>
              </div>

              <div className="text-[13px] text-muted-foreground mb-3">
                โต๊ะ{" "}
                <span className="font-bold text-foreground">{order.table}</span>
                {" "}· {order.time} ที่แล้ว
              </div>

              <div className="space-y-0">
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    className="py-2 border-t border-border text-[14px] font-semibold"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-4">
                {!isReady && (
                  <button
                    onClick={() => advance(order.id)}
                    className="w-full py-2.5 rounded-xl bg-success text-background font-bold text-[13px] hover:opacity-90 transition-opacity"
                  >
                    ✅ {isCooking ? "เสร็จแล้ว" : "เริ่มทำ"}
                  </button>
                )}
                {isReady && (
                  <button
                    onClick={() => advance(order.id)}
                    className="w-full py-2.5 rounded-xl gradient-primary text-white font-bold text-[13px] shadow-[0_2px_16px_hsl(var(--primary)/0.4)] hover:shadow-[0_2px_24px_hsl(var(--primary)/0.6)] transition-shadow"
                  >
                    🍽 เสิร์ฟแล้ว
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
