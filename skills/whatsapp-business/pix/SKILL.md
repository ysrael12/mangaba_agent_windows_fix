---
name: pix-cobranca
description: "Gera cobrança PIX (copia-e-cola + QR Code) válida, localmente, sem API paga. Use quando o cliente pedir 'cobre o cliente', 'gere um PIX', 'manda o pix de R$X'. Funciona em modelos pequenos."
version: 1.0.0
author: Mangaba Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  mangaba:
    tags: [WhatsApp, PIX, Pagamento, Brasil, Negócios, pt-BR]
    related_skills: [catalogo-produtos, atendimento-completo]
---

# Cobrança PIX

Gera um **BR Code PIX válido** (copia-e-cola e QR Code) de forma 100% local e
determinística — sem API paga, sem banco, sem depender da inteligência do modelo.
É um diferencial: vale dinheiro real para um negócio que atende por WhatsApp.

## Quando usar
- "Gere um PIX de R$ 49,90 para o pedido 001"
- "Cobre o cliente", "manda o código pix", "qual a chave pra pagar"

## Passos

1. **Reúna os dados** (peça o que faltar):
   - Chave PIX do recebedor (CPF/CNPJ/email/telefone/aleatória) — geralmente fixa, do dono do negócio.
   - Nome do recebedor e cidade.
   - Valor (opcional — sem valor, o pagador digita).
   - Identificador do pedido (txid), opcional.

2. **Gere o código** com o script:
   ```bash
   python scripts/pix_payload.py --key <chave> --name "<nome>" --city "<cidade>" \
       --amount 49.90 --txid PEDIDO001 --qr /tmp/pix.png
   ```
   A primeira linha impressa é o **copia e cola**. Com `--qr`, gera o PNG.

3. **Entregue no chat:**
   - Mande o copia-e-cola como texto (o cliente cola no app do banco).
   - Anexe o QR Code: inclua `MEDIA:/tmp/pix.png` na mensagem.
   - Confirme o valor e o que está sendo cobrado.

4. **Guarde a chave** do recebedor como instinto/config para não pedir toda vez:
   _"lembre disso: a chave PIX da loja é <chave>, recebedor <nome>, cidade <cidade>"_.

## Regras
- **Confira o valor** com o usuário antes de enviar — pagamento é irreversível.
- Nunca invente a chave PIX; se não tiver, peça.
- A chave do recebedor é dado sensível: não exponha em logs públicos.
