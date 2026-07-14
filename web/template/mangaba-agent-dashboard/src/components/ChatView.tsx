import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Cpu, 
  MessageSquare, 
  Trash2, 
  Wifi, 
  Terminal, 
  History, 
  Plus, 
  ArrowLeft,
  ChevronRight,
  User,
  Zap,
  Clock
} from 'lucide-react';
import { Agent, Session, Message } from '../types';
import { MOCK_REPLIES } from '../utils/mockData';

interface ChatViewProps {
  agents: Agent[];
  sessions: Session[];
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  selectedAgentId: string;
  setSelectedAgentId: (id: string) => void;
  darkMode: boolean;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
}

export default function ChatView({
  agents,
  sessions,
  setSessions,
  selectedAgentId,
  setSelectedAgentId,
  darkMode,
  activeSessionId,
  setActiveSessionId
}: ChatViewProps) {
  const [inputText, setInputText] = useState('');
  const [connecting, setConnecting] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto connect simulation
  useEffect(() => {
    setConnecting(true);
    const timer = setTimeout(() => {
      setConnecting(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [selectedAgentId, activeSessionId]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessions, isTyping, connecting]);

  // Active agent object
  const activeAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  // Active session or auto creation if null
  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions.find(s => s.agentId === selectedAgentId);

  useEffect(() => {
    if (currentSession && currentSession.id !== activeSessionId) {
      setActiveSessionId(currentSession.id);
    }
  }, [currentSession, activeSessionId, setActiveSessionId]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || connecting || isTyping) return;

    const userMsgText = inputText.trim();
    setInputText('');

    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const userMessage: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: userMsgText,
      timestamp: timeString
    };

    // If session doesn't exist, create one
    let targetSessionId = activeSessionId;
    let updatedSessions = [...sessions];

    if (!currentSession) {
      const newSessId = `sess-${Math.random()}`;
      const newSession: Session = {
        id: newSessId,
        title: userMsgText.length > 30 ? userMsgText.slice(0, 30) + '...' : userMsgText,
        time: timeString,
        dateGroup: 'Hoje',
        agentId: selectedAgentId,
        messages: [userMessage]
      };
      updatedSessions.unshift(newSession);
      targetSessionId = newSessId;
      setActiveSessionId(newSessId);
    } else {
      updatedSessions = sessions.map(s => {
        if (s.id === currentSession.id) {
          return {
            ...s,
            messages: [...s.messages, userMessage],
            time: timeString
          };
        }
        return s;
      });
    }

    setSessions(updatedSessions);
    setIsTyping(true);

    // Simulated reply trigger
    setTimeout(() => {
      setIsTyping(false);
      const agentReplies = MOCK_REPLIES[selectedAgentId] || MOCK_REPLIES.generic;
      // Get a pseudo-random or sequentially cycled reply
      const randReply = agentReplies[Math.floor(Math.random() * agentReplies.length)];

      const agentMessage: Message = {
        id: Math.random().toString(),
        sender: 'agent',
        text: randReply,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };

      setSessions(prevSess => prevSess.map(s => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            messages: [...s.messages, agentMessage]
          };
        }
        return s;
      }));
    }, 1500);
  };

  const createNewSession = () => {
    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const newSessId = `sess-${Math.random()}`;
    const defaultWelcomeMessage: Message = {
      id: 'welcome',
      sender: 'agent',
      text: `Olá! Sou o ${activeAgent.name}. Como posso ajudar você no dia de hoje? Estou conectado no canal local.`,
      timestamp: timeString
    };

    const newSession: Session = {
      id: newSessId,
      title: `Nova conversa com ${activeAgent.name}`,
      time: timeString,
      dateGroup: 'Hoje',
      agentId: selectedAgentId,
      messages: [defaultWelcomeMessage]
    };

    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSessId);
  };

  const deleteSession = (sessId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== sessId);
    setSessions(updated);
    if (activeSessionId === sessId) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
        setSelectedAgentId(updated[0].agentId);
      } else {
        setActiveSessionId(null);
      }
    }
  };

  return (
    <div className={`h-[calc(100vh-100px)] rounded-xl border flex overflow-hidden
      ${darkMode 
        ? 'bg-[#12161f] border-[#1f242e]' 
        : 'bg-white border-slate-200'}
    `}>
      {/* Session History Sidebar on Left */}
      <aside className={`w-64 border-r flex flex-col shrink-0 hidden md:flex
        ${darkMode ? 'border-[#1f242e] bg-[#0c0e12]' : 'border-slate-150 bg-slate-50/50'}
      `}>
        <div className="p-3 border-b flex items-center justify-between border-slate-500/10">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            <span>Conversas Salvas</span>
          </span>
          <button 
            onClick={createNewSession}
            className="p-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all cursor-pointer"
            title="Nova Conversa"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* List of sessions */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3 scrollbar-thin">
          {['Hoje', 'Ontem', 'Anteriores'].map((group) => {
            const groupSessions = sessions.filter(s => s.dateGroup === group);
            if (groupSessions.length === 0) return null;
            return (
              <div key={group} className="space-y-1">
                <div className="px-2 text-[9px] font-mono font-semibold text-slate-400 uppercase">
                  {group}
                </div>
                <div className="space-y-0.5">
                  {groupSessions.map((sess) => {
                    const isSessActive = sess.id === activeSessionId;
                    const sessAgent = agents.find(a => a.id === sess.agentId) || activeAgent;
                    return (
                      <div
                        key={sess.id}
                        onClick={() => {
                          setActiveSessionId(sess.id);
                          setSelectedAgentId(sess.agentId);
                        }}
                        className={`
                          group/sess p-2.5 rounded-lg text-xs font-medium cursor-pointer flex items-start gap-2.5 transition-all
                          ${isSessActive 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : darkMode 
                              ? 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200' 
                              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'}
                        `}
                      >
                        <MessageSquare className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${isSessActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold truncate">{sess.title}</span>
                            <span className="text-[9px] text-slate-500 font-mono shrink-0 ml-1">{sess.time}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Cpu className="h-2.5 w-2.5" />
                            <span>{sessAgent.name}</span>
                          </span>
                        </div>
                        <button
                          onClick={(e) => deleteSession(sess.id, e)}
                          className="opacity-0 group-hover/sess:opacity-100 p-1 rounded hover:bg-slate-500/20 text-rose-500 transition-opacity cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {sessions.length === 0 && (
            <div className="p-4 text-center text-slate-500 font-mono text-[10px]">
              Nenhuma sessão ativa. Comece uma nova!
            </div>
          )}
        </div>
      </aside>

      {/* Primary Chat Box Console Area */}
      <div className="flex-1 flex flex-col justify-between relative bg-radial from-transparent to-slate-500/2">
        {/* Chat Header Status */}
        <div className={`p-4 border-b flex items-center justify-between
          ${darkMode ? 'border-[#1f242e] bg-[#12161f]' : 'border-slate-150 bg-white'}
        `}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-500/10 text-slate-400">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {activeAgent.name}
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1.5 font-bold bg-emerald-500/10 text-emerald-500`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{connecting ? 'CONECTANDO...' : 'SALA ATIVA'}</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                <span>Model: {activeAgent.model}</span>
                <span>•</span>
                <span>Provider: {activeAgent.provider}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick dropdown for changing active agent */}
            <select
              value={selectedAgentId}
              onChange={(e) => {
                setSelectedAgentId(e.target.value);
                setActiveSessionId(null); // Reset session to find one matching this agent
              }}
              className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium focus:outline-none cursor-pointer
                ${darkMode 
                  ? 'bg-[#161a22] border-[#252c39] text-slate-300' 
                  : 'bg-slate-50 border-slate-200 text-slate-700'}
              `}
            >
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Messages scrollarea */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {connecting ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2.5 text-slate-500">
              <span className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
              <span className="text-xs font-mono tracking-widest uppercase animate-pulse">Conectando ao servidor...</span>
            </div>
          ) : (
            <>
              {/* Operational notice alert */}
              <div className={`p-3 rounded-xl border text-[11px] font-mono leading-relaxed flex items-start gap-3
                ${darkMode 
                  ? 'bg-[#181d29]/40 border-[#2b354a]/30 text-slate-400' 
                  : 'bg-emerald-500/5 border-emerald-500/10 text-slate-600'}
              `}>
                <Wifi className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className={darkMode ? 'text-slate-300' : 'text-slate-800'}>CONEXÃO LOCAL OPERACIONAL:</strong> O agente responde sob as regras da Soul local e utiliza ferramentas ativas para orquestrar dados. O histórico de conversas é persistido na sessão atual.
                </div>
              </div>

              {/* Chat dialogue content */}
              {currentSession && currentSession.messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                    <div className={`p-2 rounded-xl h-8 w-8 flex items-center justify-center shrink-0 text-white font-mono font-bold text-xs shadow-xs
                      ${isUser ? 'bg-[#252c39]' : 'bg-emerald-500'}
                    `}>
                      {isUser ? <User className="h-4 w-4" /> : <Cpu className="h-4 w-4" />}
                    </div>
                    <div className={`space-y-1`}>
                      <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-xs
                        ${isUser 
                          ? darkMode 
                            ? 'bg-[#1f293d] text-white' 
                            : 'bg-emerald-500 text-white' 
                          : darkMode 
                            ? 'bg-[#181d29] border border-[#232a3a] text-slate-100' 
                            : 'bg-slate-100 text-slate-800'}
                      `}>
                        {msg.text}
                      </div>
                      <div className={`flex items-center gap-1.5 text-[9px] font-mono text-slate-500 ${isUser ? 'justify-end' : ''}`}>
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing simulation */}
              {isTyping && (
                <div className="flex gap-3 max-w-md">
                  <div className="p-2 rounded-xl h-8 w-8 flex items-center justify-center bg-emerald-500 text-white shrink-0">
                    <Cpu className="h-4 w-4 animate-pulse" />
                  </div>
                  <div className="space-y-1.5">
                    <div className={`p-3.5 rounded-2xl text-xs font-mono font-medium flex items-center gap-2
                      ${darkMode ? 'bg-[#181d29] text-slate-400' : 'bg-slate-100 text-slate-500'}
                    `}>
                      <span>{activeAgent.name} está digitando</span>
                      <span className="flex gap-1">
                        <span className="h-1 w-1 bg-emerald-500 rounded-full animate-bounce" />
                        <span className="h-1 w-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="h-1 w-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Action input bar footer */}
        <form 
          onSubmit={handleSendMessage} 
          className={`p-3 border-t flex items-center gap-3
            ${darkMode ? 'border-[#1f242e] bg-[#12161f]' : 'border-slate-150 bg-white'}
          `}
        >
          <input
            type="text"
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm outline-none border focus:ring-1 focus:ring-emerald-500
              ${darkMode 
                ? 'bg-[#161a22] border-[#252c39] text-slate-100 focus:bg-slate-900' 
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'}
            `}
            placeholder={connecting ? "Aguardando conexão..." : "Digite uma mensagem para o agente e pressione Enter..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={connecting || isTyping}
          />
          <button
            type="submit"
            className={`p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white transition-all shadow-xs cursor-pointer
              ${(connecting || !inputText.trim() || isTyping) ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            disabled={connecting || !inputText.trim() || isTyping}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
