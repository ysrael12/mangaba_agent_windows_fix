# Guia do Painel do Mangaba (via ChatGPT) — bem simples, sem termos técnicos

Este guia te ensina a instalar e abrir o painel (dashboard) do Mangaba, passo
a passo, usando o **PowerShell** (a telinha azul que já vem no Windows —
procure "PowerShell" no menu Iniciar) e sua própria conta do **ChatGPT** como
cérebro do assistente. Você não precisa entender de tecnologia para seguir —
só ir copiando e colando o que está nas caixinhas cinzas, uma de cada vez, e
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

## 3. Baixando e instalando o programa

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
   **ChatGPT** como cérebro e, ao terminar, **já abre o painel sozinho** no
   navegador:
   ```powershell
   $env:MANGABA_PROVIDER = "openai-codex"
   $env:MANGABA_MODEL = "gpt-5.5"
   $env:BOOTSTRAP_NO_CHANNELS = "true"
   $env:BOOTSTRAP_OPEN_DASHBOARD = "true"
   & "C:\Program Files\Git\bin\bash.exe" bootstrap.sh
   ```

   Quando terminar de preparar tudo, essa mesma janela do PowerShell fica
   "ocupada" rodando o painel (é esperado — é o painel funcionando). Uma aba
   do navegador abre sozinha em alguns segundos.

---

## 4. Conectando sua conta ChatGPT

Com o painel aberto no navegador:

1. No menu lateral esquerdo, clique em **Chaves** (se não achar, troque para
   o perfil **Dev/Admin** — veja a seção 5).
2. Procure por **OpenAI Codex (ChatGPT)** e clique em **Conectar**.
3. Uma janela vai aparecer com um **código** e um **link**. Anote o código
   (números e letras).
4. Abra uma nova aba no navegador, entre no link que apareceu na janela.
5. Faça login na sua conta ChatGPT (se ainda não estiver logado).
6. Cole o código e autorize.
7. Volte para o painel — ele detecta sozinho que você autorizou e fecha a
   janela. Pronto, sua conta está conectada.

> ⚠️ **Conta gratuita vs. paga:** se sua conta ChatGPT é **gratuita (Free)**,
> o modelo gpt-5.5 pode não funcionar — você vai ver uma mensagem de erro ao
> tentar conversar. Nesse caso, você precisa de uma assinatura **ChatGPT Plus**
> (US$ 20/mês) ou **Pro** (US$ 200/mês) para usar o Codex.

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

## 8. Reabrindo o painel depois (nas próximas vezes)

Depois que você fechar (seção 7) e quiser usar de novo:

1. Abra o **PowerShell** dentro da pasta `mangaba-agent`.
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

## 9. Se der algum problema

**"O instalador reclamou de `python` ou `node`/`npm` não encontrado"**
Falta instalar um dos 3 programas da seção 2 (Python, Node.js ou Git), ou o
computador ainda não "percebeu" que eles foram instalados. Confira se
instalou os 3, reinicie o computador e rode o instalador de novo.

**"Apareceu uma mensagem vermelha dizendo que `mangaba` não existe"**
Você digitou só `mangaba` em vez do caminho completo. Use sempre:
```powershell
.\.venv\Scripts\mangaba.exe dashboard
```

**"Conectei minha conta ChatGPT mas o chat dá erro"**
Pode ser que sua conta seja **gratuita (Free)**. O modelo gpt-5.5 precisa de
uma assinatura **ChatGPT Plus** (US$ 20/mês) ou **Pro** (US$ 200/mês).

**"O painel não mostra a opção 'OpenAI Codex' em Chaves"**
Mude para o perfil **Dev/Admin** (seção 5) e tente de novo.

**"A página do painel não abre / dá erro de conexão"**
Veja se a janela do terminal ainda está aberta, sem mensagens em vermelho.
Se você fechou sem querer, abra o PowerShell de novo e repita a seção 8.

**"Apareceu um aviso de limite no topo da página"**
Sua conta ChatGPT atingiu o limite de uso do momento. Espere um pouco ou
faça upgrade para Plus/Pro.

**"Preciso usar o painel de outro computador da mesma casa/escritório"**
Dá pra fazer, mas com cuidado — isso deixa o painel visível pra outros
computadores da mesma rede, incluindo as chaves de acesso guardadas nele. Só
faça isso numa rede em que você confia:
```powershell
.\.venv\Scripts\mangaba.exe dashboard --host 0.0.0.0 --insecure
```

**"Quero recomeçar do zero"**
Feche o painel (`.\.venv\Scripts\mangaba.exe dashboard --stop`) e abra de
novo (seção 8). Suas configurações continuam salvas, nada se perde.

---

## 10. Onde pedir mais ajuda

- Site com a documentação completa: https://mangaba-agent.online
- Se alguma coisa travar, cole este comando — ele descobre sozinho o que
  está errado:
  ```powershell
  .\.venv\Scripts\mangaba.exe doctor
  ```
