# Guia do Painel do Mangaba (via gateway) — bem simples, sem termos técnicos

Este guia te ensina a instalar e abrir o painel (dashboard) do Mangaba, passo
a passo, usando o **PowerShell** (a telinha azul que já vem no Windows —
procure "PowerShell" no menu Iniciar) e conectado a um **gateway** (um
servidor de IA já pronto, em vez de baixar um modelo de IA gigante para o
seu computador). Você não precisa entender de tecnologia para seguir — só ir
copiando e colando o que está nas caixinhas cinzas, uma de cada vez, e
apertando Enter.

---

## 1. O que é o painel?

É uma tela que abre no seu navegador (Chrome, Edge, Firefox — o que você já
usa para acessar sites) onde você consegue:

- conversar com seus assistentes de IA;
- ver as conversas do Telegram/Discord/WhatsApp num só lugar;
- acompanhar quantas mensagens foram trocadas e quanto isso custou;
- ajustar as configurações do seu assistente.

Tudo fica guardado no seu próprio computador.

---

## 2. O que instalar antes de começar (pré-requisitos)

Antes de baixar o Mangaba, seu computador precisa ter 3 programas
instalados. No Windows eles **não** vêm instalados de fábrica — então faça
esses 3 passos primeiro, na ordem:

1. **Python** — entre em https://www.python.org/downloads/ e clique no botão
   grande de download. Ao instalar, **marque a caixinha "Add python.exe to
   PATH"** logo na primeira tela do instalador (isso é importante) e depois
   clique em "Install Now".

2. **Node.js** — entre em https://nodejs.org/, baixe a versão **LTS**
   (é a recomendada, escrito bem grande na página) e instale clicando
   "Next" em tudo, as opções padrão servem.

3. **Git** — entre em https://git-scm.com/downloads, baixe e instale. Pode
   ir clicando em "Next" em tudo, as opções padrão servem.

> Depois de instalar os 3, é uma boa ideia **reiniciar o computador** antes
> de continuar — evita problemas do Windows "não reconhecer" os programas
> recém-instalados.

---

## 3. Baixando o programa pela primeira vez

1. Abra o **PowerShell**: procure "PowerShell" no menu Iniciar do Windows e
   clique para abrir.

2. Cole este comando e aperte Enter (isso baixa o programa para uma pasta
   chamada `mangaba-agent`):
   ```powershell
   git clone https://github.com/dheiver2/Mangaba-Agent.git mangaba-agent
   ```

3. Entre nessa pasta:
   ```powershell
   cd mangaba-agent
   ```

4. Agora rode o instalador — ele prepara tudo sozinho (pode demorar alguns
   minutos, é normal). Este comando já configura o Mangaba para usar o
   **gateway** (um servidor de IA já pronto, em vez de baixar um modelo
   gigante para o seu computador) e, ao terminar, **já abre o painel
   sozinho** no navegador:
   ```powershell
   $env:MANGABA_PROVIDER = "gateway"
   $env:MANGABA_GATEWAY_URL = "https://walton-undepreciatory-tracee.ngrok-free.dev"
   $env:BOOTSTRAP_NO_CHANNELS = "true"
   $env:BOOTSTRAP_OPEN_DASHBOARD = "true"
   & "C:\Program Files\Git\bin\bash.exe" bootstrap.sh
   ```
   (Se algum dia te passarem outro endereço de gateway, é só trocar a
   segunda linha por ele.)

   Quando terminar de preparar tudo, essa mesma janela do PowerShell fica
   "ocupada" rodando o painel (é esperado — é o painel funcionando). Uma aba
   do navegador abre sozinha em alguns segundos. Para fechar o painel depois,
   volte nessa janela e aperte `Ctrl + C` (veja a seção 7).

> ℹ️ **Por que usar o gateway:** é bem mais rápido de configurar do que
> baixar um modelo de IA inteiro para o seu computador. A desvantagem: esse
> endereço é um link de um computador de outra pessoa — pode parar de
> funcionar se aquele computador desligar, e o assistente completo (com
> todas as ferramentas) às vezes não responde direito nele, porque o modelo
> por trás tem uma "memória de conversa" mais curta do que o assistente
> precisa. Serve muito bem para conversar e testar. Se um dia isso te
> incomodar, dá pra trocar para um modelo local rodando no seu próprio
> computador — rode o comando de novo, mas sem as linhas
> `$env:MANGABA_PROVIDER` e `$env:MANGABA_GATEWAY_URL`:
> ```powershell
> $env:BOOTSTRAP_NO_CHANNELS = "true"
> $env:BOOTSTRAP_OPEN_DASHBOARD = "true"
> & "C:\Program Files\Git\bin\bash.exe" bootstrap.sh
> ```

---

## 4. Reabrindo o painel depois (nas próximas vezes)

Na primeira vez, o instalador (seção 3) já deixa o painel aberto sozinho.
Mas depois que você fechar (seção 7) e quiser usar de novo, faça isto:

1. Abra o **PowerShell** dentro da pasta `mangaba-agent` (se já estava
   aberto de antes, ótimo — senão abra o PowerShell e cole
   `cd mangaba-agent` primeiro, ou clique com o botão direito dentro da
   pasta no Explorador de Arquivos e escolha "Abrir no Terminal").

2. Cole este comando e aperte Enter:
   ```powershell
   .\.venv\Scripts\mangaba.exe dashboard
   ```

3. Espere alguns segundos. Uma aba do navegador abre sozinha já com o painel
   pronto pra usar.

> Se preferir que o navegador não abra sozinho:
> ```powershell
> .\.venv\Scripts\mangaba.exe dashboard --no-open
> ```

---

## 5. Escolhendo seu perfil

Na primeira vez que o painel abrir, escolha na barra do lado esquerdo o
perfil que combina com você. Fica salvo, não precisa escolher de novo.

| Perfil | Para quem é | O que você vê |
|--------|-------------|----------------|
| 👤 **Operador** | usa o assistente no dia a dia | Início, Chat, Sessões, Análise, Exemplos |
| 🧑‍💼 **Gestor** | cria assistentes e automações | tudo do Operador + Criar agente, Perfis, Roteamento, Frota, Agendamentos, Kanban |
| 🛠️ **Dev / Admin** | cuida da parte técnica | tudo do Gestor + Modelos, Chaves, Plugins, Memória, Logs, Configuração |

Errou o perfil? Sem problema, troca a qualquer momento no mesmo lugar.

---

## 6. Como usar no dia a dia

1. **Criar um assistente** (perfil Gestor) → escolha um modelo pronto para o
   seu setor (clínica, licitações, etc.) e instale com um clique.
2. **Chat** (perfil Operador) → converse com o assistente ali mesmo na tela.
3. **Sessões** → veja as conversas que vieram do Telegram/Discord/WhatsApp.
4. **Análise** → acompanhe uso e custo.

---

## 7. Como fechar o painel

Volte na janela do PowerShell onde ele está rodando e aperte `Ctrl + C`.

Se você já fechou a janela sem querer e o painel continua funcionando no
navegador, abra o PowerShell de novo, entre na pasta do projeto e cole:

```powershell
.\.venv\Scripts\mangaba.exe dashboard --stop
```

---

## 8. Se der algum problema

**"O instalador reclamou de `python` ou `node`/`npm` não encontrado"**
Falta instalar um dos 3 programas da seção 2 (Python, Node.js ou Git), ou o
computador ainda não "percebeu" que eles foram instalados. Confira se
instalou os 3, reinicie o computador e rode o instalador de novo.

**"Apareceu uma mensagem vermelha dizendo que `mangaba` não existe"**
Você digitou só `mangaba` em vez do caminho completo. Use sempre:
```powershell
.\.venv\Scripts\mangaba.exe dashboard
```
(repare no `.\` bem no começo — sem ele o PowerShell não acha o programa).

**"Rodei o instalador e terminou, mas não abriu nada no navegador"**
Confira se colou as 4 linhas `$env:...` inteiras da seção 3 antes do comando
final — em especial a linha `$env:BOOTSTRAP_OPEN_DASHBOARD = "true"`, que é
a que faz o painel abrir sozinho no final. Se faltou, é só rodar a seção 4
manualmente.

**"Cliquei duas vezes no arquivo `bootstrap.sh` e abriu um editor de texto/código em vez de instalar"**
Isso é esperado — não dê duplo-clique nesse arquivo. Em vez disso, use o
comando da seção 3, item 4, colado no PowerShell.

**"O instalador pediu uma senha que eu não sei qual é"**
Isso acontece se o comando `bootstrap.sh` foi rodado de um jeito diferente
do que este guia mostra. Feche a janela, abra o PowerShell de novo e use
exatamente o comando da seção 3 (com `& "C:\Program Files\Git\bin\bash.exe"`
na frente).

**"A página do painel não abre / dá erro de conexão"**
Veja se a janela do terminal ainda está aberta, sem mensagens em vermelho.
Se você fechou sem querer, abra o PowerShell de novo e repita a seção 4.

**"Apareceu um aviso de limite no topo da página"**
Normal — o modelo de IA (ou uma API gratuita) atingiu o limite de uso do
momento. Não é um erro do painel; espere um pouco ou troque de modelo na aba
**Modelos** (perfil Dev).

**"Preciso usar o painel de outro computador da mesma casa/escritório"**
Dá pra fazer, mas com cuidado — isso deixa o painel visível pra outros
computadores da mesma rede, incluindo as chaves de acesso guardadas nele. Só
faça isso numa rede em que você confia:
```powershell
.\.venv\Scripts\mangaba.exe dashboard --host 0.0.0.0 --insecure
```

**"Quero recomeçar do zero"**
Feche o painel (`.\.venv\Scripts\mangaba.exe dashboard --stop`) e abra de
novo (seção 4). Suas configurações continuam salvas, nada se perde.

---

## 9. Onde pedir mais ajuda

- Site com a documentação completa: https://mangaba-agent.online
- Se alguma coisa travar, cole este comando — ele descobre sozinho o que
  está errado:
  ```powershell
  .\.venv\Scripts\mangaba.exe doctor
  ```
