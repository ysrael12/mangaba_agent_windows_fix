import React from 'react';
import { 
  Home, 
  BookOpen, 
  MessageSquare, 
  History, 
  PlusCircle, 
  Cpu, 
  Terminal, 
  Settings, 
  Sun, 
  Moon, 
  Menu, 
  X,
  Search,
  Zap
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (val: boolean) => void;
  onOpenCommandPalette: () => void;
}

export default function Sidebar({
  currentView,
  setView,
  darkMode,
  setDarkMode,
  mobileOpen,
  setMobileOpen,
  onOpenCommandPalette
}: SidebarProps) {
  
  const menuGroups = [
    {
      title: 'COMEÇAR',
      items: [
        { id: 'home', label: 'Início', icon: Home },
        { id: 'help', label: 'Guia do Usuário', icon: BookOpen },
      ]
    },
    {
      title: 'CONVERSAR',
      items: [
        { id: 'chat', label: 'Chat com Agentes', icon: MessageSquare },
        { id: 'sessions', label: 'Minhas Sessões', icon: History },
      ]
    },
    {
      title: 'AGENTES',
      items: [
        { id: 'wizard', label: 'Criar Agente', icon: PlusCircle },
        { id: 'fleet', label: 'Agentes Ativos', icon: Cpu },
      ]
    },
    {
      title: 'SISTEMA',
      items: [
        { id: 'logs', label: 'Logs', icon: Terminal },
        { id: 'settings', label: 'Configurações', icon: Settings },
      ]
    }
  ];

  const handleNav = (viewId: string) => {
    setView(viewId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Sidebar Mobile Toggle Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 border-r flex flex-col transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        ${darkMode 
          ? 'bg-[#0f1115] border-[#1f242e] text-slate-300' 
          : 'bg-white border-slate-200 text-slate-700'}
      `}>
        {/* Header Logo */}
        <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'border-[#1f242e]' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNav('home')}>
            <div className="p-2 bg-emerald-500 rounded-lg text-white shadow-xs">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div>
              <span className={`font-display font-bold tracking-tight text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Mangaba <span className="text-emerald-500">Agent</span>
              </span>
              <div className="text-[10px] font-mono text-slate-400 font-medium tracking-widest uppercase">
                DASHBOARD V1.0
              </div>
            </div>
          </div>
          <button 
            onClick={() => setMobileOpen(false)} 
            className="lg:hidden p-1 rounded-md hover:bg-slate-500/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Command Trigger button */}
        <div className="p-3">
          <button
            onClick={onOpenCommandPalette}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg border text-left cursor-pointer transition-colors
              ${darkMode 
                ? 'bg-[#161a22] hover:bg-[#1d232e] border-[#252c39] text-slate-400' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500'}
            `}
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>Buscar...</span>
            </span>
            <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5 scrollbar-thin">
          {menuGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <h4 className="px-3 text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                {group.title}
              </h4>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id || (item.id === 'chat' && currentView === 'sessions');
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer group
                        ${isActive 
                          ? 'bg-emerald-500/10 text-emerald-500 font-semibold' 
                          : darkMode 
                            ? 'hover:bg-[#161a22] text-slate-400 hover:text-slate-100' 
                            : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}
                      `}
                    >
                      <Icon className={`
                        h-4 w-4 transition-transform group-hover:scale-105
                        ${isActive ? 'text-emerald-500' : 'text-slate-400 group-hover:text-slate-300'}
                      `} />
                      <span>{item.label}</span>
                      {item.id === 'wizard' && (
                        <span className="ml-auto text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-mono font-bold">
                          NOVO
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Theme and Status */}
        <div className={`p-4 border-t flex items-center justify-between ${darkMode ? 'border-[#1f242e]' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-mono font-semibold text-emerald-500">
              LOCAL PORT: 3000
            </span>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg border transition-all cursor-pointer hover:scale-105
              ${darkMode 
                ? 'bg-[#161a22] hover:bg-[#1d232e] border-[#252c39] text-amber-400' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-indigo-500'}
            `}
            title={darkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    </>
  );
}
