import { useState, useEffect } from "react";
import phimmLogo from "@/assets/phimm-logo.png";
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
import { KioskScreen } from "./pos/KioskScreen";
import { OmnichannelScreen } from "./pos/OmnichannelScreen";
import { QRGeneratorScreen } from "./pos/QRGeneratorScreen";
import { menuItems } from "@/data/pos-data";
import { cn } from "@/lib/utils";
import {
  ShoppingCart, CreditCard, Monitor, QrCode,
  ChefHat, BookOpen, Package,
  Users, UserCog, Globe, LayoutDashboard,
  Bot, Salad, Settings,
  Sun, Moon,
} from "lucide-react";

type Screen = "order" | "payment" | "kds" | "menu" | "stock" | "crm" | "staff" | "dashboard" | "ai" | "nutrition" | "kiosk" | "omni" | "qr" | "settings";

const NAV_GROUPS = [
  {
    label: "การขาย",
    items: [
      { key: "order"     as Screen, icon: ShoppingCart, label: "ออเดอร์"  },
      { key: "payment"   as Screen, icon: CreditCard,   label: "ชำระเงิน" },
      { key: "kiosk"     as Screen, icon: Monitor,      label: "Kiosk"    },
      { key: "qr"        as Screen, icon: QrCode,       label: "QR โต๊ะ"  },
    ],
  },
  {
    label: "ร้านครัว",
    items: [
      { key: "kds"       as Screen, icon: ChefHat,      label: "จอครัว"  },
      { key: "menu"      as Screen, icon: BookOpen,      label: "เมนู"    },
      { key: "stock"     as Screen, icon: Package,       label: "สต๊อก"   },
    ],
  },
  {
    label: "บริหาร",
    items: [
      { key: "crm"       as Screen, icon: Users,         label: "ลูกค้า"  },
      { key: "staff"     as Screen, icon: UserCog,       label: "พนักงาน" },
      { key: "omni"      as Screen, icon: Globe,         label: "Omni"    },
      { key: "dashboard" as Screen, icon: LayoutDashboard,label: "Dashboard"},
    ],
  },
  {
    label: "เครื่องมือ",
    items: [
      { key: "ai"        as Screen, icon: Bot,           label: "AI"      },
      { key: "nutrition" as Screen, icon: Salad,         label: "โภชนา"   },
      { key: "settings"  as Screen, icon: Settings,      label: "ตั้งค่า" },
    ],
  },
];

const ALL_NAV = NAV_GROUPS.flatMap(g => g.items);

// ── Live Clock ─────────────────────────────────────────────
function Clock() {
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  });
  useEffect(() => {
    const iv = setInterval(() => {
      const d = new Date();
      setTime(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`);
    }, 10000);
    return () => clearInterval(iv);
  }, []);
  return (
    <span className="font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
      {time}
    </span>
  );
}

// ── Dark Mode Toggle ───────────────────────────────────────
function DarkModeToggle() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Light mode" : "Dark mode"}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-xl border transition-all duration-200 select-none",
        dark
          ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
          : "bg-muted border-border text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
    >
      {dark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}

// ── Sidebar Nav ────────────────────────────────────────────
function Sidebar({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  return (
    <aside className="w-[200px] shrink-0 flex flex-col bg-[hsl(var(--surface))] border-r border-border overflow-y-auto scrollbar-hide">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border/60">
        <img src={phimmLogo} alt="Phimm Cafe" className="w-8 h-8 object-contain shrink-0" />
        <div>
          <div className="text-[13px] font-bold tracking-tight text-foreground leading-tight">Phimm Cafe</div>
          <div className="text-[9px] font-semibold text-muted-foreground tracking-widest uppercase">POS System</div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 p-2 space-y-3">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {/* Group label */}
            <div className="px-2 pb-1 text-[9px] font-bold tracking-widest uppercase text-muted-foreground/60">
              {group.label}
            </div>
            {/* Items */}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const active = screen === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setScreen(item.key)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 select-none text-left",
                      active
                        ? "bg-primary text-white shadow-[0_2px_8px_hsl(var(--primary)/0.28)]"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon size={15} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))] shadow-[0_0_5px_hsl(var(--success)/0.7)] animate-pulse" />
          <span className="text-[11px] text-muted-foreground font-medium">ออนไลน์</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock />
          <DarkModeToggle />
        </div>
      </div>
    </aside>
  );
}

// ── App ────────────────────────────────────────────────────
export function POSApp() {
  const [screen, setScreen] = useState<Screen>("order");
  const [cart, setCart] = useState<CartItem[]>([
    { ...menuItems[1], qty: 1 },
    { ...menuItems[3], qty: 2 },
  ]);

  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground font-sans">
      <Sidebar screen={screen} setScreen={setScreen} />

      {/* ── Content ── */}
      <main className="flex flex-1 overflow-hidden bg-background min-w-0">
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
        {screen === "kiosk"     && <KioskScreen />}
        {screen === "omni"      && <OmnichannelScreen />}
        {screen === "qr"        && <QRGeneratorScreen />}
        {screen === "settings"  && <SettingsScreen />}
      </main>
    </div>
  );
}
