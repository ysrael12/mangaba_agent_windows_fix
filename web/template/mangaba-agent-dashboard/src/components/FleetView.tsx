import React, { useState } from 'react';
import { 
  Cpu, 
  Search, 
  RotateCw, 
  Pause, 
  Play, 
  Sliders, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  Clock,
  Activity,
  Plus
} from 'lucide-react';
import { Agent } from '../types';

interface FleetViewProps {
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  setView: (view: string) => void;
  setSelectedAgentId: (id: string) => void;
  darkMode: boolean;
  onRestartAgent: (id: string) => void;
  onCreateAgentShortcut: () => void;
}

export default function FleetView({
  agents,
  setAgents,
  setView,
  setSelectedAgentId,
  darkMode,
  onRestartAgent,
  onCreateAgentShortcut
}: FleetViewProps) {
  const [search, setSearch] = useState('');

  const handleTogglePause = (agentId: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        const nextStatus = a.status === 'active' ? 'idle' : 'active';
        return {
          ...a,
          status: nextStatus as any,
          uptime: nextStatus === 'active' ? '0m' : a.uptime
        };
      }
      return a;
    }));
  };

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.provider.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Title Header */}
      <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300
        ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}
      `}>
        <div>
          <h1 className={`font-display font-bold text-xl tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Cpu className="h-5 w-5 text-emerald-500" />
            <span>Frota de Agentes Ativos (Active Fleet)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitore, pause ou reinicie os processos em segundo plano de cada agente inteligente.
          </p>
        </div>

        <button
          onClick={onCreateAgentShortcut}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Criar Agente</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className={`p-4 rounded-xl border flex items-center gap-3
        ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}
      `}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar agente pelo nome ou modelo cognitivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500
              ${darkMode ? 'bg-[#161a22] border-[#252c39] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
          />
        </div>
      </div>

      {/* Grid of active agents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAgents.map((agent) => {
          const statusConfig = {
            active: { bg: 'bg-emerald-500/15 text-emerald-500', dot: 'bg-emerald-500', label: 'ATIVO', description: 'O agente está escutando canais e pronto para responder gatilhos.' },
            idle: { bg: 'bg-amber-500/15 text-amber-500', dot: 'bg-amber-500', label: 'OCIOSO', description: 'Em modo de economia de recursos, aguardando nova requisição.' },
            error: { bg: 'bg-rose-500/15 text-rose-500', dot: 'bg-rose-500', label: 'ERRO CRÍTICO', description: 'O processo travou devido a um erro de conexão ou autenticação.' },
            offline: { bg: 'bg-slate-500/15 text-slate-500', dot: 'bg-slate-500', label: 'DESLIGADO', description: 'Serviço desligado de forma manual.' }
          }[agent.status];

          return (
            <div
              key={agent.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all hover:shadow-md
                ${darkMode 
                  ? 'bg-[#12161f] border-[#1f242e]' 
                  : 'bg-white border-slate-200'}`}
            >
              {/* Header profile */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-500/10 text-slate-400 shrink-0">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {agent.name}
                      </h3>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${statusConfig.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                        <span>{statusConfig.label}</span>
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Model: {agent.model} • Provider: {agent.provider}
                    </p>
                  </div>
                </div>
              </div>

              {/* Functional description */}
              <p className="text-xs text-slate-500 leading-relaxed">
                {agent.description}
              </p>

              {/* Inner Telemetry telemetry statistics */}
              <div className={`p-3 rounded-xl grid grid-cols-3 gap-2 text-center
                ${darkMode ? 'bg-slate-950/40' : 'bg-slate-50'}`}
              >
                <div>
                  <span className="text-[9px] font-mono text-slate-500 block uppercase">Uptime</span>
                  <span className={`text-xs font-mono font-bold block mt-0.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {agent.uptime}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-slate-500 block uppercase">Requisições</span>
                  <span className={`text-xs font-mono font-bold block mt-0.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {agent.requests}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-slate-500 block uppercase">Conectores</span>
                  <span className={`text-xs font-mono font-bold block mt-0.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {agent.mcpServers.length + agent.skills.length}
                  </span>
                </div>
              </div>

              {/* If is error, render error traceback detail */}
              {agent.status === 'error' && agent.errorDetail && (
                <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-500 text-[10px] font-bold uppercase font-mono">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Detalhe da Falha</span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 leading-normal max-h-[60px] overflow-y-auto pr-1 scrollbar-thin">
                    {agent.errorDetail}
                  </p>
                </div>
              )}

              {/* Action operations buttons */}
              <div className="flex items-center justify-between border-t pt-3 border-slate-500/10">
                <span className="text-[10px] font-mono text-slate-500">
                  Ref: {agent.id.toUpperCase()}
                </span>

                <div className="flex items-center gap-1.5">
                  {agent.status === 'error' ? (
                    <button
                      onClick={() => onRestartAgent(agent.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      <span>Reiniciar</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTogglePause(agent.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1
                        ${agent.status === 'active' 
                          ? 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/25 text-amber-500' 
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                    >
                      {agent.status === 'active' ? (
                        <>
                          <Pause className="h-3.5 w-3.5" />
                          <span>Pausar</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          <span>Retomar</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedAgentId(agent.id);
                      setView('chat');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer
                      ${darkMode 
                        ? 'bg-[#161a22] border-[#252c39] hover:bg-slate-800 text-slate-300' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                  >
                    Abrir Chat
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredAgents.length === 0 && (
          <div className="md:col-span-2 p-12 text-center text-slate-500 border border-dashed border-slate-500/10 rounded-2xl">
            <Cpu className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">Nenhum agente localizado na frota</p>
            <p className="text-xs mt-1 opacity-75">Crie um novo agente ou remova os filtros de busca.</p>
          </div>
        )}
      </div>

    </div>
  );
}
