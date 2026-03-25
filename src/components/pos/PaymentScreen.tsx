import { useState } from "react";
import { CartItem } from "./OrderScreen";
import { cn } from "@/lib/utils";

interface PaymentScreenProps {
  cart: CartItem[];
  onSuccess?: () => void;
}

const METHODS = [
  { key: "promptpay", label: "PromptPay", icon: "📱", color: "accent" as const },
  { key: "cash",      label: "เงินสด",   icon: "💵", color: "success" as const },
  { key: "card",      label: "บัตร",     icon: "💳", color: "primary" as const },
];

const methodColors = {
  accent:  "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20",
  success: "border-success/40 bg-success/10 text-success hover:bg-success/20",
  primary: "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
};

export function PaymentScreen({ cart, onSuccess }: PaymentScreenProps) {
  const [method, setMethod] = useState<string>("promptpay");
  const [paid, setPaid] = useState(false);

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0) || 317;
  const totalQty = cart.reduce((s, c) => s + c.qty, 0) || 3;

  const handleConfirm = () => {
    setPaid(true);
    setTimeout(() => {
      onSuccess?.();
      setPaid(false);
    }, 2000);
  };

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-[420px] bg-card border border-border rounded-2xl p-8 text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/10 blur-3xl rounded-full" />

        {paid ? (
          <div className="relative animate-fade-in py-8">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-2xl font-bold text-success mb-2">ชำระเงินสำเร็จ!</div>
            <div className="font-mono text-accent text-3xl font-extrabold mb-2">฿{total.toLocaleString()}</div>
            <div className="text-muted-foreground text-sm">กำลังพิมพ์ใบเสร็จ...</div>
          </div>
        ) : (
          <div className="relative">
            <div className="text-[20px] font-bold mb-6">💳 ชำระเงิน — โต๊ะ T3</div>

            <div className="font-mono text-[44px] font-extrabold text-accent mb-1 tabular-nums">
              ฿{total.toLocaleString()}.00
            </div>
            <div className="text-sm text-muted-foreground mb-7">
              {totalQty} รายการ · รวม VAT แล้ว
            </div>

            {/* QR mock */}
            {method === "promptpay" && (
              <div className="w-48 h-48 mx-auto mb-5 rounded-2xl bg-white p-4 flex items-center justify-center">
                <div
                  className="w-full h-full rounded-lg opacity-80"
                  style={{
                    background: "repeating-conic-gradient(#0A0E1A 0% 25%, #fff 0% 50%) 0 0 / 16px 16px"
                  }}
                />
              </div>
            )}
            {method !== "promptpay" && (
              <div className="h-48 flex items-center justify-center mb-5">
                <div className="text-6xl">{method === "cash" ? "💵" : "💳"}</div>
              </div>
            )}

            <p className="text-sm text-muted-foreground mb-6">
              {method === "promptpay" && "สแกน QR Code เพื่อจ่ายผ่าน PromptPay"}
              {method === "cash" && "รับเงินสดและทอนเงินให้ลูกค้า"}
              {method === "card" && "เสียบหรือแตะบัตรที่เครื่อง EDC"}
            </p>

            {/* Payment methods */}
            <div className="flex gap-2.5 mb-5">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={cn(
                    "flex-1 py-3.5 rounded-xl border text-[13px] font-bold transition-all",
                    methodColors[m.color],
                    method === m.key && "ring-2 ring-offset-2 ring-offset-card",
                    method === m.key && m.color === "accent"  && "ring-accent/60",
                    method === m.key && m.color === "success" && "ring-success/60",
                    method === m.key && m.color === "primary" && "ring-primary/60",
                  )}
                >
                  <div className="text-xl mb-0.5">{m.icon}</div>
                  {m.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleConfirm}
              className="w-full py-3.5 rounded-xl gradient-primary text-white font-bold text-[15px] shadow-[0_4px_24px_hsl(var(--primary)/0.4)] hover:shadow-[0_4px_32px_hsl(var(--primary)/0.6)] transition-shadow"
            >
              ✅ ยืนยันชำระเงิน
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
