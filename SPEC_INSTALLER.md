# SPEC: Instalador Windows do Mangaba Dashboard (Inno Setup)

> **Escopo:** este documento detalha a distribuição **Windows** via Inno
> Setup. Para Linux e macOS, ver "Distribuição Cross-Platform" mais abaixo.
> Todos os métodos resultam no mesmo dashboard (`http://127.0.0.1:9119`).
>
> Depende de [`SPEC_EXE.md`](./SPEC_EXE.md) — este documento assume que o
> build PyInstaller (`mangaba-agent.spec`) já produz `dist/mangaba/`,
> `dist/mangaba-acp/` e `dist/mangaba-dashboard/` (confirmado — já existem
> builds locais em `dist/`). Este spec cobre a camada **em cima** disso:
> transformar esses diretórios soltos num instalador `.exe` único que o
> usuário final baixa e clica, e que resulta num "programa" instalado de
> verdade (Start Menu, atalho, desinstalador, autostart opcional) —
> **incluindo um launcher nativo com ícone na bandeja do sistema** que
> gerencia o ciclo de vida do dashboard (iniciar, parar, abrir navegador).

---

## Visão Geral

**Objetivo:** `MangabaDashboardSetup-x64.exe` — instalador Inno Setup que:

1. Instala o bundle `mangaba-dashboard` (+ `mangaba`/`mangaba-acp`) em
   `C:\Program Files\Mangaba Dashboard\` (ou `%LOCALAPPDATA%` se o usuário
   não tiver privilégio de admin).
2. Garante que o **runtime Node.js** necessário para o TUI/agent-browser
   exista — baixando um Node portátil durante a instalação se não houver
   um `node` compatível no PATH (ver "Estratégia Node.js" abaixo).
3. **Python não precisa ser baixado**: o `mangaba-dashboard.exe` já é um
   bundle PyInstaller `--onedir` com o interpretador Python embutido
   (`_internal/`). O único uso de "Python externo" é o tool opcional
   `execute_code` (sandbox) — tratado como dependência opcional, não como
   pré-requisito do instalador.
4. Instala o **Mangaba Launcher** — app de bandeja do sistema (system tray)
   que gerencia o ciclo de vida do dashboard: iniciar, parar/interrupt,
   abrir navegador, e sair. Ver Fase 7.
5. Cria atalhos (Menu Iniciar, Desktop opcional), registra o desinstalador
   em "Aplicativos e Recursos", e oferece iniciar o launcher ao final da
   instalação.
6. Suporta upgrade in-place (mesma AppId) e desinstalação limpa.

**Ferramenta escolhida:** Inno Setup 6.x (`.iss` script), compilado via
`ISCC.exe` (Inno Setup Compiler), CLI-friendly para CI.

---

## Estratégia Node.js: por que baixar em vez de embutir

| Opção | Tamanho no instalador | Prós | Contras |
|-------|----------------------|------|---------|
| Embutir Node portátil no instalador | +~90MB (zip do node-win-x64) | Offline, determinístico, sem dependência de rede no install | Instalador fica pesado; duplica binário que muda de versão com frequência |
| Baixar Node no `[Run]` do instalador (script pós-install) | Instalador leve (~50-80MB, só o bundle PyInstaller) | Instalador pequeno, sempre pega Node atual | Requer internet durante instalação; precisa fallback offline |
| Detectar Node do sistema, avisar se ausente | 0 | Mais simples | Usuário leigo não sabe instalar Node sozinho — quebra a promessa de "instalador único" |

**Decisão:** híbrido — o instalador **tenta baixar** um Node.js portátil
(zip oficial `https://nodejs.org/dist/vX.Y.Z/node-vX.Y.Z-win-x64.zip`) para
dentro da pasta de instalação (`<INSTALLDIR>\runtime\node\`) via um passo
`[Code]` (Pascal Script) que roda `DownloadTemporaryFile` do plugin
**`idpdl`/`InnoDownloadPlugin`**, com fallback: se já existir `node.exe` no
PATH do sistema com versão >= mínima exigida, **pula o download** e reusa o
do sistema (path gravado num arquivo de config lido pelo app,
`node_path.txt`, ou simplesmente deixado para o PATH resolver — o launcher
já procura `node` no PATH primeiro).

Isso mantém o instalador pequeno para quem já tem Node (a maioria dos devs)
e funcional para o usuário leigo sem Node, sem duplicar ~90MB para todo
mundo.

---

## Estrutura de Arquivos do Projeto (novos)

```
mangaba-agent/
├── installer/
│   ├── mangaba-dashboard.iss        # Script principal do Inno Setup (Windows)
│   ├── download_node.iss.inc        # Include: lógica de download do Node
│   ├── assets/
│   │   ├── icon.ico                 # Ícone do app (Windows) — copiar de "instalador mangaba agent/"
│   │   ├── icon.png                 # Ícone do app (Linux/macOS, 1024x1024) — gerar a partir do .ico
│   │   ├── wizard-image.bmp         # Imagem lateral do wizard (164x314)
│   │   ├── wizard-small.bmp         # Ícone pequeno do wizard (55x58)
│   │   └── LICENSE.txt              # Licença exibida no wizard
│   └── build_installer.ps1          # Orquestra: build PyInstaller → ISCC
├── mangaba_cli/
│   └── launcher/                    # Launcher nativo (system tray)
│       ├── __init__.py
│       ├── tray.py                  # Core: loop de ícone na bandeja + menu
│       ├── process_manager.py       # Gerencia subprocesso do dashboard
│       ├── ui.py                    # Diálogos simples (_about, status)
│       └── resources/
│           ├── icon_running.ico     # Ícone verde (dashboard rodando)
│           └── icon_stopped.ico     # Ícone cinza (dashboard parado)
├── scripts/
│   ├── build_exe.sh                 # Build PyInstaller + packaging (Linux/macOS)
│   ├── build_exe.ps1                # Build PyInstaller (Windows)
│   ├── package_appimage.sh          # Linux: AppImage portable
│   └── package_macos.sh             # macOS: .app bundle + .dmg
└── SPEC_INSTALLER.md                # Este arquivo
```

---

## Fase 1: Pré-requisito — bundle PyInstaller já pronto

Reaproveitar o pipeline de `SPEC_EXE.md` (Fase 6/7). O instalador **não**
invoca PyInstaller — ele consome `dist/mangaba-dashboard/`,
`dist/mangaba/` e `dist/mangaba-acp/` já construídos.

Adicionar ao `mangaba-agent.spec` (se ainda não existir) um ícone `.ico`
para o `exe_dashboard`. O ícone está em `instalador mangaba agent/mangaba_ai_logo.ico`:

```python
exe_dashboard = EXE(
    ...,
    name="mangaba-dashboard",
    console=False,
    icon=str(ROOT / "instalador mangaba agent" / "mangaba_ai_logo.ico"),
)
```

## Fase 2: Script Inno Setup principal (`installer/mangaba-dashboard.iss`)

```pascal
; installer/mangaba-dashboard.iss
#define MyAppName "Mangaba Dashboard"
#define MyAppVersion GetEnv("MANGABA_VERSION")
#if MyAppVersion == ""
  #define MyAppVersion "0.0.0-dev"
#endif
#define MyAppPublisher "Mangaba"
#define MyAppExeName "mangaba-dashboard.exe"
#define MyAppURL "https://mangaba.dev"
; AppId FIXO — nunca mudar entre releases (garante upgrade in-place)
#define MyAppId "{{B4A6E1A0-6C2F-4E1B-9E3C-2F1B7C0A9D11}"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
; Instala em Program Files se admin, senão em LocalAppData (sem UAC)
DefaultDirName={autopf}\Mangaba Dashboard
DefaultGroupName=Mangaba Dashboard
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DisableProgramGroupPage=yes
OutputDir=..\dist-installer
OutputBaseFilename=MangabaDashboardSetup-{#MyAppVersion}-x64
SetupIconFile=..\instalador mangaba agent\mangaba_ai_logo.ico
WizardImageFile=assets\wizard-image.bmp
WizardSmallImageFile=assets\wizard-small.bmp
LicenseFile=assets\LICENSE.txt
Compression=lzma2/max
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\{#MyAppExeName}
; Assinatura de código — ver Fase 5 (opcional, exige certificado)
;SignTool=signtool

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "autostart"; Description: "Iniciar o Mangaba Dashboard junto com o Windows"; GroupDescription: "Opções de inicialização"; Flags: unchecked

[Files]
; Bundle principal (dashboard, console=False)
Source: "..\dist\mangaba-dashboard\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; CLI completa (mangaba.exe com console, para usuários avançados / PATH)
Source: "..\dist\mangaba\mangaba.exe"; DestDir: "{app}\cli"; Flags: ignoreversion
Source: "..\dist\mangaba\_internal\*"; DestDir: "{app}\cli\_internal"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist
; ACP adapter (integração com editores)
Source: "..\dist\mangaba-acp\mangaba-acp.exe"; DestDir: "{app}\cli"; Flags: ignoreversion
; Launcher (system tray) — console=False, UI nativa
Source: "..\dist\mangaba-launcher\*"; DestDir: "{app}\launcher"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Mangaba Dashboard"; Filename: "{app}\launcher\mangaba-launcher.exe"; IconFilename: "{app}\launcher\mangaba-launcher.exe"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Mangaba Dashboard"; Filename: "{app}\launcher\mangaba-launcher.exe"; Tasks: desktopicon
Name: "{userstartup}\Mangaba Dashboard"; Filename: "{app}\launcher\mangaba-launcher.exe"; Parameters: "--minimized"; Tasks: autostart

[Registry]
; Adiciona {app}\cli ao PATH do usuário, para quem quiser usar `mangaba` no terminal
Root: HKCU; Subkey: "Environment"; ValueType: expandsz; ValueName: "Path"; \
    ValueData: "{olddata};{app}\cli"; Check: NeedsAddPath('{app}\cli')

[Run]
; Inicia o launcher (system tray) — gerencia o dashboard
Filename: "{app}\launcher\mangaba-launcher.exe"; Description: "Iniciar o Mangaba Dashboard agora"; Flags: postinstall nowait skipifsilent unchecked

[UninstallDelete]
Type: filesandordirs; Name: "{app}\runtime"
; NOTA: dados do usuário (~/.mangaba) NÃO são removidos — preservados entre reinstalações

#include "download_node.iss.inc"

[Code]
function NeedsAddPath(Param: string): boolean;
var
  OrigPath: string;
begin
  if not RegQueryStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', OrigPath) then
  begin
    Result := True;
    exit;
  end;
  Result := Pos(';' + Param + ';', ';' + OrigPath + ';') = 0;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    EnsureNodeRuntime();
  end;
end;
```

## Fase 3: Download condicional do Node (`installer/download_node.iss.inc`)

Usa o plugin **[Inno Download Plugin](https://github.com/DomGries/InnoDownloadPlugin)**
(`idp.iss`), que já resolve download com barra de progresso nativa do wizard.

```pascal
; installer/download_node.iss.inc
; Requer: idp.iss (Inno Download Plugin) em {#SourcePath}\..\Components
#include "idp.iss"

const
  NODE_VERSION = '20.18.1';
  NODE_MIN_MAJOR = 18;

function GetNodeZipUrl(): string;
begin
  Result := 'https://nodejs.org/dist/v' + NODE_VERSION +
    '/node-v' + NODE_VERSION + '-win-x64.zip';
end;

// Retorna True se houver `node` no PATH com versão >= NODE_MIN_MAJOR
function SystemNodeIsCompatible(): boolean;
var
  ResultCode: Integer;
  TmpFile: string;
  Output: AnsiString;
  VersionStr: string;
  MajorStr: string;
begin
  Result := False;
  TmpFile := ExpandConstant('{tmp}\node_version.txt');
  if Exec(ExpandConstant('{cmd}'), '/C node --version > "' + TmpFile + '" 2>&1',
      '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if (ResultCode = 0) and LoadStringFromFile(TmpFile, Output) then
    begin
      VersionStr := Trim(String(Output));
      // formato "v20.18.1" -> extrai "20"
      if (Length(VersionStr) > 1) and (VersionStr[1] = 'v') then
      begin
        MajorStr := Copy(VersionStr, 2, Pos('.', VersionStr) - 2);
        Result := StrToIntDef(MajorStr, 0) >= NODE_MIN_MAJOR;
      end;
    end;
  end;
end;

procedure EnsureNodeRuntime();
var
  ZipPath, ExtractDir: string;
  ResultCode: Integer;
begin
  if SystemNodeIsCompatible() then
  begin
    Log('Node.js do sistema é compatível — pulando download.');
    exit;
  end;

  ExtractDir := ExpandConstant('{app}\runtime\node');
  if FileExists(ExtractDir + '\node.exe') then
  begin
    Log('Node portátil já instalado — pulando download.');
    exit;
  end;

  ZipPath := ExpandConstant('{tmp}\node.zip');
  idpAddFile(GetNodeZipUrl(), ZipPath);
  idpDownloadAfter(wpReady);

  // Extração via tar (embutido no Windows 10 1803+) — evita depender de 7zip
  ForceDirectories(ExtractDir);
  if Exec(ExpandConstant('{cmd}'),
      '/C tar -xf "' + ZipPath + '" -C "' + ExpandConstant('{tmp}') + '"',
      '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    // o zip extrai para node-vX.Y.Z-win-x64\ — move o conteúdo
    Exec(ExpandConstant('{cmd}'),
      '/C move /Y "' + ExpandConstant('{tmp}') + '\node-v' + NODE_VERSION +
      '-win-x64\*" "' + ExtractDir + '"',
      '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end
  else
  begin
    MsgBox('Não foi possível baixar/extrair o Node.js automaticamente. ' +
      'Algumas funcionalidades (TUI, agent-browser) ficarão indisponíveis ' +
      'até você instalar o Node.js manualmente em https://nodejs.org.',
      mbInformation, MB_OK);
  end;
end;
```

**Fallback offline:** se `idpDownloadAfter` falhar (sem internet), o
instalador **continua** — o dashboard web funciona sem Node (é servido pelo
backend Python). Só TUI e `agent-browser` ficam desabilitados, com aviso
amigável já existente (`mangaba doctor` / mensagem no launcher).

**Reconciliação com o launcher:** `mangaba_cli/dashboard_launcher.py` e
`tools/browser_tool.py` devem checar `<INSTALLDIR>\runtime\node\node.exe`
como fallback quando `node` não está no PATH do sistema:

```python
# mangaba_agent/frozen.py — adicionar
def find_node_executable() -> Optional[Path]:
    """Procura node: primeiro no PATH do sistema, depois no runtime bundlado."""
    system_node = shutil.which("node")
    if system_node:
        return Path(system_node)
    bundled = get_executable_dir() / "runtime" / "node" / "node.exe"
    if bundled.is_file():
        return bundled
    return None
```

Isso substitui os pontos que hoje fazem `shutil.which("node")` diretamente
(`mangaba_cli/doctor.py`, `tools/browser_tool.py`) por
`find_node_executable()`.

## Fase 4: Script de build orquestrado (`installer/build_installer.ps1`)

```powershell
#
# build_installer.ps1 - Build completo: PyInstaller + Inno Setup installer.
#
# Prerequisites:
#   - Inno Setup 6 instalado (https://jrsoftware.org/isdl.php) com ISCC.exe no PATH
#   - Inno Download Plugin (idp.iss) em installer/Components/
#   - scripts/build_exe.ps1 já executado (ou será chamado aqui)
#
# Usage:
#   .\installer\build_installer.ps1 -Version "1.4.0"
#

param(
    [string]$Version = "0.0.0-dev"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "=== Mangaba Dashboard - Installer Build ===" -ForegroundColor Cyan

# 1. Build dos executáveis PyInstaller (se dist/ não existir ou -Force)
if (-not (Test-Path "dist\mangaba-dashboard\mangaba-dashboard.exe")) {
    Write-Host "[1/3] Building PyInstaller bundles..." -ForegroundColor Yellow
    & "$Root\scripts\build_exe.ps1"
} else {
    Write-Host "[1/3] dist\ já existe, pulando build PyInstaller." -ForegroundColor Yellow
}

# 2. Verificar ISCC.exe disponível
Write-Host "[2/3] Verificando Inno Setup Compiler..." -ForegroundColor Yellow
$iscc = Get-Command ISCC.exe -ErrorAction SilentlyContinue
if (-not $iscc) {
    $defaultPath = "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
    if (Test-Path $defaultPath) {
        $iscc = $defaultPath
    } else {
        throw "ISCC.exe não encontrado. Instale o Inno Setup 6: https://jrsoftware.org/isdl.php"
    }
} else {
    $iscc = $iscc.Source
}

# 3. Compilar o instalador
Write-Host "[3/3] Compilando instalador..." -ForegroundColor Yellow
$env:MANGABA_VERSION = $Version
& $iscc "installer\mangaba-dashboard.iss"

Write-Host ""
Write-Host "Instalador gerado em: dist-installer\MangabaDashboardSetup-$Version-x64.exe" -ForegroundColor Green
```

## Fase 5: Assinatura de código (opcional, recomendado para produção)

Sem assinatura, o Windows SmartScreen bloqueia o instalador ("Windows
protegeu seu PC") até acumular reputação. Mitigações, em ordem de custo:

1. **Sem assinatura** (MVP): funciona, mas usuário precisa clicar
   "Mais informações → Executar assim mesmo". Aceitável para beta interno.
2. **Certificado de assinatura de código OV** (~$100-300/ano, ex.:
   SSL.com, Sectigo): assina `ISCC` output via `SignTool=signtool` no
   `[Setup]` e `signtool sign /f cert.pfx /p $env:CERT_PASSWORD /fd sha256
   /tr http://timestamp.digicert.com /td sha256 installer.exe`.
3. **EV Code Signing** (reputação SmartScreen imediata, ~$300-500/ano):
   elimina o aviso desde o dia 1, mas requer hardware token (YubiKey).

Recomendação: começar sem assinatura, adicionar OV quando sair de beta.

### Windows Defender / Antivírus: problemas conhecidos e mitigação

O Windows Defender (e outros AV como Avast, Kaspersky, Bitdefender) frequentemente
sinalizam executáveis PyInstaller como **"Trojan:Win32/Smokeloader"** ou
**"PUA:Win32/Packed"** — é um falso positivo clássico causado por:

- **Packing/obfuscation**: PyInstaller empacota o interpretador Python + deps
  num archive auto-extraindo — a heurística do AV confunde com malware packing.
- **Executável unsigned**: sem assinatura de código, o AV desconfia de qualquer
  binário empacotado vindo da internet.
- **Download via browser**: o Windows marca arquivos baixados com
  [Mark of the Web](https://learn.microsoft.com/en-us/windows/win32/attributes/win32-file-attribute-flag-integrity-stream) (`Zone.Identifier`), que o Defender usa como sinal extra.

**Estratégias de mitigação (em ordem de eficácia):**

| # | Mitigação | Esforço | Eficácia |
|---|-----------|---------|----------|
| 1 | **Assinatura de código** (Fase 5) | Alto ($100-500/ano) | Alta — elimina a maioria dos falsos positivos |
| 2 | **Submeter ao Microsoft** para análise | Baixo (grátis) | Alta para Windows Defender; outros AV precisam de submissions separados |
| 3 | **Desativar UPX** no PyInstaller | Baixo (1 flag) | Média — UPX é gatilho forte de heurísticas |
| 4 | **`--onedir` em vez de `--onefile`** | Já feito | Média — `--onefile` extrai em runtime (gatilho extra) |
| 5 | **Documentar exceção** ao usuário | Baixo | Funciona, mas UX ruim |
| 6 | **Repositório de confiança** (winget/Store) | Alto | Elimina SmartScreen; não resolve AV de terceiros |

#### 1. Submeter falso positivo ao Microsoft

Processo gratuito e eficaz para Windows Defender:

```powershell
# Coletar o .exe sinalizado e enviar via portal
# https://www.microsoft.com/wdsi/filesubmission

# Campos:
#   - File: MangabaDashboardSetup-x64.exe (ou mangaba-dashboard.exe)
#   - Product: Mangaba Dashboard
#   - Detections: (copiar do Defender: Trojan:Win32/Smokeloader etc.)
#   - How to reproduce: instalar Mangaba Dashboard, rodar exe
```

O Microsoft tipicamente responde em 24-72h e adiciona a exceção no
próximo definition update. **Fazer isso uma vez por release** (ou uma
vez por build estável se o hash muda).

Para automação no CI:

```yaml
# .github/workflows/defender-fp-report.yml (opcional, manual trigger)
- name: Submit false positive report
  if: success()
  run: |
    # Upload via API do Microsoft Security Intelligence
    # Docs: https://learn.microsoft.com/en-us/windows/security/
    #       threat-protection/microsoft-defender-antivirus/
    #       false-positives-nuisance-detected-microsoft-defender-antivirus
    echo "Manual submission required at https://www.microsoft.com/wdsi/filesubmission"
```

#### 2. Desativar UPX (reduz taxa de falso positivo)

UPX é um packer que compacta executáveis — PyInstaller usa por padrão em
alguns cenários, e é um dos maiores gatilhos de heurísticas de AV.

No `mangaba-agent.spec`:

```python
exe_dashboard = EXE(
    ...,
    name="mangaba-dashboard",
    console=False,
    upx=False,  # ← DESATIVAR — reduz falsos positivos significativamente
)
```

Trade-off: o `.exe fica ~5-10MB maior, mas a detecção melhora muito.

#### 3. Mark of the Web (MOTW)

Arquivos baixados pelo browser recebem o stream `Zone.Identifier`. O
Defender usa isso como sinal de "veio da internet". Opções:

- **Inno Setup**: o instalador já é um `.exe` único — o browser marca
  o *instalador*, não os executáveis internos (que são extraídos pelo
  wizard). Isso é suficiente.
- **Se distribuir o `.exe` solto** (sem instalador): o PowerShell pode
  remover a marca, mas **não fazer isso** — viola a cadeia de
  confiança. Melhor usar assinatura de código.

```powershell
# NÃO usar em produção — apenas para debug local:
# Unblock-File -Path .\MangabaDashboardSetup-x64.exe
```

#### 4. Script de diagnóstico para o usuário

Adicionar ao `mangaba doctor` (já existe em `mangaba_cli/doctor.py`)
uma checagem de Windows Defender:

```python
def _check_defender_exclusions() -> dict:
    """Verifica se o diretório de instalação está no exclusion list do Defender."""
    if sys.platform != "win32":
        return {"status": "skip", "reason": "not Windows"}

    install_dir = _get_install_dir()
    try:
        result = subprocess.run(
            ["powershell", "-Command",
             "Get-MpPreference | Select-Object -ExpandProperty ExclusionPath"],
            capture_output=True, text=True, timeout=10
        )
        exclusions = result.stdout.strip().split("\n")
        if any(str(install_dir) in e for e in exclusions):
            return {"status": "ok", "message": "Defender exclusion found"}
        return {
            "status": "warning",
            "message": (
                f"O diretório {install_dir} não está no exclusion list "
                "do Windows Defender. Se o antivirus bloquear o dashboard, "
                "adicione a exclusão manualmente ou rode:\n"
                f"  Add-MpPreference -ExclusionPath '{install_dir}'"
            ),
        }
    except Exception:
        return {"status": "skip", "reason": "could not query Defender"}
```

#### Checklist de mitigação (por release)

```
[ ] upx=False no spec do PyInstaller (todas as variantes)
[ ] Assinatura de código aplicada (quando disponível)
[ ] Submission ao Microsoft WDSI com novo hash
[ ] Submission ao portal do fabricante do AV (se AVs populares bloqueiam)
[ ] Teste de instalação em VM limpa com Windows Defender habilitado
[ ] Verificar se `mangaba doctor` reporta status do Defender
[ ] Documentar no CHANGELOG como resolver bloqueio de AV
```

---

## Fase 6: CI/CD — estender `build-exe.yml`

Adicionar um job que roda **depois** do build Windows existente
(`.github/workflows/build-exe.yml`), reaproveitando o artifact:

```yaml
  installer:
    needs: build
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download Windows build artifact
        uses: actions/download-artifact@v4
        with:
          name: mangaba-win-x64
          path: dist-artifact

      - name: Extract build
        shell: pwsh
        run: |
          Expand-Archive -Path dist-artifact\mangaba-win-x64.zip -DestinationPath dist
          # build_exe.ps1 já separa mangaba/ e mangaba-dashboard/ dentro de dist/

      - name: Install Inno Setup
        run: choco install innosetup -y

      - name: Install Inno Download Plugin
        shell: pwsh
        run: |
          Invoke-WebRequest -Uri "https://github.com/DomGries/InnoDownloadPlugin/releases/latest/download/idp.zip" -OutFile idp.zip
          Expand-Archive idp.zip -DestinationPath "installer\Components"

      - name: Build installer
        shell: pwsh
        run: .\installer\build_installer.ps1 -Version "${{ github.ref_name }}"

      - name: Upload installer artifact
        uses: actions/upload-artifact@v4
        with:
          name: MangabaDashboardSetup-x64
          path: dist-installer\*.exe
```

Isso adiciona `MangabaDashboardSetup-x64.exe` como artifact/release asset
junto dos `.zip`/`.tar.gz` já publicados.

---

## Fase 7: Launcher System Tray (`mangaba_cli/launcher/`)

### Por quê

O `mangaba-dashboard.exe` atual é um processo de console que bloqueia o
terminal (`Press Ctrl+C to stop`). Usuários leigos precisam de uma
interface nativa no Windows para:

- **Iniciar** o dashboard com um clique
- **Parar/interrupt** o dashboard sem fechar o terminal
- **Abrir o navegador** no endereço do dashboard
- **Ver status** (rodando / parado) visualmente pelo ícone da bandeja
- **Sair** do launcher (e opcionalmente do dashboard)

### Arquitetura

```
┌─────────────────────────────────────────────────┐
│  mangaba-launcher.exe  (console=False, tray)    │
│                                                 │
│  ┌─────────────┐    ┌──────────────────────┐    │
│  │ tray.py     │◄──►│ process_manager.py   │    │
│  │ (pystray    │    │ (subprocess do       │    │
│  │  menu+icon) │    │  mangaba-dashboard)  │    │
│  └──────┬──────┘    └──────────────────────┘    │
│         │                                       │
│  ┌──────▼──────┐                                │
│  │ ui.py       │  (caixas de diálogo nativas)   │
│  └─────────────┘                                │
└─────────────────────────────────────────────────┘
         │
         │ subprocess
         ▼
┌─────────────────────────┐
│  mangaba-dashboard.exe  │  (servidor web, sem console)
│  :9119                  │
└─────────────────────────┘
```

### Componentes

#### `process_manager.py` — Gerenciamento do subprocesso

```python
"""Gerencia o ciclo de vida do processo mangaba-dashboard."""

import subprocess
import signal
import time
from pathlib import Path
from typing import Optional

class DashboardProcessManager:
    """Encapsula start/stop/status do dashboard como subprocesso."""

    def __init__(self, install_dir: Path):
        self._install_dir = install_dir
        self._process: Optional[subprocess.Popen] = None
        self._dashboard_exe = install_dir / "mangaba-dashboard.exe"

    @property
    def is_running(self) -> bool:
        if self._process is None:
            return False
        return self._process.poll() is None

    def start(self) -> bool:
        """Inicia o dashboard. Retorna True se iniciado com sucesso."""
        if self.is_running:
            return True
        if not self._dashboard_exe.is_file():
            return False

        self._process = subprocess.Popen(
            [str(self._dashboard_exe)],
            cwd=str(self._install_dir),
            creationflags=subprocess.CREATE_NO_WINDOW,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True

    def stop(self, timeout: float = 5.0) -> bool:
        """Para o dashboard graciosamente. Retorna True se parou."""
        if not self.is_running:
            return True
        try:
            self._process.terminate()
            self._process.wait(timeout=timeout)
            return True
        except subprocess.TimeoutExpired:
            self._process.kill()
            self._process.wait(timeout=2)
            return True
        except Exception:
            return False

    def pid(self) -> Optional[int]:
        if self.is_running:
            return self._process.pid
        return None
```

**Pontos chave:**
- `CREATE_NO_WINDOW` impede que um console apareça ao iniciar o dashboard
- `terminate()` → `wait(timeout)` → `kill()`: mata graciosamente, com
  fallback para kill forçado
- O launcher mantém referência ao `Popen` — não depende de PID do sistema

#### `tray.py` — Interface de bandeja do sistema

```python
"""Ícone na bandeja do sistema com menu de contexto."""

import sys
import webbrowser
from pathlib import Path

import pystray
from PIL import Image

from .process_manager import DashboardProcessManager

def create_tray(manager: DashboardProcessManager) -> pystray.Icon:
    """Cria e retorna o ícone na bandeja."""

    def on_start(icon, item):
        manager.start()
        update_icon(icon, manager)

    def on_stop(icon, item):
        manager.stop()
        update_icon(icon, manager)

    def on_open(icon, item):
        port = 9119  # ler de config se necessário
        webbrowser.open(f"http://127.0.0.1:{port}")

    def on_exit(icon, item):
        manager.stop()
        icon.stop()

    def update_icon(icon, mgr):
        if mgr.is_running:
            icon.icon = load_icon("icon_running.ico")
            icon.title = "Mangaba Dashboard — Rodando"
        else:
            icon.icon = load_icon("icon_stopped.ico")
            icon.title = "Mangaba Dashboard — Parado"

    menu = pystray.Menu(
        pystray.MenuItem("Abrir Dashboard", on_open, default=True),
        pystray.MenuItem("Iniciar", on_start,
                         visible=lambda: not manager.is_running),
        pystray.MenuItem("Parar", on_stop,
                         visible=lambda: manager.is_running),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Sair", on_exit),
    )

    icon = pystray.Icon(
        "mangaba",
        load_icon("icon_stopped.ico"),
        "Mangaba Dashboard",
        menu,
    )
    return icon

def load_icon(name: str) -> Image.Image:
    """Carrega ícone do diretório de recursos."""
    resources = Path(__file__).parent / "resources"
    return Image.open(str(resources / name))
```

**Fluxo do menu:**
- **Iniciar** → `manager.start()` → ícone vira verde
- **Parar** → `manager.stop()` → ícone volta pra cinza
- **Abrir Dashboard** → `webbrowser.open()` → abre `:9119` no browser
  padrão (mesmo se o dashboard já estava rodando)
- **Sair** → mata o dashboard + para o ícone da bandeja

#### `ui.py` — Diálogos simples

```python
"""Diálogos nativos leves (pystray já inclui Messagebox do Windows)."""
import pystray

def show_about():
    pystray.Messagebox(
        title="Mangaba Dashboard",
        text="Mangaba Dashboard v{}\nhttps://mangaba.dev".format(
            _get_version()
        ),
    )

def show_error(msg: str):
    pystray.Messagebox(
        title="Mangaba Dashboard — Erro",
        text=msg,
        icon=pystray.MessageboxIcon.ERROR,
    )
```

### Flag `--minimized`

Quando o launcher é iniciado com `--minimized` (via atalho "Iniciar com o
Windows"), ele:
1. Inicia o dashboard automaticamente
2. **Não abre janela de console** — vai direto pra bandeja
3. Usuário vê o ícone verde na bandeja; clica pra interagir

Sem `--minimized`, o launcher:
1. Mostra uma notificação "Dashboard iniciado" ao lado do ícone
2. Aguarda ação do usuário

### Atualização do `dashboard_launcher.py` existente

O `mangaba_cli/dashboard_launcher.py` (entry point do `mangaba-dashboard.exe`)
continua funcionando como **fallback headless** — para quem quiser rodar o
servidor direto sem tray. O launcher de bandeja é um executável separado
(`mangaba-launcher.exe`) com seu próprio entry point:

```python
# mangaba_cli/launcher/__main__.py
from .tray import create_tray
from .process_manager import DashboardProcessManager
from pathlib import Path
import sys

def main():
    install_dir = Path(sys.executable).parent  # frozen: pasta do .exe
    manager = DashboardProcessManager(install_dir)

    if "--minimized" in sys.argv:
        manager.start()

    icon = create_tray(manager)
    icon.run()

if __name__ == "__main__":
    main()
```

### PyInstaller spec — novo alvo

Adicionar ao `mangaba-agent.spec`:

```python
exe_launcher = EXE(
    pyz_launcher,
    [splash, a_launcher],  # a_launcher = Analysis(...) próprio
    name="mangaba-launcher",
    console=False,
    icon=str(ROOT / "installer" / "assets" / "icon.ico"),
    # Incluir pystray + PIL como hidden imports
    hiddenimports=["pystray", "PIL", "PIL.Image"],
)
```

### Adicionar `pystray` e `Pillow` como dependências

```toml
# pyproject.toml
[project.optional-dependencies]
launcher = ["pystray>=0.19,<1", "Pillow>=10.0,<11"]
```

São leves (~2MB total) e só entram no bundle do launcher, não no
dashboard principal.

---

## Distribuição Cross-Platform: Linux e macOS

> **Este spec foca no Windows (Inno Setup)**, mas o Mangaba Dashboard
> funciona nativamente em todas as plataformas. Abaixo as equivalentes
> para Linux e macOS — todas resultam em **binários nativos**, sem
> depender de Python ou pip no sistema do usuário final.

### Resumo por plataforma

| Plataforma | Build script | Formato de distribuição | Tamanho aprox. |
|------------|-------------|------------------------|----------------|
| **Windows** | `build_exe.ps1` → Inno Setup | `MangabaDashboardSetup-x64.exe` | ~150-250MB |
| **Linux** | `build_exe.sh` → `package_appimage.sh` | `MangabaDashboard-x86_64.AppImage` | ~200-300MB |
| **macOS** | `build_exe.sh` → `package_macos.sh` | `MangabaDashboard-x64.dmg` | ~200-300MB |

Todos os formatos são **portáveis**: o usuário final não precisa ter
Python, Node.js ou qualquer dependência de build instalada.

### Linux — AppImage (`scripts/package_appimage.sh`)

**O que é:** arquivo único executável, funciona em qualquer distro Linux
(Debian, Ubuntu, Fedora, Arch, etc.) sem instalação.

```bash
# Build completo (PyInstaller + AppImage)
./scripts/build_exe.sh

# Ou apenas o AppImage (se o bundle PyInstaller já existe)
./scripts/package_appimage.sh
```

**O script gera:**

```
dist/
├── mangaba-dashboard/          # Bundle PyInstaller (input)
├── appimage-build/AppDir/      # Estrutura temporária
│   ├── AppRun                  # Wrapper que configura PATH e MANGABA_HOME
│   ├── usr/bin/                # Binários + _internal/
│   ├── usr/share/applications/ # .desktop file (menu do sistema)
│   └── usr/share/icons/        # Ícone 256x256 + 512x512
└── MangabaDashboard-1.4.0-x86_64.AppImage  # ← OUTPUT FINAL
```

**Como funciona para o usuário final:**

```bash
# Sem instalação — duplo-clique no gerenciador de arquivos
chmod +x MangabaDashboard-1.4.0-x86_64.AppImage
./MangabaDashboard-1.4.0-x86_64.AppImage

# Ou mover para ~/Applications/ (adiciona ao menu do sistema)
mkdir -p ~/Applications
mv MangabaDashboard-1.4.0-x86_64.AppImage ~/Applications/
```

**Prós:** arquivo único, sem dependências, funciona offline, sem root.
**Contras:** tamanho maior que tar.gz (empacota tudo), sem auto-update.

**Estrutura do AppRun** (wrapper que executa antes do binário real):

```bash
#!/bin/bash
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
export PATH="$SELF_DIR/usr/bin:$PATH"

# Node bundled (se disponível)
if [ -x "$SELF_DIR/usr/bin/runtime/node/node" ]; then
    export PATH="$SELF_DIR/usr/bin/runtime/node:$PATH"
fi

# MANGABA_HOME
if [ -z "${MANGABA_HOME:-}" ]; then
    export MANGABA_HOME="$HOME/.mangaba"
fi
mkdir -p "$MANGABA_HOME" 2>/dev/null || true

exec "$SELF_DIR/usr/bin/mangaba-dashboard" "$@"
```

### macOS — .app + .dmg (`scripts/package_macos.sh`)

**O que é:** bundle `.app` nativo do macOS + imagem `.dmg` (disk image)
para distribuição estilo "arrasta para Applications".

```bash
# Build completo (PyInstaller + .app + .dmg)
./scripts/build_exe.sh

# Ou apenas o .app + .dmg (se o bundle PyInstaller já existe)
./scripts/package_macos.sh

# Com code signing (opcional, requer certificado Apple Developer)
./scripts/package_macos.sh --sign "Developer ID Application: Mangaba (TEAMID)"
```

**O script gera:**

```
dist/
├── mangaba-dashboard/           # Bundle PyInstaller (input)
├── macos-build/
│   ├── MangabaDashboard.app/    # Bundle .app nativo
│   │   ├── Contents/
│   │   │   ├── Info.plist       # Metadados (CFBundleIdentifier, etc.)
│   │   │   ├── MacOS/           # Wrapper launcher script
│   │   │   └── Resources/       # Binários + _internal/ + AppIcon.icns
│   │   └── ...
│   └── dmg-temp/                # Temp para criação do .dmg
└── MangabaDashboard-1.4.0-arm64.dmg  # ← OUTPUT FINAL
```

**Como funciona para o usuário final:**

```bash
# Duplo-clique no .dmg → abre janela com o .app + Applications
# Arrasta "Mangaba Dashboard" para Applications/
# Duplo-clique no app → dashboard inicia
```

**Estrutura do Info.plist:**

```xml
<key>CFBundleIdentifier</key>
<string>dev.mangaba.dashboard</string>
<key>CFBundleExecutable</key>
<string>MangabaDashboard</string>
<key>LSMinimumSystemVersion</key>
<string>11.0</string>
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>mangaba</string></array>
  </dict>
</array>
```

**Code signing:**

| Cenário | O que acontece | Custo |
|---------|---------------|-------|
| Sem assinatura | Gatekeeper bloqueia; usuário clica "Abrir mesmo assim" em Segurança & Privacidade | $0 |
| Apple Developer ID ($99/ano) | Gatekeeper aprova; "app danificada" não aparece | $99/ano |
| Mac App Store | Revisão da Apple; distribuição via Store | $99/ano + revisão |

### Launcher (System Tray) em Linux/macOS

O launcher de bandeja (Fase 7) usa `pystray` que é **multiplataforma**.
O mesmo código funciona em:

| OS | Backend do pystray | Ícone na bandeja |
|----|-------------------|-----------------|
| Windows | Win32 API | System tray nativo |
| Linux | AppIndicator3 (GTK) | GNOME/KDE panel |
| macOS | rumps / AppKit | Menu bar nativo |

**Linux:** requer `libappindicator3-dev` (Ubuntu) ou `libappindicator-gtk3`
(Fedora) para o backend GTK:

```bash
# Debian/Ubuntu
sudo apt install libappindicator3-dev gir1.2-appindicator3-0.1

# Fedora
sudo dnf install libappindicator-gtk3
```

**macOS:** `pystray` usa `rumps` ou `AppKit` — funciona sem dependências
adicionais (PyObjC é instalado automaticamente).

O launcher pode ser empacotado junto com o bundle PyInstaller em todas
as plataformas — basta adicionar `pystray` + `Pillow` aos hidden imports.

### Comando `mangaba dashboard` — plataforma única

Independentemente da plataforma, o comando `mangaba dashboard` já:

1. Verifica se o dashboard já está rodando (`_report_dashboard_status`)
2. Mata processos órfãos (`_find_stale_dashboard_pids`)
3. Auto-inicia o gateway se necessário (`_autostart_gateway_if_needed`)
4. Sobe o servidor web (`start_server`)
5. Abre o navegador automaticamente

**Para desenvolvedores** (que têm Python no sistema):

```bash
pip install -e .  # ou: uv pip install -e .
mangaba dashboard
```

**Para usuários finais** (binário nativo, sem Python):

| Plataforma | Arquivo | Como executar |
|------------|---------|---------------|
| Windows | `MangabaDashboardSetup-x64.exe` | Duplo-clique → wizard → Atalho |
| Linux | `MangabaDashboard-x86_64.AppImage` | `chmod +x *.AppImage && ./*.AppImage` |
| macOS | `MangabaDashboard-arm64.dmg` | Duplo-clique → arrasta para Applications |

### CI/CD cross-platform

O pipeline de build deve gerar **3 artefatos** por release:

```yaml
# .github/workflows/build-release.yml
jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: .\scripts\build_exe.ps1
      - run: .\installer\build_installer.ps1 -Version "${{ github.ref_name }}"
      - uses: actions/upload-artifact@v4
        with:
          name: MangabaDashboardSetup-x64
          path: dist-installer\*.exe

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - uses: actions/setup-node@v4
      - run: ./scripts/build_exe.sh --skip-package
      - run: ./scripts/package_appimage.sh
      - uses: actions/upload-artifact@v4
        with:
          name: MangabaDashboard-x86_64.AppImage
          path: dist/MangabaDashboard-*.AppImage

  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - uses: actions/setup-node@v4
      - run: ./scripts/build_exe.sh --skip-package
      - run: ./scripts/package_macos.sh
      - uses: actions/upload-artifact@v4
        with:
          name: MangabaDashboard-arm64.dmg
          path: dist/MangabaDashboard-*.dmg
```

### Tabela de decisão: qual método sugerir ao usuário

```
Usuário quer algo rápido?
├─ Tem Python? → pip install -e . && mangaba dashboard
├─ Tem Docker? → docker build + docker run
├─ Windows?   → Inno Setup .exe (este spec)
├─ Linux?     → .AppImage (binário único, sem instalação)
├─ macOS?     → .dmg (arrasta para Applications)
└─ Nenhum acima? → documentar pré-requisitos
```

---

## Fluxo de Usuário Final

1. Usuário baixa `MangabaDashboardSetup-1.4.0-x64.exe`.
2. Clica duas vezes → wizard Inno Setup (idioma PT-BR/EN, licença, diretório).
3. Instalador copia o bundle (~150-250MB descompactado) para
   `Program Files\Mangaba Dashboard\` (ou LocalAppData sem admin).
4. Instalador checa `node --version` no PATH; se ausente/desatualizado,
   baixa Node portátil (~30MB comprimido) com barra de progresso.
5. Cria atalhos no Menu Iniciar e (opcional) Desktop; opcionalmente
   registra em "Iniciar com o Windows".
6. Ao final, oferece "Iniciar o Mangaba Dashboard agora" (checkbox marcado).
7. Duplo-clique no atalho → **`mangaba-launcher.exe`** abre ícone na
   bandeja do sistema e inicia o dashboard em background (sem console visível).
8. Usuário clica com botão direito no ícone da bandeja:
   - **Abrir Dashboard** → abre `http://127.0.0.1:9119` no navegador
   - **Parar** → interrompe o servidor, ícone vira cinza
   - **Iniciar** → reinicia o servidor, ícone volta a verde
   - **Sair** → fecha launcher + para o servidor
9. Se o dashboard crashar, o ícone vira cinza automaticamente (monitoramento
   via `poll()` no subprocesso).
10. Desinstalação via "Aplicativos e Recursos do Windows" remove o app,
    mantendo `~/.mangaba` (dados/config do usuário) intactos.

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| SmartScreen bloqueia instalador não assinado | Usuário desiste na tela de aviso | Fase 5 — assinatura de código quando sair de beta |
| Download do Node falha (rede corporativa, firewall) | TUI/agent-browser ficam indisponíveis | Fallback silencioso + aviso; dashboard web continua funcional (não depende de Node) |
| Usuário sem privilégio de admin | Instalação em Program Files falha | `PrivilegesRequired=lowest` já instala em LocalAppData automaticamente |
| Upgrade duplica atalhos/entradas de registro | Menu Iniciar poluído | `AppId` fixo garante que o Inno Setup trate como upgrade in-place, não instalação nova |
| Antivírus sinaliza o `.exe` do PyInstaller (falso positivo comum) | Instalação falha/quarentena | Desativar UPX no spec, submeter ao Microsoft WDSI, testar em VM com Defender habilitado (ver "Windows Defender" na Fase 5) |
| Node baixado fica desatualizado (CVEs) | Superfície de ataque | Pin de versão no `.iss` (`NODE_VERSION`) atualizado a cada release do instalador |
| **pystray/Pillow não compila no PyInstaller** | Launcher não gera `.exe` | Hidden imports declarados no spec; testar build isolado antes do CI |
| **Dashboard crasha e launcher não detecta** | Ícone fica verde mas servidor morto | `poll()` periódico (ou `threading.Timer`) no `process_manager` atualiza estado do ícone |
| **Duas instâncias do launcher competem pela mesma porta** | Dashboard falha ao iniciar | `process_manager.start()` checa porta `:9119` antes de spawn; launcher existente recebe focus via mutex |
| **Usuário mata launcher pelo Task Manager** | Dashboard fica órfão rodando | Launcher registra PID em arquivo temporário; `mangaba dashboard --kill` limpa órfãos (já existe `_find_stale_dashboard_pids`) |

---

## Próximos Passos Imediatos

1. Copiar `instalador mangaba agent/mangaba_ai_logo.ico` para `installer/assets/icon.ico` (ou referenciar direto). Gerar `installer/assets/icon.png` (1024x1024) a partir do .ico para Linux/macOS. Criar `wizard-image.bmp`, `wizard-small.bmp`, `LICENSE.txt`.
2. Criar `mangaba_cli/launcher/resources/icon_running.ico` e `icon_stopped.ico` — gerar a partir de `instalador mangaba agent/mangaba_ai_logo.ico` (verde para running, cinza para stopped).
3. Adicionar `icon=` ao `exe_dashboard` em `mangaba-agent.spec`.
4. Adicionar `exe_launcher` ao `mangaba-agent.spec` (Analysis separado com `pystray` + `PIL` como hidden imports).
5. Adicionar `pystray>=0.19,<1` e `Pillow>=10.0,<11` ao `pyproject.toml` (optional-dependencies `launcher`).
6. Implementar `mangaba_cli/launcher/process_manager.py`, `tray.py`, `ui.py`, `__main__.py`.
7. Instalar Inno Setup 6 localmente + baixar `idp.iss` para `installer/Components/`.
8. Escrever `installer/mangaba-dashboard.iss` e `download_node.iss.inc` (Fases 2-3) — incluir `[Files]` do launcher.
9. Adicionar `find_node_executable()` a `mangaba_agent/frozen.py` e trocar os usos diretos de `shutil.which("node")` em `doctor.py`/`browser_tool.py`.
10. Escrever `installer/build_installer.ps1` e testar build local (incluir build do launcher).
11. Testar instalação limpa numa VM Windows sem Node/Python pré-instalados.
12. Testar upgrade in-place (instalar v1 → instalar v2, mesmo AppId).
13. Testar launcher: iniciar, parar, verificar ícone muda de cor, testar `--minimized`.
14. Testar dupla instância do launcher (mutex / detecção de porta).
15. Desativar UPX (`upx=False`) no `mangaba-agent.spec` e testar se reduz falsos positivos.
16. Submeter instalador ao Microsoft WDSI (https://www.microsoft.com/wdsi/filesubmission) para whitelist.
17. Testar instalação em VM limpa com Windows Defender habilitado — verificar se `mangaba doctor` reporta status do Defender.
18. Estender `.github/workflows/build-exe.yml` com o job `installer` (Fase 6).
19. Avaliar certificado de assinatura de código (Fase 5) antes do lançamento público.
20. **Linux:** testar `./scripts/package_appimage.sh` — gerar AppImage e verificar que roda em distro limpa (Ubuntu 22.04 Live USB).
21. **Linux:** testar AppImage em GNOME, KDE e XFCE — verificar que o ícone aparece no menu e que pystray funciona com AppIndicator3.
22. **Linux:** documentar dependência `libappindicator3-dev` para o launcher tray funcionar em desktops GTK/GNOME.
23. **macOS:** testar `./scripts/package_macos.sh` — gerar .app e .dmg, verificar que abre no macOS 11+.
24. **macOS:** testar .app em Intel e Apple Silicon (via Rosetta se necessário).
25. **macOS:** preparar code signing com certificado Apple Developer antes do lançamento público.
26. **Cross-platform:** adicionar jobs de build Linux e macOS ao CI (`.github/workflows/build-release.yml`).
27. **Cross-platform:** gerar `installer/assets/icon.png` (1024x1024) a partir de `instalador mangaba agent/mangaba_ai_logo.ico` via ImageMagick (`convert mangaba_ai_logo.ico -resize 1024x1024 icon.png`).
