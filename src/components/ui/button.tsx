import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base — Apple-style: tight tracking, medium weight, smooth transitions, no text select
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-[13px] font-medium tracking-[-0.01em] select-none transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-[14px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Apple blue filled
        default:
          "bg-primary text-white shadow-[0_2px_8px_hsl(var(--primary)/0.30),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-primary/90 hover:shadow-[0_4px_14px_hsl(var(--primary)/0.38)] active:bg-primary/80",
        // Apple red
        destructive:
          "bg-danger text-white shadow-[0_2px_8px_hsl(var(--danger)/0.28),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-danger/90",
        // Apple outlined — hairline border, no background
        outline:
          "border border-border/80 bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] hover:bg-muted/60 hover:border-border-light active:bg-muted",
        // Soft filled — Apple secondary gray
        secondary:
          "bg-muted text-foreground/80 hover:bg-muted/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
        // Ghost
        ghost:
          "text-foreground/60 hover:bg-muted/60 hover:text-foreground",
        // Link
        link:
          "text-primary underline-offset-4 hover:underline rounded-none",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-7 px-3 text-[12px]",
        lg:      "h-11 px-6 text-[14px] font-semibold",
        xl:      "h-12 px-8 text-[15px] font-semibold",
        icon:    "h-9 w-9",
        "icon-sm": "h-7 w-7 text-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
