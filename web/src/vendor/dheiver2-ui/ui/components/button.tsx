// Vendored shim for @dheiver2/ui button — recreated from call sites.
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

/**
 * Button — a flat, shadcn-style button.
 *
 * Two styling APIs coexist at the call sites and are both supported:
 *
 *   1. The `variant` / `size` props (cva):
 *        <Button variant="outline" size="sm" />
 *        <Button variant="ghost"   size="icon" />
 *
 *   2. Boolean shorthand props, which can be combined:
 *        <Button ghost />                  → ghost variant
 *        <Button outlined />               → outline variant
 *        <Button destructive />            → destructive (solid) variant
 *        <Button ghost destructive />      → ghost-styled destructive button
 *        <Button outlined={isInactive} />  → outline only when truthy
 *
 * With no variant/shorthand props the button renders the solid `default`
 * (primary) style. Sizes seen at call sites: `sm`, `md`, `xs`, `icon`.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        outline:
          "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        "ghost-destructive":
          "text-destructive hover:bg-destructive/10 hover:text-destructive",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-sm",
        xs: "h-7 rounded-md px-2 text-xs",
        md: "h-9 px-4 py-2",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonBaseVariant = "default" | "outline" | "ghost" | "destructive";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "prefix">,
    Omit<VariantProps<typeof buttonVariants>, "variant"> {
  /** Explicit visual style; overridden by the boolean shorthands below. */
  variant?: ButtonBaseVariant;
  /** Shorthand for the ghost (transparent) variant. */
  ghost?: boolean;
  /** Shorthand for the outline (bordered) variant. */
  outlined?: boolean;
  /** Shorthand for the destructive (danger) variant. */
  destructive?: boolean;
  /** Node rendered before the children (e.g. an icon/spinner). */
  prefix?: React.ReactNode;
  /** Node rendered after the children. */
  suffix?: React.ReactNode;
}

/** Resolve the effective cva variant from the explicit + shorthand props. */
function resolveVariant({
  variant,
  ghost,
  outlined,
  destructive,
}: Pick<
  ButtonProps,
  "variant" | "ghost" | "outlined" | "destructive"
>): NonNullable<VariantProps<typeof buttonVariants>["variant"]> {
  if (ghost && destructive) return "ghost-destructive";
  if (destructive) return "destructive";
  if (ghost) return "ghost";
  if (outlined) return "outline";
  return variant ?? "default";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      ghost,
      outlined,
      destructive,
      type,
      prefix,
      suffix,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cn(
          buttonVariants({
            variant: resolveVariant({ variant, ghost, outlined, destructive }),
            size,
          }),
          className
        )}
        {...props}
      >
        {prefix}
        {children}
        {suffix}
      </button>
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };

export default Button;
