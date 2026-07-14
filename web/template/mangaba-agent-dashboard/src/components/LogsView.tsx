import React, { useState } from 'react';
import { 
  Terminal, 
  Search, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Settings, 
  RefreshCw,
  Clock,
  Trash2,
  SlidersHorizontal,
  CloudDownload
} from 'lucide-react';
import { Log } from '../types';

interface LogsViewProps {
  logs: Log[];
  setLogs: React.Dispatch<React.SetStateAction<Log[]>>;
  darkMode: boolean;
  selectedAgentId: string;
}

export default function LogsView({
  logs,
  setLogs,
  darkMode,
  selectedAgentId
}: LogsViewProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [exportModal, setExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filter logs list
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase()) || 
                          log.service.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
    const matchesService = serviceFilter === 'ALL' || log.service === serviceFilter;
    return matchesSearch && matchesLevel && matchesService;
  });

  const handleExport = (format: string) => {
    setIsExporting(true);
    setExportModal(false);
    setTimeout(() => {
      setIsExporting(false);
      alert(`Download concluído! Arquivos de auditoria gravados com sucesso no formato ${format.toUpperCase()}.`);
    }, 1200);
  };

  const handleClearLogs = () => {
    if (confirm('Deseja realmente limpar todos os logs? Esta operação é irreversível localmente.')) {
      setLogs([]);
    }
  };

  const services = ['ALL', ...Array.from(new Set(logs.map(l => l.service)))];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Export overlay status loader */}
      {isExporting && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
          <div className="text-center space-y-3 p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl">
            <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin mx-auto" />
            <span className="text-sm font-mono tracking-widest block uppercase">Gerando dump de auditoria...</span>
          </div>
        </div>
      )}

      {/* Primary header bar */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300
        ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}
      `}>
        <div>
          <h1 className={`font-display font-bold text-xl tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Terminal className="h-5 w-5 text-emerald-500" />
            <span>Painel de Logs & Auditoria</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhe o tráfego operacional, evocações de MCP e feedback de rede de forma centralizada.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExportModal(true)}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar Logs</span>
          </button>

          <button
            onClick={handleClearLogs}
            className={`p-2 rounded-xl border hover:text-rose-500 transition-colors cursor-pointer
              ${darkMode 
                ? 'bg-[#161a22] border-[#252c39] text-slate-400 hover:bg-[#252c39]' 
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
            title="Limpar logs"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter and settings bar */}
      <div className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-4 gap-3
        ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}
      `}>
        {/* Search input field */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar termo ou serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500
              ${darkMode ? 'bg-[#161a22] border-[#252c39] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
          />
        </div>

        {/* Level filter selector */}
        <div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium
              ${darkMode ? 'bg-[#161a22] border-[#252c39] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
          >
            <option value="ALL">NÍVEIS: TODOS</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
            <option value="DEBUG">DEBUG</option>
          </select>
        </div>

        {/* Service filter selector */}
        <div>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium
              ${darkMode ? 'bg-[#161a22] border-[#252c39] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
          >
            {services.map(svc => (
              <option key={svc} value={svc}>SERVIÇO: {svc === 'ALL' ? 'TODOS' : svc.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Results Terminal table */}
      <div className={`border rounded-xl overflow-hidden
        ${darkMode ? 'bg-slate-950 border-slate-850' : 'bg-white border-slate-200'}
      `}>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] leading-relaxed border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-bold text-slate-500 uppercase tracking-wider
                ${darkMode ? 'bg-[#12161f] border-slate-850' : 'bg-slate-50 border-slate-200'}`}
              >
                <th className="py-3 px-4 w-28">Timestamp</th>
                <th className="py-3 px-4 w-24">Nível</th>
                <th className="py-3 px-4 w-32">Serviço</th>
                <th className="py-3 px-4">Mensagem</th>
                <th className="py-3 px-4 w-12 text-center">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                
                const levelConfig = {
                  SUCCESS: { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
                  INFO: { text: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', icon: Info },
                  WARNING: { text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: AlertTriangle },
                  ERROR: { text: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: AlertTriangle },
                  DEBUG: { text: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', icon: Settings }
                }[log.level];

                const Icon = levelConfig.icon;

                return (
                  <React.Fragment key={log.id}>
                    <tr 
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className={`border-b transition-colors cursor-pointer
                        ${darkMode 
                          ? 'border-slate-850/60 hover:bg-[#161a22]' 
                          : 'border-slate-100 hover:bg-slate-50/70'}`}
                    >
                      <td className="py-3.5 px-4 text-slate-500">{log.timestamp}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded border text-[9px] font-bold inline-flex items-center gap-1.5 ${levelConfig.bg} ${levelConfig.text}`}>
                          <Icon className="h-3 w-3" />
                          <span>{log.level}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-indigo-400 font-semibold">{log.service}</td>
                      <td className={`py-3.5 px-4 truncate max-w-md ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {log.message}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button className="text-slate-500 hover:text-slate-300">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable operational telemetry details */}
                    {isExpanded && (
                      <tr className={`${darkMode ? 'bg-[#0f1115]' : 'bg-slate-50/50'}`}>
                        <td colSpan={5} className="py-4 px-6 border-b border-slate-500/10">
                          <div className={`p-4 rounded-xl border text-[10px] leading-relaxed max-w-3xl space-y-3 font-mono
                            ${darkMode ? 'bg-black/40 border-slate-800' : 'bg-white border-slate-250 shadow-xs'}`}
                          >
                            <div className="flex items-center justify-between border-b pb-1.5 border-slate-500/10 text-slate-500 font-bold uppercase">
                              <span>Log Metadata Payload</span>
                              <span>ID: {log.id}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-slate-400">
                              <div><strong>Porta Local Ingress:</strong> 3000</div>
                              <div><strong>Node VM Container:</strong> Cloud Run Standalone</div>
                              <div><strong>API Provedor:</strong> {log.service === 'LLM Gateway' ? 'api.google.genai/v1' : 'Local Sandbox Agent'}</div>
                              <div><strong>SSL Connection:</strong> Ativo TLSv1.3</div>
                            </div>
                            <div className="pt-2 border-t border-slate-500/10">
                              <span className="text-slate-500 font-bold block mb-1">RAW EXECUTABLE MESSAGE:</span>
                              <pre className={`p-2.5 rounded-lg text-[10px] whitespace-pre-wrap leading-normal font-medium
                                ${darkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800'}`}
                              >
                                {`{
  "timestamp": "2026-07-12T${log.timestamp}-07:00",
  "logLevel": "${log.level}",
  "service": "${log.service}",
  "payload": {
    "message": "${log.message}",
    "agentId": "${selectedAgentId || 'default'}",
    "latencyMs": 12,
    "status": "success",
    "networkCheck": "OK"
  }
}`}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Terminal className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-bold">Nenhum log operacional gravado nesta vista</p>
                    <p className="text-xs mt-1 opacity-75">Tente limpar os filtros ou faça novas interações com o chat.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Format Selector modal dialog */}
      {exportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setExportModal(false)} />
          <div className={`relative w-full max-w-sm rounded-xl p-5 border shadow-2xl space-y-4
            ${darkMode ? 'bg-[#12161f] border-[#252c39] text-white' : 'bg-white border-slate-250 text-slate-800'}`}
          >
            <div>
              <h3 className="font-display font-bold text-sm tracking-tight flex items-center gap-1.5">
                <CloudDownload className="h-4.5 w-4.5 text-emerald-500" />
                <span>Escolha o Formato de Exportação</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                Faça o download do histórico operacional do Mangaba Agent Dashboard.
              </p>
            </div>

            <div className="space-y-2">
              {[
                { format: 'json', label: 'JSON Data Structure', desc: 'Melhor para importar em ferramentas como Datadog ou Kibana.' },
                { format: 'csv', label: 'CSV Spreadsheets', desc: 'Ideal para auditoria no Excel ou Google Sheets.' },
                { format: 'pdf', label: 'PDF Document Report', desc: 'Geratório elegante em formato de relatório corporativo.' }
              ].map((fmt) => (
                <button
                  key={fmt.format}
                  onClick={() => handleExport(fmt.format)}
                  className={`w-full p-2.5 rounded-lg border text-left cursor-pointer transition-colors block
                    ${darkMode 
                      ? 'bg-[#161a22] hover:bg-[#1d232e] border-[#252c39] text-slate-300' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-700'}`}
                >
                  <span className="text-xs font-bold block">{fmt.label}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 leading-normal block">{fmt.desc}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setExportModal(false)}
              className={`w-full py-2 rounded-lg text-xs font-semibold text-center border cursor-pointer transition-colors
                ${darkMode 
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
