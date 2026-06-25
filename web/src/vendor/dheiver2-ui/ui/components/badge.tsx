// Vendored shim for @dheiver2/ui badge — recreated from call sites.
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

/**
 * Badge — a small, flat status pill.
 *
 * Call sites drive the API entirely through the `tone` prop (e.g.
 * `tone="success"`, `tone="outline"`, `tone={STATE_TONE[state]}`), an optional
 * `className`, and `children` that may include a leading lucide icon. The
 * component renders a `<span>` and spreads any remaining native span props.
 *
 * Tones observed across the dashboard: success, warning, destructive, error
 * (alias of destructive), secondary, outline. Any unknown tone string falls
 * back to the neutral "secondary" look so dynamic values never break layout.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium leading-normal whitespace-nowrap transition-colors",
  {
    variants: {
      tone: {
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        success:
          "border-transparent bg-success/15 text-success",
        warning:
          "border-transparent bg-warning/15 text-warning",
        destructive:
          "border-transparent bg-destructive/15 text-destructive",
        error:
          "border-transparent bg-destructive/15 text-destructive",
        outline: "border-border bg-transparent text-foreground",
        default:
          "border-transparent bg-secondary text-secondary-foreground",
      },
    },
    defaultVariants: {
      tone: "secondary",
    },
  },
);

type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    Omit<VariantProps<typeof badgeVariants>, "tone"> {
  /**
   * Visual tone. Accepts the known tones above; any other string is tolerated
   * and rendered with the neutral "secondary" appearance.
   */
  tone?: BadgeTone | (string & {});
}

const KNOWN_TONES = new Set<string>([
  "secondary",
  "success",
  "warning",
  "destructive",
  "error",
  "outline",
  "default",
]);

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone = "secondary", ...props }, ref) => {
    const safeTone = (
      tone && KNOWN_TONES.has(tone) ? tone : "secondary"
    ) as BadgeTone;
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ tone: safeTone }), className)}
        {...props}
      />
    );
  },
);
Badge.displayName = "Badge";

export default Badge;
