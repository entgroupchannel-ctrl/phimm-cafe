import { useState, useEffect } from "react";
import { CartItem } from "./OrderScreen";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface PaymentScreenProps {
  cart: CartItem[];
  orderId?: string | null;
  tableId?: string | null;
  onSuccess?: () => void;
}

const METHODS = [
  { key: "promptpay", label: "PromptPay", sublabel: "QR Code",  icon: "📲" },
  { key: "cash",      label: "เงินสด",   sublabel: "Cash",      icon: "💵" },
  { key: "card",      label: "บัตร",     sublabel: "EDC",       icon: "💳" },
];

export function PaymentScreen({ cart, orderId, tableId, onSuccess }: PaymentScreenProps) {
  const [method, setMethod] = useState("promptpay");
  const [paid,   setPaid]   = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  async function fetchOrder() {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(id, name, price, qty, status, menu_items(emoji))')
      .eq('id', orderId!)
      .single();
    if (data) setOrderData(data);
    setLoading(false);
  }

  const total = orderData ? Number(orderData.total) : cart.reduce((s, c) => s + c.price * c.qty, 0);
  const allItems: any[] = orderData?.order_items || cart;
  const totalQty = allItems.reduce((s: number, i: any) => s + (i.qty || 1), 0);

  const handleConfirm = async () => {
    if (orderId) {
      const paymentMethodMap: Record<string, string> = {
        promptpay: 'promptpay',
        cash: 'cash',
        card: 'credit_card',
      };

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'paid' as any,
          payment_method: paymentMethodMap[method] as any,
          paid_amount: total,
          change_amount: 0,
          paid_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) {
        console.error('Payment error:', error);
        return;
      }
      // trigger trg_sync_table_status will auto-set table to 'available'
    }

    setPaid(true);
    setTimeout(() => { onSuccess?.(); setPaid(false); }, 2200);
  };

  return (
    <div className="flex flex-1 items-center justify-center p-8 bg-background">
      <div className="w-[420px] flex flex-col gap-4">

        {paid ? (
          /* ── Success state ── */
          <div className="bg-white dark:bg-card rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.07),0_16px_40px_rgba(0,0,0,0.07)] p-10 text-center border border-border animate-scale-in">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-5"
              style={{ background: "hsl(var(--success)/0.1)", boxShadow: "0 0 32px hsl(var(--success)/0.2)" }}>
              ✅
            </div>
            <div className="text-[22px] font-bold text-foreground mb-1">ชำระเงินสำเร็จ!</div>
            <div className="font-mono text-[32px] font-extrabold tabular-nums mb-2" style={{ color: "hsl(var(--success))" }}>
              ฿{total.toLocaleString()}.00
            </div>
            <div className="text-[13px] text-muted-foreground">กำลังพิมพ์ใบเสร็จ…</div>
          </div>
        ) : (
          <>
            {/* ── Amount card ── */}
            <div className="bg-white dark:bg-card rounded-3xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.05),0_16px_40px_rgba(0,0,0,0.06)] px-8 pt-7 pb-6 text-center">
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">ยอดชำระ</p>
              {loading ? (
                <div className="h-16 flex items-center justify-center">
                  <div className="text-muted-foreground text-[13px]">กำลังโหลด...</div>
                </div>
              ) : (
                <>
                  <div className="font-mono text-[52px] font-black text-foreground tabular-nums leading-none mb-1">
                    ฿{total.toLocaleString()}
                    <span className="text-[24px] font-semibold text-muted-foreground">.00</span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-2">{totalQty} รายการ · รวม VAT แล้ว</p>
                </>
              )}

              {/* Order items summary */}
              {allItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/60 space-y-1.5 text-left">
                  {allItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-foreground font-medium flex items-center gap-1.5">
                        <span>{item.menu_items?.emoji || item.img || '🍽'}</span>
                        {item.name}
                        <span className="text-muted-foreground">× {item.qty}</span>
                      </span>
                      <span className="font-mono tabular-nums text-foreground font-semibold">
                        ฿{(Number(item.price) * item.qty).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Payment method pills ── */}
            <div className="bg-white dark:bg-card rounded-3xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] p-5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">วิธีชำระเงิน</p>
              <div className="flex gap-2.5">
                {METHODS.map(m => {
                  const active = method === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setMethod(m.key)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 py-3.5 rounded-2xl border-2 text-[12px] font-semibold transition-all duration-150 select-none active:scale-[0.97]",
                        active
                          ? "border-primary bg-primary/8 text-primary shadow-[0_2px_12px_hsl(var(--primary)/0.18)]"
                          : "border-border bg-background text-muted-foreground hover:border-border-light hover:text-foreground"
                      )}
                    >
                      <span className="text-[22px] leading-none">{m.icon}</span>
                      <span className="font-bold">{m.label}</span>
                      <span className={cn("text-[10px]", active ? "text-primary/70" : "text-muted-foreground/60")}>{m.sublabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Visual / QR card ── */}
            <div className="bg-white dark:bg-card rounded-3xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] px-8 py-6 flex flex-col items-center gap-3 min-h-[176px] justify-center">
              {method === "promptpay" && (
                <>
                  <div className="w-36 h-36 rounded-2xl bg-white border border-border shadow-[0_1px_4px_rgba(0,0,0,0.08)] p-2.5 flex items-center justify-center">
                    <div className="w-full h-full rounded-lg" style={{ background: "repeating-conic-gradient(#111318 0% 25%, #fff 0% 50%) 0 0 / 12px 12px" }} />
                  </div>
                  <p className="text-[12px] text-muted-foreground font-medium">สแกน QR Code เพื่อจ่ายผ่าน PromptPay</p>
                </>
              )}
              {method === "cash" && (
                <>
                  <span className="text-[64px] leading-none">💵</span>
                  <p className="text-[12px] text-muted-foreground font-medium">รับเงินสดและทอนเงินให้ลูกค้า</p>
                </>
              )}
              {method === "card" && (
                <>
                  <span className="text-[64px] leading-none">💳</span>
                  <p className="text-[12px] text-muted-foreground font-medium">เสียบหรือแตะบัตรที่เครื่อง EDC</p>
                </>
              )}
            </div>

            {/* ── Confirm button ── */}
            <button
              onClick={handleConfirm}
              className="w-full h-14 rounded-2xl bg-primary text-white font-semibold text-[16px] tracking-[-0.01em] select-none transition-all active:scale-[0.98]"
              style={{ boxShadow: "0 4px 20px hsl(var(--primary)/0.38), inset 0 1px 0 rgba(255,255,255,0.18)" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 6px 24px hsl(var(--primary)/0.46), inset 0 1px 0 rgba(255,255,255,0.18)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 4px 20px hsl(var(--primary)/0.38), inset 0 1px 0 rgba(255,255,255,0.18)")}
            >
              ยืนยันชำระเงิน — ฿{total.toLocaleString()}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
