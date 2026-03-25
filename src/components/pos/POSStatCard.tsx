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

const colorBg = {
  primary: "bg-primary/5",
  accent:  "bg-accent/5",
  success: "bg-success/5",
  warning: "bg-warning/5",
  danger:  "bg-danger/5",
};

const colorText = {
  primary: "text-primary",
  accent:  "text-accent",
  success: "text-success",
  warning: "text-warning",
  danger:  "text-danger",
};

export function POSStatCard({ icon, label, value, sub, trend, color = "primary", className }: POSStatCardProps) {
  return (
    <div className={cn(
      "relative flex-1 min-w-[150px] bg-card border border-border rounded-2xl px-5 pt-5 pb-4 overflow-hidden",
      className
    )}>
      <div className={cn("absolute -top-5 -right-5 w-20 h-20 rounded-full", colorBg[color])} />
      <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-2">
        <span className="text-base">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="font-mono text-[28px] font-extrabold tracking-tight text-foreground">{value}</div>
      <div className="flex items-center gap-1 mt-1 text-[12px] text-foreground/40">
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
