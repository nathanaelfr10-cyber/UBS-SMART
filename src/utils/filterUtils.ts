export interface GlobalFilters {
  unidade: string; // "Todas", "UBS-MG", "UBS-GO", "UBS-BA", "UBS-TO"
  periodo: string; // "Hoje", "Ontem", "Últimos 7 Dias", "Últimos 15 Dias", "Últimos 30 Dias", "Mês Atual", "Mês Anterior", "Safra Atual", "Todo o Período", "Customizado"
  dataInicial: string; // YYYY-MM-DD
  dataFinal: string; // YYYY-MM-DD
  visaoAgrupamento: "Diário" | "Quinzenal" | "Mensal" | "Safra" | "Todo o Período";
  safra: string; // "Todas", "2025/2026", "2026/2027", "2027/2028"
  material: string; // "Todos", "Soja", "Milho", "Sorgo", "Feijão", "Algodão"
  equipamentoId: string; // "Todos", or specific equip name
  operador: string; // "Todos", or specific operator name
}

export const initialFilters: GlobalFilters = {
  unidade: "Todas",
  periodo: "Todo o Período",
  dataInicial: "2026-01-01",
  dataFinal: "2026-12-31",
  visaoAgrupamento: "Diário",
  safra: "Todas",
  material: "Todos",
  equipamentoId: "Todos",
  operador: "Todos"
};

// Safra Ranges Map
export const SAFRA_RANGES: Record<string, { start: string; end: string }> = {
  "2025/2026": { start: "2025-07-01", end: "2026-06-30" },
  "2026/2027": { start: "2026-07-01", end: "2027-06-30" },
  "2027/2028": { start: "2027-07-01", end: "2028-06-30" }
};

// Calculate range from quick selection
export function calculateDateRange(
  periodo: string,
  customStart: string,
  customEnd: string,
  safra: string
): { start: string | null; end: string | null } {
  // Use today reference date 2026-06-12 as indicated by environment
  const today = new Date("2026-06-12");

  const formatDateStr = (d: Date) => {
    return d.toISOString().split("T")[0];
  };

  if (periodo === "Customizado") {
    return { start: customStart || null, end: customEnd || null };
  }

  if (periodo === "Safra Atual") {
    // Current safra for june 2026 is 2025/2026
    return SAFRA_RANGES["2025/2026"];
  }

  if (safra !== "Todas") {
    return SAFRA_RANGES[safra] || { start: null, end: null };
  }

  switch (periodo) {
    case "Hoje": {
      const s = formatDateStr(today);
      return { start: s, end: s };
    }
    case "Ontem": {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const s = formatDateStr(yesterday);
      return { start: s, end: s };
    }
    case "Últimos 7 Dias": {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      return { start: formatDateStr(start), end: formatDateStr(today) };
    }
    case "Últimos 15 Dias": {
      const start = new Date(today);
      start.setDate(today.getDate() - 15);
      return { start: formatDateStr(start), end: formatDateStr(today) };
    }
    case "Últimos 30 Dias": {
      const start = new Date(today);
      start.setDate(today.getDate() - 30);
      return { start: formatDateStr(start), end: formatDateStr(today) };
    }
    case "Mês Atual": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: formatDateStr(start), end: formatDateStr(end) };
    }
    case "Mês Anterior": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: formatDateStr(start), end: formatDateStr(end) };
    }
    case "Todo o Período":
    default:
      return { start: null, end: null };
  }
}

// Global Filter engine for any model array
export function filterDataset<T extends Record<string, any>>(
  list: T[],
  filters: GlobalFilters,
  dateField: string,
  unidadeField: string = "unidade"
): T[] {
  const { start, end } = calculateDateRange(
    filters.periodo,
    filters.dataInicial,
    filters.dataFinal,
    filters.safra
  );

  return list.filter((item) => {
    // 1. UBS filiais filter
    if (filters.unidade !== "Todas") {
      const val = item[unidadeField] || item["ubs"];
      if (val && val !== filters.unidade) {
        return false;
      }
    }

    // 2. Chronological range filter
    if (start || end) {
      const dateVal = item[dateField];
      if (dateVal) {
        if (start && dateVal < start) return false;
        if (end && dateVal > end) return false;
      }
    }

    // 3. Grain/Material filter
    if (filters.material !== "Todos") {
      const mat = item["material"] || item["cultura"];
      if (mat && mat.toLowerCase() !== filters.material.toLowerCase()) {
        return false;
      }
    }

    // 4. Equipment filter (only applies if item contains equipment fields)
    if (filters.equipamentoId !== "Todos") {
      const eqId = item["equipamentoId"] || item["equipamentoNome"] || item["nome"];
      if (
        eqId &&
        eqId.toString().toLowerCase() !== filters.equipamentoId.toLowerCase()
      ) {
        return false;
      }
    }

    // 5. Operator filter
    if (filters.operador !== "Todos") {
      const opName = item["operador"];
      if (
        opName &&
        !opName.toLowerCase().includes(filters.operador.toLowerCase())
      ) {
        return false;
      }
    }

    return true;
  });
}

// Get operator options
export function extractOperators(
  productions: any[],
  stops: any[],
  daily: any[]
): string[] {
  const ops = new Set<string>();
  [...productions, ...stops, ...daily].forEach((item) => {
    if (item.operador) ops.add(item.operador);
  });
  return Array.from(ops).sort();
}
