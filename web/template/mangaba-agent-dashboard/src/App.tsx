import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Bell, 
  Search, 
  ChevronRight, 
  Settings, 
  HelpCircle,
  X,
  CheckCircle,
  AlertTriangle,
  Zap
} from 'lucide-react';

import Sidebar from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import HomeView from './components/HomeView';
import ChatView from './components/ChatView';
import CreatorWizard from './components/CreatorWizard';
import AgentDashboard from './components/AgentDashboard';
import LogsView from './components/LogsView';
import SettingsView from './components/SettingsView';
import HelpView from './components/HelpView';
import FleetView from './components/FleetView';

import { Agent, Session, Log, AgentDraft } from './types';
import { INITIAL_AGENTS, INITIAL_SESSIONS, INITIAL_LOGS, INITIAL_DRAFT } from './utils/mockData';

export default function App() {
  // Theme and Layout States
  const [darkMode, setDarkMode] = useState(false);
  const [currentView, setView] = useState('home');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Core Data States
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS);
  const [logs, setLogs] = useState<Log[]>(INITIAL_LOGS);
  
  // Creation Wizard Draft
  const [draft, setDraft] = useState<AgentDraft>(INITIAL_DRAFT);
  
  // Selection references
  const [selectedAgentId, setSelectedAgentId] = useState('default');
  const [activeSessionId, setActiveSessionId] = useState<string | null>('sess-1');

  // Notification Toast state
  const [toast, setToast] = useState<{ show: boolean; text: string; type: 'success' | 'warning' | 'info' }>({
    show: false,
    text: '',
    type: 'success'
  });

  const showToast = (text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, text, type });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Handle Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Operation to restart agent from error
  const handleRestartAgent = (agentId: string) => {
    showToast('Iniciando sequência de reinicialização...', 'info');
    
    // Simulate compilation and restart
    setTimeout(() => {
      setAgents(prev => prev.map(a => {
        if (a.id === agentId) {
          return {
            ...a,
            status: 'active',
            uptime: '1m',
            requests: a.requests + 1,
            nextAction: '15:15 (Monitoramento)'
          };
        }
        return a;
      }));

      // Append log
      const timeStr = new Date().toLocaleTimeString('pt-BR');
      const newLog: Log = {
        id: `log-restart-${Math.random()}`,
        timestamp: timeStr,
        level: 'SUCCESS',
        message: `Servidor restabelecido. Agente "${agents.find(a => a.id === agentId)?.name}" operando em segundo plano.`,
        service: 'Orchestrator'
      };
      setLogs(prev => [newLog, ...prev]);

      showToast('Agente reiniciado com sucesso! Status: 🟢 Ativo.', 'success');
    }, 1500);
  };

  // Operation when wizard creation is complete
  const handleWizardComplete = (finalDraft: AgentDraft) => {
    // Compile draft into real Agent list
    const newAgentId = `agent-${Math.random().toString(36).substring(2, 9)}`;
    const newAgent: Agent = {
      id: newAgentId,
      name: finalDraft.identity.name || 'Agente Customizado',
      description: finalDraft.identity.name ? `Agente customizado focado em automações.` : 'Agente autônomo criado por wizard.',
      provider: finalDraft.modelConfig.provider,
      model: finalDraft.modelConfig.model,
      status: 'active',
      uptime: '1m',
      requests: 1,
      soul: finalDraft.identity.soul,
      tools: Object.entries(finalDraft.internalTools).filter(([_, v]) => v).map(([k]) => k),
      skills: Object.entries(finalDraft.skills).filter(([_, s]) => s.enabled).map(([k]) => k),
      mcpServers: finalDraft.mcpServers.map(s => s.name),
      channels: Object.entries(finalDraft.channels).filter(([_, ch]) => ch.enabled).map(([id]) => id),
      ragDocsCount: finalDraft.knowledgeFiles.length,
      schedule: finalDraft.heartbeat.schedule
    };

    setAgents(prev => [newAgent, ...prev]);
    
    // Save draft detail in state for dashboard preview and redirect
    setDraft({
      ...finalDraft,
      id: newAgentId
    });

    // Create a greeting session for the new agent in history list
    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const welcomeMsg = {
      id: 'welc-new',
      sender: 'agent' as const,
      text: `Olá! Sou o ${newAgent.name}. Acabei de passar pelo deploy local na porta 3000 e estou pronto!`,
      timestamp: timeString
    };
    const newSession: Session = {
      id: `sess-new-${newAgentId}`,
      title: `Conversa com ${newAgent.name}`,
      time: timeString,
      dateGroup: 'Hoje',
      agentId: newAgentId,
      messages: [welcomeMsg]
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(`sess-new-${newAgentId}`);
    setSelectedAgentId(newAgentId);

    // Switch view to agent dashboard
    setView('agent-dashboard');
    showToast(`Agente "${newAgent.name}" implantado com sucesso!`, 'success');
  };

  const handleCreateAgentShortcut = () => {
    setDraft(INITIAL_DRAFT);
    setView('wizard');
  };

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-200
      ${darkMode ? 'bg-[#0a0c10] text-slate-100' : 'bg-slate-50/50 text-slate-800'}
    `}>
      
      {/* Sidebar navigation */}
      <Sidebar
        currentView={currentView}
        setView={(v) => {
          if (v === 'sessions') {
            setView('chat');
          } else {
            setView(v);
          }
        }}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      {/* Main application container wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Universal application Topbar Header */}
        <header className={`px-4 py-3.5 border-b flex items-center justify-between shrink-0
          ${darkMode ? 'bg-[#0f1115]/80 border-[#1f242e] backdrop-blur-md' : 'bg-white border-slate-200'}
        `}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileOpen(true)}
              className={`p-2 rounded-lg border lg:hidden cursor-pointer
                ${darkMode ? 'bg-[#161a22] border-[#252c39] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
            >
              <Menu className="h-4 w-4" />
            </button>

            <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-md hidden sm:inline">
              MANGABA DEV-ADMIN
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCommandPaletteOpen(true)}
              className={`p-2 rounded-xl border text-slate-400 hover:text-slate-100 hover:scale-105 transition-all cursor-pointer hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs
                ${darkMode ? 'bg-[#161a22] border-[#252c39]' : 'bg-slate-50 border-slate-200'}`}
            >
              <Search className="h-3.5 w-3.5" />
              <span>⌘K Buscar</span>
            </button>

            <button
              onClick={() => showToast('Não há novos alertas pendentes no terminal.', 'info')}
              className={`p-2 rounded-xl border text-slate-400 hover:text-slate-200 transition-colors cursor-pointer relative
                ${darkMode ? 'bg-[#161a22] border-[#252c39]' : 'bg-slate-50 border-slate-200'}`}
              title="Notificações"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-emerald-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Dynamic page render slot */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
          
          {currentView === 'home' && (
            <HomeView
              agents={agents}
              setView={setView}
              setSelectedAgentId={setSelectedAgentId}
              darkMode={darkMode}
              onRestartAgent={handleRestartAgent}
              onCreateAgentShortcut={handleCreateAgentShortcut}
            />
          )}

          {currentView === 'chat' && (
            <ChatView
              agents={agents}
              sessions={sessions}
              setSessions={setSessions}
              selectedAgentId={selectedAgentId}
              setSelectedAgentId={setSelectedAgentId}
              darkMode={darkMode}
              activeSessionId={activeSessionId}
              setActiveSessionId={setActiveSessionId}
            />
          )}

          {currentView === 'wizard' && (
            <CreatorWizard
              onComplete={handleWizardComplete}
              darkMode={darkMode}
              draft={draft}
              setDraft={setDraft}
            />
          )}

          {currentView === 'agent-dashboard' && (
            <AgentDashboard
              draft={draft}
              darkMode={darkMode}
              onEdit={() => setView('wizard')}
              onBackToHome={() => setView('home')}
            />
          )}

          {currentView === 'fleet' && (
            <FleetView
              agents={agents}
              setAgents={setAgents}
              setView={setView}
              setSelectedAgentId={setSelectedAgentId}
              darkMode={darkMode}
              onRestartAgent={handleRestartAgent}
              onCreateAgentShortcut={handleCreateAgentShortcut}
            />
          )}

          {currentView === 'logs' && (
            <LogsView
              logs={logs}
              setLogs={setLogs}
              darkMode={darkMode}
              selectedAgentId={selectedAgentId}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          )}

          {currentView === 'help' && (
            <HelpView
              darkMode={darkMode}
              onCreateAgentShortcut={handleCreateAgentShortcut}
              setView={setView}
            />
          )}

        </main>
      </div>

      {/* Floating command palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        setView={setView}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Dynamic Toast Alerts Alert */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4.5 py-3 rounded-xl border shadow-2xl animate-slide-in-up font-medium text-xs text-white bg-slate-900 border-slate-800">
          {toast.type === 'success' && <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0" />}
          {toast.type === 'info' && <Zap className="h-4.5 w-4.5 text-sky-500 shrink-0 animate-pulse" />}
          
          <span>{toast.text}</span>
          
          <button 
            onClick={() => setToast(prev => ({ ...prev, show: false }))}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 shrink-0 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
