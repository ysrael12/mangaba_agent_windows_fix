---
name: followup-cliente
description: "Agenda follow-up proativo com o cliente — o agente volta a falar sozinho (ex.: PIX não pago em 2h, cliente sumiu no meio do pedido). Recuperação de venda automática."
version: 1.0.0
author: Mangaba Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  mangaba:
    tags: [WhatsApp, Followup, Vendas, Proativo, Brasil, pt-BR]
    related_skills: [pix-cobranca, atendimento-completo]
---

# Follow-up de Cliente (proativo)

Diferencial de produto: o agente **inicia** a conversa, não só responde. Isso
recupera vendas que se perderiam — o famoso "carrinho abandonado" do WhatsApp.

## Quando usar
- Logo após gerar um **PIX** que ainda não foi confirmado.
- Quando o cliente **some** no meio de um pedido.
- Quando prometeu retornar ("te aviso quando chegar").

## Como agendar

Use o comando de follow-up (ele agenda na conversa atual e o agente envia sozinho
no horário):

```
/followup add 2h :: Oi! 😊 Vi que o PIX de R$ 90,00 ainda não caiu. Posso te ajudar a finalizar?
```

Formatos de tempo aceitos: `30min`, `2h`, `1h30min`, `1 dia`.

## Regra prática (boa cadência)
1. Gerou o PIX → agende **1 follow-up gentil em ~2h** se não confirmar.
2. Sem resposta → **1 último follow-up no dia seguinte** ("ainda quer garantir seu pedido?").
3. **Pare por aí.** Mais que isso vira spam e queima o cliente.

## Regras
- **Tom leve e sem cobrança agressiva.** É um lembrete amigável, não pressão.
- **Cancele o follow-up** se o cliente pagar/responder antes (`/followup cancel <id>`).
- **Respeite a LGPD** e o horário — não mande follow-up de madrugada.
- Se virar padrão (ex.: "sempre lembrar PIX em 2h"), guarde como **instinto** (`/instinct`).
