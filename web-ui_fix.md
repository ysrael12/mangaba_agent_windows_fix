# Fix: subir o dashboard web (`mangaba dashboard`) nesta máquina

**Data:** 2026-07-01

## Sintoma

`mangaba dashboard` falhava em dois pontos, em sequência:

1. `ImportError: No module named 'fastapi'` — dependências web não instaladas no venv.
2. `npm install` (etapa de build do frontend) falhava com `404 Not Found` para
   `mangaba-parser@0.25.1` e `mangaba-estree@0.25.1`.

## Causa

### 1. Dependências web ausentes
O extra opcional `web` (`fastapi`, `uvicorn[standard]`) do `pyproject.toml` não
estava instalado no `.venv`.

### 2. Substituição de pacote no `npm install`
O pacote real que precisa ser baixado é `hermes-parser`/`hermes-estree`
(dependência nova e legítima do `eslint-plugin-react-hooks@7.x`, mantida pelo
time do React/Meta). Confirmado via `npm info` e `curl` direto no registry:
os metadados reais apontam corretamente para `hermes-estree`.

Rodando `npm install` **de dentro desta pasta do projeto**, o próprio processo
de resolução do npm troca `hermes-parser`/`hermes-estree` por
`mangaba-parser`/`mangaba-estree` (nomes que não existem e nunca existiram no
npm). Reproduzindo o mesmo `package.json` fora desta árvore de pastas, a
resolução funciona normalmente — ou seja, a troca é específica deste
ambiente/máquina (possível quarentena de AV/EDR ou proxy local), não um bug do
projeto nem do registry. **Não identificamos a causa raiz exata** (não há
`overrides`/`resolutions`/`.npmrc` no repo que expliquem isso) — só o
contorno abaixo.

## O que foi feito

1. Instaladas as dependências web no venv:
   ```bash
   uv pip install -e ".[web]" --python .venv/Scripts/python.exe
   ```

2. Contorno local do `npm install` (não versionado, revertido logo depois):
   - Removida temporariamente a linha `"eslint-plugin-react-hooks": "^7.0.1"`
     de `web/package.json` (usada só pelo `npm run lint`, não pelo build).
   - Rodado `npm install` normalmente dentro de `web/` — passou sem erros
     (416 pacotes instalados).
   - Restaurado `web/package.json` ao original com `git checkout -- web/package.json`
     (o `node_modules` já populado não é afetado por isso).

3. Build manual do frontend:
   ```bash
   cd web && npm run build
   ```
   Gerou `mangaba_cli/web_dist/`.

4. Subida do dashboard usando o dist já gerado:
   ```bash
   mangaba dashboard --no-open --skip-build
   ```
   Resultado: `Mangaba Web UI → http://127.0.0.1:9119` (HTTP 200 confirmado).

## Estado atual

- `web/package.json` está **igual ao commit anterior** — nenhuma mudança
  permanente no repositório.
- `node_modules/` (gitignored) contém a instalação sem `eslint-plugin-react-hooks`;
  `npm run lint` vai falhar até isso ser reinstalado de verdade.
- `mangaba_cli/web_dist/` foi gerado localmente (não versionado).

## Pendências / próximos passos

- Investigar por que `npm install` troca `hermes-parser`/`hermes-estree` por
  `mangaba-parser`/`mangaba-estree` **só** dentro desta pasta — checar logs do
  Windows Defender ou outro AV/EDR/proxy local antes de reinstalar
  `eslint-plugin-react-hooks` de verdade.
- Dashboard, por padrão, só escuta em `127.0.0.1` (não acessível por outras
  máquinas na rede). Para expor: `mangaba dashboard --host 0.0.0.0 --insecure`
  (risco: expõe API keys na rede, sem autenticação de usuário real).
- Hospedagem remota do dashboard estático (ex.: Vercel) com backend por túnel
  foi tentada e **revertida** (`d108031` → `001f719`); não está disponível no
  código atual.
