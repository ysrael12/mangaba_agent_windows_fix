// Vendored shim for @dheiver2/ui command-block — recreated from call sites.
import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "../../lib/cn";

/**
 * Clipboard helper shared by CopyButton and CommandBlock.
 *
 * Returns a `copied` flag that flips true for ~1.6s after a successful copy,
 * plus a `copy` callback. Falls back to a hidden-textarea + execCommand path
 * when the async Clipboard API is unavailable (insecure contexts, older
 * browsers) so the button still works everywhere.
 */
function useCopy(timeout = 1600): {
  copied: boolean;
  copy: (text: string) => void;
} {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = React.useCallback(
    (text: string) => {
      const done = () => {
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), timeout);
      };

      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        navigator.clipboard.writeText(text).then(done).catch(() => {
          fallbackCopy(text);
          done();
        });
      } else {
        fallbackCopy(text);
        done();
      }
    },
    [timeout],
  );

  return { copied, copy };
}

function fallbackCopy(text: string): void {
  if (typeof document === "undefined") return;
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  } catch {
    /* best-effort; nothing else we can do */
  }
}

export interface CopyButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** The text written to the clipboard when the button is pressed. */
  text: string;
  /**
   * Optional label rendered next to the icon in the idle state. When omitted
   * the button is icon-only (as in the device-code copy affordance).
   */
  label?: React.ReactNode;
  /**
   * Optional label rendered next to the check icon after a successful copy.
   * Defaults to `label` when provided, otherwise the button stays icon-only.
   */
  copiedLabel?: React.ReactNode;
}

/**
 * CopyButton — a flat ghost button that copies `text` to the clipboard and
 * briefly swaps to a "copied" state (check icon + optional `copiedLabel`).
 *
 * Call sites:
 *  - `<CopyButton text={cmd} label={t.oauth.cli} copiedLabel={t.oauth.copied} />`
 *  - `<CopyButton text={userCode} />` (icon-only)
 */
export const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    { text, label, copiedLabel, className, onClick, type, ...props },
    ref,
  ) => {
    const { copied, copy } = useCopy();
    const shownLabel = copied ? copiedLabel ?? label : label;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      copy(text);
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type={type ?? "button"}
        onClick={handleClick}
        aria-label={
          props["aria-label"] ??
          (typeof label === "string"
            ? label
            : copied
              ? "Copied"
              : "Copy")
        }
        data-copied={copied ? "" : undefined}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          copied && "text-success",
          className,
        )}
        {...props}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {shownLabel != null && shownLabel !== "" ? (
          <span className="leading-none">{shownLabel}</span>
        ) : null}
      </button>
    );
  },
);
CopyButton.displayName = "CopyButton";

export interface CommandBlockProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The shell command (or other code) shown in a monospace block. */
  code: string;
  /** Optional caption rendered above the code (e.g. an auth-required hint). */
  label?: React.ReactNode;
}

/**
 * CommandBlock — a flat monospace code box with an inline copy affordance.
 *
 * Call site:
 *  - `<CommandBlock label={t.pluginsPage.authRequiredHint} code={row.auth_command} />`
 */
export const CommandBlock = React.forwardRef<HTMLDivElement, CommandBlockProps>(
  ({ code, label, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex flex-col gap-1.5", className)} {...props}>
        {label != null && label !== "" ? (
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        ) : null}
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-xs text-foreground">
            {code}
          </code>
          <CopyButton text={code} className="-mr-1" />
        </div>
      </div>
    );
  },
);
CommandBlock.displayName = "CommandBlock";

export default CommandBlock;
