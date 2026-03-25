import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface POSStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  color?: "primary" | "accent" | "success" | "warning" | "danger";
  className?: string;
}

const iconBg = {
  primary: "bg-primary/10 text-primary",
  accent:  "bg-accent/10  text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger:  "bg-danger/10  text-danger",
};

export function POSStatCard({ icon, label, value, sub, trend, color = "primary", className }: POSStatCardProps) {
  return (
    <div className={cn(
      "relative flex-1 min-w-[150px] bg-white dark:bg-card border border-border rounded-2xl px-5 pt-5 pb-4 overflow-hidden",
      "shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.05)]",
      "hover:shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.07)] transition-shadow duration-200",
      className
    )}>
      {/* Icon badge */}
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-[18px] mb-3", iconBg[color])}>
        {icon}
      </div>

      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>

      <div className="font-mono text-[28px] font-black tracking-tight text-foreground leading-none mb-2 tabular-nums">
        {value}
      </div>

      {/* Hairline separator */}
      <div className="h-px bg-border/60 mb-2" />

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {trend !== undefined && (
          <span className={cn(
            "flex items-center gap-0.5 font-semibold",
            trend > 0 ? "text-success" : "text-danger"
          )}>
            {trend > 0
              ? <TrendingUp size={11} strokeWidth={2.5} />
              : <TrendingDown size={11} strokeWidth={2.5} />}
            {Math.abs(trend)}%
          </span>
        )}
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}
