import { useState, useEffect } from "react";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie 
} from "recharts";
import { 
  Building, 
  Calendar, 
  Cpu, 
  Hourglass, 
  AlertTriangle, 
  Wrench, 
  Layers, 
  Coins, 
  CircleDot, 
  Package, 
  Timer,
  RefreshCw,
  Clock
} from "lucide-react";
import { DashboardStats } from "../types";

const COLORS = ["#1565C0", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#14B8A6"];

export default function Dashboard() {
  const [ubsArr, setUbsArr] = useState<any[]>([]);
  const [selectedUbs, setSelectedUbs] = useState("Todas");
  const [selectedPeriodo, setSelectedPeriodo] = useState("7d");
  const [selectedProcesso, setSelectedProcesso] = useState("Todos");
  const [selectedTurno, setSelectedTurno] = useState("Todos");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch UBS list for filters
  useEffect(() => {
    fetch("/api/ubs")
      .then(res => res.json())
      .then(data => setUbsArr(data))
      .catch(err => console.error(err));
  }, []);

  // Fetch Stats on Filter change
  const fetchStats = () => {
    setLoading(true);
    setError("");
    const query = new URLSearchParams({
      ubs: selectedUbs,
      periodo: selectedPeriodo,
      processo: selectedProcesso,
      turno: selectedTurno
    }).toString();

    fetch(`/api/dashboard/stats?${query}`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
      }
    })
      .then(async res => {
        if (!res.ok) throw new Error("Erro ao obter dados consolidados do OEE.");
        return res.json();
      })
      .then(data => {
        setStats(data);
      })
      .catch(err => {
        console.error(err);
        setError("Não foi possível carregar as paradas. Verifique a sessão.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
    // Auto refresh every 50 seconds for premium industrial operation
    const interval = setInterval(fetchStats, 50000);
    return () => clearInterval(interval);
  }, [selectedUbs, selectedPeriodo, selectedProcesso, selectedTurno]);

  const handleManualRefresh = () => {
    fetchStats();
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <div className="w-12 h-12 border-4 border-[#151f33] border-t-[#1565C0] rounded-full animate-spin"></div>
        <p className="text-slate-400 font-mono mt-4 text-xs">CALCULANDO INDICADORES DE CONFIABILIDADE (MTBF & MTTR)...</p>
      </div>
    );
  }

  const kpis = stats?.contadores;

  return (
    <div className="space-y-6" id="dashboard_panel">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#151f33] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
             Painel Operacional de Produção & Eficiência
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
            Unidade de Beneficiamento de Sementes (UBS) • Indicadores Ativos em Tempo Real
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0a0f1d] hover:bg-[#121c32]/80 text-slate-200 rounded-lg border border-[#151f33] shadow-md transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin-slow text-[#1565C0]" />
          <span>Sincronizar Dados</span>
        </button>
      </div>

      {/* FILTER CONTROL RAIL */}
      <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="filters_rail">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
            Filtro de UBS
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <select
              value={selectedUbs}
              onChange={(e) => setSelectedUbs(e.target.value)}
              className="block w-full pl-9 pr-2 py-2 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer"
            >
              <option value="Todas">Todas as UBS</option>
              {ubsArr.map(u => (
                <option key={u.id} value={u.nome}>{u.nome} ({u.cidade})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
            Período de Análise
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <select
              value={selectedPeriodo}
              onChange={(e) => setSelectedPeriodo(e.target.value)}
              className="block w-full pl-9 pr-2 py-2 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-105 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer"
            >
              <option value="Hoje">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="Historico">Histórico Completo</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
            Etapa de Processo
          </label>
          <div className="relative">
            <Cpu className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <select
              value={selectedProcesso}
              onChange={(e) => setSelectedProcesso(e.target.value)}
              className="block w-full pl-9 pr-2 py-2 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-105 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer"
            >
              <option value="Todos">Todos os Processos</option>
              <option value="Recebimento">Recebimento</option>
              <option value="Secagem">Secagem</option>
              <option value="Limpeza">Limpeza</option>
              <option value="Beneficiamento">Beneficiamento</option>
              <option value="Tratamento">Tratamento</option>
              <option value="Ensaque">Ensaque</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
            Turno de Trabalho
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <select
              value={selectedTurno}
              onChange={(e) => setSelectedTurno(e.target.value)}
              className="block w-full pl-9 pr-2 py-2 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-105 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer"
            >
              <option value="Todos">Todos os Turnos</option>
              <option value="Turno A">Turno A</option>
              <option value="Turno B">Turno B</option>
              <option value="Turno C">Turno C</option>
              <option value="Administrativo">Administrativo</option>
            </select>
          </div>
        </div>
      </div>

       {/* KPI METRICS GRID GRID */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4" id="kpi_grid">
          {/* OFFIECENCY OEE CARD */}
          <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-5 flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Eficiência OEE</span>
                <span className="text-3xl font-extrabold text-[#1565C0] tracking-tight mt-1 inline-block">{kpis.eficienciaPct}%</span>
              </div>
              <div className={`p-2 rounded-lg ${kpis.eficienciaPct >= 80 ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40" : "bg-amber-950/40 text-amber-400 border border-amber-900/40"}`}>
                <Cpu className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#121c32] flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Benchmark UBS: 85%</span>
              <span className={`text-[10px] font-bold ${kpis.eficienciaPct >= 80 ? "text-emerald-400" : "text-amber-400"}`}>
                {kpis.eficienciaPct >= 80 ? "Alta Performance" : "Em Alerta"}
              </span>
            </div>
          </div>

          {/* APROVEITAMENTO OPERACIONAL (%) */}
          <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-5 flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aproveitamento</span>
                <span className="text-3xl font-extrabold text-slate-100 tracking-tight mt-1 inline-block">{kpis.disponibilidadePct}%</span>
              </div>
              <div className="p-2 rounded-lg bg-blue-950/40 text-blue-400 border border-blue-900/40">
                <Timer className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#121c32] flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Taxa de Operação Real</span>
              <span className="text-[10px] text-[#1565C0] font-bold">Aproveitamento Geral</span>
            </div>
          </div>

          {/* TONELADAS BENEFICIADAS PLANT CARD */}
          <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-5 flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Toneladas Beneficiadas</span>
                <span className="text-3xl font-extrabold text-slate-100 tracking-tight mt-1 inline-block">{(kpis.toneladasBeneficiadas || 0).toLocaleString("pt-BR")} t</span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-900/40">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#121c32] flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Massa Beneficiada</span>
              <span className="text-[10px] text-emerald-400 font-bold">Produção do Dia</span>
            </div>
          </div>

          {/* PRODUÇÃO POR HORA (Tons/H) */}
          <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-5 flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Produção por Hora</span>
                <span className="text-2xl font-black text-indigo-300 tracking-tight mt-1.5 inline-block">{(kpis.producaoPorHora || 0).toFixed(2)} t/h</span>
              </div>
              <div className="p-2 rounded-lg bg-[#121c32]/50 text-indigo-400 border border-[#151f33]">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#121c32] flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Vazão Média Real</span>
              <span className="text-[10px] text-indigo-400 font-bold">Eficiência Horária</span>
            </div>
          </div>

          {/* HORAS OPERACIONAIS (PRODUTIVAS vs DISPONIVEIS) */}
          <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-5 flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Horas Produtivas</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-3xl font-extrabold text-slate-100 tracking-tight">{kpis.horasProdutivas}h</span>
                  <span className="text-[10px] text-slate-500 font-mono">/ {kpis.horasDisponiveis}h disp</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[#121c32]/50 text-slate-300 border border-[#151f33]">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#121c32] flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Horas Disponíveis: 24h/dia</span>
              <span className="text-[10px] text-slate-300 font-bold">Aproveitadas</span>
            </div>
          </div>

          {/* HORAS PARADAS (COM IMPACTO vs TOTAL) */}
          <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-5 flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Paradas com Impacto</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-3xl font-extrabold text-rose-500 tracking-tight">{kpis.horasParadasComImpacto || kpis.horasParadas}h</span>
                  <span className="text-[10px] text-slate-500 font-mono">/ {kpis.horasParadasTotal || kpis.horasParadas}h total</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-rose-950/40 text-rose-450 border border-rose-900/40">
                <Hourglass className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#121c32] flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Total de Ocorrências: {kpis.paradasContagem}</span>
              <span className="text-[10px] text-red-400 font-bold">Downtime Ativo</span>
            </div>
          </div>

          {/* MTBF AND MTTR INDUSTRIAL CARDS */}
          <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-5 lg:col-span-2 flex flex-col justify-between hover:shadow transition-all">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">MTBF (Tempo Médio Entre Falhas)</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-indigo-300 tracking-tight">{kpis.mtbf}h</span>
                  <span className="text-xs text-slate-400 font-sans">operativas sem incidentes</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[#121c32]/50 text-indigo-300 border border-[#151f33]">
                <Wrench className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#121c32] flex items-center justify-between text-[11px]">
              <span className="text-slate-400">MTBF industrial mede a Confiabilidade de Ativos da Planta.</span>
              <span className="font-mono text-indigo-400 font-semibold">Prevenção prioritária</span>
            </div>
          </div>

          <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-5 lg:col-span-2 flex flex-col justify-between hover:shadow transition-all">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">MTTR (Tempo Médio de Reparo Convenção)</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-rose-300 tracking-tight">{kpis.mttr}h</span>
                  <span className="text-xs text-slate-400 font-sans">média por intervenção física</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-rose-950/40 text-rose-450 border border-rose-900/40">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#121c32] flex items-center justify-between text-[11px]">
              <span className="text-slate-400">MTTR industrial mede o tempo de reação e agilidade da equipe.</span>
              <span className="font-mono text-rose-400 font-semibold">Meta UBS: &lt; 2.5h</span>
            </div>
          </div>
        </div>
      )}

      {/* CHARTS CONTAINER GRID */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PRODUCTION LOG TIMELINE */}
          <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-5 flex flex-col">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-4 border-b border-[#121c32] pb-2">
              Progresso de Produção no Período (Sacos)
            </h3>
            <div className="w-full h-72">
              {stats.producaoTimeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.producaoTimeline} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#151f33" />
                    <XAxis dataKey="data" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#070a13", borderColor: "#151f33", color: "#f8fafc", fontSize: "11px", borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      name="Sementes Ensacadas (Sacos)" 
                      stroke="#1565C0" 
                      strokeWidth={3} 
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-550 font-mono">
                  SEM REGISTROS DE PRODUÇÃO LANÇADOS NO PERÍODO SELECIONADO.
                </div>
              )}
            </div>
          </div>

          {/* MACHINERY STOP TIME COMPILATION */}
          <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-5 flex flex-col">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-4 border-b border-[#121c32] pb-2">
              Horas Paradas Acumuladas por Máquina
            </h3>
            <div className="w-full h-72">
              {stats.rankingEquipamentos.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.rankingEquipamentos} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#151f33" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis dataKey="nome" type="category" stroke="#64748b" fontSize={9} width={130} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#070a13", borderColor: "#151f33", color: "#f8fafc", fontSize: "11px", borderRadius: "8px" }} />
                    <Bar dataKey="horas" name="Horas de Parada" fill="#2563eb" radius={[0, 4, 4, 0]}>
                      {stats.rankingEquipamentos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-550 font-mono">
                  NENHUM INCIDENTE DE PARADA REGISTRADO NO PERÍODO SELECIONADO.
                </div>
              )}
            </div>
          </div>

          {/* CATEGORIES STOPPED CAUSES */}
          <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-5 flex flex-col lg:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-2 border-b border-[#121c32] gap-2">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Distribuição e Classificação por Categoria de Parada
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#121c32]/50 text-slate-300 border border-[#151f33] font-mono">
                {stats.rankingCausas.length} categorias ativas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Pie Chart of Causes */}
              <div className="md:col-span-1 h-56 flex items-center justify-center">
                {stats.rankingCausas.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.rankingCausas}
                        dataKey="minutos"
                        nameKey="categoria"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={40}
                        paddingAngle={3}
                      >
                        {stats.rankingCausas.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#070a13", borderColor: "#151f33", color: "#f8fafc" }} formatter={(value: any) => `${(Number(value) / 60).toFixed(1)}h`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-slate-550 font-mono">SEM ACUMULADOS DE CAUSAS</div>
                )}
              </div>

              {/* Data Table details in grid */}
              <div className="md:col-span-2 overflow-x-auto text-slate-300">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-[#121c32] text-slate-100 uppercase text-[10px] font-mono font-bold tracking-wider rounded-lg">
                    <tr>
                      <th className="px-4 py-3 rounded-l">Categoria de Parada</th>
                      <th className="px-4 py-3">Tempo Total Registrado</th>
                      <th className="px-4 py-3 rounded-r text-right">Porcentagem Estimada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#151f33]">
                    {stats.rankingCausas.length > 0 ? (
                      stats.rankingCausas.map((causa, idx) => {
                        const totalTime = stats.rankingCausas.reduce((acc, c) => acc + c.minutos, 0) || 1;
                        const pct = ((causa.minutos / totalTime) * 100).toFixed(1);
                        return (
                          <tr key={causa.categoria} className="hover:bg-[#121c32]/20 transition-colors">
                            <td className="px-4 py-2.5 font-medium flex items-center gap-2 text-slate-200">
                              <span 
                                className="w-3 h-3 rounded-full shrink-0" 
                                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                              />
                              {causa.categoria}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-400">{causa.horas} horas ({causa.minutos} min)</td>
                            <td className="px-4 py-2.5 font-mono text-right font-bold text-[#1565C0]">{pct}%</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-500 font-mono">
                          NENHUM REGISTRO CAPTURADO.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
