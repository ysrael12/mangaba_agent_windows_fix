import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Loader2,
  MessageSquare,
  Plus,
  Rocket,
} from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { AgentDraftProvider } from "@/contexts/AgentDraftProvider";
import { useAgentDraft } from "@/contexts/useAgentDraft";
import { AgentWizardContainer } from "@/components/wizard/AgentWizardContainer";
import { api } from "@/lib/api";

const AGENT_ID = "default";

function DeployMenu() {
  const navigate = useNavigate();
  const { reset } = useAgentDraft();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
          <Rocket className="h-8 w-8" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-text-primary">
            Funcionário criado com sucesso!
          </h1>
          <p className="text-sm text-text-secondary">
            Seu funcionário agêntico já está pronto. Escolha o que fazer agora.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button
            size="md"
            className="w-full justify-start gap-3 px-5 py-6 text-base"
            onClick={() =>
              navigate(`/dashboard/agent/${AGENT_ID}`, { replace: true })
            }
            prefix={<Bot className="h-5 w-5" />}
          >
            Ir para o Dashboard do Funcionário
          </Button>

          <Button
            size="md"
            className="w-full justify-start gap-3 px-5 py-6 text-base"
            onClick={() =>
              navigate(`/dashboard/agent/${AGENT_ID}`, { replace: true })
            }
            prefix={<MessageSquare className="h-5 w-5" />}
          >
            Iniciar uma Conversa
          </Button>

          <Button
            size="md"
            outlined
            className="w-full justify-start gap-3 px-5 py-6 text-base"
            onClick={() => {
              reset();
            }}
            prefix={<Plus className="h-5 w-5" />}
          >
            Criar Novo Funcionário
          </Button>
        </div>
      </div>
    </div>
  );
}

function WizardWithNavigation() {
  const { draft } = useAgentDraft();
  const [deployed, setDeployed] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  // AgentWizardContainer's onComplete is fire-and-forget (`() => void`), so
  // nothing there stops a second click from firing a second deploy request
  // while the first is in flight. Guard re-entrancy with a ref (synchronous,
  // unlike state) in addition to disabling interaction via the overlay below.
  const deployingRef = useRef(false);

  const handleComplete = useCallback(async () => {
    if (deployingRef.current) return;
    deployingRef.current = true;

    const { creator_info } = draft;
    const creatorLines: string[] = [];
    if (creator_info.name) creatorLines.push(`Criador: ${creator_info.name}`);
    if (creator_info.role) creatorLines.push(`Função: ${creator_info.role}`);
    if (creator_info.context) creatorLines.push(`Contexto: ${creator_info.context}`);
    const creatorSuffix = creatorLines.length > 0 ? "\n\n" + creatorLines.join("\n") : "";

    setDeploying(true);
    setDeployError(null);
    try {
      await api.deployAgent({
        name: "default",
        soul: draft.identity.soul + creatorSuffix,
        model: draft.model_config.model,
        provider: draft.model_config.provider,
      });
      setDeployed(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar funcionário agêntico";
      setDeployError(msg);
    } finally {
      setDeploying(false);
      deployingRef.current = false;
    }
  }, [draft]);

  if (deployed) return <DeployMenu />;

  return (
    <>
      {deployError && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg">
          {deployError}
        </div>
      )}
      {deploying && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-text-secondary">Publicando funcionário agêntico…</p>
        </div>
      )}
      <AgentWizardContainer
        onComplete={handleComplete}
      />
    </>
  );
}

export default function AgentWizardPage() {
  return (
    <AgentDraftProvider>
      <WizardWithNavigation />
    </AgentDraftProvider>
  );
}
