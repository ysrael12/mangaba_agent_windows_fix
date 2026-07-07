import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  MessageSquare,
  Plus,
  Rocket,
} from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { AgentDraftProvider } from "@/contexts/AgentDraftProvider";
import { useAgentDraft } from "@/contexts/useAgentDraft";
import { AgentWizardContainer } from "@/components/wizard/AgentWizardContainer";

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
            Agente criado com sucesso!
          </h1>
          <p className="text-sm text-text-secondary">
            Seu agente já está pronto. Escolha o que fazer agora.
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
            Ir para o Dashboard do Agente
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
            Criar Novo Agente
          </Button>
        </div>
      </div>
    </div>
  );
}

function WizardWithNavigation() {
  const [deployed, setDeployed] = useState(false);

  if (deployed) return <DeployMenu />;

  return (
    <AgentWizardContainer
      onComplete={() => {
        setDeployed(true);
      }}
    />
  );
}

export default function AgentWizardPage() {
  return (
    <AgentDraftProvider>
      <WizardWithNavigation />
    </AgentDraftProvider>
  );
}
