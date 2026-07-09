# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: features.spec.ts >> Feature routes render >> route /fleet (Agentes ativos) renders without runtime crash
- Location: e2e\tests\features.spec.ts:64:5

# Error details

```
Tearing down "context" exceeded the test timeout of 60000ms.
```

# Page snapshot

```yaml
- generic [ref=e5]:
  - complementary "Navegação" [ref=e6]:
    - generic [ref=e8]:
      - img "Mangaba Agent" [ref=e9]
      - generic [ref=e10]:
        - paragraph [ref=e11]: Mangaba Agent
        - paragraph [ref=e12]: Painel central
    - button "Abrir busca de comandos" [ref=e14]:
      - img [ref=e15]
      - generic [ref=e18]: Buscar…
      - generic [ref=e19]: ⌘K
    - navigation "Navegação" [ref=e20]:
      - list [ref=e21]:
        - listitem [ref=e22]:
          - link "Início" [ref=e23] [cursor=pointer]:
            - /url: /home
            - img [ref=e24]
            - generic [ref=e27]: Início
        - listitem [ref=e28]: Conversar
        - listitem [ref=e29]:
          - link "Sessões" [ref=e30] [cursor=pointer]:
            - /url: /sessions
            - img [ref=e31]
            - generic [ref=e33]: Sessões
        - listitem [ref=e34]: Agentes
        - listitem [ref=e35]:
          - link "Criar agente" [ref=e36] [cursor=pointer]:
            - /url: /criar
            - img [ref=e37]
            - generic [ref=e40]: Criar agente
        - listitem [ref=e41]:
          - link "Agentes ativos" [ref=e42] [cursor=pointer]:
            - /url: /fleet
            - img [ref=e43]
            - generic [ref=e49]: Agentes ativos
        - listitem [ref=e51]:
          - link "Conectar serviços" [ref=e52] [cursor=pointer]:
            - /url: /clients
            - img [ref=e53]
            - generic [ref=e56]: Conectar serviços
        - listitem [ref=e57]: Configurar
        - listitem [ref=e58]:
          - link "Configurações" [ref=e59] [cursor=pointer]:
            - /url: /configuracoes
            - img [ref=e60]
            - generic [ref=e61]: Configurações
        - listitem [ref=e62]:
          - link "Habilidades" [ref=e63] [cursor=pointer]:
            - /url: /skills
            - img [ref=e64]
            - generic [ref=e68]: Habilidades
        - listitem [ref=e69]:
          - link "Configuração" [ref=e70] [cursor=pointer]:
            - /url: /config
            - img [ref=e71]
            - generic [ref=e74]: Configuração
        - listitem [ref=e75]: Automatizar
        - listitem [ref=e76]:
          - link "Tarefas agendadas" [ref=e77] [cursor=pointer]:
            - /url: /cron
            - img [ref=e78]
            - generic [ref=e81]: Tarefas agendadas
        - listitem [ref=e82]:
          - link "Tarefas" [ref=e83] [cursor=pointer]:
            - /url: /kanban
            - img [ref=e84]
            - generic [ref=e86]: Tarefas
        - listitem [ref=e87]: Acompanhar
        - listitem [ref=e88]:
          - link "Registros" [ref=e89] [cursor=pointer]:
            - /url: /logs
            - img [ref=e90]
            - generic [ref=e93]: Registros
        - listitem [ref=e94]: Aprender
        - listitem [ref=e95]:
          - link "Documentação" [ref=e96] [cursor=pointer]:
            - /url: /docs
            - img [ref=e97]
            - generic [ref=e99]: Documentação
    - generic [ref=e100]:
      - generic [ref=e101]: Sistema
      - list [ref=e104]:
        - listitem [ref=e105]:
          - button "Reiniciar gateway" [ref=e106]:
            - img [ref=e107]
            - generic [ref=e110]: Reiniciar gateway
        - listitem [ref=e111]:
          - button "Atualizar Mangaba" [ref=e112]:
            - img [ref=e113]
            - generic [ref=e116]: Atualizar Mangaba
    - generic [ref=e118]:
      - button "Modo dia" [ref=e119]:
        - img
      - button "Mudar tema" [ref=e121]:
        - generic [ref=e122]:
          - img
          - generic [ref=e123]: Enterprise
      - button "Mudar para inglês" [ref=e125]:
        - generic [ref=e127]: Português
    - generic [ref=e128]:
      - generic [ref=e129]: —
      - link "Dheiver Santos" [ref=e130] [cursor=pointer]:
        - /url: https://dheiver2.com
  - generic [ref=e131]:
    - banner [ref=e132]:
      - heading "Fleet" [level=1] [ref=e135]
    - main [ref=e136]:
      - generic [ref=e141]:
        - generic [ref=e142]:
          - generic [ref=e143]:
            - img [ref=e144]
            - heading "Frota de agentes" [level=2] [ref=e150]
          - button "Atualizar" [ref=e151]:
            - img
            - text: Atualizar
        - paragraph [ref=e152]: 0 agente(s) · 0 no ar · 0 parado(s)
        - generic [ref=e154]:
          - img [ref=e155]
          - textbox "Aviso para o canal-operador de todos os agentes…" [ref=e158]
          - button "Enviar" [disabled]
        - generic [ref=e160]:
          - img [ref=e162]
          - heading "Nenhum agente ainda" [level=3] [ref=e168]
          - paragraph [ref=e169]: Crie seu primeiro perfil de agente para começar. Cada perfil é um agente independente com personalidade e modelo próprios.
          - button "Criar um agente" [ref=e170]
```