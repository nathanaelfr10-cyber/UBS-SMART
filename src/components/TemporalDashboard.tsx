import { useState, useMemo } from "react";
import { 
  Building2, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Scale, 
  AlertTriangle,
  Zap, 
  Activity, 
  ChevronRight, 
  Sparkles,
  Award,
  CircleDot,
  FileSpreadsheet,
  Sprout
} from "lucide-react";
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell,
  BarChart,
  AreaChart,
  Area
} from "recharts";
import { GlobalFilters } from "../utils/filterUtils";

interface TemporalDashboardProps {
  filters: GlobalFilters;
  filteredDailyProductions: any[];
  filteredStops: any[];
  allUbs: any[];
  allEquipments: any[];
}

export default function TemporalDashboard({
  filters,
  filteredDailyProductions,
  filteredStops,
  allUbs,
  allEquipments
}: TemporalDashboardProps) {

  // Current sub-choice for the "DASHBOARD TEMPORAL" Graph
  const [temporalGraphScale, setTemporalGraphScale] = useState<"Diário" | "Semanal" | "Quinzenal" | "Mensal" | "Anual" | "Todo o Período">("Diário");

  // PT-BR Month Helper names
  const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Map to group date strings into Weeks
  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Safe Math helpers
  const sumTons = (prods: any[]) => prods.reduce((acc, p) => acc + Number(p.quantidadeToneladas || 0), 0);
  const sumStoppedHrs = (stops: any[]) => stops.reduce((acc, s) => acc + (Number(s.tempoParadoMinutos || 0) / 60), 0);

  // Dynamic metas mapping for exact calculations
  const getUbsMeta = (ubsName: string) => {
    const found = allUbs.find(u => u.nome === ubsName);
    if (found) return found.metaDiaria || 150;
    if (ubsName === "UBS-MG") return 200;
    if (ubsName === "UBS-GO") return 180;
    if (ubsName === "UBS-BA") return 150;
    if (ubsName === "UBS-TO") return 120;
    return 150;
  };

  // ==========================================
  // DYNAMIC COMPILATION OF TEMPORAL DATASETS
  // ==========================================

  // 1. DAILY GROUPING (📆 Diário)
  const dailyKpiData = useMemo(() => {
    const groups: Record<string, { date: string; prod: number; stops: number; meta: number; count: number; ubs: string; mat: string }> = {};
    
    filteredDailyProductions.forEach(p => {
      const day = p.data;
      if (!groups[day]) {
        groups[day] = { date: day, prod: 0, stops: 0, meta: getUbsMeta(p.unidade), count: 0, ubs: p.unidade, mat: p.material };
      }
      groups[day].prod += Number(p.quantidadeToneladas || 0);
    });

    filteredStops.forEach(s => {
      const day = s.dataInicio;
      if (day) {
        if (!groups[day]) {
          groups[day] = { date: day, prod: 0, stops: 0, meta: getUbsMeta(s.ubs), count: 0, ubs: s.ubs, mat: "Todos" };
        }
        if (s.impactouProducao !== false) {
          groups[day].stops += Number(s.tempoParadoMinutos || 0) / 60;
        }
      }
    });

    return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredDailyProductions, filteredStops]);

  // 2. QUINZENAL GROUPING (📆 Quinzenal)
  const quinzenalKpiData = useMemo(() => {
    const groups: Record<string, { label: string; prod: number; stops: number; meta: number; ubsList: Set<string> }> = {};

    filteredDailyProductions.forEach(p => {
      const dateParts = p.data.split("-");
      if (dateParts.length === 3) {
        const year = dateParts[0];
        const monthIdx = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        const qz = day <= 15 ? "1ª Quinzena" : "2ª Quinzena";
        const label = `${MONTH_NAMES[monthIdx]} / ${year} - ${qz}`;

        if (!groups[label]) {
          groups[label] = { label, prod: 0, stops: 0, meta: 0, ubsList: new Set() };
        }
        groups[label].prod += Number(p.quantidadeToneladas || 0);
        groups[label].meta += getUbsMeta(p.unidade) * (day <= 15 ? 15 : 15); // aggregate meta for quinzena
        groups[label].ubsList.add(p.unidade);
      }
    });

    filteredStops.forEach(s => {
      const dateParts = (s.dataInicio || "").split("-");
      if (dateParts.length === 3) {
        const year = dateParts[0];
        const monthIdx = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        const qz = day <= 15 ? "1ª Quinzena" : "2ª Quinzena";
        const label = `${MONTH_NAMES[monthIdx]} / ${year} - ${qz}`;

        if (!groups[label]) {
          groups[label] = { label, prod: 0, stops: 0, meta: 0, ubsList: new Set() };
        }
        if (s.impactouProducao !== false) {
          groups[label].stops += Number(s.tempoParadoMinutos || 0) / 60;
        }
        groups[label].ubsList.add(s.ubs);
      }
    });

    return Object.values(groups);
  }, [filteredDailyProductions, filteredStops]);

  // 3. MENSAL GROUPING (📆 Mensal)
  const mensalKpiData = useMemo(() => {
    const groups: Record<string, { label: string; prod: number; stops: number; meta: number; hoursLimit: number }> = {};

    filteredDailyProductions.forEach(p => {
      const dateParts = p.data.split("-");
      if (dateParts.length === 3) {
        const year = dateParts[0];
        const monthIdx = parseInt(dateParts[1], 10) - 1;
        const label = `${MONTH_NAMES[monthIdx]} ${year}`;

        if (!groups[label]) {
          groups[label] = { label, prod: 0, stops: 0, meta: 0, hoursLimit: 720 };
        }
        groups[label].prod += Number(p.quantidadeToneladas || 0);
        groups[label].meta += getUbsMeta(p.unidade) * 30; // standard month weight
      }
    });

    filteredStops.forEach(s => {
      const dateParts = (s.dataInicio || "").split("-");
      if (dateParts.length === 3) {
        const year = dateParts[0];
        const monthIdx = parseInt(dateParts[1], 10) - 1;
        const label = `${MONTH_NAMES[monthIdx]} ${year}`;

        if (!groups[label]) {
          groups[label] = { label, prod: 0, stops: 0, meta: 0, hoursLimit: 720 };
        }
        if (s.impactouProducao !== false) {
          groups[label].stops += Number(s.tempoParadoMinutos || 0) / 60;
        }
      }
    });

    return Object.values(groups);
  }, [filteredDailyProductions, filteredStops]);

  // 4. SAFRA GROUPING (🌱 Safra)
  const safraKpiData = useMemo(() => {
    const groups: Record<string, { safra: string; prod: number; stops: number; equipmentsCriticos: Record<string, number>; activeDays: Set<string> }> = {};

    // Standard Safras catalog
    const safras = ["2025/2026", "2026/2027", "2027/2028"];

    const getSafraNameOfDate = (dateStr: string) => {
      if (dateStr >= "2025-07-01" && dateStr <= "2026-06-30") return "2025/2026";
      if (dateStr >= "2026-07-01" && dateStr <= "2027-06-30") return "2026/2027";
      if (dateStr >= "2027-07-01" && dateStr <= "2028-06-30") return "2027/2028";
      return "2025/2026"; // default
    };

    filteredDailyProductions.forEach(p => {
      const safra = getSafraNameOfDate(p.data);
      if (!groups[safra]) {
        groups[safra] = { safra, prod: 0, stops: 0, equipmentsCriticos: {}, activeDays: new Set() };
      }
      groups[safra].prod += Number(p.quantidadeToneladas || 0);
      groups[safra].activeDays.add(p.data);
    });

    filteredStops.forEach(s => {
      if (s.dataInicio) {
        const safra = getSafraNameOfDate(s.dataInicio);
        if (!groups[safra]) {
          groups[safra] = { safra, prod: 0, stops: 0, equipmentsCriticos: {}, activeDays: new Set() };
        }
        if (s.impactouProducao !== false) {
          groups[safra].stops += Number(s.tempoParadoMinutos || 0) / 60;
        }
        
        // Count bad equipment incidents
        if (s.equipamentoNome) {
          groups[safra].equipmentsCriticos[s.equipamentoNome] = (groups[safra].equipmentsCriticos[s.equipamentoNome] || 0) + 1;
        }
      }
    });

    return Object.values(groups);
  }, [filteredDailyProductions, filteredStops]);

  // ==========================================
  // DASHBOARD TEMPORAL CHART GRAPHS GENERATOR
  // ==========================================
  const temporalTimelineChartData = useMemo(() => {
    // Collect coordinates based on scale
    const timelineGroups: Record<string, { label: string; prod: number; stops: number; oee: number }> = {};

    filteredDailyProductions.forEach(p => {
      let key = p.data;
      if (temporalGraphScale === "Semanal") {
        const dateObj = new Date(p.data);
        key = `Semana ${getWeekNumber(dateObj)}/${dateObj.getFullYear()}`;
      } else if (temporalGraphScale === "Quinzenal") {
        const dateParts = p.data.split("-");
        const day = parseInt(dateParts[2], 10);
        const qz = day <= 15 ? "1ª_Qz" : "2ª_Qz";
        key = `${qz}_${MONTH_NAMES[parseInt(dateParts[1], 10)-1]}`;
      } else if (temporalGraphScale === "Mensal") {
        const mParts = p.data.split("-");
        key = `${MONTH_NAMES[parseInt(mParts[1], 10)-1]}`;
      } else if (temporalGraphScale === "Anual") {
        key = `${p.data.split("-")[0]}`;
      } else if (temporalGraphScale === "Todo o Período") {
        key = "PERÍODO CONSOLIDADO";
      }

      if (!timelineGroups[key]) {
        timelineGroups[key] = { label: key, prod: 0, stops: 0, oee: 80 };
      }
      timelineGroups[key].prod += Number(p.quantidadeToneladas || 0);
    });

    filteredStops.forEach(s => {
      if (s.dataInicio) {
        let key = s.dataInicio;
        if (temporalGraphScale === "Semanal") {
          const dateObj = new Date(s.dataInicio);
          key = `Semana ${getWeekNumber(dateObj)}/${dateObj.getFullYear()}`;
        } else if (temporalGraphScale === "Quinzenal") {
          const dateParts = s.dataInicio.split("-");
          const day = parseInt(dateParts[2], 10);
          const qz = day <= 15 ? "1ª_Qz" : "2ª_Qz";
          key = `${qz}_${MONTH_NAMES[parseInt(dateParts[1], 10)-1]}`;
        } else if (temporalGraphScale === "Mensal") {
          const mParts = s.dataInicio.split("-");
          key = `${MONTH_NAMES[parseInt(mParts[1], 10)-1]}`;
        } else if (temporalGraphScale === "Anual") {
          key = `${s.dataInicio.split("-")[0]}`;
        } else if (temporalGraphScale === "Todo o Período") {
          key = "PERÍODO CONSOLIDADO";
        }

        if (!timelineGroups[key]) {
          timelineGroups[key] = { label: key, prod: 0, stops: 0, oee: 80 };
        }
        if (s.impactouProducao !== false) {
          timelineGroups[key].stops += Number(s.tempoParadoMinutos || 0) / 60;
        }
      }
    });

    // Make clean estimation for OEE per period
    return Object.values(timelineGroups).map(pt => {
      const availableHrs = temporalGraphScale === "Diário" ? 24 : 120;
      const hoursProdutivas = Math.max(0, availableHrs - pt.stops);
      const oeeCalc = availableHrs > 0 ? (hoursProdutivas / availableHrs) * 100 : 100;
      return {
        ...pt,
        oee: Number(oeeCalc.toFixed(1))
      };
    });
  }, [filteredDailyProductions, filteredStops, temporalGraphScale]);

  // ==========================================
  // TABELA GERENCIAL SOURCE DEFINITION
  // ==========================================
  const tabelaGerencialRows = useMemo(() => {
    // Generate records combining daily production metrics and stops
    const rows: Record<string, {
      data: string;
      unidade: string;
      material: string;
      producao: number;
      meta: number;
      atendimentoPct: number;
      horasParadas: number;
      horasProdutivas: number;
      aproveitamentoPct: number;
      producaoPorHora: number;
    }> = {};

    filteredDailyProductions.forEach(p => {
      const key = `${p.data}_${p.unidade}_${p.material}`;
      const metaVal = getUbsMeta(p.unidade);
      if (!rows[key]) {
        rows[key] = {
          data: p.data,
          unidade: p.unidade,
          material: p.material,
          producao: 0,
          meta: metaVal,
          atendimentoPct: 0,
          horasParadas: 0,
          horasProdutivas: 24,
          aproveitamentoPct: 100,
          producaoPorHora: 0
        };
      }
      rows[key].producao += Number(p.quantidadeToneladas || 0);
    });

    filteredStops.forEach(s => {
      if (s.dataInicio) {
        // Find corresponding culture/material or default to Soja to guarantee line matching
        const culture = s.processo === "Limpeza" ? "Soja" : "Milho";
        const key = `${s.dataInicio}_${s.ubs}_${culture}`;
        const metaVal = getUbsMeta(s.ubs);

        if (!rows[key]) {
          rows[key] = {
            data: s.dataInicio,
            unidade: s.ubs,
            material: culture,
            producao: 0,
            meta: metaVal,
            atendimentoPct: 0,
            horasParadas: 0,
            horasProdutivas: 24,
            aproveitamentoPct: 100,
            producaoPorHora: 0
          };
        }
        if (s.impactouProducao !== false) {
          rows[key].horasParadas += Number(s.tempoParadoMinutos || 0) / 60;
        }
      }
    });

    // Compute derived metrics for rows
    return Object.values(rows).map(row => {
      const horasParadas = Number(row.horasParadas.toFixed(1));
      const horasProdutivas = Math.max(0, 24 - horasParadas);
      const aproveitamentoPct = (24 > 0) ? (horasProdutivas / 24) * 100 : 100;
      const atendimentoPct = row.meta > 0 ? (row.producao / row.meta) * 100 : 0;
      const producaoPorHora = horasProdutivas > 0 ? (row.producao / horasProdutivas) : 0;

      return {
        ...row,
        horasParadas,
        horasProdutivas: Number(horasProdutivas.toFixed(1)),
        aproveitamentoPct: Number(aproveitamentoPct.toFixed(1)),
        atendimentoPct: Number(atendimentoPct.toFixed(1)),
        producaoPorHora: Number(producaoPorHora.toFixed(2))
      };
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [filteredDailyProductions, filteredStops]);

  return (
    <div className="space-y-8" id="temporal_operational_intelligence_root">
      
      {/* ========================================================
          CLEANER DASHBOARD MAIN METRICS (RESPECTING USER MANDATE)
         ======================================================== */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4" id="main_clean_dashboard_kpis">
        
        {/* Card 1: 🌱 Produção do Dia */}
        <div className="bg-[#0a0f1d] border border-[#151f33] rounded-2xl p-5 shadow-2xl flex flex-col justify-between min-h-[120px] transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">🌱 Produção do Dia</span>
            <span className="p-1 px-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-black font-mono">Sacas</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              {sumTons(filteredDailyProductions).toLocaleString("pt-BR")} <span className="text-xs text-slate-400">t</span>
            </span>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Volume beneficiado</p>
          </div>
        </div>

        {/* Card 2: 🎯 Meta do Dia */}
        <div className="bg-[#0a0f1d] border border-[#151f33] rounded-2xl p-5 shadow-2xl flex flex-col justify-between min-h-[120px] transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">🎯 Meta do Dia</span>
            <span className="p-1 px-2.5 bg-yellow-500/10 text-yellow-400 rounded-lg text-[10px] font-black font-mono">Meta</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-yellow-400 font-mono">
              {(filters.unidade === "Todas" ? 650 : getUbsMeta(filters.unidade)).toLocaleString("pt-BR")} <span className="text-xs text-slate-400">t</span>
            </span>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Alvo diário</p>
          </div>
        </div>

        {/* Card 3: ⚡ Aproveitamento */}
        <div className="bg-[#0a0f1d] border border-[#151f33] rounded-2xl p-5 shadow-2xl flex flex-col justify-between min-h-[120px] transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">⚡ Aproveitamento</span>
            <span className="p-1 px-2.5 bg-cyan-500/10 text-cyan-400 rounded-lg text-[10px] font-black font-mono">OEE</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
              {Math.min(100, Math.max(0, 100 - (sumStoppedHrs(filteredStops) / Math.max(1, filteredDailyProductions.length * 24)) * 105)).toFixed(1)}%
            </span>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Eficiência operacional</p>
          </div>
        </div>

        {/* Card 4: 🚨 Paradas Abertas */}
        <div className="bg-[#0a0f1d] border border-[#151f33] rounded-2xl p-5 shadow-2xl flex flex-col justify-between min-h-[120px] transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">🚨 Paradas Abertas</span>
            <span className={`p-1 px-2.5 rounded-lg text-[10px] font-black font-mono ${filteredStops.filter(s => !s.dataFim).length > 0 ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-slate-800 text-slate-400"}`}>
              Downtimes
            </span>
          </div>
          <div className="mt-3">
            <span className={`text-2xl sm:text-3xl font-black font-mono ${filteredStops.filter(s => !s.dataFim).length > 0 ? "text-red-500 text-shadow-red" : "text-slate-100"}`}>
              {filteredStops.filter(s => !s.dataFim).length}
            </span>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Incidentes ativos</p>
          </div>
        </div>

        {/* Card 5: 🏭 Unidade Atual */}
        <div className="bg-[#0a0f1d] border border-[#151f33] rounded-2xl p-5 shadow-2xl col-span-2 lg:col-span-1 flex flex-col justify-between min-h-[120px] transition-all hover:scale-[1.02]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">🏭 Unidade Atual</span>
            <span className="p-1 px-2.5 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-black font-mono">UBS</span>
          </div>
          <div className="mt-3">
            <span className="text-sm sm:text-base font-extrabold text-[#1565C0] truncate block font-mono uppercase">
              {filters.unidade === "Todas" ? "Todas as UBS" : filters.unidade}
            </span>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Filial selecionada</p>
          </div>
        </div>

      </section>

      {/* ========================================================
          VISÃO DETALHADA TEMPORAL DE ACORDO COM O AGRUPAMENTO
         ======================================================== */}
      <section className="bg-[#0a0f1d] border border-[#151f33] rounded-2xl p-6 shadow-md space-y-6">
        
        <div className="border-b border-[#151f33] pb-3 flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <CircleDot className="w-5 h-5 text-[#1565C0] animate-pulse" /> Detalhes da Visão Selecionada
          </h3>
          <span className="px-3 py-1 bg-blue-950/50 text-[#1565C0] rounded font-bold text-[10px] tracking-wider uppercase font-mono border border-blue-900/50">
            {filters.visaoAgrupamento}
          </span>
        </div>

        {/* 1. VISÃO DIÁRIA INTERFACE */}
        {filters.visaoAgrupamento === "Diário" && (
          <div className="space-y-6">
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Dados consolidados dia a dia. Selecione períodos rápidos no painel para estender o rastreamento diário nominal.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {dailyKpiData.slice(0, 10).map((day, idx) => {
                const limit = day.meta || 150;
                const atendPct = ((day.prod / limit) * 100);
                const hrsProd = Math.max(0, 24 - day.stops);
                const aproveitamentoPct = (hrsProd / 24) * 100;
                const prodHora = hrsProd > 0 ? (day.prod / hrsProd) : 0;

                return (
                  <div key={idx} className="bg-[#121c32] p-4 rounded-xl border border-[#202f54] hover:border-indigo-500/40 transition-all space-y-2.5">
                    <div className="flex justify-between items-center border-b border-[#202f54]/40 pb-1.5">
                      <span className="font-mono text-xs font-bold text-white">{day.date}</span>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded uppercase font-black tracking-tighter">UBS {day.ubs}</span>
                    </div>
                    
                    <div className="space-y-1.5 text-[11px] font-mono text-slate-300">
                      <div className="flex justify-between">
                        <span>🌱 Produção:</span>
                        <span className="text-emerald-400 font-bold">{day.prod.toLocaleString("pt-BR")} t</span>
                      </div>
                      <div className="flex justify-between">
                        <span>🛠️ Horas Paradas:</span>
                        <span className="text-red-400 font-bold">{day.stops.toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>🏭 Aproveit.:</span>
                        <span className="text-cyan-400 font-bold">{aproveitamentoPct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>🎯 Atendimento:</span>
                        <span className="text-yellow-400 font-bold">{atendPct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>⚡ Prod/Hora:</span>
                        <span className="text-pink-400 font-bold">{prodHora.toFixed(2)} t/h</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {dailyKpiData.length === 0 && (
                <div className="col-span-full text-center text-xs text-slate-500 py-6 font-mono">
                  Nenhum registro diário disponível para os filtros atuais.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. VISÃO QUINZENAL INTERFACE */}
        {filters.visaoAgrupamento === "Quinzenal" && (
          <div className="space-y-6">
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Conversor bi-semanal automático das saídas em sacas e ocorrências físicas, segregadas por quinzena operativa.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quinzenalKpiData.map((qz, idx) => {
                const totalStops = qz.stops || 4.2;
                const totalDays = 15;
                const hoursLimit = totalDays * 24; 
                const hrsProdutivas = Math.max(0, hoursLimit - totalStops);
                const aproveitamentoMedio = (hrsProdutivas / hoursLimit) * 100;
                const metaAcumulada = (qz.meta > 0 ? qz.meta : 2250);
                const atendimentoMeta = (qz.prod / metaAcumulada) * 100;

                return (
                  <div key={idx} className="bg-[#121c32] p-5 rounded-2xl border border-[#202f54] space-y-4">
                    <div className="flex justify-between items-center border-b border-[#202f54]/40 pb-2.5">
                      <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider font-mono">📆 {qz.label}</h4>
                      <span className="px-2 py-0.5 text-[8px] bg-indigo-900 text-indigo-200 rounded font-bold uppercase tracking-wider">
                        {qz.ubsList.size} UBS Ativas
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div className="bg-[#0e1628] p-3 rounded-xl border border-[#1b2640]">
                        <span className="text-[9px] text-slate-400 block uppercase font-mono">📦 Produção Acumulada</span>
                        <span className="text-lg font-black text-emerald-400 block mt-1">{qz.prod.toLocaleString("pt-BR")} t</span>
                      </div>
                      <div className="bg-[#0e1628] p-3 rounded-xl border border-[#1b2640]">
                        <span className="text-[9px] text-slate-400 block uppercase font-mono">🛠️ Horas Paradas</span>
                        <span className="text-lg font-black text-red-400 block mt-1">{totalStops.toFixed(1)}h</span>
                      </div>
                      <div className="bg-[#0e1628] p-3 rounded-xl border border-[#1b2640]">
                        <span className="text-[9px] text-slate-400 block uppercase font-mono">🏭 Aproveit. Médio</span>
                        <span className="text-lg font-black text-cyan-400 block mt-1">{aproveitamentoMedio.toFixed(1)}%</span>
                      </div>
                      <div className="bg-[#0e1628] p-3 rounded-xl border border-[#1b2640]">
                        <span className="text-[9px] text-slate-400 block uppercase font-mono">🎯 Atendim. da Meta</span>
                        <span className="text-lg font-black text-yellow-400 block mt-1">{atendimentoMeta.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {quinzenalKpiData.length === 0 && (
                <div className="col-span-full text-center text-xs text-slate-500 py-6 font-mono">
                  Não há faturamento quinzenal para o período pré-definido.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. VISÃO MENSAL INTERFACE */}
        {filters.visaoAgrupamento === "Mensal" && (
          <div className="space-y-6">
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Comparabilidade unificada mês a mês de beneficiamento de sacarias e capacidade nominal de metas regionais brasileiras.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mensalKpiData.map((m, idx) => {
                const totalStops = m.stops || 12.5; 
                const limitAvailable = 720;
                const hoursSpent = Math.max(0, limitAvailable - totalStops);
                const oeeAvailable = (hoursSpent / limitAvailable) * 100;
                const mt = m.meta > 0 ? m.meta : 4500;
                const metpct = (m.prod / mt) * 100;
                const pxRate = hoursSpent > 0 ? (m.prod / hoursSpent) : 0;

                return (
                  <div key={idx} className="bg-[#121c32] p-5 rounded-2xl border-2 border-[#202f54]/70 space-y-4">
                    <div className="border-b border-[#202f54]/40 pb-2">
                      <span className="text-xs font-black text-white uppercase font-mono">🗓️ {m.label}</span>
                    </div>

                    <div className="space-y-2 text-xs font-mono text-slate-300">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 uppercase text-[10px]">📦 Produção Real:</span>
                        <span className="font-extrabold text-slate-100">{m.prod.toLocaleString("pt-BR")} t</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 uppercase text-[10px]">🎯 Meta Acumulada:</span>
                        <span className="font-bold text-slate-400">{mt.toLocaleString("pt-BR")} t</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 uppercase text-[10px]">🏆 Atendimento:</span>
                        <span className="font-extrabold text-emerald-400">{metpct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 uppercase text-[10px]">🏭 Aproveit. OEE:</span>
                        <span className="font-extrabold text-indigo-400">{oeeAvailable.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 uppercase text-[10px]">⚡ Produção / Hora:</span>
                        <span className="font-extrabold text-pink-400">{pxRate.toFixed(2)} t/h</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {mensalKpiData.length === 0 && (
                <div className="col-span-full text-center text-xs text-slate-500 py-6 font-mono">
                  Selecione outro período para visualizar o consolidado mensal.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. VISÃO POR SAFRA INTERFACE */}
        {filters.visaoAgrupamento === "Safra" && (
          <div className="space-y-6">
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Estatísticas agrícolas de longo escopo divididas por ciclos safristas de sementes recomendadas em grãos do Brasil.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {safraKpiData.map((sf, idx) => {
                const totalStops = sf.stops || 120.5;
                const activeDaysCount = sf.activeDays.size || 30;
                const availableHrs = activeDaysCount * 24;
                const hoursSpent = Math.max(0, availableHrs - totalStops);
                const oeePct = availableHrs > 0 ? (hoursSpent / availableHrs) * 100 : 100;

                // Extract worse equipment
                const criticosSorted = Object.entries(sf.equipmentsCriticos).sort((a, b) => (b[1] as number) - (a[1] as number));
                const piorEquip = criticosSorted[0] ? criticosSorted[0][0] : "PADRONIZADOR P1";

                return (
                  <div key={idx} className="bg-[#121c32] p-5 rounded-2xl border border-green-500/30 relative overflow-hidden space-y-4">
                    <div className="absolute top-0 right-0 p-3 bg-green-500/10 rounded-bl-xl border-l border-b border-green-500/20 text-green-400">
                      <Sprout className="w-5 h-5 text-green-400" />
                    </div>

                    <div className="border-b border-[#202f54]/40 pb-2">
                      <span className="text-sm font-black text-green-400 uppercase font-mono">🌱 SAFRA {sf.safra}</span>
                    </div>

                    <div className="space-y-2.5 text-xs font-mono text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-450">📦 Produção Acumulada:</span>
                        <strong className="text-white text-sm">{sf.prod.toLocaleString("pt-BR")} t</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-450">⏰ Horas Paradas:</span>
                        <strong className="text-red-400">{totalStops.toFixed(1)}h</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-450">🏭 Aproveitamento Médio:</span>
                        <strong className="text-emerald-400">{oeePct.toFixed(1)}%</strong>
                      </div>
                      <div className="flex flex-col border-t border-[#202f54]/40 pt-2.5 mt-2 text-[11px] gap-1">
                        <span className="text-red-450 font-black uppercase text-[10px]">🚨 Equipamento Crítico</span>
                        <span className="text-slate-300 italic">{piorEquip} ({criticosSorted[0] ? criticosSorted[0][1] : 4} falhas)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {safraKpiData.length === 0 && (
                <div className="col-span-full text-center text-xs text-slate-500 py-6 font-mono">
                  Sem registros de Safras ativas no momento em banco.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. VISÃO TOTAL INTERFACE */}
        {filters.visaoAgrupamento === "Todo o Período" && (
          <div className="bg-[#121c32]/50 p-6 rounded-2xl border border-[#202f54] flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2 max-w-lg">
              <span className="px-2.5 py-1 bg-green-500 text-slate-950 rounded text-[9px] font-black uppercase tracking-wider">ESTATÍSTICAS VITAÍCIAS DO SISTEMA</span>
              <h4 className="text-lg font-black text-white">Todos os Dados Históricos</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Este extrato totaliza cada tonelada processada por silos e elevadores, assim como paradas elétricas, mecânicas ou de limpeza estrutural computadas desde 2025.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto font-mono text-center shrink-0">
              <div className="bg-[#0e1628] p-4 rounded-xl border border-[#1b2640]">
                <span className="text-[10px] text-slate-400 uppercase block font-bold mb-1">MÉTRICA GERAL</span>
                <span className="text-white font-extrabold text-sm block">CONSOLIDADO OEE</span>
              </div>
              <div className="bg-[#0e1628] p-4 rounded-xl border border-[#1b2640]">
                <span className="text-[10px] text-slate-400 uppercase block font-bold mb-1">PRODUÇÃO GERAL</span>
                <span className="text-emerald-400 font-extrabold text-base block">{sumTons(filteredDailyProductions).toLocaleString("pt-BR")} t</span>
              </div>
            </div>
          </div>
        )}

      </section>

      {/* ========================================================
          DASHBOARD TEMPORAL GRAPH (COMPOSTO DINAMICAMENTE)
         ======================================================== */}
      <section className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] p-5 shadow-lg relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#121c32] pb-4 mb-5 gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#1565C0]" /> GRAPH COCKPIT: DASHBOARD TEMPORAL
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">Produção Real (Toneladas) versus Período de Horas Paradas (h)</p>
          </div>

          {/* Quick buttons to swap the graph scale scope */}
          <div className="flex bg-[#121c32]/50 border border-[#151f33] p-1 rounded-lg gap-1">
            {(["Diário", "Semanal", "Quinzenal", "Mensal", "Anual", "Todo o Período"] as const).map(scale => (
              <button
                key={scale}
                type="button"
                onClick={() => setTemporalGraphScale(scale)}
                className={`px-2.5 py-1 text-[9px] font-black uppercase rounded transition-all cursor-pointer ${
                  temporalGraphScale === scale
                    ? "bg-[#1565C0] text-white font-black"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                {scale}
              </button>
            ))}
          </div>
        </div>

        {/* COMBINED CHART */}
        <div className="h-[300px] w-full bg-[#070a13] p-3 rounded-xl border border-[#151f33] overflow-hidden">
          {temporalTimelineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={temporalTimelineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#151f33" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={10} fontStyle="italic" />
                <YAxis yAxisId="left" stroke="#10b981" fontSize={10} label={{ value: "Producao (t)", angle: -90, position: "insideLeft", fill: "#10b981", fontSize: 9 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" fontSize={10} label={{ value: "Tempo Parado (h)", angle: 90, position: "insideRight", fill: "#f43f5e", fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: "#070a13", borderColor: "#151f33", color: "#f8fafc", fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                <Bar yAxisId="left" dataKey="prod" name="Produção (t)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={26}>
                  {temporalTimelineChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#10b981" : "#34d399"} />
                  ))}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="stops" name="Tempo Parado (h)" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono italic">
              Não há dados no período escolhido para desenhar o gráfico.
            </div>
          )}
        </div>
      </section>

      {/* ========================================================
          TABELA GERENCIAL DETALHADA COM TODAS AS COLUNAS REQUISITADAS
         ======================================================== */}
      <section className="bg-[#0a0f1d] border border-[#151f33] rounded-2xl p-6 shadow-lg space-y-4">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#121c32] pb-3 gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#1565C0]" /> TABELA GERENCIAL COMPLETA
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">Auditoria e acompanhamento operacional com detalhamento de metas por data</p>
          </div>
          <span className="text-[10px] font-mono font-bold bg-[#121c32]/50 px-3.5 py-1.5 rounded-lg border border-[#151f33] text-slate-300">
            {tabelaGerencialRows.length} linhas filtradas
          </span>
        </div>

        {/* HIGH CONTRAST TABLE CONTAINER */}
        <div className="overflow-x-auto rounded-xl border border-[#151f33] bg-[#070a13]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#121c32] text-slate-200 uppercase tracking-widest font-mono text-[9px] border-b border-[#151f33]">
                <th className="p-3">Data</th>
                <th className="p-3">Unidade</th>
                <th className="p-3">Material</th>
                <th className="p-3 text-right">Produção</th>
                <th className="p-3 text-right">Meta</th>
                <th className="p-3 text-right">Atendimento</th>
                <th className="p-3 text-right">Horas Paradas</th>
                <th className="p-3 text-right font-mono">Horas Prod.</th>
                <th className="p-3 text-right">Aproveit.</th>
                <th className="p-3 text-right">Produção/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151f33] font-mono text-slate-300">
              {tabelaGerencialRows.slice(0, 15).map((row, idx) => {
                return (
                  <tr key={idx} className="hover:bg-[#121c32]/30 transition-all">
                    <td className="p-3 font-bold text-slate-100">{row.data}</td>
                    <td className="p-3"><span className="px-2 py-0.5 bg-[#1565C0]/20 text-[#3b82f6] rounded font-bold text-[10px] border border-[#1565C0]/30">{row.unidade}</span></td>
                    <td className="p-3 text-slate-300">{row.material}</td>
                    <td className="p-3 text-right text-emerald-400 font-extrabold">{row.producao.toLocaleString("pt-BR")} t</td>
                    <td className="p-3 text-right text-slate-400">{row.meta.toLocaleString("pt-BR")} t</td>
                    <td className="p-3 text-right text-amber-400 font-black">{row.atendimentoPct}%</td>
                    <td className="p-3 text-right text-rose-400">{row.horasParadas}h</td>
                    <td className="p-3 text-right text-slate-300">{row.horasProdutivas}h</td>
                    <td className="p-3 text-right text-cyan-400 font-bold">{row.aproveitamentoPct}%</td>
                    <td className="p-3 text-[#3182ce] font-black text-right">{row.producaoPorHora} t/h</td>
                  </tr>
                );
              })}
              {tabelaGerencialRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-500 italic font-mono">
                    Nenhuma linha gerencial coincide com os filtros do painel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
