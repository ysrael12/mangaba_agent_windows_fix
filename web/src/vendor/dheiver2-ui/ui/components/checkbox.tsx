// Vendored shim for @dheiver2/ui checkbox — recreated from call sites.
import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/cn";

export type CheckedState = boolean | "indeterminate";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "checked" | "onChange" | "type"> {
  /** Controlled checked state. Supports the Radix-style "indeterminate" value. */
  checked?: CheckedState;
  /** Uncontrolled initial checked state. */
  defaultChecked?: boolean;
  /** Fired with the next checked state (boolean) when toggled. */
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Styled checkbox built on a native <input type="checkbox">.
 *
 * Mirrors the Radix-style API used at the call sites: a controlled `checked`
 * prop (which may be `"indeterminate"`) and an `onCheckedChange(boolean)`
 * callback. All other native input props (`id`, `name`, `disabled`,
 * `required`, `aria-*`, …) are spread through.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      checked,
      defaultChecked,
      onCheckedChange,
      disabled,
      ...props
    },
    forwardedRef,
  ) => {
    const innerRef = React.useRef<HTMLInputElement>(null);

    // Allow callers to keep a ref while we also hold our own (for the
    // indeterminate DOM property, which has no JSX attribute).
    React.useImperativeHandle(
      forwardedRef,
      () => innerRef.current as HTMLInputElement,
    );

    const isControlled = checked !== undefined;
    const indeterminate = checked === "indeterminate";
    const isChecked = checked === true;

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    return (
      <span
        className={cn(
          "relative inline-flex h-4 w-4 shrink-0 items-center justify-center",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <input
          ref={innerRef}
          type="checkbox"
          disabled={disabled}
          {...(isControlled
            ? { checked: isChecked }
            : { defaultChecked })}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className={cn(
            "peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-[4px] border border-input bg-background",
            "shadow-sm transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "checked:border-primary checked:bg-primary",
            "indeterminate:border-primary indeterminate:bg-primary",
            "disabled:cursor-not-allowed",
            className,
          )}
          {...props}
        />
        <Check
          aria-hidden="true"
          strokeWidth={3}
          className={cn(
            "pointer-events-none absolute h-3 w-3 text-primary-foreground transition-opacity",
            isChecked && !indeterminate ? "opacity-100" : "opacity-0",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute h-[2px] w-2 rounded-full bg-primary-foreground transition-opacity",
            indeterminate ? "opacity-100" : "opacity-0",
          )}
        />
      </span>
    );
  },
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
