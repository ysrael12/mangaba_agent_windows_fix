# Recomendações para o gateway Mangaba AI ir para produção

**Gateway avaliado:** `https://walton-undepreciatory-tracee.ngrok-free.dev`
**Base:** achados reais de `log.md` (testes de 2026-06-30) + inspeção do `/openapi.json`, `/api/v1/health`, `/api/v1/models`.

Este documento lista o que precisa mudar para esse gateway sair de "protótipo pessoal atrás de um túnel" para algo que o `bootstrap.sh`/Mangaba Agent possa apontar por padrão, com confiança.

---

## 1. Bloqueadores confirmados por teste (prioridade máxima)

### 1.1 Janela de contexto insuficiente (8192 tokens)

**Evidência:** o system prompt + schemas de ferramentas do Mangaba Agent (toolset padrão) soma ~13069 tokens. O gateway rejeitou com `HTTP 500: Requested tokens (13069) exceed context window of 8192`.

O próprio README do Mangaba documenta **≥64K de contexto nativo como requisito mínimo** para um modelo poder usar ferramentas (`Modelo local: escolha pela sua RAM`). 8192 está muito abaixo disso — nenhum agente com tools cabe.

**Recomendação:**
- Servir os modelos com contexto ≥64K (idealmente 128K). Isso é uma configuração do servidor de inferência (`n_ctx`/`max_model_len`/equivalente), não do modelo em si — os modelos-base (Qwen3 etc.) já suportam essa faixa nativamente ou via rope-scaling.
- Se a RAM/VRAM do M4 não aguenta 128K de KV-cache para 4 modelos simultâneos, considere contexto quantizado (KV-cache Q8/Q4) — reduz o custo de memória por token sem trocar o modelo.
- Documentar o contexto real de cada slug em `/api/v1/models` (campo que hoje não existe na resposta — ver §3.1).

### 1.2 Resposta vazia com o system prompt real do Mangaba

**Evidência:** com um toolset mínimo que cabe nos 8192 tokens, a chamada é aceita (sem erro HTTP), mas o modelo devolve conteúdo vazio 3 vezes seguidas — em `mangaba-vision-q8` **e** `mangaba-lite-q4`. Testes isolados com `system` curto e com `tools` (seções 2.2/2.3 do `log.md`) funcionaram normalmente, então o gatilho não é a presença desses campos — é algo específico do tamanho/formato do prompt real (várias seções, instruções longas, possivelmente formatação Markdown pesada).

**Recomendação:**
- Reproduzir esse caso especificamente: pegar um system prompt de ~3-5K tokens com estrutura similar (múltiplas seções, listas, instruções aninhadas) e testar contra o backend de inferência isolado (fora do proxy do gateway) para ver se o problema é no serving (ex.: template de chat mal aplicado, truncamento silencioso, EOS emitido cedo demais) ou no proxy do gateway.
- Garantir que o gateway propague `finish_reason` de forma confiável — se o modelo está batendo em algum limite (ex.: `max_tokens` efetivo menor que o anunciado, ou o prompt sendo truncado por dentro), isso deveria aparecer como `finish_reason: "length"` ou um erro claro, nunca como conteúdo vazio silencioso com `finish_reason: "stop"`.
- Adicionar logging server-side do prompt renderizado final (após aplicar o chat template) para os primeiros N e últimos N tokens — hoje é impossível diagnosticar isso de fora sem acesso ao servidor.

### 1.3 Cold-swap gera 503 em vez de fila/espera

**Evidência:** a primeira chamada a `mangaba-vision-q8` (não estava em `loaded_models`) voltou `HTTP 503`; a segunda, já carregado, voltou `200`. Isso quebra qualquer cliente que trate 503 como falha definitiva em vez de "tentar de novo".

**Recomendação:**
- Ao receber uma requisição para um modelo não carregado, o gateway deveria **segurar a conexão e responder depois do load** (comportamento comum em servidores de inferência com swap dinâmico), em vez de devolver 503 imediatamente.
- Se segurar a conexão não for viável, retornar `503` com header `Retry-After` e um corpo de erro no formato OpenAI (`{"error": {"message": ..., "type": "model_not_ready", ...}}`), para que clientes OpenAI-compatíveis (inclusive o próprio Mangaba) saibam que é transitório e possam re-tentar automaticamente.

---

## 2. Infraestrutura e disponibilidade

### 2.1 Sair do ngrok free tier

**Evidência:** hostname `*.ngrok-free.dev` — domínio efêmero, sem SLA, sujeito a mudar a cada restart do túnel; sem autenticação visível nos endpoints inspecionados.

**Recomendação:**
- Migrar para um domínio próprio com DNS estável, atrás de HTTPS com certificado real (Let's Encrypt/Cloudflare), ou no mínimo um ngrok pago com domínio reservado (`ngrok-static-domain`) como passo intermediário.
- Não depender de um único laptop pessoal (Apple M4) como host de produção — um reboot, atualização de SO, ou a máquina simplesmente dormir tira o serviço do ar sem aviso. Para produção, mover para uma máquina/instância dedicada (mini PC sempre ligado, servidor cloud com GPU, ou Mac mini/Studio dedicado exclusivamente a isso).

### 2.2 Orçamento de memória insuficiente para o pool anunciado

**Evidência:** `/api/v1/health` mostra `budget_gb: 11.0` para 4 modelos (`mangaba-max`, `mangaba-pro`, `mangaba-vision-q8`, `mangaba-lite-q4`), com apenas 2 carregados por vez (`used_gb: 9.9/11.0`). Isso significa hot-swap constante e latência de cold-load imprevisível para metade do catálogo anunciado.

**Recomendação:**
- Ou reduzir o catálogo público para os modelos que cabem simultaneamente no orçamento real, ou aumentar a memória disponível (mais RAM unificada, ou mover os modelos maiores para uma máquina com mais capacidade).
- Expor no `/api/v1/models` (ou `/api/v1/health`) uma estimativa de tempo de cold-load por modelo, para que clientes possam decidir se esperam ou usam outro slug.

### 2.3 Redundância / failover

Hoje é um único processo em uma única máquina. Para produção:
- Pelo menos 2 instâncias atrás de um load balancer, ou um plano documentado de failover manual (ex.: segunda máquina de standby).
- Health checks automatizados com alerta (a própria rota `/api/v1/health` já existe — falta um watcher externo que dispare notificação quando `status != "ok"` ou o host cair).

---

## 3. Conformidade com a API OpenAI-compatível

### 3.1 Enriquecer `/v1/models` e `/api/v1/models`

Hoje `/api/v1/models` devolve só `slug`, `line`, `quant`, `vision`, `display_name`, `loaded`. Faltam campos que clientes (inclusive o `discover_models: true` do Mangaba) usam para tomar decisão:
- `context_length` / `max_tokens` por modelo — crítico dado o achado do §1.1.
- `tool_calling: true/false` explícito por modelo, em vez de depender de descoberta por tentativa e erro (foi assim que o histórico do projeto descobriu que `mangaba-4b` não existia e precisou trocar para `mangaba-vision-q8`).
- `owned_by`, `created` (campos padrão do schema OpenAI `/v1/models`) para compatibilidade máxima com clientes genéricos.

### 3.2 Autenticação

Nenhum dos endpoints inspecionados (`/api/v1/health`, `/api/v1/models`, `/v1/models`) exigiu chave de API. Para produção:
- Exigir `Authorization: Bearer <key>` em todas as rotas de inferência (`/v1/chat/completions`, `/api/v1/{slug}/...`), com chaves por cliente/uso, para permitir revogação e rate-limiting individual.
- Rotas somente-leitura de status (`/health`) podem continuar públicas, mas sem vazar detalhes internos de capacidade (`used_gb`, `budget_gb`) para quem não está autenticado — hoje isso é informação operacional exposta sem controle.

### 3.3 Rate limiting e quotas

Sem visibilidade de limite de requisições por cliente. Para produção, adicionar rate limiting (por IP ou por chave de API) evita que um cliente com bug (ex.: loop de retry) derrube a máquina única que hoje serve o pool inteiro.

---

## 4. Observabilidade

- **Logs estruturados** por requisição: modelo, tokens de entrada/saída, latência, `finish_reason`, e — crucial para o §1.2 — se a resposta veio vazia.
- **Métricas exportáveis** (Prometheus/OpenTelemetry): tempo de cold-load por modelo, taxa de erro por slug, ocupação de memória ao longo do tempo.
- **Alertas** quando `used_gb` se aproxima de `budget_gb` (risco de swap thrashing) ou quando a taxa de respostas vazias/erros sobe.

---

## 5. Resumo priorizado

| # | Item | Por quê é bloqueador | Esforço estimado |
|---|---|---|---|
| 1 | Aumentar contexto para ≥64K | Agente com tools não cabe em 8192 tokens — confirmado por teste | Alto (infra/serving) |
| 2 | Corrigir resposta vazia com prompt longo | Sem isso, nem toolset mínimo funciona de forma confiável | Alto (precisa investigação no servidor) |
| 3 | Sair do ngrok free / domínio estável | SPOF, sem SLA, URL muda | Médio |
| 4 | Autenticação nas rotas de inferência | Hoje é uma API pública sem controle de acesso | Baixo–médio |
| 5 | 503 → retry/backoff correto no cold-swap | Clientes tratam 503 como falha definitiva | Baixo |
| 6 | `context_length`/`tool_calling` em `/v1/models` | Evita descoberta por tentativa e erro (já causou 2 incidentes no histórico do projeto) | Baixo |
| 7 | Observabilidade (logs/métricas/alertas) | Sem isso, qualquer regressão futura repete o mesmo processo manual de diagnóstico deste log | Médio |
| 8 | Redundância / failover | Produção não pode depender de um laptop pessoal | Alto |

**Enquanto os itens 1–2 não forem resolvidos, o gateway não deve ser usado como backend de um agente completo (com ferramentas) em nenhum ambiente — nem opt-in.** Ele funciona hoje apenas para chamadas simples e diretas ao `/v1/chat/completions` sem system prompt extenso, conforme demonstrado em `log.md` §2.
