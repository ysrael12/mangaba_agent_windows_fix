// Vendored shim for @dheiver2/ui stats — recreated from call sites.
import * as React from "react";
import { cn } from "../../lib/cn";

export interface StatItem {
  /** Left-aligned descriptor for the metric. */
  label: React.ReactNode;
  /** Right-aligned value (numbers are coerced to strings). */
  value: React.ReactNode;
}

export interface StatsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** List of label/value pairs to render as stacked rows. */
  items: StatItem[];
}

/**
 * Stats — a flat label/value list.
 *
 * Each item renders as a row inside a CSS grid so callers can retarget the
 * column template (label / spacer / value) from the outside. The default
 * template keeps the label hard against the left edge, lets the middle column
 * absorb slack, and pins the value to the right.
 */
export const Stats = React.forwardRef<HTMLDivElement, StatsProps>(
  ({ items, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex min-w-0 flex-col", className)}
        {...props}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className={cn(
              "grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2",
              i > 0 && "border-t border-border/60",
            )}
          >
            <span className="min-w-0 truncate text-sm text-muted-foreground">
              {item.label}
            </span>
            <span aria-hidden className="min-w-0" />
            <span className="min-w-0 truncate text-right text-sm font-semibold tabular-nums text-foreground">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    );
  },
);
Stats.displayName = "Stats";

export default Stats;
