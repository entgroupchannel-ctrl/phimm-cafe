import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// ── Channel definitions ───────────────────────────────────
const CHANNELS = {
  dinein:    { name:"หน้าร้าน",  icon:"🪑", color:"primary", hex:"#818CF8", short:"Dine-in"   },
  lineman:   { name:"LINE MAN",  icon:"💚", color:"success",  hex:"#06C755", short:"LINE MAN"  },
  grab:      { name:"Grab Food", icon:"🟢", color:"success",  hex:"#00B14F", short:"Grab"      },
  robinhood: { name:"Robinhood", icon:"🟣", color:"accent",   hex:"#6B21A8", short:"Robinhood" },
  shopee:    { name:"ShopeeFood",icon:"🟠", color:"danger",   hex:"#EE4D2D", short:"Shopee"    },
  kiosk:     { name:"Kiosk",     icon:"📱", color:"accent",   hex:"#0891B2", short:"Kiosk"     },
  qrorder:   { name:"QR Order",  icon:"📲", color:"primary",  hex:"#D946EF", short:"QR"        },
  phone:     { name:"โทรสั่ง",   icon:"📞", color:"warning",  hex:"#F59E0B", short:"Phone"     },
} as const;
type ChannelKey = keyof typeof CHANNELS;

type OrderStatus = "new" | "cooking" | "ready" | "served";

interface LiveOrder {
  id: string; channel: ChannelKey; table: string;
  items: string[]; total: number; time: number;
  status: OrderStatus; driver?: string; eta?: string; note?: string;
}

const INITIAL_ORDERS: LiveOrder[] = [
  { id:"#0258", channel:"lineman",   table:"D5", items:["ผัดไทย x2","ชาเย็น x2"],             total:248, time:0,   status:"new",     driver:"สมชาย", eta:"12 นาที"    },
  { id:"#0257", channel:"dinein",    table:"T3", items:["ต้มยำกุ้ง x1","ข้าวสวย x1"],          total:174, time:45,  status:"cooking"                                    },
  { id:"#0256", channel:"grab",      table:"D4", items:["ข้าวผัดกุ้ง x3","น้ำมะนาว x3"],       total:372, time:120, status:"cooking", driver:"วิชัย",  eta:"8 นาที"     },
  { id:"#0255", channel:"kiosk",     table:"K2", items:["ข้าวมันไก่ x1","กาแฟเย็น x1"],        total:120, time:180, status:"ready"                                      },
  { id:"#0254", channel:"shopee",    table:"D3", items:["แกงเขียวหวาน x2","ข้าว x2"],          total:218, time:240, status:"cooking", driver:"—",      eta:"รอไรเดอร์"  },
  { id:"#0253", channel:"qrorder",   table:"T7", items:["ปีกไก่ทอด x1","เฟรนช์ฟรายส์ x1"],    total:138, time:60,  status:"new"                                        },
  { id:"#0252", channel:"robinhood", table:"D2", items:["ข้าวเหนียวมะม่วง x2"],               total:178, time:300, status:"ready",   driver:"นภา",    eta:"3 นาที"     },
  { id:"#0251", channel:"dinein",    table:"T1", items:["ส้มตำ x1","ผัดไทย x1","ชาเย็น x1"],   total:193, time:420, status:"served"                                     },
  { id:"#0250", channel:"phone",     table:"P1", items:["ข้าวผัดกุ้ง x2","ต้มยำกุ้ง x1"],     total:337, time:30,  status:"new",     note:"มารับเอง 13:00"              },
];

const CHANNEL_DATA = [
  { key:"dinein"    as ChannelKey, revenue:485200, orders:1247, avg:389, peak:"12:00-13:00", topMenu:"ผัดไทย",          retention:72, commission:0,  connected:true  },
  { key:"lineman"   as ChannelKey, revenue:312800, orders:834,  avg:375, peak:"18:00-19:00", topMenu:"ข้าวผัดกุ้ง",    retention:45, commission:30, connected:true  },
  { key:"grab"      as ChannelKey, revenue:198400, orders:521,  avg:381, peak:"12:00-13:00", topMenu:"ต้มยำกุ้ง",      retention:38, commission:30, connected:true  },
  { key:"kiosk"     as ChannelKey, revenue:118400, orders:312,  avg:380, peak:"12:00-14:00", topMenu:"ข้าวมันไก่",     retention:65, commission:0,  connected:true  },
  { key:"qrorder"   as ChannelKey, revenue:168200, orders:456,  avg:369, peak:"11:00-13:00", topMenu:"ส้มตำ",           retention:58, commission:0,  connected:true  },
  { key:"robinhood" as ChannelKey, revenue:72800,  orders:189,  avg:385, peak:"19:00-20:00", topMenu:"แกงเขียวหวาน",   retention:42, commission:15, connected:true  },
  { key:"phone"     as ChannelKey, revenue:38200,  orders:98,   avg:390, peak:"11:00-12:00", topMenu:"ข้าวผัดกุ้ง",   retention:80, commission:0,  connected:true  },
  { key:"shopee"    as ChannelKey, revenue:0,       orders:0,    avg:0,   peak:"—",           topMenu:"—",               retention:0,  commission:25, connected:false, potential:120000 },
];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return m < 1 ? "< 1 นาที" : `${m} นาที`;
}

// ── Tab 1: Unified Order Hub ──────────────────────────────
function OrderHubTab() {
  const [filter, setFilter] = useState("all");
  const [orders, setOrders] = useState<LiveOrder[]>(INITIAL_ORDERS);

  useEffect(() => {
    const iv = setInterval(() => {
      setOrders(prev => prev.map(o =>
        o.status !== "served" ? { ...o, time: o.time + 1 } : o
      ));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const active = orders.filter(o => o.status !== "served");
  const delivery = (k: ChannelKey) => !["dinein","kiosk","qrorder"].includes(k);

  const filtered = filter === "all" ? orders
    : filter === "delivery" ? orders.filter(o => delivery(o.channel))
    : orders.filter(o => o.channel === filter);

  const channelCounts: Record<string, number> = {};
  active.forEach(o => { channelCounts[o.channel] = (channelCounts[o.channel] || 0) + 1; });

  const updateStatus = (id: string, status: OrderStatus) =>
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));

  const statusBorder: Record<OrderStatus, string> = {
    new:    "border-danger/60 shadow-[0_0_16px_hsl(var(--danger)/0.12)]",
    cooking:"border-warning/50",
    ready:  "border-success/50",
    served: "border-border opacity-50",
  };
  const statusLabel: Record<OrderStatus, string> = {
    new:    "🆕 ใหม่", cooking:"🔥 กำลังทำ", ready:"✅ พร้อม", served:"🍽 เสิร์ฟแล้ว",
  };
  const statusTextColor: Record<OrderStatus, string> = {
    new:"text-danger", cooking:"text-warning", ready:"text-success", served:"text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      {/* Channel filter bar */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        <button onClick={() => setFilter("all")}
          className={cn("flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold border-2 whitespace-nowrap transition-all",
            filter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-border-light")}>
          📋 ทั้งหมด
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">{active.length}</span>
        </button>
        <button onClick={() => setFilter("delivery")}
          className={cn("px-3.5 py-2 rounded-xl text-[12px] font-bold border-2 whitespace-nowrap transition-all",
            filter === "delivery" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-border-light")}>
          🛵 Delivery ทั้งหมด
        </button>
        {(Object.entries(CHANNELS) as [ChannelKey, typeof CHANNELS[ChannelKey]][]).map(([key, ch]) => {
          const count = channelCounts[key] || 0;
          if (count === 0 && !["dinein","lineman","grab"].includes(key)) return null;
          return (
            <button key={key} onClick={() => setFilter(key)}
              className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold border-2 whitespace-nowrap transition-all",
                filter === key ? "bg-primary/10 text-primary border-primary/50" : "border-border text-muted-foreground hover:border-border-light")}
              style={filter === key ? { borderColor: ch.hex + "80", color: ch.hex, backgroundColor: ch.hex + "18" } : {}}>
              {ch.icon} {ch.short}
              {count > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full font-extrabold"
                  style={{ background: ch.hex + "22", color: ch.hex }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Order grid */}
      {filtered.filter(o => o.status !== "served").length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="text-[40px] mb-3">🎉</div>
          <div className="text-[16px] font-bold text-foreground">ไม่มีออเดอร์ค้างในช่องทางนี้</div>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))" }}>
          {filtered
            .filter(o => o.status !== "served")
            .sort((a, b) => { const p = {new:0,cooking:1,ready:2,served:3}; return p[a.status] - p[b.status]; })
            .map(order => {
              const ch = CHANNELS[order.channel];
              const isDelivery = delivery(order.channel);
              const isLate = order.time > 600 && order.status !== "ready";
              return (
                <div key={order.id} className={cn(
                  "bg-card border-2 rounded-2xl overflow-hidden transition-all",
                  isLate ? "border-danger/60" : statusBorder[order.status]
                )}>
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-mono font-extrabold text-[16px]", statusTextColor[order.status])}>{order.id}</span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold border"
                        style={{ background: ch.hex + "15", color: ch.hex, borderColor: ch.hex + "40" }}>
                        {ch.icon} {ch.short}
                      </span>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border",
                      order.status === "new" ? "bg-danger/10 text-danger border-danger/30" :
                      order.status === "ready" ? "bg-success/10 text-success border-success/30" :
                      "bg-warning/10 text-warning border-warning/30")}>
                      {statusLabel[order.status]}
                    </span>
                  </div>

                  {/* Table + Timer */}
                  <div className="px-4 py-2 flex items-center justify-between border-b border-border">
                    <span className="text-[13px] font-bold text-foreground">
                      {isDelivery ? "🛵" : order.channel === "kiosk" ? "📱" : order.channel === "qrorder" ? "📲" : "🪑"} {order.table}
                    </span>
                    <span className={cn("font-mono text-[14px] font-extrabold tabular-nums",
                      isLate ? "text-danger" : order.time > 300 ? "text-warning" : "text-foreground")}>
                      ⏱ {formatTime(order.time)}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-3 border-b border-border space-y-0.5">
                    {order.items.map((item, i) => (
                      <div key={i} className="text-[13px] font-semibold text-foreground">{item}</div>
                    ))}
                    {order.note && <div className="text-[12px] text-warning font-semibold mt-1">📝 {order.note}</div>}
                  </div>

                  {/* Delivery info */}
                  {isDelivery && (
                    <div className="px-4 py-2 flex justify-between border-b border-border text-[12px]"
                      style={{ background: ch.hex + "08" }}>
                      <span className="text-muted-foreground">🚴 ไรเดอร์: <strong className="text-foreground">{order.driver || "—"}</strong></span>
                      <span className="text-muted-foreground">⏰ ETA: <strong className="text-accent">{order.eta || "—"}</strong></span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="font-mono text-[18px] font-extrabold text-accent tabular-nums">฿{order.total}</span>
                    <div className="flex gap-1.5">
                      {order.status === "new" && (
                        <button onClick={() => updateStatus(order.id, "cooking")}
                          className="px-3.5 py-2 rounded-xl text-[12px] font-bold text-white bg-warning hover:opacity-90 transition-opacity">
                          🔥 รับออเดอร์
                        </button>
                      )}
                      {order.status === "cooking" && (
                        <button onClick={() => updateStatus(order.id, "ready")}
                          className="px-3.5 py-2 rounded-xl text-[12px] font-bold text-white bg-success hover:opacity-90 transition-opacity">
                          ✅ เสร็จแล้ว
                        </button>
                      )}
                      {order.status === "ready" && (
                        <button onClick={() => updateStatus(order.id, "served")}
                          className="px-3.5 py-2 rounded-xl text-[12px] font-bold text-white gradient-primary shadow-primary hover:opacity-90 transition-opacity">
                          {isDelivery ? "📦 ส่งแล้ว" : "🍽 เสิร์ฟ"}
                        </button>
                      )}
                      <button className="px-2.5 py-2 rounded-xl text-[12px] border border-border text-muted-foreground hover:border-border-light transition-colors">🖨</button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ── ShopeeFood Connect Modal ──────────────────────────────
const WEBHOOK_URL = "https://api.yourrestaurant.com/webhooks/shopeefood";

type ModalStep = "intro" | "apikey" | "webhook" | "test" | "done";

function ShopeeFoodModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<ModalStep>("intro");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [shopId, setShopId] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const copy = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runTest = () => {
    setTesting(true);
    setTimeout(() => { setTesting(false); setTestOk(true); }, 1800);
  };

  const STEPS: { id: ModalStep; label: string }[] = [
    { id: "intro",   label: "เริ่มต้น" },
    { id: "apikey",  label: "API Keys" },
    { id: "webhook", label: "Webhook" },
    { id: "test",    label: "ทดสอบ" },
    { id: "done",    label: "เสร็จสิ้น" },
  ];
  const stepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-[480px] shadow-[0_20px_60px_hsl(var(--primary)/0.15)] overflow-hidden">

        {/* Modal header */}
        <div className="px-6 pt-5 pb-4 border-b border-border flex items-center justify-between"
          style={{ background: "#EE4D2D10" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[22px] border"
              style={{ background: "#EE4D2D18", borderColor: "#EE4D2D40" }}>🟠</div>
            <div>
              <div className="text-[15px] font-extrabold text-foreground">เชื่อมต่อ ShopeeFood</div>
              <div className="text-[11px] text-muted-foreground">Commission 25% · ตั้งค่าครั้งเดียว</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-border transition-colors text-[18px]">✕</button>
        </div>

        {/* Step progress */}
        <div className="px-6 py-3 border-b border-border flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1.5 flex-1 last:flex-none">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all",
                i < stepIdx ? "bg-success text-white" :
                i === stepIdx ? "text-white shadow-[0_0_10px_hsl(var(--primary)/0.4)]" : "bg-border text-muted-foreground"
              )} style={i === stepIdx ? { background: "#EE4D2D" } : {}}>
                {i < stepIdx ? "✓" : i + 1}
              </div>
              <span className={cn("text-[10px] font-semibold hidden sm:block",
                i === stepIdx ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
              {i < STEPS.length - 1 && <div className={cn("flex-1 h-[1.5px] rounded-full", i < stepIdx ? "bg-success" : "bg-border")} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-5">

          {/* Step 0: Intro */}
          {step === "intro" && (
            <div className="space-y-4">
              <div className="bg-background border border-border rounded-xl p-4 space-y-2.5">
                <div className="text-[13px] font-bold text-foreground">📋 สิ่งที่ต้องเตรียม</div>
                {[
                  { icon:"🔑", text:"ShopeeFood Partner API Key & Secret" },
                  { icon:"🏪", text:"Shop ID จาก ShopeeFood Partner Portal" },
                  { icon:"🌐", text:"Webhook URL (เราจะให้ในขั้นตอนถัดไป)" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[12px] text-muted-foreground">
                    <span>{item.icon}</span><span>{item.text}</span>
                  </div>
                ))}
              </div>
              <div className="bg-warning/8 border border-warning/25 rounded-xl p-3 flex gap-2.5">
                <span className="text-[16px] shrink-0">💡</span>
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  ขอ API Key ได้ที่ <span className="text-warning font-bold">ShopeeFood Partner Portal → Settings → API Integration</span> ใช้เวลาอนุมัติ 1-3 วันทำการ
                </div>
              </div>
              <button onClick={() => setStep("apikey")}
                className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: "#EE4D2D", boxShadow: "0 4px 16px #EE4D2D40" }}>
                เริ่มต้นเชื่อมต่อ →
              </button>
            </div>
          )}

          {/* Step 1: API Key */}
          {step === "apikey" && (
            <div className="space-y-3.5">
              <div className="text-[13px] font-bold text-foreground mb-1">🔑 กรอก API Credentials</div>
              {[
                { label:"Partner API Key", value:apiKey, set:setApiKey, placeholder:"sp_live_xxxxxxxxxxxxxxxx", icon:"🔑" },
                { label:"Shop ID", value:shopId, set:setShopId, placeholder:"1234567", icon:"🏪" },
              ].map((f, i) => (
                <div key={i}>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">{f.icon} {f.label}</label>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-[12px] font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors" />
                </div>
              ))}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">🔒 Secret Key</label>
                <div className="relative">
                  <input value={secretKey} onChange={e => setSecretKey(e.target.value)}
                    type={showSecret ? "text" : "password"} placeholder="••••••••••••••••••••••"
                    className="w-full h-9 px-3 pr-10 rounded-xl border border-border bg-background text-[12px] font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors" />
                  <button onClick={() => setShowSecret(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[14px]">
                    {showSecret ? "🙈" : "👁"}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep("intro")} className="flex-1 py-2 rounded-xl text-[12px] font-bold border border-border text-muted-foreground hover:bg-border/50 transition-colors">← ย้อนกลับ</button>
                <button onClick={() => setStep("webhook")}
                  disabled={!apiKey || !secretKey || !shopId}
                  className="flex-1 py-2 rounded-xl text-[12px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "#EE4D2D" }}>
                  ถัดไป →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Webhook */}
          {step === "webhook" && (
            <div className="space-y-4">
              <div className="text-[13px] font-bold text-foreground">🌐 ตั้งค่า Webhook URL</div>
              <div className="bg-background border border-border rounded-xl p-3">
                <div className="text-[10px] font-semibold text-muted-foreground mb-1.5">📎 Webhook Endpoint ของคุณ</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[11px] font-mono text-primary bg-primary/8 px-2.5 py-1.5 rounded-lg overflow-hidden text-ellipsis whitespace-nowrap">
                    {WEBHOOK_URL}
                  </code>
                  <button onClick={copy}
                    className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all whitespace-nowrap",
                      copied ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground hover:border-border-light")}>
                    {copied ? "✓ Copied!" : "📋 Copy"}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[12px] font-bold text-foreground">วิธีตั้งค่าใน ShopeeFood Partner Portal</div>
                {[
                  { step:"1", text:'เข้า Partner Portal → Settings → Webhooks', tag:null },
                  { step:"2", text:'คลิก "Add Webhook Endpoint"', tag:null },
                  { step:"3", text:'วาง URL ด้านบนในช่อง Endpoint URL', tag:"URL" },
                  { step:"4", text:'เลือก Events: order.created, order.status_changed, order.cancelled', tag:"Events" },
                  { step:"5", text:'คลิก Save และกด "Send Test Event"', tag:null },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5 text-white"
                      style={{ background: "#EE4D2D" }}>{item.step}</div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed flex-1">
                      {item.text}
                      {item.tag && <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-border text-foreground">{item.tag}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep("apikey")} className="flex-1 py-2 rounded-xl text-[12px] font-bold border border-border text-muted-foreground hover:bg-border/50 transition-colors">← ย้อนกลับ</button>
                <button onClick={() => setStep("test")}
                  className="flex-1 py-2 rounded-xl text-[12px] font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#EE4D2D" }}>
                  ทดสอบการเชื่อมต่อ →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Test */}
          {step === "test" && (
            <div className="space-y-4">
              <div className="text-[13px] font-bold text-foreground">🧪 ทดสอบการเชื่อมต่อ</div>
              <div className="bg-background border border-border rounded-xl p-4 space-y-3">
                {[
                  { label:"Partner API Key", value: apiKey.slice(0,8) + "••••••••", ok:true },
                  { label:"Shop ID",          value: shopId, ok:true },
                  { label:"Secret Key",       value: "••••••••••••••••", ok:true },
                  { label:"Webhook URL",      value: "ตั้งค่าแล้ว", ok:true },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">{row.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-foreground">{row.value}</span>
                      <span className="text-success text-[14px]">✓</span>
                    </div>
                  </div>
                ))}
              </div>
              {!testOk ? (
                <button onClick={runTest} disabled={testing}
                  className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white transition-all"
                  style={{ background: testing ? "#EE4D2D80" : "#EE4D2D" }}>
                  {testing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      กำลังทดสอบ...
                    </span>
                  ) : "🔗 ทดสอบการเชื่อมต่อ"}
                </button>
              ) : (
                <div className="bg-success/10 border border-success/30 rounded-xl p-3 flex items-center gap-2.5">
                  <span className="text-[20px]">🎉</span>
                  <div>
                    <div className="text-[12px] font-bold text-success">การเชื่อมต่อสำเร็จ!</div>
                    <div className="text-[10px] text-muted-foreground">ShopeeFood ตอบกลับ HTTP 200 OK · Webhook รับ Test Event แล้ว</div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setStep("webhook")} className="flex-1 py-2 rounded-xl text-[12px] font-bold border border-border text-muted-foreground hover:bg-border/50 transition-colors">← ย้อนกลับ</button>
                <button onClick={() => setStep("done")} disabled={!testOk}
                  className="flex-1 py-2 rounded-xl text-[12px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "#EE4D2D" }}>
                  เปิดใช้งาน →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === "done" && (
            <div className="space-y-4 text-center">
              <div className="text-[48px] mt-2">🎊</div>
              <div>
                <div className="text-[16px] font-extrabold text-foreground mb-1">เชื่อมต่อ ShopeeFood สำเร็จ!</div>
                <div className="text-[12px] text-muted-foreground">ออเดอร์จาก ShopeeFood จะเข้ามาใน Unified Order Hub โดยอัตโนมัติ</div>
              </div>
              <div className="bg-background border border-border rounded-xl p-4 text-left space-y-2">
                {[
                  "✅ ออเดอร์ใหม่ปรากฏใน Unified Order Hub",
                  "✅ แจ้งเตือนเสียงเมื่อมีออเดอร์ใหม่",
                  "✅ สถานะ real-time: รับออเดอร์ → ทำ → เสร็จ → ส่ง",
                  "✅ คิด Commission 25% ใน Analytics อัตโนมัติ",
                ].map((text, i) => (
                  <div key={i} className="text-[12px] text-muted-foreground">{text}</div>
                ))}
              </div>
              <button onClick={onSuccess}
                className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: "#EE4D2D", boxShadow: "0 4px 16px #EE4D2D40" }}>
                เริ่มรับออเดอร์จาก ShopeeFood 🚀
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Channel Management ─────────────────────────────
function ChannelMgmtTab() {
  const [channels, setChannels] = useState(CHANNEL_DATA);
  const [showShopeeModal, setShowShopeeModal] = useState(false);

  const connected = channels.filter(c => c.connected);
  const totalRevenue = connected.reduce((s, c) => s + c.revenue, 0);
  const totalOrders = connected.reduce((s, c) => s + c.orders, 0);

  const toggle = (key: ChannelKey) =>
    setChannels(prev => prev.map(c => c.key === key ? { ...c, connected: !c.connected } : c));

  const connectShopee = () =>
    setChannels(prev => prev.map(c => c.key === "shopee" ? { ...c, connected: true } : c));

  return (
    <div className="space-y-4">
      {showShopeeModal && (
        <ShopeeFoodModal
          onClose={() => setShowShopeeModal(false)}
          onSuccess={() => { connectShopee(); setShowShopeeModal(false); }}
        />
      )}

      {/* Summary stats */}
      <div className="flex gap-3 flex-wrap">
        {[
          { icon:"📊", label:"ช่องทางที่เชื่อมต่อ", value:`${connected.length}/${channels.length}`, cls:"text-primary" },
          { icon:"🧾", label:"ออเดอร์รวม/เดือน",    value:totalOrders.toLocaleString(),           cls:"text-accent"  },
          { icon:"💰", label:"รายได้รวม/เดือน",      value:`฿${(totalRevenue/1000).toFixed(0)}K`, cls:"text-success" },
          { icon:"📈", label:"ช่องทางโตเร็วสุด",     value:"Kiosk +45%",                          cls:"text-warning" },
        ].map((s, i) => (
          <div key={i} className="flex-1 min-w-[130px] bg-card border border-border rounded-2xl p-4 shadow-card">
            <div className="text-[11px] text-muted-foreground mb-1">{s.icon} {s.label}</div>
            <div className={cn("font-mono text-[20px] font-black tabular-nums", s.cls)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Channel cards */}
      <div className="grid gap-3" style={{ gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))" }}>
        {channels.map(ch => {
          const info = CHANNELS[ch.key];
          const revPct = totalRevenue > 0 ? Math.round(ch.revenue / totalRevenue * 100) : 0;
          return (
            <div key={ch.key} className={cn(
              "bg-card rounded-2xl p-4 border transition-all shadow-card",
              ch.connected ? "" : "opacity-70"
            )}
              style={{ borderColor: ch.connected ? info.hex + "55" : undefined }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[22px] border"
                    style={{ background: info.hex + "15", borderColor: info.hex + "30" }}>
                    {info.icon}
                  </div>
                  <div>
                    <div className="text-[15px] font-extrabold text-foreground">{info.name}</div>
                    {ch.commission > 0 && (
                      <div className="text-[10px] text-muted-foreground">Commission {ch.commission}%</div>
                    )}
                  </div>
                </div>
                {/* Toggle */}
                <div onClick={() => toggle(ch.key)}
                  className={cn("w-12 h-6 rounded-full cursor-pointer relative transition-all",
                    ch.connected ? "bg-success/30" : "bg-border")}>
                  <div className={cn(
                    "w-4.5 h-4.5 rounded-full absolute top-[3px] transition-all w-[18px] h-[18px]",
                    ch.connected ? "right-[3px] bg-success shadow-[0_0_6px_hsl(var(--success)/0.5)]" : "left-[3px] bg-muted-foreground"
                  )} />
                </div>
              </div>

              {ch.connected ? (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { l:"ออเดอร์",    v:ch.orders.toLocaleString() },
                      { l:"รายได้",     v:`฿${(ch.revenue/1000).toFixed(0)}K` },
                      { l:"เฉลี่ย/บิล", v:`฿${ch.avg}` },
                    ].map((s, i) => (
                      <div key={i} className="bg-background rounded-xl p-2 text-center">
                        <div className="text-[9px] text-muted-foreground">{s.l}</div>
                        <div className="text-[13px] font-extrabold font-mono text-foreground">{s.v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Revenue bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-muted-foreground">สัดส่วนรายได้</span>
                      <span className="font-mono font-bold" style={{ color: info.hex }}>{revPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width:`${revPct}%`, background: info.hex }} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    {ch.commission === 0 && (
                      <span className="text-[10px] font-bold bg-success/10 text-success border border-success/30 px-2 py-0.5 rounded-md">GP = 0%</span>
                    )}
                    <span className={cn(
                      "ml-auto text-[11px] font-bold px-2 py-0.5 rounded-md border",
                      (ch as any).growth > 0 ? "bg-success/10 text-success border-success/30" : "bg-danger/10 text-danger border-danger/30"
                    )}>
                      {(ch as any).growth > 0 ? "▲" : "▼"} {Math.abs((ch as any).growth)}%
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-3">
                  <div className="text-[13px] text-muted-foreground mb-2">ยังไม่ได้เชื่อมต่อ</div>
                  {(ch as any).potential && (
                    <div className="text-[12px] text-success mb-3">
                      💡 คาดว่าจะเพิ่มรายได้ ~฿{((ch as any).potential / 1000).toFixed(0)}K/เดือน
                    </div>
                  )}
                  <button
                    onClick={() => ch.key === "shopee" ? setShowShopeeModal(true) : undefined}
                    className="px-5 py-2 rounded-xl text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                    style={{ background: info.hex, boxShadow: `0 4px 16px ${info.hex}40` }}>
                    🔗 เชื่อมต่อ {info.name}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab 3: Analytics ──────────────────────────────────────
function AnalyticsTab() {
  const connected = CHANNEL_DATA.filter(c => c.connected);
  const netData = connected.map(c => ({
    ...c,
    netRevenue: Math.round(c.revenue * (1 - c.commission / 100)),
    commissionAmt: Math.round(c.revenue * c.commission / 100),
  }));

  const totalRev = netData.reduce((s, c) => s + c.revenue, 0);
  const totalCommission = netData.reduce((s, c) => s + c.commissionAmt, 0);
  const maxRev = Math.max(...netData.map(c => c.revenue));

  const sorted = [...netData].sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        {[
          { icon:"💰", label:"รายได้รวม",       value:`฿${(totalRev/1000).toFixed(0)}K`,                  cls:"text-success" },
          { icon:"💸", label:"ค่า Commission",   value:`฿${(totalCommission/1000).toFixed(0)}K`,           cls:"text-danger"  },
          { icon:"💵", label:"รายได้สุทธิ",      value:`฿${((totalRev-totalCommission)/1000).toFixed(0)}K`, cls:"text-accent"  },
          { icon:"📊", label:"ช่องทาง GP = 0%", value:`${connected.filter(c=>c.commission===0).length} ช่องทาง`, cls:"text-primary" },
        ].map((s, i) => (
          <div key={i} className="flex-1 min-w-[130px] bg-card border border-border rounded-2xl p-4 shadow-card">
            <div className="text-[11px] text-muted-foreground mb-1">{s.icon} {s.label}</div>
            <div className={cn("font-mono text-[20px] font-black tabular-nums", s.cls)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue bar chart */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="text-[14px] font-bold text-foreground mb-4">📊 เปรียบเทียบรายได้ตามช่องทาง (รายเดือน)</div>
        <div className="space-y-3">
          {sorted.map(ch => {
            const info = CHANNELS[ch.key];
            const pct = Math.round(ch.revenue / totalRev * 100);
            return (
              <div key={ch.key} className="flex items-center gap-3">
                <div className="w-24 flex items-center gap-1.5 text-[12px] font-semibold text-foreground shrink-0">
                  {info.icon} {info.short}
                </div>
                <div className="flex-1 relative h-6 rounded-lg bg-border overflow-hidden">
                  {/* Commission overlay (lighter) */}
                  <div className="absolute inset-0 rounded-lg transition-all duration-500"
                    style={{ width:`${(ch.revenue/maxRev)*100}%`, background: info.hex + "40" }} />
                  {/* Net revenue (solid) */}
                  <div className="absolute inset-0 rounded-lg transition-all duration-500"
                    style={{ width:`${(ch.netRevenue/maxRev)*100}%`, background: info.hex }} />
                  {ch.commission > 0 && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-danger font-bold">
                      -{ch.commission}% GP
                    </div>
                  )}
                </div>
                <div className="w-16 text-right shrink-0">
                  <div className="font-mono text-[13px] font-extrabold tabular-nums" style={{ color: info.hex }}>
                    ฿{(ch.revenue/1000).toFixed(0)}K
                  </div>
                  <div className="text-[10px] text-muted-foreground">{pct}%</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 justify-center mt-3 text-[10px] text-muted-foreground">
          <span>■ สีเข้ม = รายได้สุทธิ</span>
          <span>■ สีจาง = ค่า Commission</span>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card overflow-x-auto">
        <div className="text-[14px] font-bold text-foreground mb-4">📋 เปรียบเทียบทุกช่องทาง</div>
        <div className="min-w-[680px]">
          {/* Header */}
          <div className="grid gap-2 pb-2 border-b border-border text-[11px] font-bold text-muted-foreground"
            style={{ gridTemplateColumns:"110px repeat(6,1fr)" }}>
            {["ช่องทาง","ออเดอร์","รายได้","เฉลี่ย/บิล","ช่วง Peak","เมนูขายดี","Retention"].map(h => (
              <div key={h}>{h}</div>
            ))}
          </div>
          {sorted.map(ch => {
            const info = CHANNELS[ch.key];
            return (
              <div key={ch.key} className="grid gap-2 py-2.5 border-b border-border/40 text-[12px]"
                style={{ gridTemplateColumns:"110px repeat(6,1fr)" }}>
                <div className="flex items-center gap-1.5 font-bold text-foreground">{info.icon} {info.short}</div>
                <div className="font-mono font-bold text-foreground tabular-nums">{ch.orders.toLocaleString()}</div>
                <div className="font-mono font-bold text-accent tabular-nums">฿{(ch.revenue/1000).toFixed(0)}K</div>
                <div className="font-mono text-foreground tabular-nums">฿{ch.avg}</div>
                <div className="text-muted-foreground">{ch.peak}</div>
                <div className="text-foreground">{ch.topMenu}</div>
                <div>
                  <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border",
                    ch.retention > 60 ? "bg-success/10 text-success border-success/30" :
                    ch.retention > 40 ? "bg-warning/10 text-warning border-warning/30" :
                    "bg-danger/10 text-danger border-danger/30")}>
                    {ch.retention}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI insight */}
      <div className="bg-card border border-primary/25 rounded-2xl p-5 shadow-card flex items-start gap-4">
        <div className="text-[32px] shrink-0 mt-0.5">🤖</div>
        <div>
          <div className="text-[13px] font-bold text-gradient-primary mb-2">AI แนะนำ Omnichannel</div>
          <div className="space-y-1.5">
            {[
              "📈 Kiosk + QR Order โตเร็วสุด (+45%, +38%) และ GP = 0% — ควรโปรโมทให้ลูกค้าหน้าร้านใช้มากขึ้น",
              `💸 ค่า Commission Delivery รวม ฿${(totalCommission/1000).toFixed(0)}K/เดือน — พิจารณาโปรโมทช่องทาง GP ต่ำ (Robinhood 15%) หรือ Direct order`,
              "🔄 Retention หน้าร้าน (72%) สูงกว่า Delivery (38-45%) — สร้าง Loyalty program ดึงลูกค้า Delivery มาเป็นลูกค้าตรง",
            ].map((tip, i) => (
              <div key={i} className="text-[12px] text-muted-foreground leading-relaxed">{tip}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────
const TABS = [
  { label:"📋 Unified Order Hub"     },
  { label:"🔗 จัดการช่องทาง"          },
  { label:"📊 Omnichannel Analytics" },
];

export function OmnichannelScreen() {
  const [tab, setTab] = useState(0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-5 py-3 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white font-extrabold text-[16px] shadow-primary">O</div>
          <div>
            <div className="text-[15px] font-extrabold text-gradient-primary leading-tight">Omnichannel & Multi-Platform</div>
            <div className="text-[10px] text-muted-foreground">หน้าร้าน · LINE MAN · Grab · Robinhood · ShopeeFood · Kiosk · QR Order · โทรสั่ง — ทุกช่องทางในจอเดียว</div>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-1.5">
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={cn(
                "px-4 py-2 rounded-xl text-[12px] font-bold border-2 transition-all whitespace-nowrap",
                tab === i
                  ? "gradient-primary text-white border-transparent shadow-primary"
                  : "border-border text-muted-foreground hover:border-border-light bg-background"
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {tab === 0 && <OrderHubTab />}
        {tab === 1 && <ChannelMgmtTab />}
        {tab === 2 && <AnalyticsTab />}
      </div>
    </div>
  );
}
