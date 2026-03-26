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
  const [paid, setPaid] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Customer lookup
  const [customerPhone, setCustomerPhone] = useState("");
  const [foundCustomer, setFoundCustomer] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState<number | null>(null);
  const [tierDiscount, setTierDiscount] = useState(0);

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

  async function searchCustomer() {
    if (!customerPhone.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', customerPhone.trim())
      .single();

    if (data) {
      // Get tier info
      const { data: tier } = await supabase
        .from('loyalty_tiers')
        .select('discount_pct, multiplier, label')
        .eq('name', data.tier || 'member')
        .single();

      setFoundCustomer({ ...data, tierInfo: tier });
      setTierDiscount(Number(tier?.discount_pct || 0));
    } else {
      setFoundCustomer(null);
      setTierDiscount(0);
    }
    setSearching(false);
  }

  const subtotal = orderData ? Number(orderData.total) : cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountAmount = foundCustomer ? Math.round(subtotal * tierDiscount / 100) : 0;
  const total = subtotal - discountAmount;
  const allItems: any[] = orderData?.order_items || cart;
  const totalQty = allItems.reduce((s: number, i: any) => s + (i.qty || 1), 0);

  // Estimate points
  const estimatedPoints = foundCustomer
    ? Math.floor(total / 10 * Number(foundCustomer.tierInfo?.multiplier || 1))
    : 0;

  const handleConfirm = async () => {
    if (orderId) {
      const paymentMethodMap: Record<string, string> = {
        promptpay: 'promptpay',
        cash: 'cash',
        card: 'credit_card',
      };

      const updatePayload: any = {
        status: 'paid' as any,
        payment_method: paymentMethodMap[method] as any,
        paid_amount: total,
        change_amount: 0,
        paid_at: new Date().toISOString(),
      };

      if (discountAmount > 0) {
        updatePayload.discount_amount = discountAmount;
        updatePayload.discount_note = `ส่วนลดสมาชิก ${foundCustomer?.tierInfo?.label || ''} ${tierDiscount}%`;
      }

      if (foundCustomer) {
        updatePayload.customer_id = foundCustomer.id;
        updatePayload.customer_phone = customerPhone;
      }

      const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);

      if (error) {
        console.error('Payment error:', error);
        return;
      }

      // Earn points
      if (foundCustomer) {
        const { data: earned } = await supabase.rpc('earn_loyalty_points', {
          p_customer_id: foundCustomer.id,
          p_order_id: orderId,
          p_amount: total,
        });
        setEarnedPoints(earned as number);
      }
    }

    setPaid(true);
    setTimeout(() => { onSuccess?.(); setPaid(false); }, 2500);
  };

  return (
    <div className="flex flex-1 items-center justify-center p-8 bg-background">
      <div className="w-[420px] flex flex-col gap-4">

        {paid ? (
          <div className="bg-white dark:bg-card rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.07),0_16px_40px_rgba(0,0,0,0.07)] p-10 text-center border border-border animate-scale-in">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-5"
              style={{ background: "hsl(var(--success)/0.1)", boxShadow: "0 0 32px hsl(var(--success)/0.2)" }}>
              ✅
            </div>
            <div className="text-[22px] font-bold text-foreground mb-1">ชำระเงินสำเร็จ!</div>
            <div className="font-mono text-[32px] font-extrabold tabular-nums mb-2" style={{ color: "hsl(var(--success))" }}>
              ฿{total.toLocaleString()}.00
            </div>
            {earnedPoints != null && earnedPoints > 0 && (
              <div className="text-[14px] font-bold text-primary mt-2">
                🎯 {foundCustomer?.name} ได้รับ +{earnedPoints} แต้ม!
              </div>
            )}
            <div className="text-[13px] text-muted-foreground mt-2">กำลังพิมพ์ใบเสร็จ…</div>
          </div>
        ) : (
          <>
            {/* Amount card */}
            <div className="bg-white dark:bg-card rounded-3xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.05),0_16px_40px_rgba(0,0,0,0.06)] px-8 pt-7 pb-6 text-center">
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">ยอดชำระ</p>
              {loading ? (
                <div className="h-16 flex items-center justify-center">
                  <div className="text-muted-foreground text-[13px]">กำลังโหลด...</div>
                </div>
              ) : (
                <>
                  {discountAmount > 0 && (
                    <div className="text-[14px] text-muted-foreground line-through mb-1">฿{subtotal.toLocaleString()}</div>
                  )}
                  <div className="font-mono text-[52px] font-black text-foreground tabular-nums leading-none mb-1">
                    ฿{total.toLocaleString()}
                    <span className="text-[24px] font-semibold text-muted-foreground">.00</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="text-[13px] font-bold text-success">ส่วนลด {tierDiscount}% = -฿{discountAmount.toLocaleString()}</div>
                  )}
                  <p className="text-[13px] text-muted-foreground mt-2">{totalQty} รายการ · รวม VAT แล้ว</p>
                </>
              )}

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

            {/* Customer lookup */}
            <div className="bg-white dark:bg-card rounded-3xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] p-5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">👤 สมาชิก (ไม่บังคับ)</p>
              <div className="flex gap-2">
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchCustomer()}
                  placeholder="กรอกเบอร์โทร เช่น 081-234-5678"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button onClick={searchCustomer} disabled={searching}
                  className="px-4 py-2.5 rounded-xl text-[12px] font-bold text-white gradient-primary shadow-primary hover:opacity-90 disabled:opacity-40">
                  {searching ? '...' : '🔍 ค้นหา'}
                </button>
              </div>

              {foundCustomer && (
                <div className="mt-3 p-3 rounded-xl bg-success/5 border border-success/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[16px]">
                      {foundCustomer.tier === 'platinum' ? '💎' : foundCustomer.tier === 'gold' ? '🥇' : foundCustomer.tier === 'silver' ? '🥈' : '🌱'}
                    </span>
                    <span className="text-[13px] font-bold text-foreground">{foundCustomer.name}</span>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border",
                      foundCustomer.tier === 'platinum' ? "text-accent border-accent/30 bg-accent/10" :
                      foundCustomer.tier === 'gold' ? "text-warning border-warning/30 bg-warning/10" :
                      "text-primary border-primary/30 bg-primary/10")}>
                      {foundCustomer.tierInfo?.label || foundCustomer.tier}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-auto">{(foundCustomer.points || 0).toLocaleString()} pts</span>
                  </div>
                  {tierDiscount > 0 && (
                    <div className="text-[12px] text-success font-bold">💰 ส่วนลด {tierDiscount}% = -฿{discountAmount.toLocaleString()}</div>
                  )}
                  <div className="text-[12px] text-primary font-bold mt-0.5">🎯 ได้รับแต้ม: +{estimatedPoints} pts</div>
                </div>
              )}

              {customerPhone && !foundCustomer && !searching && (
                <div className="mt-2 text-[12px] text-muted-foreground text-center">ไม่พบสมาชิก — กดยืนยันเพื่อชำระเงินโดยไม่ผูกบัญชี</div>
              )}
            </div>

            {/* Payment method */}
            <div className="bg-white dark:bg-card rounded-3xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] p-5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">วิธีชำระเงิน</p>
              <div className="flex gap-2.5">
                {METHODS.map(m => {
                  const active = method === m.key;
                  return (
                    <button key={m.key} onClick={() => setMethod(m.key)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 py-3.5 rounded-2xl border-2 text-[12px] font-semibold transition-all duration-150 select-none active:scale-[0.97]",
                        active
                          ? "border-primary bg-primary/8 text-primary shadow-[0_2px_12px_hsl(var(--primary)/0.18)]"
                          : "border-border bg-background text-muted-foreground hover:border-border hover:text-foreground"
                      )}>
                      <span className="text-[22px] leading-none">{m.icon}</span>
                      <span className="font-bold">{m.label}</span>
                      <span className={cn("text-[10px]", active ? "text-primary/70" : "text-muted-foreground/60")}>{m.sublabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual */}
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

            {/* Confirm */}
            <button onClick={handleConfirm}
              className="w-full h-14 rounded-2xl bg-primary text-white font-semibold text-[16px] tracking-[-0.01em] select-none transition-all active:scale-[0.98]"
              style={{ boxShadow: "0 4px 20px hsl(var(--primary)/0.38), inset 0 1px 0 rgba(255,255,255,0.18)" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 6px 24px hsl(var(--primary)/0.46), inset 0 1px 0 rgba(255,255,255,0.18)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 4px 20px hsl(var(--primary)/0.38), inset 0 1px 0 rgba(255,255,255,0.18)")}>
              ยืนยันชำระเงิน — ฿{total.toLocaleString()}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
