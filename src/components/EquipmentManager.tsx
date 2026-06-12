import { useState, useEffect, FormEvent } from "react";
import { Equipment, Ubs, StopRecord } from "../types";
import { 
  Wrench, 
  Plus, 
  Search, 
  Settings, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Power, 
  Activity, 
  Clock, 
  Building2, 
  ArrowRight, 
  Sparkles, 
  ShieldAlert, 
  Check, 
  X,
  Trash2,
  Archive,
  Info
} from "lucide-react";

interface EquipmentManagerProps {
  userRole: string;
  onRefresh?: () => void;
}

export default function EquipmentManager({ userRole, onRefresh }: EquipmentManagerProps) {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [stops, setStops] = useState<StopRecord[]>([]);
  const [ubsList, setUbsList] = useState<Ubs[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProcessFilter, setSelectedProcessFilter] = useState("Todos");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("Todos"); // Todos, Ativos, Parados, Manutencao, Arquivados
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create Form states
  const [nome, setNome] = useState("");
  const [processo, setProcesso] = useState("Limpeza");
  const [setor, setSetor] = useState("");
  const [unidade, setUnidade] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [modelo, setModelo] = useState("");
  const [status, setStatus] = useState<"Ativo" | "Inativo" | "Manutenção">("Ativo");
  
  // New Editable fields
  const [codigoInterno, setCodigoInterno] = useState("");
  const [criticidade, setCriticidade] = useState<"Baixa" | "Média" | "Alta" | "Crítica">("Média");
  const [observacoes, setObservacoes] = useState("");
  
  const [showAddForm, setShowAddForm] = useState(false);

  // Diagnostic Drawer state
  const [selectedDiagnosticEq, setSelectedDiagnosticEq] = useState<Equipment | null>(null);

  // Edit Form states
  const [editingEq, setEditingEq] = useState<Equipment | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editProcesso, setEditProcesso] = useState("Limpeza");
  const [editSetor, setEditSetor] = useState("");
  const [editUnidade, setEditUnidade] = useState("");
  const [editFabricante, setEditFabricante] = useState("");
  const [editModelo, setEditModelo] = useState("");
  const [editStatus, setEditStatus] = useState<"Ativo" | "Inativo" | "Manutenção" | "Arquivado">("Ativo");
  const [editCodigoInterno, setEditCodigoInterno] = useState("");
  const [editCriticidade, setEditCriticidade] = useState<"Baixa" | "Média" | "Alta" | "Crítica">("Média");
  const [editObservacoes, setEditObservacoes] = useState("");

  // Custom Archiving Modal Confirmation State
  const [eqToArchive, setEqToArchive] = useState<Equipment | null>(null);

  // View toggle for Active vs Archived
  const [viewTab, setViewTab] = useState<"ativos" | "arquivados">("ativos");

  // Auth check: Coordinators and Managers can write
  const canWrite = ["Administrador", "Supervisor", "Coordenador", "Líder"].includes(userRole);

  const loadData = async () => {
    setLoading(true);
    try {
      const authHeader = { "Authorization": `Bearer ${localStorage.getItem("ubs_token")}` };
      
      // Fetch Equipments
      const eqRes = await fetch("/api/equipments", { headers: authHeader });
      const eqData = await eqRes.json();
      setEquipments(eqData);

      // Fetch Stops
      const stopsRes = await fetch("/api/stops", { headers: authHeader });
      const stopsData = await stopsRes.json();
      setStops(stopsData);

      // Fetch UBSs
      const ubsRes = await fetch("/api/ubs", { headers: authHeader });
      const ubsData = await ubsRes.json();
      setUbsList(ubsData);
      
      if (ubsData.length > 0 && !unidade) {
        setUnidade(ubsData[0].nome);
      }
    } catch (err: any) {
      console.error(err);
      setError("Incapaz de carregar cadastro de maquinários.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateEquipment = async (e: FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setError("");
    setSuccess("");

    if (!nome || !processo || !setor || !unidade) {
      setError("Nome, Processo, Setor e Unidade são de lançamento mandatório.");
      return;
    }

    try {
      const generatedCode = codigoInterno || `COD-${Date.now().toString().slice(-4)}`;
      const res = await fetch("/api/equipments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
        },
        body: JSON.stringify({ 
          nome, 
          processo, 
          setor, 
          unidade, 
          fabricante, 
          modelo, 
          status,
          criticidade,
          observacoes,
          codigoInterno: generatedCode
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ocorreu uma falha no salvamento.");

      setSuccess(`Equipamento ${nome} comissionado com sucesso.`);
      setNome("");
      setSetor("");
      setFabricante("");
      setModelo("");
      setCodigoInterno("");
      setObservacoes("");
      setCriticidade("Média");
      setStatus("Ativo");
      setShowAddForm(false);
      loadData();
      onRefresh?.();
    } catch (err: any) {
      setError(err.message || "Erro operacional no cadastro do maquinário.");
    }
  };

  const handleUpdateEquipment = async (e: FormEvent) => {
    e.preventDefault();
    if (!canWrite || !editingEq) return;
    setError("");
    setSuccess("");

    if (!editNome || !editProcesso || !editSetor || !editUnidade) {
      setError("Nome, Processo, Setor e Unidade são de preenchimento obrigatório.");
      return;
    }

    try {
      const res = await fetch(`/api/equipments/${editingEq.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
        },
        body: JSON.stringify({
          nome: editNome,
          processo: editProcesso,
          setor: editSetor,
          unidade: editUnidade,
          fabricante: editFabricante,
          modelo: editModelo,
          status: editStatus,
          criticidade: editCriticidade,
          observacoes: editObservacoes,
          codigoInterno: editCodigoInterno
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ocorreu uma falha na alteração.");

      setSuccess(`Equipamento ${editNome} alterado com sucesso.`);
      setEditingEq(null);
      loadData();
      onRefresh?.();
    } catch (err: any) {
      setError(err.message || "Erro operacional ao editar o maquinário.");
    }
  };

  const handleArchiveSubmit = async (eq: Equipment) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/equipments/${eq.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ocorreu uma falha ao arquivar.");

      setSuccess(`Equipamento "${eq.nome}" excluído e arquivado com sucesso. Histórico de paradas e indicadores integralmente preservado.`);
      setEqToArchive(null);
      loadData();
      onRefresh?.();
    } catch (err: any) {
      setError(err.message || "Erro ao tentar arquivar o maquinário.");
    }
  };

  // Process mapping with unique telemetry seed attributes
  const getTelemetryData = (eq: Equipment, activeStop: any) => {
    const charCodeSum = eq.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    if (activeStop) {
      return {
        temperature: 55 + (charCodeSum % 25),
        vibration: "Crítica ⚠️",
        rpm: 0,
        efficiencyPct: 0,
        operatingLabel: "DOWNTIME ATIVO"
      };
    }

    if (eq.status === "Manutenção") {
      return {
        temperature: 24,
        vibration: "Inoperante 🛠️",
        rpm: 0,
        efficiencyPct: 15,
        operatingLabel: "MANUTENÇÃO"
      };
    }

    if (eq.status === "Inativo" || eq.status === "Arquivado") {
      return {
        temperature: 20,
        vibration: "Inoperante 🛑",
        rpm: 0,
        efficiencyPct: 0,
        operatingLabel: "INATIVO"
      };
    }

    return {
      temperature: 32 + (charCodeSum % 14), 
      vibration: "Nominal ✅",
      rpm: 1200 + (charCodeSum % 600), 
      efficiencyPct: 82 + (charCodeSum % 17), 
      operatingLabel: "EM OPERAÇÃO"
    };
  };

  // Compile active stop records dynamically with equipments
  const enrichedEquipments = equipments.map(eq => {
    const activeStop = stops.find(s => s.equipamentoId === eq.id && !s.dataFim);
    const telemetry = getTelemetryData(eq, activeStop);
    return {
      ...eq,
      activeStop,
      telemetry
    };
  });

  // Calculate statistics counts (ignoring archived)
  const activePlantEquipments = enrichedEquipments.filter(e => e.status !== "Arquivado");
  const totalCount = activePlantEquipments.length;
  const runningCount = activePlantEquipments.filter(e => !e.activeStop && e.status === "Ativo").length;
  const stoppedCount = activePlantEquipments.filter(e => e.activeStop).length;
  const maintenanceCount = activePlantEquipments.filter(e => e.status === "Manutenção" && !e.activeStop).length;

  const archivedCount = enrichedEquipments.filter(e => e.status === "Arquivado").length;

  // Filter machines based on filters and tab choice (Active vs Archived)
  const filteredEquipments = enrichedEquipments.filter(eq => {
    // Filter by Tab
    if (viewTab === "ativos" && eq.status === "Arquivado") return false;
    if (viewTab === "arquivados" && eq.status !== "Arquivado") return false;

    const matchesSearch = 
      eq.nome.toLowerCase().includes(search.toLowerCase()) ||
      eq.processo.toLowerCase().includes(search.toLowerCase()) ||
      (eq.fabricante && eq.fabricante.toLowerCase().includes(search.toLowerCase())) ||
      eq.unidade.toLowerCase().includes(search.toLowerCase()) ||
      (eq.codigoInterno && eq.codigoInterno.toLowerCase().includes(search.toLowerCase())) ||
      eq.setor.toLowerCase().includes(search.toLowerCase());

    const matchesProcess = selectedProcessFilter === "Todos" || eq.processo === selectedProcessFilter;
    
    let matchesStatus = true;
    if (selectedStatusFilter === "Ativos") {
      matchesStatus = !eq.activeStop && eq.status === "Ativo";
    } else if (selectedStatusFilter === "Parados") {
      matchesStatus = !!eq.activeStop;
    } else if (selectedStatusFilter === "Manutencao") {
      matchesStatus = eq.status === "Manutenção" && !eq.activeStop;
    }

    return matchesSearch && matchesProcess && matchesStatus;
  });

  return (
    <div className="space-y-6" id="equipment_telemetry_hub">
      {/* Title Header Area - Modern Industrial Theme */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center p-1 gap-4 border-b border-[#151f33] pb-5">
        <div>
          <span className="text-[10px] bg-blue-950/40 text-blue-300 border border-blue-900/40 font-bold tracking-widest px-2.5 py-1 rounded-full uppercase font-mono">
            Painel de Ativos Tecnológicos • Módulo Coordenação
          </span>
          <h1 className="text-3xl font-extrabold text-slate-100 mt-1 flex items-center gap-2">
            <Wrench className="w-8 h-8 text-[#1565C0]" />
            Gerenciamento de Equipamentos & Ativos
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
            Controle on-line de operabilidade, criticidade de parada e descarte com salvamento histórico
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canWrite && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-[#1565C0] hover:bg-[#1565C0]/85 text-white rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Equipamento</span>
            </button>
          )}
        </div>
      </div>

      {/* Segment Tab Selector (Active Silos vs Archived Equipment) */}
      <div className="flex bg-[#070a13] rounded-xl p-1 max-w-md border border-[#151f33]">
        <button
          onClick={() => { setViewTab("ativos"); setSelectedStatusFilter("Todos"); }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer
            ${viewTab === "ativos" ? "bg-[#1565C0] text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
        >
          <span className="w-2 h-2 rounded-full bg-[#00C853]" />
          <span>Equipamentos da Planta ({totalCount})</span>
        </button>
        <button
          onClick={() => { setViewTab("arquivados"); setSelectedStatusFilter("Todos"); }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer
            ${viewTab === "arquivados" ? "bg-[#1565C0] text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
        >
          <Archive className="w-3.5 h-3.5 text-slate-400" />
          <span>Equipamentos Arquivados ({archivedCount})</span>
        </button>
      </div>

      {/* TELEMETRY STATS PANEL (Only shown when viewing active equipments) */}
      {viewTab === "ativos" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="telemetry_desk_stats">
          {/* TOTAL */}
          <div className="bg-[#0a0f1d] rounded-xl shadow-2xl border border-[#151f33] p-5 flex flex-col justify-between hover:scale-[1.01] transition-all">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Ativos Ativos</span>
                <span className="text-3xl font-black text-slate-100 mt-1 block tracking-tight">{totalCount} maquinários</span>
              </div>
              <div className="p-2.5 bg-[#070a13] text-slate-100 rounded-lg border border-[#151f33]">
                <Wrench className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#151f33] flex justify-between items-center text-[10px]">
              <span className="text-slate-400 font-mono">INTEGRAÇÃO DE PROJETOS</span>
              <span className="text-blue-400 font-bold">{ubsList.length} filiais em operação</span>
            </div>
          </div>

          {/* ACTIVE GO */}
          <div className="bg-[#0a0f1d] rounded-xl shadow-2xl border border-[#151f33] p-5 flex flex-col justify-between hover:scale-[1.01] transition-all">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-[#00C853] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00C853] animate-ping" />
                  Ativos em Funcionamento
                </span>
                <span className="text-3xl font-black text-[#00C853] mt-1 block tracking-tight">{runningCount} operando</span>
              </div>
              <div className="p-2.5 bg-emerald-950/40 text-[#00C853] rounded-lg border border-emerald-900/30">
                <Power className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#151f33] flex justify-between items-center text-[10px]">
              <span className="text-slate-400 font-mono">DISPONIBILIDADE PLANTA</span>
              <span className="text-[#00C853] font-bold">
                {totalCount > 0 ? `${Math.round((runningCount / totalCount) * 100)}% de operabilidade` : "100%"}
              </span>
            </div>
          </div>

          {/* PARADOS */}
          <div className={`rounded-xl shadow-2xl border p-5 flex flex-col justify-between hover:scale-[1.01] transition-all
            ${stoppedCount > 0 ? "bg-rose-950/30 border-[#ff1744] text-[#ffdddd]" : "bg-[#0a0f1d] border-[#151f33]"}`}>
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5
                  ${stoppedCount > 0 ? "text-[#ff1744]" : "text-slate-400"}`}
                >
                  {stoppedCount > 0 && <span className="w-2 rounded-full h-2 bg-[#ff1744] animate-pulse" />}
                  Equipamentos Parados
                </span>
                <span className={`text-3xl font-black mt-1 block tracking-tight
                  ${stoppedCount > 0 ? "text-[#ff1744]" : "text-slate-100"}`}>
                  {stoppedCount} em Parada
                </span>
              </div>
              <div className={`p-2.5 rounded-lg border ${stoppedCount > 0 ? "bg-[#ff1744]/20 text-[#ff1744] border-rose-900/40" : "bg-[#070a13] text-slate-400 border border-[#151f33]"}`}>
                <ShieldAlert className={`w-5 h-5 ${stoppedCount > 0 ? "animate-bounce" : ""}`} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#151f33] flex justify-between items-center text-[10px]">
              <span className="text-slate-400 font-mono">DOWNTIMES REGISTRADOS</span>
              <span className={`font-bold ${stoppedCount > 0 ? "text-[#ff1744] animate-pulse" : "text-slate-500"}`}>
                {stoppedCount > 0 ? "⚠️ REQUER INTERVENÇÃO" : "Nenhum Ativo Parado"}
              </span>
            </div>
          </div>

          {/* MANUTENÇÃO */}
          <div className="bg-[#0a0f1d] rounded-xl shadow-2xl border border-[#151f33] p-5 flex flex-col justify-between hover:scale-[1.01] transition-all">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-[#FF6D00] uppercase tracking-wider">Em Manutenção Programada</span>
                <span className="text-3xl font-black text-[#FF6D00] mt-1 block tracking-tight">{maintenanceCount} parados</span>
              </div>
              <div className="p-2.5 bg-amber-955/30 text-[#FF6D00] rounded-lg border border-amber-900/30">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#151f33] flex justify-between items-center text-[10px]">
              <span className="text-slate-400 font-mono">PROGRAMA PREVENTIVO</span>
              <span className="text-[#FF6D00] font-bold">Intervenção Técnica</span>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM FEEDBACKS */}
      {error && (
        <div className="p-4 bg-rose-950/40 border-l-4 border-[#ff1744] text-rose-200 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-[#ff1744] shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-950/40 border-l-4 border-[#00C853] text-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#00C853] shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* CONFIRM ARCHIVE DIALOG */}
      {eqToArchive && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-100">
            <div className="w-12 h-12 rounded-full bg-rose-950/40 border border-rose-900/40 flex items-center justify-center text-[#ff1744]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-100">Mover para Equipamentos Arquivados?</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Você solicitou a exclusão do equipamento <strong className="text-[#ff1744] font-mono">"{eqToArchive.nome}"</strong>. Conforme as regras da cooperativa, exibições diretas serão desabilitadas, mas:
              </p>
              <ul className="list-disc pl-4 mt-2 text-xs text-slate-400 space-y-1.5 font-mono">
                <li>O histórico completo de paradas será preservado.</li>
                <li>Gerações de OEE e relatórios retroativos serão mantidos.</li>
                <li>Indicadores antigos de processamento continuarão gravados.</li>
              </ul>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setEqToArchive(null)}
                className="flex-1 py-2 text-xs font-bold border border-[#151f33] text-slate-300 hover:bg-[#121c32] rounded-lg cursor-pointer"
              >
                Cancelar Exclusão
              </button>
              <button
                onClick={() => handleArchiveSubmit(eqToArchive)}
                className="flex-1 py-2 text-xs font-bold bg-[#ff1744] hover:bg-[#ff1744]/80 text-white rounded-lg shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar & Arquivar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD EQUIPMENT FORM PANEL */}
      {showAddForm && canWrite && (
        <div className="bg-[#0a0f1d] rounded-2xl shadow-xl border border-[#151f33] p-6 animate-fade-in" id="add_equipment_panel">
          <div className="flex justify-between items-center mb-4 border-b border-[#151f33] pb-3">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#1565C0] animate-pulse" />
              Inserir Novo Equipamento & Ativar na Planta
            </h2>
            <button 
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-200 rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleCreateEquipment} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end text-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nome do Maquinário
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Elevador de Canecas 2"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="block w-full px-3 py-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0] focus:bg-[#070a13]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Código Interno (ID)
              </label>
              <input
                type="text"
                placeholder="Ex: ELEV-02"
                value={codigoInterno}
                onChange={(e) => setCodigoInterno(e.target.value)}
                className="block w-full px-3 py-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0] focus:bg-[#070a13] font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Unidade Base UBS
              </label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="block w-full py-2 px-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer"
              >
                {ubsList.map(u => (
                  <option key={u.id} value={u.nome} className="bg-[#0a0f1d] text-slate-100">{u.nome} ({u.cidade})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Processo Alocado
              </label>
              <select
                value={processo}
                onChange={(e) => setProcesso(e.target.value)}
                className="block w-full py-2 px-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer"
              >
                <option value="Recebimento" className="bg-[#0a0f1d] text-slate-100">Recebimento</option>
                <option value="Secagem" className="bg-[#0a0f1d] text-slate-100">Secagem</option>
                <option value="Limpeza" className="bg-[#0a0f1d] text-slate-100">Limpeza</option>
                <option value="Beneficiamento" className="bg-[#0a0f1d] text-slate-100">Beneficiamento</option>
                <option value="Tratamento" className="bg-[#0a0f1d] text-slate-100">Tratamento (TSI)</option>
                <option value="Ensaque" className="bg-[#0a0f1d] text-slate-100">Ensaque (Expedição)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Criticidade de Parada
              </label>
              <select
                value={criticidade}
                onChange={(e) => setCriticidade(e.target.value as any)}
                className="block w-full py-2 px-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer font-bold"
              >
                <option value="Baixa" className="bg-[#0a0f1d] text-slate-100">Low/Baixa</option>
                <option value="Média" className="bg-[#0a0f1d] text-slate-100">Medium/Média</option>
                <option value="Alta" className="bg-[#0a0f1d] text-slate-100">High/Alta</option>
                <option value="Crítica" className="bg-[#0a0f1d] text-slate-150">🚨 Crítica (Para Silo)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Setor Físico (Localização)
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Pavilhão Sul B"
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                className="block w-full px-3 py-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-[#1565C0] focus:outline-none focus:ring-2 focus:ring-[#1565C0] focus:bg-[#070a13]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Fabricante
              </label>
              <input
                type="text"
                placeholder="Ex: Kepler Weber"
                value={fabricante}
                onChange={(e) => setFabricante(e.target.value)}
                className="block w-full px-3 py-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-[#1565C0] focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Modelo Código
              </label>
              <input
                type="text"
                placeholder="Ex: MOD-KW50"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="block w-full px-3 py-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0] font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Estado Operacional Inicial
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="block w-full py-2 px-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer"
              >
                <option value="Ativo" className="bg-[#0a0f1d] text-slate-100">🟢 Ativo (Operável)</option>
                <option value="Inativo" className="bg-[#0a0f1d] text-slate-100">🔴 Inativo (Bloqueado)</option>
                <option value="Manutenção" className="bg-[#0a0f1d] text-slate-100">🛠️ Manutenção Preventiva</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Anotações e Observações Técnicas
              </label>
              <input
                type="text"
                placeholder="Ex: Necessita regulagem de correia a cada 100 horas operativas."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="block w-full px-3 py-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full px-4 py-2 text-xs font-bold bg-[#1565C0] hover:bg-[#1565C0]/85 text-white rounded-lg transition-all h-9 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Salvar & Ativar</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT EQUIPMENT PANEL */}
      {editingEq && canWrite && (
        <div className="bg-[#0a0f1d] rounded-2xl shadow-xl border border-[#151f33] p-6 animate-fade-in" id="edit_equipment_panel">
          <div className="flex justify-between items-center mb-4 border-b border-[#151f33] pb-3">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#1565C0]" />
              Editar Equipamento: {editingEq.nome} (Código: {editingEq.id})
            </h2>
            <button 
              onClick={() => setEditingEq(null)}
              className="text-slate-400 hover:text-slate-200 rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleUpdateEquipment} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end text-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nome do Maquinário
              </label>
              <input
                type="text"
                required
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="block w-full px-3 py-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Código Interno (ID)
              </label>
              <input
                type="text"
                value={editCodigoInterno}
                onChange={(e) => setEditCodigoInterno(e.target.value)}
                className="block w-full px-3 py-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Unidade Base UBS
              </label>
              <select
                value={editUnidade}
                onChange={(e) => setEditUnidade(e.target.value)}
                className="block w-full py-2 px-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer font-bold animate-fade-in"
              >
                {ubsList.map(u => (
                  <option key={u.id} value={u.nome} className="bg-[#0a0f1d] text-slate-100">{u.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Processo Alocado
              </label>
              <select
                value={editProcesso}
                onChange={(e) => setEditProcesso(e.target.value)}
                className="block w-full py-2 px-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer"
              >
                <option value="Recebimento" className="bg-[#0a0f1d] text-slate-100">Recebimento</option>
                <option value="Secagem" className="bg-[#0a0f1d] text-slate-100">Secagem</option>
                <option value="Limpeza" className="bg-[#0a0f1d] text-slate-100">Limpeza</option>
                <option value="Beneficiamento" className="bg-[#0a0f1d] text-slate-100">Beneficiamento</option>
                <option value="Tratamento" className="bg-[#0a0f1d] text-slate-100">Tratamento</option>
                <option value="Ensaque" className="bg-[#0a0f1d] text-slate-100">Ensaque</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Criticidade do Ativo
              </label>
              <select
                value={editCriticidade}
                onChange={(e) => setEditCriticidade(e.target.value as any)}
                className="block w-full py-2 px-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer font-bold"
              >
                <option value="Baixa" className="bg-[#0a0f1d] text-slate-100">Low/Baixa</option>
                <option value="Média" className="bg-[#0a0f1d] text-slate-100">Medium/Média</option>
                <option value="Alta" className="bg-[#0a0f1d] text-slate-100">High/Alta</option>
                <option value="Crítica" className="bg-[#0a0f1d] text-slate-100">🚨 Crítica (Para Planta)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Setor Físico (Localização)
              </label>
              <input
                type="text"
                required
                value={editSetor}
                onChange={(e) => setEditSetor(e.target.value)}
                className="block w-full px-3 py-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Fabricante
              </label>
              <input
                type="text"
                value={editFabricante}
                onChange={(e) => setEditFabricante(e.target.value)}
                className="block w-full px-3 py-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Modelo Código
              </label>
              <input
                type="text"
                value={editModelo}
                onChange={(e) => setEditModelo(e.target.value)}
                className="block w-full px-3 py-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Estado Operacional
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="block w-full py-2 px-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer font-bold"
              >
                <option value="Ativo" className="bg-[#0a0f1d] text-slate-100">🟢 Ativo (Operável)</option>
                <option value="Inativo" className="bg-[#0a0f1d] text-slate-100">🔴 Inativo (Parado)</option>
                <option value="Manutenção" className="bg-[#0a0f1d] text-slate-100">🛠️ Manutenção Preventiva</option>
                <option value="Arquivado" className="bg-[#0a0f1d] text-slate-100">📁 Arquivado (Excluído)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Observações Técnicas e de Operação
              </label>
              <input
                type="text"
                value={editObservacoes}
                onChange={(e) => setEditObservacoes(e.target.value)}
                className="block w-full px-3 py-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-xs font-bold bg-[#1565C0] hover:bg-[#1565C0]/85 text-white rounded-lg transition-all h-9 flex items-center justify-center gap-1 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Salvar</span>
              </button>
              <button
                type="button"
                onClick={() => setEqToArchive(editingEq)}
                className="px-3 py-2 text-xs font-bold bg-[#ff1744] hover:bg-[#ff1744]/80 text-white rounded-lg transition-all h-9 flex items-center justify-center gap-1 cursor-pointer shadow-md"
                title="Deletar/Arquivar Equipamento"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SEARCH AND FILTERS PANEL */}
      <div className="bg-[#0a0f1d] rounded-xl shadow-2xl border border-[#151f33] p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, setor, fabricante, código ou UBS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 text-xs bg-[#070a13] border border-[#151f33] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0] focus:bg-[#070a13] transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Process Filter */}
            <div className="flex items-center gap-1 bg-[#070a13] border border-[#151f33] py-1 px-2 rounded-lg text-xs">
              <span className="text-[10px] text-slate-400 font-bold font-mono">PROCESSO:</span>
              <select
                value={selectedProcessFilter}
                onChange={(e) => setSelectedProcessFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="Todos" className="bg-[#0a0f1d] text-slate-100">Todos</option>
                <option value="Recebimento" className="bg-[#0a0f1d] text-slate-100">Recebimento</option>
                <option value="Secagem" className="bg-[#0a0f1d] text-slate-100">Secagem</option>
                <option value="Limpeza" className="bg-[#0a0f1d] text-slate-100">Limpeza</option>
                <option value="Beneficiamento" className="bg-[#0a0f1d] text-slate-100">Beneficiamento</option>
                <option value="Tratamento" className="bg-[#0a0f1d] text-slate-100">Tratamento</option>
                <option value="Ensaque" className="bg-[#0a0f1d] text-slate-100">Ensaque</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-[#070a13] border border-[#151f33] py-1 px-2 rounded-lg text-xs">
              <span className="text-[10px] text-slate-400 font-bold font-mono">ESTADO:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="Todos" className="bg-[#0a0f1d] text-slate-100">Todos os Status</option>
                <option value="Ativos" className="bg-[#0a0f1d] text-slate-100">Ativos e Livres</option>
                <option value="Parados" className="bg-[#0a0f1d] text-[#ff1744]">🔴 Parados (Alerta)</option>
                <option value="Manutencao" className="bg-[#0a0f1d] text-[#FF6D00]">🛠️ Em Manutenção</option>
              </select>
            </div>
          </div>
        </div>

        {/* EQUIPMENT GRID LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipments.length > 0 ? (
            filteredEquipments.map(enrichedEq => {
              const eq = enrichedEq;
              const hasAlert = !!eq.activeStop;
              const telemetry = eq.telemetry;

              return (
                <div 
                  key={eq.id} 
                  className={`bg-[#070a13] rounded-2xl border transition-all duration-300 flex flex-col justify-between group overflow-hidden shadow-2xl hover:border-slate-700
                    ${hasAlert 
                      ? "border-red-500/50 ring-2 ring-red-500/10" 
                      : eq.status === "Manutenção" 
                      ? "border-amber-500/40" 
                      : "border-[#151f33]"}
                  `}
                >
                  {/* Colored State Bar Indicator */}
                  <div className={`h-2 transition-colors duration-300
                    ${hasAlert 
                      ? "bg-[#ff1744]" 
                      : eq.status === "Manutenção" 
                      ? "bg-[#FF6D00]" 
                      : eq.status === "Inativo"
                      ? "bg-slate-600"
                      : "bg-[#00C853]"}
                  `} />

                  <div className="p-5 flex-1 space-y-4">
                    {/* Top line ID/Badge details */}
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-mono font-bold bg-[#0a0f1d] text-slate-400 border border-[#151f33] px-2 py-0.5 rounded uppercase">
                        CÓD: {eq.codigoInterno || eq.id}
                      </span>

                      <span className={`inline-flex items-center gap-1 font-bold uppercase text-[9px] px-2.5 py-0.5 rounded-full tracking-wider border
                        ${hasAlert
                          ? "bg-rose-955/20 text-[#ff1744] border-red-500/35 animate-pulse"
                          : eq.status === "Manutenção"
                          ? "bg-amber-955/20 text-[#FF6D00] border-amber-500/35"
                          : eq.status === "Inativo"
                          ? "bg-[#0a0f1d] text-slate-400 border-[#151f33]"
                          : eq.status === "Arquivado"
                          ? "bg-[#0a0f1d] text-stone-500 border-[#151f33]"
                          : "bg-emerald-955/20 text-[#00C853] border-emerald-555/35"}
                      `}>
                        {hasAlert && <span className="w-1.5 h-1.5 rounded-full bg-[#ff1744] animate-ping" />}
                        {!hasAlert && eq.status === "Ativo" && <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />}
                        {hasAlert ? "ALERTA - PARADA ATIVA" : (eq.status === "Manutenção" ? "MANUTENÇÃO" : (eq.status === "Inativo" ? "INATIVADO" : (eq.status === "Arquivado" ? "ARQUIVADO" : "EM OPERAÇÃO")))}
                      </span>
                    </div>

                    {/* Machine Title & Location details */}
                    <div>
                      <h3 className="font-extrabold text-slate-100 group-hover:text-[#1565C0] transition-colors text-base tracking-tight truncate" title={eq.nome}>
                        {eq.nome}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-slate-400 font-mono tracking-wide uppercase font-bold">
                          {eq.processo}
                        </span>
                        <span className="text-slate-600 text-xs">•</span>
                        <span className="text-[10px] text-slate-400 font-mono truncate" title={eq.setor}>
                          Setor: {eq.setor}
                        </span>
                      </div>
                    </div>

                    {/* Criticidade Indicator & Observações quick read */}
                    <div className="grid grid-cols-2 gap-3 pt-1 text-[10px] font-mono border-t border-[#151f33] pb-1">
                      <div>
                        <span className="text-slate-400 block uppercase">Criticidade:</span>
                        <span className={`font-bold uppercase
                          ${eq.criticidade === "Crítica" ? "text-[#ff1744]" : eq.criticidade === "Alta" ? "text-[#FF6D00]" : "text-slate-400"}`}>
                          {eq.criticidade || "Média"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase">Modelo:</span>
                        <span className="font-bold text-slate-200 truncate block">{eq.modelo || "S/M"}</span>
                      </div>
                    </div>

                    {eq.observacoes && (
                      <div className="bg-[#0a0f1d] p-2 rounded text-[10px] text-slate-400 leading-snug border border-[#151f33] flex gap-1.5 items-start">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <p className="truncate-2-lines italic">"{eq.observacoes}"</p>
                      </div>
                    )}

                    {/* Dynamic Realtime Telemetry Grid */}
                    <div className="bg-[#0a0f1d] p-3.5 rounded-xl border border-[#151f33] grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div>
                        <span className="text-slate-400 block mb-0.5 uppercase tracking-tighter text-[8px] font-bold">Temp. Mancal</span>
                        <span className={`font-mono font-bold text-xs
                          ${hasAlert ? "text-[#ff1744]" : "text-slate-200"}`}>
                          {telemetry.temperature}°C
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5 uppercase tracking-tighter text-[8px] font-bold">Vibração</span>
                        <span className={`font-mono font-bold text-xs truncate block
                          ${hasAlert ? "text-[#ff1744]" : "text-slate-200"}`}>
                          {telemetry.vibration}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5 uppercase tracking-tighter text-[8px] font-bold">Eficiência</span>
                        <span className={`font-mono font-bold text-xs
                          ${hasAlert ? "text-[#ff1744]" : "text-[#00C853]"}`}>
                          {telemetry.efficiencyPct}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Card Action Footer */}
                  <div className="bg-[#0a0f1d]/65 px-5 py-3 border-t border-[#151f33] flex items-center justify-between gap-1.5 text-xs">
                    <span className="font-bold text-slate-350 font-mono text-[10px] flex items-center gap-1 shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {eq.unidade}
                    </span>

                    <div className="flex gap-1.5">
                      {canWrite && (
                        <button
                          onClick={() => {
                            setEditingEq(eq);
                            setEditNome(eq.nome);
                            setEditProcesso(eq.processo);
                            setEditSetor(eq.setor);
                            setEditUnidade(eq.unidade);
                            setEditFabricante(eq.fabricante || "");
                            setEditModelo(eq.modelo || "");
                            setEditStatus(eq.status);
                            setEditCodigoInterno(eq.codigoInterno || eq.id);
                            setEditCriticidade(eq.criticidade || "Média");
                            setEditObservacoes(eq.observacoes || "");
                            setTimeout(() => {
                              document.getElementById("edit_equipment_panel")?.scrollIntoView({ behavior: "smooth" });
                            }, 100);
                          }}
                          className="px-2.5 py-1.5 rounded font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-[#070a13] border border-[#151f33] text-slate-300 hover:bg-[#121c32] hover:text-white"
                          title="Editar Maquinário"
                        >
                          <Settings className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedDiagnosticEq(eq);
                          setTimeout(() => {
                            document.getElementById("diagnostic-drawer")?.scrollIntoView({ behavior: "smooth" });
                          }, 100);
                        }}
                        className={`px-3 py-1.5 rounded font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer ring-offset-2 hover:ring-2 transition-all
                          ${hasAlert 
                            ? "bg-[#ff1744] hover:bg-[#ff1744]/80 text-white shadow-sm ring-red-300" 
                            : "bg-[#070a13] border border-[#151f33] text-slate-300 hover:bg-[#121c32] hover:text-white"}`}
                      >
                        <span>{hasAlert ? "Ver Diagnóstico" : "Explorar"}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-[#0a0f1d] rounded-xl border border-dashed border-[#151f33] py-16 px-4 text-center">
              <Wrench className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
              <p className="text-sm font-semibold text-slate-200">Nenhum Ativo Localizado com esses parâmetros.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">Tente alterar os filtros de busca ou de categoria de status na barra de buscas e filtros acima para recarregar.</p>
            </div>
          )}
        </div>
      </div>

      {/* DIAGNOSTIC DRAWER */}
      {selectedDiagnosticEq && (
        <div 
          id="diagnostic-drawer" 
          className={`bg-slate-900 text-white rounded-2xl shadow-xl border p-6 animate-fade-in mt-6 space-y-6 scroll-mt-6
            ${selectedDiagnosticEq.activeStop ? "border-red-500/50 shadow-red-950/20" : "border-slate-800"}`}
        >
          <div className="flex justify-between items-start border-b border-slate-800 pb-4">
            <div>
              <span className={`inline-flex rounded-full text-[9px] font-bold uppercase tracking-widest px-3 py-1 mb-2 font-mono border
                ${selectedDiagnosticEq.activeStop 
                  ? "bg-rose-950/40 text-rose-400 border-rose-500/40" 
                  : "bg-emerald-950/40 text-emerald-400 border-emerald-500/40"}`}>
                TELEMETRIA LIVE • {selectedDiagnosticEq.activeStop ? "PARADA OPERACIONAL ATIVA" : "MÁQUINA EM FUNCIONAMENTO"}
              </span>
              <h2 className="text-xl font-black text-white tracking-tight">
                Inspector UBS: {selectedDiagnosticEq.nome}
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Planta: {selectedDiagnosticEq.unidade} • Local: {selectedDiagnosticEq.setor} • Processo: {selectedDiagnosticEq.processo}
              </p>
            </div>

            <button
              onClick={() => setSelectedDiagnosticEq(null)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded transition-colors text-xs font-bold uppercase tracking-wider border border-slate-700 cursor-pointer"
            >
              Fechar Diagnóstico
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Engineering Specs */}
            <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/80 space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-1.5 font-mono">
                Especificações de Engenharia
              </h3>
              
              <div className="space-y-3 text-xs">
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400 font-mono text-[10px]">CÓDIGO INTERNO:</span>
                  <span className="font-mono text-white font-bold">{selectedDiagnosticEq.codigoInterno || selectedDiagnosticEq.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400 font-mono text-[10px]">CRITICIDADE:</span>
                  <span className={`font-mono font-bold uppercase
                    ${selectedDiagnosticEq.criticidade === "Crítica" ? "text-red-500" : "text-amber-500"}`}>
                    {selectedDiagnosticEq.criticidade || "Média"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400 font-mono text-[10px]">FABRICANTE:</span>
                  <span className="text-slate-200 font-semibold">{selectedDiagnosticEq.fabricante || "Kepler Weber"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400 font-mono text-[10px]">MODELO ENGENHARIA:</span>
                  <span className="font-mono text-slate-200">{selectedDiagnosticEq.modelo || "S/M"}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400 font-mono text-[10px]">TENSÃO / CARGA:</span>
                  <span className="font-mono text-blue-400 font-bold">380V / Potência Plena</span>
                </div>
              </div>
            </div>

            {/* Real Time Diagnostics / Stop Record Details */}
            <div className="lg:col-span-2 space-y-6">
              {selectedDiagnosticEq.activeStop ? (
                <div className="bg-gradient-to-r from-red-950/30 to-rose-950/20 border border-red-500/35 rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-rose-400">
                    <ShieldAlert className="w-5 h-5 text-[#D50000] animate-pulse shrink-0" />
                    <h3 className="font-extrabold text-sm uppercase tracking-wider">
                      Ficha de Parada Ativa (Downtime Corrente)
                    </h3>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-lg space-y-3 shadow-inner">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">CATEGORIA</span>
                        <span className="text-red-400 font-bold uppercase">{selectedDiagnosticEq.activeStop.categoria}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">HORA DE INÍCIO</span>
                        <span className="text-white font-bold">{selectedDiagnosticEq.activeStop.dataInicio} às {selectedDiagnosticEq.activeStop.horaInicio}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">APONTADO POR</span>
                        <span className="text-slate-200 font-bold truncate block">{selectedDiagnosticEq.activeStop.operador}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-900 pt-3 text-xs">
                      <span className="text-[10px] text-slate-400 block mb-1 font-mono">MOTIVO DESCRITO</span>
                      <p className="text-slate-250 italic leading-relaxed text-sm bg-red-950/10 p-2.5 rounded border border-red-900/20">
                        "{selectedDiagnosticEq.activeStop.motivo}"
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-emerald-950/20 to-sky-950/20 border border-emerald-500/25 rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-pulse shrink-0" />
                    <h3 className="font-extrabold text-sm uppercase tracking-wider">
                      Ativo em Conformidade Operacional
                    </h3>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    Este maquinário industrial está reportando conformidade mecânica nominal e sem registros de falha ativa.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="bg-slate-950/30 p-3.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px] block mb-1">PROGRAMAÇÃO PREVENTIVA</span>
                      <span className="text-blue-400 font-bold text-sm">Próxima lubrificação: 15 dias</span>
                    </div>
                    <div className="bg-slate-950/30 p-3.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px] block mb-1">INSPEÇÃO ELETRÔNICA</span>
                      <span className="text-emerald-400 font-bold text-sm">Controle de Surtos: OK</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security alert block when not Admin/Coordinator */}
      {!canWrite && (
        <div className="bg-[#0a0f1d] shadow-inner rounded-xl border border-[#151f33] p-4 flex gap-3 text-slate-400 items-start">
          <Lock className="w-5 h-5 text-[#1565C0] shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold uppercase text-slate-200 tracking-wider text-[10px] font-mono">Perfil de Operador (Leitor)</p>
            <p className="mt-1 text-slate-400 leading-relaxed">
              Seu perfil operacional de turno limita a edição de cadastro de equipamentos. Contate um Administrador, Coordenador ou Supervisor se precisar de alterações estruturais na planta.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
