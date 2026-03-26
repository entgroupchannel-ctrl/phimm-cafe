import { useState } from "react";
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
import { TableMapScreen } from "./pos/TableMapScreen";
import { menuItems } from "@/data/pos-data";
import { cn } from "@/lib/utils";
import {
  ShoppingCart, CreditCard, Monitor, QrCode,
  ChefHat, BookOpen, Package,
  Users, UserCog, Globe, LayoutDashboard,
  Bot, Salad, Settings,
  Sun, Moon, Menu, LayoutGrid,
} from "lucide-react";

type Screen = "tables" | "order" | "payment" | "kds" | "menu" | "stock" | "crm" | "staff" | "dashboard" | "ai" | "nutrition" | "kiosk" | "omni" | "qr" | "settings";

const NAV_GROUPS = [
  {
    label: "การขาย",
    items: [
      { key: "tables"    as Screen, icon: LayoutGrid,      label: "โต๊ะ"     },
      { key: "order"     as Screen, icon: ShoppingCart,    label: "ออเดอร์"  },
      { key: "payment"   as Screen, icon: CreditCard,      label: "ชำระเงิน" },
      { key: "kiosk"     as Screen, icon: Monitor,         label: "Kiosk"    },
      { key: "qr"        as Screen, icon: QrCode,          label: "QR โต๊ะ"  },
    ],
  },
  {
    label: "ร้านครัว",
    items: [
      { key: "kds"       as Screen, icon: ChefHat,         label: "จอครัว"  },
      { key: "menu"      as Screen, icon: BookOpen,         label: "เมนู"    },
      { key: "stock"     as Screen, icon: Package,          label: "สต๊อก"   },
    ],
  },
  {
    label: "บริหาร",
    items: [
      { key: "crm"       as Screen, icon: Users,            label: "ลูกค้า"  },
      { key: "staff"     as Screen, icon: UserCog,          label: "พนักงาน" },
      { key: "omni"      as Screen, icon: Globe,            label: "Omni"    },
      { key: "dashboard" as Screen, icon: LayoutDashboard,  label: "Dashboard"},
    ],
  },
  {
    label: "เครื่องมือ",
    items: [
      { key: "ai"        as Screen, icon: Bot,              label: "AI"      },
      { key: "nutrition" as Screen, icon: Salad,            label: "โภชนา"   },
      { key: "settings"  as Screen, icon: Settings,         label: "ตั้งค่า" },
    ],
  },
];

const ALL_NAV = NAV_GROUPS.flatMap(g => g.items);

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
      title={dark ? "Light mode" : "Dark mode"}
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
function Sidebar({
  screen, setScreen, collapsed, setCollapsed,
}: {
  screen: Screen;
  setScreen: (s: Screen) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  return (
    <aside
      className={cn(
        "shrink-0 flex flex-col bg-[hsl(var(--surface))] border-r border-border overflow-hidden transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[64px]" : "w-[200px]"
      )}
    >
      {/* Logo + hamburger */}
      <div className={cn(
        "flex items-center border-b border-border/60 shrink-0",
        collapsed ? "justify-center px-0 py-3.5 h-[56px]" : "gap-2.5 px-3 py-3.5 h-[56px]"
      )}>
        {!collapsed && (
          <>
            <img src={phimmLogo} alt="Phimm Cafe" className="w-7 h-7 object-contain shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold tracking-tight text-foreground leading-tight truncate">Phimm Cafe</div>
              <div className="text-[9px] font-semibold text-muted-foreground tracking-widest uppercase">POS System</div>
            </div>
          </>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu size={15} />
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-3">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {/* Group label — hide when collapsed */}
            {!collapsed && (
              <div className="px-2 pb-1 text-[9px] font-bold tracking-widest uppercase text-muted-foreground/60">
                {group.label}
              </div>
            )}
            {collapsed && <div className="h-px bg-border/50 mx-1 mb-2" />}

            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const active = screen === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setScreen(item.key)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 select-none",
                      collapsed ? "justify-center px-0 py-2.5 h-10" : "px-3 py-2 text-left",
                      active
                        ? "bg-primary text-white shadow-[0_2px_8px_hsl(var(--primary)/0.28)]"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon size={15} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn(
        "border-t border-border/60 flex items-center bg-[hsl(var(--surface))]",
        collapsed ? "justify-center py-3 px-2 flex-col gap-2" : "justify-between p-3"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))] shadow-[0_0_5px_hsl(var(--success)/0.7)] animate-pulse" />
            <span className="text-[11px] text-muted-foreground font-medium">ออนไลน์</span>
          </div>
        )}
        <DarkModeToggle />
      </div>
    </aside>
  );
}

// ── App ────────────────────────────────────────────────────
export function POSApp() {
  const [screen, setScreen]       = useState<Screen>("tables");
  const [collapsed, setCollapsed] = useState(false);
  const [activeTable, setActiveTable] = useState<string>("3");
  const [cart, setCart] = useState<CartItem[]>([
    { ...menuItems[1], qty: 1 },
    { ...menuItems[3], qty: 2 },
  ]);

  const handleSelectTable = (tableLabel: string) => {
    setActiveTable(tableLabel);
    setScreen("order");
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground font-sans">
      <Sidebar
        screen={screen}
        setScreen={setScreen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* ── Content ── */}
      <main className="flex flex-1 overflow-hidden bg-background min-w-0">
        {screen === "tables"    && <TableMapScreen onSelectTable={handleSelectTable} />}
        {screen === "order"     && <OrderScreen cart={cart} setCart={setCart} onPay={() => setScreen("payment")} tableLabel={activeTable} />}
        {screen === "payment"   && <PaymentScreen cart={cart} onSuccess={() => setScreen("tables")} />}
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
