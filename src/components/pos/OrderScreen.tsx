import { useState } from "react";
import { menuItems, MenuItem } from "@/data/pos-data";
import { POSBadge } from "./POSBadge";
import { cn } from "@/lib/utils";

export type CartItem = MenuItem & { qty: number };

interface OrderScreenProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onPay?: () => void;
}

const CATS = ["ทั้งหมด", "ยอดนิยม", "อาหารจานเดียว", "เครื่องดื่ม", "ของหวาน"];

type TableStatus = "empty" | "occupied" | "reserved";

interface FloorTable {
  id: string;
  x: number; y: number;
  w: number; h: number;
  seats: number;
  shape: "rect" | "round";
  status: TableStatus;
  order?: string;
  orderAmt?: number;
}

const INIT_TABLES: FloorTable[] = [
  { id: "T1",  x:  5, y: 8,  w: 13, h: 16, seats: 4, shape: "rect",  status: "empty"                              },
  { id: "T2",  x: 22, y: 8,  w: 13, h: 16, seats: 4, shape: "rect",  status: "reserved"                           },
  { id: "T3",  x: 39, y: 8,  w: 13, h: 16, seats: 4, shape: "rect",  status: "occupied", order: "฿317",  orderAmt: 317 },
  { id: "T4",  x: 56, y: 8,  w: 13, h: 16, seats: 4, shape: "rect",  status: "empty"                              },
  { id: "T5",  x: 75, y: 7,  w: 10, h: 10, seats: 2, shape: "round", status: "occupied", order: "฿179",  orderAmt: 179 },
  { id: "T6",  x:  5, y: 42, w: 10, h: 10, seats: 2, shape: "round", status: "empty"                              },
  { id: "T7",  x: 22, y: 38, w: 13, h: 16, seats: 4, shape: "rect",  status: "occupied", order: "฿264",  orderAmt: 264 },
  { id: "T8",  x: 39, y: 38, w: 13, h: 16, seats: 4, shape: "rect",  status: "reserved"                           },
  { id: "T9",  x: 56, y: 38, w: 18, h: 16, seats: 6, shape: "rect",  status: "empty"                              },
  { id: "T10", x: 77, y: 38, w: 10, h: 10, seats: 2, shape: "round", status: "empty"                              },
];

const STATUS_STYLE: Record<TableStatus, { bg: string; border: string; text: string; badge: string }> = {
  empty:    { bg: "bg-success/10",  border: "border-success/40",  text: "text-success",  badge: "bg-success/15  text-success  border-success/30"  },
  occupied: { bg: "bg-warning/10",  border: "border-warning/50",  text: "text-warning",  badge: "bg-warning/15  text-warning  border-warning/30"  },
  reserved: { bg: "bg-primary/8",   border: "border-primary/40",  text: "text-primary",  badge: "bg-primary/12  text-primary  border-primary/30"  },
};

const STATUS_LABEL: Record<TableStatus, string> = {
  empty: "ว่าง", occupied: "มีลูกค้า", reserved: "จอง",
};

// ── Transfer confirmation overlay ───────────────────────────
function TransferConfirm({
  from, to, onConfirm, onCancel,
}: { from: string; to: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-2xl animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-card p-6 text-center max-w-[280px] w-full mx-4">
        <div className="text-[32px] mb-3">🔄</div>
        <div className="text-[15px] font-bold text-foreground mb-1">ยืนยันการย้ายโต๊ะ?</div>
        <div className="text-[13px] text-muted-foreground mb-5">
          ย้ายออเดอร์จาก{" "}
          <span className="font-bold text-warning">โต๊ะ {from}</span>
          {" "}ไปยัง{" "}
          <span className="font-bold text-success">โต๊ะ {to}</span>
        </div>
        <div className="flex gap-2.5">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border bg-muted text-muted-foreground text-[13px] font-medium hover:text-foreground transition-colors">
            ยกเลิก
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl gradient-primary text-white text-[13px] font-bold shadow-primary hover:shadow-primary-lg transition-shadow">
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Merge confirmation overlay ───────────────────────────────
function MergeConfirm({
  primary, others, totalAmt, onConfirm, onCancel,
}: {
  primary: string;
  others: string[];
  totalAmt: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-2xl animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-card p-6 max-w-[320px] w-full mx-4">
        <div className="text-[32px] mb-2 text-center">🔗</div>
        <div className="text-[15px] font-bold text-foreground mb-1 text-center">รวมโต๊ะเป็นบิลเดียว?</div>
        <div className="text-[12px] text-muted-foreground text-center mb-4">
          โต๊ะ{[primary, ...others].join(", ")} จะถูกรวมเป็นบิลเดียวภายใต้{" "}
          <span className="font-bold text-primary">โต๊ะ {primary}</span>
        </div>

        {/* Merged total preview */}
        <div className="bg-surface-alt rounded-xl px-4 py-3 border border-border mb-5 text-center">
          <div className="text-[11px] text-muted-foreground mb-1">ยอดรวมหลังรวมโต๊ะ</div>
          <div className="font-mono text-[28px] font-extrabold text-accent tabular-nums">
            ฿{totalAmt.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {[primary, ...others].length} โต๊ะ · {[primary, ...others].join(" + ")}
          </div>
        </div>

        <div className="flex gap-2.5">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border bg-muted text-muted-foreground text-[13px] font-medium hover:text-foreground transition-colors">
            ยกเลิก
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl gradient-primary text-white text-[13px] font-bold shadow-primary hover:shadow-primary-lg transition-shadow">
            รวมโต๊ะ
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Floor Map ───────────────────────────────────────────────
function FloorMap({
  tables, activeTable, transferMode, mergeMode, pendingTarget, mergeTargets,
  onSelect, onClose,
}: {
  tables: FloorTable[];
  activeTable: string;
  transferMode: boolean;
  mergeMode: boolean;
  pendingTarget: string | null;
  mergeTargets: string[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const counts = {
    empty:    tables.filter((t) => t.status === "empty").length,
    occupied: tables.filter((t) => t.status === "occupied").length,
    reserved: tables.filter((t) => t.status === "reserved").length,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background px-5 py-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          {transferMode ? (
            <>
              <span className="text-[15px] font-bold text-warning">🔄 โหมดย้ายโต๊ะ</span>
              <span className="text-[12px] text-muted-foreground">— เลือกโต๊ะปลายทาง (เฉพาะโต๊ะว่าง)</span>
            </>
          ) : mergeMode ? (
            <>
              <span className="text-[15px] font-bold text-primary">🔗 โหมดรวมโต๊ะ</span>
              <span className="text-[12px] text-muted-foreground">
                — เลือกโต๊ะที่มีลูกค้าเพื่อรวมบิล
                {mergeTargets.length > 0 && (
                  <span className="ml-2 font-bold text-primary">
                    เลือกแล้ว: {mergeTargets.join(", ")}
                  </span>
                )}
              </span>
            </>
          ) : (
            <>
              <span className="text-[15px] font-bold text-foreground">🗺 แผนผังร้าน</span>
              <span className="text-[12px] text-muted-foreground">— กินดี สุขุมวิท</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 text-[12px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-success/30 border border-success/50 inline-block" />
              <span className="text-muted-foreground">ว่าง ({counts.empty})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-warning/30 border border-warning/50 inline-block" />
              <span className="text-muted-foreground">มีลูกค้า ({counts.occupied})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary/20 border border-primary/40 inline-block" />
              <span className="text-muted-foreground">จอง ({counts.reserved})</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground text-[12px] font-medium hover:text-foreground hover:border-border-light transition-colors"
          >
            {transferMode || mergeMode ? "✕ ยกเลิก" : "← กลับเมนู"}
          </button>
        </div>
      </div>

      {/* Floor plan */}
      <div
        className={cn(
          "flex-1 relative rounded-2xl border overflow-hidden transition-colors",
          transferMode ? "border-warning/40 shadow-[0_0_0_3px_hsl(var(--warning)/0.1)]" :
          mergeMode    ? "border-primary/40 shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]" :
          "border-border"
        )}
        style={{ background: "hsl(var(--surface-alt))" }}
      >
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,hsl(var(--foreground)) 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,hsl(var(--foreground)) 0 1px,transparent 1px 40px)" }} />

        {/* Kitchen */}
        <div className="absolute right-0 top-0 bottom-0 w-[13%] bg-muted/60 border-l border-dashed border-border flex flex-col items-center justify-center gap-1">
          <span className="text-[20px]">👨‍🍳</span>
          <span className="text-[10px] font-semibold text-muted-foreground tracking-wide">ครัว</span>
        </div>

        {/* Entrance */}
        <div className="absolute bottom-0 left-[38%] right-[38%] h-[7%] bg-success/8 border border-dashed border-success/30 rounded-t-xl flex items-center justify-center">
          <span className="text-[10px] font-semibold text-success/60 tracking-widest">ENTRANCE</span>
        </div>

        {/* Bar */}
        <div className="absolute top-0 left-0 w-[2%] h-[32%] bg-muted/50 border-r border-dashed border-border" />

        {/* Tables */}
        {tables.map((table) => {
          const isSource     = (transferMode && table.id === activeTable) || (mergeMode && table.id === activeTable);
          const isPending    = pendingTarget === table.id;
          const isMergeTarget = mergeTargets.includes(table.id);
          const style        = STATUS_STYLE[table.status];
          const isActive     = !transferMode && !mergeMode && activeTable === table.id;
          const isRound      = table.shape === "round";

          // Selectability
          const isSelectableTransfer = transferMode && table.status === "empty";
          const isSelectableMerge    = mergeMode && table.status === "occupied" && table.id !== activeTable;
          const isDimmedTransfer     = transferMode && !isSource && !isSelectableTransfer;
          const isDimmedMerge        = mergeMode && !isSource && !isSelectableMerge && !isMergeTarget;
          const isDimmed             = isDimmedTransfer || isDimmedMerge;

          return (
            <button
              key={table.id}
              disabled={isDimmed}
              onClick={() => !isDimmed ? onSelect(table.id) : undefined}
              className={cn(
                "absolute flex flex-col items-center justify-center gap-0.5 border-2 transition-all duration-200",
                isRound ? "rounded-full" : "rounded-xl",
                isDimmed && "opacity-25 cursor-not-allowed",
                // source
                isSource && "border-primary/70 bg-primary/15 scale-105 shadow-[0_0_16px_hsl(var(--primary)/0.3)] z-10",
                // transfer pending target
                isPending && !mergeMode && "border-success/80 bg-success/15 scale-110 shadow-[0_0_20px_hsl(var(--success)/0.35)] z-20",
                // merge selected targets
                isMergeTarget && "border-primary/80 bg-primary/15 scale-105 shadow-[0_0_16px_hsl(var(--primary)/0.35)] z-10",
                // selectable in transfer mode (empty tables)
                !isSource && !isPending && !isDimmed && transferMode && table.status === "empty" &&
                  "border-success/50 bg-success/8 hover:scale-105 hover:shadow-card-hover hover:z-10 cursor-pointer animate-pulse-glow",
                // selectable in merge mode (occupied tables)
                !isSource && !isMergeTarget && !isDimmed && mergeMode && table.status === "occupied" &&
                  "border-primary/50 bg-primary/8 hover:scale-105 hover:shadow-card-hover hover:z-10 cursor-pointer",
                // normal mode
                !transferMode && !mergeMode && !isActive && cn(style.bg, style.border, "hover:scale-105 hover:shadow-card-hover hover:z-10"),
                !transferMode && !mergeMode && isActive  && "ring-2 ring-offset-2 ring-primary ring-offset-surface-alt scale-105 shadow-primary z-10",
              )}
              style={{ left: `${table.x}%`, top: `${table.y}%`, width: `${table.w}%`, height: `${table.h}%` }}
            >
              {isSource && mergeMode && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[14px]">🔗</span>
              )}
              {isSource && transferMode && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[14px] animate-bounce">↕️</span>
              )}
              <span className={cn(
                "text-[11px] font-extrabold tracking-tight",
                isSource         ? "text-primary" :
                isPending        ? "text-success"  :
                isMergeTarget    ? "text-primary"  :
                style.text
              )}>
                {table.id}
              </span>
              <span className="text-[9px] text-muted-foreground/70">{table.seats} ที่นั่ง</span>
              {isMergeTarget && <span className="text-[8px] font-bold text-primary/80 mt-0.5">รวมด้วย</span>}
              {isSource && mergeMode && <span className="text-[8px] font-bold text-primary/80 mt-0.5">หลัก</span>}
              {!isSource && !isMergeTarget && !isPending && table.order && (
                <span className={cn("text-[9px] font-bold px-1 py-px rounded border mt-0.5", style.badge)}>
                  {table.order}
                </span>
              )}
              {!transferMode && !mergeMode && isActive && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full gradient-primary border-2 border-card shadow-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Merge mode — confirm strip */}
      {mergeMode && mergeTargets.length > 0 && (
        <div className="shrink-0 mt-3 px-1">
          <button
            onClick={() => onSelect("__confirm_merge__")}
            className="w-full py-2.5 rounded-xl gradient-primary text-white text-[13px] font-bold shadow-primary hover:shadow-primary-lg transition-shadow"
          >
            🔗 ยืนยันรวม {mergeTargets.length + 1} โต๊ะ ({[activeTable, ...mergeTargets].join(" + ")})
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main OrderScreen ─────────────────────────────────────────
export function OrderScreen({ cart, setCart, onPay }: OrderScreenProps) {
  const [activeCat, setActiveCat]         = useState("ทั้งหมด");
  const [activeTable, setActiveTable]     = useState("T3");
  const [showMap, setShowMap]             = useState(false);
  const [transferMode, setTransferMode]   = useState(false);
  const [mergeMode, setMergeMode]         = useState(false);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const [mergeTargets, setMergeTargets]   = useState<string[]>([]);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [transferDone, setTransferDone]   = useState<string | null>(null);
  const [mergeDone, setMergeDone]         = useState<string[] | null>(null);

  // Merged tables state — track which table IDs are merged into which primary
  const [mergedGroups, setMergedGroups]   = useState<Record<string, string[]>>({});

  const [tables, setTables] = useState<FloorTable[]>(INIT_TABLES);

  const TABLES = tables.map((t) => t.id);
  const activeFloor = tables.find((t) => t.id === activeTable);

  // If current table is part of a merged group, show merged total
  const mergedWith = mergedGroups[activeTable] ?? [];
  const mergedTables = mergedWith.length > 0
    ? [activeTable, ...mergedWith].map(id => tables.find(t => t.id === id)).filter(Boolean) as FloorTable[]
    : [];
  const mergedOrderAmt = mergedTables.reduce((s, t) => s + (t.orderAmt ?? 0), 0);
  const isMergedTable = mergedWith.length > 0;

  const filtered =
    activeCat === "ทั้งหมด"   ? menuItems
    : activeCat === "ยอดนิยม" ? menuItems.filter((m) => m.popular)
    : menuItems.filter((m) => m.cat === activeCat);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.id === item.id);
      if (ex) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id: number) =>
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, qty: c.qty - 1 } : c).filter((c) => c.qty > 0));

  const total    = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const totalQty = cart.reduce((s, c) => s + c.qty, 0);

  // Total for merged bill (current cart + merged table orders)
  const mergedBillTotal = isMergedTable ? total + mergedOrderAmt : total;

  // ── Transfer handlers ──
  const handleStartTransfer = () => {
    setShowMap(true);
    setTransferMode(true);
    setMergeMode(false);
    setPendingTarget(null);
    setMergeTargets([]);
  };

  // ── Merge handlers ──
  const handleStartMerge = () => {
    setShowMap(true);
    setMergeMode(true);
    setTransferMode(false);
    setMergeTargets([]);
    setPendingTarget(null);
  };

  const handleMapSelect = (id: string) => {
    if (id === "__confirm_merge__") {
      setShowMergeConfirm(true);
      return;
    }
    if (!transferMode && !mergeMode) {
      setActiveTable(id);
      setShowMap(false);
    } else if (transferMode) {
      if (id === activeTable) return;
      setPendingTarget(id);
    } else if (mergeMode) {
      if (id === activeTable) return;
      // Toggle selection
      setMergeTargets((prev) =>
        prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
      );
    }
  };

  const handleTransferConfirm = () => {
    if (!pendingTarget) return;
    const from = activeTable;
    const to   = pendingTarget;
    setTables((prev) => prev.map((t) => {
      if (t.id === from) return { ...t, status: "empty", order: undefined, orderAmt: undefined };
      if (t.id === to)   return { ...t, status: "occupied", order: `฿${total.toLocaleString()}`, orderAmt: total };
      return t;
    }));
    setActiveTable(to);
    setPendingTarget(null);
    setTransferMode(false);
    setShowMap(false);
    setTransferDone(to);
    setTimeout(() => setTransferDone(null), 3000);
  };

  const handleMergeConfirm = () => {
    const primary = activeTable;
    const others  = mergeTargets;

    // Compute merged total from all occupied tables' existing orderAmt + current cart
    const otherAmt = others.reduce((s, id) => {
      const t = tables.find(t => t.id === id);
      return s + (t?.orderAmt ?? 0);
    }, 0);
    const newTotal = total + otherAmt;

    // Update table states — merge others under primary, mark others as "empty"
    setTables((prev) => prev.map((t) => {
      if (t.id === primary) return { ...t, status: "occupied", order: `฿${newTotal.toLocaleString()}`, orderAmt: newTotal };
      if (others.includes(t.id)) return { ...t, status: "empty", order: undefined, orderAmt: undefined };
      return t;
    }));

    // Record merge group
    setMergedGroups((prev) => ({ ...prev, [primary]: others }));

    setShowMergeConfirm(false);
    setMergeMode(false);
    setShowMap(false);
    setMergeTargets([]);
    setMergeDone([primary, ...others]);
    setTimeout(() => setMergeDone(null), 3500);
  };

  const handleCancelMergeConfirm = () => setShowMergeConfirm(false);

  const handleUnmerge = () => {
    const primary = activeTable;
    const others  = mergedGroups[primary] ?? [];
    // Restore others as occupied with their original amounts (simplified: split evenly)
    const splitAmt = Math.round((mergedBillTotal - total) / Math.max(others.length, 1));
    setTables((prev) => prev.map((t) => {
      if (t.id === primary) return { ...t, order: `฿${total.toLocaleString()}`, orderAmt: total };
      if (others.includes(t.id)) return { ...t, status: "occupied", order: `฿${splitAmt}`, orderAmt: splitAmt };
      return t;
    }));
    setMergedGroups((prev) => {
      const next = { ...prev };
      delete next[primary];
      return next;
    });
  };

  const handleCancelMode = () => {
    setPendingTarget(null);
    setMergeTargets([]);
    setTransferMode(false);
    setMergeMode(false);
    setShowMap(false);
  };

  // Compute merge confirm totals
  const mergeConfirmTotal = mergeTargets.reduce((s, id) => {
    const t = tables.find(t => t.id === id);
    return s + (t?.orderAmt ?? 0);
  }, 0) + total;

  return (
    <div className="flex flex-1 overflow-hidden relative">

      {/* ── Toast: Transfer done ── */}
      {transferDone && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-card border border-success/30 rounded-xl shadow-card px-4 py-2.5 flex items-center gap-2.5 text-[13px]">
            <span className="text-[18px]">✅</span>
            <span className="font-semibold text-foreground">
              ย้ายไปยัง <span className="text-success">โต๊ะ {transferDone}</span> สำเร็จ
            </span>
          </div>
        </div>
      )}

      {/* ── Toast: Merge done ── */}
      {mergeDone && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-card border border-primary/30 rounded-xl shadow-card px-4 py-2.5 flex items-center gap-2.5 text-[13px]">
            <span className="text-[18px]">🔗</span>
            <span className="font-semibold text-foreground">
              รวมโต๊ะ <span className="text-primary font-bold">{mergeDone.join(" + ")}</span> สำเร็จ!
            </span>
          </div>
        </div>
      )}

      {/* ── Left: Menu or Map ── */}
      {showMap ? (
        <div className="flex-1 relative">
          <FloorMap
            tables={tables}
            activeTable={activeTable}
            transferMode={transferMode}
            mergeMode={mergeMode}
            pendingTarget={pendingTarget}
            mergeTargets={mergeTargets}
            onSelect={handleMapSelect}
            onClose={handleCancelMode}
          />
          {/* Transfer confirm overlay */}
          {pendingTarget && !mergeMode && (
            <TransferConfirm
              from={activeTable}
              to={pendingTarget}
              onConfirm={handleTransferConfirm}
              onCancel={() => setPendingTarget(null)}
            />
          )}
          {/* Merge confirm overlay */}
          {showMergeConfirm && (
            <MergeConfirm
              primary={activeTable}
              others={mergeTargets}
              totalAmt={mergeConfirmTotal}
              onConfirm={handleMergeConfirm}
              onCancel={handleCancelMergeConfirm}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col px-5 py-4 overflow-hidden bg-background">

          {/* Table selector */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setShowMap(true)}
              className="flex items-center gap-2 gradient-primary px-3.5 py-2 rounded-xl text-[13px] font-bold text-white shadow-primary hover:shadow-primary-lg transition-shadow shrink-0"
            >
              <span>โต๊ะ {activeTable}</span>
              {activeFloor && (
                <span className={cn(
                  "text-[9px] font-semibold px-1.5 py-px rounded border leading-tight",
                  activeFloor.status === "empty"    && "bg-white/20 border-white/30",
                  activeFloor.status === "occupied" && "bg-warning/30 border-warning/50",
                  activeFloor.status === "reserved" && "bg-primary/30 border-primary/50",
                )}>
                  {STATUS_LABEL[activeFloor.status ?? "empty"]}
                </span>
              )}
              {isMergedTable && (
                <span className="text-[9px] font-bold bg-primary/30 border border-primary/50 px-1.5 py-px rounded">
                  🔗 รวมโต๊ะ
                </span>
              )}
              <span className="text-white/70 text-[11px]">🗺</span>
            </button>

            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {TABLES.map((t) => {
                const tf = tables.find((f) => f.id === t)!;
                const isMergedInto = Object.keys(mergedGroups).some(
                  key => mergedGroups[key].includes(t)
                );
                return (
                  <button
                    key={t}
                    onClick={() => setActiveTable(t)}
                    className={cn(
                      "w-10 h-9 rounded-xl text-[12px] font-semibold border transition-all duration-150 shrink-0 relative",
                      t === activeTable
                        ? "border-primary/40 bg-primary/8 text-primary shadow-[0_2px_8px_hsl(var(--primary)/0.15)]"
                        : "border-border bg-card text-muted-foreground hover:border-border-light hover:text-foreground shadow-card",
                      isMergedInto && "opacity-40"
                    )}
                  >
                    {t}
                    <span className={cn(
                      "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                      tf.status === "empty"    && "bg-success",
                      tf.status === "occupied" && "bg-warning",
                      tf.status === "reserved" && "bg-primary",
                    )} />
                    {mergedGroups[t] && (
                      <span className="absolute -top-1 -right-1 text-[8px]">🔗</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-[12px] font-semibold border transition-all duration-150",
                  activeCat === c
                    ? "border-primary/40 bg-primary/8 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-light shadow-card"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          <div
            className="grid gap-2 overflow-y-auto flex-1 scrollbar-hide pb-2 content-start"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}
          >
            {filtered.map((item) => {
              const inCart = cart.find((c) => c.id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={cn(
                    "relative bg-card border rounded-xl px-3 py-3 flex flex-col items-center gap-1.5 transition-all duration-150 h-[110px] justify-center",
                    inCart
                      ? "border-primary/40 shadow-primary bg-primary/[0.03]"
                      : "border-border hover:border-border-light hover:shadow-card-hover shadow-card"
                  )}
                >
                  {inCart && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full gradient-primary text-white text-[10px] font-extrabold flex items-center justify-center shadow-primary z-10">
                      {inCart.qty}
                    </span>
                  )}
                  {item.popular && (
                    <span className="absolute top-1.5 left-1.5">
                      <POSBadge color="warning" className="text-[9px] py-px px-1.5">HOT</POSBadge>
                    </span>
                  )}
                  <span className="text-[28px] leading-none">{item.img}</span>
                  <span className="text-[12px] font-semibold text-center leading-tight text-foreground">{item.name}</span>
                  <span className="font-mono text-[13px] font-bold text-accent">฿{item.price}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Right: Cart ── */}
      <div className="w-[280px] bg-surface border-l border-border flex flex-col p-4 shadow-[-4px_0_20px_-4px_rgba(0,0,0,0.05)] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[14px] font-bold text-foreground">🧾 ออเดอร์ปัจจุบัน</span>
          <div className="flex items-center gap-2">
            <POSBadge color="accent">{cart.length} รายการ</POSBadge>
          </div>
        </div>

        {/* Merged tables banner */}
        {isMergedTable && (
          <div className="mb-3 px-3 py-2.5 rounded-xl bg-primary/8 border border-primary/25 animate-fade-in">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[12px] font-bold text-primary flex items-center gap-1.5">
                🔗 รวมโต๊ะ: {activeTable} + {mergedWith.join(", ")}
              </div>
              <button onClick={handleUnmerge}
                className="text-[10px] text-muted-foreground hover:text-danger transition-colors">
                ✕ ยกเลิกรวม
              </button>
            </div>
            {mergedTables.map((t) => (
              <div key={t.id} className="flex justify-between text-[11px] text-muted-foreground">
                <span>โต๊ะ {t.id} ({STATUS_LABEL[t.status]})</span>
                <span className="font-mono tabular-nums">฿{(t.orderAmt ?? 0).toLocaleString()}</span>
              </div>
            ))}
            <div className="mt-1.5 pt-1.5 border-t border-primary/20 flex justify-between text-[12px] font-bold">
              <span className="text-primary">ยอดรวมทุกโต๊ะ</span>
              <span className="font-mono text-primary tabular-nums">฿{mergedBillTotal.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-[13px]">
              <div className="text-3xl mb-2 opacity-40">🛒</div>
              แตะเมนูเพื่อเพิ่มออเดอร์
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 py-2.5 border-b border-border/60 animate-fade-in">
                <span className="text-xl">{item.img}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold truncate text-foreground">{item.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">฿{item.price} × {item.qty}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => removeFromCart(item.id)}
                    className="w-6 h-6 rounded-lg border border-border bg-muted text-muted-foreground flex items-center justify-center text-xs hover:border-border-light hover:text-foreground transition-colors">−</button>
                  <span className="font-mono font-bold text-[12px] w-4 text-center tabular-nums text-foreground">{item.qty}</span>
                  <button onClick={() => addToCart(item)}
                    className="w-6 h-6 rounded-lg gradient-primary text-white flex items-center justify-center text-xs shadow-primary">+</button>
                </div>
                <div className="font-mono font-bold text-[12px] text-accent min-w-[44px] text-right tabular-nums">
                  ฿{item.price * item.qty}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border space-y-2.5 mt-1">
          <div className="flex justify-between text-[12px] text-muted-foreground">
            <span>รวม {totalQty} ชิ้น</span>
            <span>ก่อน VAT</span>
          </div>

          {/* Current table subtotal */}
          <div className="flex justify-between items-baseline">
            <span className="text-[13px] text-muted-foreground">{isMergedTable ? "โต๊ะ " + activeTable : "ยอดรวม"}</span>
            <span className="font-mono text-[16px] font-bold text-foreground tabular-nums">฿{total.toLocaleString()}</span>
          </div>

          {/* Merged grand total */}
          {isMergedTable && (
            <div className="flex justify-between items-baseline pt-1.5 border-t border-primary/20">
              <span className="text-[15px] font-bold text-primary">ยอดรวมทั้งหมด 🔗</span>
              <span className="font-mono text-[22px] font-extrabold text-primary tabular-nums">฿{mergedBillTotal.toLocaleString()}</span>
            </div>
          )}

          {!isMergedTable && (
            <div className="flex justify-between items-baseline">
              <span className="text-[15px] font-bold text-foreground">ยอดรวม</span>
              <span className="font-mono text-[22px] font-extrabold text-accent tabular-nums">฿{total.toLocaleString()}</span>
            </div>
          )}

          <button onClick={onPay}
            className="w-full py-3 rounded-xl gradient-primary text-white font-bold text-[14px] shadow-primary hover:shadow-primary-lg transition-shadow">
            💳 ชำระเงิน {isMergedTable ? `฿${mergedBillTotal.toLocaleString()}` : ""}
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleStartTransfer}
              disabled={cart.length === 0}
              className={cn(
                "flex-1 py-2 rounded-xl border text-[12px] font-semibold transition-all",
                cart.length > 0
                  ? "border-warning/40 bg-warning/8 text-warning hover:bg-warning/15"
                  : "border-border bg-muted text-muted-foreground/40 cursor-not-allowed"
              )}
            >
              🔄 ย้ายโต๊ะ
            </button>
            <button
              onClick={handleStartMerge}
              disabled={activeFloor?.status !== "occupied"}
              className={cn(
                "flex-1 py-2 rounded-xl border text-[12px] font-semibold transition-all",
                activeFloor?.status === "occupied"
                  ? "border-primary/40 bg-primary/8 text-primary hover:bg-primary/15"
                  : "border-border bg-muted text-muted-foreground/40 cursor-not-allowed"
              )}
            >
              🔗 รวมโต๊ะ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


export type CartItem = MenuItem & { qty: number };

interface OrderScreenProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onPay?: () => void;
}

const CATS = ["ทั้งหมด", "ยอดนิยม", "อาหารจานเดียว", "เครื่องดื่ม", "ของหวาน"];

type TableStatus = "empty" | "occupied" | "reserved";

interface FloorTable {
  id: string;
  x: number; y: number;
  w: number; h: number;
  seats: number;
  shape: "rect" | "round";
  status: TableStatus;
  order?: string;
}

const INIT_TABLES: FloorTable[] = [
  { id: "T1", x:  5, y: 8,  w: 13, h: 16, seats: 4, shape: "rect",  status: "empty"    },
  { id: "T2", x: 22, y: 8,  w: 13, h: 16, seats: 4, shape: "rect",  status: "reserved" },
  { id: "T3", x: 39, y: 8,  w: 13, h: 16, seats: 4, shape: "rect",  status: "occupied", order: "฿317" },
  { id: "T4", x: 56, y: 8,  w: 13, h: 16, seats: 4, shape: "rect",  status: "empty"    },
  { id: "T5", x: 75, y: 7,  w: 10, h: 10, seats: 2, shape: "round", status: "occupied", order: "฿179" },
  { id: "T6", x:  5, y: 42, w: 10, h: 10, seats: 2, shape: "round", status: "empty"    },
  { id: "T7", x: 22, y: 38, w: 13, h: 16, seats: 4, shape: "rect",  status: "occupied", order: "฿264" },
  { id: "T8", x: 39, y: 38, w: 13, h: 16, seats: 4, shape: "rect",  status: "reserved" },
  { id: "T9", x: 56, y: 38, w: 18, h: 16, seats: 6, shape: "rect",  status: "empty"    },
  { id: "T10",x: 77, y: 38, w: 10, h: 10, seats: 2, shape: "round", status: "empty"    },
];

const STATUS_STYLE: Record<TableStatus, { bg: string; border: string; text: string; badge: string }> = {
  empty:    { bg: "bg-success/10",  border: "border-success/40",  text: "text-success",  badge: "bg-success/15  text-success  border-success/30"  },
  occupied: { bg: "bg-warning/10",  border: "border-warning/50",  text: "text-warning",  badge: "bg-warning/15  text-warning  border-warning/30"  },
  reserved: { bg: "bg-primary/8",   border: "border-primary/40",  text: "text-primary",  badge: "bg-primary/12  text-primary  border-primary/30"  },
};

const STATUS_LABEL: Record<TableStatus, string> = {
  empty: "ว่าง", occupied: "มีลูกค้า", reserved: "จอง",
};

// ── Transfer confirmation overlay ───────────────────────────
function TransferConfirm({
  from, to, onConfirm, onCancel,
}: { from: string; to: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-2xl animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-card p-6 text-center max-w-[280px] w-full mx-4">
        <div className="text-[32px] mb-3">🔄</div>
        <div className="text-[15px] font-bold text-foreground mb-1">ยืนยันการย้ายโต๊ะ?</div>
        <div className="text-[13px] text-muted-foreground mb-5">
          ย้ายออเดอร์จาก{" "}
          <span className="font-bold text-warning">โต๊ะ {from}</span>
          {" "}ไปยัง{" "}
          <span className="font-bold text-success">โต๊ะ {to}</span>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border bg-muted text-muted-foreground text-[13px] font-medium hover:text-foreground transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl gradient-primary text-white text-[13px] font-bold shadow-primary hover:shadow-primary-lg transition-shadow"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Floor Map ───────────────────────────────────────────────
function FloorMap({
  tables,
  activeTable,
  transferMode,
  pendingTarget,
  onSelect,
  onClose,
}: {
  tables: FloorTable[];
  activeTable: string;
  transferMode: boolean;
  pendingTarget: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const counts = {
    empty:    tables.filter((t) => t.status === "empty").length,
    occupied: tables.filter((t) => t.status === "occupied").length,
    reserved: tables.filter((t) => t.status === "reserved").length,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background px-5 py-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          {transferMode ? (
            <>
              <span className="text-[15px] font-bold text-warning">🔄 โหมดย้ายโต๊ะ</span>
              <span className="text-[12px] text-muted-foreground">— เลือกโต๊ะปลายทาง (เฉพาะโต๊ะว่าง)</span>
            </>
          ) : (
            <>
              <span className="text-[15px] font-bold text-foreground">🗺 แผนผังร้าน</span>
              <span className="text-[12px] text-muted-foreground">— กินดี สุขุมวิท</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 text-[12px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-success/30 border border-success/50 inline-block" />
              <span className="text-muted-foreground">ว่าง ({counts.empty})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-warning/30 border border-warning/50 inline-block" />
              <span className="text-muted-foreground">มีลูกค้า ({counts.occupied})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary/20 border border-primary/40 inline-block" />
              <span className="text-muted-foreground">จอง ({counts.reserved})</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground text-[12px] font-medium hover:text-foreground hover:border-border-light transition-colors"
          >
            {transferMode ? "✕ ยกเลิก" : "← กลับเมนู"}
          </button>
        </div>
      </div>

      {/* Floor plan */}
      <div
        className={cn(
          "flex-1 relative rounded-2xl border overflow-hidden transition-colors",
          transferMode ? "border-warning/40 shadow-[0_0_0_3px_hsl(var(--warning)/0.1)]" : "border-border"
        )}
        style={{ background: "hsl(var(--surface-alt))" }}
      >
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg,hsl(var(--foreground)) 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,hsl(var(--foreground)) 0 1px,transparent 1px 40px)" }} />

        {/* Kitchen */}
        <div className="absolute right-0 top-0 bottom-0 w-[13%] bg-muted/60 border-l border-dashed border-border flex flex-col items-center justify-center gap-1">
          <span className="text-[20px]">👨‍🍳</span>
          <span className="text-[10px] font-semibold text-muted-foreground tracking-wide">ครัว</span>
        </div>

        {/* Entrance */}
        <div className="absolute bottom-0 left-[38%] right-[38%] h-[7%] bg-success/8 border border-dashed border-success/30 rounded-t-xl flex items-center justify-center">
          <span className="text-[10px] font-semibold text-success/60 tracking-widest">ENTRANCE</span>
        </div>

        {/* Bar */}
        <div className="absolute top-0 left-0 w-[2%] h-[32%] bg-muted/50 border-r border-dashed border-border" />

        {/* Tables */}
        {tables.map((table) => {
          const isSource  = transferMode && table.id === activeTable;
          const isTarget  = pendingTarget === table.id;
          const isSelectable = !transferMode || table.status === "empty";
          const isDimmed  = transferMode && !isSource && !isSelectable;
          const style     = STATUS_STYLE[table.status];
          const isActive  = !transferMode && activeTable === table.id;
          const isRound   = table.shape === "round";

          return (
            <button
              key={table.id}
              disabled={isDimmed}
              onClick={() => isSelectable || isSource ? onSelect(table.id) : undefined}
              className={cn(
                "absolute flex flex-col items-center justify-center gap-0.5 border-2 transition-all duration-200",
                isRound ? "rounded-full" : "rounded-xl",
                // dimmed non-selectable
                isDimmed && "opacity-30 cursor-not-allowed",
                // source table in transfer mode
                isSource && "border-warning/70 bg-warning/15 scale-105 shadow-[0_0_16px_hsl(var(--warning)/0.3)] z-10",
                // pending target
                isTarget && "border-success/80 bg-success/15 scale-110 shadow-[0_0_20px_hsl(var(--success)/0.35)] z-20",
                // normal empty selectable in transfer mode
                !isSource && !isTarget && !isDimmed && transferMode && table.status === "empty" &&
                  "border-success/50 bg-success/8 hover:scale-105 hover:shadow-card-hover hover:z-10 cursor-pointer animate-pulse-glow",
                // normal mode
                !transferMode && !isActive && cn(style.bg, style.border, "hover:scale-105 hover:shadow-card-hover hover:z-10"),
                !transferMode && isActive  && "ring-2 ring-offset-2 ring-primary ring-offset-surface-alt scale-105 shadow-primary z-10",
                !transferMode && !isActive && cn(style.bg, style.border),
              )}
              style={{ left: `${table.x}%`, top: `${table.y}%`, width: `${table.w}%`, height: `${table.h}%` }}
            >
              {/* Source arrow */}
              {isSource && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[14px] animate-bounce">↕️</span>
              )}
              <span className={cn(
                "text-[11px] font-extrabold tracking-tight",
                isSource  ? "text-warning"  :
                isTarget  ? "text-success"  :
                transferMode && table.status === "empty" ? "text-success" :
                style.text
              )}>
                {table.id}
              </span>
              <span className="text-[9px] text-muted-foreground/70">{table.seats} ที่นั่ง</span>
              {isSource && (
                <span className="text-[8px] font-bold text-warning/80 mt-0.5">ต้นทาง</span>
              )}
              {isTarget && (
                <span className="text-[8px] font-bold text-success/80 mt-0.5">ปลายทาง</span>
              )}
              {!isSource && !isTarget && table.order && (
                <span className={cn("text-[9px] font-bold px-1 py-px rounded border mt-0.5", style.badge)}>
                  {table.order}
                </span>
              )}
              {!transferMode && isActive && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full gradient-primary border-2 border-card shadow-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main OrderScreen ─────────────────────────────────────────
export function OrderScreen({ cart, setCart, onPay }: OrderScreenProps) {
  const [activeCat, setActiveCat]     = useState("ทั้งหมด");
  const [activeTable, setActiveTable] = useState("T3");
  const [showMap, setShowMap]         = useState(false);
  const [transferMode, setTransferMode] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const [transferDone, setTransferDone] = useState<string | null>(null);

  // Dynamic table statuses
  const [tables, setTables] = useState<FloorTable[]>(INIT_TABLES);

  const TABLES = tables.map((t) => t.id);
  const activeFloor = tables.find((t) => t.id === activeTable);

  const filtered =
    activeCat === "ทั้งหมด"   ? menuItems
    : activeCat === "ยอดนิยม" ? menuItems.filter((m) => m.popular)
    : menuItems.filter((m) => m.cat === activeCat);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.id === item.id);
      if (ex) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id: number) =>
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, qty: c.qty - 1 } : c).filter((c) => c.qty > 0));

  const total    = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const totalQty = cart.reduce((s, c) => s + c.qty, 0);

  // ── Transfer handlers ──
  const handleStartTransfer = () => {
    setShowMap(true);
    setTransferMode(true);
    setPendingTarget(null);
  };

  const handleMapSelect = (id: string) => {
    if (!transferMode) {
      setActiveTable(id);
      setShowMap(false);
    } else {
      if (id === activeTable) return; // can't transfer to same table
      setPendingTarget(id);
    }
  };

  const handleTransferConfirm = () => {
    if (!pendingTarget) return;
    const from = activeTable;
    const to   = pendingTarget;

    setTables((prev) => prev.map((t) => {
      if (t.id === from) return { ...t, status: "empty", order: undefined };
      if (t.id === to)   return { ...t, status: "occupied", order: `฿${total.toLocaleString()}` };
      return t;
    }));

    setActiveTable(to);
    setPendingTarget(null);
    setTransferMode(false);
    setShowMap(false);
    setTransferDone(to);
    setTimeout(() => setTransferDone(null), 3000);
  };

  const handleTransferCancel = () => {
    setPendingTarget(null);
    setTransferMode(false);
    setShowMap(false);
  };

  return (
    <div className="flex flex-1 overflow-hidden relative">

      {/* ── Transfer done toast ── */}
      {transferDone && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-card border border-success/30 rounded-xl shadow-card px-4 py-2.5 flex items-center gap-2.5 text-[13px]">
            <span className="text-[18px]">✅</span>
            <span className="font-semibold text-foreground">
              ย้ายไปยัง <span className="text-success">โต๊ะ {transferDone}</span> สำเร็จ
            </span>
          </div>
        </div>
      )}

      {/* ── Left: Menu or Map ── */}
      {showMap ? (
        <div className="flex-1 relative">
          <FloorMap
            tables={tables}
            activeTable={activeTable}
            transferMode={transferMode}
            pendingTarget={pendingTarget}
            onSelect={handleMapSelect}
            onClose={handleTransferCancel}
          />
          {/* Confirmation overlay */}
          {pendingTarget && (
            <TransferConfirm
              from={activeTable}
              to={pendingTarget}
              onConfirm={handleTransferConfirm}
              onCancel={() => setPendingTarget(null)}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col px-5 py-4 overflow-hidden bg-background">

          {/* Table selector */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setShowMap(true)}
              className="flex items-center gap-2 gradient-primary px-3.5 py-2 rounded-xl text-[13px] font-bold text-white shadow-primary hover:shadow-primary-lg transition-shadow shrink-0"
            >
              <span>โต๊ะ {activeTable}</span>
              {activeFloor && (
                <span className={cn(
                  "text-[9px] font-semibold px-1.5 py-px rounded border leading-tight",
                  activeFloor.status === "empty"    && "bg-white/20 border-white/30",
                  activeFloor.status === "occupied" && "bg-warning/30 border-warning/50",
                  activeFloor.status === "reserved" && "bg-primary/30 border-primary/50",
                )}>
                  {STATUS_LABEL[activeFloor.status ?? "empty"]}
                </span>
              )}
              <span className="text-white/70 text-[11px]">🗺</span>
            </button>

            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {TABLES.map((t) => {
                const tf = tables.find((f) => f.id === t)!;
                return (
                  <button
                    key={t}
                    onClick={() => setActiveTable(t)}
                    className={cn(
                      "w-10 h-9 rounded-xl text-[12px] font-semibold border transition-all duration-150 shrink-0 relative",
                      t === activeTable
                        ? "border-primary/40 bg-primary/8 text-primary shadow-[0_2px_8px_hsl(var(--primary)/0.15)]"
                        : "border-border bg-card text-muted-foreground hover:border-border-light hover:text-foreground shadow-card"
                    )}
                  >
                    {t}
                    <span className={cn(
                      "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                      tf.status === "empty"    && "bg-success",
                      tf.status === "occupied" && "bg-warning",
                      tf.status === "reserved" && "bg-primary",
                    )} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-[12px] font-semibold border transition-all duration-150",
                  activeCat === c
                    ? "border-primary/40 bg-primary/8 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border-light shadow-card"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          <div
            className="grid gap-2 overflow-y-auto flex-1 scrollbar-hide pb-2 content-start"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}
          >
            {filtered.map((item) => {
              const inCart = cart.find((c) => c.id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={cn(
                    "relative bg-card border rounded-xl px-3 py-3 flex flex-col items-center gap-1.5 transition-all duration-150 h-[110px] justify-center",
                    inCart
                      ? "border-primary/40 shadow-primary bg-primary/[0.03]"
                      : "border-border hover:border-border-light hover:shadow-card-hover shadow-card"
                  )}
                >
                  {inCart && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full gradient-primary text-white text-[10px] font-extrabold flex items-center justify-center shadow-primary z-10">
                      {inCart.qty}
                    </span>
                  )}
                  {item.popular && (
                    <span className="absolute top-1.5 left-1.5">
                      <POSBadge color="warning" className="text-[9px] py-px px-1.5">HOT</POSBadge>
                    </span>
                  )}
                  <span className="text-[28px] leading-none">{item.img}</span>
                  <span className="text-[12px] font-semibold text-center leading-tight text-foreground">{item.name}</span>
                  <span className="font-mono text-[13px] font-bold text-accent">฿{item.price}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Right: Cart ── */}
      <div className="w-[280px] bg-surface border-l border-border flex flex-col p-4 shadow-[-4px_0_20px_-4px_rgba(0,0,0,0.05)] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[14px] font-bold text-foreground">🧾 ออเดอร์ปัจจุบัน</span>
          <div className="flex items-center gap-2">
            <POSBadge color="accent">{cart.length} รายการ</POSBadge>
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-[13px]">
              <div className="text-3xl mb-2 opacity-40">🛒</div>
              แตะเมนูเพื่อเพิ่มออเดอร์
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 py-2.5 border-b border-border/60 animate-fade-in">
                <span className="text-xl">{item.img}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold truncate text-foreground">{item.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">฿{item.price} × {item.qty}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => removeFromCart(item.id)}
                    className="w-6 h-6 rounded-lg border border-border bg-muted text-muted-foreground flex items-center justify-center text-xs hover:border-border-light hover:text-foreground transition-colors">−</button>
                  <span className="font-mono font-bold text-[12px] w-4 text-center tabular-nums text-foreground">{item.qty}</span>
                  <button onClick={() => addToCart(item)}
                    className="w-6 h-6 rounded-lg gradient-primary text-white flex items-center justify-center text-xs shadow-primary">+</button>
                </div>
                <div className="font-mono font-bold text-[12px] text-accent min-w-[44px] text-right tabular-nums">
                  ฿{item.price * item.qty}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border space-y-2.5 mt-1">
          <div className="flex justify-between text-[12px] text-muted-foreground">
            <span>รวม {totalQty} ชิ้น</span>
            <span>ก่อน VAT</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[15px] font-bold text-foreground">ยอดรวม</span>
            <span className="font-mono text-[22px] font-extrabold text-accent tabular-nums">฿{total.toLocaleString()}</span>
          </div>
          <button onClick={onPay}
            className="w-full py-3 rounded-xl gradient-primary text-white font-bold text-[14px] shadow-primary hover:shadow-primary-lg transition-shadow">
            💳 ชำระเงิน
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleStartTransfer}
              disabled={cart.length === 0}
              className={cn(
                "flex-1 py-2 rounded-xl border text-[12px] font-semibold transition-all",
                cart.length > 0
                  ? "border-warning/40 bg-warning/8 text-warning hover:bg-warning/15"
                  : "border-border bg-muted text-muted-foreground/40 cursor-not-allowed"
              )}
            >
              🔄 ย้ายโต๊ะ
            </button>
            <button className="flex-1 py-2 rounded-xl border border-border bg-muted text-muted-foreground text-[12px] font-medium hover:border-border-light hover:text-foreground transition-colors">
              📤 พักบิล
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
