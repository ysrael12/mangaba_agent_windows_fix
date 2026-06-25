// Vendored shim for @dheiver2/ui tabs — recreated from call sites.
import * as React from "react";
import { cn } from "../../lib/cn";

// ---------------------------------------------------------------------------
// Context — controlled/uncontrolled active value shared across sub-components.
// ---------------------------------------------------------------------------

interface TabsContextValue {
  value: string | undefined;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error(`<${component}> must be used within a <Tabs> component.`);
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Tabs — root provider. Supports controlled (`value` + `onValueChange`) and
// uncontrolled (`defaultValue`) usage, mirroring the shadcn Tabs API.
// ---------------------------------------------------------------------------

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Controlled active tab value. */
  value?: string;
  /** Initial active tab value when uncontrolled. */
  defaultValue?: string;
  /** Fired with the new value string when the active tab changes. */
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    { className, value, defaultValue, onValueChange, children, ...props },
    ref,
  ) => {
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState<
      string | undefined
    >(defaultValue);

    const currentValue = isControlled ? value : internalValue;

    const setValue = React.useCallback(
      (next: string) => {
        if (!isControlled) setInternalValue(next);
        onValueChange?.(next);
      },
      [isControlled, onValueChange],
    );

    const ctx = React.useMemo<TabsContextValue>(
      () => ({ value: currentValue, setValue }),
      [currentValue, setValue],
    );

    return (
      <TabsContext.Provider value={ctx}>
        <div ref={ref} className={cn("flex flex-col", className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = "Tabs";

// ---------------------------------------------------------------------------
// TabsList — the row of triggers.
// ---------------------------------------------------------------------------

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(
          "inline-flex h-9 items-center justify-center gap-1 rounded-md bg-muted p-1 text-muted-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TabsList.displayName = "TabsList";

// ---------------------------------------------------------------------------
// TabsTrigger — a single tab button. `value` selects which tab it activates.
// ---------------------------------------------------------------------------

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The value this trigger activates. */
  value: string;
  children?: React.ReactNode;
}

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  TabsTriggerProps
>(({ className, value, disabled, onClick, children, ...props }, ref) => {
  const ctx = useTabsContext("TabsTrigger");
  const isActive = ctx.value === value;

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        ctx.setValue(value);
      }}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium ring-offset-background transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
TabsTrigger.displayName = "TabsTrigger";

// ---------------------------------------------------------------------------
// TabsContent — the panel shown when its `value` matches the active tab.
// Not imported at the current call sites, but part of the standard Tabs API.
// ---------------------------------------------------------------------------

export interface TabsContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** The value that makes this panel visible. */
  value: string;
  children?: React.ReactNode;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const ctx = useTabsContext("TabsContent");
    const isActive = ctx.value === value;

    if (!isActive) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        data-state={isActive ? "active" : "inactive"}
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TabsContent.displayName = "TabsContent";
