import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type AITab = "analysis" | "forecast" | "recommend";

interface MenuItemData {
  id: string; name: string; emoji: string | null; price: number; cost: number | null;
  is_popular: boolean | null; category_id: string | null;
}
interface OrderData {
  id: string; total: number | null; paid_at: string | null; channel: string | null;
  payment_method: string | null; guest_count: number | null;
}
interface OrderItemData {
  menu_item_id: string; name: string; price: number; qty: number; order_id: string;
}

export function AIScreen() {
  const [tab, setTab] = useState<AITab>("analysis");
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemData[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [menuRes, ordersRes] = await Promise.all([
        supabase.from("menu_items").select("id, name, emoji, price, cost, is_popular, category_id"),
        supabase.from("orders").select("id, total, paid_at, channel, payment_method, guest_count")
          .eq("status", "paid").gte("paid_at", thirtyDaysAgo.toISOString()),
      ]);

      if (menuRes.error) throw menuRes.error;
      if (ordersRes.error) throw ordersRes.error;

      const orderIds = (ordersRes.data || []).map(o => o.id);
      let allItems: OrderItemData[] = [];
      // Fetch in chunks of 200 to avoid URL length limits
      for (let i = 0; i < orderIds.length; i += 200) {
        const chunk = orderIds.slice(i, i + 200);
        const { data, error } = await supabase.from("order_items")
          .select("menu_item_id, name, price, qty, order_id")
          .in("order_id", chunk);
        if (error) throw error;
        allItems = allItems.concat(data || []);
      }

      setMenuItems(menuRes.data || []);
      setOrders(ordersRes.data || []);
      setOrderItems(allItems);
    } catch (err: any) {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  // Computed data
  const topSelling = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    orderItems.forEach(oi => {
      if (!map[oi.menu_item_id]) map[oi.menu_item_id] = { name: oi.name, qty: 0, revenue: 0 };
      map[oi.menu_item_id].qty += oi.qty;
      map[oi.menu_item_id].revenue += oi.price * oi.qty;
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty);
  }, [orderItems]);

  const marginData = useMemo(() => {
    return menuItems
      .filter(m => m.cost && m.cost > 0)
      .map(m => ({ name: m.name, emoji: m.emoji, price: m.price, cost: m.cost!, margin: Math.round((m.price - m.cost!) / m.price * 100) }))
      .sort((a, b) => b.margin - a.margin);
  }, [menuItems]);

  const dailyRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => {
      if (o.paid_at && o.total) {
        const day = o.paid_at.slice(0, 10);
        map[day] = (map[day] || 0) + (o.total || 0);
      }
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, revenue]) => ({
      date: date.slice(5), revenue: Math.round(revenue),
    }));
  }, [orders]);

  const dowPattern = useMemo(() => {
    const dowNames = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
    const map: Record<number, { total: number; count: number }> = {};
    orders.forEach(o => {
      if (o.paid_at && o.total) {
        const dow = new Date(o.paid_at).getDay();
        if (!map[dow]) map[dow] = { total: 0, count: 0 };
        map[dow].total += o.total;
        map[dow].count += 1;
      }
    });
    return Array.from({ length: 7 }, (_, i) => ({
      day: dowNames[i],
      avg: map[i] ? Math.round(map[i].total / Math.max(1, Math.ceil(map[i].count / 4))) : 0,
    }));
  }, [orders]);

  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const avgDaily = dailyRevenue.length > 0 ? Math.round(totalRevenue / dailyRevenue.length) : 0;
  const bestDay = dailyRevenue.reduce((best, d) => d.revenue > (best?.revenue || 0) ? d : best, dailyRevenue[0]);

  // Forecast: next 7 days based on DOW averages
  const forecast = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i + 1);
      const dow = d.getDay();
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        predicted: dowPattern[dow]?.avg || avgDaily,
      };
    });
  }, [dowPattern, avgDaily]);

  // Recommendations
  const lowMargin = marginData.filter(m => m.margin < 40);
  const lowSales = useMemo(() => {
    const salesMap: Record<string, number> = {};
    orderItems.forEach(oi => { salesMap[oi.menu_item_id] = (salesMap[oi.menu_item_id] || 0) + oi.qty; });
    return menuItems
      .filter(m => !m.is_popular && (salesMap[m.id] || 0) < 14) // less than 1/day avg
      .map(m => ({ ...m, totalQty: salesMap[m.id] || 0 }));
  }, [menuItems, orderItems]);

  const TABS: { key: AITab; label: string }[] = [
    { key: "analysis", label: "📊 Menu Analysis" },
    { key: "forecast", label: "📈 Sales Forecast" },
    { key: "recommend", label: "🧠 AI Recommendation" },
  ];

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide bg-background">
      <div className="max-w-[1000px] mx-auto space-y-4">
        <div className="text-[18px] font-bold text-foreground">🤖 AI Analytics</div>

        <div className="flex gap-1.5">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("px-4 py-2 rounded-xl text-[13px] font-bold border transition-all",
                tab === t.key ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="bg-card border border-warning/30 rounded-2xl p-6 text-center">
            <div className="text-[32px] mb-2">📭</div>
            <div className="text-[14px] font-bold text-foreground">ยังไม่มีข้อมูลออเดอร์ 30 วันล่าสุด</div>
            <div className="text-[12px] text-muted-foreground mt-1">เมื่อมีการชำระเงิน ข้อมูลจะแสดงที่นี่อัตโนมัติ</div>
          </div>
        )}

        {tab === "analysis" && orders.length > 0 && (
          <div className="space-y-4">
            {/* Top Selling */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="text-[14px] font-bold text-foreground mb-3">🏆 Top 10 ขายดี (30 วัน)</div>
              <div className="space-y-2">
                {topSelling.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 text-[13px] font-bold text-muted-foreground text-right">#{i + 1}</span>
                    <span className="flex-1 text-[13px] font-medium text-foreground">{item.name}</span>
                    <span className="font-mono text-[13px] font-bold text-foreground">{item.qty} ชิ้น</span>
                    <span className="font-mono text-[13px] font-bold text-accent w-[90px] text-right">฿{item.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Selling */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="text-[14px] font-bold text-foreground mb-3">📉 ขายน้อย (30 วัน)</div>
              <div className="space-y-2">
                {topSelling.slice(-5).reverse().map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="flex-1 text-[13px] font-medium text-foreground">{item.name}</span>
                    <span className="font-mono text-[13px] text-muted-foreground">{item.qty} ชิ้น</span>
                    <span className="font-mono text-[13px] text-muted-foreground w-[90px] text-right">฿{item.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Margin Analysis */}
            {marginData.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="text-[14px] font-bold text-foreground mb-3">💰 Margin Analysis</div>
                <div className="space-y-2">
                  {marginData.slice(0, 10).map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="flex-1 text-[13px] font-medium text-foreground">{item.emoji || "🍽"} {item.name}</span>
                      <span className="font-mono text-[12px] text-muted-foreground">ต้นทุน ฿{item.cost}</span>
                      <span className="font-mono text-[12px] text-muted-foreground">ขาย ฿{item.price}</span>
                      <span className={cn("font-mono text-[13px] font-bold w-[60px] text-right",
                        item.margin >= 60 ? "text-primary" : item.margin >= 40 ? "text-foreground" : "text-destructive")}>
                        {item.margin}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "forecast" && orders.length > 0 && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                <div className="text-[22px] mb-1">📊</div>
                <div className="font-mono text-[22px] font-extrabold text-foreground">฿{avgDaily.toLocaleString()}</div>
                <div className="text-[12px] font-semibold text-foreground">รายได้เฉลี่ย/วัน</div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                <div className="text-[22px] mb-1">🏆</div>
                <div className="font-mono text-[22px] font-extrabold text-foreground">฿{(bestDay?.revenue || 0).toLocaleString()}</div>
                <div className="text-[12px] font-semibold text-foreground">วันที่ดีที่สุด ({bestDay?.date || "—"})</div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                <div className="text-[22px] mb-1">📦</div>
                <div className="font-mono text-[22px] font-extrabold text-foreground">{orders.length}</div>
                <div className="text-[12px] font-semibold text-foreground">ออเดอร์ทั้งหมด (30 วัน)</div>
              </div>
            </div>

            {/* Daily Revenue Chart */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="text-[14px] font-bold text-foreground mb-3">📈 รายได้รายวัน (30 วัน)</div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => [`฿${v.toLocaleString()}`, "รายได้"]} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* DOW Pattern */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="text-[14px] font-bold text-foreground mb-3">📅 รายได้เฉลี่ยตามวันในสัปดาห์</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dowPattern}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => [`฿${v.toLocaleString()}`, "เฉลี่ย"]} />
                  <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Forecast */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="text-[14px] font-bold text-foreground mb-3">🔮 พยากรณ์ 7 วันข้างหน้า (ประมาณการจาก DOW pattern)</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={forecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => [`฿${v.toLocaleString()}`, "คาดการณ์"]} />
                  <Bar dataKey="predicted" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === "recommend" && (
          <div className="space-y-4">
            {lowMargin.length > 0 && (
              <div className="bg-card border border-warning/30 rounded-2xl p-5 shadow-sm">
                <div className="text-[14px] font-bold text-foreground mb-3">⚠️ Margin ต่ำ — พิจารณาปรับราคา</div>
                <div className="text-[12px] text-muted-foreground mb-3">เมนูที่ต้นทุนสูงกว่า 40% ของราคาขาย</div>
                <div className="space-y-2">
                  {lowMargin.map((m, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[13px] font-medium text-foreground flex-1">{m.emoji || "🍽"} {m.name}</span>
                      <span className="font-mono text-[12px] text-muted-foreground">ขาย ฿{m.price} / ต้นทุน ฿{m.cost}</span>
                      <span className="font-mono text-[13px] font-bold text-destructive">{m.margin}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lowSales.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="text-[14px] font-bold text-foreground mb-3">📉 ขายน้อย — พิจารณาถอดออก</div>
                <div className="text-[12px] text-muted-foreground mb-3">เมนูที่ขายได้น้อยกว่า 1 ชิ้น/วัน ใน 14 วันที่ผ่านมา</div>
                <div className="space-y-2">
                  {lowSales.slice(0, 10).map((m, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[13px] font-medium text-foreground flex-1">{m.emoji || "🍽"} {m.name}</span>
                      <span className="font-mono text-[12px] text-muted-foreground">{m.totalQty} ชิ้น/30วัน</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card border border-primary/20 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="text-[36px]">🤖</span>
                <div className="flex-1">
                  <div className="text-[14px] font-bold text-foreground">AI Analysis</div>
                  <div className="text-[12px] text-muted-foreground">วิเคราะห์เชิงลึกด้วย AI จะพร้อมใช้เร็วๆ นี้</div>
                </div>
                <Button variant="outline" onClick={() => toast.info("🤖 AI analysis จะพร้อมใช้เร็วๆ นี้")}>
                  🤖 Ask AI
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
