---
name: resumo-estruturado
description: "Resume documentos (PDF, TXT, DOCX) ou textos longos em um formato estruturado e confiável, passo a passo — funciona bem até em modelos pequenos."
version: 1.0.0
author: Mangaba Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  mangaba:
    tags: [Produtividade, Resumo, PDF, Documentos, pt-BR]
    related_skills: [nano-pdf, ocr-and-documents]
---

# Resumo Estruturado

Procedimento guiado para resumir um documento ou texto longo de forma **confiável e padronizada**. Os passos explícitos reduzem a dependência da "inteligência" do modelo — por isso funciona bem mesmo com modelos locais pequenos.

## Quando usar
- O usuário manda um PDF/arquivo e pede "resuma".
- O usuário cola um texto longo e quer os pontos principais.

## Passos (siga nesta ordem)

1. **Obter o texto.**
   - Se for um arquivo (`.pdf`, `.txt`, `.docx`), use a ferramenta de execução de código para extrair o texto:
     - PDF: `pypdf` ou `pdfplumber`.
     - DOCX: `python-docx`.
     - TXT: leia direto.
   - Se o usuário colou o texto, use-o diretamente.

2. **Conferir o tamanho.** Se o texto for muito grande, processe em blocos e some os resumos parciais no final.

3. **Produzir o resumo neste formato fixo (em português do Brasil):**

   ```
   📄 Resumo: <título ou nome do arquivo>

   🎯 Em 1 frase:
   <a ideia central em uma frase>

   📌 Pontos principais:
   • <ponto 1>
   • <ponto 2>
   • <ponto 3 a 5>

   🔢 Dados/números relevantes:
   • <valores, datas, prazos — ou "nenhum">

   ✅ Próximas ações (se houver):
   • <ação sugerida — ou "nenhuma">
   ```

4. **Revisar.** Garanta que: está em pt-BR, não inventou informação que não está no texto, e cabe em uma mensagem.

## Regras
- Nunca invente dados — se não estiver no documento, escreva "não informado".
- Mantenha o formato acima sempre igual, para previsibilidade.
- Seja conciso: o resumo deve ser muito menor que o original.
