import React, { useState } from 'react';
import { 
  PlusCircle, 
  MessageSquare, 
  Terminal, 
  Settings, 
  Cpu, 
  Activity, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Play,
  RotateCw,
  Clock,
  Zap,
  ChevronRight
} from 'lucide-react';
import { Agent } from '../types';

interface HomeViewProps {
  agents: Agent[];
  setView: (view: string) => void;
  setSelectedAgentId: (id: string) => void;
  darkMode: boolean;
  onRestartAgent: (id: string) => void;
  onCreateAgentShortcut: () => void;
}

export default function HomeView({
  agents,
  setView,
  setSelectedAgentId,
  darkMode,
  onRestartAgent,
  onCreateAgentShortcut
}: HomeViewProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Summary counts
  const activeCount = agents.filter(a => a.status === 'active').length;
  const errorCount = agents.filter(a => a.status === 'error').length;
  const idleCount = agents.filter(a => a.status === 'idle').length;

  const quickStats = [
    { label: 'Agentes Ativos', value: activeCount, color: 'text-emerald-500', bg: 'bg-emerald-500/10', subtitle: `${errorCount} em falha, ${idleCount} ociosos` },
    { label: 'Sessões Hoje', value: 12, color: 'text-blue-500', bg: 'bg-blue-500/10', subtitle: '+3 criadas na última hora' },
    { label: 'Total de Requisições', value: 246, color: 'text-amber-500', bg: 'bg-amber-500/10', subtitle: 'Média de 12ms por resposta' },
    { label: 'Uptime Sistema', value: '99.98%', color: 'text-indigo-500', bg: 'bg-indigo-500/10', subtitle: 'Servidor local rodando na porta 3000' }
  ];

  const quickActions = [
    { id: 'create', label: 'Criar Novo Agente', description: 'Formulário passo a passo', icon: PlusCircle, color: 'bg-emerald-500 text-white', action: onCreateAgentShortcut },
    { id: 'chat', label: 'Iniciar Chat', description: 'Conversar com agentes em tempo real', icon: MessageSquare, color: 'bg-blue-500 text-white', action: () => setView('chat') },
    { id: 'logs', label: 'Ver Logs', description: 'Auditar comportamento operacional', icon: Terminal, color: 'bg-amber-500 text-white', action: () => setView('logs') },
    { id: 'settings', label: 'Configurar', description: 'Ajustar perfil, segurança e canais', icon: Settings, color: 'bg-indigo-500 text-white', action: () => setView('settings') }
  ];

  // Render SVG Sparkline
  const renderChart = () => {
    const points = [
      { day: 'Seg', reqs: 120 },
      { day: 'Ter', reqs: 145 },
      { day: 'Qua', reqs: 110 },
      { day: 'Qui', reqs: 185 },
      { day: 'Sex', reqs: 210 },
      { day: 'Sáb', reqs: 130 },
      { day: 'Dom', reqs: 246 }
    ];
    
    const maxVal = Math.max(...points.map(p => p.reqs));
    const width = 600;
    const height = 150;
    const padding = 25;
    
    // Generate SVG path coordinate strings
    const coords = points.map((p, index) => {
      const x = padding + (index * (width - padding * 2)) / (points.length - 1);
      const y = height - padding - (p.reqs * (height - padding * 2)) / maxVal;
      return { x, y };
    });
    
    let pathString = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      pathString += ` L ${coords[i].x} ${coords[i].y}`;
    }
    
    // Gradient fill path
    const fillPathString = `${pathString} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`;

    return (
      <div className="w-full h-full relative flex flex-col justify-between">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[140px] select-none overflow-visible">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Dotted horizontal grids */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke={darkMode ? "#1f242e" : "#f1f5f9"} strokeDasharray="3,3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke={darkMode ? "#1f242e" : "#f1f5f9"} strokeDasharray="3,3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={darkMode ? "#1f242e" : "#f1f5f9"} strokeDasharray="3,3" />

          {/* Fill under line */}
          <path d={fillPathString} fill="url(#areaGrad)" />

          {/* Main glowing path */}
          <path d={pathString} fill="none" stroke="#FF6B35" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data points */}
          {coords.map((c, idx) => (
            <g key={idx} className="group/dot cursor-pointer">
              <circle cx={c.x} cy={c.y} r="4.5" fill={darkMode ? "#0f1115" : "#fff"} stroke="#FF6B35" strokeWidth="2.5" />
              <circle cx={c.x} cy={c.y} r="8" fill="#FF6B35" className="opacity-0 group-hover/dot:opacity-25 transition-opacity" />
              
              {/* Tooltip on hover */}
              <foreignObject x={c.x - 30} y={c.y - 30} width="60" height="25" className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200">
                <div className="bg-slate-900 text-white text-[10px] py-0.5 px-1 rounded text-center font-mono font-bold shadow-md">
                  {points[idx].reqs} reqs
                </div>
              </foreignObject>
            </g>
          ))}
        </svg>

        {/* Labels bar */}
        <div className="flex justify-between px-6 text-[10px] font-mono font-medium text-slate-500 border-t pt-1 border-slate-500/10">
          {points.map((p, idx) => (
            <span key={idx}>{p.day}</span>
          ))}
        </div>
      </div>
    );
  };

  const handleStartChatWithAgent = (agent: Agent) => {
    setSelectedAgentId(agent.id);
    setView('chat');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Hero */}
      <div className={`p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden
        ${darkMode 
          ? 'bg-radial from-[#131b26] to-[#0f1115] border-[#1f242e]' 
          : 'bg-radial from-slate-50 to-white border-slate-200'}
      `}>
        {/* Decorative corner visual */}
        <div className="absolute right-0 top-0 h-40 w-40 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={`font-display font-bold text-2xl tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Bem-vindo ao Mangaba Agent! <span className="animate-bounce">👋</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
              O ecossistema definitivo para orquestrar agentes inteligentes de forma simplificada. Configure cérebros com RAG local, forje habilidades complexas, conecte MCP servers e dispare tarefas agendadas em linguagem natural de forma autônoma.
            </p>
          </div>
          <button
            onClick={onCreateAgentShortcut}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md shadow-emerald-500/20 shrink-0 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Criar Novo Agente</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, idx) => (
          <div 
            key={idx} 
            className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:translate-y-[-2px]
              ${darkMode 
                ? 'bg-[#12161f] border-[#1f242e]' 
                : 'bg-white border-slate-200'}
            `}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">{stat.label}</span>
              <span className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>
                <Activity className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-2.5">
              <span className={`text-2xl font-display font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {stat.value}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Chart and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity chart */}
        <div className={`lg:col-span-2 p-5 rounded-xl border flex flex-col justify-between
          ${darkMode 
            ? 'bg-[#12161f] border-[#1f242e]' 
            : 'bg-white border-slate-200'}
        `}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className={`font-display font-bold text-sm tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Requisições de Agentes (Últimos 7 dias)
              </span>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold text-emerald-500 bg-emerald-500/10`}>
              +24% vs. anterior
            </span>
          </div>
          <div className="h-[160px] w-full mt-2">
            {renderChart()}
          </div>
        </div>

        {/* Quick Actions List */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between
          ${darkMode 
            ? 'bg-[#12161f] border-[#1f242e]' 
            : 'bg-white border-slate-200'}
        `}>
          <h3 className={`font-display font-bold text-sm tracking-tight mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Ações Rápidas
          </h3>
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {quickActions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  onClick={act.action}
                  onMouseEnter={() => setHoveredCard(act.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all duration-150 cursor-pointer
                    ${darkMode 
                      ? 'bg-[#161a22] hover:bg-[#1d232e] border-[#1f242e] text-slate-300' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-700'}
                    ${hoveredCard === act.id ? 'translate-x-1 border-slate-500/20' : ''}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className={`p-2 rounded-lg ${act.color}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className={`text-xs font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {act.label}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{act.description}</p>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${hoveredCard === act.id ? 'translate-x-0.5 text-emerald-500' : ''}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Agents (Fleet) Section */}
      <div className={`p-5 rounded-xl border
        ${darkMode 
          ? 'bg-[#12161f] border-[#1f242e]' 
          : 'bg-white border-slate-200'}
      `}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-emerald-500" />
            <span className={`font-display font-bold text-sm tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Monitoramento da Frota (Active Fleet)
            </span>
          </div>
          <button 
            onClick={() => setView('fleet')}
            className="text-[11px] font-mono text-emerald-500 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver detalhes em Fleet</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Agents table/grid */}
        <div className="space-y-3">
          {agents.map((agent) => {
            const statusConfig = {
              active: { bg: 'bg-emerald-500/15 text-emerald-500', dot: 'bg-emerald-500', label: 'ATIVO' },
              idle: { bg: 'bg-amber-500/15 text-amber-500', dot: 'bg-amber-500', label: 'OCIOSO' },
              error: { bg: 'bg-rose-500/15 text-rose-500', dot: 'bg-rose-500', label: 'FALHA' },
              offline: { bg: 'bg-slate-500/15 text-slate-500', dot: 'bg-slate-500', label: 'OFFLINE' }
            }[agent.status];

            return (
              <div
                key={agent.id}
                className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all
                  ${darkMode 
                    ? 'bg-[#161a22] hover:bg-[#1c222e] border-[#1f242e]' 
                    : 'bg-slate-50 hover:bg-slate-100/70 border-slate-150'}
                `}
              >
                {/* Agent Header Identity */}
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-slate-500/10 text-slate-400 shrink-0`}>
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`text-xs font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {agent.name}
                      </h4>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1.5 ${statusConfig.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                        <span>{statusConfig.label}</span>
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 max-w-md line-clamp-1">
                      {agent.description}
                    </p>
                  </div>
                </div>

                {/* Agent operational telemetry metadata */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-mono text-slate-500 md:ml-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Uptime: <strong className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{agent.uptime}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Reqs: <strong className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{agent.requests}</strong></span>
                  </div>
                  {agent.nextAction && (
                    <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-md border border-emerald-500/10">
                      <Play className="h-3 w-3 fill-current" />
                      <span>Action: <strong>{agent.nextAction}</strong></span>
                    </div>
                  )}
                </div>

                {/* Operations Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  {agent.status === 'error' ? (
                    <button
                      onClick={() => onRestartAgent(agent.id)}
                      className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    >
                      <RotateCw className="h-3 w-3" />
                      <span>Reiniciar</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartChatWithAgent(agent)}
                      className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>Conversar</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedAgentId(agent.id);
                      setView('logs');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer
                      ${darkMode 
                        ? 'bg-[#12161f] border-[#252c39] hover:bg-slate-800 text-slate-400 hover:text-slate-100' 
                        : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'}
                    `}
                  >
                    Logs
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
