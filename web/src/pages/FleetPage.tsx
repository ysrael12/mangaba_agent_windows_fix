import { useCallback, useEffect, useState } from "react";
import { Radio, RefreshCw, RotateCw, FileText, Megaphone, X } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { H2 } from "@/components/NouiTypography";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import type { FleetMember } from "@/lib/api";

export default function FleetPage() {
  const [members, setMembers] = useState<FleetMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [logsFor, setLogsFor] = useState<string | null>(null);
  const [logText, setLogText] = useState("");
  const [broadcast, setBroadcast] = useState("");
  const { toast, showToast } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await api.getFleet();
      setMembers(res.members);
    } catch (e) {
      showToast(`Erro ao carregar a frota: ${(e as Error).message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // auto-refresh
    return () => clearInterval(t);
  }, [load]);

  const act = async (name: string, action: "restart" | "start" | "stop") => {
    setBusy(`${name}:${action}`);
    try {
      const res = await api.fleetAction(name, action);
      showToast(res.message, res.ok ? "success" : "error");
      setTimeout(load, 1500);
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const openLogs = async (name: string) => {
    setLogsFor(name);
    setLogText("Carregando…");
    try {
      const res = await api.getFleetLogs(name, 80);
      setLogText(res.log || "(vazio)");
    } catch (e) {
      setLogText(`Erro: ${(e as Error).message}`);
    }
  };

  const sendBroadcast = async () => {
    const msg = broadcast.trim();
    if (!msg) return;
    setBusy("broadcast");
    try {
      const res = await api.fleetBroadcast(msg);
      showToast(
        `Aviso enfileirado para ${res.reached} agente(s) / ${res.channels} canal(is).` +
          (res.skipped.length ? ` Pulados: ${res.skipped.join(", ")}` : ""),
        "success",
      );
      setBroadcast("");
    } catch (e) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const up = members.filter((m) => m.running).length;

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5" />
          <H2>Frota de agentes</H2>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {!loading && (
        <p className="text-sm text-muted-foreground">
          {members.length} agente(s) · {up} no ar · {members.length - up} parado(s)
        </p>
      )}

      {/* Broadcast */}
      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
          <Megaphone className="h-4 w-4 shrink-0" />
          <Input
            placeholder="Aviso para o canal-operador de todos os agentes…"
            value={broadcast}
            onChange={(e) => setBroadcast(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendBroadcast()}
          />
          <Button onClick={sendBroadcast} disabled={busy === "broadcast" || !broadcast.trim()}>
            {busy === "broadcast" ? <Spinner className="h-4 w-4" /> : "Enviar"}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum agente (profile) encontrado.</p>
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <Card key={m.name}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    m.running ? "bg-green-500" : "bg-gray-400"
                  }`}
                  title={m.running ? "no ar" : "parado"}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    {m.is_default && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        controle
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {m.model || "?"}
                    {m.pid ? ` · pid ${m.pid}` : ""} · {m.skills} skills
                    {m.description ? ` · ${m.description}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openLogs(m.name)}
                  >
                    <FileText className="h-4 w-4" /> Logs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => act(m.name, "restart")}
                    disabled={busy === `${m.name}:restart`}
                  >
                    {busy === `${m.name}:restart` ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <RotateCw className="h-4 w-4" />
                    )}{" "}
                    Reiniciar
                  </Button>
                  {m.running ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => act(m.name, "stop")}
                      disabled={m.is_default || busy === `${m.name}:stop`}
                      title={m.is_default ? "O profile de controle não pode ser parado aqui" : ""}
                    >
                      Parar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => act(m.name, "start")}
                      disabled={busy === `${m.name}:start`}
                    >
                      Subir
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Logs panel */}
      {logsFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setLogsFor(null)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-lg bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-3">
              <span className="font-medium">Logs · {logsFor}</span>
              <Button variant="ghost" size="sm" onClick={() => setLogsFor(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <pre className="overflow-auto whitespace-pre-wrap p-3 text-xs leading-relaxed">
              {logText}
            </pre>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
