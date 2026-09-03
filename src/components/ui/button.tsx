import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-press-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-press active:translate-x-0 active:translate-y-0 active:shadow-none",
        /* The "gradient" name is kept for compatibility — restyled as the inked stamp button. */
        gradient:
          "bg-foreground text-background shadow-press-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-press active:translate-x-0 active:translate-y-0 active:shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground shadow-press-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-press active:translate-x-0 active:translate-y-0 active:shadow-none",
        outline:
          "border-[1.5px] border-foreground/25 bg-card hover:border-foreground hover:bg-card active:translate-y-px",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted active:translate-y-px",
        ghost: "hover:bg-foreground/[0.07] active:translate-y-px",
        link: "text-primary underline underline-offset-4 decoration-[1.5px] hover:decoration-accent",
        success:
          "bg-success text-success-foreground shadow-press-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-press active:translate-x-0 active:translate-y-0 active:shadow-none",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-12 rounded-md px-6 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
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
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
