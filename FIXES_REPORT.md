# Relatório de Correções — Exaustão de Recursos & Isolamento de Testes

**Data:** 2026-07-21
**Branch:** `fix/resource-exhaustion-guards`
**Motivação:** Um usuário (Bruno) relatou que o Mangaba Agent **travou o Windows inteiro** durante uma conversa. A investigação da causa raiz revelou uma classe de bug — *exaustão de recursos sem limites* — presente em vários subsistemas. Este relatório documenta os quatro vetores corrigidos e os bugs de infraestrutura de teste descobertos no caminho.

---

## Resumo Executivo

| # | Correção | Arquivo(s) | Severidade | Commit |
|---|----------|-----------|-----------|--------|
| 1 | Hard-stop de loop de ferramentas ligado por padrão | `agent/tool_guardrails.py`, `mangaba_cli/config.py` | 🔴 Alta | `ca397ac` |
| 2 | Cap de sessões de browser simultâneas | `tools/browser_tool.py` | 🔴 Alta | `ca397ac` |
| 3 | Cap real de processos de background concorrentes | `tools/process_registry.py` | 🔴 Alta | `3e77e45` |
| 4 | Paralelismo do cron limitado por padrão | `cron/scheduler.py`, `mangaba_cli/config.py` | 🔴 Alta | `cd23bbc` |
| 5 | Correção de isolamento de testes (import + patch targets) | ~135 arquivos de teste | 🟡 Média | `e386074` |

**Total:** 145 arquivos alterados, +1049 / −788 linhas. Todos os fixes validados por testes antes de cada commit; falhas remanescentes confirmadas como **pré-existentes** (não regressões).

---

## Contexto: a classe de bug

Todos os quatro vetores compartilham o mesmo padrão perigoso:

> Um recurso caro (processo, thread, sessão de navegador, agente completo) é **criado sob demanda sem um teto**, e a limpeza é **preguiçosa** (só por timeout de inatividade ou no encerramento do processo).

Quando um modelo entra em loop, ou quando muitos gatilhos disparam de uma vez (ex.: máquina acorda de suspensão), esses recursos se acumulam mais rápido do que são liberados — até esgotar RAM/CPU e **travar a máquina inteira** (no Windows, o *swap thrashing* congela todo o sistema, não só o app).

---

## 1. Hard-stop de loop de ferramentas (`ca397ac`)

**Problema.** O guardrail de loop de ferramentas (`agent/tool_guardrails.py`) tinha `hard_stop_enabled = False` por padrão. Nesse modo ele apenas **avisava em texto** ("isso parece um loop") mas **nunca bloqueava** de fato a execução. Um modelo que ignorasse o aviso podia repetir indefinidamente uma chamada que falha (`browser_navigate`, `terminal`, …) ao longo dos turnos, sem nada impedindo — até `agent.max_turns` (90 por padrão).

```python
# antes — before_call() sempre retornava "allow"
if not self.config.hard_stop_enabled:
    return ToolGuardrailDecision(...)  # nunca bloqueia
```

**Correção.** Default de `hard_stop_enabled` mudado para `True` no dataclass e no `DEFAULT_CONFIG`. Agora, após os limiares (5 falhas idênticas / 8 falhas do mesmo tool / 5 repetições sem progresso), a **próxima chamada é bloqueada** de verdade. Quem quiser o comportamento antigo (só avisos) define `tool_loop_guardrails.hard_stop_enabled: false`.

**Testes.** `tests/agent/test_tool_guardrails.py` (14 casos), `tests/run_agent/test_tool_call_guardrail_runtime.py` (8 casos) — 22/22 passando.

---

## 2. Cap de sessões de browser (`ca397ac`)

**Problema.** `_get_session_info()` em `tools/browser_tool.py` criava **uma sessão nova (um processo Chromium) por `task_id` distinto**, sem limite algum. `_active_sessions` era um dict sem teto. A única limpeza acontecia no `atexit` do processo ou após **300s de inatividade** — nenhuma das duas dispara *durante* um loop ativo. Vários subagentes em paralelo, ou um modelo em loop, podiam empilhar Chromiums até esgotar a RAM.

**Correção.** Nova constante `BROWSER_MAX_CONCURRENT_SESSIONS` (default 6, ajustável via env var). `_get_session_info()` levanta `RuntimeError` claro quando o teto é atingido, orientando a fechar/reusar sessões existentes. Reusar um `task_id` já ativo continua permitido.

**Testes.** `tests/tools/test_browser_session_cap.py` (3 casos novos) + suíte de browser existente — passando.

---

## 3. Cap real de processos de background (`3e77e45`)

**Problema.** `tools/process_registry.py` declarava `MAX_PROCESSES = 64` com a intenção de limitar processos concorrentes, mas isso era **falso**. O `_prune_if_needed()` só removia sessões **terminadas**:

```python
# só poda se houver sessões finished — se as 64 estão RODANDO, não faz nada
if total >= MAX_PROCESSES and self._finished:
```

Se todas as sessões rastreadas estivessem *rodando* (`self._finished` vazio), nada era podado e `spawn_local`/`spawn_via_env` adicionavam incondicionalmente a `self._running` — **sem rejeição**. Um modelo em loop em `terminal(background=True)` ou `process(action="spawn")` podia subir processos ilimitados, cada um com um login shell + thread leitora.

**Correção.** Nova constante `MAX_RUNNING_PROCESSES` (default 32, via `MANGABA_MAX_BACKGROUND_PROCESSES`) aplicada por `_assert_capacity()` no início de ambos os métodos de spawn. Conta apenas sessões **não-terminadas** (uma sessão finished-mas-não-reaped nunca bloqueia um spawn novo). O `terminal_tool` já envolve o spawn em `try/except`, então o `RuntimeError` chega ao modelo como um erro limpo pedindo para parar/matar processos existentes.

**Testes.** `tests/tools/test_process_registry.py` (3 casos novos) — passando.

---

## 4. Paralelismo do cron limitado (`cd23bbc`)

**Problema.** O tick do cron rodava jobs devidos com `ThreadPoolExecutor(max_workers=None)` quando `max_parallel_jobs` estava unset/null (o **default de fábrica**) — ou seja, ilimitado até `min(32, cpu+4)`. Cada job dispara um `AIAgent` completo, que por sua vez pode spawnar browser/terminal/subagentes. O log literalmente registrava `"unbounded"`.

**Gatilho realista.** Um laptop acorda de suspensão → todos os jobs atrasados ficam "due" no mesmo tick → dezenas de agentes pesados disparam de uma vez → freeze.

**Correção.** Semântica redefinida de forma segura:

| Valor de `max_parallel_jobs` | Comportamento |
|---|---|
| N positivo | no máximo N jobs em paralelo |
| `0` | opt-in explícito para ilimitado |
| unset/null | **default seguro limitado** (`_DEFAULT_CRON_MAX_PARALLEL = 4`) |

Isso **protege usuários existentes** também: configs legadas escritas com o antigo `max_parallel_jobs: null` agora resolvem para o default limitado, em vez de ilimitado. Quem realmente quer ilimitado define `0`.

**Testes.** `tests/cron/test_scheduler.py` (3 casos novos: default limitado, null→limitado, `0`→ilimitado) — passando.

---

## 5. Isolamento de testes (`e386074`)

Descobertos no caminho ao rodar as suítes — dois bugs sistêmicos que faziam testes "passarem" testando a coisa errada, ou darem erro mascarado:

**5a. Bind de import pontilhado.** `import mangaba_agent.run_agent` (e `.cli`, `.mangaba_constants`, `.mangaba_state`, `.model_tools`, `.toolsets`, `.mcp_serve`, …) vincula **apenas o nome do pacote de topo**, não o leaf. Testes que depois usavam o leaf solto (`run_agent.X`, `mangaba_constants.X`, …) levantavam `NameError`, **derrubando módulos inteiros** — incluindo a fixture `autouse` `_fast_retry_backoff` em `tests/run_agent/conftest.py`, que quebrava **todos** os testes daquele diretório. Corrigido para `import a.b as b`.

**5b. Patch targets errados.** `patch("run_agent.X")` / `patch("cli.X")` / `patch("model_tools.X")` etc. miravam os **shims de raiz de uma linha** (`from mangaba_agent.X import *`), que são objetos de módulo **separados** do `mangaba_agent.X` real que o código executa. Os patches nunca interceptavam nada — os testes afetados rodavam inicialização real (carregando plugins, chamando APIs de provider ao vivo). Repontados para `patch("mangaba_agent.X.Y")`.

**Nota.** Falhas pré-existentes não relacionadas (file-lock do Windows, deps opcionais ausentes como `acp`, asserts de formato de path) foram **verificadas contra a árvore original** via `git stash` e deixadas intactas — não são regressões destas mudanças.

---

## Verificação

- Cada commit foi feito **somente após os testes do seu escopo passarem**.
- Para cada falha remanescente, comparei com o código original (`git stash` / `git show HEAD:`) para confirmar que já falhava antes — nenhuma regressão introduzida.
- Vetores adjacentes **verificados como já seguros** (não precisaram de fix): `delegate_tool` (children capados, profundidade `[1,3]`), thread pools individuais (`max_workers` fixo), buffers de output (200KB rolling), `file_read_max_chars`.

## Variáveis de ambiente novas (escape hatches)

| Variável | Default | Efeito |
|---|---|---|
| `BROWSER_MAX_CONCURRENT_SESSIONS` | 6 | Máx. sessões de browser simultâneas |
| `MANGABA_MAX_BACKGROUND_PROCESSES` | 32 | Máx. processos de background concorrentes |
| `MANGABA_CRON_MAX_PARALLEL` | 4 (`0` = ilimitado) | Máx. jobs de cron em paralelo por tick |
| `tool_loop_guardrails.hard_stop_enabled` (config.yaml) | `true` | `false` volta a só-avisos |

---

*Relatório gerado após a sessão de correção de 2026-07-21. Branch `fix/resource-exhaustion-guards`, 4 commits, ainda não enviado (sem `push`).*
