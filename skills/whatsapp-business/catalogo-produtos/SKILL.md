---
name: catalogo-produtos
description: "Gerencia e apresenta um catálogo de produtos/serviços a partir de um arquivo local (CSV/JSON) — busca, preço, disponibilidade. Funciona offline e em modelos pequenos."
version: 1.0.0
author: Mangaba Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  mangaba:
    tags: [WhatsApp, Catálogo, Vendas, Brasil, Negócios, pt-BR]
    related_skills: [atendimento-completo, pix-cobranca]
---

# Catálogo de Produtos

Apresenta e consulta o catálogo do negócio a partir de um arquivo local — sem
depender de e-commerce externo. Determinístico: a busca e o preço vêm do arquivo,
não da "memória" do modelo (que poderia inventar preço).

## Arquivo do catálogo
Use `~/mangaba-workspace/catalogo.csv` (ou peça o caminho ao usuário). Formato:

```csv
sku,nome,preco,disponivel,descricao
001,Bolo de cenoura,45.00,sim,Bolo caseiro 1kg com cobertura
002,Brigadeiro (cento),60.00,sim,100 unidades
003,Torta de limão,55.00,nao,Sob encomenda
```

## Passos

1. **Carregue o catálogo** com execução de código (`csv`/`pandas`). Se o arquivo
   não existir, ofereça criar um modelo e peça os produtos ao usuário.

2. **Atenda à consulta:**
   - "o que vocês têm?" → liste nome + preço dos itens `disponivel=sim`.
   - "tem bolo?" → filtre por nome/descrição e mostre os que casam.
   - "quanto é o brigadeiro?" → devolva o preço EXATO do arquivo.

3. **Formato de apresentação (WhatsApp):**
   ```
   🛍️ <Nome do negócio>
   • Bolo de cenoura — R$ 45,00
   • Brigadeiro (cento) — R$ 60,00
   (Torta de limão: sob encomenda)
   ```

4. **Fechou pedido?** Some os itens, confirme o total e gere o PIX (`pix-cobranca`).

## Regras
- **Nunca invente preço, item ou disponibilidade** — sempre venha do arquivo. Se não estiver lá, diga que vai confirmar.
- Mantenha o catálogo como fonte única; ao atualizar, edite o arquivo.
- Valores sempre em R$ no formato brasileiro (vírgula decimal) na mensagem ao cliente.
