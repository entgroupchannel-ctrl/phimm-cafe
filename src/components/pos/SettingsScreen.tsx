import { useState } from "react";
import { cn } from "@/lib/utils";

type SettingItem = {
  label: string;
  value: string;
  type: "text" | "toggle" | "device";
  on?: boolean;
};

type SettingSection = {
  title: string;
  items: SettingItem[];
};

const SECTIONS: SettingSection[] = [
  {
    title: "🏪 ข้อมูลร้าน",
    items: [
      { label: "ชื่อร้าน",                  value: "กินดี สุขุมวิท",                  type: "text"   },
      { label: "ที่อยู่",                    value: "123/45 ถ.สุขุมวิท แขวงคลองเตย",  type: "text"   },
      { label: "เบอร์โทร",                  value: "02-123-4567",                      type: "text"   },
      { label: "เวลาเปิด-ปิด",              value: "10:00 - 22:00",                    type: "text"   },
      { label: "เลขประจำตัวผู้เสียภาษี",    value: "1234567890123",                    type: "text"   },
    ],
  },
  {
    title: "💳 การชำระเงิน",
    items: [
      { label: "PromptPay",           value: "เปิดใช้งาน",           type: "toggle", on: true  },
      { label: "บัตรเครดิต/เดบิต",   value: "เปิดใช้งาน (Omise)",   type: "toggle", on: true  },
      { label: "เงินสด",             value: "เปิดใช้งาน",           type: "toggle", on: true  },
      { label: "VAT 7%",             value: "รวมในราคา",            type: "toggle", on: true  },
      { label: "Service Charge",     value: "ปิด",                  type: "toggle", on: false },
    ],
  },
  {
    title: "🖨 เครื่องพิมพ์",
    items: [
      { label: "Printer ครัว",        value: "🟢 Star TSP143 (Bluetooth)", type: "device" },
      { label: "Printer แคชเชียร์",   value: "🟢 Epson TM-T82 (USB)",      type: "device" },
      { label: "ขนาดกระดาษ",          value: "80mm",                        type: "text"   },
    ],
  },
  {
    title: "🔗 เชื่อมต่อ Delivery",
    items: [
      { label: "LINE MAN",    value: "เชื่อมต่อแล้ว",      type: "toggle", on: true  },
      { label: "Grab Food",   value: "ยังไม่เชื่อมต่อ",    type: "toggle", on: false },
      { label: "Robinhood",   value: "ยังไม่เชื่อมต่อ",    type: "toggle", on: false },
      { label: "ShopeeFood",  value: "ยังไม่เชื่อมต่อ",    type: "toggle", on: false },
    ],
  },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className={cn(
        "w-10 h-[22px] rounded-full relative cursor-pointer transition-colors duration-200",
        on ? "bg-success/25" : "bg-foreground/10"
      )}
    >
      <div
        className={cn(
          "w-[18px] h-[18px] rounded-full absolute top-[2px] transition-all duration-200",
          on
            ? "right-[2px] bg-success shadow-[0_0_8px_hsl(var(--success)/0.6)]"
            : "left-[2px] bg-foreground/30"
        )}
      />
    </div>
  );
}

export function SettingsScreen() {
  const [sections, setSections] = useState(SECTIONS);

  const toggle = (si: number, ii: number) => {
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
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
      <div className="max-w-[760px] mx-auto space-y-4">
        <div className="text-[18px] font-bold mb-2">⚙️ ตั้งค่าระบบ</div>

        {sections.map((section, si) => (
          <div key={section.title} className="bg-card border border-border rounded-2xl p-5">
            <div className="text-[15px] font-bold mb-3">{section.title}</div>
            <div className="divide-y divide-border/20">
              {section.items.map((item, ii) => (
                <div key={ii} className="flex items-center justify-between py-3">
                  <span className="text-[13px] text-muted-foreground">{item.label}</span>
                  {item.type === "toggle" ? (
                    <div className="flex items-center gap-2.5">
                      <span className={cn(
                        "text-[12px] font-medium",
                        item.on ? "text-success" : "text-foreground/30"
                      )}>
                        {item.value}
                      </span>
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
        <div className="bg-card border border-primary/30 rounded-2xl p-5 flex items-center gap-4">
          <div className="text-[36px]">🚀</div>
          <div className="flex-1">
            <div className="text-[14px] font-bold mb-1">
              อัปเกรดเป็น{" "}
              <span className="text-gradient-primary">POSAI Business</span>
            </div>
            <div className="text-[12px] text-foreground/40 leading-relaxed">
              ปลดล็อค AI พยากรณ์ยอดขาย, Dynamic Pricing, จัดตารางพนักงานอัตโนมัติ, หลายสาขา และอีกมากมาย
            </div>
          </div>
          <button className="px-5 py-2.5 rounded-xl gradient-primary text-white text-[13px] font-bold whitespace-nowrap shadow-[0_4px_16px_hsl(var(--primary)/0.4)] hover:shadow-[0_4px_24px_hsl(var(--primary)/0.6)] transition-shadow shrink-0">
            ฿899/เดือน
          </button>
        </div>
      </div>
    </div>
  );
}
