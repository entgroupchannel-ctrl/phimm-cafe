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

  const filtered = menuItems.filter((item) =>
    !search || item.name.includes(search)
  );

  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide space-y-5 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[18px] font-bold text-foreground">📋 จัดการเมนู</div>
        <div className="flex gap-2.5">
          <button className="px-4 py-2.5 rounded-xl border border-border bg-card text-muted-foreground text-[13px] font-medium hover:border-border-light hover:text-foreground transition-colors shadow-card">
            📁 จัดการหมวดหมู่
          </button>
          <button className="px-4 py-2.5 rounded-xl gradient-primary text-white text-[13px] font-bold shadow-primary hover:shadow-primary-lg transition-shadow">
            + เพิ่มเมนูใหม่
          </button>
        </div>
      </div>

      {/* Category cards */}
      <div className="flex gap-3">
        {CATEGORIES.map((cat) => (
          <div key={cat.name} className="flex-1 flex items-center gap-3 bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-border-light hover:shadow-card-hover shadow-card transition-all">
            <span className="text-3xl">{cat.icon}</span>
            <div>
              <div className="text-[14px] font-bold text-foreground">{cat.name}</div>
              <div className="text-[12px] text-muted-foreground">{cat.count} เมนู</div>
            </div>
          </div>
        ))}
        <div className="flex-1 flex items-center justify-center bg-card border-2 border-dashed border-border rounded-2xl p-4 cursor-pointer text-muted-foreground hover:border-primary/40 hover:text-primary text-[13px] font-medium transition-colors">
          + เพิ่มหมวดหมู่
        </div>
      </div>

      {/* Search + list */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-surface-alt/40">
          <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-card rounded-xl border border-border text-muted-foreground focus-within:border-primary/40 transition-colors">
            <span className="text-base">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเมนู..."
              className="bg-transparent text-[13px] outline-none flex-1 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors",
                  activeFilter === f
                    ? "border-primary/40 bg-primary/8 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border-light"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="divide-y divide-border/40 px-5">
          {filtered.map((item) => (
            <div key={item.id} className="flex items-center gap-4 py-4 hover:bg-surface-alt/30 -mx-5 px-5 transition-colors">
              <span className="text-[32px]">{item.img}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-foreground">{item.name}</span>
                  {item.popular && <POSBadge color="warning">ยอดนิยม</POSBadge>}
                </div>
                <div className="text-[12px] text-muted-foreground">{item.cat}</div>
              </div>
              <div className="text-right mr-4">
                <div className="font-mono text-[15px] font-extrabold text-accent tabular-nums">฿{item.price}</div>
                <div className="text-[11px] text-muted-foreground">ต้นทุน ฿{Math.round(item.price * 0.35)}</div>
              </div>
              {/* Toggle */}
              <div className="flex items-center gap-2 mr-3">
                <div className="w-10 h-[22px] rounded-full bg-success/20 relative cursor-pointer">
                  <div className="w-[18px] h-[18px] rounded-full bg-success absolute top-[2px] right-[2px] shadow-[0_0_6px_hsl(var(--success)/0.5)]" />
                </div>
                <span className="text-[11px] text-success font-semibold">เปิด</span>
              </div>
              <div className="flex gap-1.5">
                <button className="px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground text-[12px] hover:text-foreground hover:border-border-light transition-colors">
                  ✏️ แก้ไข
                </button>
                <button className="px-3 py-1.5 rounded-lg border border-danger/25 bg-danger/6 text-danger text-[12px] hover:bg-danger/12 transition-colors">
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
