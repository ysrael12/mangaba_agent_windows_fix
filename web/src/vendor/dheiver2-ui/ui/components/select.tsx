// Vendored shim for @dheiver2/ui select — recreated from call sites.
import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  /** Current selected value (controlled). */
  value?: string;
  /**
   * Fired with the new value string when the selection changes.
   * Mirrors the shadcn-style `onValueChange` contract used at the call sites.
   */
  onValueChange?: (value: string) => void;
  /** Native change handler — still forwarded if provided. */
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  children?: React.ReactNode;
}

/**
 * Native `<select>` wrapper styled to match the app's flat shadcn-like inputs.
 * Children are `<SelectOption>` elements. Emits `onValueChange(value)`.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, value, onValueChange, onChange, children, ...props }, ref) => {
    const handleChange = React.useCallback(
      (event: React.ChangeEvent<HTMLSelectElement>) => {
        onValueChange?.(event.target.value);
        onChange?.(event);
      },
      [onValueChange, onChange],
    );

    return (
      <div className="relative inline-flex w-full items-center">
        <select
          ref={ref}
          value={value}
          onChange={handleChange}
          className={cn(
            "flex h-9 w-full appearance-none border border-border bg-background/40 px-3 py-2 pr-8 text-sm shadow-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/30 focus-visible:border-foreground/25",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 h-4 w-4 text-muted-foreground"
        />
      </div>
    );
  },
);
Select.displayName = "Select";

export interface SelectOptionProps
  extends React.OptionHTMLAttributes<HTMLOptionElement> {
  value: string;
  children?: React.ReactNode;
}

/** Native `<option>` wrapper used inside `<Select>`. */
export const SelectOption = React.forwardRef<
  HTMLOptionElement,
  SelectOptionProps
>(({ className, children, ...props }, ref) => {
  return (
    <option
      ref={ref}
      className={cn("bg-background text-foreground", className)}
      {...props}
    >
      {children}
    </option>
  );
});
SelectOption.displayName = "SelectOption";
