---
name: revisor-de-resposta
description: "Revisa uma resposta ANTES de enviar ao cliente — tom, completude, e vazamento de dados sensíveis. Procedimento curto e estreito que funciona bem até em modelos pequenos."
version: 1.0.0
author: Mangaba Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  mangaba:
    tags: [Atendimento, Revisão, Qualidade, Segurança, pt-BR]
    related_skills: [resumo-estruturado]
---

# Revisor de Resposta

Sub-agente de **escopo estreito**: a única tarefa é revisar um rascunho de resposta
ao cliente e devolver uma versão aprovada (ou apontar o que corrigir). Por ser um
papel único e com checklist fixo, funciona de forma confiável mesmo em modelos locais
pequenos — não precisa "pensar muito", só seguir a lista.

## Quando usar
- Antes de enviar uma resposta importante a um cliente.
- O usuário pede "revise antes de mandar" ou "isso está bom para enviar?".

## Entrada
O rascunho da resposta + (se houver) a pergunta original do cliente.

## Checklist (verifique nesta ordem, um item por vez)

1. **Responde a pergunta?** A resposta cobre o que o cliente realmente perguntou.
   Se faltar algo, complete.
2. **Tom adequado.** Cordial, claro e objetivo. Sem gírias, sem agressividade,
   sem promessas que não pode cumprir.
3. **Português correto.** Corrija ortografia e concordância.
4. **Sem dados sensíveis vazados.** A resposta NÃO pode conter: senhas, tokens,
   chaves de API, dados de cartão, CPF/CNPJ de terceiros, ou informações internas.
   Em caso de dúvida sobre a instalação, sugira rodar `mangaba security-scan`.
5. **Ação clara.** Se exige um próximo passo do cliente, ele está explícito.
6. **Tamanho.** Curta o suficiente para ser lida; remova repetição.

## Saída (formato fixo)

```
✅ Revisão da resposta

Veredito: APROVADA  (ou: AJUSTAR)

[se AJUSTAR] Correções:
- <ponto 1>
- <ponto 2>

Versão final sugerida:
<texto pronto para enviar>
```

## Regras
- **Nunca** envie sozinho — apresente a versão final e deixe o usuário decidir.
- Se detectar dado sensível, marque como **AJUSTAR** e remova o dado antes de sugerir a versão final.
- Se aprender um padrão recorrente (ex.: "este cliente prefere respostas curtas"),
  sugira guardar como instinto: _"Quer que eu memorize isso?"_ (veja `/instinct`).
