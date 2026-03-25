import { useState, useMemo } from "react";
import { POSBadge } from "./POSBadge";
import { POSStatCard } from "./POSStatCard";
import { cn } from "@/lib/utils";

// ── Data ─────────────────────────────────────────────────────
const STAFF = [
  { id: 1, name: "สมศักดิ์", role: "พ่อครัว",           hourly: 75, maxHr: 48, skills: ["ผัด","ต้ม","ทอด"],           avatar: "👨‍🍳", pref: [0,0,0,0,0,1,1] },
  { id: 2, name: "อรทัย",    role: "แคชเชียร์",         hourly: 60, maxHr: 48, skills: ["POS","การเงิน"],              avatar: "💁‍♀️", pref: [0,0,0,0,0,0,1] },
  { id: 3, name: "ณัฐ",      role: "เสิร์ฟ",             hourly: 55, maxHr: 40, skills: ["บริการ","บาร์เครื่องดื่ม"],  avatar: "🧑‍🍳", pref: [0,0,1,0,0,0,0] },
  { id: 4, name: "พลอย",     role: "เสิร์ฟ",             hourly: 55, maxHr: 40, skills: ["บริการ","QR Order"],         avatar: "👩",   pref: [1,0,0,0,0,0,0] },
  { id: 5, name: "ธีร์",     role: "พ่อครัว",           hourly: 70, maxHr: 48, skills: ["ผัด","ย่าง","ของหวาน"],     avatar: "👨‍🍳", pref: [0,0,0,0,1,0,0] },
  { id: 6, name: "มิน",      role: "เสิร์ฟ (Part-time)", hourly: 50, maxHr: 24, skills: ["บริการ"],                    avatar: "🧑",   pref: [0,0,0,1,1,0,0] },
];

const DAYS       = ["จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์","อาทิตย์"];
const DAYS_SHORT = ["จ.","อ.","พ.","พฤ.","ศ.","ส.","อา."];

const SHIFTS = [
  { label: "เช้า",  time: "09:00-14:00", hours: 5, color: "accent"   as const },
  { label: "บ่าย",  time: "14:00-18:00", hours: 4, color: "primary"  as const },
  { label: "เย็น",  time: "18:00-22:00", hours: 4, color: "secondary" as const },
];

const DEMAND = [
  { day:"จ.",  customers:[18,22,35,28,14,12,8], revenue:26800 },
  { day:"อ.",  customers:[20,25,38,30,16,14,9], revenue:29400 },
  { day:"พ.",  customers:[16,20,30,24,12,10,7], revenue:23100 },
  { day:"พฤ.", customers:[22,28,42,35,20,18,12], revenue:34200 },
  { day:"ศ.",  customers:[28,35,55,48,32,28,18], revenue:45600 },
  { day:"ส.",  customers:[32,40,52,45,35,30,20], revenue:42800 },
  { day:"อา.", customers:[25,30,40,32,22,18,12], revenue:31500 },
];

const HEAT_HOURS = ["09","10","11","12","13","14","15","16","17","18","19","20","21"];

type RoleKey = keyof typeof ROLE_COLOR;
const ROLE_COLOR = {
  "พ่อครัว":           "danger",
  "แคชเชียร์":         "primary",
  "เสิร์ฟ":             "accent",
  "เสิร์ฟ (Part-time)": "warning",
} as const;

// ── Helper ───────────────────────────────────────────────────
function roleColor(role: string): "danger"|"primary"|"accent"|"warning" {
  return (ROLE_COLOR as Record<string,"danger"|"primary"|"accent"|"warning">)[role] ?? "primary";
}

// ════════════════════════════════════════════════
// TAB 1 — AI Auto-Schedule
// ════════════════════════════════════════════════
function AIScheduleTab() {
  const [laborTarget, setLaborTarget] = useState(28);
  const [selectedDay, setSelectedDay] = useState(4);

  const aiSchedule = useMemo(() => {
    return DAYS_SHORT.map((day, di) => {
      const demand = DEMAND[di];
      const totalCust = demand.customers.reduce((a, b) => a + b, 0);
      const needEvening = totalCust > 200 ? 5 : totalCust > 150 ? 4 : 3;

      const shifts = [
        { shift: "เช้า",  staff: STAFF.filter(s => s.role.includes("พ่อครัว")).slice(0,1).map(s=>s.id)
            .concat(STAFF.filter(s => s.role.includes("เสิร์ฟ")||s.role.includes("แคชเชียร์")).slice(0, totalCust>150 ? 2 : 1).map(s=>s.id)) },
        { shift: "บ่าย",  staff: STAFF.filter(s => s.role.includes("พ่อครัว")).slice(0,1).map(s=>s.id)
            .concat(STAFF.filter(s => s.role.includes("แคชเชียร์")).map(s=>s.id))
            .concat(di >= 4 ? [6] : []) },
        { shift: "เย็น",  staff: STAFF.filter(s => !s.role.includes("Part-time")).slice(0, needEvening).map(s=>s.id)
            .concat(di >= 4 ? [6] : []) },
      ];

      const laborCost = shifts.reduce((sum, sh, si) =>
        sum + sh.staff.reduce((s2, sid) => s2 + (STAFF.find(st => st.id === sid)?.hourly ?? 0) * SHIFTS[si].hours, 0), 0);
      const totalHours = shifts.reduce((sum, sh, si) => sum + sh.staff.length * SHIFTS[si].hours, 0);
      const laborPct = demand.revenue > 0 ? (laborCost / demand.revenue) * 100 : 0;

      return { day, shifts, totalHours, laborCost, laborPct, revenue: demand.revenue, demand: totalCust };
    });
  }, [laborTarget]);

  const sel = aiSchedule[selectedDay];
  const weekLaborCost = aiSchedule.reduce((s, d) => s + d.laborCost, 0);
  const avgLaborPct   = aiSchedule.reduce((s, d) => s + d.laborPct, 0) / 7;
  const weekHours     = aiSchedule.reduce((s, d) => s + d.totalHours, 0);

  return (
    <div className="space-y-4">
      {/* Labor target */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex-1 min-w-[280px]">
            <div className="text-[13px] font-semibold text-muted-foreground mb-2">
              🎯 เป้าหมายต้นทุนแรงงาน:{" "}
              <span className={cn("font-mono text-[22px] font-extrabold tabular-nums",
                laborTarget > 30 ? "text-danger" : laborTarget > 25 ? "text-warning" : "text-success")}>
                {laborTarget}%
              </span>
              <span className="text-[12px] text-muted-foreground/60"> ของยอดขาย</span>
            </div>
            <input type="range" min={18} max={38} value={laborTarget}
              onChange={e => setLaborTarget(+e.target.value)}
              className="w-full accent-primary h-1.5 cursor-pointer" />
            <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1">
              <span>18% (ตึง)</span><span>25% (เหมาะ)</span><span>38% (ใจดี)</span>
            </div>
          </div>
          <div className="flex gap-3">
            {[
              { label:"ค่าแรง/สัปดาห์", value:`฿${weekLaborCost.toLocaleString()}`, c:"accent"   as const },
              { label:"ค่าแรงเฉลี่ย",   value:`${avgLaborPct.toFixed(1)}%`,         c: avgLaborPct > laborTarget ? "danger" as const : "success" as const },
              { label:"ชม. รวม/สัปดาห์", value:`${weekHours}`,                       c:"primary"  as const },
            ].map((s, i) => (
              <div key={i} className="bg-surface-alt rounded-xl px-4 py-3 border border-border text-center">
                <div className="text-[10px] text-muted-foreground mb-1">{s.label}</div>
                <div className={cn("font-mono text-[20px] font-extrabold tabular-nums",
                  s.c === "accent" ? "text-accent" : s.c === "danger" ? "text-danger" : s.c === "success" ? "text-success" : "text-primary")}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule grid */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex justify-between items-center mb-4">
          <div className="text-[15px] font-bold text-foreground">📅 ตารางงานอัตโนมัติ (สัปดาห์หน้า)</div>
          <div className="flex gap-2">
            <POSBadge color="success" glow>🤖 AI จัดให้</POSBadge>
            <POSBadge color="accent">Accuracy 94%</POSBadge>
          </div>
        </div>

        {/* Day pills */}
        <div className="flex gap-1.5 mb-4">
          {DAYS_SHORT.map((d, i) => {
            const data = aiSchedule[i];
            const over = data.laborPct > laborTarget;
            return (
              <button key={d} onClick={() => setSelectedDay(i)}
                className={cn("flex-1 py-2.5 rounded-xl text-center border transition-all",
                  selectedDay === i
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border bg-surface-alt text-muted-foreground hover:border-border-light")}>
                <div className="text-[13px] font-bold">{d}</div>
                <div className={cn("text-[10px] font-bold tabular-nums", over ? "text-danger" : "text-success")}>
                  {data.laborPct.toFixed(1)}%
                </div>
                <div className="text-[9px] text-muted-foreground/60 font-mono">฿{(data.revenue/1000).toFixed(0)}k</div>
              </button>
            );
          })}
        </div>

        {/* Selected day detail */}
        <div className="bg-surface-alt rounded-xl p-4 border border-border">
          <div className="flex justify-between items-center mb-4">
            <div className="text-[16px] font-extrabold text-foreground">{DAYS[selectedDay]}</div>
            <div className="flex gap-4">
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground">ยอดขายคาด</div>
                <div className="font-mono text-[16px] font-extrabold text-accent tabular-nums">฿{sel.revenue.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground">ค่าแรง</div>
                <div className={cn("font-mono text-[16px] font-extrabold tabular-nums",
                  sel.laborPct > laborTarget ? "text-danger" : "text-success")}>
                  ฿{sel.laborCost.toLocaleString()} ({sel.laborPct.toFixed(1)}%)
                </div>
              </div>
            </div>
          </div>

          {SHIFTS.map((shift, si) => {
            const assignedIds = sel.shifts[si]?.staff ?? [];
            const assigned = assignedIds.map(id => STAFF.find(s => s.id === id)).filter(Boolean) as typeof STAFF;
            return (
              <div key={si} className="flex items-center gap-3 py-3 border-t border-border first:border-t-0">
                <div className="w-[90px] shrink-0">
                  <POSBadge color={shift.color}>{shift.label}</POSBadge>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{shift.time}</div>
                </div>
                <div className="flex-1 flex gap-2 flex-wrap">
                  {assigned.length > 0 ? assigned.map(s => (
                    <div key={s.id} className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border",
                      roleColor(s.role) === "danger"   ? "bg-danger/8   border-danger/20"   :
                      roleColor(s.role) === "accent"   ? "bg-accent/8   border-accent/20"   :
                      roleColor(s.role) === "warning"  ? "bg-warning/8  border-warning/20"  :
                                                          "bg-primary/8  border-primary/20"
                    )}>
                      <span className="text-[16px]">{s.avatar}</span>
                      <div>
                        <div className="text-[12px] font-bold text-foreground">{s.name}</div>
                        <div className="text-[10px] text-muted-foreground">{s.role}</div>
                      </div>
                    </div>
                  )) : <span className="text-[12px] text-muted-foreground/40">— ไม่มีกะนี้ —</span>}
                </div>
                <div className="font-mono text-[12px] text-muted-foreground text-right shrink-0 w-12">
                  {assigned.length} คน<br/>{shift.hours} ชม.
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Demand heatmap */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="text-[14px] font-bold text-foreground mb-4">🔥 Demand Heatmap — ลูกค้าต่อชั่วโมง</div>
        <div className="overflow-x-auto">
          <div className="grid gap-0.5 text-[10px] min-w-[480px]" style={{ gridTemplateColumns: "44px repeat(7, 1fr)" }}>
            <div />
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center font-bold text-muted-foreground py-1">{d}</div>
            ))}
            {HEAT_HOURS.map((hr, hi) => {
              const hourIdx = Math.min(hi, 6);
              return [
                <div key={`h${hi}`} className="font-mono text-muted-foreground/50 text-right py-1.5 pr-1">{hr}:00</div>,
                ...DAYS_SHORT.map((_, di) => {
                  const val = DEMAND[di].customers[Math.min(hourIdx, DEMAND[di].customers.length - 1)];
                  const intensity = val / 55;
                  return (
                    <div key={`${hi}-${di}`}
                      className={cn("text-center py-1.5 rounded font-mono font-semibold tabular-nums",
                        intensity > 0.7 ? "bg-danger/25 text-danger"    :
                        intensity > 0.5 ? "bg-warning/25 text-warning"  :
                        intensity > 0.3 ? "bg-primary/20 text-primary"  :
                                          "bg-primary/8 text-muted-foreground/50"
                      )}>
                      {val}
                    </div>
                  );
                }),
              ];
            })}
          </div>
        </div>
        <div className="flex gap-4 justify-center mt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded bg-primary/20 inline-block"/>น้อย</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded bg-warning/25 inline-block"/>ปานกลาง</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2.5 rounded bg-danger/25 inline-block"/>พีค</span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// TAB 2 — OT & Cost Alerts
// ════════════════════════════════════════════════
const WEEKLY_HOURS = [
  { ...STAFF[0], scheduled: 46, actual: 48.5, ot: 0.5, otCost:  56 },
  { ...STAFF[1], scheduled: 44, actual: 44,   ot: 0,   otCost:   0 },
  { ...STAFF[2], scheduled: 38, actual: 42,   ot: 2,   otCost: 165 },
  { ...STAFF[3], scheduled: 36, actual: 36,   ot: 0,   otCost:   0 },
  { ...STAFF[4], scheduled: 44, actual: 50,   ot: 2,   otCost: 210 },
  { ...STAFF[5], scheduled: 22, actual: 22,   ot: 0,   otCost:   0 },
];

const OT_RECS = [
  { icon:"🔄", title:"สลับกะ ธีร์ ↔ สมศักดิ์ วันศุกร์เย็น",      impact:"ลด OT ธีร์ 2 ชม. = ประหยัด ฿210",                            urgency:"high"   },
  { icon:"📉", title:"ลดพนักงานเสิร์ฟ วันพุธ เหลือ 2 คน",          impact:"ยอดขายพุธต่ำ -14% ไม่จำเป็น 3 คน = ประหยัด ฿440/วัน",      urgency:"medium" },
  { icon:"🧑", title:"เพิ่ม Part-time 1 คน วันศุกร์-เสาร์",         impact:"ลด OT พ่อครัว + เพิ่มคุณภาพบริการ = ประหยัดสุทธิ ฿680/สัปดาห์", urgency:"medium" },
  { icon:"⏰", title:"เลื่อนกะ ณัฐ จาก 11:00 เป็น 12:00 วันอังคาร", impact:"ตรงกับ Peak lunch มากขึ้น = เพิ่มรายได้ ~฿1,200",           urgency:"low"    },
  { icon:"📊", title:"ตั้ง Auto-cap OT ที่ 2 ชม./สัปดาห์/คน",        impact:"ป้องกัน OT เกิน — คาดว่าประหยัด ฿1,500/เดือน",             urgency:"low"    },
];

function OvertimeAlertsTab() {
  const totalOtCost = WEEKLY_HOURS.reduce((s, w) => s + w.otCost, 0);
  const riskStaff   = WEEKLY_HOURS.filter(w => (w.actual / w.maxHr) >= 0.90);

  return (
    <div className="space-y-4">
      {/* Alert cards */}
      <div className="flex gap-4 flex-wrap">
        <POSStatCard icon="⚠️" label="ค่าล่วงเวลาสัปดาห์นี้"   value={`฿${totalOtCost.toLocaleString()}`}          sub={`${WEEKLY_HOURS.filter(w=>w.ot>0).length} คน ทำ OT`}                color="danger"  />
        <POSStatCard icon="🚨" label="เสี่ยง OT สัปดาห์หน้า"     value={`${riskStaff.length} คน`}                      sub="ใกล้ถึงเพดานชั่วโมง"                                               color="warning" />
        <POSStatCard icon="💡" label="AI ประหยัดได้"              value={`฿${Math.round(totalOtCost * 0.7).toLocaleString()}`} sub="ถ้าใช้ตาราง AI แทนจัดเอง"                               color="success" />
      </div>

      {/* Staff hours */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="text-[14px] font-bold text-foreground mb-4">📊 ชั่วโมงทำงาน — สัปดาห์นี้</div>
        <div className="divide-y divide-border/40">
          {WEEKLY_HOURS.map((w, i) => {
            const pct    = (w.actual / w.maxHr) * 100;
            const isOver = w.actual > w.maxHr;
            const isRisk = pct >= 90 && !isOver;
            return (
              <div key={i} className="flex items-center gap-3 py-3.5">
                <span className="text-[22px] shrink-0">{w.avatar}</span>
                <div className="w-[82px] shrink-0">
                  <div className="text-[13px] font-bold text-foreground">{w.name}</div>
                  <div className="text-[10px] text-muted-foreground">{w.role}</div>
                </div>

                {/* Progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-[10px] mb-1.5">
                    <span className="text-muted-foreground">กำหนด {w.scheduled} ชม.</span>
                    <span className={cn("font-bold tabular-nums", isOver ? "text-danger" : isRisk ? "text-warning" : "text-success")}>
                      {w.actual} / {w.maxHr} ชม.
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden relative">
                    <div className={cn("h-full rounded-full transition-all", isOver ? "bg-danger" : isRisk ? "bg-warning" : "bg-success")}
                      style={{ width: `${Math.min(pct, 100)}%` }} />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-accent/60"
                      style={{ left: `${(w.scheduled / w.maxHr) * 100}%` }} />
                  </div>
                </div>

                {/* OT */}
                <div className="w-[72px] text-right shrink-0">
                  {w.ot > 0 ? (
                    <>
                      <div className="font-mono text-[13px] font-extrabold text-danger tabular-nums">+{w.ot} ชม.</div>
                      <div className="text-[10px] text-danger">OT ฿{w.otCost}</div>
                    </>
                  ) : <POSBadge color="success">✅ ปกติ</POSBadge>}
                </div>

                {/* AI tip */}
                <div className="w-[150px] shrink-0 hidden xl:block">
                  {isOver && (
                    <div className="text-[10px] px-2 py-1.5 rounded-lg bg-danger/8 border border-danger/20 text-danger font-semibold">
                      🤖 ควรสลับกะกับ{STAFF.find(s => s.id !== w.id && s.role === w.role)?.name ?? "พาร์ทไทม์"}
                    </div>
                  )}
                  {isRisk && (
                    <div className="text-[10px] px-2 py-1.5 rounded-lg bg-warning/8 border border-warning/20 text-warning font-semibold">
                      ⚠️ เหลือ {(w.maxHr - w.actual).toFixed(1)} ชม. ระวัง OT
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI recommendations */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="text-[14px] font-bold text-foreground mb-4 flex items-center gap-2">
          🤖 <span className="text-gradient-primary">AI แนะนำลดต้นทุนแรงงาน</span>
        </div>
        <div className="space-y-2">
          {OT_RECS.map((rec, i) => (
            <div key={i} className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border",
              rec.urgency === "high"   ? "bg-danger/5   border-danger/20"   :
              rec.urgency === "medium" ? "bg-warning/5  border-warning/20"  :
                                         "bg-primary/5  border-primary/20"
            )}>
              <span className="text-[20px]">{rec.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-foreground">{rec.title}</div>
                <div className="text-[11px] text-muted-foreground">{rec.impact}</div>
              </div>
              <POSBadge color={rec.urgency === "high" ? "danger" : rec.urgency === "medium" ? "warning" : "primary"}>
                {rec.urgency === "high" ? "ด่วน" : rec.urgency === "medium" ? "แนะนำ" : "ไว้พิจารณา"}
              </POSBadge>
              <button className="px-3 py-1.5 rounded-lg gradient-primary text-white text-[11px] font-bold shadow-primary hover:shadow-primary-lg transition-shadow shrink-0">
                ใช้เลย
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4 p-4 rounded-xl bg-success/5 border border-success/20">
          <span className="text-[30px]">💰</span>
          <div className="flex-1">
            <div className="text-[13px] font-bold text-success">ถ้าทำตาม AI ทั้งหมด</div>
            <div className="text-[12px] text-muted-foreground">ประหยัดค่าแรงได้ ~฿3,030/สัปดาห์ หรือ ~฿12,120/เดือน โดยไม่กระทบคุณภาพ</div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-[26px] font-extrabold text-success tabular-nums">-฿12.1k</div>
            <div className="text-[10px] text-muted-foreground">/เดือน</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// TAB 3 — Staff Performance
// ════════════════════════════════════════════════
const PERF = [
  { ...STAFF[0], ordersHandled: 142, avgTime: "8.2 นาที", rating: 4.7, efficiency: 92, tip: "🏆 เร็วที่สุดในทีม" },
  { ...STAFF[1], ordersHandled: 198, avgTime: "1.5 นาที", rating: 4.9, efficiency: 96, tip: "💯 ไม่เคยคิดเงินผิด" },
  { ...STAFF[2], ordersHandled: 167, avgTime: "2.1 นาที", rating: 4.5, efficiency: 85, tip: "📈 พัฒนาขึ้น 12% จากเดือนก่อน" },
  { ...STAFF[3], ordersHandled: 145, avgTime: "2.4 นาที", rating: 4.3, efficiency: 78, tip: "💡 แนะนำอบรมเพิ่ม: Upselling" },
  { ...STAFF[4], ordersHandled: 138, avgTime: "9.1 นาที", rating: 4.6, efficiency: 88, tip: "⭐ เก่งของหวาน — ควรทำ dessert กะเย็น" },
  { ...STAFF[5], ordersHandled:  68, avgTime: "2.8 นาที", rating: 4.1, efficiency: 72, tip: "🆕 ยังใหม่ — จับคู่กับ ณัฐ เพื่อเรียนรู้" },
];

function StaffPerformanceTab() {
  const sorted = [...PERF].sort((a, b) => b.efficiency - a.efficiency);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        <POSStatCard icon="🏅" label="MVP สัปดาห์นี้"   value="อรทัย"   sub="ประสิทธิภาพ 96%"             color="warning" />
        <POSStatCard icon="📊" label="ออเดอร์ทั้งหมด"  value="858"     sub="รายการ รวมทุกคน"               color="primary" />
        <POSStatCard icon="⭐" label="Rating เฉลี่ย"    value="4.5/5"   sub="ทีมทั้งหมด"                   color="accent"  />
        <POSStatCard icon="🤖" label="AI แนะนำอบรม"    value="2 คน"    sub="พลอย + มิน"                    color="danger"  />
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex justify-between items-center mb-5">
          <div className="text-[14px] font-bold text-foreground">🏅 ผลงานพนักงาน — สัปดาห์นี้</div>
          <POSBadge color="accent" glow>🤖 AI วิเคราะห์</POSBadge>
        </div>

        <div className="divide-y divide-border/40">
          {sorted.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 py-4">
              {/* Rank */}
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[14px] font-extrabold shrink-0",
                i === 0 ? "gradient-primary text-white shadow-primary" :
                i === 1 ? "bg-muted/30 text-foreground border border-border" :
                i === 2 ? "bg-warning/15 text-warning border border-warning/20" :
                          "border border-border text-muted-foreground"
              )}>{i + 1}</div>

              <span className="text-[22px] shrink-0">{p.avatar}</span>

              <div className="w-[88px] shrink-0">
                <div className="text-[13px] font-bold text-foreground">{p.name}</div>
                <POSBadge color={roleColor(p.role)}>{p.role.replace(" (Part-time)","")}</POSBadge>
              </div>

              {/* Stats */}
              <div className="flex gap-4 flex-1">
                {[
                  { label:"ออเดอร์",   value: `${p.ordersHandled}`, unit:"รายการ" },
                  { label:"เวลาเฉลี่ย", value: p.avgTime,           unit:""       },
                  { label:"Rating",    value: `${p.rating}/5`,      unit:"⭐"     },
                ].map((s, si) => (
                  <div key={si} className="text-center">
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                    <div className="font-mono text-[14px] font-extrabold text-foreground tabular-nums">{s.value}</div>
                    <div className="text-[9px] text-muted-foreground">{s.unit}</div>
                  </div>
                ))}
              </div>

              {/* Efficiency bar */}
              <div className="w-[110px] shrink-0">
                <div className="flex justify-between text-[10px] mb-1.5">
                  <span className="text-muted-foreground">ประสิทธิภาพ</span>
                  <span className={cn("font-mono font-bold tabular-nums",
                    p.efficiency > 90 ? "text-success" : p.efficiency > 75 ? "text-warning" : "text-danger")}>
                    {p.efficiency}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all",
                    p.efficiency > 90 ? "bg-success" : p.efficiency > 75 ? "bg-warning" : "bg-danger")}
                    style={{ width: `${p.efficiency}%` }} />
                </div>
              </div>

              {/* AI tip */}
              <div className="w-[190px] shrink-0 hidden lg:block text-[11px] text-muted-foreground px-3 py-2 rounded-lg bg-surface-alt border border-border">
                {p.tip}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════
type StaffTab = "schedule" | "overtime" | "performance";

const TABS: { key: StaffTab; label: string }[] = [
  { key: "schedule",    label: "📅 AI จัดตาราง"  },
  { key: "overtime",    label: "⚠️ OT & ต้นทุน"   },
  { key: "performance", label: "🏅 ผลงานพนักงาน"  },
];

export function StaffScreen() {
  const [tab, setTab] = useState<StaffTab>("schedule");

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide bg-background">
      {/* Sub-header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <div className="text-[15px] font-bold text-foreground flex items-center gap-2">
            🧑‍💼 <span className="text-gradient-primary">AI Staff Management</span>
            <POSBadge color="primary" glow>Staff Intelligence</POSBadge>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            จัดตารางอัตโนมัติ · ควบคุม OT · วิเคราะห์ผลงาน — ลดค่าแรง 15-25%
          </div>
        </div>

        <div className="flex gap-1.5 bg-surface-alt rounded-xl p-1 border border-border">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("px-4 py-2 rounded-lg text-[12px] font-bold transition-all",
                tab === t.key
                  ? "gradient-primary text-white shadow-primary"
                  : "text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {tab === "schedule"    && <AIScheduleTab />}
        {tab === "overtime"    && <OvertimeAlertsTab />}
        {tab === "performance" && <StaffPerformanceTab />}
      </div>
    </div>
  );
}
