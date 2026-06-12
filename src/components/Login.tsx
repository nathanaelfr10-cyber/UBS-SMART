import { useState, useEffect, FormEvent } from "react";
import { User, Shield, AlertTriangle, CheckCircle, Search, HelpCircle, ChevronDown } from "lucide-react";

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [nome, setNome] = useState("");
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [filteredCollaborators, setFilteredCollaborators] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch registered collaborators from backend on mount
  useEffect(() => {
    const loadCollaborators = async () => {
      try {
        const res = await fetch("/api/auth/collaborators");
        if (res.ok) {
          const data = await res.json();
          setCollaborators(data);
          setFilteredCollaborators(data);
        }
      } catch (err) {
        console.error("Erro consultando colaboradores no banco:", err);
      }
    };
    loadCollaborators();
  }, []);

  // Filter list as the user types
  useEffect(() => {
    if (!nome.trim()) {
      setFilteredCollaborators(collaborators);
    } else {
      const searchVal = nome.toLowerCase();
      const filtered = collaborators.filter(c => 
        (c?.nome && c.nome.toLowerCase().includes(searchVal)) ||
        (c?.unidade && c.unidade.toLowerCase().includes(searchVal)) ||
        (c?.funcao && c.funcao.toLowerCase().includes(searchVal))
      );
      setFilteredCollaborators(filtered);
    }
  }, [nome, collaborators]);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError("Por favor, informe seu nome de colaborador.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao conectar ao terminal.");
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Colaborador não cadastrado ou erro operacional.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#070a13] flex items-center justify-center p-4 selection:bg-[#1565C0] selection:text-white font-sans" id="login_container">
      <div className="w-full max-w-md bg-[#0a0f1d] rounded-xl shadow-2xl overflow-hidden border border-[#151f33] transition-all duration-300">
        
        {/* Top Header Panel */}
        <div className="bg-[#070a13] border-b border-[#151f33] p-8 text-white text-center sm:p-10">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-[#1565C0]/20 rounded-lg border border-[#1565C0]/30 backdrop-blur-md">
              <Shield className="w-10 h-10 text-[#1565C0]" />
            </div>
          </div>
          <h1 className="text-2xl font-black font-sans tracking-tight">UBS SMART</h1>
          <p className="text-[10px] text-slate-400 font-mono mt-2 uppercase tracking-widest">
            SISTEMA DE EFICIÊNCIA & PARADAS
          </p>
        </div>

        {/* Form Panel */}
        <div className="p-8 sm:p-10 relative">
          {error && (
            <div className="mb-6 p-4 bg-rose-950/40 border-l-4 border-rose-800 rounded text-rose-200 text-xs flex items-start gap-2 relative z-30">
              <AlertTriangle className="w-5 h-5 text-rose-455 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5" id="login-form">
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Nome do Colaborador (Identificação)
              </label>
              
              <div className="relative z-30">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Selecione ou comece a digitar..."
                  className="block w-full pl-10 pr-10 py-3 border border-[#151f33] bg-[#070a13] text-slate-100 placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1565C0] focus:border-transparent text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>

              {/* Suggestions dropdown list */}
              {showDropdown && filteredCollaborators.length > 0 && (
                <div className="absolute z-40 mt-1.5 w-full max-h-56 bg-[#070a13] border border-[#151f33] rounded-lg shadow-2xl overflow-y-auto divide-y divide-[#151f33]">
                  {filteredCollaborators.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setNome(c.nome);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#121c32]/50 text-xs transition-colors cursor-pointer flex justify-between items-center"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-100">{c.nome}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{c.email}</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-blue-300 bg-blue-950/40 border border-blue-900/30 px-2 py-1 rounded">
                        {c.funcao} • {c.unidade}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400 font-mono select-none">
                Identificação Direta Ativa (Sem Senha)
              </span>
              <span className="text-slate-500 text-[10px]">
                {collaborators.length} cadastrados
              </span>
            </div>

            {/* Close dropdown backdrop behavior */}
            {showDropdown && (
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setShowDropdown(false)} 
              />
            )}

            <button
              type="submit"
              disabled={loading}
              id="btn-login"
              className="relative z-30 w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-[#1565C0] hover:bg-[#1565C0]/85 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1565C0] disabled:bg-[#121c32] disabled:text-slate-500 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {loading ? "Validando Operação..." : "Acessar Painel de Controle"}
            </button>
          </form>
        </div>

        {/* Footer info strip */}
        <div className="bg-[#070a13] px-8 py-4 border-t border-[#151f33] flex justify-between text-[10px] text-slate-400 font-mono">
          <span>REGISTRO DIRETO ATIVO</span>
          <span>v2.8.0</span>
        </div>
      </div>
    </div>
  );
}
