---
name: atendimento-completo
description: "Fluxo de atendimento ao cliente por WhatsApp de ponta a ponta — saudação, entendimento, resolução, cobrança (PIX) e fechamento. Procedimento fixo, confiável em modelos pequenos."
version: 1.0.0
author: Mangaba Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  mangaba:
    tags: [WhatsApp, Atendimento, Vendas, Brasil, Negócios, pt-BR]
    related_skills: [pix-cobranca, catalogo-produtos, revisor-de-resposta, triagem-e-roteamento]
---

# Atendimento Completo (WhatsApp)

Procedimento de atendimento ao cliente de ponta a ponta para um negócio brasileiro
no WhatsApp. Por ser um roteiro fixo, funciona bem mesmo em modelos locais pequenos
e mantém o atendimento padronizado entre clientes.

## Quando usar
- Sempre que chega um cliente novo no WhatsApp do negócio.
- "atenda esse cliente", "responde aí", início de conversa comercial.

## Roteiro (siga, adaptando ao contexto)

1. **Saudação curta e humana.** Cumprimente, diga o nome do negócio, pergunte como ajudar.
   Use o horário (bom dia/boa tarde/boa noite).

2. **Entenda a necessidade.** Faça 1–2 perguntas objetivas para descobrir o que o cliente quer.
   Não despeje informação antes de entender.

3. **Resolva ou ofereça.**
   - Dúvida → responda direto e claro.
   - Produto/serviço → use a skill `catalogo-produtos` para mostrar opções e preço.
   - Pedido fechado → confirme itens e valor total.

4. **Cobre (se houver venda).** Use a skill `pix-cobranca` para gerar o PIX
   (copia-e-cola + QR) e envie. Confirme o valor antes.

5. **Confirme o próximo passo.** Prazo de entrega, retirada, ou o que o cliente deve fazer.

6. **Feche com cordialidade.** Agradeça e deixe o canal aberto.

## Regras
- **Tom**: cordial, objetivo, sem gírias e sem prometer o que não pode cumprir.
- **Revise antes de enviar** mensagens importantes com a skill `revisor-de-resposta`.
- **LGPD**: só peça dados pessoais necessários; nunca compartilhe dados de um cliente com outro (veja a skill `lgpd-atendimento`).
- **Nunca feche pagamento ou apague nada** sem confirmar com o responsável.
- Se um padrão se repetir (ex.: pergunta frequente), sugira guardar como **instinto** (`/instinct`).

## Exemplo de abertura
> "Boa tarde! Aqui é a [Loja]. 😊 Como posso te ajudar hoje?"
