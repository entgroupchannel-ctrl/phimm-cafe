import { useState } from "react";
import { CartItem } from "./OrderScreen";
import { cn } from "@/lib/utils";

interface PaymentScreenProps {
  cart: CartItem[];
  onSuccess?: () => void;
}

const METHODS = [
  { key: "promptpay", label: "PromptPay", icon: "📱", color: "primary" as const },
  { key: "cash",      label: "เงินสด",   icon: "💵", color: "success" as const },
  { key: "card",      label: "บัตร",     icon: "💳", color: "accent"  as const },
];

const methodStyle = {
  primary: "border-primary/30 bg-primary/6 text-primary hover:bg-primary/12 data-[active=true]:ring-primary/40",
  success: "border-success/30 bg-success/6 text-success hover:bg-success/12 data-[active=true]:ring-success/40",
  accent:  "border-accent/30  bg-accent/6  text-accent  hover:bg-accent/12  data-[active=true]:ring-accent/40",
};

export function PaymentScreen({ cart, onSuccess }: PaymentScreenProps) {
  const [method, setMethod] = useState("promptpay");
  const [paid, setPaid]     = useState(false);

  const total    = cart.reduce((s, c) => s + c.price * c.qty, 0) || 317;
  const totalQty = cart.reduce((s, c) => s + c.qty, 0) || 3;

  const handleConfirm = () => {
    setPaid(true);
    setTimeout(() => { onSuccess?.(); setPaid(false); }, 2200);
  };

  return (
    <div className="flex flex-1 items-center justify-center p-8 bg-background">
      <div className="w-[440px] bg-card border border-border rounded-3xl shadow-card overflow-hidden">

        {/* Top accent bar */}
        <div className="h-1 gradient-primary" />

        <div className="p-8 text-center">
          {paid ? (
            <div className="animate-slide-up py-6">
              <div className="w-20 h-20 rounded-full bg-success/10 border border-success/25 flex items-center justify-center text-4xl mx-auto mb-5 shadow-[0_0_24px_hsl(var(--success)/0.2)]">
                ✅
              </div>
              <div className="text-[22px] font-bold text-foreground mb-1">ชำระเงินสำเร็จ!</div>
              <div className="font-mono text-accent text-[30px] font-extrabold mb-2 tabular-nums">฿{total.toLocaleString()}.00</div>
              <div className="text-muted-foreground text-[14px]">กำลังพิมพ์ใบเสร็จ…</div>
            </div>
          ) : (
            <>
              <p className="text-[13px] text-muted-foreground font-medium mb-1">ชำระเงิน — โต๊ะ T3</p>
              <div className="font-mono text-[44px] font-extrabold text-foreground mb-1 tabular-nums leading-none">
                ฿{total.toLocaleString()}.00
              </div>
              <p className="text-[14px] text-muted-foreground mb-7">{totalQty} รายการ · รวม VAT แล้ว</p>

              {/* QR mock */}
              {method === "promptpay" && (
                <div className="w-44 h-44 mx-auto mb-5 rounded-2xl bg-white border border-border shadow-card p-3 flex items-center justify-center">
                  <div
                    className="w-full h-full rounded-lg opacity-90"
                    style={{ background: "repeating-conic-gradient(#111318 0% 25%, #fff 0% 50%) 0 0 / 14px 14px" }}
                  />
                </div>
              )}
              {method !== "promptpay" && (
                <div className="h-44 flex items-center justify-center mb-5">
                  <span className="text-[72px]">{method === "cash" ? "💵" : "💳"}</span>
                </div>
              )}

              <p className="text-[13px] text-muted-foreground mb-6">
                {method === "promptpay" && "สแกน QR Code เพื่อจ่ายผ่าน PromptPay"}
                {method === "cash"      && "รับเงินสดและทอนเงินให้ลูกค้า"}
                {method === "card"      && "เสียบหรือแตะบัตรที่เครื่อง EDC"}
              </p>

              {/* Methods */}
              <div className="flex gap-2.5 mb-5">
                {METHODS.map((m) => (
                  <button
                    key={m.key}
                    data-active={method === m.key}
                    onClick={() => setMethod(m.key)}
                    className={cn(
                      "flex-1 py-3.5 rounded-xl border text-[13px] font-semibold transition-all",
                      methodStyle[m.color],
                      method === m.key && "ring-2 ring-offset-1 ring-offset-card"
                    )}
                  >
                    <div className="text-xl mb-0.5">{m.icon}</div>
                    {m.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleConfirm}
                className="w-full py-4 rounded-xl gradient-primary text-white font-bold text-[15px] shadow-primary hover:shadow-primary-lg transition-shadow"
              >
                ✅ ยืนยันชำระเงิน
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
