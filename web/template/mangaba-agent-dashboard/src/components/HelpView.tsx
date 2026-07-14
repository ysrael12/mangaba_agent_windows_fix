import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  HelpCircle, 
  Terminal, 
  Wifi, 
  RefreshCw, 
  AlertTriangle, 
  MessageSquare, 
  ArrowRight,
  CheckCircle,
  Clock,
  Play,
  Mail,
  Bug,
  Compass,
  FileText
} from 'lucide-react';

interface HelpViewProps {
  darkMode: boolean;
  onCreateAgentShortcut: () => void;
  setView: (view: string) => void;
}

export default function HelpView({
  darkMode,
  onCreateAgentShortcut,
  setView
}: HelpViewProps) {
  const [activeTab, setActiveTab] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  // Troubleshooting simulator states
  const [troubleState, setTroubleState] = useState<'idle' | 'testing-net' | 'clearing-cache' | 'restarting-svc'>('idle');
  const [troubleOutput, setTroubleOutput] = useState<string | null>(null);

  // Support Form ticket
  const [ticket, setTicket] = useState({ email: '', category: 'Bug Report', text: '' });
  const [ticketSent, setTicketSent] = useState(false);

  const handleTroubleshoot = (type: 'net' | 'cache' | 'restart') => {
    setTroubleOutput(null);
    if (type === 'net') {
      setTroubleState('testing-net');
      setTimeout(() => {
        setTroubleState('idle');
        setTroubleOutput('🟢 LATÊNCIA DA REDE: 12ms • STATUS: Conectado à porta local 3000. Nenhum pacote perdido registrado.');
      }, 1200);
    } else if (type === 'cache') {
      setTroubleState('clearing-cache');
      setTimeout(() => {
        setTroubleState('idle');
        setTroubleOutput('✓ CACHE LOCAL PURGADO: Tema e preferências de tamanho de fonte limpos com sucesso. O arquivo local index.json foi reindexado.');
      }, 1000);
    } else if (type === 'restart') {
      setTroubleState('restarting-svc');
      setTimeout(() => {
        setTroubleState('idle');
        setTroubleOutput('🔄 SERVIÇO TERMINAL REINICIADO: Executado comando systemctl restart mangaba-agent. Escutando na porta 3000 de forma normal.');
      }, 1500);
    }
  };

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket.email || !ticket.text) {
      alert('Por favor, preencha o email e a descrição da sua dúvida.');
      return;
    }
    setTicketSent(true);
    setTimeout(() => {
      setTicketSent(false);
      alert('Ticket de suporte transmitido com sucesso para support@mangaba.ai! Responderemos em poucas horas.');
      setTicket({ email: '', category: 'Bug Report', text: '' });
    }, 1200);
  };

  const tabs = [
    { id: 'getting-started', label: 'Primeiros Passos', desc: 'Como acessar o dashboard, mudar temas e atalhos' },
    { id: 'navigation', label: 'Navegação & Palette', desc: 'Layout da tela, Command Palette (⌘K) e responsividade' },
    { id: 'features', label: 'Funcionalidades', desc: 'Home, Chat, Sessões, Criar Agente e Active Fleet' },
    { id: 'troubleshooting', label: 'Diagnóstico & Suporte', desc: 'Mensagens comuns de erro e simulador local' }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Title header */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300
        ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}
      `}>
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <h1 className={`font-display font-bold text-xl tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Guia de Uso & Central de Ajuda
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Aprenda a operar o Mangaba Agent Dashboard passo a passo e resolva imprevistos de deploy.
            </p>
          </div>
        </div>

        <button
          onClick={onCreateAgentShortcut}
          className="bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
        >
          Iniciar Criação de Agente (Wizard)
        </button>
      </div>

      {/* Main Chapter Navigation Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Navigation panel */}
        <div className="space-y-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer block
                ${activeTab === tab.id 
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 font-bold' 
                  : darkMode 
                    ? 'bg-[#12161f] hover:bg-[#161a22] border-[#1f242e] text-slate-400 hover:text-white' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'}`}
            >
              <span className="text-xs font-bold block">{tab.label}</span>
              <span className="text-[9px] text-slate-500 mt-0.5 font-normal leading-normal block">{tab.desc}</span>
            </button>
          ))}
        </div>

        {/* Content Box panel */}
        <div className={`md:col-span-3 p-6 rounded-2xl border space-y-6
          ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}`}
        >
          
          {/* TAB 1: Getting Started */}
          {activeTab === 'getting-started' && (
            <div className="space-y-5 animate-fade-in text-sm text-slate-500 leading-relaxed">
              <h3 className={`font-display font-bold text-base tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                1. Primeiros Passos
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-2`}>Como Acessar</h4>
                  <p className="text-xs">
                    Seu ambiente operacional é implantado localmente. No navegador, acesse <strong className="font-mono text-emerald-500">http://localhost:3000</strong>. Ao subir no contêiner do Cloud Run, a plataforma redirecionará de forma segura.
                  </p>
                </div>

                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-2`}>Mudar Tema (Claro/Escuro)</h4>
                  <p className="text-xs">
                    No rodapé do menu lateral esquerdo ou em Configurações, há um botão de ☀️ Modo Dia / 🌙 Modo Noite. O tema é memorizado automaticamente nos cookies do navegador de forma persistente.
                  </p>
                </div>

                <div className="pt-2">
                  <h4 className={`text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-2.5`}>Layout Geral da Tela</h4>
                  <pre className="p-3 bg-slate-950 rounded-lg text-[10px] font-mono leading-normal text-slate-300 border border-slate-800">
{`┌─────────────────────────────────────────────────────┐
│ ☰ Menu  |  🎨 Tema  |  ⌘K Buscar  |  ⚙️ Configurar │
├────────┬───────────────────────────────────────────┤
│        │                                           │
│ MENU   │     CONTEÚDO PRINCIPAL                   │
│        │     (muda conforme página)                │
│        │                                           │
│ • Home │                                           │
│ • Chat │                                           │
│ • Logs │                                           │
│ • Etc  │                                           │
│        │                                           │
└────────┴───────────────────────────────────────────┘`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Navigation & Command Palette */}
          {activeTab === 'navigation' && (
            <div className="space-y-5 animate-fade-in text-sm text-slate-500 leading-relaxed">
              <h3 className={`font-display font-bold text-base tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                2. Navegação & Command Palette
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-2`}>Atalhos de Navegação</h4>
                  <p className="text-xs">
                    Pressione <strong className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-300">⌘K</strong> no Mac ou <strong className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-300">Ctrl+K</strong> no Windows/Linux para evocar a <strong>Busca Rápida / Command Palette</strong>. Digite termos como <code className="text-emerald-500 font-mono">chat</code>, <code className="text-emerald-500 font-mono">logs</code> ou <code className="text-emerald-500 font-mono">config</code> para acionar atalhos e mudar de tela de forma instantânea.
                  </p>
                </div>

                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-2`}>Atalhos de Teclado</h4>
                  <div className="overflow-hidden border border-slate-500/10 rounded-lg">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-slate-500/5 font-mono text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-500/10">
                        <tr>
                          <th className="p-2.5">Atalho</th>
                          <th className="p-2.5">Ação Operacional</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-500/10">
                        <tr>
                          <td className="p-2.5 font-mono font-bold text-emerald-500">⌘K / Ctrl+K</td>
                          <td className="p-2.5">Evocar a busca rápida (Command Palette)</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono font-bold text-emerald-500">Esc</td>
                          <td className="p-2.5">Fechar diálogos, modais ou menu lateral móvel</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono font-bold text-emerald-500">Enter</td>
                          <td className="p-2.5">Enviar mensagem para o agente no chat</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono font-bold text-emerald-500">Tab / Shift+Tab</td>
                          <td className="p-2.5">Navegar de forma acessível entre elementos do wizard</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Main Features */}
          {activeTab === 'features' && (
            <div className="space-y-5 animate-fade-in text-sm text-slate-500 leading-relaxed">
              <h3 className={`font-display font-bold text-base tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                3. Funcionalidades Principais
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <Compass className="h-4 w-4" />
                      <span>Home / Início</span>
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      Painel bento geral de telemetria mostrando a quantidade de requisições, status de falhas dos agentes da frota e atalhos rápidos para disparo.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>Conversar & Sessões</span>
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      Conecte-se em tempo real aos agentes configurados. Cada interação é salva de forma isolada por data no menu de sessões do painel lateral.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Agendador de Heartbeat</span>
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      Gere rotinas de loop baseadas em crons dinâmicos escrevendo livremente em português (ex: &ldquo;todo dia às 9h&rdquo;). O motor de tradução cuida da formatação.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <Terminal className="h-4 w-4" />
                      <span>Monitoramento Fleet</span>
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      Identifique e recupere agentes instáveis que sofreram falhas críticas ou timeouts de rede em segundos com o botão reiniciar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Troubleshooting and Diagnostics */}
          {activeTab === 'troubleshooting' && (
            <div className="space-y-5 animate-fade-in text-sm text-slate-500 leading-relaxed">
              <h3 className={`font-display font-bold text-base tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                4. Central de Diagnóstico & Suporte Local
              </h3>

              {/* Troubleshooting panel simulation */}
              <div className={`p-4 rounded-xl border space-y-4
                ${darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-150'}`}
              >
                <div>
                  <h4 className={`text-xs font-bold text-slate-400 uppercase tracking-widest font-mono`}>
                    Auto-Diagnóstico de Serviços (Troubleshooter)
                  </h4>
                  <p className="text-[10px] mt-0.5">
                    Caso sinta que algum agente está ocioso ou com latência na porta 3000, rode os auto-testes abaixo:
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleTroubleshoot('net')}
                    disabled={troubleState !== 'idle'}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {troubleState === 'testing-net' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wifi className="h-3.5 w-3.5 text-emerald-500" />}
                    <span>Testar Latência</span>
                  </button>

                  <button
                    onClick={() => handleTroubleshoot('cache')}
                    disabled={troubleState !== 'idle'}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {troubleState === 'clearing-cache' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Terminal className="h-3.5 w-3.5 text-emerald-500" />}
                    <span>Limpar Cache</span>
                  </button>

                  <button
                    onClick={() => handleTroubleshoot('restart')}
                    disabled={troubleState !== 'idle'}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-[#ff4545]/10 hover:border-[#ff4545]/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {troubleState === 'restarting-svc' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 text-rose-500" />}
                    <span>Reiniciar Serviço</span>
                  </button>
                </div>

                {/* Simulated outputs */}
                {troubleOutput && (
                  <div className="p-3 rounded-lg bg-black/50 border border-slate-500/10 font-mono text-[10px] text-emerald-400 whitespace-pre-wrap leading-normal">
                    {troubleOutput}
                  </div>
                )}
              </div>

              {/* Support Email submission form */}
              <form onSubmit={handleSendTicket} className="space-y-4 pt-2 border-t border-slate-500/10">
                <div>
                  <h4 className={`text-xs font-bold text-slate-400 uppercase tracking-widest font-mono`}>
                    Dúvida Comercial / Relatório de Erros (Tickets)
                  </h4>
                  <p className="text-[10px] mt-0.5">
                    Preencha o ticket abaixo. Nossa equipe do Mangaba Agent responderá de forma cortês.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold uppercase text-slate-500 block">Seu E-mail</label>
                    <input
                      type="email"
                      value={ticket.email}
                      onChange={(e) => setTicket(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Ex: admin@empresa.com"
                      className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500
                        ${darkMode ? 'bg-[#161a22] border-[#252c39] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold uppercase text-slate-500 block">Categoria do Ticket</label>
                    <select
                      value={ticket.category}
                      onChange={(e) => setTicket(prev => ({ ...prev, category: e.target.value }))}
                      className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium
                        ${darkMode ? 'bg-[#161a22] border-[#252c39] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                    >
                      <option value="Bug Report">Relatar Falha de Sistema (Bug)</option>
                      <option value="General Question">Dúvida Técnica (Habilidades/MCP)</option>
                      <option value="Comercial">Suporte Comercial & API Keys</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono font-bold uppercase text-slate-500 block">Descreva sua solicitação</label>
                  <textarea
                    rows={3}
                    value={ticket.text}
                    onChange={(e) => setTicket(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Minha conexão local de Postgres com o MCP falha com erro timeout..."
                    className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500 font-sans leading-relaxed
                      ${darkMode ? 'bg-[#161a22] border-[#252c39] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  />
                </div>

                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                >
                  Enviar Ticket de Suporte
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
