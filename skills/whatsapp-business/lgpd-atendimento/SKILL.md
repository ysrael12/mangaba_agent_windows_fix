---
name: lgpd-atendimento
description: "Guarda de conformidade LGPD no atendimento — minimiza coleta de dados pessoais, evita vazar dados entre clientes e orienta consentimento. Procedimento curto e determinístico."
version: 1.0.0
author: Mangaba Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  mangaba:
    tags: [WhatsApp, LGPD, Privacidade, Segurança, Brasil, pt-BR]
    related_skills: [atendimento-completo, nota-fiscal]
---

# LGPD no Atendimento

Diferencial de confiança: o agente trata dados pessoais conforme a LGPD por padrão.
Esta skill é um conjunto de regras a aplicar **sempre** no atendimento, não um fluxo
isolado — funciona como um "guarda" que o modelo consulta.

## Princípios (aplique sempre)

1. **Minimização.** Só peça o dado pessoal **necessário** para a tarefa atual.
   Vai gerar PIX? Não precisa do CPF. Vai emitir nota? Aí sim precisa.

2. **Isolamento entre clientes.** **Nunca** revele dados de um cliente a outro.
   Cada conversa é separada — não traga informação de outro atendimento.

3. **Finalidade e consentimento.** Ao coletar um dado sensível (CPF, endereço,
   dados de saúde/pagamento), diga **para quê** é. Ex.: _"Preciso do seu CPF só para emitir a nota fiscal."_

4. **Sem exposição.** Não coloque dados pessoais em logs públicos, nomes de arquivo,
   mensagens de erro ou commits. Em dúvida sobre a instalação, rode `mangaba security-scan`.

5. **Direitos do titular.** Se o cliente pedir para **apagar** ou **ver** os dados dele,
   trate como pedido legítimo: confirme a identidade e atenda (ou encaminhe ao responsável).

6. **Retenção.** Não guarde dado pessoal além do necessário. Ao final, pergunte ao
   responsável se algum dado deve ser descartado.

## Checklist rápido antes de responder
- [ ] Estou pedindo só o dado necessário?
- [ ] Há risco de vazar dado de outro cliente?
- [ ] Expliquei a finalidade do dado sensível?
- [ ] Não estou expondo dado em log/arquivo público?

## Regra de ouro
Na dúvida entre coletar e não coletar um dado pessoal, **não colete** — pergunte ao
responsável se é mesmo necessário.
