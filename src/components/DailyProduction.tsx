import { useState, useEffect, FormEvent } from "react";
import { Ubs, DailyProductionRecord } from "../types";
import { Scale, Plus, Calendar, AlertTriangle, CheckCircle2, Trash2, ShieldAlert, TrendingUp } from "lucide-react";

interface DailyProductionProps {
  userRole: string;
  userUnit: string;
  allUbs: Ubs[];
  userName?: string;
  onRefreshStats?: () => void;
}

export default function DailyProduction({ userRole, userUnit, allUbs, userName = "", onRefreshStats }: DailyProductionProps) {
  const [dailyRecords, setDailyRecords] = useState<DailyProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [unidade, setUnidade] = useState(userUnit || "");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [material, setMaterial] = useState("Soja");
  const [quantidade, setQuantidade] = useState("");
  const [operador, setOperador] = useState(userName || "");
  const [hora, setHora] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const canDelete = ["Administrador", "Supervisor"].includes(userRole);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/daily-productions", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDailyRecords(data);
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao obter a lista de produção diária.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Update default unit when user profile loads
  useEffect(() => {
    if (userUnit) {
      setUnidade(userUnit);
    } else if (allUbs.length > 0) {
      setUnidade(allUbs[0].nome);
    }
    if (userName) {
      setOperador(userName);
    }
  }, [userUnit, allUbs, userName]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!unidade || !data || !material || !quantidade || !operador || !hora) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const tons = Number(quantidade);
    if (isNaN(tons) || tons <= 0) {
      setError("A quantidade beneficiada deve ser um número maior que zero.");
      return;
    }

    try {
      const res = await fetch("/api/daily-productions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
        },
        body: JSON.stringify({
          unidade,
          data,
          material,
          quantidadeToneladas: tons,
          operador,
          hora
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Erro ao salvar a produção.");

      setSuccess(`Lançamento de ${tons} toneladas de ${material} registrado com sucesso!`);
      setQuantidade("");
      fetchRecords();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      setError(err.message || "Falha no salvamento.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento de produção diária permanentemente?")) return;
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/daily-productions/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
        }
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Erro ao deletar o lançamento.");

      setSuccess("Lançamento de produção apagado com sucesso.");
      fetchRecords();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      setError(err.message || "Não foi possível excluir o lançamento.");
    }
  };

  // Automatically Consolidate Values by Material Processed
  const consolidated = dailyRecords.reduce((acc: { [key: string]: number }, record) => {
    const mat = record.material;
    acc[mat] = (acc[mat] || 0) + Number(record.quantidadeToneladas);
    return acc;
  }, {});

  const totalGeralToneladas = (Object.values(consolidated) as number[]).reduce((acc: number, curr: number) => acc + curr, 0);

  return (
    <div className="space-y-6" id="daily_production_wrapper">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-1 gap-3 border-b border-[#151f33] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Scale className="w-8 h-8 text-emerald-500" />
            🌱 Produção do Dia
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
            Apontamento consolidado de grãos beneficiados por filial e operador em toneladas
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-950/20 border border-rose-900/30 border-l-4 border-l-red-500 text-rose-250 text-xs font-semibold rounded-lg flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 border-l-4 border-l-emerald-500 text-emerald-250 text-xs font-semibold rounded-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* CONSOLIDATED METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total General Card */}
        <div className="bg-[#0a0f1d] rounded-xl p-5 border border-[#151f33] shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Geral Beneficiado</span>
            <span className="text-3xl font-black block mt-2 font-mono text-[#1565C0]">
              {(totalGeralToneladas as number).toLocaleString("pt-BR")} t
            </span>
          </div>
          <span className="text-[10px] font-mono mt-3 text-slate-500 uppercase tracking-widest block">Consolidação de Filiais</span>
        </div>

        {/* Dynamic Materials consolidation cards */}
        {Object.entries(consolidated).map(([mat, value]) => (
          <div key={mat} className="bg-[#0a0f1d] rounded-xl p-5 border border-[#151f33] shadow-md flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Consolidado • {mat}</span>
              <span className="text-2xl font-extrabold text-slate-100 block mt-2 font-mono">
                {(value as number).toLocaleString("pt-BR")} t
              </span>
            </div>
            <span className="text-[10px] font-mono mt-3 text-emerald-500 uppercase tracking-wider block font-bold">
              ✓ Ativo Beneficiado
            </span>
          </div>
        ))}

        {Object.keys(consolidated).length === 0 && (
          <div className="col-span-3 bg-[#0a0f1d]/50 rounded-xl border-2 border-dashed border-[#151f33] p-5 flex items-center justify-center text-slate-400 text-xs font-mono">
            Aguardando registros para consolidar indicadores de tonelagem.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* APPOINTMENT FORM CARD */}
        <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-5 shadow-lg space-y-4 lg:col-span-1">
          <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider border-b border-[#151f33] pb-2">
            ✍️ Registrar Produção Beneficiada
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                Filial / Unidade UBS *
              </label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="block w-full py-2.5 px-3 border border-[#151f33] rounded-lg bg-[#070a13] text-xs font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer min-h-[44px]"
              >
                <option value="">Selecione a Filial...</option>
                {allUbs.map(u => (
                  <option key={u.id} value={u.nome}>{u.nome}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  Material Processado *
                </label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="block w-full py-2.5 px-3 border border-[#151f33] rounded-lg bg-[#070a13] text-xs font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer min-h-[44px]"
                >
                  <option value="Soja">Soja</option>
                  <option value="Milho">Milho</option>
                  <option value="Algodão">Algodão</option>
                  <option value="Sorgo">Sorgo</option>
                  <option value="Trigo">Trigo</option>
                  <option value="Outros">Outras Culturas</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-405 uppercase tracking-wider mb-2">
                  Quantidade (Tons) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="EX: 185"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    className="block w-full px-3 py-2 border border-[#151f33] rounded-lg text-xs bg-[#070a13] text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-[#1565C0] min-h-[44px]"
                  />
                  <span className="absolute right-2 top-2.5 text-[9px] font-bold font-mono text-slate-400 uppercase tracking-tight">
                    t
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-405 uppercase tracking-wider mb-2">
                  Data de Processo *
                </label>
                <input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="block w-full px-3 py-2 border border-[#151f33] rounded-lg text-xs bg-[#070a13] text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] font-mono min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-405 uppercase tracking-wider mb-2">
                  Hora de Registro *
                </label>
                <input
                  type="text"
                  required
                  placeholder="HH:MM:SS"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="block w-full px-3 py-2 border border-[#151f33] rounded-lg text-xs bg-[#070a13] text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] font-mono min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-405 uppercase tracking-wider mb-2">
                Operador Responsável *
              </label>
              <input
                type="text"
                required
                placeholder="Nome do Operador"
                value={operador}
                onChange={(e) => setOperador(e.target.value)}
                className="block w-full px-3 py-2 border border-[#151f33] rounded-lg text-xs bg-[#070a13] text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] min-h-[44px]"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3.5 px-6 min-h-[56px] bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 border-emerald-500/30"
            >
              <Plus className="w-5 h-5 animate-pulse" />
              <span>🌱 REGISTRAR PRODUÇÃO BENEFICIADA</span>
            </button>
          </form>
        </div>

        {/* LIST HISTORIC CARD */}
        <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-5 shadow-lg space-y-4 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider border-b border-[#151f33] pb-2">
              📋 Lista de Lançamentos Diários
            </h3>

            <div className="overflow-x-auto text-xs text-slate-300 max-h-[380px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-[#121c32] text-slate-100 uppercase text-[9px] font-mono tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Data</th>
                    <th className="px-4 py-3">Unidade Filial</th>
                    <th className="px-4 py-3">Cultura</th>
                    <th className="px-4 py-3">Tons Beneficiadas</th>
                    <th className="px-4 py-3">Responsável</th>
                    <th className="px-4 py-3 rounded-r-lg text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#151f33]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400 font-mono">
                        Carregando lançamentos consolidados...
                      </td>
                    </tr>
                  ) : dailyRecords.length > 0 ? (
                    dailyRecords.map(rec => (
                      <tr key={rec.id} className="hover:bg-[#121c32]/30 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-400">
                          {rec.data} <span className="text-[9px] text-slate-500 font-normal">({rec.hora})</span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-100">{rec.unidade}</td>
                        <td className="px-4 py-3.5 font-semibold text-indigo-200">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-950/40 text-[10px] border border-indigo-900/40 uppercase tracking-tight">
                            {rec.material}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-black text-emerald-450 text-sm bg-[#070a13]">
                          {rec.quantidadeToneladas.toLocaleString("pt-BR")} t
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 truncate max-w-[120px]" title={rec.operador}>
                          {rec.operador}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {canDelete ? (
                            <button
                              onClick={() => handleDelete(rec.id)}
                              className="p-1.5 text-rose-450 hover:text-white hover:bg-rose-600 rounded transition-colors cursor-pointer"
                              title="Remover Lançamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[9px] text-slate-550 font-mono tracking-widest uppercase">Trancado</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-500 font-mono">
                        Nenhuma tonelagem de produção cadastrada hoje.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="bg-[#121c32]/20 rounded-xl border border-[#151f33] p-3 mt-4 text-[10px] text-slate-400 flex items-start gap-1.5 font-semibold">
            <ShieldAlert className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>Cada registro de produção diária atualiza na hora os indicadores de OEE do cockpit operacional!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
