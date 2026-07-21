import { useCallback, useEffect, useRef, useState } from "react";
import { SendHorizonal, Loader2, Bot } from "lucide-react";
import { Button } from "@dheiver2/ui/ui/components/button";
import { Spinner } from "@dheiver2/ui/ui/components/spinner";
import { MANGABA_BASE_PATH } from "@/lib/api";
import { useAgentDraft } from "@/contexts/useAgentDraft";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type WsFrame =
  | { type: "delta"; text: string }
  | { type: "done"; text: string }
  | { type: "error"; text: string }
  | { type: "status"; text: string };

export function Slide2DryRun() {
  const { draft } = useAgentDraft();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const sendingRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const streamTextRef = useRef("");
  const pendingSendRef = useRef<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  }, [messages, status]);

  const connect = useCallback(() => {
    const token = window.__MANGABA_SESSION_TOKEN__;
    if (!token) return null;
    const scheme = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${scheme}//${location.host}${MANGABA_BASE_PATH}/api/chat?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("Pronto para conversar");
      if (pendingSendRef.current) {
        ws.send(pendingSendRef.current);
        pendingSendRef.current = null;
      }
    };
    ws.onclose = () => {
      if (!sendingRef.current) setStatus("Conexão fechada");
    };
    ws.onerror = () => setStatus("Erro de conexão");

    ws.onmessage = (ev) => {
      try {
        const frame: WsFrame = JSON.parse(ev.data);
        if (frame.type === "delta") {
          streamTextRef.current += frame.text;
          setMessages((prev) => {
            const next = [...prev];
            if (next.length > 0 && next[next.length - 1].role === "assistant") {
              next[next.length - 1] = { role: "assistant", text: streamTextRef.current };
            } else {
              next.push({ role: "assistant", text: streamTextRef.current });
            }
            return next;
          });
        } else if (frame.type === "done") {
          setMessages((prev) => {
            const next = [...prev];
            if (next.length > 0 && next[next.length - 1].role === "assistant") {
              next[next.length - 1] = { role: "assistant", text: frame.text };
            }
            return next;
          });
          setSending(false);
          sendingRef.current = false;
          setStatus(null);
          streamTextRef.current = "";
        } else if (frame.type === "error") {
          setMessages((prev) => prev.concat({ role: "assistant", text: `Erro: ${frame.text}` }));
          setSending(false);
          sendingRef.current = false;
          setStatus(null);
          streamTextRef.current = "";
        } else if (frame.type === "status") {
          setStatus(frame.text);
        }
      } catch { /* ignore */ }
    };

    return ws;
  }, []);

  const send = () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");

    let ws = wsRef.current;
    if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      ws = connect();
    }

    streamTextRef.current = "";
    setMessages((prev) => prev.concat({ role: "user", text }));
    setSending(true);
    sendingRef.current = true;
    setStatus("Aguardando resposta...");

    const hasCreator = draft.creator_info.name || draft.creator_info.role || draft.creator_info.context;
    const system = hasCreator
      ? `Você é um funcionário agêntico de IA genérico em fase de teste. Você não tem especialização própria — você apenas reflete as capacidades do modelo que está sendo testado.\n\nContexto sobre o usuário:\nNome: ${draft.creator_info.name}\nProfissão: ${draft.creator_info.role}\n\nO que ele está construindo: ${draft.creator_info.context}\n\nAjude ${draft.creator_info.name || "o usuário"} a testar e validar as escolhas do modelo para este novo funcionário agêntico.`
      : undefined;

    const payload = JSON.stringify({
      message: text,
      model: draft.model_config.model || undefined,
      provider: draft.model_config.provider || undefined,
      system,
    });

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    } else if (ws && ws.readyState === WebSocket.CONNECTING) {
      pendingSendRef.current = payload;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2">
        <Bot className="h-4 w-4 text-text-tertiary" />
        <span className="text-xs text-text-tertiary">
          {draft.creator_info.name
            ? `Criador: ${draft.creator_info.name}`
            : "Criador: anônimo"}
          {draft.model_config.model
            ? `  ·  ${draft.model_config.model}${draft.model_config.provider ? ` (${draft.model_config.provider})` : ""}`
            : ""}
        </span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !sending && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Bot className="h-10 w-10 text-text-tertiary" />
            <p className="text-base font-medium text-text-primary">Converse com o cérebro do funcionário agêntico</p>
            <p className="max-w-sm text-sm text-text-tertiary">
              Envie uma mensagem para conversar com o cérebro puro e validar as escolhas
              antes de finalizar a configuração.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "mr-auto bg-muted text-text-primary",
              )}
            >
              {msg.text}
            </div>
          ))}
          {status && (
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              {sending ? <Spinner className="h-3 w-3 shrink-0" /> : null}
              {status}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end gap-2 border-t border-border/60 px-4 py-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem…"
          rows={1}
          disabled={sending}
          className="min-h-[40px] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
        <Button
          onClick={send}
          disabled={!input.trim() || sending}
          size="icon"
          className="shrink-0"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
