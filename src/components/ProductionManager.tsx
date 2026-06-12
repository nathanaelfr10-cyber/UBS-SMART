import { useState, useEffect, FormEvent } from "react";
import { ProductionRecord, Ubs } from "../types";
import { Package, Plus, Search, CheckCircle2, AlertTriangle, Trash2, Calendar, User, Crop } from "lucide-react";

interface ProductionManagerProps {
  userRole: string;
}

export default function ProductionManager({ userRole }: ProductionManagerProps) {
  const [productions, setProductions] = useState<ProductionRecord[]>([]);
  const [ubsList, setUbsList] = useState<Ubs[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [material, setMaterial] = useState("Soja");
  const [cultivar, setCultivar] = useState("");
  const [lote, setLote] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [processo, setProcesso] = useState("Limpeza");
  const [unidade, setUnidade] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const canDelete = ["Administrador", "Supervisor"].includes(userRole);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const authHeader = { "Authorization": `Bearer ${localStorage.getItem("ubs_token")}` };
      
      const prodRes = await fetch("/api/productions", { headers: authHeader });
      const prodData = await prodRes.json();
      setProductions(prodData);

      const ubsRes = await fetch("/api/ubs", { headers: authHeader });
      const ubsData = await ubsRes.json();
      setUbsList(ubsData);

      if (ubsData.length > 0) {
        setUnidade(ubsData[0].nome);
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao obter lista de controle de sacaria do servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Simple auto generator for Lotto codes to make UX stellar
  useEffect(() => {
    if (material && cultivar) {
      const abbreviation = material.toUpperCase().substring(0, 3);
      const randomSuf = Math.floor(Math.random() * 900) + 100;
      setLote(`${abbreviation}-2026-${randomSuf}`);
    }
  }, [material, cultivar]);

  const handleCreateProduction = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!material || !cultivar || !lote || !quantidade || !processo || !unidade) {
      setError("Por favor, preencha todos os campos do lote de beneficiamento.");
      return;
    }

    if (Number(quantidade) <= 0) {
      setError("A quantidade de sementes ensacadas precisa ser maior que zero.");
      return;
    }

    try {
      const res = await fetch("/api/productions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
        },
        body: JSON.stringify({
          material,
          cultivar,
          lote,
          quantidade,
          processo,
          ubs: unidade
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ocorreu um erro ao salvar o registro.");

      setSuccess(`Lote ${lote} (${quantidade} scs) registrado com sucesso!`);
      setCultivar("");
      setQuantidade("");
      setShowAddForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Erro no salvamento.");
    }
  };

  const handleDeleteProduction = async (id: string) => {
    if (!confirm("Confirmar a exclusão permanente deste lote do controle de sacaria?")) return;
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/productions/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro de eliminação.");

      setSuccess("Lote operacional removido.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Não foi possível deletar.");
    }
  };

  const filteredProductions = productions.filter(p => 
    p.material.toLowerCase().includes(search.toLowerCase()) ||
    p.cultivar.toLowerCase().includes(search.toLowerCase()) ||
    p.lote.toLowerCase().includes(search.toLowerCase()) ||
    p.ubs.toLowerCase().includes(search.toLowerCase()) ||
    p.processo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" id="production_management_wrapper">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-1 gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-8 h-8 text-indigo-900" />
            Apontamento de Controle de Produção
          </h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-mono">
            Log operacional de sementes beneficiadas (soja, milho, algodão, etc.) por lote, sacos e UBS
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-indigo-900 hover:bg-indigo-950 text-white rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Apontar Lote Produzido</span>
        </button>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="p-4 bg-rose-950/20 border border-rose-900/30 border-l-4 border-l-red-500 text-rose-250 text-xs font-semibold rounded flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-[#00c853]/10 border-l-4 border-[#00c853] text-[#00c853] text-xs font-semibold rounded flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#00c853]" />
          <span>{success}</span>
        </div>
      )}

      {/* APPOINTMENT FORM PANEL */}
      {showAddForm && (
        <div className="bg-[#070a13] rounded-xl shadow-2xl border border-[#151f33] p-6 animate-fade-in" id="add_production_panel">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4 border-b border-[#151f33] pb-2">
            Formulário de Controle de Sacaria e Loteamentos
          </h2>
          <form onSubmit={handleCreateProduction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Cultura de Semente
                </label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="block w-full py-2 px-2.5 text-xs border border-[#151f33] rounded-lg bg-[#0a0f1d] text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Soja">Soja</option>
                  <option value="Milho">Milho</option>
                  <option value="Algodão">Algodão</option>
                  <option value="Sorgo">Sorgo</option>
                  <option value="Trigo">Trigo</option>
                  <option value="Outros">Outras Grãos</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Cultivar (Variedade Comercial)
                </label>
                <div className="relative">
                  <Crop className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={30}
                    placeholder="Ex: M7739 IPRO"
                    value={cultivar}
                    onChange={(e) => setCultivar(e.target.value)}
                    className="block w-full pl-9 pr-2 py-2 text-xs border border-[#151f33] rounded-lg bg-[#0a0f1d] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Código do Lote (Auto Calculado)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: SOJ-2026-X12"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  className="block w-full px-3 py-2 text-xs border border-[#151f33] rounded-lg bg-[#0a0f1d] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Processo Correspondente
                </label>
                <select
                  value={processo}
                  onChange={(e) => setProcesso(e.target.value)}
                  className="block w-full py-2 px-2.5 text-xs border border-[#151f33] rounded-lg bg-[#0a0f1d] text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Recebimento">Recebimento</option>
                  <option value="Secagem">Secagem</option>
                  <option value="Limpeza">Limpeza</option>
                  <option value="Beneficiamento">Beneficiamento</option>
                  <option value="Tratamento">Tratamento</option>
                  <option value="Ensaque">Ensaque (Fechamento)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Quantidade Ensacada (Em sacarias de sementes / scs)
                </label>
                <input
                  type="number"
                  required
                  placeholder="EX: 1250"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="block w-full px-3 py-2 text-xs border border-[#151f33] rounded-lg bg-[#0a0f1d] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  UBS Alocada
                </label>
                <select
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                  className="block w-full py-2 px-2.5 text-xs border border-[#151f33] rounded-lg bg-[#0a0f1d] text-slate-105 cursor-pointer focus:outline-none focus:ring-2"
                >
                  {ubsList.map(u => (
                    <option key={u.id} value={u.nome} className="bg-[#0a0f1d] text-slate-100">{u.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-semibold bg-[#1565C0] hover:bg-[#1565C0]/85 text-white rounded-lg shadow-md transition-all cursor-pointer h-10 flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                <span>Salvar Registro de Sacaria</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER SEARCH LIST OVERVIEW */}
      <div className="bg-[#070a13] rounded-xl shadow-2xl border border-[#151f33] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Loteamentos de Sementes Consolidados
          </h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por cultivar, lote, processo ou UBS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 text-xs border border-[#151f33] rounded-lg bg-[#0a0f1d] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* DATA TABLE LIMIT */}
        <div className="overflow-x-auto text-slate-200 text-xs">
          <table className="w-full text-left">
            <thead className="bg-[#0f172a] text-white uppercase text-[10px] font-mono tracking-wider rounded-lg">
              <tr>
                <th className="px-6 py-3.5 rounded-l-lg">Código do Lote</th>
                <th className="px-6 py-3.5">Cultura</th>
                <th className="px-6 py-3.5">Cultivar Comercial</th>
                <th className="px-6 py-3.5">Sacos Beneficiados</th>
                <th className="px-6 py-3.5">Etapa do Processo</th>
                <th className="px-6 py-3.5">Filial UBS</th>
                <th className="px-6 py-3.5">Operador Painel</th>
                <th className="px-6 py-3.5 rounded-r-lg text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151f33]">
              {loading ? (
                <tr>
                   <td colSpan={8} className="text-center py-10 text-slate-500 font-mono">
                     Carregando fichas de sementes ensacadas...
                   </td>
                </tr>
              ) : filteredProductions.length > 0 ? (
                filteredProductions.map(p => (
                  <tr key={p.id} className="hover:bg-[#121c32] transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-[#4fc3f7] text-sm">{p.lote}</td>
                    <td className="px-6 py-4 font-semibold text-slate-100">{p.material}</td>
                    <td className="px-6 py-4 font-medium text-slate-350 italic">{p.cultivar}</td>
                    <td className="px-6 py-4 font-mono font-extrabold text-[#00C853] text-sm bg-[#0a0f1d]/50">
                      {p.quantidade.toLocaleString("pt-BR")} scs
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#0a0f1d] text-slate-200 border border-[#151f33]">
                        {p.processo}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#90caf9]">{p.ubs}</td>
                    <td className="px-6 py-4 text-slate-400 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.operador}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canDelete ? (
                        <button
                          onClick={() => handleDeleteProduction(p.id)}
                          className="p-1 px-2 text-rose-500 hover:text-white hover:bg-rose-600 rounded transition-colors text-[10px] uppercase font-mono cursor-pointer"
                          title="Excluir Lote"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">Trancado</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 font-mono">
                    Nenhum lançamento de semente beneficiada encontrado.
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
