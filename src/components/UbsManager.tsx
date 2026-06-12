import { useState, useEffect, FormEvent } from "react";
import { Ubs } from "../types";
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  User, 
  CheckCircle2, 
  Lock, 
  AlertCircle,
  Edit,
  X,
  Target
} from "lucide-react";

interface UbsManagerProps {
  userRole: string;
}

export default function UbsManager({ userRole }: UbsManagerProps) {
  const [ubs, setUbs] = useState<Ubs[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit / Create Unified states
  const [editingUbs, setEditingUbs] = useState<Ubs | null>(null);
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [metaDiaria, setMetaDiaria] = useState(150); // Meta diária em toneladas
  const [status, setStatus] = useState<"Ativa" | "Inativa">("Ativa");
  const [showAddForm, setShowAddForm] = useState(false);

  // Check if profile has authorization (Administrators, Coordinators and Supervisors can manage)
  const canWrite = ["Administrador", "Supervisor", "Coordenador"].includes(userRole);

  const fetchUbs = () => {
    setLoading(true);
    fetch("/api/ubs", {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
      }
    })
      .then(res => res.json())
      .then(data => setUbs(data))
      .catch(err => {
        console.error(err);
        setError("Incapaz de ler registros da base de dados corporativa.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUbs();
  }, []);

  const handleOpenAddForm = () => {
    setEditingUbs(null);
    setNome("");
    setCidade("");
    setEstado("");
    setResponsavel("");
    setMetaDiaria(150);
    setStatus("Ativa");
    setShowAddForm(true);
    setError("");
    setSuccess("");
  };

  const handleOpenEditForm = (item: Ubs) => {
    setEditingUbs(item);
    setNome(item.nome);
    setCidade(item.cidade);
    setEstado(item.estado);
    setResponsavel(item.responsavel);
    setMetaDiaria(item.metaDiaria || 150);
    setStatus(item.status || "Ativa");
    setShowAddForm(true);
    setError("");
    setSuccess("");
    setTimeout(() => {
      document.getElementById("add_ubs_form_panel")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleRegisterUbs = async (e: FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setError("");
    setSuccess("");

    if (!nome || !cidade || !estado || !responsavel) {
      setError("Todos os campos de cadastro são de preenchimento obrigatório.");
      return;
    }

    try {
      const isEditing = !!editingUbs;
      const url = isEditing ? `/api/ubs/${editingUbs.id}` : "/api/ubs";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
        },
        body: JSON.stringify({ 
          nome, 
          cidade, 
          estado, 
          responsavel, 
          status,
          metaDiaria: Number(metaDiaria)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar alterações da unidade UBS.");

      setSuccess(`Unidade ${nome} ${isEditing ? "atualizada" : "cadastrada"} com sucesso!`);
      setNome("");
      setCidade("");
      setEstado("");
      setResponsavel("");
      setMetaDiaria(150);
      setStatus("Ativa");
      setEditingUbs(null);
      setShowAddForm(false);
      fetchUbs();
    } catch (err: any) {
      setError(err.message || "Erro no salvamento.");
    }
  };

  const filteredUbs = ubs.filter(item => 
    item.nome.toLowerCase().includes(search.toLowerCase()) ||
    item.cidade.toLowerCase().includes(search.toLowerCase()) ||
    item.responsavel.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" id="ubs_management_view">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-1 gap-4 border-b border-[#151f33] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Building2 className="w-8 h-8 text-[#1565C0]" />
            Cadastro de Unidades de Beneficiamento (UBS)
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
            Gerencie filiais físicas, alocação de coordenadores técnicos, metas diárias e inativação
          </p>
        </div>

        {canWrite && (
          <button
            onClick={handleOpenAddForm}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-[#1565C0] hover:bg-[#1565C0]/85 text-white rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar UBS</span>
          </button>
        )}
      </div>

      {/* ERROR / SUCCESS ALERTS */}
      {error && (
        <div className="p-4 bg-rose-950/40 border-l-4 border-[#ff1744] text-rose-200 text-xs font-semibold rounded flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-[#ff1744]" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-950/40 border-l-4 border-[#00C853] text-emerald-200 text-xs font-semibold rounded flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#00C853]" />
          <span>{success}</span>
        </div>
      )}

      {/* FORM REGISTRATION SECTION */}
      {showAddForm && canWrite && (
        <div className="bg-[#0a0f1d] rounded-xl shadow-2xl border border-[#151f33] p-6 animate-fade-in" id="add_ubs_form_panel">
          <div className="flex justify-between items-center mb-4 border-b border-[#151f33] pb-2">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#1565C0]" />
              {editingUbs ? `Editar Configurações da UBS: ${editingUbs.nome}` : "Cadastrar Nova Unidade de Beneficiamento"}
            </h2>
            <button 
              onClick={() => { setShowAddForm(false); setEditingUbs(null); }}
              className="text-slate-400 hover:text-slate-350 rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleRegisterUbs} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end text-slate-300">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nome da Unidade
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  disabled={!!editingUbs}
                  placeholder="EX: UBS-PR"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="block w-full pl-9 pr-2 py-2 text-xs border border-[#151f33] bg-[#070a13] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0] disabled:bg-[#121c32] disabled:text-slate-500 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Cidade Sede
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Rio Verde"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="block w-full pl-9 pr-2 py-2 text-xs border border-[#151f33] bg-[#070a13] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Estado Sede (UF)
              </label>
              <input
                type="text"
                required
                maxLength={2}
                placeholder="Ex: GO"
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
                className="block w-full px-2 py-2 text-xs border border-[#151f33] bg-[#070a13] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0] text-center uppercase font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Supervisor Técnico
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Nome do Supervisor"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  className="block w-full pl-9 pr-2 py-2 text-xs border border-[#151f33] bg-[#070a13] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Meta Diária (Toneladas)
              </label>
              <div className="relative">
                <Target className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="number"
                  required
                  value={metaDiaria}
                  onChange={(e) => setMetaDiaria(Number(e.target.value))}
                  className="block w-full pl-9 pr-2 py-2 text-xs border border-[#151f33] bg-[#070a13] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Estado
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="block w-full py-2 px-2 text-xs border border-[#151f33] bg-[#070a13] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer"
                >
                  <option value="Ativa">🟢 Ativa</option>
                  <option value="Inativa">🔴 Inativa</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-16 text-xs font-bold bg-[#1565C0] hover:bg-[#1565C0]/85 border border-transparent rounded-lg shadow-md text-white focus:outline-none focus:ring-2 focus:ring-blue-650 transition-all cursor-pointer shrink-0 h-9 flex items-center justify-center"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER SEARCH AND DATA LIST */}
      <div className="bg-[#0a0f1d] rounded-xl shadow-2xl border border-[#151f33] p-5 space-y-4">
        {/* Search Header */}
        <div className="flex justify-between items-center gap-4 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-505" />
            <input
              type="text"
              placeholder="Buscar unidade por nome, cidade ou responsável..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0] transition-all"
            />
          </div>
        </div>

        {/* LIST TABLE */}
        <div className="overflow-x-auto text-slate-300 border border-[#151f33] rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#070a13] text-slate-200 uppercase text-[10px] font-mono tracking-wider border-b border-[#151f33]">
              <tr>
                <th className="px-6 py-3.5">Nome da Unidade</th>
                <th className="px-6 py-3.5">Cidade Sede</th>
                <th className="px-6 py-3.5">Estado / UF</th>
                <th className="px-6 py-3.5">Supervisor Técnico</th>
                <th className="px-6 py-3.5 text-center">Meta Operacional</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                {canWrite && <th className="px-6 py-3.5 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151f33]">
              {loading ? (
                <tr>
                  <td colSpan={canWrite ? 7 : 6} className="text-center py-10 text-slate-500 font-mono">
                    Carregando filiais cadastradas...
                  </td>
                </tr>
              ) : filteredUbs.length > 0 ? (
                filteredUbs.map(item => (
                  <tr key={item.id} className={`hover:bg-[#121c32]/50 transition-colors ${item.status === "Inativa" ? "opacity-40 bg-[#070a13]/50" : ""}`}>
                    <td className="px-6 py-4 font-bold text-blue-400 text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span className={item.status === "Inativa" ? "line-through text-slate-500" : "text-slate-100"}>{item.nome}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-350">{item.cidade}</td>
                    <td className="px-6 py-4 font-mono text-slate-400 font-bold uppercase">{item.estado}</td>
                    <td className="px-6 py-4 font-semibold text-slate-300">{item.responsavel}</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-slate-300">
                      {item.metaDiaria ? `${item.metaDiaria} t/dia` : "150 t/dia"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider
                        ${item.status === "Ativa" 
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-990/30" 
                          : "bg-rose-950/40 text-[#ff1744] border border-rose-990/30"}
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.status === "Ativa" ? "bg-[#00C853]" : "bg-[#ff1744]"}`} />
                        {item.status || "Ativa"}
                      </span>
                    </td>
                    {canWrite && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleOpenEditForm(item)}
                          className="px-2 py-1.5 text-slate-400 hover:text-[#2196F3] hover:bg-[#121c32] rounded-lg border border-transparent hover:border-[#151f33] transition-all inline-flex items-center gap-1 cursor-pointer"
                          title="Editar / Inativar UBS"
                        >
                          <Edit className="w-4 h-4" />
                          <span className="text-[10px] font-bold">Editar</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canWrite ? 7 : 6} className="text-center py-10 text-slate-500 font-mono">
                    Nenhuma unidade UBS encontrada nos critérios informados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operation restrictions note */}
      {!canWrite && (
        <div className="bg-[#0a0f1d] shadow-inner rounded-xl border border-[#151f33] p-4 flex gap-3 text-slate-500 items-start">
          <Lock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold uppercase text-slate-300 tracking-wider">Apenas Visualização Ativa</p>
            <p className="mt-0.5 text-slate-400">Seu nível atual de autenticação ({userRole}) permite auditar e ler registros operacionais, mas impede ordenar novas configurações, metas diárias ou inativar as UBS da cooperativa.</p>
          </div>
        </div>
      )}
    </div>
  );
}
