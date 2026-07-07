import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bot,
  MessageSquare,
  Plus,
  Rocket,
} from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { AgentDraftProvider } from "@/contexts/AgentDraftProvider";
import { useAgentDraft } from "@/contexts/useAgentDraft";
import { AgentWizardContainer } from "@/components/wizard/AgentWizardContainer";
import { canSee, useUserRole } from "@/lib/userRole";
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

function AgentWizardPageGuard() {
  const [role] = useUserRole();
  const [profiles, setProfiles] = useState<{ name: string }[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!canSee(role, "gestor")) {
      // Operador não pode criar
      setLoading(false);
      return;
    }
    void api.getProfiles().then((resp) => {
      if (!cancelled) {
        setProfiles(resp.profiles);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [role]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  // Operador tentando criar agente
  if (!canSee(role, "gestor")) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              Criar agentes é um recurso avançado
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Por enquanto, você pode conversar com o agente padrão. Para criar agentes
              personalizados, troque para o perfil <strong>Dev</strong> no menu lateral.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 pt-2">
            <Button onClick={() => window.location.href = "/chat"} className="w-full">
              Voltar ao Chat
            </Button>
            <Button
              outlined
              onClick={() => window.location.href = "/home"}
              className="w-full"
            >
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Gestor/Dev normal — mostra wizard com dica se é o primeiro
  const isFirstProfile = !profiles || profiles.length === 0;

  return (
    <AgentDraftProvider>
      {isFirstProfile && (
        <div className="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            <strong>✨ Este é seu primeiro agente!</strong> Configure aqui a personalidade
            e capacidades. Depois você poderá criar mais variações.
          </p>
        </div>
      )}
      <WizardWithNavigation />
    </AgentDraftProvider>
  );
}

export default function AgentWizardPage() {
  return <AgentWizardPageGuard />;
}
