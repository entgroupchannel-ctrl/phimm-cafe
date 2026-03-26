import { useState, useEffect } from "react";
import { Users, Clock, QrCode, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type TableStatus = "available" | "occupied" | "waiting_bill";

interface TableData {
  id: string;
  label: string;
  status: TableStatus;
  seats: number;
  guests?: number;
  items?: number;
  total?: number;
  elapsed?: string;
  dbId: string;
}

const STATUS_CONFIG: Record<TableStatus, {
  border: string; bg: string; labelColor: string; dot: string; label: string; labelEn: string;
}> = {
  occupied:     { border: "border-[hsl(211_100%_50%)]",   bg: "bg-background",     labelColor: "text-[hsl(211_100%_50%)]",   dot: "bg-[hsl(211_100%_50%)]",   label: "มีลูกค้า",    labelEn: "Occupied"      },
  waiting_bill: { border: "border-[hsl(38_92%_50%)]",     bg: "bg-background",     labelColor: "text-[hsl(38_92%_50%)]",     dot: "bg-[hsl(38_92%_50%)]",     label: "รอเช็คบิล",  labelEn: "Waiting Bill"  },
  available:    { border: "border-border",                 bg: "bg-[hsl(var(--muted)/0.4)]", labelColor: "text-[hsl(var(--success))]", dot: "bg-[hsl(var(--success))]", label: "ว่าง",        labelEn: "Available"     },
};

interface Props {
  onSelectTable: (tableId: string, tableLabel: string) => void;
}

function mapStatus(dbStatus: string | null, order: any): TableStatus {
  if (!order) return 'available';
  if (order.status === 'paid' || order.status === 'cancelled') return 'available';
  if (order.status === 'served' || order.status === 'ready') return 'waiting_bill';
  return 'occupied';
}

function getElapsed(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  if (hrs > 0) return `${hrs}ชม. ${m}น.`;
  return `${m}น.`;
}

export function TableMapScreen({ onSelectTable }: Props) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTables() {
    const { data, error } = await supabase
      .from('tables')
      .select(`
        id, label, zone, seats, status, current_order_id, sort_order,
        orders:current_order_id (
          id, guest_count, total, created_at, status,
          order_items (id)
        )
      `)
      .eq('is_active', true)
      .order('sort_order');

    if (!error && data) {
      setTables(data.map((t: any) => {
        const order = Array.isArray(t.orders) ? t.orders[0] : t.orders;
        return {
          id: t.id,
          label: t.label,
          status: mapStatus(t.status, order),
          seats: t.seats ?? 4,
          guests: order?.guest_count,
          items: order?.order_items?.length,
          total: order?.total ? Number(order.total) : undefined,
          elapsed: order?.created_at ? getElapsed(order.created_at) : undefined,
          dbId: t.id,
        };
      }));
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchTables();

    // Realtime subscription
    const channel = supabase
      .channel('tables-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        () => fetchTables()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchTables()
      )
      .subscribe();

    // Auto-refresh elapsed time
    const interval = setInterval(() => fetchTables(), 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const occupied     = tables.filter(t => t.status === "occupied").length;
  const waitingBill  = tables.filter(t => t.status === "waiting_bill").length;
  const available    = tables.filter(t => t.status === "available").length;
  const totalRevenue = tables.reduce((s, t) => s + (t.total ?? 0), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-[hsl(var(--surface))]">
        <div>
          <h1 className="text-[15px] font-bold text-foreground">แผนผังโต๊ะ</h1>
          <p className="text-[11px] text-muted-foreground">Table Map</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold">
            <span className="flex items-center gap-1.5 bg-[hsl(var(--surface))] border border-border px-3 py-1.5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <span className="font-mono tabular-nums text-primary">{occupied + waitingBill}/{tables.length}</span>
              <span className="text-muted-foreground font-normal">โต๊ะที่ใช้งาน</span>
            </span>
            <span className="flex items-center gap-1.5 bg-[hsl(var(--surface))] border border-border px-3 py-1.5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <span className="font-mono tabular-nums text-[hsl(var(--success))] font-bold">
                ฿{totalRevenue.toLocaleString()}
              </span>
              <span className="text-muted-foreground font-normal">ยอดปัจจุบัน</span>
            </span>
          </div>
          <button
            onClick={() => fetchTables()}
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-muted hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Table grid ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
        {loading ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-[160px] rounded-2xl bg-muted/60 animate-pulse border border-border" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {tables.map(table => {
              const cfg = STATUS_CONFIG[table.status];
              const isAvailable = table.status === "available";
              return (
                <button
                  key={table.id}
                  onClick={() => onSelectTable(table.dbId, table.label)}
                  className={cn(
                    "relative flex flex-col text-left p-4 rounded-2xl border-2 transition-all duration-150 select-none",
                    "bg-[hsl(var(--surface))] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)]",
                    "hover:shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_20px_rgba(0,0,0,0.06)] hover:scale-[1.02] active:scale-[0.99]",
                    cfg.border,
                    isAvailable && "opacity-80 hover:opacity-100"
                  )}
                >
                  <div className="absolute top-3 right-3 text-muted-foreground/30">
                    <QrCode size={16} />
                  </div>

                  <div className="text-[22px] font-black text-foreground leading-none mb-1.5">
                    {table.label}
                  </div>

                  <div className={cn("flex items-center gap-1.5 text-[12px] font-semibold mb-3", cfg.labelColor)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
                    <span>{cfg.label}</span>
                    <span className="text-muted-foreground/50 font-normal">/ {cfg.labelEn}</span>
                  </div>

                  <div className="h-px bg-border/60 mb-3" />

                  {isAvailable ? (
                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <Users size={12} />
                      <span>จุ {table.seats} ที่นั่ง</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="flex items-center gap-1"><Users size={11} /> {table.guests ?? '-'} คน</span>
                          <span className="flex items-center gap-1"><Clock size={11} /> {table.elapsed ?? '-'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{table.items ?? 0} รายการ</span>
                        <span className="font-mono font-bold text-[14px] tabular-nums text-foreground">
                          ฿{table.total?.toLocaleString() ?? '0'}
                        </span>
                      </div>
                      {table.status === "waiting_bill" && (
                        <div className={cn(
                          "mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg",
                          "bg-[hsl(38_92%_50%/0.12)] text-[hsl(38_92%_42%)] border border-[hsl(38_92%_50%/0.25)]"
                        )}>
                          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(38_92%_50%)] animate-pulse shrink-0" />
                          รอเช็คบิล
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-5 px-5 py-2.5 border-t border-border/60 text-[11px] text-muted-foreground bg-[hsl(var(--surface))]">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
            {cfg.label} {key === "available" ? `(${available})` : key === "occupied" ? `(${occupied})` : `(${waitingBill})`}
          </span>
        ))}
      </div>
    </div>
  );
}
