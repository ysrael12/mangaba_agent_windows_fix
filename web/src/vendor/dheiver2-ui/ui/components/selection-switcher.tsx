// Vendored shim for @dheiver2/ui selection-switcher — recreated from call sites.
import * as React from "react";
import { Check, Copy, X } from "lucide-react";
import { cn } from "../../lib/cn";

/**
 * SelectionSwitcher — a self-contained floating helper for the current text
 * selection on the page.
 *
 * The single call site (`<SelectionSwitcher />` in App.tsx, rendered as an
 * overlay sibling of `<Backdrop />`) passes no props, so the component must be
 * fully functional with zero configuration. It listens for native
 * `selectionchange` events and, while a non-empty text selection exists,
 * surfaces a small floating toolbar anchored to the selection offering quick
 * "copy" / "clear" affordances.
 *
 * Everything is optional so the component degrades gracefully:
 *  - `className`       — merged via cn onto the floating toolbar root.
 *  - `enabled`         — master switch; when false nothing renders/listens.
 *  - `onCopy`          — notified with the copied text after a successful copy.
 *  - `onSelectionChange` — notified with the current selection string (or "").
 *  - `actions`         — override the rendered actions (defaults: copy, clear).
 *  - `...props`        — remaining native div props spread onto the toolbar.
 *
 * No Radix / portals — it renders a `position: fixed` toolbar inline.
 */

export interface SelectionSwitcherAction {
  /** Stable key for React. */
  key: string;
  /** Accessible label / tooltip. */
  label: string;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** Invoked with the current selected text when the action is pressed. */
  onSelect: (selectedText: string) => void;
}

export interface SelectionSwitcherProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onCopy"> {
  /** Master enable flag. Defaults to true. */
  enabled?: boolean;
  /** Called with the copied text after the default copy action succeeds. */
  onCopy?: (text: string) => void;
  /** Called whenever the active selection text changes (empty string = none). */
  onSelectionChange?: (text: string) => void;
  /** Override the default toolbar actions (copy + clear). */
  actions?: SelectionSwitcherAction[];
}

interface ToolbarPosition {
  top: number;
  left: number;
}

export const SelectionSwitcher = React.forwardRef<
  HTMLDivElement,
  SelectionSwitcherProps
>(
  (
    {
      className,
      enabled = true,
      onCopy,
      onSelectionChange,
      actions,
      ...props
    },
    ref,
  ) => {
    const [text, setText] = React.useState("");
    const [position, setPosition] = React.useState<ToolbarPosition | null>(null);
    const [copied, setCopied] = React.useState(false);

    React.useEffect(() => {
      if (!enabled || typeof window === "undefined") return;

      const update = () => {
        const selection = window.getSelection();
        const value = selection ? selection.toString().trim() : "";

        if (!value || !selection || selection.rangeCount === 0) {
          setText((prev) => {
            if (prev !== "") onSelectionChange?.("");
            return "";
          });
          setPosition(null);
          setCopied(false);
          return;
        }

        let rect: DOMRect | null = null;
        try {
          rect = selection.getRangeAt(0).getBoundingClientRect();
        } catch {
          rect = null;
        }

        if (rect && (rect.width > 0 || rect.height > 0)) {
          setPosition({
            top: Math.max(8, rect.top - 8),
            left: rect.left + rect.width / 2,
          });
        } else {
          setPosition(null);
        }

        setText((prev) => {
          if (prev !== value) onSelectionChange?.(value);
          return value;
        });
      };

      document.addEventListener("selectionchange", update);
      window.addEventListener("scroll", update, true);
      window.addEventListener("resize", update);
      return () => {
        document.removeEventListener("selectionchange", update);
        window.removeEventListener("scroll", update, true);
        window.removeEventListener("resize", update);
      };
    }, [enabled, onSelectionChange]);

    const handleCopy = React.useCallback(
      (value: string) => {
        const done = () => {
          setCopied(true);
          onCopy?.(value);
          window.setTimeout(() => setCopied(false), 1500);
        };
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(value).then(done).catch(() => {});
        } else {
          done();
        }
      },
      [onCopy],
    );

    const handleClear = React.useCallback(() => {
      window.getSelection()?.removeAllRanges();
      setText("");
      setPosition(null);
      setCopied(false);
    }, []);

    if (!enabled || !text || !position) return null;

    const resolvedActions: SelectionSwitcherAction[] =
      actions ?? [
        {
          key: "copy",
          label: copied ? "Copied" : "Copy",
          icon: copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          ),
          onSelect: handleCopy,
        },
        {
          key: "clear",
          label: "Clear selection",
          icon: <X className="h-3.5 w-3.5" />,
          onSelect: handleClear,
        },
      ];

    return (
      <div
        ref={ref}
        role="toolbar"
        aria-label="Selection actions"
        style={{
          position: "fixed",
          top: position.top,
          left: position.left,
          transform: "translate(-50%, -100%)",
          zIndex: 50,
        }}
        className={cn(
          "flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-md",
          "text-foreground",
          className,
        )}
        {...props}
      >
        {resolvedActions.map((action) => (
          <button
            key={action.key}
            type="button"
            title={action.label}
            aria-label={action.label}
            onMouseDown={(event) => {
              // Keep the selection alive while pressing the action.
              event.preventDefault();
            }}
            onClick={() => action.onSelect(text)}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium",
              "text-muted-foreground transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            )}
          >
            {action.icon}
            <span className="sr-only sm:not-sr-only">{action.label}</span>
          </button>
        ))}
      </div>
    );
  },
);
SelectionSwitcher.displayName = "SelectionSwitcher";

export default SelectionSwitcher;
