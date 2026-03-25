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
import { AIScreen } from "./pos/AIScreen";
import { NutritionScreen } from "./pos/NutritionScreen";
import { menuItems } from "@/data/pos-data";
import { cn } from "@/lib/utils";

type Screen = "order" | "payment" | "kds" | "menu" | "stock" | "crm" | "staff" | "dashboard" | "ai" | "nutrition" | "settings";

const NAV: { key: Screen; label: string }[] = [
  { key: "order",     label: "🛒 ออเดอร์"   },
  { key: "payment",   label: "💳 ชำระเงิน"  },
  { key: "kds",       label: "👨‍🍳 จอครัว"   },
  { key: "menu",      label: "📋 เมนู"       },
  { key: "stock",     label: "📦 สต๊อก"      },
  { key: "crm",       label: "👥 ลูกค้า"     },
  { key: "staff",     label: "🧑‍💼 พนักงาน"  },
  { key: "dashboard", label: "📊 Dashboard"  },
  { key: "ai",        label: "🤖 AI"         },
  { key: "nutrition", label: "🥗 โภชนาการ"   },
  { key: "settings",  label: "⚙️"            },
];

function Clock() {
  const [time] = useState(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  });
  return <span className="font-mono text-[13px] text-header-muted tabular-nums">{time}</span>;
}

export function POSApp() {
  const [screen, setScreen] = useState<Screen>("order");
  const [cart, setCart] = useState<CartItem[]>([
    { ...menuItems[1], qty: 1 },
    { ...menuItems[3], qty: 2 },
  ]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground font-sans">

      {/* ── Dark Header ── */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-header border-b border-white/[0.07] shrink-0 z-10">

        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white font-extrabold text-[17px] shadow-primary">
            P
          </div>
          <span className="text-[18px] font-bold tracking-tight text-gradient-primary select-none">POSAI</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-accent/20 text-accent border border-accent/30">
            Phase 1
          </span>
        </div>

        {/* Nav */}
        <nav className="flex gap-0.5 bg-white/[0.06] rounded-xl p-1 border border-white/[0.08] overflow-x-auto scrollbar-hide mx-4">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setScreen(item.key)}
              className={cn(
                "px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 whitespace-nowrap shrink-0",
                screen === item.key
                  ? "bg-white text-header shadow-sm"
                  : "text-header-muted hover:text-header-foreground hover:bg-white/[0.08]"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Status */}
        <div className="flex items-center gap-4 text-[12px] shrink-0">
          <span className="flex items-center gap-1.5 text-header-muted">
            <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_hsl(var(--success)/0.7)] animate-pulse-glow" />
            ออนไลน์
          </span>
          <span className="text-header-muted hidden sm:inline">ร้าน: กินดี สุขุมวิท</span>
          <Clock />
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex flex-1 overflow-hidden bg-background">
        {screen === "order"     && <OrderScreen cart={cart} setCart={setCart} onPay={() => setScreen("payment")} />}
        {screen === "payment"   && <PaymentScreen cart={cart} onSuccess={() => setScreen("order")} />}
        {screen === "kds"       && <KDSScreen />}
        {screen === "menu"      && <MenuMgmtScreen />}
        {screen === "stock"     && <StockScreen />}
        {screen === "crm"       && <CRMScreen />}
        {screen === "staff"     && <StaffScreen />}
        {screen === "dashboard" && <DashboardScreen />}
        {screen === "ai"        && <AIScreen />}
        {screen === "nutrition" && <NutritionScreen />}
        {screen === "settings"  && <SettingsScreen />}
      </main>
    </div>
  );
}
