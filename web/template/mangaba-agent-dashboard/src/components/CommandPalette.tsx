import React, { useState, useEffect, useRef } from 'react';
import { Search, Compass, Terminal, ToggleLeft, ArrowRight, X } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setView: (view: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  setView,
  darkMode,
  setDarkMode
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent, but let's make sure it closes/opens properly
        }
      }
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const commands = [
    { id: 'go-home', title: 'Navegar: Início / Dashboard', category: 'Navegação', icon: Compass, action: () => { setView('home'); onClose(); } },
    { id: 'go-help', title: 'Navegar: Guia do Usuário', category: 'Navegação', icon: Compass, action: () => { setView('help'); onClose(); } },
    { id: 'go-chat', title: 'Navegar: Chat com Agentes', category: 'Navegação', icon: Compass, action: () => { setView('chat'); onClose(); } },
    { id: 'go-sessions', title: 'Navegar: Histórico de Sessões', category: 'Navegação', icon: Compass, action: () => { setView('sessions'); onClose(); } },
    { id: 'go-wizard', title: 'Navegar: Criar Agente (Wizard)', category: 'Navegação', icon: Compass, action: () => { setView('wizard'); onClose(); } },
    { id: 'go-fleet', title: 'Navegar: Agentes Ativos (Fleet)', category: 'Navegação', icon: Compass, action: () => { setView('fleet'); onClose(); } },
    { id: 'go-logs', title: 'Navegar: Logs do Sistema', category: 'Navegação', icon: Compass, action: () => { setView('logs'); onClose(); } },
    { id: 'go-settings', title: 'Navegar: Configurações', category: 'Navegação', icon: Compass, action: () => { setView('settings'); onClose(); } },
    { id: 'theme-toggle', title: darkMode ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro', category: 'Configurar', icon: ToggleLeft, action: () => { setDarkMode(!darkMode); onClose(); } },
    { id: 'clear-cache', title: 'Limpar cache local (Simulado)', category: 'Utilitários', icon: Terminal, action: () => { alert('Cache local limpo com sucesso!'); onClose(); } },
    { id: 'test-conn', title: 'Testar conexão de rede local', category: 'Utilitários', icon: Terminal, action: () => { alert('Latência: 12ms. Status: Online.'); onClose(); } },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      {/* Overlay Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Panel Container */}
      <div className={`
        relative w-full max-w-lg rounded-xl shadow-2xl border flex flex-col overflow-hidden max-h-[80vh] transition-all duration-200 transform scale-100
        ${darkMode 
          ? 'bg-[#12161f] border-[#252c39] text-slate-100' 
          : 'bg-white border-slate-200 text-slate-800'}
      `}>
        {/* Search Input bar */}
        <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${darkMode ? 'border-[#252c39]' : 'border-slate-100'}`}>
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-0 outline-none focus:ring-0 text-sm placeholder-slate-400 font-sans"
            placeholder="Digite chat, logs, config ou um atalho para buscar..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-500/10 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic results scroll */}
        <div className="flex-1 overflow-y-auto max-h-[450px] py-2 scrollbar-thin">
          {filteredCommands.length > 0 ? (
            <div>
              {/* Group commands */}
              {Object.entries(
                filteredCommands.reduce((groups, item) => {
                  if (!groups[item.category]) groups[item.category] = [];
                  groups[item.category].push(item);
                  return groups;
                }, {} as Record<string, typeof commands>)
              ).map(([category, items]) => (
                <div key={category} className="mb-2">
                  <div className="px-4 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                    {category}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const globalIndex = filteredCommands.findIndex(c => c.id === item.id);
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <div
                          key={item.id}
                          className={`
                            px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors text-sm
                            ${isSelected 
                              ? 'bg-emerald-500/10 text-emerald-500 font-semibold border-l-2 border-emerald-500' 
                              : darkMode 
                                ? 'hover:bg-[#19202c] text-slate-300' 
                                : 'hover:bg-slate-50 text-slate-700'}
                          `}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-emerald-500' : 'text-slate-400'}`} />
                          <span className="flex-1 truncate">{item.title}</span>
                          {isSelected && (
                            <ArrowRight className="h-4 w-4 text-emerald-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-slate-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Nenhum atalho encontrado para &ldquo;{query}&rdquo;</p>
              <p className="text-xs mt-1 opacity-70">Tente buscar por termos genéricos como &ldquo;chat&rdquo; ou &ldquo;tema&rdquo;.</p>
            </div>
          )}
        </div>

        {/* Command Palette footer helper */}
        <div className={`px-4 py-2 text-[10px] font-mono flex items-center justify-between border-t ${darkMode ? 'border-[#252c39] bg-[#161a22]' : 'border-slate-100 bg-slate-50'} text-slate-500`}>
          <div className="flex gap-3">
            <span><kbd className="px-1 bg-slate-300/20 rounded">↓↑</kbd> para navegar</span>
            <span><kbd className="px-1 bg-slate-300/20 rounded">Enter</kbd> para executar</span>
          </div>
          <span><kbd className="px-1 bg-slate-300/20 rounded">ESC</kbd> para fechar</span>
        </div>
      </div>
    </div>
  );
}
