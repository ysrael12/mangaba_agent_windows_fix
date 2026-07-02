# Guia do Painel do Mangaba — bem simples, sem termos técnicos

Este guia te ensina a instalar e abrir o painel (dashboard) do Mangaba, passo
a passo. Você não precisa entender de tecnologia para seguir — só ir copiando
e colando o que está nas caixinhas cinzas.

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

## 2. Baixando o programa pela primeira vez

1. Instale o **Git**: entre em https://git-scm.com/downloads, baixe e
   instale. Pode ir clicando em "Next" em tudo, as opções padrão servem.

2. Instale o **Git Bash** — ele já vem junto com o Git do passo anterior.
   É um "terminal" (uma telinha preta onde você digita comandos) que vamos
   usar do começo ao fim deste guia.

3. Abra o **Git Bash**: procure "Git Bash" no menu Iniciar do Windows e
   clique para abrir. (Dica: você também pode clicar com o botão direito
   dentro de uma pasta no Explorador de Arquivos e escolher "Git Bash Here".)

4. Na janela que abriu, cole este comando e aperte Enter:
   ```bash
   git clone https://github.com/dheiver2/Mangaba-Agent.git mangaba-agent
   ```
   Isso baixa todos os arquivos do programa para uma pasta chamada
   `mangaba-agent`.

5. Entre nessa pasta:
   ```bash
   cd mangaba-agent
   ```

6. Agora rode o instalador — ele prepara tudo sozinho (pode demorar alguns
   minutos, é normal):
   ```bash
   ./bootstrap.sh
   ```

> **Importante:** o mais simples é fazer tudo isso dentro do **Git Bash**,
> sempre. Se você prefere usar o terminal que já vem no Windows (a telinha
> azul chamada **PowerShell**), também dá certo — só que os comandos ficam
> um pouco diferentes. Toda vez que este guia mostrar uma caixinha de
> comando, logo abaixo vai ter uma versão "🔵 Se você usa o PowerShell" com o
> comando equivalente pra esse terminal.

> 🔵 **Se você usa o PowerShell:** o passo do instalador (item 6 acima) é o
> único que muda — o resto (instalar o Git, baixar o projeto, entrar na
> pasta) funciona igual. No lugar de `./bootstrap.sh`, cole:
> ```powershell
> & "C:\Program Files\Git\bin\bash.exe" bootstrap.sh
> ```

Quando o instalador terminar, ele mostra uma mensagem de sucesso — mas o
painel **ainda não abriu sozinho**. Vá para a próxima seção para abri-lo.

---

## 3. Abrindo o painel no navegador

Sempre que quiser usar o Mangaba, faça isto:

1. Abra o **Git Bash** dentro da pasta `mangaba-agent` (se já estava aberto
   de antes, ótimo).
2. Cole este comando e aperte Enter:
   ```bash
   source .venv/Scripts/activate
   mangaba dashboard
   ```
3. Espere alguns segundos. Uma aba do navegador abre sozinha já com o painel
   pronto pra usar.

> Se preferir que o navegador não abra sozinho:
> ```bash
> mangaba dashboard --no-open
> ```

**Dica para não esquecer:** sempre que abrir uma janela nova do Git Bash pra
usar o Mangaba, rode primeiro `source .venv/Scripts/activate` (isso "liga" o
programa) e só depois `mangaba dashboard`.

> 🔵 **Se você usa o PowerShell:** cole isto, dentro da pasta do projeto:
> ```powershell
> .\.venv\Scripts\mangaba.exe dashboard
> ```
> Repare que aqui **não precisa** "ligar" nada antes (o `activate` do Git
> Bash) — já vem embutido no comando. Para não abrir o navegador sozinho,
> use `.\.venv\Scripts\mangaba.exe dashboard --no-open`.

---

## 4. Escolhendo seu perfil

Na primeira vez que o painel abrir, escolha na barra do lado esquerdo o
perfil que combina com você. Fica salvo, não precisa escolher de novo.

| Perfil | Para quem é | O que você vê |
|--------|-------------|----------------|
| 👤 **Operador** | usa o assistente no dia a dia | Início, Chat, Sessões, Análise, Exemplos |
| 🧑‍💼 **Gestor** | cria assistentes e automações | tudo do Operador + Criar agente, Perfis, Roteamento, Frota, Agendamentos, Kanban |
| 🛠️ **Dev / Admin** | cuida da parte técnica | tudo do Gestor + Modelos, Chaves, Plugins, Memória, Logs, Configuração |

Errou o perfil? Sem problema, troca a qualquer momento no mesmo lugar.

---

## 5. Como usar no dia a dia

1. **Criar um assistente** (perfil Gestor) → escolha um modelo pronto para o
   seu setor (clínica, licitações, etc.) e instale com um clique.
2. **Chat** (perfil Operador) → converse com o assistente ali mesmo na tela.
3. **Sessões** → veja as conversas que vieram do Telegram/Discord/WhatsApp.
4. **Análise** → acompanhe uso e custo.

---

## 6. Como fechar o painel

Volte na janela do Git Bash onde ele está rodando e aperte `Ctrl + C`.

Se você já fechou a janela sem querer e o painel continua funcionando no
navegador, abra o Git Bash de novo e cole:

```bash
mangaba dashboard --stop
```

> 🔵 **Se você usa o PowerShell:**
> ```powershell
> .\.venv\Scripts\mangaba.exe dashboard --stop
> ```

---

## 7. Usando um servidor de IA de teste (opcional)

Por padrão, o instalador baixa um modelo de IA para rodar **no seu próprio
computador**. Se alguém já te passou um endereço de um servidor de IA pronto
(um "gateway"), você pode usar ele em vez do modelo local — é mais rápido de
configurar, mas pense nisso como algo **para testar**, não para depender no
dia a dia (explico o porquê logo abaixo).

No **Git Bash**, dentro da pasta do projeto, cole:

```bash
MANGABA_PROVIDER=gateway \
MANGABA_GATEWAY_URL=https://walton-undepreciatory-tracee.ngrok-free.dev \
BOOTSTRAP_NO_CHANNELS=true \
./bootstrap.sh
```

(Troque o endereço acima se te passarem outro.)

> 🔵 **Se você usa o PowerShell**, cole estas 4 linhas em vez do bloco acima:
> ```powershell
> $env:MANGABA_PROVIDER = "gateway"
> $env:MANGABA_GATEWAY_URL = "https://walton-undepreciatory-tracee.ngrok-free.dev"
> $env:BOOTSTRAP_NO_CHANNELS = "true"
> & "C:\Program Files\Git\bin\bash.exe" bootstrap.sh
> ```

> **Isso é só para teste porque:** esse endereço é um link temporário de um
> computador de outra pessoa. Ele pode parar de funcionar se aquele
> computador desligar, e o assistente completo (com todas as ferramentas)
> pode não responder direito nele, porque o modelo por trás tem uma
> "memória de conversa" mais curta do que o assistente precisa. Serve bem
> para testar perguntas simples. Se algo não funcionar direito, volte para
> o modelo local: rode `./bootstrap.sh` de novo, sem essas linhas de cima.

---

## 8. Se der algum problema

**"Apareceu uma mensagem vermelha dizendo que `mangaba` não existe"**
Se você está no Git Bash: você esqueceu de "ligar" o programa nessa janela.
Cole:
```bash
source .venv/Scripts/activate
```
e tente de novo.

Se você está no **PowerShell** (a telinha azul), o jeito mais simples é
sempre chamar pelo caminho completo:
```powershell
.\.venv\Scripts\mangaba.exe dashboard
```

**"Rodei o instalador e terminou, mas não abriu nada no navegador"**
Normal — o instalador só prepara tudo, ele não abre o painel sozinho. Depois
que ele terminar, siga a seção 3 (`source .venv/Scripts/activate` e depois
`mangaba dashboard`).

**"Cliquei duas vezes no arquivo `bootstrap.sh` e abriu um editor de texto/código em vez de instalar"**
Isso é esperado — não dê duplo-clique nesse arquivo. Em vez disso, abra o
**Git Bash** (seção 2) e cole `./bootstrap.sh` lá dentro.

**"O instalador pediu uma senha que eu não sei qual é"**
Isso acontece se o comando `bash bootstrap.sh` foi digitado dentro do
PowerShell em vez de usar o caminho indicado neste guia. Feche essa janela e
siga de novo o passo certo: **Git Bash** com `./bootstrap.sh`, ou
**PowerShell** com `& "C:\Program Files\Git\bin\bash.exe" bootstrap.sh`
(seção 2).

**"A página do painel não abre / dá erro de conexão"**
Veja se a janela do terminal ainda está aberta, sem mensagens em vermelho.
Se você fechou sem querer, abra o Git Bash de novo e repita a seção 3.

**"Apareceu um aviso de limite no topo da página"**
Normal — o modelo de IA (ou uma API gratuita) atingiu o limite de uso do
momento. Não é um erro do painel; espere um pouco ou troque de modelo na aba
**Modelos** (perfil Dev).

**"Preciso usar o painel de outro computador da mesma casa/escritório"**
Dá pra fazer, mas com cuidado — isso deixa o painel visível pra outros
computadores da mesma rede, incluindo as chaves de acesso guardadas nele. Só
faça isso numa rede em que você confia:
```bash
mangaba dashboard --host 0.0.0.0 --insecure
```
> 🔵 PowerShell: `.\.venv\Scripts\mangaba.exe dashboard --host 0.0.0.0 --insecure`

**"Quero recomeçar do zero"**
Feche o painel (`mangaba dashboard --stop`) e abra de novo (seção 3). Suas
configurações continuam salvas, nada se perde.

---

## 9. Onde pedir mais ajuda

- Site com a documentação completa: https://mangaba-agent.online
- Se alguma coisa travar, cole este comando — ele descobre sozinho o que
  está errado:
  ```bash
  mangaba doctor
  ```
  > 🔵 PowerShell: `.\.venv\Scripts\mangaba.exe doctor`
