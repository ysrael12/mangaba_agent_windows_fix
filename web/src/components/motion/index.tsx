// Sistema de motion "premium discreto" — animações suaves, rápidas e
// reutilizáveis, construídas sobre a lib `motion` (já instalada). Respeita
// prefers-reduced-motion automaticamente.
import {
  motion,
  useReducedMotion,
  useInView,
  animate,
  type Variants,
} from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const; // easeOutExpo suave

// ── Transição de página ─────────────────────────────────────────────────────
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.16, ease: "easeIn" } },
};

// ── Reveal: surge com fade + leve subida quando entra na viewport ───────────
export function Reveal({
  children,
  className,
  delay = 0,
  y = 14,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.4, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

// ── Stagger: container que revela filhos em cascata ─────────────────────────
export function Stagger({
  children,
  className,
  gap = 0.06,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
};

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

// ── Hover-lift: eleva sutilmente no hover, afunda no clique ──────────────────
export function HoverLift({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { y: -3, transition: { duration: 0.2, ease: EASE } }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
    >
      {children}
    </motion.div>
  );
}

// ── AnimatedNumber: conta de 0 (ou do valor anterior) até o alvo ────────────
export function AnimatedNumber({
  value,
  className,
  format,
  duration = 0.9,
}: {
  value: number;
  className?: string;
  format?: (n: number) => string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(fromRef.current, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setDisplay(v),
    });
    fromRef.current = value;
    return () => controls.stop();
  }, [value, duration, reduce]);

  const rounded = Math.round(display);
  return (
    <span className={cn("tabular-nums", className)}>
      {format ? format(rounded) : rounded.toLocaleString("pt-BR")}
    </span>
  );
}
