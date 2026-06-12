import { useState, useMemo } from "react";
import { 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  SlidersHorizontal,
  Eraser,
  Tag,
  Wrench,
  UserCheck,
  Sprout,
  Activity
} from "lucide-react";
import { GlobalFilters } from "../utils/filterUtils";

interface FilterPanelProps {
  filters: GlobalFilters;
  setFilters: (filters: GlobalFilters | ((prev: GlobalFilters) => GlobalFilters)) => void;
  allEquipments: any[];
  allDailyProductions: any[];
  allStops: any[];
  allProductions: any[];
}

export default function FilterPanel({
  filters,
  setFilters,
  allEquipments,
  allDailyProductions,
  allStops,
  allProductions
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Dynamic Equipment listing
  const equipmentOptions = useMemo(() => {
    const names = new Set<string>();
    allEquipments.forEach(eq => {
      if (eq.nome) names.add(eq.nome);
    });
    return Array.from(names).sort();
  }, [allEquipments]);

  // Dynamic Operators listing
  const operatorOptions = useMemo(() => {
    const list = new Set<string>();
    allDailyProductions.forEach(p => { if (p.operador) list.add(p.operador); });
    allStops.forEach(s => { if (s.operador) list.add(s.operador); });
    allProductions.forEach(pr => { if (pr.operador) list.add(pr.operador); });
    return Array.from(list).sort();
  }, [allDailyProductions, allStops, allProductions]);

  // Handle preset relative periods
  const handlePeriodPreset = (preset: string) => {
    setFilters(prev => ({
      ...prev,
      periodo: preset,
      // If choosing a preset, we sync dates with standard defaults to keep UI elegant
      ...(preset === "Todo o Período" && { safra: "Todas" })
    }));
  };

  const handleCustomDateChange = (field: "dataInicial" | "dataFinal", val: string) => {
    setFilters(prev => ({
      ...prev,
      periodo: "Customizado",
      [field]: val
    }));
  };

  const handleReset = () => {
    setFilters({
      unidade: "Todas",
      periodo: "Todo o Período",
      dataInicial: "2026-01-01",
      dataFinal: "2026-12-31",
      visaoAgrupamento: "Diário",
      safra: "Todas",
      material: "Todos",
      equipamentoId: "Todos",
      operador: "Todos"
    });
  };

  // Human readable active filter description
  const activeFiltersSummary = useMemo(() => {
    const tokens = [];
    if (filters.unidade !== "Todas") tokens.push(`🏢 ${filters.unidade}`);
    else tokens.push("🏢 Todas UBS");
    
    tokens.push(`📅 ${filters.periodo}`);
    if (filters.periodo === "Customizado") {
      tokens.push(`(${filters.dataInicial} ate ${filters.dataFinal})`);
    }

    if (filters.visaoAgrupamento !== "Diário") {
      tokens.push(`📆 Visao: ${filters.visaoAgrupamento}`);
    }

    if (filters.material !== "Todos") tokens.push(`🌱 ${filters.material}`);
    if (filters.equipamentoId !== "Todos") tokens.push(`🛠️ ${filters.equipamentoId}`);
    if (filters.operador !== "Todos") tokens.push(`👤 Op: ${filters.operador}`);
    if (filters.safra !== "Todas") tokens.push(`🌱 Safra: ${filters.safra}`);

    return tokens.join(" | ");
  }, [filters]);

  return (
    <section className="bg-[#0a0f1d] rounded-2xl border border-[#151f33] shadow-lg overflow-hidden transition-all duration-300">
      
      {/* HEADER BAR (COCKPIT CONTROLS SUMMARY VIEW) */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`px-5 py-4 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer bg-[#121c32]/50 hover:bg-[#121c32]/80 transition-all gap-3 ${isOpen ? "border-b border-[#151f33]" : ""}`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1565C0]/10 rounded-xl border border-[#1565C0]/20 text-[#1565C0]">
            <SlidersHorizontal className="w-5 h-5 text-[#1565C0]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider flex flex-wrap items-center gap-2">
              PAINEL DE FILTROS OPERACIONAIS AVANÇADOS
              <span className="px-2 py-0.5 text-[9px] font-mono tracking-widest font-black bg-[#1565C0] text-white rounded uppercase animate-pulse">
                Ativo
              </span>
              {isOpen ? (
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#1565C0]/15 text-blue-300 border border-[#1565C0]/35 rounded uppercase">
                  Filtros Expandidos
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[9px] font-mono font-extrabold bg-[#00c853]/15 text-[#00c853] border border-[#00c853]/35 rounded uppercase animate-bounce">
                  ✨ Clique para Abrir
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-450 font-mono mt-0.5 max-w-xl md:max-w-2xl truncate">
              {activeFiltersSummary}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase font-black bg-[#070a13] hover:bg-[#121c32] text-slate-300 border border-[#151f33] rounded-lg transition-all"
          >
            <Eraser className="w-3.5 h-3.5" />
            Limpar
          </button>
          
          <div className="text-slate-500">
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* FILTER COLLAPSIBLE MATRIX */}
      {isOpen && (
        <div className="p-5 space-y-6 animate-fade-in bg-[#0a0f1d] border-t border-[#151f33]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* COLUMN 1: UNIT & MATERIAL */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  🏢 Unidade Matriz ou Filial
                </label>
                <select
                  value={filters.unidade}
                  onChange={(e) => setFilters(prev => ({ ...prev, unidade: e.target.value }))}
                  className="w-full bg-[#070a13] text-slate-100 font-extrabold text-xs rounded-lg py-2.5 px-3 border border-[#151f33] focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer"
                >
                  <option value="Todas">Todas as UBS (Consolidado)</option>
                  <option value="UBS-MG">UBS-MG (Minas Gerais)</option>
                  <option value="UBS-GO">UBS-GO (Goiás)</option>
                  <option value="UBS-BA">UBS-BA (Bahia)</option>
                  <option value="UBS-TO">UBS-TO (Tocantins)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  🌾 Cultura / Material
                </label>
                <div className="relative">
                  <select
                    value={filters.material}
                    onChange={(e) => setFilters(prev => ({ ...prev, material: e.target.value }))}
                    className="w-full bg-[#070a13] text-slate-100 font-extrabold text-xs rounded-lg py-2.5 px-3 border border-[#151f33] focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer"
                  >
                    <option value="Todos">Todos os materiais</option>
                    <option value="Soja">Soja</option>
                    <option value="Milho">Milho</option>
                    <option value="Sorgo">Sorgo</option>
                    <option value="Feijão">Feijão</option>
                    <option value="Algodão">Algodão</option>
                  </select>
                </div>
              </div>
            </div>

            {/* COLUMN 2: PERIOD PRESETS */}
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-mono">
                📅 Período (Botões Rápidos)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Hoje", "Ontem", 
                  "Últimos 7 Dias", "Últimos 15 Dias", 
                  "Últimos 30 Dias", "Mês Atual", 
                  "Mês Anterior", "Safra Atual",
                  "Todo o Período"
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePeriodPreset(preset)}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded text-left transition-all truncate border cursor-pointer ${
                      filters.periodo === preset
                        ? "bg-[#1565C0] text-white border-transparent shadow shadow-indigo-600/30 font-extrabold"
                        : "bg-[#070a13] text-slate-300 border-[#151f33] hover:bg-[#121c32]"
                    }`}
                  >
                    📅 {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* COLUMN 3: CUSTOM RANGE & GROUPING VIEW */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  📆 Período Personalizado
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[8px] text-slate-450 block mb-1 font-sans uppercase font-bold">Data Inicial</span>
                    <input
                      type="date"
                      value={filters.dataInicial}
                      onChange={(e) => handleCustomDateChange("dataInicial", e.target.value)}
                      className="w-full bg-[#070a13] text-slate-100 text-[11px] font-bold rounded p-1.5 border border-[#151f33] focus:outline-none focus:ring-1 focus:ring-[#1565C0]"
                    />
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-450 block mb-1 font-sans uppercase font-bold">Data Final</span>
                    <input
                      type="date"
                      value={filters.dataFinal}
                      onChange={(e) => handleCustomDateChange("dataFinal", e.target.value)}
                      className="w-full bg-[#070a13] text-slate-100 text-[11px] font-bold rounded p-1.5 border border-[#151f33] focus:outline-none focus:ring-1 focus:ring-[#1565C0]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  📆 Agrupamento / Visão Temporal
                </label>
                <select
                  value={filters.visaoAgrupamento}
                  onChange={(e) => setFilters(prev => ({ ...prev, visaoAgrupamento: e.target.value as any }))}
                  className="w-full bg-[#070a13] text-slate-100 font-extrabold text-xs rounded-lg py-2.5 px-3 border border-[#151f33] focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer"
                >
                  <option value="Diário">📆 Diário (Visão em Tempo Real)</option>
                  <option value="Quinzenal">📆 Quinzenal (Agrupar 1ª/2ª Qz)</option>
                  <option value="Mensal">📆 Mensal (Mês a Mês)</option>
                  <option value="Safra">🌱 Safra (Agr. safras colheitas)</option>
                  <option value="Todo o Período">📈 Todo o Período (Consolidado)</option>
                </select>
              </div>
            </div>

            {/* COLUMN 4: EQUIPMENT, OPERATOR & SAFRA */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  ⚙️ Equipamento / Ativo Crítico
                </label>
                <select
                  value={filters.equipamentoId}
                  onChange={(e) => setFilters(prev => ({ ...prev, equipamentoId: e.target.value }))}
                  className="w-full bg-[#070a13] text-slate-100 font-extrabold text-xs rounded-lg py-2.5 px-3 border border-[#151f33] focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer"
                >
                  <option value="Todos">Todos os Equipamentos</option>
                  {equipmentOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-mono">
                    👤 Operador
                  </label>
                  <select
                    value={filters.operador}
                    onChange={(e) => setFilters(prev => ({ ...prev, operador: e.target.value }))}
                    className="w-full bg-[#070a13] text-slate-100 font-black text-[11px] rounded-lg py-2 px-1 text-ellipsis overflow-hidden border border-[#151f33] focus:outline-none focus:ring-1 focus:ring-[#1565C0] cursor-pointer"
                  >
                    <option value="Todos font-sans">Todos</option>
                    {operatorOptions.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-mono">
                    🌱 Safra
                  </label>
                  <select
                    value={filters.safra}
                    onChange={(e) => setFilters(prev => ({ ...prev, safra: e.target.value }))}
                    className="w-full bg-[#070a13] text-slate-100 font-black text-[11px] rounded-lg py-2 px-1 border border-[#151f33] focus:outline-none focus:ring-1 focus:ring-[#1565C0] cursor-pointer"
                  >
                    <option value="Todas">Todas</option>
                    <option value="2025/2026">2025/2026</option>
                    <option value="2026/2027">2026/2027</option>
                    <option value="2027/2028">2027/2028</option>
                  </select>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </section>
  );
}
