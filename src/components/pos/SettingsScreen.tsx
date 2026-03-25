import { useState } from "react";
import { cn } from "@/lib/utils";

type SettingItem = { label: string; value: string; type: "text" | "toggle" | "device"; on?: boolean };
type SettingSection = { title: string; items: SettingItem[] };

const SECTIONS: SettingSection[] = [
  {
    title: "🏪 ข้อมูลร้าน",
    items: [
      { label: "ชื่อร้าน",                 value: "Phimm Cafe",                       type: "text" },
      { label: "ที่อยู่",                   value: "123/45 ถ.สุขุมวิท แขวงคลองเตย",  type: "text" },
      { label: "เบอร์โทร",                 value: "02-123-4567",                      type: "text" },
      { label: "เวลาเปิด-ปิด",             value: "10:00 - 22:00",                    type: "text" },
      { label: "เลขประจำตัวผู้เสียภาษี",   value: "1234567890123",                    type: "text" },
    ],
  },
  {
    title: "💳 การชำระเงิน",
    items: [
      { label: "PromptPay",         value: "เปิดใช้งาน",          type: "toggle", on: true  },
      { label: "บัตรเครดิต/เดบิต", value: "เปิดใช้งาน (Omise)",  type: "toggle", on: true  },
      { label: "เงินสด",           value: "เปิดใช้งาน",          type: "toggle", on: true  },
      { label: "VAT 7%",           value: "รวมในราคา",           type: "toggle", on: true  },
      { label: "Service Charge",   value: "ปิด",                 type: "toggle", on: false },
    ],
  },
  {
    title: "🖨 เครื่องพิมพ์",
    items: [
      { label: "Printer ครัว",      value: "🟢 Star TSP143 (Bluetooth)", type: "device" },
      { label: "Printer แคชเชียร์", value: "🟢 Epson TM-T82 (USB)",      type: "device" },
      { label: "ขนาดกระดาษ",        value: "80mm",                        type: "text"   },
    ],
  },
  {
    title: "🔗 เชื่อมต่อ Delivery",
    items: [
      { label: "LINE MAN",   value: "เชื่อมต่อแล้ว",    type: "toggle", on: true  },
      { label: "Grab Food",  value: "ยังไม่เชื่อมต่อ",  type: "toggle", on: false },
      { label: "Robinhood",  value: "ยังไม่เชื่อมต่อ",  type: "toggle", on: false },
      { label: "ShopeeFood", value: "ยังไม่เชื่อมต่อ",  type: "toggle", on: false },
    ],
  },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className={cn(
        "w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200",
        on ? "bg-success/20" : "bg-border"
      )}
    >
      <div className={cn(
        "w-[20px] h-[20px] rounded-full absolute top-[2px] transition-all duration-200 shadow-sm",
        on ? "right-[2px] bg-success shadow-[0_0_8px_hsl(var(--success)/0.5)]"
           : "left-[2px] bg-muted-foreground/50"
      )} />
    </div>
  );
}

export function SettingsScreen() {
  const [sections, setSections] = useState(SECTIONS);

  const toggle = (si: number, ii: number) =>
    setSections((prev) =>
      prev.map((sec, s) =>
        s !== si ? sec : {
          ...sec,
          items: sec.items.map((item, i) =>
            i !== ii ? item : { ...item, on: !item.on, value: !item.on ? "เปิดใช้งาน" : "ปิด" }
          ),
        }
      )
    );

  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide bg-background">
      <div className="max-w-[740px] mx-auto space-y-4">
        <div className="text-[18px] font-bold text-foreground mb-1">⚙️ ตั้งค่าระบบ</div>

        {sections.map((section, si) => (
          <div key={section.title} className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-surface-alt/30">
              <div className="text-[14px] font-bold text-foreground">{section.title}</div>
            </div>
            <div className="divide-y divide-border/40 px-5">
              {section.items.map((item, ii) => (
                <div key={ii} className="flex items-center justify-between py-3.5">
                  <span className="text-[13px] text-muted-foreground font-medium">{item.label}</span>
                  {item.type === "toggle" ? (
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[13px] font-medium",
                        item.on ? "text-success" : "text-muted-foreground/60"
                      )}>{item.value}</span>
                      <Toggle on={!!item.on} onChange={() => toggle(si, ii)} />
                    </div>
                  ) : (
                    <span className="text-[13px] font-semibold text-foreground">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Upgrade CTA */}
        <div className="bg-card border border-primary/25 rounded-2xl shadow-card p-5 flex items-center gap-5">
          <div className="text-[40px]">🚀</div>
          <div className="flex-1">
            <div className="text-[14px] font-bold text-foreground mb-1">
              อัปเกรดเป็น <span className="text-gradient-primary">POSAI Business</span>
            </div>
            <div className="text-[13px] text-muted-foreground leading-relaxed">
              ปลดล็อค AI พยากรณ์ยอดขาย, Dynamic Pricing, จัดตารางพนักงานอัตโนมัติ, หลายสาขา
            </div>
          </div>
          <button className="px-5 py-3 rounded-xl gradient-primary text-white text-[14px] font-bold whitespace-nowrap shadow-primary hover:shadow-primary-lg transition-shadow shrink-0">
            ฿899/เดือน
          </button>
        </div>
      </div>
    </div>
  );
}
