# Relatório de Segurança e Bugs - mangaba-agent

**Data:** 2026-07-21
**Ferramentas:** Trivy v0.72.0, Bandit v1.9.4, pip-audit v2.10.1

---

## Resumo Executivo

| Categoria | Encontrados | Críticos/Altos | Ação Recomendada |
|-----------|------------|----------------|------------------|
| **Vulnerabilidades de Dependências (Trivy)** | 61 | 17 (1 CRITICAL + 16 HIGH) | Atualizar pacotes |
| **Secrets Expostos (Trivy)** | 0 | 0 | Nenhuma |
| **Bugs de Segurança - SAST (Bandit)** | 2.884 | 30 HIGH | Revisar código |
| **Dependências Vulneráveis (pip-audit)** | 1 | 1 | Atualizar cryptography |

**Veredicto Geral:** O codebase possui vulnerabilidades significativas em dependências de terceiros e padrões de código que precisam de atenção imediata.

---

## 1. Vulnerabilidades de Dependências (Trivy)

### CRITICAL (1)

| CVE | Pacote | Versão Instalada | Versão Corrigida | CVSS | Descrição |
|-----|--------|------------------|------------------|------|-----------|
| CVE-2026-48063 | baileys | 7.0.0-rc.9 | 7.0.0-rc12 | - | Spoofing de mensagens e corrupção de estado via payload malicious protocolMessage |

### HIGH (16)

| CVE | Pacote | Versão Instalada | Versão Corrigida | CVSS | Descrição |
|-----|--------|------------------|------------------|------|-----------|
| CVE-2026-48712 | protobufjs | 7.6.0 | 7.6.1 | 7.5 | DoS via recursão não controlada com payload protobuf |
| CVE-2026-48779 | ws | 8.20.1 | 8.21.0 | 7.5 | DoS via esgotamento de memória com fragmentos WebSocket pequenos |
| CVE-2026-26209 | cbor2 | 5.8.0 | 5.9.0 | 7.5 | DoS via recursão não controlada com payloads CBOR |
| GHSA-537c-gmf6-5ccf | cryptography | 46.0.7 | 48.0.1 | 7.5 | OpenSSL vulnerável incluído nos wheels do cryptography |
| CVE-2026-52869 | mcp | 1.26.0 | 1.27.2 | 7.1 | Transportes HTTP não verificam principal autenticado |
| CVE-2026-52870 | mcp | 1.26.0 | 1.27.2 | 7.6 | Handlers de tarefa permitem que qualquer cliente acesse tarefas de outros |
| CVE-2026-59950 | mcp | 1.26.0 | 1.28.1 | - | WebSocket server não suporta validação Host/Origin |
| GHSA-6v7p-g79w-8964 | msgpack | 1.1.2 | 1.2.1 | 7.5 | Leitura fora dos limites / crash em Unpacker após erro |
| CVE-2026-48526 | pyjwt | 2.12.1 | 2.13.0 | 7.4 | Bypass de autenticação via JSON Web Tokens forjados |
| CVE-2026-53539 | python-multipart | 0.0.27 | 0.0.30 | 7.5 | DoS via bodies form-urlencoded crafted |
| CVE-2026-48818 | starlette | 0.52.1 | 1.1.0 | 7.5 | SSRF e roubo de credenciais NTLM via UNC paths no Windows |
| CVE-2026-54283 | starlette | 0.52.1 | 1.3.1 | 7.5 | request.form() limits ignorados para application/x-www-form-urlencoded |
| CVE-2026-49853 | tornado | 6.5.5 | 6.5.6 | 7.7 | Credenciais vazadas em redirects via SimpleAsyncHTTPClient |
| CVE-2026-49855 | tornado | 6.5.5 | 6.5.6 | 7.5 | DoS via descompressão gzip sem limite |
| CVE-2026-44431 | urllib3 | 2.6.3 | 2.7.0 | 5.3 | Disclosure via redirects cross-origin com headers sensíveis |
| CVE-2026-44432 | urllib3 | 2.6.3 | 2.7.0 | 7.5 | DoS via descompressão excessiva de respostas HTTP |

### MEDIUM (26)

Principais pacotes afetados:
- **aiohttp 3.13.3** - 12 vulnerabilidades (DoS, header injection, information disclosure, CRLF injection, TLS bypass)
- **starlette 0.52.1** - 3 vulnerabilidades (bypass via Host header, non-standard methods, path validation)
- **pyjwt 2.12.1** - 4 vulnerabilidades (SSRF, algorithm bypass, DoS via JWS, key ID DoS)
- **python-multipart 0.0.27** - 4 vulnerabilidades (DoS, information disclosure)
- **anthropic 0.86.0** - 2 vulnerabilidades (permissões inseguras, race condition de sandbox)
- **pydantic-settings 2.13.1** - 1 vulnerabilidade (symlink following para bypass de secrets_dir)
- **pynacl 1.5.0** - 1 vulnerabilidade (validação incorreta de pontos de curva elíptica)
- **pytest 9.0.2** - 1 vulnerabilidade (DoS via diretório temporário inseguro)

### LOW (18)

Principalmente **aiohttp** (10 vulnerabilidades), **python-multipart** (3), **pyjwt** (1), **starlette** (1), **tornado** (1), **pygments** (1), **body-parser** (1).

---

## 2. Bugs de Segurança - Análise Estática (Bandit)

### Resumo

| Severidade | Quantidade |
|------------|-----------|
| **HIGH** | 30 |
| **MEDIUM** | 222 |
| **LOW** | 2.632 |
| **TOTAL** | 2.884 |

### Top 10 Arquivos com Mais Issues

| Arquivo | Issues |
|---------|--------|
| `mangaba_agent/cli.py` | 169 |
| `mangaba_cli/config.py` | 141 |
| `mangaba_cli/main.py` | 140 |
| `mangaba_cli/gateway.py` | 136 |
| `gateway/run.py` | 132 |
| `tui_gateway/server.py` | 62 |
| `mangaba_cli/web_server.py` | 47 |
| `mangaba_agent/run_agent.py` | 36 |
| `mangaba_cli/models.py` | 34 |
| `mangaba_cli/tools_config.py` | 32 |

### Issues HIGH por Tipo

#### B602 - subprocess com shell=True (Command Injection)
**Risco: CRÍTICO** - Permite execução arbitrária de comandos

| Arquivo | Linha | Contexto |
|---------|-------|----------|
| `mangaba_agent/cli.py` | 8465 | `subprocess.run(exec_cmd, shell=True)` |
| `mangaba_cli/tools_config.py` | 745 | `subprocess.run(install_cmd, shell=True)` |
| `tools/environments/docker.py` | 638 | `subprocess.Popen(stop_cmd, shell=True)` |
| `tools/environments/docker.py` | 647 | `shell=True` com comando de limpeza |
| `tools/transcription_tools.py` | 545 | `subprocess.run(command, shell=True)` |
| `tui_gateway/server.py` | 4738 | `shell=True` com input do usuário |
| `tui_gateway/server.py` | 6755 | `cmd, shell=True` |

**Recomendação:** Substituir `shell=True` por listas de argumentos. Validar/sanitizar inputs antes de passar ao subprocess.

#### B202 - tarfile.extractall sem validação (Path Traversal)
**Risco: ALTO** - Permite escrita arbitrária via path traversal em tarballs

| Arquivo | Linha |
|---------|-------|
| `agent/curator_backup.py` | 619 |
| `mangaba_cli/main.py` | 8069 |
| `scripts/install_psutil_android.py` | 86 |

**Recomendação:** Usar `tarfile.extractall(path, filter='data')` (Python 3.12+) ou validar membros manualmente contra path traversal.

#### B324 - Uso de hashes fracos (MD5/SHA1) para segurança
**Risco: MEDIUM** - MD5/SHA1 são considerados criptograficamente fracos

| Arquivo | Linha | Hash |
|---------|-------|------|
| `agent/codex_responses_adapter.py` | 197 | SHA1 |
| `agent/context_compressor.py` | 735 | MD5 |
| `gateway/platforms/msgraph_webhook.py` | 334 | SHA1 |
| `gateway/platforms/qqbot/chunked_upload.py` | 369,561-563 | MD5/SHA1 |
| `gateway/platforms/wecom.py` | 1161 | MD5 |
| `gateway/platforms/wecom_crypto.py` | 63 | SHA1 |
| `gateway/platforms/weixin.py` | 1395,1909 | MD5 |
| `gateway/platforms/yuanbao_media.py` | 110,311 | MD5/SHA1 |
| `tools/skills_hub.py` | 931,1183,1319,1796,1902 | MD5 |
| `tools/skills_sync.py` | 163 | MD5 |

**Recomendação:** Para uso não-crítico (checksums, cache keys), adicionar `usedforsecurity=False`. Para uso de segurança, migrar para SHA-256.

#### B310 - urllib.request.urlopen (SSRF potencial)
**Risco: MEDIUM** - Permite acesso a recursos internos via scheme `file:/`

| Arquivo | Linha |
|---------|-------|
| `agent/anthropic_adapter.py` | 963, 1280 |
| `agent/google_code_assist.py` | 157 |
| `agent/google_oauth.py` | 552, 632 |
| `agent/secret_sources/bitwarden.py` | 255 |
| `gateway/platforms/feishu.py` | 4756, 4969, 4983 |
| `tui_gateway/server.py` | 6188 |

**Recomendação:** Validar scheme antes de chamar urlopen (aceitar apenas http/https). Usar `requests` ou `httpx` em vez de `urllib.request`.

#### B104 - Bind em todas as interfaces (0.0.0.0)
**Risco: MEDIUM** - Servidor acessível de qualquer interface de rede

| Arquivo | Linha |
|---------|-------|
| `agent/model_metadata.py` | 321 |
| `gateway/config.py` | 1637 |
| `gateway/platforms/bluebubbles.py` | 226 |
| `gateway/platforms/msgraph_webhook.py` | 32 |

**Recomendação:** Usar `127.0.0.1` como padrão e documentar quando `0.0.0.0` é necessário.

#### B608 - SQL Injection potencial (string formatting)
**Risco: MEDIUM** - Queries construídas via f-strings

| Arquivo | Linha | Query |
|---------|-------|-------|
| `agent/insights.py` | 189, 194 | SELECT com f-string (mas usa `?` params) |
| `gateway/platforms/api_server.py` | 400, 405 | DELETE com placeholders dinâmicos |

**Recomendação:** Verificar se os placeholders são gerados seguramente. Usar `?` params sempre que possível.

---

## 3. Dependências Vulneráveis (pip-audit)

| Pacote | Versão | CVE | Severidade | Versão Corrigida |
|--------|--------|-----|------------|------------------|
| cryptography | 48.0.0 | GHSA-537c-gmf6-5ccf | HIGH | 48.0.1 |

**Impacto:** OpenSSL vulnerável nos wheels do cryptography. Afeta todas as operações de TLS/cifra.

**Fix:** `pip install cryptography>=48.0.1`

---

## 4. Padrões de Código Problemáticos (Low Severity)

### B110 - Try/Except/Pass (1.137 ocorrências)
Exceções silenciadas podem esconder bugs críticos. A maioria está em `tui_gateway/server.py` e arquivos de gateway.

**Recomendação:** Logar exceções mesmo quando ignoradas: `except Exception: logger.debug("...", exc_info=True)`

### B101 - Assert Usage (451 ocorrências)
Asserts são removidos com `-O`. Não devem ser usados para validação em produção.

### B603 - subprocess sem shell=True (359 ocorrências)
Menos crítico que B602, mas ainda requer validação de input.

### B105 - Hardcoded password strings (294 ocorrências)
Strings que parecem passwords hardcoded em código.

### B607 - Processo com path parcial (140 ocorrências)
Uso de `git`, `docker` etc. sem caminho completo.

---

## 5. Ações Recomendadas (Prioridade)

### URGENTE (Atualizar agora)
1. **cryptography** → `>=48.0.1` (CVE OpenSSL)
2. **pillow** → `>=12.3.0` (múltiplos CVEs incluindo heap overflow, DoS)
3. **urllib3** → `>=2.7.0` (DoS + credential leak)
4. **tornado** → `>=6.5.7` (credential leak + DoS)
5. **starlette** → `>=1.3.1` (SSRF + DoS + path traversal)
6. **pyjwt** → `>=2.13.0` (auth bypass + SSRF + DoS)

### ALTO (Próxima sprint)
7. **mcp** → `>=1.28.1` (session verification + task isolation)
8. **aiohttp** → `>=3.14.1` (12 vulnerabilidades incluindo code execution)
9. **python-multipart** → `>=0.0.31` (DoS + info disclosure)
10. **protobufjs** → `>=8.6.6` (múltiplos DoS)
11. **ws** → `>=8.21.0` (DoS via memória)
12. **msgpack** → `>=1.2.1` (crash via unpacker reuse)
13. **pydantic-settings** → `>=2.14.2` (symlink bypass)

### MÉDIO (Refatoração de código)
14. Eliminar `shell=True` em subprocess calls (7 ocorrências HIGH)
15. Adicionar validação de `tarfile.extractall` (3 ocorrências HIGH)
16. Migrar MD5/SHA1 para SHA-256 ou adicionar `usedforsecurity=False`
17. Validar scheme em `urllib.request.urlopen` calls
18. Substituir `0.0.0.0` por `127.0.0.1` como padrão

### BAIXO (Manutenção)
19. Revisar Try/Except/Pass blocks para logging adequado
20. Remover asserts de código de produção ou substituir por validações explícitas

---

## 6. Comandos para Correção

```bash
# Atualizar dependências críticas
pip install "cryptography>=48.0.1" "pillow>=12.3.0" "urllib3>=2.7.0" "tornado>=6.5.7" "starlette>=1.3.1" "pyjwt>=2.13.0"

# Atualizar dependências altas
pip install "mcp>=1.28.1" "aiohttp>=3.14.1" "python-multipart>=0.0.31" "protobufjs>=8.6.6" "ws>=8.21.0" "msgpack>=1.2.1" "pydantic-settings>=2.14.2"

# Re-verificar após correções
pip-audit
trivy fs --scanners vuln .
```

---

*Relatório gerado automaticamente em 2026-07-21*
