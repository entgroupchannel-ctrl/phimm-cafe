import { cn } from "@/lib/utils";

interface POSBadgeProps {
  children: React.ReactNode;
  color?: "primary" | "accent" | "success" | "warning" | "danger" | "muted";
  glow?: boolean;
  className?: string;
}

const colorMap = {
  primary: "bg-primary/10 text-primary border-primary/25",
  accent:  "bg-accent/10  text-accent  border-accent/25",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger:  "bg-danger/10  text-danger  border-danger/25",
  muted:   "bg-muted text-muted-foreground border-border",
};

const glowMap = {
  primary: "shadow-[0_0_10px_hsl(var(--primary)/0.3)]",
  accent:  "shadow-[0_0_10px_hsl(var(--accent)/0.3)]",
  success: "shadow-[0_0_10px_hsl(var(--success)/0.3)]",
  warning: "shadow-[0_0_10px_hsl(var(--warning)/0.3)]",
  danger:  "shadow-[0_0_10px_hsl(var(--danger)/0.3)]",
  muted:   "",
};

export function POSBadge({ children, color = "primary", glow = false, className }: POSBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border",
      colorMap[color],
      glow && glowMap[color],
      className
    )}>
      {children}
    </span>
  );
}
