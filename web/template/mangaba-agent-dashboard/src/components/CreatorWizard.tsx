import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Cpu, 
  Sparkles, 
  User, 
  UploadCloud, 
  SwitchCamera, 
  Settings, 
  Terminal, 
  Check, 
  Database,
  CloudLightning,
  RefreshCw,
  Send,
  Zap,
  Globe,
  Mail,
  Calendar,
  AlertCircle,
  FileText,
  Trash2,
  Lock,
  Plus
} from 'lucide-react';
import { AgentDraft, McpServer, SkillItem } from '../types';
import { INITIAL_SKILLS, INITIAL_DRAFT, parseNaturalLanguageSchedule } from '../utils/mockData';

interface CreatorWizardProps {
  onComplete: (draft: AgentDraft) => void;
  darkMode: boolean;
  draft: AgentDraft;
  setDraft: React.Dispatch<React.SetStateAction<AgentDraft>>;
}

export default function CreatorWizard({
  onComplete,
  darkMode,
  draft,
  setDraft
}: CreatorWizardProps) {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);

  // Slide 2 local dry-run state
  const [dryRunMessages, setDryRunMessages] = useState<{sender: 'user'|'agent', text: string}[]>([
    { sender: 'agent', text: 'Olá! Sou seu rascunho de agente. Atualmente configurado com Gemini 2.5. Como posso te apoiar hoje?' }
  ]);
  const [dryRunInput, setDryRunInput] = useState('');
  const [dryRunTyping, setDryRunTyping] = useState(false);

  // Slide 4 drag & drop simulation
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Slide 6 skill select state
  const [activeSkillId, setActiveSkillId] = useState('db-sync');
  const [skillsList, setSkillsList] = useState<SkillItem[]>(INITIAL_SKILLS);

  // Slide 7 MCP server creation
  const [newMcpName, setNewMcpName] = useState('');
  const [newMcpCmd, setNewMcpCmd] = useState('');
  const [isTestingMcp, setIsTestingMcp] = useState(false);

  const totalSlides = 9;

  const slidesMeta = [
    { num: 1, label: 'Cérebro', desc: 'Provedor & Modelo de IA' },
    { num: 2, label: 'Teste Rápido', desc: 'Aferir integridade do modelo' },
    { num: 3, label: 'Identidade', desc: 'Nome do agente & Soul' },
    { num: 4, label: 'RAG local', desc: 'Upload de conhecimento' },
    { num: 5, label: 'Ferramentas', desc: 'Capabilities nativas' },
    { num: 6, label: 'Skills Forge', desc: 'Habilidades avançadas' },
    { num: 7, label: 'MCP Connect', desc: 'Model Context Protocol' },
    { num: 8, label: 'Heartbeat', desc: 'Cron em linguagem natural' },
    { num: 9, label: 'Canais', desc: 'Integrações e Chatbots' }
  ];

  const nextSlide = () => {
    if (currentSlide < totalSlides) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleFinalDeploy();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 1) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleFinalDeploy = () => {
    setIsDeploying(true);
    setDeployStep(1);
    
    setTimeout(() => {
      setDeployStep(2); // Compilando assets do agente
      setTimeout(() => {
        setDeployStep(3); // Vinculando bases e MCP servers
        setTimeout(() => {
          setDeployStep(4); // Lançando servidor na porta 3000
          setTimeout(() => {
            onComplete(draft);
          }, 1200);
        }, 1000);
      }, 1000);
    }, 1000);
  };

  // Model selection handler
  const handleSelectModel = (provider: string, model: string) => {
    setDraft(prev => ({
      ...prev,
      modelConfig: { provider, model }
    }));
  };

  // Preset souls handler
  const soulPresets = [
    {
      title: 'Suporte Técnico',
      desc: 'Atencioso, focado em logs e troubleshooting de sistemas.',
      soul: 'Você é um Assistente de Suporte Técnico experiente. Você analisa logs detalhadamente, responde de forma lógica e sequencial, e prefere explicações concisas focadas no terminal. Use blocos de código markdown se necessário.'
    },
    {
      title: 'Gerente Comercial',
      desc: 'Extremamente cortês, focado em conversão e follow-ups rápidos.',
      soul: 'Você é o Gerente Comercial do Mangaba Agent. Seu tom é persuasivo, otimista e muito profissional. Você é especialista em redigir ofertas atraentes, analisar necessidades e agendar follow-ups estratégicos com clientes.'
    },
    {
      title: 'DevOps / SysAdmin',
      desc: 'Linguagem técnica refinada, especialista em Docker, Postgres e MCP.',
      soul: 'Você é um Engenheiro DevOps especializado. Você se comunica utilizando jargões técnicos de rede, ajuda a estruturar Dockerfiles, depurar strings de conexão Postgres e arquitetar servidores Model Context Protocol (MCP).'
    }
  ];

  const handleApplySoulPreset = (soulText: string) => {
    setDraft(prev => ({
      ...prev,
      identity: { ...prev.identity, soul: soulText }
    }));
  };

  // Simulated drag & drop RAG
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      simulateFileUpload(file.name, file.size);
    }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      simulateFileUpload(file.name, file.size);
    }
  };

  const simulateFileUpload = (filename: string, sizeBytes: number) => {
    setIsUploading(true);
    setUploadProgress(10);
    
    const sizeStr = `${(sizeBytes / 1024).toFixed(1)} KB`;

    const timer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsUploading(false);
          
          // Append file to draft
          const newFile = {
            id: Math.random().toString(),
            name: filename,
            size: sizeStr,
            status: 'indexed' as const,
            progress: 100
          };

          setDraft(prevDraft => ({
            ...prevDraft,
            knowledgeFiles: [...prevDraft.knowledgeFiles, newFile]
          }));
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  const handleDeleteFile = (fileId: string) => {
    setDraft(prev => ({
      ...prev,
      knowledgeFiles: prev.knowledgeFiles.filter(f => f.id !== fileId)
    }));
  };

  // Toggle skills in Slide 6
  const handleToggleSkill = (skillId: string) => {
    setSkillsList(prev => prev.map(sk => {
      if (sk.id === skillId) {
        const nextState = !sk.enabled;
        // Update draft too
        setDraft(prevDraft => ({
          ...prevDraft,
          skills: {
            ...prevDraft.skills,
            [skillId]: { ...prevDraft.skills[skillId], enabled: nextState }
          }
        }));
        return { ...sk, enabled: nextState };
      }
      return sk;
    }));
  };

  // Handle Skill Config field changes
  const handleSkillConfigChange = (skillId: string, fieldName: string, val: string) => {
    setSkillsList(prev => prev.map(sk => {
      if (sk.id === skillId && sk.configFields) {
        const updatedFields = sk.configFields.map(f => {
          if (f.name === fieldName) return { ...f, value: val };
          return f;
        });
        return { ...sk, configFields: updatedFields };
      }
      return sk;
    }));

    setDraft(prevDraft => {
      const currentSkillDraft = prevDraft.skills[skillId] || { enabled: false };
      const currentConfig = currentSkillDraft.config || {};
      return {
        ...prevDraft,
        skills: {
          ...prevDraft.skills,
          [skillId]: {
            ...currentSkillDraft,
            config: {
              ...currentConfig,
              [fieldName]: val
            }
          }
        }
      };
    });
  };

  // Add custom MCP Server
  const handleAddMcpServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMcpName.trim() || !newMcpCmd.trim()) return;

    setIsTestingMcp(true);

    setTimeout(() => {
      setIsTestingMcp(false);
      const newMcp: McpServer = {
        id: `mcp-${Math.random()}`,
        name: newMcpName.trim(),
        type: 'command',
        value: newMcpCmd.trim(),
        status: 'connected',
        toolsCount: Math.floor(Math.random() * 5) + 3
      };

      setDraft(prev => ({
        ...prev,
        mcpServers: [...prev.mcpServers, newMcp]
      }));

      setNewMcpName('');
      setNewMcpCmd('');
    }, 1200);
  };

  const handleRemoveMcpServer = (id: string) => {
    setDraft(prev => ({
      ...prev,
      mcpServers: prev.mcpServers.filter(s => s.id !== id)
    }));
  };

  // NL Parser triggered on heartbeat input
  const handleHeartbeatChange = (val: string) => {
    const parsed = parseNaturalLanguageSchedule(val);
    setDraft(prev => ({
      ...prev,
      heartbeat: {
        rawText: val,
        schedule: parsed.cron,
        parsedCron: parsed.cron,
        nextRun: parsed.nextRun
      }
    }));
  };

  // Dry-run testing console in Slide 2
  const handleSendDryRunMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dryRunInput.trim() || dryRunTyping) return;

    const text = dryRunInput.trim();
    setDryRunInput('');
    setDryRunMessages(prev => [...prev, { sender: 'user', text }]);
    setDryRunTyping(true);

    setTimeout(() => {
      setDryRunTyping(false);
      setDryRunMessages(prev => [...prev, {
        sender: 'agent',
        text: `Olá! Seu agente configurado respondeu com sucesso! Estou testando sob o modelo [${draft.modelConfig.model}] e as regras declaradas. O feedback de rede registrou 12ms.`
      }]);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Fullscreen Deployment Loading screen Overlay */}
      {isDeploying && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center text-white p-6">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="relative inline-flex">
              <span className="flex h-16 w-16 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-16 w-16 bg-emerald-500 flex items-center justify-center">
                  <Cpu className="h-8 w-8 text-white animate-pulse" />
                </span>
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="font-display font-bold text-xl tracking-tight">
                Fazendo o Deploy do Agente...
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Mangaba Agent Engine v1.0 • Executando compilação
              </p>
            </div>

            {/* Stepper list in build process */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-left font-mono text-xs space-y-3">
              <div className="flex items-center gap-3">
                {deployStep >= 1 ? (
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-500 shrink-0" />
                )}
                <span className={deployStep >= 1 ? "text-emerald-400" : "text-slate-400"}>
                  [1/4] Salvando dados de perfil e Soul ... OK
                </span>
              </div>

              <div className="flex items-center gap-3">
                {deployStep >= 2 ? (
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : deployStep === 1 ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
                ) : (
                  <span className="h-4 w-4 border border-slate-700 rounded-full shrink-0" />
                )}
                <span className={deployStep >= 2 ? "text-emerald-400" : deployStep === 1 ? "text-amber-400 animate-pulse" : "text-slate-600"}>
                  [2/4] Consolidando arquivos indexados no RAG local ... {deployStep === 1 ? 'rodando...' : deployStep >= 2 ? 'OK' : 'pendente'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {deployStep >= 3 ? (
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : deployStep === 2 ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
                ) : (
                  <span className="h-4 w-4 border border-slate-700 rounded-full shrink-0" />
                )}
                <span className={deployStep >= 3 ? "text-emerald-400" : deployStep === 2 ? "text-amber-400 animate-pulse" : "text-slate-600"}>
                  [3/4] Inicializando túneis do MCP e Habilidades ... {deployStep === 2 ? 'rodando...' : deployStep >= 3 ? 'OK' : 'pendente'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {deployStep >= 4 ? (
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : deployStep === 3 ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
                ) : (
                  <span className="h-4 w-4 border border-slate-700 rounded-full shrink-0" />
                )}
                <span className={deployStep >= 4 ? "text-emerald-400" : deployStep === 3 ? "text-amber-400 animate-pulse" : "text-slate-600"}>
                  [4/4] Ativando portas de canais externos ... {deployStep === 3 ? 'rodando...' : deployStep >= 4 ? 'Ativo na Porta 3000!' : 'pendente'}
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-1000"
                style={{ width: `${(deployStep / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Slide Header Indicator */}
      <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest">
              Passo {currentSlide} de {totalSlides}
            </span>
            <h2 className={`font-display font-bold text-lg tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {slidesMeta[currentSlide - 1].label}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {slidesMeta[currentSlide - 1].desc}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {slidesMeta.map((s) => (
              <button
                key={s.num}
                onClick={() => setCurrentSlide(s.num)}
                className={`h-2 rounded-full transition-all cursor-pointer
                  ${currentSlide === s.num 
                    ? 'w-6 bg-emerald-500' 
                    : s.num < currentSlide 
                      ? 'w-2 bg-emerald-500/50' 
                      : 'w-2 bg-slate-300/30'}`}
                title={s.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Slide Card Panels */}
      <div className={`p-6 rounded-2xl border min-h-[420px] flex flex-col justify-between transition-all duration-300
        ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}
      `}>
        
        {/* SLIDE 1: ModelCognitiveSlide */}
        {currentSlide === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className={`text-sm font-bold tracking-tight mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Escolha o Motor Cognitivo do seu Agente
              </h3>
              <p className="text-xs text-slate-500">
                Selecione o provedor e o modelo de linguagem natural que servirá como o intelecto base do agente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {[
                { provider: 'Google Gemini', models: ['Gemini 2.5 Flash', 'Gemini 2.5 Pro', 'Gemini 1.5 Pro'], desc: 'Velocidade extrema, context window gigante de 1M+ e integração Google.', recommended: true },
                { provider: 'OpenAI', models: ['GPT-4o', 'GPT-4o-mini', 'o1-mini'], desc: 'Excelente em raciocínio lógico e formatação de dados estruturados.' },
                { provider: 'Anthropic', models: ['Claude 3.5 Sonnet', 'Claude 3.5 Haiku'], desc: 'Incomparável para escrita técnica e análises longas e refinadas.' },
                { provider: 'DeepSeek', models: ['DeepSeek V3', 'DeepSeek R1 (Reasoning)'], desc: 'Custo de token ultra-baixo, performance excelente em algoritmos de busca.' }
              ].map((prov) => {
                const isSelected = draft.modelConfig.provider === prov.provider;
                return (
                  <div
                    key={prov.provider}
                    onClick={() => handleSelectModel(prov.provider, prov.models[0])}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between
                      ${isSelected 
                        ? 'bg-emerald-500/5 border-emerald-500 text-emerald-500' 
                        : darkMode 
                          ? 'bg-[#161a22] hover:bg-[#1e232f] border-[#1f242e] text-slate-300' 
                          : 'bg-slate-50 hover:bg-slate-100/80 border-slate-150 text-slate-700'}
                    `}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold tracking-tight ${darkMode && !isSelected ? 'text-white' : ''}`}>
                          {prov.provider}
                        </span>
                        {prov.recommended && (
                          <span className="text-[8px] bg-emerald-500 text-white font-mono px-1.5 py-0.5 rounded-full font-bold">
                            RECOMENDADO
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                        {prov.desc}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="mt-3.5 pt-2 border-t border-emerald-500/10">
                        <label className="text-[9px] font-mono font-bold uppercase block text-emerald-500">
                          Modelo Alvo:
                        </label>
                        <select
                          value={draft.modelConfig.model}
                          onChange={(e) => handleSelectModel(prov.provider, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className={`mt-1 w-full px-2 py-1.5 rounded-md text-xs font-medium focus:outline-none cursor-pointer
                            ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
                        >
                          {prov.models.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SLIDE 2: DryRunSlide */}
        {currentSlide === 2 && (
          <div className="space-y-4 animate-fade-in flex-1 flex flex-col justify-between">
            <div>
              <h3 className={`text-sm font-bold tracking-tight mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Aferição do Modelo (Dry Run Console)
              </h3>
              <p className="text-xs text-slate-500">
                Teste o comportamento básico do motor cognitivo <strong className="text-emerald-500">[{draft.modelConfig.model}]</strong> antes de persistir as configurações.
              </p>
            </div>

            {/* Micro chat simulator */}
            <div className={`flex-1 border rounded-xl overflow-hidden flex flex-col justify-between p-3 min-h-[220px] max-h-[280px]
              ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}
            `}>
              <div className="flex-1 overflow-y-auto space-y-3.5 p-2 font-sans scrollbar-thin">
                {dryRunMessages.map((m, idx) => (
                  <div key={idx} className={`flex gap-2.5 max-w-lg ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                    <div className={`p-1.5 rounded-lg text-white font-mono text-[10px] flex items-center justify-center shrink-0 h-6 w-6
                      ${m.sender === 'user' ? 'bg-[#252c39]' : 'bg-emerald-500'}
                    `}>
                      {m.sender === 'user' ? 'U' : 'A'}
                    </div>
                    <div className={`p-2.5 rounded-xl text-xs whitespace-pre-wrap leading-relaxed shadow-xs
                      ${m.sender === 'user' 
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' 
                        : darkMode 
                          ? 'bg-[#12161f] border border-slate-800 text-slate-200' 
                          : 'bg-white border border-slate-150 text-slate-800'}
                    `}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {dryRunTyping && (
                  <div className="text-[10px] font-mono text-slate-500 animate-pulse flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-emerald-500 animate-spin" />
                    <span>Aguardando feedback de rede...</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendDryRunMsg} className="flex gap-2 border-t pt-2 border-slate-500/10">
                <input
                  type="text"
                  placeholder="Escreva algo para testar o cérebro do agente..."
                  value={dryRunInput}
                  onChange={(e) => setDryRunInput(e.target.value)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500
                    ${darkMode ? 'bg-[#12161f] border-[#252c39] text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Send className="h-3 w-3" />
                  <span>Enviar</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SLIDE 3: AgentIdentitySlide */}
        {currentSlide === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className={`text-sm font-bold tracking-tight mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Defina a Identidade & Alma do Agente
              </h3>
              <p className="text-xs text-slate-500">
                Batize seu agente e escreva a directiva principal (&ldquo;Soul&rdquo;), que define o comportamento, voz e as regras de orquestração.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              {/* Form settings */}
              <div className="md:col-span-2 space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold tracking-wider text-slate-500 uppercase block">
                    Nome de Exibição (Agent Name)
                  </label>
                  <input
                    type="text"
                    value={draft.identity.name}
                    onChange={(e) => setDraft(prev => ({
                      ...prev,
                      identity: { ...prev.identity, name: e.target.value }
                    }))}
                    placeholder="Ex: Assistente de Cobrança, DevOps Orchestrator"
                    className={`w-full px-3 py-2 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500
                      ${darkMode ? 'bg-[#161a22] border-[#252c39] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold tracking-wider text-slate-500 uppercase block">
                    Alma do Agente (System Soul Instructions)
                  </label>
                  <textarea
                    rows={5}
                    value={draft.identity.soul}
                    onChange={(e) => setDraft(prev => ({
                      ...prev,
                      identity: { ...prev.identity, soul: e.target.value }
                    }))}
                    placeholder="Você é um assistente..."
                    className={`w-full px-3 py-2 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500 font-sans leading-relaxed
                      ${darkMode ? 'bg-[#161a22] border-[#252c39] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  />
                </div>
              </div>

              {/* Soul presets sidebar */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold tracking-wider text-slate-500 uppercase block">
                  Templates Prontos
                </label>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                  {soulPresets.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleApplySoulPreset(preset.soul)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all
                        ${darkMode 
                          ? 'bg-[#161a22] hover:bg-[#1e232f] border-[#1f242e]' 
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-150'}`}
                    >
                      <h4 className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        <span>{preset.title}</span>
                      </h4>
                      <p className="text-[9px] text-slate-500 mt-0.5 leading-relaxed">
                        {preset.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 4: KnowledgeRagSlide */}
        {currentSlide === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className={`text-sm font-bold tracking-tight mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Alimente o Conhecimento Local (RAG)
              </h3>
              <p className="text-xs text-slate-500">
                Faça o upload de documentos para o índice local. O Mangaba Agent realiza extração do texto sem enviar arquivos para serviços de nuvem de terceiros.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              {/* Drop area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center min-h-[160px] relative
                  ${dragActive 
                    ? 'border-emerald-500 bg-emerald-500/5' 
                    : darkMode 
                      ? 'border-slate-800 bg-[#161a22]/30 hover:bg-[#161a22]/50' 
                      : 'border-slate-300 bg-slate-50 hover:bg-slate-100/50'}`}
              >
                <input
                  type="file"
                  id="rag-file-input"
                  className="hidden"
                  onChange={handleManualUpload}
                  accept=".txt,.md,.pdf"
                />

                {isUploading ? (
                  <div className="space-y-3">
                    <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin mx-auto" />
                    <span className="text-xs font-mono font-medium block">Processando e indexando: {uploadProgress}%</span>
                    <div className="w-32 bg-slate-200 dark:bg-slate-800 h-1 rounded-full mx-auto overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <label htmlFor="rag-file-input" className="cursor-pointer space-y-2 block">
                    <UploadCloud className="h-10 w-10 text-slate-400 mx-auto" />
                    <div className="text-xs font-bold text-emerald-500">Arraste ou clique para enviar</div>
                    <div className="text-[10px] text-slate-500">Suporta arquivos PDF, Markdown e TXT (Max 5MB)</div>
                  </label>
                )}
              </div>

              {/* List of active files */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold tracking-wider text-slate-500 uppercase block">
                  Arquivos Indexados ({draft.knowledgeFiles.length})
                </label>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                  {draft.knowledgeFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between text-xs
                        ${darkMode ? 'bg-[#161a22] border-[#1f242e]' : 'bg-slate-50 border-slate-150'}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                        <div className="truncate">
                          <span className={`font-semibold block truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {file.name}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">Size: {file.size}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase">
                          INDEXADO
                        </span>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {draft.knowledgeFiles.length === 0 && (
                    <div className="p-8 border border-dashed border-slate-500/10 rounded-xl text-center text-slate-500 font-mono text-[10px]">
                      Nenhum documento anexado ao agente ainda.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 5: InternalToolsSlide */}
        {currentSlide === 5 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className={`text-sm font-bold tracking-tight mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Habilite as Capabilities Nativas
              </h3>
              <p className="text-xs text-slate-500">
                Ative as ferramentas e permissões fundamentais que o agente pode conjurar dinamicamente para cumprir seus objetivos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {[
                { key: 'webSearch', title: 'Internet Search Engine', desc: 'Permite ao agente buscar fatos, notícias e tutoriais na web em tempo real.', icon: Globe, color: 'text-indigo-500 bg-indigo-500/10' },
                { key: 'emailSend', title: 'SMTP Email Sender', desc: 'Permite formular rascunhos e disparar relatórios para e-mails cadastrados.', icon: Mail, color: 'text-blue-500 bg-blue-500/10' },
                { key: 'codeExecution', title: 'Code Executor (Sandbox)', desc: 'Roda códigos Python/JS em um ambiente isolado local para resolver cálculos complexos.', icon: Terminal, color: 'text-emerald-500 bg-emerald-500/10' },
                { key: 'taskScheduling', title: 'Local Task Scheduler', desc: 'Ativa o direito do agente registrar cronogramas e agendar lembretes locais.', icon: Calendar, color: 'text-amber-500 bg-amber-500/10' }
              ].map((tool) => {
                const isChecked = draft.internalTools[tool.key as keyof typeof draft.internalTools];
                const Icon = tool.icon;
                return (
                  <div
                    key={tool.key}
                    onClick={() => {
                      setDraft(prev => ({
                        ...prev,
                        internalTools: {
                          ...prev.internalTools,
                          [tool.key]: !isChecked
                        }
                      }));
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3
                      ${isChecked 
                        ? 'bg-emerald-500/5 border-emerald-500' 
                        : darkMode 
                          ? 'bg-[#161a22] hover:bg-[#1e232f] border-[#1f242e]' 
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-150'}`}
                  >
                    <span className={`p-2 rounded-lg shrink-0 ${tool.color}`}>
                      <Icon className="h-4 w-4" />
                    </span>

                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {tool.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        {tool.desc}
                      </p>
                    </div>

                    <span className={`h-5 w-9 rounded-full flex items-center p-0.5 shrink-0 transition-colors cursor-pointer
                      ${isChecked ? 'bg-emerald-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}
                    >
                      <span className="h-4 w-4 bg-white rounded-full shadow-xs" />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SLIDE 6: SkillsForgeSlide */}
        {currentSlide === 6 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className={`text-sm font-bold tracking-tight mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Forje Habilidades Avançadas (Skills Forge)
              </h3>
              <p className="text-xs text-slate-500">
                Vincule habilidades integradas de alta complexidade. Algumas habilidades exigem credenciais que ficam salvas sob criptografia local.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
              {/* Left Skills menu */}
              <div className="space-y-2 md:col-span-1 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                {skillsList.map((skill) => {
                  const isSel = skill.id === activeSkillId;
                  return (
                    <div
                      key={skill.id}
                      onClick={() => setActiveSkillId(skill.id)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between gap-2
                        ${isSel 
                          ? 'bg-[#1e2530] border-emerald-500 text-emerald-500' 
                          : darkMode 
                            ? 'bg-[#161a22] hover:bg-[#1c212c] border-[#1f242e] text-slate-300' 
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-700'}`}
                    >
                      <div className="truncate">
                        <span className="text-xs font-bold tracking-tight block truncate">{skill.name}</span>
                        <span className="text-[9px] font-mono text-slate-500">{skill.category.toUpperCase()}</span>
                      </div>
                      <span className={`h-4 w-7 rounded-full flex items-center p-0.5 shrink-0 transition-colors
                        ${skill.enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSkill(skill.id);
                        }}
                      >
                        <span className="h-3 w-3 bg-white rounded-full shadow-xs" />
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Right Skill detail configuration */}
              <div className={`p-4 rounded-xl border md:col-span-2 space-y-3 flex flex-col justify-between
                ${darkMode ? 'bg-[#161a22] border-[#1f242e]' : 'bg-slate-50 border-slate-150'}`}
              >
                {(() => {
                  const activeSkill = skillsList.find(s => s.id === activeSkillId);
                  if (!activeSkill) return null;
                  return (
                    <>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-emerald-500/10 text-emerald-500">
                            <Sparkles className="h-3.5 w-3.5" />
                          </span>
                          <span className={`text-xs font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            Configurar: {activeSkill.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          {activeSkill.description}
                        </p>
                      </div>

                      {activeSkill.requiresConfig && activeSkill.configFields ? (
                        <div className="space-y-2.5">
                          {activeSkill.configFields.map((field) => (
                            <div key={field.name} className="space-y-1">
                              <label className="text-[9px] font-mono font-bold uppercase block text-slate-500">
                                {field.label}
                              </label>
                              <input
                                type={field.type === 'password' ? 'password' : 'text'}
                                value={field.value}
                                onChange={(e) => handleSkillConfigChange(activeSkill.id, field.name, e.target.value)}
                                className={`w-full px-2.5 py-1.5 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500
                                  ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 border border-dashed border-slate-500/10 rounded-lg text-center text-slate-500 font-mono text-[10px]">
                          Esta habilidade funciona de forma integrada &ldquo;out-of-the-box&rdquo; sem requisições adicionais de credenciais.
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t pt-2.5 border-slate-500/10">
                        <span className="text-[9px] text-slate-500 font-mono">
                          Status: {activeSkill.enabled ? '🟢 ATIVA' : '⚫ DESATIVADA'}
                        </span>
                        <button
                          onClick={() => handleToggleSkill(activeSkill.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all
                            ${activeSkill.enabled 
                              ? 'bg-rose-500/15 text-rose-500 hover:bg-rose-500/25' 
                              : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                        >
                          {activeSkill.enabled ? 'Desativar Habilidade' : 'Ativar Habilidade'}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 7: McpAutomationsSlide */}
        {currentSlide === 7 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className={`text-sm font-bold tracking-tight mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Acople Conectores MCP (Model Context Protocol)
              </h3>
              <p className="text-xs text-slate-500">
                Acople servidores MCP externos para expandir o contexto do agente de forma padronizada. Teste a integridade antes de anexar à frota.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              {/* Form to add server */}
              <form onSubmit={handleAddMcpServer} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase block text-slate-500">
                    Nome do Conector (Ex: mcp-postgres)
                  </label>
                  <input
                    type="text"
                    value={newMcpName}
                    onChange={(e) => setNewMcpName(e.target.value)}
                    placeholder="Ex: npx-mcp-server-postgres"
                    className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500
                      ${darkMode ? 'bg-[#161a22] border-[#252c39] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase block text-slate-500">
                    CLI Command ou SSE URL
                  </label>
                  <input
                    type="text"
                    value={newMcpCmd}
                    onChange={(e) => setNewMcpCmd(e.target.value)}
                    placeholder="Ex: npx -y @modelcontextprotocol/server-postgres postgres://..."
                    className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500 font-mono
                      ${darkMode ? 'bg-[#161a22] border-[#252c39] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isTestingMcp || !newMcpName.trim() || !newMcpCmd.trim()}
                  className={`w-full py-2 rounded-lg text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer
                    ${isTestingMcp || !newMcpName.trim() || !newMcpCmd.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isTestingMcp ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Testando Conectores no Backend...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Adicionar & Testar Servidor MCP</span>
                    </>
                  )}
                </button>
              </form>

              {/* Server inventory list */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold tracking-wider text-slate-500 uppercase block">
                  Servidores MCP Ativos ({draft.mcpServers.length})
                </label>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                  {draft.mcpServers.map((server) => (
                    <div
                      key={server.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between text-xs
                        ${darkMode ? 'bg-[#161a22] border-[#1f242e]' : 'bg-slate-50 border-slate-150'}`}
                    >
                      <div className="truncate pr-3 flex-1">
                        <span className={`font-semibold block truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          {server.name}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 truncate block">
                          Cmd: {server.value}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="h-1 w-1 bg-emerald-500 rounded-full" />
                          <span>{server.toolsCount} TOOLS</span>
                        </span>
                        <button
                          onClick={() => handleRemoveMcpServer(server.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {draft.mcpServers.length === 0 && (
                    <div className="p-8 border border-dashed border-slate-500/10 rounded-xl text-center text-slate-500 font-mono text-[10px]">
                      Nenhum servidor MCP acoplado no momento.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 8: DynamicHeartbeatSlide */}
        {currentSlide === 8 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className={`text-sm font-bold tracking-tight mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Gatilho por Linguagem Natural (Heartbeat Schedule)
              </h3>
              <p className="text-xs text-slate-500">
                Configure gatilhos automatizados escrevendo livremente em português (ex: &ldquo;todo dia às 9h&rdquo;, &ldquo;a cada 30 minutos&rdquo;). O backend gera a expressão Cron correspondente em tempo real.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
              {/* Input section */}
              <div className="md:col-span-2 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold uppercase block text-slate-500">
                    O que o agente deve agendar? (Descreva o período)
                  </label>
                  <input
                    type="text"
                    value={draft.heartbeat.rawText}
                    onChange={(e) => handleHeartbeatChange(e.target.value)}
                    placeholder="Ex: todo dia às 9h, a cada 30 minutos"
                    className={`w-full px-3 py-2 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500 font-sans
                      ${darkMode ? 'bg-[#161a22] border-[#252c39] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  />
                </div>

                <div className={`p-4 rounded-xl border flex flex-col justify-between h-[110px]
                  ${darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-150'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">
                      Expressão Cron Gerada
                    </span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-500 font-mono px-2 py-0.5 rounded-full font-bold">
                      PARSER ATIVO
                    </span>
                  </div>

                  <div className="mt-1">
                    <span className="text-lg font-mono font-bold tracking-wider text-emerald-500">
                      {draft.heartbeat.parsedCron || 'N/A'}
                    </span>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Tradução: {draft.heartbeat.schedule ? parseNaturalLanguageSchedule(draft.heartbeat.rawText).description : 'Nenhum formato detectado'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Explanations section */}
              <div className={`p-4 rounded-xl border space-y-3 text-[11px] font-sans text-slate-500 leading-relaxed
                ${darkMode ? 'bg-[#161a22] border-[#1f242e]' : 'bg-slate-50 border-slate-150'}`}
              >
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <strong className={darkMode ? 'text-slate-300' : 'text-slate-800'}>Próxima Execução:</strong>
                </div>
                <div className="p-2.5 rounded bg-slate-900/40 border border-slate-500/10 font-mono text-[10px] text-emerald-400">
                  {draft.heartbeat.nextRun || 'Aguardando formato válido...'}
                </div>
                <p className="text-[10px]">
                  <strong>Dicas de termos suportados:</strong><br />
                  &bull; &ldquo;todo dia às 9h&rdquo; (0 9 * * *)<br />
                  &bull; &ldquo;toda segunda às 14h&rdquo; (0 14 * * 1)<br />
                  &bull; &ldquo;a cada 30 minutos&rdquo; (*/30 * * * *)<br />
                  &bull; &ldquo;a cada hora&rdquo; (0 * * * *)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 9: ChannelsSlide */}
        {currentSlide === 9 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className={`text-sm font-bold tracking-tight mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Habilite Canais de Comunicação (Deploy)
              </h3>
              <p className="text-xs text-slate-500">
                Selecione os aplicativos de mensagens por onde o agente irá escutar os gatilhos e conversar com clientes finais.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {[
                { id: 'telegram', label: 'Telegram Chatbot', color: 'bg-sky-500 text-white', placeholder: 'Token: 123456:ABC-DEF...' },
                { id: 'discord', label: 'Discord Bot', color: 'bg-indigo-500 text-white', placeholder: 'Bot Token / Webhook URL' },
                { id: 'whatsapp', label: 'WhatsApp API', color: 'bg-emerald-500 text-white', placeholder: 'Token de Envio / Phone ID' },
                { id: 'teams', label: 'Microsoft Teams Webhook', color: 'bg-violet-500 text-white', placeholder: 'Teams Incoming Webhook URL' }
              ].map((plat) => {
                const platData = draft.channels[plat.id as keyof typeof draft.channels];
                const isChActive = platData.enabled;
                return (
                  <div
                    key={plat.id}
                    className={`p-4 rounded-xl border transition-all space-y-3
                      ${isChActive 
                        ? 'bg-emerald-500/5 border-emerald-500' 
                        : darkMode 
                          ? 'bg-[#161a22] border-[#1f242e]' 
                          : 'bg-slate-50 border-slate-150'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`p-1.5 rounded-lg text-xs font-mono font-bold ${plat.color}`}>
                          {plat.id.slice(0, 2).toUpperCase()}
                        </span>
                        <span className={`text-xs font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {plat.label}
                        </span>
                      </div>

                      <span
                        onClick={() => {
                          setDraft(prev => ({
                            ...prev,
                            channels: {
                              ...prev.channels,
                              [plat.id]: {
                                ...platData,
                                enabled: !isChActive
                              }
                            }
                          }));
                        }}
                        className={`h-5 w-9 rounded-full flex items-center p-0.5 shrink-0 transition-colors cursor-pointer
                          ${isChActive ? 'bg-emerald-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}
                      >
                        <span className="h-4 w-4 bg-white rounded-full shadow-xs" />
                      </span>
                    </div>

                    {isChActive && (
                      <div className="space-y-1 mt-2.5">
                        <input
                          type="password"
                          value={platData.token}
                          onChange={(e) => {
                            setDraft(prev => ({
                              ...prev,
                              channels: {
                                ...prev.channels,
                                [plat.id]: {
                                  ...platData,
                                  token: e.target.value
                                }
                              }
                            }));
                          }}
                          placeholder={plat.placeholder}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500 font-mono
                            ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Linear Stepper Action Footer */}
        <div className="flex items-center justify-between border-t pt-5 mt-6 border-slate-500/10">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 1}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer
              ${currentSlide === 1 
                ? 'opacity-30 cursor-not-allowed' 
                : darkMode 
                  ? 'bg-[#12161f] border-[#252c39] text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Voltar</span>
          </button>

          <button
            onClick={nextSlide}
            className={`px-5 py-2 text-xs font-bold rounded-xl text-white bg-emerald-500 hover:bg-emerald-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10`}
          >
            <span>{currentSlide === totalSlides ? 'Concluir & Deploy' : 'Avançar'}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
