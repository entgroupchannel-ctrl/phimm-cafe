import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Receipt, Users, Star, Download, FileText, Calendar, RefreshCw } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────
function bangkokToday(offset = 0) {
  const d = new Date();
  d.setHours(d.getHours() + 7); // UTC → Bangkok
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function StatCard({ icon, label, value, sub, trend, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; trend?: number; color: string;
}) {
  const colorMap: Record<string, string> = {
    success: "hsl(var(--success))",
    primary: "hsl(var(--primary))",
    accent: "hsl(var(--accent))",
    warning: "hsl(var(--warning))",
  };
  return (
    <div className="flex-1 min-w-[180px] bg-[hsl(var(--surface))] border border-border rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[20px]">{icon}</span>
        {trend !== undefined && (
          <span className={cn("flex items-center gap-0.5 text-[11px] font-bold tabular-nums",
            trend >= 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--danger))]")}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">{label}</div>
      <div className="font-mono text-[24px] font-black tabular-nums text-foreground leading-none" style={{ color: colorMap[color] || undefined }}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--accent))",
  "hsl(var(--danger))",
];

const PAYMENT_LABELS: Record<string, string> = {
  promptpay: "PromptPay",
  cash: "เงินสด",
  credit_card: "บัตร",
  delivery_platform: "Delivery",
  other: "อื่นๆ",
};

const CHANNEL_LABELS: Record<string, string> = {
  walk_in: "หน้าร้าน",
  kiosk: "Kiosk",
  qr_order: "QR Order",
  line_man: "LINE MAN",
  grab: "Grab",
  robinhood: "Robinhood",
  shopee: "Shopee",
  phone: "โทรศัพท์",
};

// ── Main Component ───────────────────────────────────────────
export function DashboardScreen() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(bangkokToday());
  const [loading, setLoading] = useState(true);

  // Data
  const [todayOrders, setTodayOrders] = useState<any[]>([]);
  const [yesterdayOrders, setYesterdayOrders] = useState<any[]>([]);
  const [todayItems, setTodayItems] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  async function fetchData() {
    setLoading(true);
    const yesterday = new Date(selectedDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);

    const [ordersRes, yOrdersRes, itemsRes, ratingRes, recentRes] = await Promise.all([
      supabase.from('orders').select('*').eq('status', 'paid').gte('paid_at', `${selectedDate}T00:00:00`).lt('paid_at', `${selectedDate}T23:59:59`),
      supabase.from('orders').select('total').eq('status', 'paid').gte('paid_at', `${yStr}T00:00:00`).lt('paid_at', `${yStr}T23:59:59`),
      supabase.from('order_items').select('name, price, qty, order_id, orders!inner(status, paid_at)').eq('orders.status', 'paid').gte('orders.paid_at', `${selectedDate}T00:00:00`).lt('orders.paid_at', `${selectedDate}T23:59:59`),
      supabase.from('customer_feedback').select('rating').gte('created_at', `${selectedDate}T00:00:00`).lt('created_at', `${selectedDate}T23:59:59`),
      supabase.from('orders').select('*, tables(label)').gte('created_at', `${selectedDate}T00:00:00`).lt('created_at', `${selectedDate}T23:59:59`).order('created_at', { ascending: false }).limit(20),
    ]);

    setTodayOrders(ordersRes.data || []);
    setYesterdayOrders(yOrdersRes.data || []);
    setTodayItems(itemsRes.data || []);
    setRecentOrders(recentRes.data || []);

    const ratings = ratingRes.data || [];
    setAvgRating(ratings.length > 0 ? ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length : null);

    setLoading(false);
  }

  // ── Computed stats ──
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const revenueTrend = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
  const totalBills = todayOrders.length;
  const totalGuests = todayOrders.reduce((s, o) => s + (o.guest_count || 1), 0);
  const avgBill = totalBills > 0 ? Math.round(todayRevenue / totalBills) : 0;

  // Hourly data
  const hourlyData = useMemo(() => {
    const hours: Record<number, { revenue: number; orders: number }> = {};
    for (let h = 8; h <= 23; h++) hours[h] = { revenue: 0, orders: 0 };
    todayOrders.forEach(o => {
      if (!o.paid_at) return;
      const h = new Date(o.paid_at).getHours();
      if (hours[h]) {
        hours[h].revenue += Number(o.total || 0);
        hours[h].orders += 1;
      }
    });
    return Object.entries(hours).map(([h, d]) => ({ hour: `${h}:00`, revenue: d.revenue, orders: d.orders }));
  }, [todayOrders]);

  // Top items
  const topItems = useMemo(() => {
    const map: Record<string, { qty: number; sales: number }> = {};
    todayItems.forEach(i => {
      const key = i.name;
      if (!map[key]) map[key] = { qty: 0, sales: 0 };
      map[key].qty += i.qty;
      map[key].sales += Number(i.price) * i.qty;
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [todayItems]);

  // Payment breakdown
  const paymentData = useMemo(() => {
    const map: Record<string, number> = {};
    todayOrders.forEach(o => {
      const m = o.payment_method || 'other';
      map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map).map(([key, count]) => ({
      name: PAYMENT_LABELS[key] || key,
      value: count,
    }));
  }, [todayOrders]);

  // Channel breakdown
  const channelData = useMemo(() => {
    const map: Record<string, number> = {};
    todayOrders.forEach(o => {
      const ch = o.channel || 'walk_in';
      map[ch] = (map[ch] || 0) + Number(o.total || 0);
    });
    return Object.entries(map)
      .map(([key, total]) => ({ name: CHANNEL_LABELS[key] || key, total }))
      .sort((a, b) => b.total - a.total);
  }, [todayOrders]);

  // Kitchen performance
  const kitchenPerf = useMemo(() => {
    // We'll calculate from order_items that have cooking_seconds
    const items = todayItems.filter((i: any) => i.cooking_seconds > 0);
    if (items.length === 0) return null;
    const avg = items.reduce((s: number, i: any) => s + i.cooking_seconds, 0) / items.length;
    const sorted = [...items].sort((a: any, b: any) => a.cooking_seconds - b.cooking_seconds);
    return {
      avgMinutes: (avg / 60).toFixed(1),
      fastest: sorted[0],
      slowest: sorted[sorted.length - 1],
    };
  }, [todayItems]);

  // Export CSV
  function exportCSV() {
    const header = "order_number,table,total,payment_method,channel,status,created_at\n";
    const rows = recentOrders.map(o =>
      `${o.order_number},${o.tables?.label || '-'},${o.total},${o.payment_method || '-'},${o.channel || '-'},${o.status},${o.created_at}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `phimm-sales-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "📥 Export สำเร็จ", description: `ดาวน์โหลด phimm-sales-${selectedDate}.csv` });
  }

  async function generateSummary() {
    setGenerating(true);
    const { error } = await supabase.rpc('generate_daily_summary', { p_date: selectedDate });
    setGenerating(false);
    if (error) {
      toast({ title: "❌ Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ สร้างสรุปวันเสร็จแล้ว", description: `สรุปวันที่ ${selectedDate}` });
    }
  }

  const statusStyle = (s: string) => {
    if (s === 'paid') return "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]";
    if (s === 'cancelled') return "bg-[hsl(var(--danger)/0.1)] text-[hsl(var(--danger))] border-[hsl(var(--danger)/0.2)]";
    return "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)]";
  };
  const statusLabel = (s: string) => {
    const map: Record<string, string> = { open: 'เปิด', sent: 'ส่งครัว', cooking: 'กำลังทำ', ready: 'พร้อมเสิร์ฟ', served: 'เสิร์ฟแล้ว', paid: 'จ่ายแล้ว', cancelled: 'ยกเลิก' };
    return map[s] || s;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-[hsl(var(--surface))] shrink-0">
        <div>
          <h1 className="text-[15px] font-bold text-foreground">📊 Dashboard</h1>
          <p className="text-[11px] text-muted-foreground">Sales Analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-muted rounded-xl px-3 py-2 border border-border">
            <Calendar size={13} className="text-muted-foreground" />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-[12px] font-semibold text-foreground outline-none w-[120px]" />
          </div>
          <button onClick={generateSummary} disabled={generating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-50">
            <RefreshCw size={12} className={generating ? "animate-spin" : ""} />
            สร้างสรุปวัน
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-muted text-muted-foreground border border-border hover:text-foreground transition-colors">
            <Download size={12} />
            CSV
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
            กำลังโหลด...
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="flex gap-3 flex-wrap">
              <StatCard icon="💰" label="ยอดขายวันนี้"
                value={`฿${todayRevenue.toLocaleString()}`}
                sub="vs เมื่อวาน" color="success" trend={revenueTrend} />
              <StatCard icon={<Receipt size={18} />} label="จำนวนบิล"
                value={String(totalBills)} sub={`เฉลี่ย ฿${avgBill.toLocaleString()}/บิล`} color="primary" />
              <StatCard icon={<Users size={18} />} label="ลูกค้า"
                value={String(totalGuests)} sub="walk-in + delivery" color="accent" />
              <StatCard icon={<Star size={18} />} label="คะแนนเฉลี่ย"
                value={avgRating != null ? `${avgRating.toFixed(1)}` : "—"}
                sub={avgRating != null ? "/ 5.0" : "ยังไม่มีรีวิว"} color="warning" />
            </div>

            {/* Hourly chart */}
            <div className="bg-[hsl(var(--surface))] border border-border rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="text-[14px] font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp size={15} className="text-primary" />
                ยอดขายรายชั่วโมง
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyData}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `฿${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [`฿${value.toLocaleString()}`, 'ยอดขาย']}
                    labelFormatter={l => `${l}`}
                    contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top items + Payment pie */}
            <div className="flex gap-4 flex-wrap">
              {/* Top items */}
              <div className="flex-1 min-w-[340px] bg-[hsl(var(--surface))] border border-border rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <div className="text-[14px] font-bold text-foreground mb-3">🏆 เมนูขายดีวันนี้</div>
                {topItems.length === 0 ? (
                  <div className="text-[12px] text-muted-foreground text-center py-8">ยังไม่มีข้อมูล</div>
                ) : (
                  <div className="space-y-1">
                    {topItems.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-muted/40 transition-colors">
                        <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0",
                          i < 3 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                        )}>{i + 1}</span>
                        <span className="flex-1 text-[12px] font-semibold text-foreground truncate">{item.name}</span>
                        <span className="text-[11px] font-mono tabular-nums text-muted-foreground">{item.qty} จาน</span>
                        <span className="text-[11px] font-mono font-bold tabular-nums text-primary w-20 text-right">฿{item.sales.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment pie */}
              <div className="w-[300px] shrink-0 bg-[hsl(var(--surface))] border border-border rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <div className="text-[14px] font-bold text-foreground mb-3">💳 แยกช่องทางชำระ</div>
                {paymentData.length === 0 ? (
                  <div className="text-[12px] text-muted-foreground text-center py-8">ยังไม่มีข้อมูล</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                        {paymentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Channel + Kitchen Performance */}
            <div className="flex gap-4 flex-wrap">
              {/* Channel */}
              <div className="flex-1 min-w-[300px] bg-[hsl(var(--surface))] border border-border rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <div className="text-[14px] font-bold text-foreground mb-3">📊 แยกตาม Channel</div>
                {channelData.length === 0 ? (
                  <div className="text-[12px] text-muted-foreground text-center py-8">ยังไม่มีข้อมูล</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={channelData} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `฿${(v/1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(value: number) => [`฿${value.toLocaleString()}`, 'ยอดขาย']}
                        contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="total" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Kitchen perf */}
              <div className="w-[300px] shrink-0 bg-[hsl(var(--surface))] border border-border rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <div className="text-[14px] font-bold text-foreground mb-3">⏱ Kitchen Performance</div>
                {!kitchenPerf ? (
                  <div className="text-[12px] text-muted-foreground text-center py-8">ยังไม่มีข้อมูลครัววันนี้</div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-[10px] text-muted-foreground mb-1">เวลาเฉลี่ย</div>
                      <div className="font-mono text-[32px] font-black tabular-nums text-primary">{kitchenPerf.avgMinutes}<span className="text-[14px] text-muted-foreground"> นาที</span></div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 bg-[hsl(var(--success)/0.05)] rounded-xl p-3 border border-[hsl(var(--success)/0.2)] text-center">
                        <div className="text-[9px] text-muted-foreground mb-0.5">🏃 เร็วสุด</div>
                        <div className="text-[11px] font-bold text-foreground truncate">{kitchenPerf.fastest?.name || '-'}</div>
                        <div className="text-[10px] font-mono text-[hsl(var(--success))]">{kitchenPerf.fastest ? `${(kitchenPerf.fastest.cooking_seconds / 60).toFixed(1)} นาที` : '-'}</div>
                      </div>
                      <div className="flex-1 bg-[hsl(var(--danger)/0.05)] rounded-xl p-3 border border-[hsl(var(--danger)/0.2)] text-center">
                        <div className="text-[9px] text-muted-foreground mb-0.5">🐢 ช้าสุด</div>
                        <div className="text-[11px] font-bold text-foreground truncate">{kitchenPerf.slowest?.name || '-'}</div>
                        <div className="text-[10px] font-mono text-[hsl(var(--danger))]">{kitchenPerf.slowest ? `${(kitchenPerf.slowest.cooking_seconds / 60).toFixed(1)} นาที` : '-'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent orders */}
            <div className="bg-[hsl(var(--surface))] border border-border rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="text-[14px] font-bold text-foreground flex items-center gap-2">
                  <Receipt size={15} className="text-primary" />
                  ออเดอร์ล่าสุด
                </div>
                <span className="text-[11px] text-muted-foreground">{recentOrders.length} รายการ</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-muted-foreground text-left border-b border-border/60">
                      <th className="px-5 py-2.5 font-semibold">หมายเลข</th>
                      <th className="px-3 py-2.5 font-semibold">โต๊ะ</th>
                      <th className="px-3 py-2.5 font-semibold">ยอด</th>
                      <th className="px-3 py-2.5 font-semibold">ชำระ</th>
                      <th className="px-3 py-2.5 font-semibold">ช่องทาง</th>
                      <th className="px-3 py-2.5 font-semibold">สถานะ</th>
                      <th className="px-5 py-2.5 font-semibold">เวลา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o, i) => (
                      <tr key={o.id} className="hover:bg-muted/40 transition-colors border-b border-border/30 last:border-b-0">
                        <td className="px-5 py-3 font-mono font-bold text-foreground">{o.order_number}</td>
                        <td className="px-3 py-3 font-semibold text-foreground">{o.tables?.label || '—'}</td>
                        <td className="px-3 py-3 font-mono font-bold tabular-nums text-primary">฿{Number(o.total || 0).toLocaleString()}</td>
                        <td className="px-3 py-3 text-muted-foreground">{PAYMENT_LABELS[o.payment_method] || o.payment_method || '—'}</td>
                        <td className="px-3 py-3 text-muted-foreground">{CHANNEL_LABELS[o.channel] || o.channel || '—'}</td>
                        <td className="px-3 py-3">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg border", statusStyle(o.status))}>
                            {statusLabel(o.status)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground font-mono tabular-nums text-[11px]">
                          {o.created_at ? new Date(o.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                    {recentOrders.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">ยังไม่มีออเดอร์วันนี้</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
