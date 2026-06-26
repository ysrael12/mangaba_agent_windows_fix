import { cn } from "@/lib/utils";

// Indicador de status reutilizável. Usa tokens do tema (não cores fixas),
// então funciona em dia/noite e mantém o padrão em toda a UI.
export function StatusDot({
  active,
  title,
  className,
}: {
  active: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
        active ? "bg-success" : "bg-muted-foreground/40",
        className,
      )}
      title={title ?? (active ? "ativo" : "parado")}
      aria-label={title ?? (active ? "ativo" : "parado")}
      role="img"
    />
  );
}
