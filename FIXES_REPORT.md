# Relatório de Correções — Exaustão de Recursos & Isolamento de Testes

**Data:** 2026-07-21
**Branch:** merged em `main`
**Motivação:** Um usuário (Bruno) relatou que o Mangaba Agent **travou o Windows inteiro** durante uma conversa. A investigação da causa raiz revelou uma classe de bug — *exaustão de recursos sem limites* — presente em vários subsistemas. Este relatório documenta os vetores corrigidos e os bugs de infraestrutura de teste descobertos no caminho.

---

## Resumo Executivo

| # | Correção | Arquivo(s) | Severidade | Commit |
|---|----------|-----------|-----------|--------|
| 1 | Hard-stop de loop de ferramentas ligado por padrão | `agent/tool_guardrails.py`, `mangaba_cli/config.py` | 🔴 Alta | `ca397ac` |
| 2 | Cap de sessões de browser simultâneas | `tools/browser_tool.py` | 🔴 Alta | `ca397ac` |
| 3 | Cap real de processos de background concorrentes | `tools/process_registry.py` | 🔴 Alta | `3e77e45` |
| 4 | Paralelismo do cron limitado por padrão | `cron/scheduler.py`, `mangaba_cli/config.py` | 🔴 Alta | `cd23bbc` |
| 5 | Correção de isolamento de testes (import + patch targets) | ~135 arquivos de teste | 🟡 Média | `e386074` |
| 6 | Cap de download de mídia recebida (anti-OOM) | `gateway/platforms/base.py` | 🔴 Alta | `642bfa8` |
| 7 | Cap de output de terminal foreground em memória | `tools/environments/base.py` | 🔴 Alta | `38c7ff2` |
| 8 | Guard contra decompression bomb de imagem | `tools/vision_tools.py` | 🔴 Alta | `756c05e` |
| 9 | Cap de buffer SSE dos adapters Gemini | `agent/gemini_native_adapter.py`, `agent/gemini_cloudcode_adapter.py` | 🟡 Média | `54544b4` |
| 10 | Depth guards de recursão (Slack blocks, schemas MCP) | `gateway/platforms/slack.py`, `tools/schema_sanitizer.py` | 🟡 Média | `597ca6d` |

**Total:** 10 correções ao longo de 10 commits (`ca397ac` → `597ca6d`), todas na `main`. Cada fix validado por testes antes de cada commit; falhas remanescentes confirmadas como **pré-existentes** (não regressões) via comparação com a árvore original (`git stash`).

---

## Contexto: a classe de bug

Todos os vetores compartilham o mesmo padrão perigoso:

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

## 6. Download de mídia recebida sem limite de tamanho (`642bfa8`)

**Problema.** `cache_image_from_url` / `cache_audio_from_url` (`gateway/platforms/base.py`) faziam buffer do corpo HTTP inteiro na RAM via `response.content`, **sem cap**. URLs de mídia são **controladas pelo atacante** em toda plataforma (WhatsApp, Signal, Telegram, Feishu, Discord…). Uma URL apontando pra arquivo de vários GB — ou um servidor que omite/mente o `Content-Length` — estourava a memória do host a partir de **uma única mensagem recebida**.

**Correção.** Novo `_download_capped()`: faz streaming via `client.stream()` e aborta se o `Content-Length` declarado **ou** a contagem de bytes em andamento passar de `_MAX_MEDIA_BYTES` (default 50 MB, via `MANGABA_MAX_MEDIA_DOWNLOAD_MB`). O cap é resolvido do global em call time (env override e testes fazem efeito). Semântica de retry preservada: o `ValueError` de tamanho não é capturado pela cláusula de retry timeout/HTTP, então falha rápido em vez de tentar de novo.

**Testes.** `tests/gateway/test_media_download_retry.py` — 39/39 (retry/SSRF migrados para o mock de streaming + 3 casos novos de cap).

---

## 7. Output de terminal foreground sem cap em memória (`38c7ff2`)

**Problema.** `_wait_for_process` (`tools/environments/base.py`) drenava o stdout do comando fazendo `output_chunks.append(...)` numa lista **ilimitada** até o processo sair ou dar timeout (180s). Um comando de alto volume (`yes`, `cat /dev/zero | base64`, `find /`, loop de print) acumulava GB na RAM durante a janela de timeout. A truncação de exibição (`tool_output.max_bytes`) só se aplicava **depois** — o buffer completo já estava na memória. Model-reachable (o terminal é uma das ferramentas mais usadas).

**Correção.** `_MAX_CAPTURE_CHARS` (default 20 MB, via `MANGABA_MAX_TERMINAL_CAPTURE_MB`) aplicado por um helper `_capture()` no loop de dreno. Ao atingir o cap, **continua lendo o pipe** (pra não bloquear o processo num pipe cheio e travar) mas para de armazenar e marca truncado; um aviso é anexado à saída. Vale tanto no caminho POSIX (`select`) quanto Windows (`os.read`). Alinha o terminal com o padrão que o `code_execution_tool` já usava.

**Testes.** `tests/tools/test_base_environment.py` — 2 casos novos (output alto capado; output pequeno intacto) com subprocess real.

---

## 8. Decompression bomb de imagem (`756c05e`)

**Problema.** `_resize_image_for_vision` (`tools/vision_tools.py`) abria a imagem e chamava `convert()`/`resize()`/`save()`, cada um forçando o **decode completo** dos pixels. Um bitmap RGB custa `width*height*3` bytes independente do tamanho comprimido, então uma imagem muito comprimida (decompression bomb) ou uma foto de celular enorme — ambas attacker-controlled — alocavam centenas de MB antes do resize encolher. O guard nativo do Pillow só **avisa** entre ~89 MP e ~178 MP.

**Correção.** `_MAX_DECODE_PIXELS` (default 40 MP, via `MANGABA_MAX_IMAGE_PIXELS`) checado contra `img.size` (lido do header, **sem** decode). Acima do cap: JPEG usa `draft()` do Pillow pra decodificar em resolução reduzida (1/2^n, barato e low-memory); formatos não-draftáveis (PNG etc.) pulam o resize e caem no size-check do chamador em vez de arriscar decode completo.

**Testes.** `tests/tools/test_vision_tools.py` — 2 casos novos (JPEG grande via draft; PNG grande defere).

---

## 9. Buffer SSE dos adapters Gemini sem limite (`54544b4`)

**Problema.** `_iter_sse_events` nos dois adapters Gemini acumula chunks num `buffer` e só o drena em newlines. Um upstream que nunca manda `\n` (endpoint comprometido, proxy que corrompe a stream) faria o buffer crescer sem limite, esgotando memória no meio do stream.

**Correção.** Guard de 10 MB por linha (muito além de qualquer linha SSE legítima, que é um token ou dois) que aborta o stream limpo se excedido.

**Testes.** `tests/agent/test_gemini_native_adapter.py` — 2 casos novos (stream normal; stream sem newline aborta sem OOM).

---

## 10. Recursão sem depth guard em árvores de input (`597ca6d`)

**Problema.** Dois walkers recursivos não tinham limite de profundidade → um input muito aninhado recursava além do stack do Python e levantava `RecursionError`, derrubando o chamador:
- `slack.py` `_extract_text_from_slack_blocks` / `_sanitize` andam sobre blocks `rich_text` recebidos — attacker-controlled (qualquer um num canal do bot). Mensagem com quotes/listas aninhadas milhares de níveis crashava o handler.
- `schema_sanitizer.py` — os dois `_walk` recursam em schemas de ferramenta, que podem vir de servidores MCP conectados pelo usuário.

**Correção.** Caps `_MAX_SLACK_BLOCK_DEPTH` (64) e `_MAX_SCHEMA_DEPTH` (200), muito além de qualquer nesting legítimo; ao atingir, trunca em vez de crashar.

**Testes.** `tests/gateway/test_slack.py` + `tests/tools/test_schema_sanitizer.py` — casos novos com aninhamento de 5000 níveis confirmando ausência de crash.

---

## Verificação

- Cada commit foi feito **somente após os testes do seu escopo passarem**.
- Para cada falha remanescente, comparei com o código original (`git stash` / `git show HEAD:`) para confirmar que já falhava antes — nenhuma regressão introduzida.
- Vetores adjacentes **verificados como já seguros** (não precisaram de fix): `delegate_tool` (children capados, profundidade `[1,3]`), thread pools individuais (`max_workers` fixo), buffers de output do `process_registry`/`code_execution_tool` (rolling), `api_server` (MAX_STORED_RESPONSES, MAX_REQUEST_BYTES, sweep de runs órfãos), `email` (`_trim_seen_uids`), `file_read_max_chars`, `web_tools` (trunca output, fetch via backends).

## Variáveis de ambiente novas (escape hatches)

| Variável | Default | Efeito |
|---|---|---|
| `BROWSER_MAX_CONCURRENT_SESSIONS` | 6 | Máx. sessões de browser simultâneas |
| `MANGABA_MAX_BACKGROUND_PROCESSES` | 32 | Máx. processos de background concorrentes |
| `MANGABA_CRON_MAX_PARALLEL` | 4 (`0` = ilimitado) | Máx. jobs de cron em paralelo por tick |
| `MANGABA_MAX_MEDIA_DOWNLOAD_MB` | 50 | Máx. tamanho de mídia recebida baixada |
| `MANGABA_MAX_TERMINAL_CAPTURE_MB` | 20 | Máx. output de terminal foreground bufferizado |
| `MANGABA_MAX_IMAGE_PIXELS` | 40000000 | Máx. pixels decodificados no resize de imagem |
| `tool_loop_guardrails.hard_stop_enabled` (config.yaml) | `true` | `false` volta a só-avisos |

Caps sem env var (constantes de código): buffer SSE Gemini (10 MB/linha), profundidade de blocks Slack (64), profundidade de schema MCP (200).

---

*Relatório gerado após a sessão de correção de 2026-07-21. Todas as 10 correções na `main` (`ca397ac` → `597ca6d`), ainda não enviadas ao remoto (sem `push`).*
