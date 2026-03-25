import { useState } from "react";
import { OrderScreen, CartItem } from "./pos/OrderScreen";
import { PaymentScreen } from "./pos/PaymentScreen";
import { DashboardScreen } from "./pos/DashboardScreen";
import { KDSScreen } from "./pos/KDSScreen";
import { StockScreen } from "./pos/StockScreen";
import { MenuMgmtScreen } from "./pos/MenuMgmtScreen";
import { CRMScreen } from "./pos/CRMScreen";
import { StaffScreen } from "./pos/StaffScreen";
import { SettingsScreen } from "./pos/SettingsScreen";
import { POSBadge } from "./pos/POSBadge";
import { menuItems } from "@/data/pos-data";
import { cn } from "@/lib/utils";

type Screen = "order" | "payment" | "kds" | "menu" | "stock" | "crm" | "staff" | "dashboard" | "settings";

const NAV: { key: Screen; label: string }[] = [
  { key: "order",     label: "🛒 ออเดอร์"   },
  { key: "payment",   label: "💳 ชำระเงิน"  },
  { key: "kds",       label: "👨‍🍳 จอครัว"   },
  { key: "menu",      label: "📋 เมนู"       },
  { key: "stock",     label: "📦 สต๊อก"      },
  { key: "crm",       label: "👥 ลูกค้า"     },
  { key: "staff",     label: "🧑‍💼 พนักงาน"  },
  { key: "dashboard", label: "📊 Dashboard"  },
  { key: "settings",  label: "⚙️"            },
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
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white font-extrabold text-lg shadow-[0_4px_20px_hsl(var(--primary)/0.4)]">
            P
          </div>
          <span className="text-[18px] font-bold tracking-tight text-gradient-primary">POSAI</span>
          <POSBadge color="accent" glow>Phase 1 MVP</POSBadge>
        </div>

        {/* Nav */}
        <nav className="flex gap-0.5 bg-card rounded-xl p-1 border border-border overflow-x-auto scrollbar-hide mx-4">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setScreen(item.key)}
              className={cn(
                "px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 whitespace-nowrap shrink-0",
                screen === item.key
                  ? "bg-primary text-white shadow-[0_2px_12px_hsl(var(--primary)/0.4)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Status */}
        <div className="flex items-center gap-4 text-[12px] text-muted-foreground shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_hsl(var(--success)/0.8)] animate-pulse-glow" />
            ออนไลน์
          </span>
          <span className="hidden sm:inline">ร้าน: กินดี สุขุมวิท</span>
          <Clock />
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex flex-1 overflow-hidden">
        {screen === "order"     && <OrderScreen cart={cart} setCart={setCart} onPay={() => setScreen("payment")} />}
        {screen === "payment"   && <PaymentScreen cart={cart} onSuccess={() => setScreen("order")} />}
        {screen === "kds"       && <KDSScreen />}
        {screen === "menu"      && <MenuMgmtScreen />}
        {screen === "stock"     && <StockScreen />}
        {screen === "crm"       && <CRMScreen />}
        {screen === "staff"     && <StaffScreen />}
        {screen === "dashboard" && <DashboardScreen />}
        {screen === "settings"  && <SettingsScreen />}
      </main>
    </div>
  );
}
