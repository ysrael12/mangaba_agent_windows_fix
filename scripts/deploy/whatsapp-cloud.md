# Publicar WhatsApp (Cloud API oficial — Meta)

Guia para colocar o agente respondendo no **WhatsApp oficial** (sem risco de
banimento). Tempo estimado: ~20–30 min na primeira vez.

> Pré-requisito: a API precisa estar **exposta publicamente em HTTPS** — a Meta
> só envia mensagens para uma URL pública. Use o proxy de exposição:
> `scripts/deploy/setup-public.sh` + `Caddyfile.example` (ver `COMANDOS.md` §8.3).
> Anote o seu domínio, ex.: `https://api.seudominio.com`.

## Passo 1 — Criar o app na Meta
1. Acesse **https://developers.facebook.com/apps/** → **Criar app** → tipo **Business**.
2. No app, adicione o produto **WhatsApp**.
3. Em **WhatsApp → API Setup (Configuração da API)** você verá:
   - um **número de teste** já provisionado (ou adicione o seu número comercial),
   - o **Phone number ID** (copie),
   - um **token de acesso temporário** (24h) — copie para testar; depois gere um **token permanente** (System User) para produção.

## Passo 2 — Conectar no assistente
1. No dashboard → aba **Criar agente** → passo **2 (Conectar canal)** → **WhatsApp**.
2. Cole o **Token de acesso** e o **Phone number ID** → **Validar**.
   - Deve aparecer **"✅ número verificado: <nome/numero>"**.
3. Clique **Conectar**. O painel mostrará:
   - **Callback URL** → `https://api.seudominio.com/api/whatsapp/webhook`
   - **Verify token** → (gerado automaticamente)
   - Copie os dois.

## Passo 3 — Configurar o webhook na Meta
1. Na Meta: **WhatsApp → Configuration → Webhook** → **Edit**.
2. Cole:
   - **Callback URL** = a URL do passo 2,
   - **Verify token** = o verify token do passo 2.
3. Clique **Verify and save** (a Meta vai chamar seu endpoint; se a URL estiver
   pública e o token bater, valida na hora).
4. Em **Webhook fields**, **assine (Subscribe) o campo `messages`**.

## Passo 4 — Testar
- Mande uma mensagem do seu celular para o número do WhatsApp do app.
- O agente responde em segundos. (Com número de teste da Meta, primeiro
  adicione seu celular como destinatário permitido em **API Setup**.)

## Token permanente (produção)
O token de 24h expira. Para produção:
1. **business.facebook.com → Configurações → Usuários do sistema** → crie um
   *System User* com função Admin.
2. Gere um token para esse usuário com as permissões
   **whatsapp_business_messaging** e **whatsapp_business_management**.
3. No assistente, refaça o passo 2 com esse token permanente.

## Variáveis salvas (referência)
Ao conectar, ficam no `~/.mangaba/.env`:
```
WHATSAPP_CLOUD_TOKEN=...        # token de acesso
WHATSAPP_PHONE_NUMBER_ID=...    # id do número
WHATSAPP_VERIFY_TOKEN=...       # segredo do webhook (gerado)
```

## Solução de problemas
- **"Verify and save" falha** → a URL não está pública/HTTPS, ou o verify token
  não confere. Teste: `curl "https://api.seudominio.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=ok"` deve devolver `ok`.
- **Validou mas não responde** → confirme que assinou o campo **messages** e que
  o número de origem está autorizado (modo teste) ou o número saiu do modo teste.
- **Token expirou** → gere o token permanente (System User) acima.
- **Mensagem não chega** → veja `~/.mangaba/logs/` e confirme que o dashboard
  (que hospeda o webhook) está no ar atrás do proxy.

## Segurança
- O webhook é uma rota **pública** (a Meta precisa alcançá-la). Ele só processa
  mensagens quando `WHATSAPP_CLOUD_TOKEN` está configurado e responde 200 vazio
  caso contrário.
- **Recomendado em produção:** valide a assinatura. Copie o **App Secret** em
  Meta → Configurações → Básico e adicione ao `~/.mangaba/.env`:
  ```
  WHATSAPP_APP_SECRET=...
  ```
  Com isso, o webhook **rejeita (403) qualquer POST sem a assinatura correta**
  `X-Hub-Signature-256` da Meta. Sem essa variável, a verificação é pulada
  (útil só em teste).
