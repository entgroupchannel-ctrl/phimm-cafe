import { useState, useEffect } from "react";
import phimmLogo from "@/assets/phimm-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { LoginScreen } from "./pos/LoginScreen";
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
import { TableLayoutAdmin } from "./pos/admin/TableLayoutAdmin";
import { KitchenStationAdmin } from "./pos/admin/KitchenStationAdmin";
import { MenuRoutingAdmin } from "./pos/admin/MenuRoutingAdmin";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  ShoppingCart, CreditCard, Monitor, QrCode,
  ChefHat, BookOpen, Package,
  Users, UserCog, Globe, LayoutDashboard,
  Bot, Salad, Settings,
  Sun, Moon, Menu, LayoutGrid, LogOut,
  Armchair, Flame, Route,
} from "lucide-react";

type Screen = "tables" | "order" | "payment" | "kds" | "menu" | "stock" | "crm" | "staff" | "dashboard" | "ai" | "nutrition" | "kiosk" | "omni" | "qr" | "settings" | "admin-tables" | "admin-stations" | "admin-routing";

const NAV_GROUPS = [
  {
    label: "การขาย",
    items: [
      { key: "tables"  as Screen, icon: LayoutGrid,   label: "โต๊ะ",      permission: "view_tables"     },
      { key: "order"   as Screen, icon: ShoppingCart,  label: "ออเดอร์",   permission: "create_order"    },
      { key: "payment" as Screen, icon: CreditCard,    label: "ชำระเงิน",  permission: "process_payment" },
      { key: "kiosk"   as Screen, icon: Monitor,       label: "Kiosk",     permission: "view_kiosk_mgmt" },
      { key: "qr"      as Screen, icon: QrCode,        label: "QR โต๊ะ",   permission: "view_kiosk_mgmt" },
    ],
  },
  {
    label: "ร้านครัว",
    items: [
      { key: "kds"   as Screen, icon: ChefHat,  label: "จอครัว",  permission: "view_kds"     },
      { key: "menu"  as Screen, icon: BookOpen,  label: "เมนู",   permission: "manage_menu"  },
      { key: "stock" as Screen, icon: Package,   label: "สต๊อก",  permission: "manage_stock" },
    ],
  },
  {
    label: "บริหาร",
    items: [
      { key: "crm"       as Screen, icon: Users,           label: "ลูกค้า",    permission: "view_crm"       },
      { key: "staff"     as Screen, icon: UserCog,          label: "พนักงาน",   permission: "manage_staff"   },
      { key: "omni"      as Screen, icon: Globe,            label: "Omni",      permission: "view_omni"      },
      { key: "dashboard" as Screen, icon: LayoutDashboard,  label: "Dashboard", permission: "view_dashboard" },
    ],
  },
  {
    label: "เครื่องมือ",
    items: [
      { key: "ai"        as Screen, icon: Bot,      label: "AI",       permission: "view_ai"         },
      { key: "nutrition" as Screen, icon: Salad,     label: "โภชนา",   permission: "view_dashboard"  },
      { key: "settings"  as Screen, icon: Settings,  label: "ตั้งค่า",  permission: "manage_settings" },
    ],
  },
  {
    label: "Admin",
    items: [
      { key: "admin-tables"   as Screen, icon: Armchair, label: "โต๊ะ",        permission: "manage_settings" },
      { key: "admin-stations" as Screen, icon: Flame,    label: "สถานีครัว",   permission: "manage_settings" },
      { key: "admin-routing"  as Screen, icon: Route,    label: "Routing",     permission: "manage_settings" },
    ],
  },
];

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
  const { staff, permissions, logout } = useAuth();

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
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(item => permissions.includes(item.permission));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              {!collapsed && (
                <div className="px-2 pb-1 text-[9px] font-bold tracking-widest uppercase text-muted-foreground/60">
                  {group.label}
                </div>
              )}
              {collapsed && <div className="h-px bg-border/50 mx-1 mb-2" />}

              <div className="space-y-0.5">
                {visibleItems.map(item => {
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
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn(
        "border-t border-border/60 flex items-center bg-[hsl(var(--surface))]",
        collapsed ? "justify-center py-3 px-2 flex-col gap-2" : "justify-between p-3"
      )}>
        {!collapsed && staff && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
              {staff.nickname?.charAt(0) || staff.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-foreground truncate">{staff.nickname || staff.name}</div>
              <div className="text-[9px] text-muted-foreground truncate">{staff.roleLabel}</div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <DarkModeToggle />
          <button
            onClick={logout}
            title="ออกจากระบบ"
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── App ────────────────────────────────────────────────────
export function POSApp() {
  const { isAuthenticated, isLoading, permissions } = useAuth();
  const [screen, setScreen]       = useState<Screen>("tables");
  const [collapsed, setCollapsed] = useState(false);
  const [activeTable, setActiveTable] = useState<string>("");
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Auto-navigate to first allowed screen
  useEffect(() => {
    if (isAuthenticated && permissions.length > 0) {
      const allItems = NAV_GROUPS.flatMap(g => g.items);
      const currentAllowed = allItems.find(i => i.key === screen && permissions.includes(i.permission));
      if (!currentAllowed) {
        const firstAllowed = allItems.find(i => permissions.includes(i.permission));
        if (firstAllowed) setScreen(firstAllowed.key);
      }
    }
  }, [isAuthenticated, permissions]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return <LoginScreen />;

  const handleSelectTable = async (tableId: string, tableLabel: string) => {
    setActiveTableId(tableId);
    setActiveTable(tableLabel);

    const { data: table } = await supabase
      .from('tables')
      .select('current_order_id')
      .eq('id', tableId)
      .single();

    if (table?.current_order_id) {
      setCurrentOrderId(table.current_order_id);
    } else {
      setCurrentOrderId(null);
    }

    setCart([]);
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

      <main className="flex flex-1 overflow-hidden bg-background min-w-0">
        {screen === "tables"    && <TableMapScreen onSelectTable={handleSelectTable} />}
        {screen === "order"     && (
          <OrderScreen
            cart={cart}
            setCart={setCart}
            onPay={() => setScreen("payment")}
            onBack={() => { setScreen("tables"); setCart([]); setCurrentOrderId(null); setActiveTableId(null); }}
            tableLabel={activeTable}
            tableId={activeTableId}
            orderId={currentOrderId}
            setOrderId={setCurrentOrderId}
          />
        )}
        {screen === "payment"   && (
          <PaymentScreen
            cart={cart}
            orderId={currentOrderId}
            tableId={activeTableId}
            onSuccess={() => {
              setScreen("tables");
              setCart([]);
              setCurrentOrderId(null);
              setActiveTableId(null);
            }}
          />
        )}
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
        {screen === "admin-tables"   && <TableLayoutAdmin />}
        {screen === "admin-stations" && <KitchenStationAdmin />}
        {screen === "admin-routing"  && <MenuRoutingAdmin />}
      </main>
    </div>
  );
}
