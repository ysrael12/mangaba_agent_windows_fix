// Vendored shim for @dheiver2/ui segmented — recreated from call sites.
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

/** A single selectable segment. */
export interface SegmentedOption {
  /** Stable value emitted via `onChange` when this segment is picked. */
  value: string;
  /** Visible label for the segment. */
  label: React.ReactNode;
  /** Disable this individual segment. */
  disabled?: boolean;
}

const segmentedContainer = cva(
  "inline-flex items-center gap-1 rounded-md border border-border bg-background/40 p-1 text-sm shadow-sm",
);

const segmentedItem = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap rounded-[0.3rem] font-medium",
    "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/30",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "h-6 px-2 text-xs",
        md: "h-8 px-3 text-sm",
      },
      active: {
        true: "bg-foreground text-background shadow-sm",
        false: "bg-transparent text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
      },
    },
    defaultVariants: {
      size: "sm",
      active: false,
    },
  },
);

export interface SegmentedProps<T extends string = string>
  extends Omit<
      React.HTMLAttributes<HTMLDivElement>,
      "onChange" | "defaultValue"
    >,
    Pick<VariantProps<typeof segmentedItem>, "size"> {
  /** Selectable segments. */
  options: SegmentedOption[];
  /** Currently selected value (controlled). */
  value?: T;
  /** Fired with the new value when a segment is clicked. */
  onChange?: (value: T) => void;
  /** Disable the whole control. */
  disabled?: boolean;
}

/**
 * A flat, shadcn-style segmented control: a row of buttons where exactly one is
 * active. Mirrors the call-site API — `options` / `value` / `onChange`, with an
 * optional `size` ("sm" | "md").
 */
function SegmentedImpl<T extends string>(
  { className, options, value, onChange, size = "sm", disabled, ...props }: SegmentedProps<T>,
  ref: React.Ref<HTMLDivElement>,
) {
  return (
    <div
      ref={ref}
      role="tablist"
      aria-orientation="horizontal"
      className={cn(segmentedContainer(), className)}
      {...props}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        const isDisabled = disabled || option.disabled;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-state={isActive ? "active" : "inactive"}
            disabled={isDisabled}
            onClick={() => {
              if (isDisabled) return;
              if (option.value !== value) onChange?.(option.value as T);
            }}
            className={segmentedItem({ size, active: isActive })}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export const Segmented = React.forwardRef(SegmentedImpl) as <T extends string = string>(
  props: SegmentedProps<T> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement;

export interface FilterGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Label rendered alongside the control(s). */
  label?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Labeled wrapper that pairs a short caption with a filter control (typically a
 * `<Segmented>`). Stacks on small screens, inlines on larger ones via the
 * `className` passed by the call site.
 */
export const FilterGroup = React.forwardRef<HTMLDivElement, FilterGroupProps>(
  ({ className, label, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex items-center gap-2", className)} {...props}>
        {label != null && (
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            {label}
          </span>
        )}
        {children}
      </div>
    );
  },
);
FilterGroup.displayName = "FilterGroup";
