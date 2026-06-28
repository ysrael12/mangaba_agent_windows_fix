import { useSidebarStatus } from "@/hooks/useSidebarStatus";

/** Rótulos amigáveis por fonte de rate-limit. */
const SOURCE_LABELS: Record<string, string> = {
  modelo: "modelo (provedor de IA)",
  pncp: "PNCP (licitações)",
  transparencia: "Portal da Transparência",
};

/**
 * Banner de topo exibido quando algum limite de requisições foi atingido
 * recentemente (provedor do modelo HF e/ou APIs públicas como o PNCP).
 * Os eventos vêm de /api/status -> rate_limit (janela de 15 min).
 */
export function RateLimitBanner() {
  const status = useSidebarStatus();
  const rl = status?.rate_limit;
  if (!rl?.active) return null;

  const fontes = Object.entries(rl.by_source || {})
    .map(([src, n]) => `${SOURCE_LABELS[src] ?? src} (${n})`)
    .join(" · ");

  return (
    <div
      role="alert"
      className="w-full bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 text-sm text-amber-900 dark:text-amber-200 flex items-center gap-2"
    >
      <span aria-hidden>⏱️</span>
      <span className="font-medium">Limite de requisições atingido</span>
      <span className="opacity-80">
        — {fontes || `${rl.count} evento(s)`} nos últimos {rl.window_minutes ?? 15} min.
        {rl.last?.detail ? ` Último: ${rl.last.detail}.` : ""} Tente novamente em
        instantes.
      </span>
    </div>
  );
}
