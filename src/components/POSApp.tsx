import { useState } from "react";
import { OrderScreen, CartItem } from "./pos/OrderScreen";
import { PaymentScreen } from "./pos/PaymentScreen";
import { DashboardScreen } from "./pos/DashboardScreen";
import { KDSScreen } from "./pos/KDSScreen";
import { StockScreen } from "./pos/StockScreen";
import { POSBadge } from "./pos/POSBadge";
import { menuItems } from "@/data/pos-data";
import { cn } from "@/lib/utils";

type Screen = "order" | "payment" | "kds" | "stock" | "dashboard";

const NAV: { key: Screen; label: string }[] = [
  { key: "order",     label: "🛒 รับออเดอร์" },
  { key: "payment",   label: "💳 ชำระเงิน"  },
  { key: "kds",       label: "👨‍🍳 จอครัว"   },
  { key: "stock",     label: "📦 สต๊อก"      },
  { key: "dashboard", label: "📊 Dashboard"  },
];

function Clock() {
  const [time] = useState(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  });
  return <span className="font-mono text-[13px] text-muted-foreground tabular-nums">{time}</span>;
}

export function POSApp() {
  const [screen, setScreen] = useState<Screen>("order");
  const [cart, setCart] = useState<CartItem[]>([
    { ...menuItems[1], qty: 1 },
    { ...menuItems[3], qty: 2 },
  ]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground font-sans">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-surface border-b border-border shrink-0 z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white font-extrabold text-lg shadow-[0_4px_20px_hsl(var(--primary)/0.4)]">
            P
          </div>
          <span className="text-[18px] font-bold tracking-tight text-gradient-primary">POSAI</span>
          <POSBadge color="accent" glow>Phase 1 MVP</POSBadge>
        </div>

        {/* Nav */}
        <nav className="flex gap-1 bg-card rounded-xl p-1 border border-border">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setScreen(item.key)}
              className={cn(
                "px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150",
                screen === item.key
                  ? "bg-primary text-white shadow-[0_2px_12px_hsl(var(--primary)/0.4)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Status bar */}
        <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_hsl(var(--success)/0.8)] animate-pulse-glow" />
            ออนไลน์
          </span>
          <span>ร้าน: กินดี สุขุมวิท</span>
          <Clock />
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex flex-1 overflow-hidden">
        {screen === "order"     && <OrderScreen cart={cart} setCart={setCart} onPay={() => setScreen("payment")} />}
        {screen === "payment"   && <PaymentScreen cart={cart} onSuccess={() => setScreen("order")} />}
        {screen === "kds"       && <KDSScreen />}
        {screen === "stock"     && <StockScreen />}
        {screen === "dashboard" && <DashboardScreen />}
      </main>
    </div>
  );
}
