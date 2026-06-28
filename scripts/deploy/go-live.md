# Checklist de Go-Live — Mangaba Agent

Lista para colocar em produção com segurança. Marque cada item.

---

## 1. Segurança das chaves (faça primeiro) 🔴

- [ ] **Rotacionar credenciais expostas.** O `HF_TOKEN` e os tokens de bot foram
      digitados em chat/durante o desenvolvimento — gere novos:
  - Hugging Face: https://huggingface.co/settings/tokens (revogar o antigo)
  - Telegram: @BotFather → `/revoke` (se aplicável) / novo token
  - Discord: Developer Portal → Reset Token
- [ ] **Segredos só no `~/.mangaba/.env`**, nunca no `config.yaml` (que é
      versionável). Confira: `grep -i token ~/.mangaba/config.yaml` deve vir vazio.
- [ ] `chmod 600 ~/.mangaba/.env`
- [ ] Rodar a varredura: `mangaba security` (procura segredos vazados/config de risco).
- [ ] Credencial **por cliente** quando for revender (não compartilhar o mesmo
      `HF_TOKEN` entre todos os profiles dedicados).

## 2. Exposição pública (proxy HTTPS) 🌐

- [ ] `bash scripts/deploy/setup-public.sh` (gera `API_SERVER_KEY` forte e bind 0.0.0.0).
- [ ] `mangaba gateway restart`
- [ ] Proxy HTTPS na frente: `scripts/deploy/Caddyfile.example` (auto-TLS).
- [ ] **Expor SOMENTE** a API do roteador (`:8642`) e, se preciso, o webhook do
      WhatsApp. **NUNCA** exponha o dashboard `:9119` nem os backends dedicados `:8700+`.
- [ ] Firewall: abrir 80/443; bloquear 9119/8642/8700+ diretos de fora.
- [ ] Testar: `curl https://SEU_DOMINIO/v1/models -H "Authorization: Bearer mk_live_..."`

## 3. Canais 📡

- [ ] Telegram/Discord: tokens válidos (aba **Criar agente** valida ao vivo).
- [ ] Allowlist de quem pode usar (se for privado): `TELEGRAM_ALLOWED_USERS` /
      `DISCORD_ALLOWED_USERS` no `.env`.
- [ ] WhatsApp oficial (se usar): seguir `scripts/deploy/whatsapp-cloud.md` e
      definir `WHATSAPP_APP_SECRET` (valida assinatura do webhook).

## 4. Clientes / API (white-label) 💳

- [ ] Cada cliente com **plano** e **teto diário** definidos (aba Clientes & API).
- [ ] Chaves `mk_live_` entregues; revogar as de teste.
- [ ] (Se isolado) agentes dedicados iniciados — marcados para **auto-start no boot**.
- [ ] Definir teto global de tokens (aba **Análise → Uso**) como rede de segurança.

## 5. Confiabilidade / operação ⚙️

- [ ] **Auto-restart** instalado: `bash scripts/macos/install-autostart.sh`
      (macOS) — sobe dashboard+gateway no boot e reinicia se cair.
- [ ] Reconciliação dos agentes dedicados validada (voltam sozinhos após reboot).
- [ ] Healthcheck externo apontando para `https://SEU_DOMINIO/api/health`
      (monitor: UptimeRobot, etc.).
- [ ] Status humano no **Início** verde ("no ar e respondendo").

## 6. Backups 💾

- [ ] Backup periódico de `~/.mangaba/` (config, .env, memórias, sessões, RAG,
      `api_clients.db`, `usage/`). Ex.: cron diário:
      `tar czf ~/mangaba-backup-$(date +%F).tar.gz ~/.mangaba`
- [ ] Guardar backup fora da máquina (outro disco/nuvem privada).
- [ ] Testar restauração ao menos uma vez.

## 7. Modelos / custo 💰

- [ ] Modelo principal definido e testado (aba Chat).
- [ ] Modelo por agente ajustado (Diretor forte, especialistas baratos) — aba Perfis.
- [ ] Acompanhar gasto na **Análise → Uso** (e no painel do provedor).

## 8. Conteúdo / RAG 📚

- [ ] Base de conhecimento reindexada e atual (aba Memória → RAG).
- [ ] Personas dos agentes revisadas (SOUL.md) — tom, escopo e limites corretos.

## 9. Verificação final ✅

- [ ] Mandar uma mensagem em cada canal ativo e confirmar resposta.
- [ ] Fazer uma chamada de API como cliente (`mk_live_`) e ver os headers
      `x-ratelimit-*`.
- [ ] Conferir que dados de teste (clientes/usuários fictícios) foram removidos.
- [ ] Atribuição de licença do upstream (OpenClaw/Hermes) creditada no repositório.

---

> Atalhos: comandos do dia a dia em `COMANDOS.md`; exposição em
> `scripts/deploy/`; WhatsApp em `scripts/deploy/whatsapp-cloud.md`.
