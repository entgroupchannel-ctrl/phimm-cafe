import { cn } from "@/lib/utils";

interface POSBadgeProps {
  children: React.ReactNode;
  color?: "primary" | "accent" | "success" | "warning" | "danger" | "muted";
  glow?: boolean;
  className?: string;
}

const colorMap = {
  primary: "bg-primary/15 text-primary border-primary/30",
  accent:  "bg-accent/15 text-accent border-accent/30",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger:  "bg-danger/15 text-danger border-danger/30",
  muted:   "bg-muted text-muted-foreground border-border",
};

const glowMap = {
  primary: "shadow-[0_0_12px_hsl(var(--primary)/0.4)]",
  accent:  "shadow-[0_0_12px_hsl(var(--accent)/0.35)]",
  success: "shadow-[0_0_12px_hsl(var(--success)/0.4)]",
  warning: "shadow-[0_0_12px_hsl(var(--warning)/0.4)]",
  danger:  "shadow-[0_0_12px_hsl(var(--danger)/0.4)]",
  muted:   "",
};

export function POSBadge({ children, color = "primary", glow = false, className }: POSBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border",
        colorMap[color],
        glow && glowMap[color],
        className
      )}
    >
      {children}
    </span>
  );
}
