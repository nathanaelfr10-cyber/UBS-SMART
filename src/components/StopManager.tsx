import { useState, useEffect, FormEvent } from "react";
import { StopRecord, Equipment, Ubs } from "../types";
import { 
  ShieldAlert, Plus, Search, CheckCircle, Hourglass, 
  Trash2, Play, Calendar, Clock, AlertTriangle, BookOpen, User, Building, Lock
} from "lucide-react";

interface StopManagerProps {
  userRole: string;
  userName: string;
}

export default function StopManager({ userRole, userName }: StopManagerProps) {
  const [stops, setStops] = useState<StopRecord[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [ubsList, setUbsList] = useState<Ubs[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create Form states
  const [selectedUbs, setSelectedUbs] = useState("");
  const [selectedProcesso, setSelectedProcesso] = useState("Limpeza");
  const [selectedEquipamentoId, setSelectedEquipamentoId] = useState("");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split("T")[0]);
  const [horaInicio, setHoraInicio] = useState(new Date().toTimeString().split(" ")[0].substring(0, 5));
  
  const [dataFim, setDataFim] = useState("");
  const [horaFim, setHoraFim] = useState("");
  
  const [motivo, setMotivo] = useState("");
  const [categoria, setCategoria] = useState<StopRecord["categoria"]>("Mecânica");
  const [observacao, setObservacao] = useState("");
  const [impactouProducao, setImpactouProducao] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Finalize Overlay states
  const [finalizingStopId, setFinalizingStopId] = useState<string | null>(null);
  const [finalizeDataFim, setFinalizeDataFim] = useState(new Date().toISOString().split("T")[0]);
  const [finalizeHoraFim, setFinalizeHoraFim] = useState(new Date().toTimeString().split(" ")[0].substring(0, 5));
  const [finalizeObservacao, setFinalizeObservacao] = useState("");

  const canDelete = ["Administrador", "Supervisor"].includes(userRole);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const authHeader = { "Authorization": `Bearer ${localStorage.getItem("ubs_token")}` };
      
      const stopsRes = await fetch("/api/stops", { headers: authHeader });
      const stopsData = await stopsRes.json();
      setStops(stopsData);

      const eqRes = await fetch("/api/equipments", { headers: authHeader });
      const eqData = await eqRes.json();
      setEquipments(eqData);

      const ubsRes = await fetch("/api/ubs", { headers: authHeader });
      const ubsData = await ubsRes.json();
      setUbsList(ubsData);

      if (ubsData.length > 0) {
        setSelectedUbs(ubsData[0].nome);
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao ler registros de paradas no barramento.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter equipment dynamically by selected UBS and Process!
  const filteredEquipmentsForForm = equipments.filter(e => 
    e.unidade === selectedUbs && e.processo === selectedProcesso && e.status !== "Arquivado"
  );

  // Set default equipment when process or ubs changes
  useEffect(() => {
    if (filteredEquipmentsForForm.length > 0) {
      setSelectedEquipamentoId(filteredEquipmentsForForm[0].id);
    } else {
      setSelectedEquipamentoId("");
    }
  }, [selectedUbs, selectedProcesso, equipments]);

  const handleCreateStop = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedUbs || !selectedProcesso || !selectedEquipamentoId || !dataInicio || !horaInicio || !motivo || !categoria) {
      setError("Por favor, selecione Unidade, Processo, Equipamento, Tempo de Início, Categoria e Detalhes da causa.");
      return;
    }

    try {
      const res = await fetch("/api/stops", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
        },
        body: JSON.stringify({
          ubs: selectedUbs,
          processo: selectedProcesso,
          equipamentoId: selectedEquipamentoId,
          dataInicio,
          horaInicio,
          dataFim: dataFim || null,
          horaFim: horaFim || null,
          motivo,
          categoria,
          observacao,
          impactouProducao
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ocorreu uma falha no registro de parada.");

      setSuccess("Ocorrência de parada lançada com sucesso no sistema.");
      setMotivo("");
      setObservacao("");
      setDataFim("");
      setHoraFim("");
      setShowAddForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Erro no salvamento.");
    }
  };

  const handleFinalizeStopSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!finalizingStopId) return;
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/stops/${finalizingStopId}/finalize`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
        },
        body: JSON.stringify({
          dataFim: finalizeDataFim,
          horaFim: finalizeHoraFim,
          observacao: finalizeObservacao
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível finalizar.");

      setSuccess("Parada finalizada e tempo produtivo recalculados com sucesso.");
      setFinalizingStopId(null);
      setFinalizeObservacao("");
      loadData();
    } catch (err: any) {
      setError(err.message || "Erro de finalização.");
    }
  };

  const handleDeleteStop = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este histórico de parada?")) return;
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/stops/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao deletar.");

      setSuccess("Instância operacional expurgada do histórico.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Falha na deleção.");
    }
  };

  // Divide records into Active (live downtime) and Closed History
  const activeStops = stops.filter(s => !s.dataFim);
  const closedStopsHistory = stops.filter(s => s.dataFim);

  const filteredHistory = closedStopsHistory.filter(s => 
    s.equipamentoNome.toLowerCase().includes(search.toLowerCase()) ||
    s.motivo.toLowerCase().includes(search.toLowerCase()) ||
    s.operador.toLowerCase().includes(search.toLowerCase()) ||
    s.ubs.toLowerCase().includes(search.toLowerCase()) ||
    s.categoria.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" id="stops_view_wrapper">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-1 gap-4 border-b border-[#151f33] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-150 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-rose-500 animate-pulse" />
            Registro & Gestão de Paradas (Downtime)
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
            Apontamento de falhas elétricas, mecânicas, limpezas e transições de cultivares
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFinalizingStopId(null);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Apontar Nova Parada</span>
        </button>
      </div>

      {/* ERROR / SUCCESS ALERTS */}
      {error && (
        <div className="p-4 bg-rose-950/20 border-l-4 border-red-500 text-rose-200 text-xs font-semibold rounded-xl flex items-center gap-2 border border-rose-900/30">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-950/20 border-l-4 border-emerald-500 text-emerald-200 text-xs font-semibold rounded-xl flex items-center gap-2 border border-emerald-900/30">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}
             {/* NEW STOP RECORDING APPOINTMENT FORM */}
      {showAddForm && (
        <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-6 animate-fade-in" id="downtime_form_panel">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4 border-b border-[#121c32] pb-2 flex items-center gap-2">
            <Play className="w-4 h-4 text-rose-500 animate-pulse" />
            Lançar Apontamento de Parada Operacional
          </h2>
          <form onSubmit={handleCreateStop} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Unidade UBS
                </label>
                <select
                  value={selectedUbs}
                  onChange={(e) => setSelectedUbs(e.target.value)}
                  className="block w-full py-2 px-2.5 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-600 cursor-pointer"
                >
                  {ubsList.map(u => (
                    <option key={u.id} value={u.nome}>{u.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Processo Afetado
                </label>
                <select
                  value={selectedProcesso}
                  onChange={(e) => setSelectedProcesso(e.target.value)}
                  className="block w-full py-2 px-2.5 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-600 cursor-pointer"
                >
                  <option value="Recebimento">Recebimento</option>
                  <option value="Secagem">Secagem</option>
                  <option value="Limpeza">Limpeza</option>
                  <option value="Beneficiamento">Beneficiamento</option>
                  <option value="Tratamento">Tratamento</option>
                  <option value="Ensaque">Ensaque</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Selecione o Equipamento
                </label>
                <select
                  value={selectedEquipamentoId}
                  onChange={(e) => setSelectedEquipamentoId(e.target.value)}
                  disabled={filteredEquipmentsForForm.length === 0}
                  className="block w-full py-2 px-2.5 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-600 disabled:bg-slate-900/50 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                >
                  {filteredEquipmentsForForm.length > 0 ? (
                    filteredEquipmentsForForm.map(e => {
                      const isStopped = activeStops.some(s => s.equipamentoId === e.id);
                      return (
                        <option key={e.id} value={e.id} className="bg-[#0a0f1d] text-slate-100">
                          {e.nome} {isStopped ? "⚠️ (Parado)" : "🟢 (em funcionamento)"}
                        </option>
                      );
                    })
                  ) : (
                    <option value="">NÃO HÁ MÁQUINAS CADASTRADAS NESTE PROCESSO/UBS</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Categoria da Parada
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as any)}
                  className="block w-full py-2 px-2.5 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-600 cursor-pointer"
                >
                  <option value="Mecânica">Mecânica (Manutenção)</option>
                  <option value="Elétrica">Elétrica (Painéis/Sensores)</option>
                  <option value="Operacional">Operacional (Ajustes)</option>
                  <option value="Processo">Processo (Paragem)</option>
                  <option value="Limpeza">Limpeza de Máquinas</option>
                  <option value="Troca de cultivar">Troca de Cultivar (Lote)</option>
                  <option value="Logística">Logística (Abastecimento)</option>
                  <option value="Programada">Manutenção Programada</option>
                  <option value="Outros">Outras Causas</option>
                </select>
              </div>
            </div>

            <div className="bg-[#121c32]/50 border border-[#151f33] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider">A parada interrompeu o beneficiamento?</h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Se marcado como SIM, ela reduzirá as horas produtivas gerais e a eficiência OEE da UBS.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setImpactouProducao(true)}
                  className={`px-5 py-2.5 text-xs font-black rounded-lg transition-all border cursor-pointer min-h-[44px] ${impactouProducao ? "bg-red-650 text-white border-transparent shadow" : "bg-[#070a13] text-slate-300 border-[#151f33] hover:bg-[#121c32]"}`}
                >
                  ✅ SIM, Teve Impacto
                </button>
                <button
                  type="button"
                  onClick={() => setImpactouProducao(false)}
                  className={`px-5 py-2.5 text-xs font-black rounded-lg transition-all border cursor-pointer min-h-[44px] ${!impactouProducao ? "bg-emerald-600 text-white border-transparent shadow" : "bg-[#070a13] text-slate-300 border-[#151f33] hover:bg-[#121c32]"}`}
                >
                  ❌ NÃO, Sem Impacto
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Data de Início
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="block w-full pl-9 pr-2 py-2 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Hora de Início
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="time"
                    required
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="block w-full pl-9 pr-2 py-2 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Data Fim (Opcional - se finalizada)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="block w-full pl-9 pr-2 py-2 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Hora Fim (Opcional - se finalizada)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="time"
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className="block w-full pl-9 pr-2 py-2 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-600 font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Motivos & Sintomas da Falha (Pelo menos 10 caracteres)
              </label>
              <input
                type="text"
                required
                minLength={10}
                placeholder="Exemplo: Vibração anômala e ruído metálico excessivo no rolamento superior da esteira transportadora."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="block w-full px-3 py-2 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-100 placeholder-slate-505 focus:outline-none focus:ring-2 focus:ring-rose-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Observações de Operação / Ação Corretiva Planejada (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Detalhes adicionais do reparo ou contato com manutenção preditiva externa..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="block w-full px-3 py-2 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-100 placeholder-slate-505 focus:outline-none focus:ring-2 focus:ring-rose-600 resize-none font-sans"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={filteredEquipmentsForForm.length === 0}
                className="w-full sm:w-auto px-8 min-h-[56px] text-sm font-black bg-rose-600 hover:bg-rose-500 disabled:bg-[#121c32]/50 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-3 border-2 border-rose-500/30"
              >
                <ShieldAlert className="w-5 h-5 animate-pulse text-white" />
                <span>🔴 REGISTRAR PARADA (DOWNTIME)</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FINALIZE MODAL APPOINTMENT WIDGET */}
      {finalizingStopId && (
        <div className="bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800 p-6 animate-fade-in space-y-4" id="finalize_stop_panel">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin-slow" />
              Finalizar Downtime e Recalcular OEE da Planta
            </h2>
            <button 
              onClick={() => setFinalizingStopId(null)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer font-semibold uppercase tracking-wider border border-slate-700 px-2.5 py-1 rounded hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleFinalizeStopSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Data de Finalização
                </label>
                <input
                  type="date"
                  required
                  value={finalizeDataFim}
                  onChange={(e) => setFinalizeDataFim(e.target.value)}
                  className="block w-full py-2 px-3 text-xs bg-slate-800 border border-slate-700 text-slate-100 rounded-lg focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Hora de Finalização
                </label>
                <input
                  type="time"
                  required
                  value={finalizeHoraFim}
                  onChange={(e) => setFinalizeHoraFim(e.target.value)}
                  className="block w-full py-2 px-3 text-xs bg-slate-800 border border-slate-700 text-slate-100 rounded-lg focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Descrição da Ação Corretiva Executada pela Manutenção (Opcional)
              </label>
              <textarea
                required
                minLength={5}
                rows={2}
                placeholder="Escreva o que foi corrigido para fechar o chamado físico..."
                value={finalizeObservacao}
                onChange={(e) => setFinalizeObservacao(e.target.value)}
                className="block w-full py-2 px-3 text-xs bg-slate-800 border border-slate-700 text-slate-100 rounded-lg focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full justify-center flex items-center gap-3 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 min-h-[56px] text-sm font-black text-white transition-colors cursor-pointer shadow-lg hover:shadow-xl border-2 border-emerald-500/30"
            >
              <CheckCircle className="w-5 h-5 animate-pulse" />
              <span>🟢 LIBERAR MAQUINÁRIO & ENCERRAR PARADA</span>
            </button>
          </form>
        </div>
      )}

      {/* ACTIVE STOPS (LIVE PANEL GRID) */}
      <div className="space-y-3" id="active_downtime_section">
        <h2 className="text-xs font-extrabold text-slate-350 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
          Paradas Operacionais em Andamento ({activeStops.length})
        </h2>

        {activeStops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeStops.map(stop => (
              <div 
                key={stop.id} 
                className="bg-[#120a16]/40 border border-rose-900/40 rounded-xl p-5 shadow-sm relative overflow-hidden transition-all flex flex-col justify-between hover:border-rose-800/60"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="font-extrabold text-sm text-slate-100 tracking-tight block">
                      {stop.equipamentoNome}
                    </span>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="inline-flex rounded bg-rose-950/45 text-rose-300 text-[9px] font-black uppercase px-2 py-0.5 tracking-wider border border-rose-900/45 animate-pulse">
                        {stop.categoria}
                      </span>
                      <span className={`inline-flex rounded text-[8px] font-bold px-1.5 py-0.5 border ${stop.impactouProducao !== false ? "bg-red-950/30 border-red-900/30 text-rose-400 font-extrabold" : "bg-emerald-950/30 border-emerald-900/30 text-emerald-400"}`}>
                        {stop.impactouProducao !== false ? "⚠️ Com Impacto" : "☘️ Sem Impacto"}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-sans mt-2 line-clamp-3 leading-relaxed">
                    <strong className="text-slate-100 border-b border-dotted border-red-500">Motivo:</strong> {stop.motivo}
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-400 pt-3 mt-3 border-t border-[#1d172b]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Iniciou: {stop.dataInicio}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono text-slate-300">Hora: {stop.horaInicio}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between pt-3 border-t border-[#1d172b] text-[11px]">
                  <span className="font-semibold text-[#ef4444] flex items-center gap-1.5 font-mono">
                    <Hourglass className="w-3.5 h-3.5 animate-spin-slow text-rose-500" />
                    UB: {stop.ubs} • Op: {stop.operador}
                  </span>
                  
                  <button
                    onClick={() => {
                      setFinalizingStopId(stop.id);
                      setShowAddForm(false);
                      // Scroll to finalize panel immediately
                      document.getElementById("finalize_stop_panel")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="px-3 py-1.5 text-[10px] font-bold bg-[#ef4444] hover:bg-[#ef4444]/80 text-white rounded shadow-sm border border-transparent cursor-pointer transition-colors"
                  >
                    Finalizar Parada
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#070a13] rounded-xl border border-dotted border-[#151f33] p-8 text-center text-xs text-slate-400 font-mono">
            NENHUM MAQUINÁRIO REGISTRADO EM PARADA ATIVA. ESTA PLANTA ESTÁ OPERANDO EM CONFORMIDADE DE OEE!
          </div>
        )}
      </div>

      {/* CLOSED STOPS HISTORY LIST */}
      <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Histórico Operacional de Paradas Encerradas
          </h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Pesquisar por equipamento ou operador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-100 placeholder-slate-505 focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
            />
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="overflow-x-auto text-slate-100 bg-[#070a13] rounded-lg border border-[#151f33]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#121c32] text-slate-100 uppercase text-[10px] font-mono tracking-wider rounded-t-lg">
              <tr>
                <th className="px-5 py-3.5 rounded-l-lg">Ativo Afetado</th>
                <th className="px-5 py-3.5">UBS</th>
                <th className="px-5 py-3.5">Categoria</th>
                <th className="px-5 py-3.5">Impactou Produção?</th>
                <th className="px-5 py-3.5">Período de Paragem</th>
                <th className="px-5 py-3.5">Duração Final</th>
                <th className="px-5 py-3.5">Motivo / Causa Apontada</th>
                <th className="px-5 py-3.5 rounded-r-lg text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151f33]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500 font-mono">
                    Carregando histórico estrutural de paradas...
                  </td>
                </tr>
              ) : filteredHistory.length > 0 ? (
                filteredHistory.map(stop => (
                  <tr key={stop.id} className="hover:bg-[#121c32]/30 transition-colors border-b border-[#151f33]">
                    <td className="px-5 py-3.5 font-bold text-slate-100 truncate max-w-[150px]" title={stop.equipamentoNome}>
                      {stop.equipamentoNome}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#3b82f6]">{stop.ubs}</td>
                    <td className="px-5 py-3.5 font-medium">
                      <span className="inline-flex rounded px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#121c32] text-slate-300 border border-[#151f33]">
                        {stop.categoria}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold border-l border-r border-[#151f33]/30">
                      {stop.impactouProducao !== false ? (
                        <span className="text-rose-400 bg-rose-950/40 border border-rose-900/40 px-2.5 py-0.5 rounded text-[9px] uppercase font-mono">✅ Sim</span>
                      ) : (
                        <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2.5 py-0.5 rounded text-[9px] uppercase font-mono">❌ Não</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                      <div>De: {stop.dataInicio} às {stop.horaInicio}</div>
                      <div className="mt-0.5 text-emerald-400">Até: {stop.dataFim} às {stop.horaFim}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300 text-xs font-bold bg-[#121c32]/20">
                      {stop.tempoParadoMinutos >= 60 
                        ? `${(stop.tempoParadoMinutos / 60).toFixed(1)}h (${stop.tempoParadoMinutos} min)` 
                        : `${stop.tempoParadoMinutos} min`}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 max-w-sm font-sans truncate" title={stop.motivo}>
                      {stop.motivo}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {canDelete ? (
                        <button
                          onClick={() => handleDeleteStop(stop.id)}
                          className="p-1 px-2 text-rose-500 hover:text-white hover:bg-rose-600 rounded transition-colors text-[10px] uppercase font-mono cursor-pointer border border-transparent hover:border-rose-400"
                          title="Expurgar Registro"
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
                  <td colSpan={8} className="text-center py-10 text-slate-500 font-mono bg-[#070a13]">
                    Nenhum registro de parada localizada nos filtros descritos.
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
