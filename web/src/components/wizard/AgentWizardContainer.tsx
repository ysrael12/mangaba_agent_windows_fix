import { useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { useAgentDraft } from "@/contexts/useAgentDraft";
import { SLIDE_DEFS } from "./slideDefs";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

interface Props {
  /** Chamado quando o usuário confirma o último slide. */
  onComplete: () => void;
}

// Motor do stepper — lê `currentSlide` do AgentDraftContext, renderiza um
// slide por vez em tela cheia (uma decisão por vez) com transição horizontal
// direcional, e expõe a navegação global Voltar/Avançar.
export function AgentWizardContainer({ onComplete }: Props) {
  const { draft, currentSlide, goNext, goBack, goToSlide } = useAgentDraft();
  const reduce = useReducedMotion();

  // Direção da transição: 1 = avançando (desliza da direita), -1 = voltando.
  const prevSlideRef = useRef(currentSlide);
  const direction = currentSlide >= prevSlideRef.current ? 1 : -1;
  prevSlideRef.current = currentSlide;

  const total = SLIDE_DEFS.length;
  const activeDef = SLIDE_DEFS[currentSlide - 1];
  const isLast = currentSlide === total;
  const canAdvance = activeDef.isValid(draft);
  const SlideBody = activeDef.Component;

  const handleAdvance = () => {
    if (!canAdvance) return;
    if (isLast) {
      onComplete();
      return;
    }
    goNext();
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-8 px-4 py-6">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-3" role="tablist" aria-label="Passos do wizard">
        {SLIDE_DEFS.map((def) => {
          const isActive = def.id === currentSlide;
          const isDone = def.id < currentSlide;
          return (
            <button
              key={def.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={def.title}
              title={def.title}
              onClick={() => isDone && goToSlide(def.id)}
              disabled={!isDone}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                isActive && "w-8 bg-primary",
                isDone && "w-2 cursor-pointer bg-primary/60 hover:bg-primary/80",
                !isActive && !isDone && "w-2 bg-border",
              )}
            />
          );
        })}
      </div>

      {/* Slide content */}
      <div className="relative min-h-[600px] flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeDef.id}
            initial={reduce ? false : { opacity: 0, x: 40 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -40 * direction }}
            transition={{ duration: 0.28, ease: EASE }}
            className="absolute inset-0 flex flex-col gap-4"
          >
            {!activeDef.hideHeader && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  Passo {activeDef.id} de {total}
                </span>
                <h2 className="text-2xl font-semibold text-text-primary">{activeDef.title}</h2>
                <p className="text-sm text-text-secondary">{activeDef.description}</p>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card">
              <SlideBody />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between border-t border-border/60 pt-4">
        <Button
          outlined
          onClick={goBack}
          disabled={currentSlide === 1}
          prefix={<ChevronLeft className="h-4 w-4" />}
        >
          Voltar
        </Button>
        <Button
          onClick={handleAdvance}
          disabled={!canAdvance}
          prefix={isLast ? <Check className="h-4 w-4" /> : undefined}
          suffix={isLast ? undefined : <ChevronRight className="h-4 w-4" />}
        >
          {isLast ? "Concluir" : "Avançar"}
        </Button>
      </div>
    </div>
  );
}
