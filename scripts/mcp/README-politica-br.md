# Agente "Política BR" — dados públicos via MCP

Agente que consulta e **cruza** dados de **APIs públicas abertas da política
brasileira** — Câmara, Senado, TSE e Portal da Transparência.

## Ferramentas (MCP `politica-br`) — 13
**Câmara dos Deputados** (sem chave):
- `camara_buscar_deputados(nome, uf, partido, limite)`
- `camara_detalhes_deputado(deputado_id)`
- `camara_despesas_deputado(deputado_id, ano, mes)` — cota parlamentar (CEAP)
- `camara_buscar_proposicoes(termo, tipo, numero, ano, limite)`
- `camara_detalhes_proposicao(proposicao_id)`
- `camara_votacoes_proposicao(proposicao_id)`
- `camara_partidos()`

**Senado Federal** (sem chave):
- `senado_buscar_senadores(nome, uf, partido, limite)`
- `senado_detalhes_senador(codigo)`
- `senado_buscar_materias(termo, sigla, ano, limite)` — projetos do Senado

**Glossário legislativo** (local, instantâneo):
- `glossario_legislativo(termo)` — PEC, PL, MPV, quórum, veto, CEAP, CEIS…

**TSE** (datasets/arquivos — o TSE publica em CSV/ZIP):
- `tse_buscar_datasets(termo, limite)` → títulos + links

**Portal da Transparência** (requer chave grátis `TRANSPARENCIA_API_KEY`):
- `transparencia_sancoes(nome_ou_cnpj, limite)` → sancionados (CEIS)

**Cruzamento:** o agente combina as fontes — ex. cruzar o nome de um parlamentar
com sanções no Portal da Transparência, ou comparar deputados × senadores de um
partido/UF. Fontes: dadosabertos.camara.leg.br · legis.senado.leg.br/dadosabertos
· dadosabertos.tse.jus.br · api.portaldatransparencia.gov.br

## Como ativar
1. **Registrar o servidor MCP** em `~/.mangaba/config.yaml`:
   ```yaml
   mcp_servers:
     politica-br:
       command: <caminho>/.venv/bin/python
       args: ["<caminho>/scripts/mcp/politica_br.py"]
   ```
   (já registrado neste ambiente).
2. **Instalar o agente**: dashboard → aba **Perfis** (ou **Criar agente**) →
   agente pronto **"Política BR (dados públicos)"** → Instalar.
3. **Habilitar as ferramentas MCP** no agente: garanta que o toolset de MCP está
   ativo para o profile (config `enabled_toolsets` / aba Habilidades).
4. **Testar** no Chat: *"Liste os deputados do PT de SP"* → *"Quais os gastos da
   cota do deputado X em 2024?"* → *"Há proposições sobre inteligência artificial
   em 2024?"*.

## Expandir (próximas APIs)
Adicione novas funções/ferramentas no mesmo servidor (`politica_br.py`):
- **Senado** — `legis.senado.leg.br/dadosabertos` (senadores, matérias, votações)
- **TSE** — `dadosabertos.tse.jus.br` (candidatos, resultados, contas)
- **Portal da Transparência** — `api.portaldatransparencia.gov.br` (gastos,
  servidores, sanções) — **requer chave grátis** (`x-api-key`).

## Observações
- Respeite os **limites de requisição** de cada órgão.
- A persona força **citar a fonte** e **fato, não opinião** — importante em política.
- Os traces (aba Observabilidade) registram latência/erros das chamadas por turno.
