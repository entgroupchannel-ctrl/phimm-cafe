import { useState, useRef, useEffect } from "react";
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

type Screen = "order" | "payment" | "kds" | "menu" | "stock" | "crm" | "staff" | "dashboard" | "ai" | "nutrition" | "kiosk" | "omni" | "qr" | "settings";

// ── Grouped nav structure ──────────────────────────────────
const NAV_GROUPS = [
  {
    label: "การขาย",
    items: [
      { key: "order"    as Screen, icon: "🛒", label: "ออเดอร์"   },
      { key: "payment"  as Screen, icon: "💳", label: "ชำระเงิน"  },
      { key: "kiosk"    as Screen, icon: "🖥️", label: "Kiosk"     },
      { key: "qr"       as Screen, icon: "📲", label: "QR โต๊ะ"   },
    ],
  },
  {
    label: "ร้านครัว",
    items: [
      { key: "kds"      as Screen, icon: "👨‍🍳", label: "จอครัว"   },
      { key: "menu"     as Screen, icon: "📋", label: "เมนู"       },
      { key: "stock"    as Screen, icon: "📦", label: "สต๊อก"      },
    ],
  },
  {
    label: "บริหาร",
    items: [
      { key: "crm"      as Screen, icon: "👥", label: "ลูกค้า"    },
      { key: "staff"    as Screen, icon: "🧑‍💼", label: "พนักงาน" },
      { key: "omni"     as Screen, icon: "🌐", label: "Omni"       },
      { key: "dashboard"as Screen, icon: "📊", label: "Dashboard"  },
    ],
  },
  {
    label: "เครื่องมือ",
    items: [
      { key: "ai"       as Screen, icon: "🤖", label: "AI"         },
      { key: "nutrition"as Screen, icon: "🥗", label: "โภชนา"      },
      { key: "settings" as Screen, icon: "⚙️", label: "ตั้งค่า"    },
    ],
  },
];

// All items flat list (for lookups)
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
  return <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: "hsl(var(--header-muted))" }}>{time}</span>;
}

// ── Compact grouped nav ────────────────────────────────────
function NavBar({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeGroup = NAV_GROUPS.find(g => g.items.some(i => i.key === screen));
  const activeItem = ALL_NAV.find(i => i.key === screen);

  return (
    <nav ref={ref} className="flex items-center gap-1 mx-3">
      {NAV_GROUPS.map(group => {
        const isGroupActive = group.items.some(i => i.key === screen);
        const isOpen = open === group.label;
        return (
          <div key={group.label} className="relative">
            {/* Group pill button */}
            <button
              onClick={() => setOpen(isOpen ? null : group.label)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150 select-none",
                isGroupActive
                  ? "bg-primary text-white shadow-[0_2px_8px_hsl(var(--primary)/0.35)]"
                  : "text-foreground/60 hover:bg-border/60 hover:text-foreground"
              )}>
              {isGroupActive && activeGroup?.label === group.label && (
                <span className="text-[13px] leading-none">{activeItem?.icon}</span>
              )}
              <span>{group.label}</span>
              <svg className={cn("w-3 h-3 opacity-60 transition-transform duration-150", isOpen && "rotate-180")}
                viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Dropdown panel */}
            {isOpen && (
              <div className="absolute top-[calc(100%+6px)] left-0 z-50 glass-dark border border-border rounded-2xl shadow-[0_8px_32px_rgb(0_0_0_/_0.12)] overflow-hidden min-w-[160px] animate-scale-in">
                {group.items.map(item => (
                  <button
                    key={item.key}
                    onClick={() => { setScreen(item.key); setOpen(null); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-all",
                      screen === item.key
                        ? "bg-primary text-white"
                        : "text-foreground hover:bg-muted"
                    )}>
                    <span className="text-[15px] leading-none">{item.icon}</span>
                    <span>{item.label}</span>
                    {screen === item.key && (
                      <span className="ml-auto">
                        <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ── App ────────────────────────────────────────────────────
export function POSApp() {
  const [screen, setScreen] = useState<Screen>("order");
  const [cart, setCart] = useState<CartItem[]>([
    { ...menuItems[1], qty: 1 },
    { ...menuItems[3], qty: 2 },
  ]);

  const activeItem = ALL_NAV.find(i => i.key === screen);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground font-sans">

      {/* ── Apple-style Light Header ── */}
      <header className="flex items-center justify-between px-5 py-2.5 glass-dark border-b border-border/60 shrink-0 z-10"
        style={{ boxShadow: "0 1px 0 hsl(var(--border)/0.8)" }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-[15px] shadow-primary">
            P
          </div>
          <span className="text-[16px] font-bold tracking-tight text-foreground select-none">POSAI</span>
          <span className="badge-apple bg-primary/10 text-primary border border-primary/20 text-[10px]">
            Phase 1
          </span>
        </div>

        {/* Grouped compact nav */}
        <NavBar screen={screen} setScreen={setScreen} />

        {/* Status */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Current screen breadcrumb */}
          {activeItem && (
            <span className="hidden lg:flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground bg-muted/70 px-2.5 py-1 rounded-full border border-border/50">
              <span>{activeItem.icon}</span>
              <span>{activeItem.label}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_5px_hsl(var(--success)/0.7)] animate-pulse-glow" />
            <span className="hidden sm:inline">ออนไลน์</span>
          </span>
          <span className="text-[12px] font-medium text-muted-foreground hidden md:inline">กินดี สุขุมวิท</span>
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
        {screen === "kiosk"     && <KioskScreen />}
        {screen === "omni"      && <OmnichannelScreen />}
        {screen === "qr"        && <QRGeneratorScreen />}
        {screen === "settings"  && <SettingsScreen />}
      </main>
    </div>
  );
}
