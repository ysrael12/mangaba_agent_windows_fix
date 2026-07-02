# Log de testes — Mangaba Agent via gateway (`walton-undepreciatory-tracee.ngrok-free.dev`)

**Data:** 2026-06-30
**Ambiente:** Windows 11 nativo (Git Bash/MSYS2, `MINGW64_NT-10.0-26200`)
**Objetivo:** validar, de ponta a ponta, o caminho `MANGABA_PROVIDER=gateway` do `bootstrap.sh` (ver `docs/plans/2026-06-30-mangaba-model-selection-and-bootstrap.md`), rodando o Mangaba Agent contra o gateway próprio em vez de Ollama local.

---

## 1. Setup

```bash
MANGABA_PROVIDER=gateway \
MANGABA_GATEWAY_URL=https://walton-undepreciatory-tracee.ngrok-free.dev \
BOOTSTRAP_NO_CHANNELS=true SKIP_BROWSER=true \
./bootstrap.sh
```

Resultado: **exit code 0**, terminou os 5 passos (pulou Ollama, como esperado). No caminho, dois bugs de compatibilidade Windows do `bootstrap.sh` foram encontrados e corrigidos (não relacionados ao gateway em si — travavam qualquer execução nativa em Windows):

1. `source .venv/bin/activate` — no Windows o `uv venv` cria `.venv/Scripts/activate`, não `.venv/bin/activate`. Corrigido para detectar o layout certo.
2. `python3 - ...` para escrever o `config.yaml` — no Windows, `python3` no PATH resolve para o stub falso da Microsoft Store (App Execution Alias), não para o Python real do venv. Corrigido para resolver o interpretador por caminho absoluto (`.venv/Scripts/python.exe`).

`config.yaml` final gerado em `~/.mangaba/`:

```yaml
model:
  provider: custom
  base_url: https://walton-undepreciatory-tracee.ngrok-free.dev/v1
  api_key: x
  default: mangaba-vision-q8
custom_providers:
  - name: mangaba-gateway
    base_url: https://walton-undepreciatory-tracee.ngrok-free.dev/v1
    api_key: x
    discover_models: true
    default_model: mangaba-vision-q8
```

Saúde do gateway no momento dos testes (`GET /api/v1/health`):

```json
{"status":"ok","loaded_models":["mangaba-lite-q4","mangaba-pro"],
 "pool":[{"slug":"mangaba-lite-q4","cost_gb":3.5,"ready":true},
         {"slug":"mangaba-pro","cost_gb":6.4,"ready":true}],
 "used_gb":9.9,"budget_gb":11.0,"total_models":4}
```

---

## 2. Testes diretos no gateway (chamadas cruas, sem o agente Mangaba)

Confirma que o endpoint `/v1/chat/completions` funciona corretamente de forma isolada.

### 2.1 Pergunta simples — `mangaba-vision-q8`

**Request:** `{"model":"mangaba-vision-q8","messages":[{"role":"user","content":"Responda em uma frase curta: qual é a capital do Brasil?"}],"max_tokens":100}`

- 1ª tentativa: `HTTP 503` (modelo não estava carregado no pool — cold-swap; ver §1, `loaded_models` não incluía `vision-q8`)
- 2ª tentativa (após o load): **`HTTP 200`**

**Resposta:** `"A capital do Brasil é Brasília."`
**Uso:** `prompt_tokens=27, completion_tokens=7, total_tokens=34`

### 2.2 Com `tools` + `tool_choice=auto` — `mangaba-lite-q4`

**Request:** mensagem simples + 1 função dummy (`todo`) declarada em `tools`.

**Resposta:** `HTTP 200` → `"Oi!"` — **`prompt_tokens=10, completion_tokens=2, total_tokens=12`**. Presença de schema de tools sozinha não quebra a resposta.

### 2.3 Com `system` + `user` — `mangaba-lite-q4`

**Request:** `system: "Você é um assistente útil chamado Mangaba."` + pergunta.

**Resposta:** `HTTP 200` → `"Olá! Como posso ajudar você hoje?"` — **`prompt_tokens=22, completion_tokens=8, total_tokens=30`**. Mensagem de sistema curta sozinha também não quebra.

**Conclusão da seção 2:** o gateway responde corretamente a chamadas OpenAI-compatíveis simples, com `usage` real e latência aceitável (depois do cold-load).

---

## 3. Testes via CLI completo do Mangaba (agente real, contra o gateway configurado)

### 3.1 `mangaba -z "..."` com toolset padrão (`mangaba-cli`, ~40 ferramentas)

```bash
mangaba -z "Em uma frase: quem é você e qual modelo está te rodando?"
```

**Resultado:** falha imediata, sem sequer chamar o modelo:

```
API call failed after 3 retries: HTTP 500: Error code: 500 -
{'detail': 'Requested tokens (13069) exceed context window of 8192'}
```

O system prompt completo do Mangaba + schemas de todas as ferramentas do toolset padrão somam **13069 tokens**, mas o modelo por trás do gateway está servido com **janela de contexto de apenas 8192 tokens** — bem abaixo do "≥64K de contexto nativo" que o README (`Modelo local: escolha pela sua RAM`) documenta como requisito mínimo para o agente usar ferramentas.

### 3.2 `mangaba chat -q "..." --toolsets todo` (toolset mínimo, cabe no contexto) — `mangaba-vision-q8`

```bash
mangaba chat -q "Diga oi em 3 palavras" --toolsets todo
```

**Resultado:** sem erro de contexto desta vez, mas:

```
⚠️ Resposta vazia do modelo — tentando de novo (1/3)
⚠️ Resposta vazia do modelo — tentando de novo (2/3)
⚠️ Resposta vazia do modelo — tentando de novo (3/3)
❌ O modelo não retornou conteúdo após todas as tentativas. Nenhum provedor reserva configurado.
```

Sessão `20260630_220315_b8c401` — `input_tokens=0, output_tokens=0` (a chamada nem chegou a registrar uso; o cliente descartou a resposta vazia antes de contabilizar).

Confirmado em `~/.mangaba/logs/errors.log`:
```
[20260630_220315_b8c401] agent.conversation_loop: Empty response (no content or reasoning) — retry 1/3 (model=mangaba-vision-q8)
... retry 2/3 ... retry 3/3 ...
Empty response (no content or reasoning) after 3 retries. No fallback available. model=mangaba-vision-q8 provider=custom
```

### 3.3 Mesmo teste com `mangaba-lite-q4` (modelo só-chat, o que o README recomenda para agentes conversacionais)

```bash
mangaba chat -q "Diga oi em 3 palavras" --toolsets todo -m mangaba-lite-q4
```

**Resultado:** idêntico ao 3.2 — 3 tentativas, resposta vazia, sem fallback:
```
[20260630_220510_9cd214] agent.conversation_loop: Empty response ... model=mangaba-lite-q4 provider=custom
```

**Conclusão da seção 3:** com o toolset padrão, o agente completo nem chega a fazer a chamada (estoura o contexto de 8192 tokens antes de enviar). Com um toolset mínimo que cabe no contexto, a chamada é enviada mas o modelo devolve conteúdo vazio — em ambos os modelos testados (`vision-q8` e `lite-q4`), e nas duas primeiras seções (2.2 e 2.3) o mesmo tipo de payload (tools + system) funcionou isolado. Isso aponta para o **system prompt real e completo do Mangaba** (bem mais longo/estruturado que os testes isolados da seção 2) como gatilho mais provável — não o toolset em si, nem a simples presença de `tools`/`system`.

---

## 4. Resumo

| Teste | Camada | Modelo | Resultado |
|---|---|---|---|
| 2.1 Pergunta simples | Chamada crua | mangaba-vision-q8 | ✅ 200, resposta correta, usage real |
| 2.2 Com `tools` | Chamada crua | mangaba-lite-q4 | ✅ 200, resposta correta |
| 2.3 Com `system` | Chamada crua | mangaba-lite-q4 | ✅ 200, resposta correta |
| 3.1 Toolset padrão | Agente completo | mangaba-vision-q8 | ❌ HTTP 500 — contexto (13069 > 8192) |
| 3.2 Toolset mínimo | Agente completo | mangaba-vision-q8 | ❌ Resposta vazia (3 tentativas) |
| 3.3 Toolset mínimo | Agente completo | mangaba-lite-q4 | ❌ Resposta vazia (3 tentativas) |

**Setup do gateway (bootstrap.sh + config.yaml):** ✅ funciona corretamente, inclusive em Windows nativo depois das correções da seção 1.

**Gateway como backend do agente completo, hoje:** ❌ não utilizável em nenhum dos dois modelos testados. O problema não é a integração `provider: custom`/`discover_models` (a chamada HTTP crua sempre funcionou) — é a combinação (a) janela de contexto de 8192 tokens do modelo servido, menor que o system prompt + tools do Mangaba, e (b) resposta vazia mesmo quando o payload cabe no contexto.

## 5. Recomendação

- Não usar este gateway como padrão de `bootstrap.sh` (reforça a decisão já tomada na spec — opt-in, não default).
- Investigar do lado do servidor (fora deste repo) por que uma requisição com o system prompt real do Mangaba retorna conteúdo vazio quando chamadas isoladas com `tools`/`system` menores funcionam — meu melhor palpite é o tamanho/formato do prompt completo, mas não tenho acesso ao servidor para confirmar.
- Se o objetivo for usar este modelo/gateway com o Mangaba, ele precisaria de uma janela de contexto bem maior que 8192 (o próprio README já exige ≥64K para uso de ferramentas) antes de valer a pena revisitar.
