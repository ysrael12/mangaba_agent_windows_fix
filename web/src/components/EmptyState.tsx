import { useNavigate } from "react-router-dom";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Card, CardContent } from "@/components/ui/card";

// Estado vazio educativo: em vez de só "nada aqui", ensina o próximo passo
// com um botão de ação. Mantém o usuário na jornada.
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionPath,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
  onAction?: () => void;
}) {
  const navigate = useNavigate();
  const act = () => {
    if (onAction) onAction();
    else if (actionPath) navigate(actionPath);
  };
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="text-muted-foreground opacity-50">{icon}</div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        {actionLabel && (actionPath || onAction) && (
          <Button size="sm" onClick={act} className="mt-1">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
