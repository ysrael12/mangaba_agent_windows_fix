// Vendored shim for @dheiver2/ui spinner — recreated from call sites.
import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

export interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  /** Optional explicit label for assistive tech. */
  label?: string;
}

/**
 * Spinner — an animated loading indicator.
 *
 * Sized in `em` by default so it inherits the surrounding font-size
 * (call sites drive size with `text-xs` / `text-xl` / `text-2xl` /
 * `text-[0.875rem]`). Explicit `h-*`/`w-*` classes passed via
 * `className` override the default through tailwind-merge. Color is
 * inherited from `currentColor`, so `text-primary` / `text-warning` /
 * `text-muted-foreground` tint it.
 */
export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, label = "Loading", ...props }, ref) => {
    return (
      <Loader2
        ref={ref}
        role="status"
        aria-label={label}
        aria-live="polite"
        className={cn("inline-block h-[1em] w-[1em] animate-spin", className)}
        {...props}
      />
    );
  }
);
Spinner.displayName = "Spinner";

export default Spinner;
