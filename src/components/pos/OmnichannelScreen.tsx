import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Plus, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ── Delivery chime (Web Audio API, no file needed) ────────
function playDeliveryChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [659.25, 783.99, 987.77, 1318.51];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  } catch { /* ignore */ }
}

const CHANNEL_COLORS: Record<string, string> = {
  line_man: "#06C755", grab: "#00B14F", robinhood: "#6B21A8",
  shopee: "#EE4D2D", walk_in: "#818CF8", kiosk: "#0891B2", qr_order: "#D946EF",
};
const CHANNEL_ICONS: Record<string, string> = {
  line_man: "💚", grab: "🟢", robinhood: "🟣", shopee: "🟠",
};
const DELIVERY_CHANNELS = ["line_man", "grab", "robinhood", "shopee"] as const;

type OmniTab = "orders" | "config" | "analytics";

interface DeliveryOrder {
  id: string; order_number: string; channel: string | null; status: string | null;
  total: number | null; created_at: string | null; customer_phone: string | null;
  driver_name: string | null; note: string | null;
  order_items: { id: string; name: string; qty: number; price: number; status: string | null }[];
}

interface Platform {
  id: string; name: string; icon: string | null; api_key: string | null;
  webhook_secret: string | null; commission_pct: number | null; config: any;
  is_active: boolean | null;
}

export function OmnichannelScreen() {
  const [tab, setTab] = useState<OmniTab>("orders");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [addingPlatform, setAddingPlatform] = useState(false);

  // Analytics date range
  const [analyticsOrders, setAnalyticsOrders] = useState<{ channel: string; total: number; paid_at: string }[]>([]);
  const [analyticsItems, setAnalyticsItems] = useState<{ name: string; qty: number }[]>([]);

  useEffect(() => {
    fetchData();
    // Realtime subscription for new delivery orders
    const channel = supabase.channel("omni-orders")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "orders",
      }, (payload) => {
        const newOrder = payload.new as any;
        if (DELIVERY_CHANNELS.includes(newOrder.channel)) {
          playDeliveryChime();
          toast.info(`🛵 ออเดอร์ใหม่จาก ${newOrder.channel} — ${newOrder.order_number}`);
          fetchOrders();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchOrders(), fetchPlatforms(), fetchAnalytics()]);
    setLoading(false);
  };

  const fetchOrders = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, channel, status, total, created_at, customer_phone, driver_name, note, order_items(id, name, qty, price, status)")
        .in("channel", DELIVERY_CHANNELS)
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders((data || []) as DeliveryOrder[]);
    } catch (err: any) {
      toast.error("โหลดออเดอร์ไม่สำเร็จ");
    }
  };

  const fetchPlatforms = async () => {
    try {
      const { data, error } = await supabase.from("delivery_platforms").select("*");
      if (error) throw error;
      setPlatforms(data || []);
    } catch { /* ignore */ }
  };

  const fetchAnalytics = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: ordData } = await supabase
        .from("orders")
        .select("channel, total, paid_at")
        .eq("status", "paid")
        .in("channel", DELIVERY_CHANNELS)
        .gte("paid_at", thirtyDaysAgo.toISOString());
      setAnalyticsOrders(ordData || []);

      // Top delivery items
      const orderIds = (ordData || []).map((o: any) => o.id).filter(Boolean);
      if (ordData && ordData.length > 0) {
        // Get order IDs first
        const { data: fullOrders } = await supabase
          .from("orders")
          .select("id")
          .eq("status", "paid")
          .in("channel", DELIVERY_CHANNELS)
          .gte("paid_at", thirtyDaysAgo.toISOString());

        if (fullOrders && fullOrders.length > 0) {
          const ids = fullOrders.map(o => o.id);
          let allItems: { name: string; qty: number }[] = [];
          for (let i = 0; i < ids.length; i += 200) {
            const chunk = ids.slice(i, i + 200);
            const { data: items } = await supabase
              .from("order_items")
              .select("name, qty")
              .in("order_id", chunk);
            allItems = allItems.concat(items || []);
          }
          setAnalyticsItems(allItems);
        }
      }
    } catch { /* ignore */ }
  };

  const updateOrderStatus = async (orderId: string, status: "open" | "cooking" | "ready" | "paid" | "cancelled" | "sent" | "served") => {
    try {
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
      if (error) throw error;
      toast.success("อัปเดตสถานะแล้ว");
      fetchOrders();
    } catch (err: any) {
      toast.error("อัปเดตไม่สำเร็จ");
    }
  };

  const updatePlatform = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase.from("delivery_platforms").update({ [field]: value }).eq("id", id);
      if (error) throw error;
      toast.success("✓ บันทึกแล้ว", { duration: 1500 });
      fetchPlatforms();
    } catch { toast.error("บันทึกไม่สำเร็จ"); }
  };

  // Analytics computed
  const revenueByPlatform = useMemo(() => {
    const map: Record<string, number> = {};
    analyticsOrders.forEach(o => {
      if (o.channel && o.total) map[o.channel] = (map[o.channel] || 0) + o.total;
    });
    return Object.entries(map).map(([channel, total]) => {
      const platform = platforms.find(p => p.name.toLowerCase().replace(/\s/g, "_") === channel);
      const commission = platform?.commission_pct || 0;
      return { channel, total: Math.round(total), commission, commissionAmt: Math.round(total * commission / 100), net: Math.round(total * (1 - commission / 100)) };
    });
  }, [analyticsOrders, platforms]);

  const topDeliveryItems = useMemo(() => {
    const map: Record<string, number> = {};
    analyticsItems.forEach(i => { map[i.name] = (map[i.name] || 0) + i.qty; });
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 10).map(([name, qty]) => ({ name, qty }));
  }, [analyticsItems]);

  const TABS: { key: OmniTab; label: string }[] = [
    { key: "orders", label: "📋 Live Orders" },
    { key: "config", label: "🔗 Platform Config" },
    { key: "analytics", label: "📊 Analytics" },
  ];

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide bg-background">
      <div className="max-w-[1100px] mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="text-[18px] font-bold text-foreground">🌐 Omnichannel</div>
          <button onClick={playDeliveryChime} className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-border text-muted-foreground hover:text-foreground transition-colors" title="ทดสอบเสียง">
            🔔 ทดสอบเสียง
          </button>
        </div>

        <div className="flex gap-1.5">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("px-4 py-2 rounded-xl text-[13px] font-bold border transition-all",
                tab === t.key ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ Tab 1: Live Orders ═══ */}
        {tab === "orders" && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              <StatBox icon="📦" label="ออเดอร์วันนี้" value={`${orders.length}`} />
              <StatBox icon="💰" label="รายได้ Delivery" value={`฿${orders.reduce((s, o) => s + (o.total || 0), 0).toLocaleString()}`} />
              <StatBox icon="📊" label="เฉลี่ย/ออเดอร์" value={orders.length > 0 ? `฿${Math.round(orders.reduce((s, o) => s + (o.total || 0), 0) / orders.length).toLocaleString()}` : "—"} />
              <StatBox icon="🛵" label="แพลตฟอร์ม" value={`${new Set(orders.map(o => o.channel)).size}`} />
            </div>

            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="text-[40px] mb-3">📭</div>
                <div className="text-[16px] font-bold text-foreground">ยังไม่มีออเดอร์จาก Delivery วันนี้</div>
                <div className="text-[12px] text-muted-foreground mt-1">ออเดอร์จะแสดงอัตโนมัติเมื่อมีเข้ามา (Realtime)</div>
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                {orders.map(order => {
                  const color = CHANNEL_COLORS[order.channel || ""] || "#888";
                  const icon = CHANNEL_ICONS[order.channel || ""] || "📦";
                  return (
                    <div key={order.id} className="bg-card border-2 rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: color + "40" }}>
                      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-[15px] text-foreground">{order.order_number}</span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold border" style={{ background: color + "15", color, borderColor: color + "40" }}>
                            {icon} {order.channel}
                          </span>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="px-4 py-3">
                        <div className="space-y-1 mb-3">
                          {order.order_items.map(item => (
                            <div key={item.id} className="flex justify-between text-[12px]">
                              <span className="text-foreground">{item.name} x{item.qty}</span>
                              <span className="font-mono text-muted-foreground">฿{item.price * item.qty}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center border-t border-border/40 pt-2">
                          <span className="font-mono text-[16px] font-extrabold text-accent">฿{(order.total || 0).toLocaleString()}</span>
                          <span className="text-[11px] text-muted-foreground">{order.created_at ? new Date(order.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                        </div>
                        {order.driver_name && (
                          <div className="text-[11px] text-muted-foreground mt-1">🚴 {order.driver_name}</div>
                        )}
                      </div>
                      <div className="px-4 py-2.5 border-t border-border/40 flex gap-2">
                        {order.status === "open" && (
                          <Button size="sm" className="flex-1" onClick={() => updateOrderStatus(order.id, "cooking")}>✅ Accept & Cook</Button>
                        )}
                        {order.status === "cooking" && (
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => updateOrderStatus(order.id, "ready")}>📦 Ready</Button>
                        )}
                        {order.status === "ready" && (
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => updateOrderStatus(order.id, "served")}>🍽 Picked Up</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ Tab 2: Platform Config ═══ */}
        {tab === "config" && (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-xl bg-muted/50 border border-border text-[12px] text-muted-foreground">
              💡 การเชื่อมต่อ API จริงต้องมี Merchant API key จากแต่ละแพลตฟอร์ม — ติดต่อ LINE MAN / Grab สำหรับ API key
            </div>

            {platforms.map(p => (
              <PlatformCard key={p.id} platform={p} onUpdate={updatePlatform} />
            ))}

            <Button variant="outline" onClick={() => setAddingPlatform(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> เพิ่ม Platform
            </Button>

            <AddPlatformDialog open={addingPlatform} onClose={() => setAddingPlatform(false)} onAdded={() => { setAddingPlatform(false); fetchPlatforms(); }} />
          </div>
        )}

        {/* ═══ Tab 3: Analytics ═══ */}
        {tab === "analytics" && (
          <div className="space-y-4">
            {revenueByPlatform.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-[32px] mb-2">📭</div>
                <div className="text-[14px] font-bold text-foreground">ยังไม่มีข้อมูล Delivery 30 วัน</div>
              </div>
            ) : (
              <>
                {/* Pie chart */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="text-[14px] font-bold text-foreground mb-3">📊 รายได้ตามแพลตฟอร์ม (30 วัน)</div>
                  <div className="flex gap-6 items-center">
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie data={revenueByPlatform} dataKey="total" nameKey="channel" cx="50%" cy="50%" outerRadius={80} label={({ channel }) => channel}>
                          {revenueByPlatform.map((entry, i) => (
                            <Cell key={i} fill={CHANNEL_COLORS[entry.channel] || "#888"} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `฿${v.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="text-muted-foreground"><th className="text-left py-1">Platform</th><th className="text-right py-1">Gross</th><th className="text-right py-1">Com%</th><th className="text-right py-1">Com฿</th><th className="text-right py-1">Net</th></tr>
                        </thead>
                        <tbody>
                          {revenueByPlatform.map(r => (
                            <tr key={r.channel} className="border-t border-border/30">
                              <td className="py-1.5 font-medium">{r.channel}</td>
                              <td className="py-1.5 text-right font-mono">฿{r.total.toLocaleString()}</td>
                              <td className="py-1.5 text-right">{r.commission}%</td>
                              <td className="py-1.5 text-right font-mono text-destructive">-฿{r.commissionAmt.toLocaleString()}</td>
                              <td className="py-1.5 text-right font-mono font-bold text-primary">฿{r.net.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Top items */}
                {topDeliveryItems.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                    <div className="text-[14px] font-bold text-foreground mb-3">🏆 เมนูยอดนิยม Delivery</div>
                    <div className="space-y-2">
                      {topDeliveryItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-6 text-[13px] font-bold text-muted-foreground text-right">#{i + 1}</span>
                          <span className="flex-1 text-[13px] font-medium text-foreground">{item.name}</span>
                          <span className="font-mono text-[13px] font-bold text-foreground">{item.qty} ชิ้น</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button variant="outline" onClick={() => {
                  const rows = ["Platform,Gross,Commission%,CommissionBaht,Net", ...revenueByPlatform.map(r => `${r.channel},${r.total},${r.commission},${r.commissionAmt},${r.net}`)];
                  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `delivery_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  toast.success("ดาวน์โหลด CSV แล้ว");
                }}>
                  📥 Export CSV
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="text-[20px] mb-1">{icon}</div>
      <div className="font-mono text-[20px] font-extrabold text-foreground">{value}</div>
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    open: { label: "🆕 ใหม่", cls: "bg-destructive/10 text-destructive border-destructive/30" },
    confirmed: { label: "✅ ยืนยัน", cls: "bg-primary/10 text-primary border-primary/30" },
    preparing: { label: "🔥 กำลังทำ", cls: "bg-warning/10 text-warning border-warning/30" },
    ready: { label: "📦 พร้อม", cls: "bg-primary/10 text-primary border-primary/30" },
    paid: { label: "💰 ชำระแล้ว", cls: "bg-primary/10 text-primary border-primary/30" },
  };
  const s = map[status || ""] || { label: status || "—", cls: "bg-muted text-muted-foreground border-border" };
  return <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border", s.cls)}>{s.label}</span>;
}

function PlatformCard({ platform: p, onUpdate }: { platform: Platform; onUpdate: (id: string, field: string, value: any) => void }) {
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [commPct, setCommPct] = useState(p.commission_pct ?? 0);

  const statusIcon = p.is_active ? (p.api_key ? "🟢" : "🟡") : "⚪";
  const statusText = p.is_active ? (p.api_key ? "เชื่อมต่อแล้ว" : "ยังไม่ได้เชื่อมต่อ") : "ปิดใช้งาน";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[24px]">{p.icon || "📦"}</span>
          <div>
            <div className="text-[14px] font-bold text-foreground">{p.name}</div>
            <div className="text-[11px] text-muted-foreground">{statusIcon} {statusText}</div>
          </div>
        </div>
        <Switch checked={p.is_active ?? false} onCheckedChange={v => onUpdate(p.id, "is_active", v)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Commission (%)</label>
          <Input type="number" value={commPct} onChange={e => setCommPct(parseFloat(e.target.value) || 0)} onBlur={() => onUpdate(p.id, "commission_pct", commPct)} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">API Key</label>
          <div className="flex gap-1">
            <Input type={showKey ? "text" : "password"} value={p.api_key || ""} onChange={e => onUpdate(p.id, "api_key", e.target.value)} />
            <Button size="icon" variant="ghost" onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddPlatformDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [commPct, setCommPct] = useState(0);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("กรุณากรอกชื่อ"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("delivery_platforms").insert({ name, icon, commission_pct: commPct });
      if (error) throw error;
      toast.success("เพิ่ม Platform แล้ว");
      onAdded();
    } catch (err: any) {
      toast.error("เพิ่มไม่สำเร็จ: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader><DialogTitle>เพิ่ม Delivery Platform</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">ชื่อ</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Icon (Emoji)</label>
            <Input value={icon} onChange={e => setIcon(e.target.value)} />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-muted-foreground mb-1 block">Commission (%)</label>
            <Input type="number" value={commPct} onChange={e => setCommPct(parseFloat(e.target.value) || 0)} />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} เพิ่ม
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
