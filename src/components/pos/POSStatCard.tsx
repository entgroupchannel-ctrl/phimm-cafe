import { cn } from "@/lib/utils";

interface POSStatCardProps {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  color?: "primary" | "accent" | "success" | "warning" | "danger";
  className?: string;
}

const colorBg   = { primary:"bg-primary/8",accent:"bg-accent/8",success:"bg-success/8",warning:"bg-warning/8",danger:"bg-danger/8" };
const colorText = { primary:"text-primary", accent:"text-accent", success:"text-success", warning:"text-warning", danger:"text-danger" };
const colorBorder={ primary:"border-primary/15",accent:"border-accent/15",success:"border-success/15",warning:"border-warning/15",danger:"border-danger/15" };

export function POSStatCard({ icon, label, value, sub, trend, color = "primary", className }: POSStatCardProps) {
  return (
    <div className={cn(
      "relative flex-1 min-w-[150px] bg-card border rounded-2xl px-5 pt-5 pb-4 overflow-hidden shadow-card",
      colorBorder[color],
      className
    )}>
      {/* Tinted corner circle */}
      <div className={cn("absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-70", colorBg[color])} />

      <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-2">
        <span className="text-[16px]">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>

      <div className="font-mono text-[26px] font-extrabold tracking-tight text-foreground leading-none mb-1.5">
        {value}
      </div>

      <div className="flex items-center gap-1.5 text-[12px] text-foreground/40">
        {trend !== undefined && (
          <span className={cn("font-bold", trend > 0 ? "text-success" : "text-danger")}>
            {trend > 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}
