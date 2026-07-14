import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Lock, 
  Palette, 
  Share2, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Shield,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

interface SettingsViewProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export default function SettingsView({
  darkMode,
  setDarkMode
}: SettingsViewProps) {
  const [profileName, setProfileName] = useState('Yrael Sacrati');
  const [profileEmail, setProfileEmail] = useState('ysraelsacrati09@gmail.com');
  const [language, setLanguage] = useState('pt-BR');
  const [fontSize, setFontSize] = useState('Médio');
  const [twoFactor, setTwoFactor] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' });

  // OAuth Connect simulation states
  const [integrations, setIntegrations] = useState({
    slack: { connected: true, account: 'Slack #mangaba-alerts' },
    discord: { connected: false, account: null },
    github: { connected: false, account: null }
  });

  const [activeIntegrationId, setActiveIntegrationId] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const handleToggleTwoFactor = () => {
    setTwoFactor(!twoFactor);
    alert(`Autenticação de Dois Fatores (2FA) ${!twoFactor ? 'ativada' : 'desativada'} com sucesso!`);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passForm.current || !passForm.next || !passForm.confirm) {
      alert('Por favor, preencha todos os campos para redefinir a senha.');
      return;
    }
    if (passForm.next !== passForm.confirm) {
      alert('A nova senha e a confirmação não coincidem.');
      return;
    }
    alert('Sua senha foi redefinida localmente com sucesso sob criptografia!');
    setPassForm({ current: '', next: '', confirm: '' });
  };

  const handleConnectIntegration = (id: string) => {
    if (integrations[id as keyof typeof integrations].connected) {
      // Disconnect
      setIntegrations(prev => ({
        ...prev,
        [id]: { connected: false, account: null }
      }));
    } else {
      // Open simulate auth dialog
      setActiveIntegrationId(id);
    }
  };

  const handleConfirmAuthorize = () => {
    setIsAuthorizing(true);
    setTimeout(() => {
      setIsAuthorizing(false);
      setIntegrations(prev => ({
        ...prev,
        [activeIntegrationId as string]: { 
          connected: true, 
          account: `${activeIntegrationId?.toUpperCase()} @ysraelsacrati` 
        }
      }));
      setActiveIntegrationId(null);
    }, 1200);
  };

  const handleDeleteAccount = () => {
    const doubleCheck = prompt('⚠️ ATENÇÃO: Esta ação é PERMANENTE e apagará todo o histórico de conversas, credenciais do RAG e MCP servers. Digite "MANGABA-DELETAR" para confirmar:');
    if (doubleCheck === 'MANGABA-DELETAR') {
      alert('Todos os dados locais foram purgados. O dashboard será recarregado.');
      window.location.reload();
    } else if (doubleCheck !== null) {
      alert('Operação abortada. Código incorreto.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Simulation Authorizing overlay */}
      {isAuthorizing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
          <div className="text-center space-y-3 p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl">
            <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin mx-auto" />
            <span className="text-sm font-mono tracking-widest block uppercase">Autorizando token OAuth seguro...</span>
          </div>
        </div>
      )}

      {/* Settings title header */}
      <div className={`p-6 rounded-2xl border transition-all duration-300
        ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}
      `}>
        <h1 className={`font-display font-bold text-xl tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          <Settings className="h-5 w-5 text-emerald-500" />
          <span>Configurações Operacionais</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ajuste as preferências globais do painel, chaves de API, credenciais OAuth e segurança de dados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Navigation / Cards column on left */}
        <div className="space-y-4 md:col-span-2">
          
          {/* Card 1: Perfil e Geral */}
          <div className={`p-5 rounded-xl border space-y-4
            ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}`}
          >
            <h3 className={`font-display font-bold text-sm tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <User className="h-4 w-4 text-emerald-500" />
              <span>Perfil & Localização</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block">Seu Nome</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500
                    ${darkMode ? 'bg-[#161a22] border-[#252c39] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block">E-mail Corporativo</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500
                    ${darkMode ? 'bg-[#161a22] border-[#252c39] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block">Idioma Preferido</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium
                    ${darkMode ? 'bg-[#161a22] border-[#252c39] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es">Español</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block">Tamanho da Fonte</label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium
                    ${darkMode ? 'bg-[#161a22] border-[#252c39] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  <option value="Pequeno">Pequeno (Standard)</option>
                  <option value="Médio">Médio</option>
                  <option value="Grande">Grande</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Segurança e 2FA */}
          <div className={`p-5 rounded-xl border space-y-4
            ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}`}
          >
            <h3 className={`font-display font-bold text-sm tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <Lock className="h-4 w-4 text-emerald-500" />
              <span>Segurança da Conta</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b pb-4 border-slate-500/10">
              <div className="sm:col-span-2 space-y-1">
                <h4 className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Autenticação em Duas Etapas (2FA)</h4>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Adicione uma camada adicional de robustez ao painel. Exige confirmação por token de email no login.
                </p>
              </div>
              <div className="flex items-center sm:justify-end">
                <button
                  type="button"
                  onClick={handleToggleTwoFactor}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer
                    ${twoFactor 
                      ? 'bg-emerald-500 text-white border-emerald-500' 
                      : darkMode 
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' 
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'}`}
                >
                  {twoFactor ? '🟢 Ativado' : 'Ativar 2FA'}
                </button>
              </div>
            </div>

            {/* Redefinição de senha */}
            <form onSubmit={handleUpdatePassword} className="space-y-3 pt-1">
              <h4 className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Alterar Senha do Usuário</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <input
                    type="password"
                    placeholder="Senha Atual"
                    value={passForm.current}
                    onChange={(e) => setPassForm(prev => ({ ...prev, current: e.target.value }))}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500
                      ${darkMode ? 'bg-[#161a22] border-[#252c39] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  />
                </div>
                <div className="space-y-1">
                  <input
                    type="password"
                    placeholder="Nova Senha"
                    value={passForm.next}
                    onChange={(e) => setPassForm(prev => ({ ...prev, next: e.target.value }))}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500
                      ${darkMode ? 'bg-[#161a22] border-[#252c39] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  />
                </div>
                <div className="space-y-1">
                  <input
                    type="password"
                    placeholder="Confirmar Senha"
                    value={passForm.confirm}
                    onChange={(e) => setPassForm(prev => ({ ...prev, confirm: e.target.value }))}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none border focus:ring-1 focus:ring-emerald-500
                      ${darkMode ? 'bg-[#161a22] border-[#252c39] text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer shadow-xs"
              >
                Atualizar Senha
              </button>
            </form>
          </div>

        </div>

        {/* Sidebar settings column on right */}
        <div className="space-y-4">
          
          {/* Card 3: Integrations (OAuth) */}
          <div className={`p-5 rounded-xl border space-y-4
            ${darkMode ? 'bg-[#12161f] border-[#1f242e]' : 'bg-white border-slate-200'}`}
          >
            <h3 className={`font-display font-bold text-sm tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <Share2 className="h-4 w-4 text-emerald-500" />
              <span>Integrações (OAuth)</span>
            </h3>

            <div className="space-y-3">
              {[
                { id: 'slack', label: 'Slack', desc: 'Alertas e triggers de chatbot.' },
                { id: 'discord', label: 'Discord', desc: 'Canais de auditoria operacionais.' },
                { id: 'github', label: 'GitHub', desc: 'Leitura de repositórios e PRs.' }
              ].map((plat) => {
                const isConn = integrations[plat.id as keyof typeof integrations].connected;
                const activeAcc = integrations[plat.id as keyof typeof integrations].account;
                return (
                  <div
                    key={plat.id}
                    className={`p-3 rounded-lg border flex flex-col justify-between gap-2 text-xs
                      ${isConn 
                        ? 'bg-emerald-500/5 border-emerald-500/25' 
                        : darkMode 
                          ? 'bg-[#161a22] border-[#1f242e]' 
                          : 'bg-slate-50 border-slate-150'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold uppercase tracking-wide ${darkMode ? 'text-white' : 'text-slate-800'}`}>{plat.label}</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${isConn ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                        {isConn ? 'CONECTADO' : 'PENDENTE'}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-normal">
                      {isConn ? `Conta vinculada: ${activeAcc}` : plat.desc}
                    </p>

                    <button
                      onClick={() => handleConnectIntegration(plat.id)}
                      className={`w-full py-1 rounded-md text-[11px] font-semibold text-center border cursor-pointer transition-colors
                        ${isConn 
                          ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/15 border-rose-500/20' 
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                    >
                      {isConn ? 'Desconectar Conta' : 'Conectar via OAuth'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 4: Danger Zone (Zona de Risco) */}
          <div className={`p-5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-3.5`}
          >
            <h3 className="font-display font-bold text-sm tracking-tight flex items-center gap-2 text-rose-500">
              <AlertTriangle className="h-4 w-4" />
              <span>Zona de Perigo (Risk)</span>
            </h3>
            
            <p className="text-[10px] text-slate-500 leading-normal">
              Esta seção contém ações críticas que afetam permanentemente seu ambiente. Seja cauteloso.
            </p>

            <button
              onClick={handleDeleteAccount}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 rounded-lg text-xs transition-all shadow-xs cursor-pointer"
            >
              Excluir Conta & Purgar Dados
            </button>
          </div>

        </div>

      </div>

      {/* OAuth Mock Authorization dialog */}
      {activeIntegrationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setActiveIntegrationId(null)} />
          <div className={`relative w-full max-w-sm rounded-xl p-6 border shadow-2xl space-y-4 text-center
            ${darkMode ? 'bg-[#12161f] border-[#252c39] text-white' : 'bg-white border-slate-250 text-slate-800'}`}
          >
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
              <Shield className="h-6 w-6" />
            </div>

            <div>
              <h3 className="font-display font-bold text-base tracking-tight">
                Autorizar Mangaba Agent?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                A aplicação solicita credenciais para ler e gravar informações sob a conta <strong className="text-emerald-500">[{activeIntegrationId.toUpperCase()}]</strong> para responder aos chatbots.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => setActiveIntegrationId(null)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-colors
                  ${darkMode 
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
              >
                Recusar
              </button>
              <button
                onClick={handleConfirmAuthorize}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors cursor-pointer"
              >
                Autorizar Acesso
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
