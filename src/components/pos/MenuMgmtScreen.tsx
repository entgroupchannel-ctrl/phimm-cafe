import { useState } from "react";
import { menuItems } from "@/data/pos-data";
import { POSBadge } from "./POSBadge";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { name: "อาหารจานเดียว", count: 6, icon: "🍛" },
  { name: "เครื่องดื่ม",   count: 3, icon: "🧋" },
  { name: "ของหวาน",       count: 3, icon: "🍡" },
];

const FILTERS = ["ทั้งหมด", "เปิดขาย", "ปิดขาย"];

export function MenuMgmtScreen() {
  const [activeFilter, setActiveFilter] = useState("ทั้งหมด");
  const [search, setSearch] = useState("");

  const filtered = menuItems.filter((item) => {
    if (search && !item.name.includes(search)) return false;
    return true;
  });

  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[18px] font-bold">📋 จัดการเมนู</div>
        <div className="flex gap-2.5">
          <button className="px-4 py-2.5 rounded-xl border border-border bg-card text-muted-foreground text-[13px] font-semibold hover:border-border-light hover:text-foreground transition-colors">
            📁 จัดการหมวดหมู่
          </button>
          <button className="px-4 py-2.5 rounded-xl gradient-primary text-white text-[13px] font-bold shadow-[0_4px_16px_hsl(var(--primary)/0.4)] hover:shadow-[0_4px_24px_hsl(var(--primary)/0.5)] transition-shadow">
            + เพิ่มเมนูใหม่
          </button>
        </div>
      </div>

      {/* Category cards */}
      <div className="flex gap-3">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.name}
            className="flex-1 flex items-center gap-3 bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-border-light transition-colors"
          >
            <span className="text-3xl">{cat.icon}</span>
            <div>
              <div className="text-[14px] font-bold">{cat.name}</div>
              <div className="text-[12px] text-foreground/40">{cat.count} เมนู</div>
            </div>
          </div>
        ))}
        <div className="flex-1 flex items-center justify-center bg-card border-2 border-dashed border-border rounded-2xl p-4 cursor-pointer text-muted-foreground hover:border-border-light hover:text-foreground text-[13px] font-semibold transition-colors">
          + เพิ่มหมวดหมู่
        </div>
      </div>

      {/* Search + filter + table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2 bg-background rounded-xl border border-border text-muted-foreground">
            <span>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเมนู..."
              className="bg-transparent text-[13px] outline-none flex-1 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-1.5">
            {FILTERS.map((f, i) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
                  activeFilter === f
                    ? "border-primary/50 bg-primary/12 text-primary"
                    : "border-border text-foreground/40 hover:text-foreground hover:border-border-light"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="px-5 pb-4">
          {filtered.map((item) => (
            <div key={item.id} className="flex items-center gap-4 py-3.5 border-b border-border/20 last:border-0">
              <span className="text-[32px]">{item.img}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold">{item.name}</span>
                  {item.popular && <POSBadge color="warning">ยอดนิยม</POSBadge>}
                </div>
                <div className="text-[12px] text-foreground/40">{item.cat}</div>
              </div>
              {/* Price */}
              <div className="text-right mr-4">
                <div className="font-mono text-[15px] font-extrabold text-accent">฿{item.price}</div>
                <div className="text-[11px] text-foreground/40">ต้นทุน ฿{Math.round(item.price * 0.35)}</div>
              </div>
              {/* Toggle */}
              <div className="flex items-center gap-2 mr-3">
                <div className="w-10 h-[22px] rounded-full bg-success/20 relative cursor-pointer">
                  <div className="w-[18px] h-[18px] rounded-full bg-success absolute top-[2px] right-[2px] shadow-[0_0_8px_hsl(var(--success)/0.5)]" />
                </div>
                <span className="text-[11px] text-success font-semibold">เปิด</span>
              </div>
              {/* Actions */}
              <div className="flex gap-1.5">
                <button className="px-3 py-1.5 rounded-lg border border-border bg-background text-muted-foreground text-[12px] hover:text-foreground hover:border-border-light transition-colors">
                  ✏️ แก้ไข
                </button>
                <button className="px-3 py-1.5 rounded-lg border border-danger/30 bg-danger/10 text-danger text-[12px] hover:bg-danger/20 transition-colors">
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
