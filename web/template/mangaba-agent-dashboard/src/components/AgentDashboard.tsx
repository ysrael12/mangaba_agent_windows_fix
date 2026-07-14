import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Settings, 
  Send, 
  FolderOpen, 
  Heart, 
  Share2, 
  Terminal, 
  Zap, 
  Clock, 
  ArrowLeft,
  Copy,
  Check,
  Play,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { AgentDraft, Message, Log } from '../types';

interface AgentDashboardProps {
  draft: AgentDraft;
  darkMode: boolean;
  onEdit: () => void;
  onBackToHome: () => void;
}

export default function AgentDashboard({
  draft,
  darkMode,
  onEdit,
  onBackToHome
}: AgentDashboardProps) {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'agent',
      text: `Olá! Sou o ${draft.identity.name}. Acabei de passar pelo deploy local na porta 3000 e estou online. Como posso ajudar com minhas habilidades configuradas?`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [logsList, setLogsList] = useState<Log[]>([
    { id: '1', timestamp: new Date().toLocaleTimeString('pt-BR'), level: 'SUCCESS', message: 'Deploy do agente concluído com sucesso na porta 3000', service: 'Deployer' },
    { id: '2', timestamp: new Date().toLocaleTimeString('pt-BR'), level: 'INFO', message: `Instanciado motor cognitivo ${draft.modelConfig.model}`, service: 'Engine' },
    { id: '3', timestamp: new Date().toLocaleTimeString('pt-BR'), level: 'INFO', message: `MCP: ${draft.mcpServers.length} conectores ativos`, service: 'MCP Gateway' }
  ]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logsList]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const handleCopyToken = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping) return;

    const text = chatInput.trim();
    setChatInput('');

    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text,
      timestamp: timeString
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Stream logs simulating operations
    appendSimulatedLog('INFO', `Chat recebido via Console de Admin: "${text.slice(0, 30)}..."`, 'Console');
    
    setTimeout(() => {
      appendSimulatedLog('DEBUG', 'Consultando Soul e regras de contexto do perfil default', 'Agent Engine');
      
      setTimeout(() => {
        if (draft.knowledgeFiles.length > 0) {
          appendSimulatedLog('INFO', `Consultando RAG local em ${draft.knowledgeFiles.length} documentos`, 'RAG Pipeline');
        }
        
        setTimeout(() => {
          if (draft.mcpServers.length > 0) {
            appendSimulatedLog('INFO', 'Invocando conexão com servidores MCP acoplados', 'MCP Client');
          }
          
          setTimeout(() => {
            setIsTyping(false);
            const finalAgentMsg: Message = {
              id: Math.random().toString(),
              sender: 'agent',
              text: `Resposta processada sob o motor cognitivo ${draft.modelConfig.model}. Executei a varredura do contexto e minhas ferramentas locais estão escutando comandos!`,
              timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            };
            setChatMessages(prev => [...prev, finalAgentMsg]);
            appendSimulatedLog('SUCCESS', 'Resposta computada e transmitida ao canal de Admin', 'LLM Gateway');
          }, 600);
        }, 500);
      }, 500);
    }, 400);
  };

  const appendSimulatedLog = (level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG', msg: string, svc: string) => {
    const timeStr = new Date().toLocaleTimeString('pt-BR');
    const newLog: Log = {
      id: Math.random().toString(),
      timestamp: timeStr,
      level,
      message: msg,
      service: svc
    };
    setLogsList(prev => [...prev, newLog]);
  };

  // Counting active muscles/tools
  const activeToolsCount = Object.values(draft.internalTools).filter(Boolean).length;
  const activeSkillsCount = Object.values(draft.skills).filter(s => s.enabled).length;
  const activeMcpCount = draft.mcpServers.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* A. Header status bar */}
      <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300
        ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}
      `}>
        <div className="flex items-center gap-3.5">
          <button 
            onClick={onBackToHome}
            className={`p-2 rounded-xl border hover:scale-105 transition-all cursor-pointer
              ${darkMode 
                ? 'bg-[#161a22] border-[#252c39] text-slate-400 hover:text-white' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'}`}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`font-display font-bold text-xl tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {draft.identity.name}
              </h1>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-500 tracking-wider">
                ONLINE E OPERANTE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Agente default criado com sucesso • Respondendo na porta local 3000
            </p>
          </div>
        </div>

        <button
          onClick={onEdit}
          className={`px-4 py-2 text-xs font-semibold rounded-xl border flex items-center gap-2 transition-all cursor-pointer hover:scale-102
            ${darkMode 
              ? 'bg-[#161a22] border-[#252c39] hover:bg-slate-800 text-slate-200' 
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`}
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Editar Configurações</span>
        </button>
      </div>

      {/* B. Bento Grid 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Brain (Cérebro) */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between h-[155px]
          ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">CÉREBRO (LLM)</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Cpu className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex-1 flex flex-col justify-center">
            <span className={`text-base font-display font-bold tracking-tight block ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {draft.modelConfig.model}
            </span>
            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-normal">
              {draft.identity.soul}
            </p>
          </div>
          <span className="text-[9px] font-mono text-emerald-500 font-bold uppercase tracking-wider block mt-1">
            Provider: {draft.modelConfig.provider}
          </span>
        </div>

        {/* Card 2: Knowledge (RAG) */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between h-[155px]
          ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">CONHECIMENTO (RAG)</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <FolderOpen className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex-1 flex flex-col justify-center">
            <span className={`text-2xl font-display font-bold tracking-tight block ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {draft.knowledgeFiles.length} docs
            </span>
            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-normal">
              {draft.knowledgeFiles.length > 0 
                ? draft.knowledgeFiles.map(f => f.name).join(', ')
                : 'Nenhum documento ou PDF anexado ao banco de dados.'}
            </p>
          </div>
          <span className="text-[9px] font-mono text-slate-400 block mt-1">
            Mecanismo: TF-IDF cosseno local
          </span>
        </div>

        {/* Card 3: Muscles (Tools/Skills/MCP) */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between h-[155px]
          ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">MÚSCULOS (CAPABILITIES)</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Zap className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex-1 flex flex-col justify-center">
            <span className={`text-2xl font-display font-bold tracking-tight block ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {activeToolsCount + activeSkillsCount + activeMcpCount} ativos
            </span>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              &bull; {activeToolsCount} nativas, {activeSkillsCount} habilidades forjadas<br />
              &bull; {activeMcpCount} servidores MCP acoplados
            </p>
          </div>
          <span className="text-[9px] font-mono text-amber-500 font-bold block mt-1 uppercase">
            Sincronização em tempo real
          </span>
        </div>

        {/* Card 4: Channels (Canais) */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between h-[155px]
          ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">CANAIS EXTERNOS</span>
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
              <Share2 className="h-4 w-4" />
            </span>
          </div>
          
          <div className="mt-2 flex-1 flex flex-col justify-center space-y-1">
            {Object.entries(draft.channels).filter(([_, ch]) => ch.enabled).length > 0 ? (
              Object.entries(draft.channels).filter(([_, ch]) => ch.enabled).map(([id, ch]) => (
                <div key={id} className="flex items-center justify-between bg-slate-500/5 px-2 py-1 rounded border border-slate-500/5 text-[10px] font-mono">
                  <span className="font-bold text-emerald-500">{id.toUpperCase()}</span>
                  <button
                    onClick={() => handleCopyToken(ch.token || 'webhook-dummy-string', id)}
                    className="hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Copiar</span>
                    {copiedId === id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-slate-400" />}
                  </button>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-slate-500 leading-normal">
                Nenhum canal ativo. O chatbot responde exclusivamente pelo Console Admin local.
              </p>
            )}
          </div>

          <span className="text-[9px] font-mono text-slate-400 block mt-1">
            Gatilho: Heartbeat ({draft.heartbeat.parsedCron || 'Desativado'})
          </span>
        </div>

      </div>

      {/* C. Action Panel and Real-time Observability Observador */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Quick Chat Console (Left) */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between h-[380px]
          ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center gap-2 mb-3 border-b pb-2 border-slate-500/10">
            <span className="p-1 bg-emerald-500/10 rounded text-emerald-500">
              <Settings className="h-4 w-4" />
            </span>
            <h3 className={`font-display font-bold text-sm tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Console de Teste Rápido (Dev Admin)
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 p-1 max-h-[230px] scrollbar-thin">
            {chatMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex gap-2.5 max-w-md ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                  <div className={`p-1 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 h-6 w-6 rounded-lg text-white
                    ${isUser ? 'bg-slate-700' : 'bg-emerald-500'}`}>
                    {isUser ? 'DEV' : 'AG'}
                  </div>
                  <div>
                    <p className={`p-2.5 rounded-xl text-xs whitespace-pre-wrap leading-relaxed shadow-xs
                      ${isUser 
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' 
                        : darkMode 
                          ? 'bg-[#161a22] border border-slate-800 text-slate-100' 
                          : 'bg-slate-100 text-slate-800'}`}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {isTyping && (
              <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5 p-1">
                <span className="animate-spin h-3.5 w-3.5 border border-emerald-500 border-t-transparent rounded-full" />
                <span>Orquestrando Habilidades e logs...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2 border-t pt-3 border-slate-500/10 mt-2">
            <input
              type="text"
              placeholder="Fale com seu novo agente e acompanhe os logs ao lado..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className={`flex-1 px-3.5 py-2 rounded-xl text-xs outline-none border focus:ring-1 focus:ring-emerald-500
                ${darkMode ? 'bg-[#161a22] border-[#252c39] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {/* Real-time System Logs feed (Right) */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between h-[380px]
          ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-500/10">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-amber-500/10 rounded text-amber-500 animate-pulse">
                <Terminal className="h-4 w-4" />
              </span>
              <h3 className={`font-display font-bold text-sm tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Fluxo de Observabilidade Real (Real-time Logs)
              </h3>
            </div>
            <span className="text-[9px] font-mono font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full uppercase">
              LIVE BROADCAST
            </span>
          </div>

          {/* Terminal log panel */}
          <div className="flex-1 bg-slate-950 rounded-xl p-3.5 overflow-y-auto max-h-[290px] font-mono text-[10px] space-y-2.5 scrollbar-thin">
            {logsList.map((log) => {
              const colorClass = {
                SUCCESS: 'text-emerald-400',
                INFO: 'text-sky-400',
                WARNING: 'text-amber-400',
                ERROR: 'text-rose-400',
                DEBUG: 'text-slate-400'
              }[log.level];

              return (
                <div key={log.id} className="flex items-start gap-2.5 leading-relaxed text-slate-300">
                  <span className="text-slate-500 select-none shrink-0">{log.timestamp}</span>
                  <span className={`font-bold shrink-0 ${colorClass}`}>[{log.level}]</span>
                  <span className="text-indigo-300 shrink-0 select-none">&lt;{log.service}&gt;</span>
                  <span className="flex-1 truncate text-slate-100">{log.message}</span>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        </div>

      </div>

    </div>
  );
}
