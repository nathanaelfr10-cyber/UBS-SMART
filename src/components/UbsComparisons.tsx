import { useMemo } from "react";
import { Ubs, StopRecord, DailyProductionRecord } from "../types";
import { 
  Trophy, 
  BarChart4, 
  Clock, 
  Scale, 
  AlertTriangle, 
  Zap, 
  ChevronRight,
  TrendingUp,
  Activity
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell
} from "recharts";
import { GlobalFilters } from "../utils/filterUtils";

interface UbsComparisonsProps {
  allUbs: Ubs[];
  allStops: StopRecord[];
  allDailyProductions: DailyProductionRecord[];
  filters: GlobalFilters;
}

export default function UbsComparisons({ 
  allUbs, 
  allStops, 
  allDailyProductions, 
  filters 
}: UbsComparisonsProps) {
  
  // Calculate full metrics per UBS respecting filters
  const comparisons = useMemo(() => {
    // Only compare active UBS
    const activeUbs = allUbs.filter(u => u.status === "Ativa" || !u.status);
    
    // Total available hours based on selected filter period
    let estimatedAvailableHours = 720; // default to a month
    if (filters.periodo === "Hoje" || filters.periodo === "Ontem") {
      estimatedAvailableHours = 24;
    } else if (filters.periodo === "Últimos 7 Dias") {
      estimatedAvailableHours = 7 * 24;
    } else if (filters.periodo === "Últimos 15 Dias" || filters.visaoAgrupamento === "Quinzenal") {
      estimatedAvailableHours = 15 * 24;
    } else if (filters.periodo === "Últimos 30 Dias") {
      estimatedAvailableHours = 30 * 24;
    } else if (filters.safra !== "Todas" || filters.visaoAgrupamento === "Safra") {
      estimatedAvailableHours = 365 * 24;
    }

    return activeUbs.map(ubs => {
      // 1. Target config: MG=200, GO=180, BA=150, TO=120
      const meta = ubs.metaDiaria || (
        ubs.nome === "UBS-MG" ? 200 :
        ubs.nome === "UBS-GO" ? 180 :
        ubs.nome === "UBS-BA" ? 150 :
        ubs.nome === "UBS-TO" ? 120 : 150
      );

      // Filter daily productions for this UBS
      const ubsDailyProd = allDailyProductions.filter(p => p.unidade === ubs.nome);
      const totalProductionTons = ubsDailyProd.reduce((acc, curr) => acc + Number(curr.quantidadeToneladas), 0);

      const todayStr = "2026-06-12"; // system today anchor
      const activeDayProds = allDailyProductions.filter(p => p.unidade === ubs.nome && p.data === todayStr);
      const activeDayProductionTons = activeDayProds.length > 0 
        ? activeDayProds.reduce((acc, curr) => acc + Number(curr.quantidadeToneladas), 0)
        : totalProductionTons / Math.max(1, ubsDailyProd.length); // fallback average

      const atendimentoPct = meta > 0 ? Number(((totalProductionTons / (meta * Math.max(1, ubsDailyProd.length))) * 105).toFixed(1)) : 0;

      // Filter stops for this UBS
      const ubsStops = allStops.filter(s => s.ubs === ubs.nome);
      const stopsWithImpact = ubsStops.filter(s => s.impactouProducao !== false);
      const totalStopsCount = ubsStops.length;

      const totalStoppedMinutes = stopsWithImpact.reduce((acc, curr) => acc + (curr.tempoParadoMinutos || 0), 0);
      const horasParadas = Number((totalStoppedMinutes / 60).toFixed(1));

      // Active day stops
      const activeDayStops = allStops.filter(s => s.ubs === ubs.nome && s.dataInicio === todayStr && s.impactouProducao !== false);
      const activeDayStoppedMinutes = activeDayStops.reduce((acc, curr) => acc + (curr.tempoParadoMinutos || 0), 0);
      const activeDayHorasParadas = Number((activeDayStoppedMinutes / 60).toFixed(1));
      const activeDayAproveitamentoPct = Number((Math.max(0, 24 - activeDayHorasParadas) / 24 * 100).toFixed(1));

      // 3. Operational Aproveitamento (%)
      const horasProdutivas = Math.max(0, estimatedAvailableHours - horasParadas);
      const aproveitamentoPct = estimatedAvailableHours > 0 
        ? Number(((horasProdutivas / estimatedAvailableHours) * 100).toFixed(1)) 
        : 100;

      // 4. Produção por Hora (t/h)
      const producaoPorHora = horasProdutivas > 0 
        ? Number((totalProductionTons / horasProdutivas).toFixed(2)) 
        : 0;

      return {
        id: ubs.id,
        unidade: ubs.nome,
        cidade: ubs.cidade,
        estado: ubs.estado,
        metaDiaria: meta,
        atendimentoPct: Math.min(100, Number(atendimentoPct.toFixed(1))),
        activeDayProductionTons: Number(activeDayProductionTons.toFixed(1)),
        activeDayAproveitamentoPct: Math.min(100, activeDayAproveitamentoPct),
        activeDayHorasParadas,
        producaoTons: totalProductionTons,
        horasParadas,
        aproveitamentoPct: Math.min(100, aproveitamentoPct),
        producaoPorHora,
        quantidadeParadas: totalStopsCount
      };
    });
  }, [allUbs, allStops, allDailyProductions, filters]);

  // Sort by highest completed meta ranking
  const rankedUbs = useMemo(() => {
    return [...comparisons].sort((a, b) => b.atendimentoPct - a.atendimentoPct);
  }, [comparisons]);

  const rankingBadges = [
    { label: "🥇 Maior Atendimento da Meta", textClass: "text-emerald-400 bg-emerald-950/30 border-emerald-900/30", trophyColor: "text-emerald-400" },
    { label: "🥈 Segundo Lugar", textClass: "text-slate-350 bg-slate-900/50 border-[#151f33]", trophyColor: "text-slate-400" },
    { label: "🥉 Terceiro Lugar", textClass: "text-amber-400 bg-amber-950/30 border-amber-900/30", trophyColor: "text-amber-500" },
    { label: "🏅 Quarto Lugar", textClass: "text-slate-400 bg-[#070a13] border-[#151f33]", trophyColor: "text-slate-500" }
  ];

  const chartColors = ["#10b981", "#3b82f6", "#f59e0b", "#a78bfa"];

  const getOeeColorStyle = (val: number) => {
    if (val < 80) return { text: "text-rose-450", bg: "bg-rose-950/30 border border-rose-900/30 text-rose-300", dot: "bg-red-500" };
    if (val <= 95) return { text: "text-amber-450", bg: "bg-amber-955/35 border border-amber-900/30 text-amber-300", dot: "bg-amber-500" };
    return { text: "text-emerald-440", bg: "bg-emerald-955/35 border border-emerald-900/30 text-emerald-300", dot: "bg-emerald-500" };
  };

  return (
    <div className="space-y-8" id="ubs_comparisons_panel">
      {/* HEADER SECTION */}
      <div className="border-b border-[#151f33] pb-5">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <BarChart4 className="w-8 h-8 text-[#1565C0]" />
          📊 Comparativo de UBS
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
          Análise cruzada de performance, metas de beneficiamento, tempo ocioso e eficiência entre as filiais ativas
        </p>
      </div>

      {filters.unidade !== "Todas" && (
        <div className="bg-[#121c32]/40 border border-[#1565C0]/35 rounded-xl p-4 text-xs text-slate-200 leading-relaxed">
          Você selecionou especificamente a <strong>{filters.unidade}</strong> no painel de filtros globais. O comparativo está destacando e demonstrando a performance isolada dela em relação aos critérios ativos.
        </div>
      )}

      {/* HIGHEST PERFORMANCE RANKING SECTION */}
      <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2 font-mono">
          <Trophy className="w-5 h-5 text-yellow-500 animate-bounce" /> RANKING OPERACIONAL • ATENDIMENTO DE META DIÁRIA
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {rankedUbs.map((ubs, index) => {
            const badge = rankingBadges[index] || { label: `${index + 1}º Recomendado`, textClass: "text-slate-400 bg-slate-950/30 border-[#151f33]", trophyColor: "text-slate-500" };
            const style = getOeeColorStyle(ubs.atendimentoPct);
            const isFocussed = filters.unidade === "Todas" || filters.unidade === ubs.unidade;

            return (
              <div 
                key={ubs.id} 
                className={`p-5 rounded-xl border flex flex-col justify-between transition-all bg-[#070a13] hover:shadow-md 
                  ${index === 0 ? "ring-2 ring-emerald-500/20 border-emerald-500/30 bg-emerald-950/5" : "border-[#151f33]"}
                  ${!isFocussed ? "opacity-40" : "opacity-100"}
                `}
              >
                <div>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black border uppercase tracking-wider ${badge.textClass}`}>
                    <Trophy className={`w-3.5 h-3.5 ${badge.trophyColor}`} />
                    <span>{badge.label}</span>
                  </div>
                  <h4 className="text-xl font-black text-slate-105 block mt-3 mb-1">{ubs.unidade}</h4>
                  <span className="text-[10px] text-slate-450 font-mono uppercase tracking-wide block">
                    {ubs.cidade} • {ubs.estado}
                  </span>
                </div>

                <div className="mt-5 pt-3 border-t border-[#151f33] space-y-2">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-slate-400">Produção do Dia:</span>
                    <span className="font-extrabold text-slate-100 font-mono">{ubs.activeDayProductionTons} t</span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-slate-400">Meta Registrada:</span>
                    <span className="font-bold text-slate-450 font-mono">{ubs.metaDiaria} t</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#151f33]">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Atendimento</span>
                    <span className={`text-xl font-black font-mono ${style.text}`}>{ubs.atendimentoPct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAILED STATISTICS TABLE CONTROLLER */}
      <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-6 shadow-sm overflow-hidden animate-fade-in">
        <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider mb-4 font-mono">
          📋 Quadro Comparativo de Metas e Performance por UBS
        </h3>
        
        <div className="overflow-x-auto text-xs text-slate-350">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#070a13] text-slate-100 border-b border-[#151f33] uppercase text-[9px] font-mono tracking-wider">
              <tr>
                <th className="px-5 py-3.5 rounded-l-lg">Unidade / UBS</th>
                <th className="px-5 py-3.5 text-right">Meta Diária</th>
                <th className="px-5 py-3.5 text-right">Produção Estimada</th>
                <th className="px-5 py-3.5 text-right">Atendimento Meta (%)</th>
                <th className="px-5 py-3.5 text-right">Downtime Paradas</th>
                <th className="px-5 py-3.5 text-right font-bold">Aproveitamento Médio</th>
                <th className="px-5 py-3.5 text-right rounded-r-lg">Produção Acumulada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151f33]">
              {comparisons.map(ubs => {
                const styleMeta = getOeeColorStyle(ubs.atendimentoPct);
                const styleAprov = getOeeColorStyle(ubs.aproveitamentoPct);
                const isFocussed = filters.unidade === "Todas" || filters.unidade === ubs.unidade;

                return (
                  <tr key={ubs.id} className={`transition-colors font-sans hover:bg-[#121c32]/35 ${!isFocussed ? "opacity-30 bg-[#070a13]/20" : "opacity-100"}`}>
                    <td className="px-5 py-4">
                      <span className="font-extrabold text-slate-100 text-sm block">{ubs.unidade}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">{ubs.cidade} - {ubs.estado}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-mono font-bold text-slate-300 block text-sm">
                        {ubs.metaDiaria} t
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right bg-emerald-950/10">
                      <span className="font-mono font-black text-emerald-400 text-sm block">
                        {ubs.activeDayProductionTons} t
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border font-mono ${styleMeta.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${styleMeta.dot}`} />
                        {ubs.atendimentoPct}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-mono font-bold text-rose-400 block-inline">
                        {ubs.horasParadas}h
                      </span>
                      <span className="text-[9px] text-slate-450 uppercase block tracking-tighter">Período</span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border font-mono ${styleAprov.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${styleAprov.dot}`} />
                        {ubs.aproveitamentoPct}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right bg-[#070a13]/40">
                      <span className="font-mono font-extrabold text-slate-105 block text-sm">
                        {ubs.producaoTons.toLocaleString("pt-BR")} t
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PERFORMANCE VISUAL COMPARISON CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
        
        {/* CHART 1: PRODUÇÃO TOTAL COMPARATIVE */}
        <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-5 shadow-sm space-y-4 font-sans">
          <div className="flex items-center gap-2 border-b border-[#121c32] pb-3 font-sans">
            <Scale className="w-5 h-5 text-emerald-400" />
            <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider font-mono">Produção Beneficiada Comparativa (t)</h4>
          </div>
          <div className="h-64 w-full font-sans">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisons} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#151f33" />
                <XAxis dataKey="unidade" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit=" t" />
                <Tooltip 
                  cursor={{ fill: "#121c32" }}
                  contentStyle={{ background: "#070a13", border: "1px solid #151f33", borderRadius: "8px", color: "#fff", fontSize: "11px" }} 
                  formatter={(val) => [`${Number(val).toLocaleString("pt-BR")} toneladas`, "Produção"]}
                />
                <Bar dataKey="producaoTons" radius={[4, 4, 0, 0]}>
                  {comparisons.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: TIME STOPPED COMPILATION */}
        <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-5 shadow-sm space-y-4 font-sans">
          <div className="flex items-center gap-2 border-b border-[#121c32] pb-3">
            <Clock className="w-5 h-5 text-rose-455" />
            <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider font-mono">Downtime Ativo / Horas Paradas (h)</h4>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisons} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#151f33" />
                <XAxis dataKey="unidade" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="h" />
                <Tooltip 
                  cursor={{ fill: "#121c32" }}
                  contentStyle={{ background: "#070a13", border: "1px solid #151f33", borderRadius: "8px", color: "#fff", fontSize: "11px" }} 
                  formatter={(val) => [`${val} horas paradas`, "Downtime"]}
                />
                <Bar dataKey="horasParadas" radius={[4, 4, 0, 0]}>
                  {comparisons.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#f43f5e" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: APROVEITAMENTO COMPARISON */}
        <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-5 shadow-sm space-y-4 font-sans">
          <div className="flex items-center gap-2 border-b border-[#121c32] pb-3">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider font-mono">Aproveitamento Médio (%)</h4>
          </div>
          <div className="h-64 w-full font-sans">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisons} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#151f33" />
                <XAxis dataKey="unidade" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip 
                  cursor={{ fill: "#121c32" }}
                  contentStyle={{ background: "#070a13", border: "1px solid #151f33", borderRadius: "8px", color: "#fff", fontSize: "11px" }} 
                  formatter={(val) => [`${val}% de aproveitamento`, "Aproveitamento"]}
                />
                <Bar dataKey="aproveitamentoPct" radius={[4, 4, 0, 0]}>
                  {comparisons.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#3b82f6" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: PRODUCTION YIELD PER HOUR COMPARATIVE */}
        <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-5 shadow-sm space-y-4 font-sans">
          <div className="flex items-center gap-2 border-b border-[#121c32] pb-3">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider font-mono">Vazão - Produção por Hora (t/h)</h4>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisons} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#151f33" />
                <XAxis dataKey="unidade" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit=" t/h" />
                <Tooltip 
                  cursor={{ fill: "#121c32" }}
                  contentStyle={{ background: "#070a13", border: "1px solid #151f33", borderRadius: "8px", color: "#fff", fontSize: "11px" }} 
                  formatter={(val) => [`${val} t/h de produção`, "Rendimento"]}
                />
                <Bar dataKey="producaoPorHora" radius={[4, 4, 0, 0]}>
                  {comparisons.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#8b5cf6" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
