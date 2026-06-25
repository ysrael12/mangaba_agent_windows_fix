// Vendored shim for @dheiver2/ui list-item — recreated from call sites.
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

/**
 * ListItem — a flexible, interactive row.
 *
 * Renders a full-width `<button>` laid out as a horizontal flex row so call
 * sites can drop in any combination of leading icons/avatars, title/subtitle
 * text, and trailing badges/affordances as `children`. The button semantics
 * give us free keyboard activation plus native support for every attribute
 * the call sites pass (`onClick`, `onDoubleClick`, `onMouseEnter`, `disabled`,
 * `aria-busy`, `aria-selected`, `aria-expanded`, `aria-label`, `role`, …).
 *
 * Call-site driven API:
 *  - `active`   — selected/highlighted state (used everywhere as `active={…}`).
 *  - `disabled` — native disabled; styling targeted via Tailwind `disabled:*`.
 *  - `className` — merged last via cn so call sites freely override padding,
 *                  gap, colors, radius, borders, etc.
 *  - `...props` — all remaining native button props are spread through.
 *
 * The root carries the `group` class so children can use `group-hover:*`
 * (App.tsx relies on this for its hover overlay).
 */

const listItemVariants = cva(
  // Base: relative for absolutely-positioned child overlays; full-width flex
  // row; group for group-hover children; flat shadcn-style look.
  cn(
    "group relative flex w-full items-center gap-2 rounded-md px-3 py-2",
    "text-left text-sm outline-none transition-colors",
    "focus-visible:ring-1 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50",
  ),
  {
    variants: {
      active: {
        true: "bg-accent text-accent-foreground",
        false: "text-foreground hover:bg-accent/50 hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export interface ListItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    VariantProps<typeof listItemVariants> {
  /** Selected / highlighted state. */
  active?: boolean;
}

export const ListItem = React.forwardRef<HTMLButtonElement, ListItemProps>(
  ({ className, active = false, type, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        data-active={active || undefined}
        className={cn(listItemVariants({ active }), className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);
ListItem.displayName = "ListItem";

export default ListItem;
