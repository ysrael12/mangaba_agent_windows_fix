// Agentes no Teams (Modelo A: 1 bot por agente). Lista os agentes (profiles) e,
// para cada um, configura credenciais Azure + porta, valida e mostra o endpoint.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, Copy, Radio, Trash2 } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Badge } from "@dheiver2/ui/ui/components/badge";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { H2 } from "@/components/NouiTypography";
import { Card, CardContent } from "@/components/ui/card";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import { api } from "@/lib/api";
import type { ProfileInfo } from "@/lib/api";

type TeamsState = { configured: boolean; port: number | null; tenant_id: string };

function AgentTeamsCard({ profile }: { profile: ProfileInfo }) {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [st, setSt] = useState<TeamsState | null>(null);
  const [open, setOpen] = useState(false);
  const [cid, setCid] = useState("");
  const [secret, setSecret] = useState("");
  const [tenant, setTenant] = useState("");
  const [validated, setValidated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [endpoint, setEndpoint] = useState<{ messaging_endpoint: string; port: number; note: string } | null>(null);

  const load = useCallback(() => {
    api.getProfileTeams(profile.name).then((r) => setSt({ configured: r.configured, port: r.port, tenant_id: r.tenant_id })).catch(() => {});
  }, [profile.name]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setValidated(false); }, [cid, secret, tenant]);

  const validate = async () => {
    setBusy(true);
    try {
      const r = await api.validateTeams(cid.trim(), secret.trim(), tenant.trim());
      if (r.ok) { setValidated(true); showToast("Credenciais válidas.", "success"); }
      else showToast(r.error || "Credenciais inválidas.", "error");
    } catch (e) { showToast(`Erro: ${(e as Error).message}`, "error"); }
    finally { setBusy(false); }
  };

  const connect = async () => {
    setBusy(true);
    try {
      const r = await api.connectProfileTeams(profile.name, cid.trim(), secret.trim(), tenant.trim());
      setEndpoint({ messaging_endpoint: r.messaging_endpoint, port: r.port, note: r.note });
      showToast(`Teams configurado (porta ${r.port}).`, "success");
      load();
    } catch (e) { showToast(`Erro: ${(e as Error).message}`, "error"); }
    finally { setBusy(false); }
  };

  const disconnect = async () => {
    if (!confirm(`Remover a configuração do Teams do agente "${profile.name}"?`)) return;
    await api.disconnectProfileTeams(profile.name);
    setEndpoint(null); setOpen(false); load();
  };

  const copy = (s: string) => { navigator.clipboard?.writeText(s); showToast("Copiado.", "success"); };

  return (
    <Card>
      <Toast toast={toast} />
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{profile.name}</span>
          {st?.configured ? (
            <Badge tone="secondary" className="text-xs">Teams configurado{st.port ? ` · porta ${st.port}` : ""}</Badge>
          ) : (
            <Badge tone="outline" className="text-xs">sem Teams</Badge>
          )}
          <div className="ml-auto flex gap-1">
            <Button outlined size="sm" onClick={() => navigate("/fleet")} prefix={<Radio className="h-3.5 w-3.5" />}>
              Iniciar
            </Button>
            {st?.configured && (
              <Button outlined size="sm" destructive onClick={disconnect} prefix={<Trash2 className="h-3.5 w-3.5" />}>
                Remover
              </Button>
            )}
            <Button size="sm" onClick={() => setOpen((v) => !v)}>
              {open ? "Fechar" : st?.configured ? "Reconfigurar" : "Conectar Teams"}
            </Button>
          </div>
        </div>

        {open && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">
              Cole as credenciais do app Azure deste agente (Client ID, Secret, Tenant ID).
            </p>
            <input value={cid} onChange={(e) => setCid(e.target.value)} placeholder="Client ID"
              className="rounded-md border border-input bg-background px-3 py-2 font-mono-ui text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Client Secret"
              className="rounded-md border border-input bg-background px-3 py-2 font-mono-ui text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
            <input value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder="Tenant ID"
              className="rounded-md border border-input bg-background px-3 py-2 font-mono-ui text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
            <div className="flex items-center gap-2">
              <Button outlined size="sm" onClick={validate} disabled={busy || !cid.trim() || !secret.trim() || !tenant.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validar"}
              </Button>
              {validated && (
                <span className="inline-flex items-center gap-1 text-xs text-foreground">
                  <Check className="h-4 w-4 text-primary" /> válido
                </span>
              )}
              <Button size="sm" className="ml-auto" onClick={connect} disabled={busy || !validated}>
                Salvar
              </Button>
            </div>

            {endpoint && (
              <div className="flex flex-col gap-1 rounded-md border border-warning/40 bg-warning/5 p-2 text-xs">
                <span className="font-semibold text-foreground">Registre no Azure Bot (Messaging endpoint):</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded bg-background px-2 py-1 font-mono-ui">{endpoint.messaging_endpoint}</code>
                  <Button size="sm" outlined onClick={() => copy(endpoint.messaging_endpoint)} prefix={<Copy className="h-3 w-3" />}>Copiar</Button>
                </div>
                <span className="text-muted-foreground">{endpoint.note}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TeamsAgentsPage() {
  const { toast, showToast } = useToast();
  const [profiles, setProfiles] = useState<ProfileInfo[] | null>(null);

  const load = useCallback(() => {
    api.getProfiles().then((r) => setProfiles(r.profiles)).catch((e) => showToast(`Erro: ${e}`, "error"));
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex w-full max-w-full flex-col gap-4 p-1">
      <Toast toast={toast} />
      <div className="flex items-center gap-2">
        <Radio className="h-5 w-5" />
        <H2>Agentes no Teams</H2>
      </div>
      <p className="text-sm text-muted-foreground">
        Modelo "1 bot por agente" (padrão Copilot Studio): cada agente vira um app no Microsoft Teams.
        Configure as credenciais Azure de cada agente, registre o endpoint no Azure Bot e inicie o agente
        (em <button className="underline" onClick={() => location.assign("/fleet")}>Frota</button>).
        Setup do Azure: veja <code className="rounded bg-muted px-1">scripts/deploy/teams.md</code>.
      </p>

      {profiles === null ? (
        <div className="flex justify-center py-16"><Spinner className="text-2xl text-primary" /></div>
      ) : profiles.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhum agente. Crie em Perfis ou instale um agente pronto.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {profiles.map((p) => (
            <AgentTeamsCard key={p.name} profile={p} />
          ))}
        </div>
      )}
    </div>
  );
}
