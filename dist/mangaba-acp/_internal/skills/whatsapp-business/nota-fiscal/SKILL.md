---
name: nota-fiscal
description: "Triagem e orientação para emissão de nota fiscal (NF-e/NFS-e/NFC-e) no Brasil — coleta os dados certos, valida CPF/CNPJ e prepara a emissão. Não emite sozinho; orienta o caminho."
version: 1.0.0
author: Mangaba Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  mangaba:
    tags: [WhatsApp, NotaFiscal, Fiscal, Brasil, Negócios, pt-BR]
    related_skills: [atendimento-completo, pix-cobranca]
---

# Nota Fiscal (triagem e preparação)

Prepara a emissão de nota fiscal: descobre o tipo certo, **coleta e valida os dados**
e organiza tudo para emitir. A emissão em si exige integração com a SEFAZ/prefeitura
ou um emissor (ex.: Focus NFe, NFe.io, eNotas, ou o emissor gratuito do estado) —
esta skill prepara e orienta, com honestidade sobre o que precisa de credencial.

## Quando usar
- "preciso emitir uma nota", "o cliente pediu nota fiscal", "tem como dar NF?"

## Passos

1. **Identifique o tipo de nota:**
   | Tipo | Quando |
   |---|---|
   | **NFS-e** | Serviço (consultoria, manutenção, etc.) — emitida pela **prefeitura**. |
   | **NF-e (modelo 55)** | Venda de produto entre empresas / com transporte. |
   | **NFC-e (modelo 65)** | Venda de produto ao consumidor final (varejo). |
   | **MEI** | Pode emitir NFS-e; para consumidor pessoa física muitas vezes é dispensado. |

2. **Colete os dados do destinatário** (peça o que faltar):
   - Pessoa física: nome + CPF. Pessoa jurídica: razão social + CNPJ + IE (se houver).
   - Endereço completo (para NF-e de produto).
   - Descrição do item/serviço, valor, e CFOP/código de serviço quando souber.

3. **Valide CPF/CNPJ** com execução de código (dígitos verificadores) antes de prosseguir.
   Se inválido, peça de novo.

4. **Monte o resumo dos dados** e confirme com o usuário.

5. **Emita pelo caminho disponível:**
   - Se houver um **emissor configurado** (API key em `.env`, MCP, ou portal), siga-o.
   - Senão, **oriente**: monte o texto/planilha com todos os dados prontos para o
     usuário colar no emissor da prefeitura/estado ou no sistema dele.

## Regras
- **Não invente** CFOP, alíquota ou código de serviço — se não souber, marque como "confirmar com o contador".
- CPF/CNPJ e endereço são dados sensíveis (LGPD): use só para a nota, não exponha.
- Seja honesto: se não há emissor integrado, diga que prepara os dados mas a emissão é manual.
