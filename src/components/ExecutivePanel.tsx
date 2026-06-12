import { useMemo } from "react";
import { Ubs, StopRecord, DailyProductionRecord, Equipment } from "../types";
import { GlobalFilters } from "../utils/filterUtils";
import { 
  Building2, 
  TrendingUp, 
  Zap, 
  Wrench, 
  AlertOctagon, 
  ThumbsUp, 
  ThumbsDown, 
  BarChart, 
  CheckCircle,
  Users,
  Clock
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie 
} from "recharts";

interface ExecutivePanelProps {
  allUbs: Ubs[];
  allStops: StopRecord[];
  allDailyProductions: DailyProductionRecord[];
  allEquipments: Equipment[];
  filters: GlobalFilters;
}

export default function ExecutivePanel({ 
  allUbs, 
  allStops, 
  allDailyProductions, 
  allEquipments,
  filters
}: ExecutivePanelProps) {

  const selectedUbs = filters.unidade;

  // Standard Monthly availability math (30 days * 24 hours = 720 hours)
  const totalAvailableHours = 720;

  const executiveData = useMemo(() => {
    const isSingle = selectedUbs !== "Todas";
    const activeUbs = isSingle 
      ? allUbs.filter(u => u.nome === selectedUbs)
      : allUbs.filter(u => u.status === "Ativa" || !u.status);

    // 1. Compute Individual statistics 
    const ubsMetrics = activeUbs.map(ubs => {
      // Production
      const ubsDaily = allDailyProductions.filter(p => p.unidade === ubs.nome);
      const totalProduction = ubsDaily.reduce((acc, curr) => acc + Number(curr.quantidadeToneladas), 0);

      // Stops/downtime with production impact
      const ubsStops = allStops.filter(s => s.ubs === ubs.nome);
      const stopsWithImpact = ubsStops.filter(s => s.impactouProducao !== false);
      const totalStoppedMinutes = stopsWithImpact.reduce((acc, curr) => acc + (curr.tempoParadoMinutos || 0), 0);
      const horasParadas = Number((totalStoppedMinutes / 60).toFixed(1));

      const target = ubs.metaDiaria || (
        ubs.nome === "UBS-MG" ? 200 :
        ubs.nome === "UBS-GO" ? 180 :
        ubs.nome === "UBS-BA" ? 150 :
        ubs.nome === "UBS-TO" ? 120 : 150
      );

      const todayStr = new Date().toISOString().split("T")[0];
      const datesInRecords = allDailyProductions.map(p => p.data);
      const activePerformanceDate = datesInRecords.includes(todayStr) 
        ? todayStr 
        : (datesInRecords.length > 0 ? datesInRecords[0] : todayStr);

      const todayProds = allDailyProductions.filter(p => p.unidade === ubs.nome && p.data === activePerformanceDate);
      const activeDayProductionTons = todayProds.reduce((acc, curr) => acc + Number(curr.quantidadeToneladas), 0);
      const atendimentoPct = target > 0 ? Number(((activeDayProductionTons / target) * 105 / 1.05).toFixed(1)) : 0;

      const activeDayStops = allStops.filter(s => s.ubs === ubs.nome && s.dataInicio === activePerformanceDate && s.impactouProducao !== false);
      const activeDayStoppedMinutes = activeDayStops.reduce((acc, curr) => acc + (curr.tempoParadoMinutos || 0), 0);
      const activeDayHorasParadas = Number((activeDayStoppedMinutes / 60).toFixed(1));
      const activeDayAproveitamentoPct = Number((Math.max(0, 24 - activeDayHorasParadas) / 24 * 100).toFixed(1));

      return {
        unidade: ubs.nome,
        cidade: ubs.cidade,
        estado: ubs.estado,
        metaDiaria: target,
        producaoTons: totalProduction,
        horasParadas,
        aproveitamentoPct: activeDayAproveitamentoPct, // OEE Aproveitamento
        atendimentoPct
      };
    });

    // 2. Global KPIs
    const producaoTotalEmpresa = ubsMetrics.reduce((acc, curr) => acc + curr.producaoTons, 0);

    const selectedStops = isSingle
      ? allStops.filter(s => s.ubs === selectedUbs)
      : allStops;

    const totalHorasParadasGlobais = Number((selectedStops.reduce((acc, curr) => acc + (curr.tempoParadoMinutos || 0), 0) / 60).toFixed(1));
    const aproveitamentoMedioPct = activeUbs.length > 0
      ? Number((ubsMetrics.reduce((acc, curr) => acc + curr.aproveitamentoPct, 0) / ubsMetrics.length).toFixed(1))
      : 100;

    // Sort to extract Best / Worst UBS
    const sortedByAproveitamento = [...ubsMetrics].sort((a, b) => b.aproveitamentoPct - a.aproveitamentoPct);
    const melhorUbsDoMes = sortedByAproveitamento[0] || null;
    const piorUbsDoMes = sortedByAproveitamento.length > 1 
      ? sortedByAproveitamento[sortedByAproveitamento.length - 1] 
      : (sortedByAproveitamento[0] || null);

    // 3. Equipment downtime ranking (Corporate vs. Single)
    const equipDowntimesMap: { [key: string]: { minutos: number, ubs: string, processo: string } } = {};
    selectedStops.forEach(st => {
      const equipName = st.equipamentoNome || "Não Identificado";
      if (!equipDowntimesMap[equipName]) {
        equipDowntimesMap[equipName] = { minutos: 0, ubs: st.ubs, processo: st.processo };
      }
      equipDowntimesMap[equipName].minutos += (st.tempoParadoMinutos || 0);
    });

    const criticalEquipments = Object.entries(equipDowntimesMap)
      .map(([nome, met]) => ({
        nome,
        minutos: met.minutos,
        horas: Number((met.minutos / 60).toFixed(1)),
        ubs: met.ubs,
        processo: met.processo
      }))
      .sort((a, b) => b.minutos - a.minutos) // most stop times first
      .slice(0, 5); // top 5 critical

    // 4. Principal causas de parada
    const categoryMinutes: { [key: string]: number } = {};
    selectedStops.forEach(st => {
      const cat = st.categoria || "Outros";
      categoryMinutes[cat] = (categoryMinutes[cat] || 0) + (st.tempoParadoMinutos || 0);
    });

    const principalCausas = Object.entries(categoryMinutes)
      .map(([categoria, minutos]) => ({
        name: categoria,
        value: Number((minutos / 60).toFixed(1)) // in hours for clean executive viewing
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // 5. Operators for active unit
    const activeUbsProductions = isSingle
      ? allDailyProductions.filter(p => p.unidade === selectedUbs)
      : allDailyProductions;

    const operatorMap: { [key: string]: { toneladas: number, lancamentos: number, material: string } } = {};
    activeUbsProductions.forEach(p => {
      const opName = p.operador || "Não Identificado";
      if (!operatorMap[opName]) {
        operatorMap[opName] = { toneladas: 0, lancamentos: 0, material: "" };
      }
      operatorMap[opName].toneladas += Number(p.quantidadeToneladas);
      operatorMap[opName].lancamentos += 1;
      operatorMap[opName].material = p.material || "";
    });

    const operatorsList = Object.entries(operatorMap)
      .map(([nome, met]) => ({
        nome,
        toneladas: met.toneladas,
        lancamentos: met.lancamentos,
        material: met.material
      }))
      .sort((a, b) => b.toneladas - a.toneladas);

    return {
      isSingle,
      ubsMetrics,
      producaoTotalEmpresa,
      aproveitamentoMedioPct,
      totalHorasParadasGlobais,
      melhorUbsDoMes,
      piorUbsDoMes,
      criticalEquipments,
      principalCausas,
      operatorsList
    };

  }, [allUbs, allStops, allDailyProductions, allEquipments, selectedUbs]);  const COLORS = ["#1565C0", "#2196F3", "#00E676", "#FFEA00", "#FF9100", "#FF1744"];

  const { 
    isSingle,
    ubsMetrics, 
    producaoTotalEmpresa, 
    aproveitamentoMedioPct,
    totalHorasParadasGlobais,
    melhorUbsDoMes, 
    piorUbsDoMes, 
    criticalEquipments, 
    principalCausas,
    operatorsList
  } = executiveData;

  const getOeeColorClass = (val: number) => {
    if (val < 80) return "text-rose-450";
    if (val <= 95) return "text-amber-450";
    return "text-emerald-440";
  };

  return (
    <div className="space-y-8" id="executive_panel_wrapper">
      
      {/* TITLE BAR */}
      <div className="border-b border-[#151f33] pb-5">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <Building2 className="w-8 h-8 text-[#1565C0]" />
          {isSingle ? `📈 Painel Executivo • ${selectedUbs}` : "📈 Painel Executivo Corporativo"}
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
          {isSingle 
            ? `Análise consolidada e indicadores de performance para a unidade ${selectedUbs}`
            : "Suíte de monitoramento macroempresarial para alta gestão • Consolidação fiscal e operacional das UBS"
          }
        </p>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric 1: Produção */}
        <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono block">
                {isSingle ? "Produção da Unidade" : "Produção Total da Empresa"}
              </span>
              <span className="text-3xl font-black text-emerald-400 font-mono tracking-tight mt-2 block">
                {producaoTotalEmpresa.toLocaleString("pt-BR")} t
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-900/30">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#151f33]">
            <p className="text-[10px] text-slate-400 font-semibold uppercase font-mono">
              {isSingle ? `Volume acumulado lançado para ${selectedUbs}` : "Volume acumulado de filiais ativas"}
            </p>
          </div>
        </div>

        {/* Metric 2: OEE / Aproveitamento */}
        <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono block">
                {isSingle ? "Aproveitamento Operacional (%)" : "Aproveitamento Médio (%)"}
              </span>
              <span className={`text-3xl font-black font-mono tracking-tight mt-2 block ${getOeeColorClass(aproveitamentoMedioPct)}`}>
                {aproveitamentoMedioPct}%
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-950/40 text-[#2196F3] border border-blue-900/30">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#151f33]">
            <span className="text-[10px] font-semibold text-slate-400 font-mono uppercase">
              {isSingle ? "Média de eficiência operativa diária" : "Líder em disponibilidade de linha"}
            </span>
          </div>
        </div>

        {/* Metric 3: Horas Paradas */}
        <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono block">
                {isSingle ? "Downtime da Unidade" : "Horas Paradas Totais"}
              </span>
              <span className="text-3xl font-black text-rose-400 font-mono tracking-tight mt-2 block">
                {totalHorasParadasGlobais}h
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-950/40 text-rose-450 border border-rose-900/40">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#151f33]">
            <span className="text-[10px] font-semibold text-rose-400 font-mono uppercase">
              {isSingle ? "Horas ociosas acumuladas na filial" : "Somatória de incidentes de beneficiamento"}
            </span>
          </div>
        </div>

      </div>

      {/* MID CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Widget: Operator list (single) or Produção por UBS (Todas) */}
        {isSingle ? (
          <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 border-b border-[#151f33] pb-3 mb-4">
              <Users className="w-5 h-5 text-[#2196F3]" />
              <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider font-mono">👥 Operadores Ativos em {selectedUbs}</h4>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {operatorsList.length > 0 ? (
                operatorsList.map((op, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[#070a13] p-3 rounded-lg border border-[#151f33]">
                    <div>
                      <span className="font-extrabold text-xs text-slate-100 block">{op.nome}</span>
                      <span className="text-[9px] text-slate-450 uppercase font-mono tracking-wider block mt-0.5">
                        Último Material: <strong className="text-[#60a5fa]">{op.material}</strong>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black font-mono text-emerald-400 block">
                        {op.toneladas.toLocaleString("pt-BR")} t
                      </span>
                      <span className="text-[8px] text-slate-400 uppercase font-mono tracking-widest block">{op.lancamentos} lançamentos</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-xs py-10 text-center">Nenhum operador com lançamentos de produção nesta unidade.</p>
              )}
            </div>
            <div className="pt-4 text-[9px] text-slate-400 uppercase font-mono tracking-wide">
              * Operadores e quantidade total de soja e grãos beneficiados lançada
            </div>
          </div>
        ) : (
          <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 border-b border-[#151f33] pb-3 mb-4">
              <BarChart className="w-5 h-5 text-[#2196F3]" />
              <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider font-mono">Produção Consolidada por UBS (t)</h4>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={ubsMetrics} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#151f33" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis dataKey="unidade" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: "#121c32" }}
                    contentStyle={{ background: "#070a13", border: "1px solid #151f33", borderRadius: "8px", color: "#fff", fontSize: "11px" }}
                    formatter={(val) => [`${Number(val).toLocaleString("pt-BR")} t`, "Produção"]}
                  />
                  <Bar dataKey="producaoTons" radius={[0, 4, 4, 0]}>
                    {ubsMetrics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Right Widget: Aproveitamento por UBS (Todas) or Individual OEE details */}
        <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-[#121c32] pb-3 mb-4">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider font-mono">
              {isSingle ? `Gráfico de Aproveitamento e Atendimento de ${selectedUbs}` : "Aproveitamento Médio (%) por UBS"}
            </h4>
          </div>
          <div className="h-64 w-full">
            {isSingle ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart 
                  data={[
                    { name: "Aproveitamento", valor: aproveitamentoMedioPct, fill: "#3b82f6" },
                    { name: "Atendimento Meta", valor: (ubsMetrics[0]?.atendimentoPct || 0), fill: "#10b981" }
                  ]}
                  margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#151f33" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} unit="%" />
                  <Tooltip 
                    cursor={{ fill: "#121c32" }}
                    contentStyle={{ background: "#070a13", border: "1px solid #151f33", borderRadius: "8px", color: "#fff", fontSize: "11px" }}
                    formatter={(val) => [`${val}%`, "Valor"]}
                  />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={ubsMetrics} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#151f33" vertical={false} />
                  <XAxis dataKey="unidade" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} unit="%" />
                  <Tooltip 
                    cursor={{ fill: "#121c32" }}
                    contentStyle={{ background: "#070a13", border: "1px solid #151f33", borderRadius: "8px", color: "#fff", fontSize: "11px" }}
                    formatter={(val) => [`${val}%`, "Aproveitamento"]}
                  />
                  <Bar dataKey="aproveitamentoPct" radius={[4, 4, 0, 0]}>
                    {ubsMetrics.map((entry, index) => {
                      const isMelhor = melhorUbsDoMes && entry.unidade === melhorUbsDoMes.unidade;
                      const isPior = piorUbsDoMes && entry.unidade === piorUbsDoMes.unidade;
                      let color = "#3b82f6"; // standard blue
                      if (isMelhor) color = "#10b981"; // green
                      else if (isPior && ubsMetrics.length > 1) color = "#ef4444"; // red
                      return (
                        <Cell key={`cell-${index}`} fill={color} />
                      );
                    })}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* LOWER RANKS ROWS (EQUIPMENTS VS CAUSAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: Equipamentos mais críticos */}
        <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-[#121c32] pb-3 mb-4">
            <Wrench className="w-5 h-5 text-rose-455" />
            <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider font-mono">
              🛠️ {isSingle ? `Equipamentos mais críticos em ${selectedUbs}` : "Equipamentos mais críticos da empresa"}
            </h4>
          </div>

          <div className="space-y-3">
            {criticalEquipments.length > 0 ? (
              criticalEquipments.map((eq, idx) => (
                <div key={idx} className="flex justify-between items-center bg-[#070a13] p-3 rounded-lg border border-[#151f33]">
                  <div>
                    <span className="font-extrabold text-xs text-slate-100 block">{eq.nome}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block mt-0.5">
                      Processo: {eq.processo} • <strong className="text-[#60a5fa]">{eq.ubs}</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-rose-450 block">
                      {eq.horas}h
                    </span>
                    <span className="text-[8px] text-slate-450 uppercase font-mono tracking-widest font-black block">Parados</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-xs py-10 text-center">Nenhum equipamento crítico registrado.</p>
            )}
          </div>
          <div className="pt-4 text-[9px] text-slate-450 uppercase font-mono tracking-wide">
            * Classificado com base no total de downtime produtivo acumulado
          </div>
        </div>

        {/* RIGHT COLUMN: Principais causas de parada */}
        <div className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-[#121c32] pb-3 mb-4">
            <AlertOctagon className="w-5 h-5 text-rose-455" />
            <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider font-mono">
              ⚠️ {isSingle ? `Principais causas de parada em ${selectedUbs}` : "Principais causas de parada da empresa"}
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            
            {/* Legend / Cause List */}
            <div className="space-y-2.5">
              {principalCausas.length > 0 ? (
                principalCausas.map((causa, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                      />
                      <span className="text-slate-350 font-semibold">{causa.name}</span>
                    </div>
                    <span className="font-bold font-mono text-slate-100">{causa.value}h</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-xs py-10 text-center col-span-2">Nenhuma causa identificada.</p>
              )}
            </div>

            {/* Recharts Pie component */}
            <div className="h-44 w-full">
              {principalCausas.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={principalCausas}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {principalCausas.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: "#070a13", border: "1px solid #151f33", borderRadius: "8px", color: "#fff", fontSize: "10px" }}
                      formatter={(val) => [`${val}h`, "Duração"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
            </div>

          </div>

          <div className="pt-4 text-[9px] text-slate-450 uppercase font-mono tracking-wide">
            * Divisão de ociosidade por categoria
          </div>
        </div>

      </div>

    </div>
  );
}
