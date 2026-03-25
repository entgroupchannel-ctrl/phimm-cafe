import { POSStatCard } from "./POSStatCard";
import { POSBadge } from "./POSBadge";
import { cn } from "@/lib/utils";

const STAFF = [
  { name: "สมศักดิ์", role: "พ่อครัว",    status: "online",  shift: "10:00-18:00", hours: 7.5, sales: 12400 },
  { name: "อรทัย",    role: "แคชเชียร์",   status: "online",  shift: "10:00-18:00", hours: 7.5, sales: 8900  },
  { name: "ณัฐ",      role: "เสิร์ฟ",      status: "online",  shift: "11:00-20:00", hours: 6,   sales: 5200  },
  { name: "พลอย",     role: "เสิร์ฟ",      status: "offline", shift: "16:00-22:00", hours: 0,   sales: 0     },
  { name: "ธีร์",     role: "พ่อครัว",    status: "offline", shift: "16:00-22:00", hours: 0,   sales: 0     },
];

const DAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
const SHIFTS_GRID = [
  ["สมศักดิ์", "สมศักดิ์", "สมศักดิ์", "สมศักดิ์", "สมศักดิ์", "ธีร์", "—"],
  ["อรทัย",    "อรทัย",    "อรทัย",    "อรทัย",    "อรทัย",    "อรทัย", "—"],
  ["ณัฐ",      "ณัฐ",      "พลอย",     "ณัฐ",      "พลอย",     "ณัฐ",  "พลอย"],
  ["ธีร์",     "ธีร์",     "ธีร์",     "ธีร์",     "ธีร์",     "สมศักดิ์", "ธีร์"],
];
const SHIFT_LABELS = ["เช้า 10-14", "บ่าย 14-18", "เย็น 16-20", "ค่ำ 18-22"];

const TODAY_COL = 2; // วันพุธ

type RoleKey = "พ่อครัว" | "แคชเชียร์" | "เสิร์ฟ";
const roleColor: Record<RoleKey, "danger" | "primary" | "accent"> = {
  "พ่อครัว":  "danger",
  "แคชเชียร์": "primary",
  "เสิร์ฟ":   "accent",
};

function getRoleColor(name: string) {
  const found = STAFF.find((s) => s.name === name);
  return found ? roleColor[found.role as RoleKey] : "primary";
}

export function StaffScreen() {
  return (
    <div className="flex-1 p-6 overflow-y-auto scrollbar-hide space-y-5">
      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        <POSStatCard icon="👤" label="พนักงานทั้งหมด"   value="5"      sub="คน"                  color="primary" />
        <POSStatCard icon="🟢" label="ออนไลน์ตอนนี้"    value="3"      sub="คน กำลังทำงาน"       color="success" />
        <POSStatCard icon="⏱"  label="ชั่วโมงวันนี้"    value="21"     sub="ชม. รวมทุกคน"        color="accent"  />
        <POSStatCard icon="💰" label="ต้นทุนแรงงาน/วัน" value="฿2,850" sub="เทียบยอดขาย 10%"     color="warning" />
      </div>

      <div className="flex gap-4">
        {/* Staff list */}
        <div className="flex-1 bg-card border border-border rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="text-[15px] font-bold">👥 พนักงาน</div>
            <button className="px-4 py-2 rounded-xl gradient-primary text-white text-[12px] font-bold shadow-[0_2px_12px_hsl(var(--primary)/0.4)] hover:shadow-[0_2px_20px_hsl(var(--primary)/0.5)] transition-shadow">
              + เพิ่มพนักงาน
            </button>
          </div>
          <div className="divide-y divide-border/20">
            {STAFF.map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center text-[14px] font-extrabold relative shrink-0",
                  "border",
                  s.role === "พ่อครัว" ? "bg-danger/15 border-danger/30 text-danger"
                  : s.role === "แคชเชียร์" ? "bg-primary/15 border-primary/30 text-primary"
                  : "bg-accent/15 border-accent/30 text-accent"
                )}>
                  {s.name.charAt(0)}
                  <span className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                    s.status === "online" ? "bg-success shadow-[0_0_6px_hsl(var(--success)/0.8)]" : "bg-foreground/30"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold">{s.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <POSBadge color={roleColor[s.role as RoleKey]}>{s.role}</POSBadge>
                    <span className="text-[11px] text-foreground/40">กะ {s.shift}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {s.status === "online" ? (
                    <>
                      <div className="font-mono text-[13px] font-bold tabular-nums">{s.hours} ชม.</div>
                      <div className="text-[11px] text-foreground/40">฿{s.sales.toLocaleString()}</div>
                    </>
                  ) : (
                    <span className="text-[12px] text-foreground/30">ยังไม่เริ่มกะ</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly schedule */}
        <div className="flex-[1.5] bg-card border border-border rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="text-[15px] font-bold">📅 ตารางงานสัปดาห์นี้</div>
            <POSBadge color="accent" glow>🤖 AI จัดให้</POSBadge>
          </div>

          <div className="overflow-x-auto">
            <div className="grid gap-1.5 text-[11px] min-w-[500px]"
              style={{ gridTemplateColumns: "90px repeat(7, 1fr)" }}>
              {/* Header row */}
              <div className="text-foreground/40 font-semibold p-1.5">กะ</div>
              {DAYS.map((d, i) => (
                <div
                  key={d}
                  className={cn(
                    "text-center font-bold p-1.5 rounded-lg",
                    i === TODAY_COL ? "bg-primary/15 text-primary" : "text-foreground/40"
                  )}
                >
                  {d}
                </div>
              ))}

              {/* Shift rows */}
              {SHIFT_LABELS.map((label, si) => (
                <>
                  <div key={`label-${si}`} className="text-muted-foreground font-semibold p-1.5 pt-2 border-t border-border text-[10px]">
                    {label}
                  </div>
                  {SHIFTS_GRID[si].map((name, di) => (
                    <div
                      key={`${si}-${di}`}
                      className={cn(
                        "text-center p-1.5 rounded-md border-t border-border font-semibold",
                        name === "—"
                          ? "text-foreground/20"
                          : cn(
                              getRoleColor(name) === "danger"  && "bg-danger/10 text-foreground/80",
                              getRoleColor(name) === "primary" && "bg-primary/10 text-foreground/80",
                              getRoleColor(name) === "accent"  && "bg-accent/10 text-foreground/80",
                            )
                      )}
                    >
                      {name}
                    </div>
                  ))}
                </>
              ))}
            </div>
          </div>

          <div className="mt-4 px-3.5 py-3 rounded-xl bg-primary/5 border border-primary/20 text-[12px] text-muted-foreground leading-relaxed">
            🤖 <strong className="text-primary">AI แนะนำ:</strong> วันเสาร์ยอดขายสูงกว่าปกติ 35% ควรเพิ่มพนักงานเสิร์ฟ 1 คน ช่วง 17:00-21:00
          </div>
        </div>
      </div>
    </div>
  );
}
