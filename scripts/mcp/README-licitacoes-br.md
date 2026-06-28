# Agente "Licitações AL" — contratações públicas via PNCP

Agente que consulta **licitações, editais e contratos públicos** em tempo real
do **PNCP** (Portal Nacional de Contratações Públicas, Lei 14.133/2021). Foco em
**Alagoas** (UF padrão = AL), mas todas as ferramentas aceitam outra UF.

Fonte: `https://pncp.gov.br/api/consulta` — REST **público, sem chave**.

## Ferramentas (MCP `licitacoes-br`) — 7

**Caso principal — campeões por área:**
- `campeoes_telecom_al(uf=AL, limite)` — **RANKING das empresas que mais vencem
  contratos de TELECOMUNICAÇÕES** (telefonia, internet, link de dados, fibra) na
  UF. Agrega por CNPJ do fornecedor, ordena por valor total ganho. Busca via
  PNCP search (texto) → detalhe do contrato (vencedor) → filtra ruído pelo objeto.
- `campeoes_por_area_al(termos, area_nome, uf=AL, limite)` — mesmo ranking para
  **qualquer área**: passe `termos` separados por vírgula (ex.:
  'medicamento,fármaco' ou 'merenda,alimentação escolar').

**Consulta de licitações/contratos:**
- `licitacoes_abertas_al(uf=AL, modalidade, objeto, municipio, limite)` —
  editais com **proposta aberta agora**. `modalidade=0` varre as comuns
  (pregão, dispensa, inexigibilidade, concorrência). Filtra por palavra no
  objeto (ex.: 'merenda', 'obras') e/ou município (ex.: 'Maceió').
- `licitacoes_periodo_al(uf, data_inicial, data_final, modalidade, objeto, municipio, limite)`
  — licitações **publicadas num período** (datas AAAAMMDD). Histórico.
- `licitacao_itens(id_contratacao)` — **itens** (o que se compra, quantidade,
  valor unitário/total). Use o `ID p/ itens` (formato `CNPJ/ANO/SEQ`) das buscas.
- `contratos_orgao(cnpj_orgao, data_inicial, data_final, objeto, limite)` —
  **contratos firmados** por um órgão (quem ganhou, objeto, valor). O PNCP só
  filtra contratos por CNPJ do órgão, não por UF — pegue o `cnpj_orgao` numa
  busca de licitações antes.
- `licitacoes_modalidades()` — códigos de modalidade (pregão, dispensa…).

## Cruzamentos típicos
- *"Quais licitações de saúde estão abertas em Maceió?"* →
  `licitacoes_abertas_al(objeto='saúde', municipio='Maceió')`
- *"O que a licitação X está comprando?"* → copie o `ID p/ itens` →
  `licitacao_itens(id)`
- *"Quem a Prefeitura de Arapiraca contratou este ano?"* → ache o `cnpj_orgao`
  numa busca → `contratos_orgao(cnpj_orgao)`

## Como ativar
1. **Registrar o MCP** em `~/.mangaba/config.yaml`:
   ```yaml
   mcp_servers:
     licitacoes-br:
       command: <caminho>/.venv/bin/python
       args: ["<caminho>/scripts/mcp/licitacoes_br.py"]
       enabled: true
   ```
2. **Instalar o agente**: dashboard → **Criar agente** → "Licitações AL (PNCP)".
3. Reiniciar o gateway (`mangaba gateway restart`) e mandar `/new` no chat.

## Observações
- Modalidades sem editais abertos retornam HTTP 204 (vazio) — tratado como
  "nenhum", não como erro.
- O PNCP tem **limite de requisição**; a varredura de modalidades faz 1 chamada
  por modalidade. Especifique `modalidade` para reduzir.
- Valores `R$ 0.00` aparecem quando o órgão não publicou orçamento estimado no
  edital (orçamento sigiloso ou em sistema externo — ver o link).
