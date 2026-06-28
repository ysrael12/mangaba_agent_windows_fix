# Agente "Política BR" — dados públicos via MCP

Starter de um agente que consulta **APIs públicas abertas da política brasileira**.
Começa pela **Câmara dos Deputados** (Dados Abertos, sem chave) e é expansível.

## Ferramentas (MCP `politica-br`)
- `camara_buscar_deputados(nome, uf, partido, limite)`
- `camara_detalhes_deputado(deputado_id)`
- `camara_despesas_deputado(deputado_id, ano, mes)` — cota parlamentar (CEAP)
- `camara_buscar_proposicoes(termo, tipo, numero, ano, limite)`
- `camara_detalhes_proposicao(proposicao_id)`
- `camara_votacoes_proposicao(proposicao_id)`
- `camara_partidos()`

Fonte: https://dadosabertos.camara.leg.br — dados em tempo real.

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
