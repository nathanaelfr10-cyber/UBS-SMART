import { useState, useEffect } from "react";
import { AuditLog } from "../types";
import { ShieldCheck, Search, Calendar, Clock, RefreshCw, Key, Settings, Trash, AlertTriangle } from "lucide-react";

export default function AuditLogTable() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("TODOS");
  const [error, setError] = useState("");

  const fetchLogs = () => {
    setLoading(true);
    setError("");
    fetch("/api/audit-logs", {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setLogs(data);
      })
      .catch(err => {
        console.error(err);
        setError("Não foi possível carregar a trilha de logs de segurança da plataforma.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionStyles = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("LOGIN") || act.includes("SESSÃO")) {
      return "bg-sky-950/40 text-sky-300 border-sky-900/30";
    }
    if (act.includes("CRIAR") || act.includes("SEMEAR") || act.includes("CADASTRO")) {
      return "bg-emerald-950/40 text-emerald-300 border-emerald-900/30";
    }
    if (act.includes("DELETAR") || act.includes("EXCLUIR") || act.includes("EXPURGO") || act.includes("CORROMPIDO")) {
      return "bg-rose-950/40 text-rose-300 border-rose-900/30";
    }
    return "bg-slate-900 text-slate-300 border-[#151f33]";
  };

  const getActionIcon = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("LOGIN")) return <Key className="w-3.5 h-3.5 shrink-0" />;
    if (act.includes("EXCLUIR") || act.includes("DELETAR")) return <Trash className="w-3.5 h-3.5 shrink-0" />;
    return <Settings className="w-3.5 h-3.5 shrink-0" />;
  };

  const filteredLogs = logs.filter(l => {
    const matchesSearch = 
      l.usuario.toLowerCase().includes(search.toLowerCase()) ||
      l.acao.toLowerCase().includes(search.toLowerCase()) ||
      l.detalhes.toLowerCase().includes(search.toLowerCase());

    if (categoryFilter === "TODOS") return matchesSearch;
    if (categoryFilter === "SESSAO") return matchesSearch && l.acao.toUpperCase().includes("LOGIN");
    if (categoryFilter === "CADASTROS") return matchesSearch && (l.acao.toUpperCase().includes("CRIAR") || l.acao.toUpperCase().includes("CADASTRO"));
    if (categoryFilter === "DELECOES") return matchesSearch && (l.acao.toUpperCase().includes("DELETAR") || l.acao.toUpperCase().includes("EXCLUIR"));
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in" id="audit_logs_view_wrapper">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-1 gap-4 border-b border-[#151f33] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-[#1565C0]" />
            Rastreabilidade de Segurança & Logs de Auditoria
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
            Trilha immutável de acessos, modificações industriais e apontamentos de paragens
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#121c32] text-slate-100 hover:bg-[#121c32]/80 rounded-lg border border-[#151f33] cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
          <span>Fazer Varredura Ativa</span>
        </button>
      </div>

      {/* ERROR FEEDBACK */}
      {error && (
        <div className="p-4 bg-rose-950/40 border-l-4 border-rose-800 text-rose-200 text-xs font-semibold rounded flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-455" />
          <span>{error}</span>
        </div>
      )}

      {/* SEARCH AND QUICK FILTER CONTROLLERS */}
      <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-5 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Pesquisar por colaborador, ação ou detalhes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-105 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0] focus:bg-[#121c32] animate-transition"
            />
          </div>

          {/* Quick filter tabs */}
          <div className="flex flex-wrap gap-1.5 font-sans">
            <button
              onClick={() => setCategoryFilter("TODOS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer
                ${categoryFilter === "TODOS" ? "bg-[#121c32] border-[#1565C0]/40 text-white" : "bg-[#070a13] border-[#151f33] text-slate-300 hover:bg-[#121c32]"}
              `}
            >
              Exibir Tudo
            </button>
            <button
              onClick={() => setCategoryFilter("SESSAO")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer
                ${categoryFilter === "SESSAO" ? "bg-sky-950/60 border border-sky-500/40 text-sky-200" : "bg-[#070a13] border-[#151f33] text-slate-300 hover:bg-[#121c32]"}
              `}
            >
              Logins / Chaves
            </button>
            <button
              onClick={() => setCategoryFilter("CADASTROS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer
                ${categoryFilter === "CADASTROS" ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-200" : "bg-[#070a13] border-[#151f33] text-slate-300 hover:bg-[#121c32]"}
              `}
            >
              Cadastros Novos
            </button>
            <button
              onClick={() => setCategoryFilter("DELECOES")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer
                ${categoryFilter === "DELECOES" ? "bg-rose-950/60 border border-rose-500/40 text-rose-200" : "bg-[#070a13] border-[#151f33] text-slate-300 hover:bg-[#121c32]"}
              `}
            >
              Deleções / Alertas
            </button>
          </div>
        </div>

        {/* LOGS TABLE LIST */}
        <div className="overflow-x-auto text-slate-300 text-xs">
          <table className="w-full text-left">
            <thead className="bg-[#070a13] text-slate-100 border-b border-[#151f33] uppercase text-[10px] font-mono tracking-wider">
              <tr>
                <th className="px-5 py-3.5 rounded-l-lg">Timestamp</th>
                <th className="px-5 py-3.5">Colaborador Autenticado</th>
                <th className="px-5 py-3.5">Ação Realizada</th>
                <th className="px-5 py-3.5 rounded-r-lg">Detalhamento Técnico do Evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151f33]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400 font-mono">
                    Realizando escaneamento criptográfico dos logs do servidor seguro...
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#121c32]/30 transition-colors font-sans">
                    <td className="px-5 py-3.5 text-slate-400 text-[11px] shrink-0">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{log.data}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{log.hora}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-100">{log.usuario}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border
                        ${getActionStyles(log.acao)}
                      `}>
                        {getActionIcon(log.acao)}
                        {log.acao}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 font-mono leading-relaxed max-w-xl break-all">
                      {log.detalhes}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-400 font-mono">
                    Nenhum sinal analítico ou log coletado com os parâmetros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
