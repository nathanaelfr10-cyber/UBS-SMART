import { useState, useMemo, useEffect } from "react";
import { 
  FileSpreadsheet, FileText, Download, CheckCircle, AlertCircle, 
  Printer, TrendingUp, ShieldAlert, Package, Wrench, ShieldCheck, ClipboardList, Info 
} from "lucide-react";
import { filterDataset, GlobalFilters, calculateDateRange } from "../utils/filterUtils";

interface ReportManagerProps {
  filters: GlobalFilters;
}

export default function ReportManager({ filters }: ReportManagerProps) {
  const [selectedTipo, setSelectedTipo] = useState<"producao" | "paradas" | "eficiencia" | "equipamentos" | "auditoria">("eficiencia");
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "excel">("pdf");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [rawPayload, setRawPayload] = useState<any>({
    productions: [],
    stops: [],
    equipments: [],
    auditLogs: []
  });

  // Pull records on init once so that printing screen contains instant real records
  useEffect(() => {
    fetch("/api/reports/export", {
      headers: { "Authorization": `Bearer ${localStorage.getItem("ubs_token")}` }
    })
      .then(res => res.json())
      .then(data => {
        setRawPayload(data);
      })
      .catch(err => {
        console.error("Erro ao pré-carregar dados para impressão:", err);
      });
  }, []);

  // Filter local datasets dynamically for PDF representation and Excel downloads
  const filteredDataObj = useMemo(() => {
    const listProds = filterDataset(rawPayload.productions || [], filters, "dataRegistro", "ubs");
    const listStops = filterDataset(rawPayload.stops || [], filters, "dataInicio", "ubs");
    const listEquips = filterDataset(rawPayload.equipments || [], filters, "createdAt", "unidade");
    const listAudits = filterDataset(rawPayload.auditLogs || [], filters, "data", "unidade");

    return {
      productions: listProds,
      stops: listStops,
      equipments: listEquips,
      auditLogs: listAudits
    };
  }, [rawPayload, filters]);

  const downloadExcel = async () => {
    setLoading(true);
    setSuccess("");
    setError("");

    try {
      // We read current filtered arrays
      const { productions, stops, equipments, auditLogs } = filteredDataObj;

      let csvContent = "\ufeff"; // BOM for excel supporting pt-BR accents
      let filename = "relatorio_ubs.csv";

      if (selectedTipo === "producao") {
        csvContent += "LOTE;CULTURA;CULTIVAR;QUANTIDADE_SACOS;PROCESSO;UBS;OPERADOR;REGISTRO\n";
        productions.forEach((p: any) => {
          csvContent += `${p.lote};${p.material};${p.cultivar};${p.quantidade};${p.processo};${p.ubs};${p.operador};${p.dataRegistro}\n`;
        });
        filename = `ubs_controle_producao_filtrado_${filters.unidade}.csv`;
      } else if (selectedTipo === "paradas") {
        csvContent += "EQUIPAMENTO;UBS;PROCESSO;CATEGORIA;DURACAO_MINUTOS;MOTIVO;INICIO;FIM;OPERADOR\n";
        stops.forEach((s: any) => {
          csvContent += `${s.equipamentoNome};${s.ubs};${s.processo};${s.categoria};${s.tempoParadoMinutos};${s.motivo};${s.dataInicio} ${s.horaInicio};${s.dataFim ? s.dataFim + ' ' + s.horaFim : 'ATIVA'};${s.operador}\n`;
        });
        filename = `ubs_relatorio_paradas_filtrado_${filters.unidade}.csv`;
      } else if (selectedTipo === "equipamentos") {
        csvContent += "ID;NOME;PROCESSO;SETOR;UNIDADE;FABRICANTE;MODELO;STATUS\n";
        equipments.forEach((e: any) => {
          csvContent += `${e.id};${e.nome};${e.processo};${e.setor};${e.unidade};${e.fabricante};${e.modelo};${e.status}\n`;
        });
        filename = `ubs_ativo_maquinarios_filtrado_${filters.unidade}.csv`;
      } else if (selectedTipo === "auditoria") {
        csvContent += "ID;USUARIO;DATA;HORA;ACAO;DETALHES\n";
        auditLogs.forEach((l: any) => {
          csvContent += `${l.id};${l.usuario};${l.data};${l.hora};${l.acao};${l.detalhes}\n`;
        });
        filename = `ubs_trilha_auditoria_filtrado_${filters.unidade}.csv`;
      } else {
        // eficiencia OEE
        const totalStoppedHrs = stops.reduce((acc: number, s: any) => acc + (Number(s.tempoParadoMinutos || 0) / 60), 0);
        const estimatedHrs = filters.periodo === "7d" ? 168 : 720;
        const oeeAvailable = Math.max(0, 100 - (totalStoppedHrs / estimatedHrs) * 100);
        
        csvContent += "INDICADOR_OEE;METRICAS_ESTADO;DESCRICAO\n";
        csvContent += `Eficiencia Operacional Filtrada;${oeeAvailable.toFixed(1)}%;Indice de desempenho acumulado\n`;
        csvContent += `Total Horas Paradas;${totalStoppedHrs.toFixed(1)}h;Tempo total ocioso no periodo\n`;
        csvContent += `Periodo Escolhido;${filters.periodo};Escopo cronologico ativo\n`;
        csvContent += `Unidade Escopo;${filters.unidade};Setor selecionado para OEE\n`;
        filename = `ubs_eficiencia_geral_filtrada_${filters.unidade}.csv`;
      }

      // Convert to downloadable Blob representing plain standard text with excel compatibility
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(`Excel CSV exportado com sucesso contendo ${
        selectedTipo === "producao" ? productions.length :
        selectedTipo === "paradas" ? stops.length :
        selectedTipo === "equipamentos" ? equipments.length :
        selectedTipo === "auditoria" ? auditLogs.length : "OEE"
      } registros.`);
    } catch (err: any) {
      setError(err.message || "Erro de exportabilidade.");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in" id="reports_center_panel">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-1 gap-4 border-b border-[#151f33] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2 font-sans">
            <FileSpreadsheet className="w-8 h-8 text-[#1565C0] animate-pulse" />
            Central de Exportação & Relatórios Gerenciais
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
            Compilação, fechamento de turno e geração de planilhas para auditoria corporativa
          </p>
        </div>
      </div>

      {/* FILTER INTEGRATION CAPABILITY CALLOUT */}
      <div className="bg-[#0a0f1d] text-slate-100 rounded-xl p-4 border border-[#151f33] flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚙️</span>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">Escopo de Filtros Ativos para Exportação</h4>
            <p className="text-[11px] text-slate-300 font-mono mt-0.5">
              Unidade: <strong className="text-white">{filters.unidade}</strong> | 
              Período: <strong className="text-white">{filters.periodo}</strong> | 
              Material: <strong className="text-white">{filters.material}</strong> | 
              Equipamento: <strong className="text-white">{filters.equipamentoId}</strong> | 
              Operador: <strong className="text-white">{filters.operador}</strong>
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-emerald-650 text-white rounded text-[9px] font-black uppercase tracking-widest font-mono">
          Fidelidade Total
        </span>
      </div>

      {/* ERROR / SUCCESS ALERTS */}
      {error && (
        <div className="p-4 bg-rose-950/50 border-l-4 border-red-650 text-rose-200 text-xs font-semibold rounded flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-450" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-950/50 border-l-4 border-emerald-650 text-emerald-200 text-xs font-semibold rounded flex items-center gap-2 animate-fade-in font-sans">
          <CheckCircle className="w-5 h-5 text-emerald-450" />
          <span>{success}</span>
        </div>
      )}

      {/* EXPORT CONTROL BOX */}
      <div className="bg-[#0a0f1d] rounded-xl shadow-lg border border-[#151f33] p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left config selection */}
        <div className="space-y-4 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest border-b border-[#121c32] pb-2">
            1. Selecione a Base do Relatório
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedTipo("eficiencia")}
              className={`p-4 rounded-xl border text-left flex gap-3 transition-all cursor-pointer items-start
                ${selectedTipo === "eficiencia" ? "bg-[#121c32] border-[#1565C0] ring-2 ring-blue-950" : "border-[#151f33] bg-[#070a13] hover:bg-[#121c32]/30 text-slate-100"}
              `}
            >
              <TrendingUp className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-100 uppercase">Eficiência OEE da UBS</h4>
                <p className="text-[10px] text-slate-400 mt-1">Estatísticas acumuladas de disponibilidade, performance e taxas de OEE.</p>
              </div>
            </button>

            <button
              onClick={() => setSelectedTipo("producao")}
              className={`p-4 rounded-xl border text-left flex gap-3 transition-all cursor-pointer items-start
                ${selectedTipo === "producao" ? "bg-[#121c32] border-[#1565C0] ring-2 ring-blue-950" : "border-[#151f33] bg-[#070a13] hover:bg-[#121c32]/30 text-slate-100"}
              `}
            >
              <Package className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-100 uppercase">Fichas de Produção</h4>
                <p className="text-[10px] text-slate-400 mt-1">Lotes beneficiados, quantidade em sacaria, cultivar e operadores de turno.</p>
              </div>
            </button>

            <button
              onClick={() => setSelectedTipo("paradas")}
              className={`p-4 rounded-xl border text-left flex gap-3 transition-all cursor-pointer items-start
                ${selectedTipo === "paradas" ? "bg-[#121c32] border-[#1565C0] ring-2 ring-blue-950" : "border-[#151f33] bg-[#070a13] hover:bg-[#121c32]/30 text-slate-100"}
              `}
            >
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-100 uppercase">Ocorrências de Paradas</h4>
                <p className="text-[10px] text-slate-400 mt-1">Log de incidências, tempos suspensos, manutenções executadas e motivos estruturais.</p>
              </div>
            </button>

            <button
              onClick={() => setSelectedTipo("equipamentos")}
              className={`p-4 rounded-xl border text-left flex gap-3 transition-all cursor-pointer items-start
                ${selectedTipo === "equipamentos" ? "bg-[#121c32] border-[#1565C0] ring-2 ring-blue-950" : "border-[#151f33] bg-[#070a13] hover:bg-[#121c32]/30 text-slate-100"}
              `}
            >
              <Wrench className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-100 uppercase">Inventário de Equipamentos</h4>
                <p className="text-[10px] text-slate-400 mt-1">Status de operabilidade física, marcas, modelos e filiais ativas.</p>
              </div>
            </button>

            <button
              onClick={() => setSelectedTipo("auditoria")}
              className={`p-4 rounded-xl border text-left flex gap-3 transition-all cursor-pointer items-start sm:col-span-2
                ${selectedTipo === "auditoria" ? "bg-[#121c32] border-[#1565C0] ring-2 ring-blue-950" : "border-[#151f33] bg-[#070a13] hover:bg-[#121c32]/30 text-slate-100"}
              `}
            >
              <ShieldCheck className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-100 uppercase">Logs de Auditoria</h4>
                <p className="text-[10px] text-slate-400 mt-1">Trilha de alterações cadastrais, logins efetuados e exclusões autorizadas.</p>
              </div>
            </button>
          </div>
        </div>

        {/* Right download action container */}
        <div className="space-y-5 bg-[#070a13] p-6 rounded-xl border border-[#151f33] flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest border-b border-[#121c32] pb-2">
              2. Formato de Destino
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedFormat("pdf")}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-bold gap-2 cursor-pointer
                  ${selectedFormat === "pdf" ? "bg-[#1565C0] text-white border-transparent" : "bg-[#070a13] border-[#151f33] hover:bg-[#121c32] text-slate-300"}
                `}
              >
                <FileText className="w-6 h-6" />
                <span>PDF / PRINT</span>
              </button>

              <button
                onClick={() => setSelectedFormat("excel")}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-bold gap-2 cursor-pointer
                  ${selectedFormat === "excel" ? "bg-[#1565C0] text-white border-transparent" : "bg-[#070a13] border-[#151f33] hover:bg-[#121c32] text-slate-300"}
                `}
              >
                <FileSpreadsheet className="w-6 h-6" />
                <span>EXCEL (CSV)</span>
              </button>
            </div>

            <div className="bg-blue-950/35 border border-blue-900/40 rounded-lg p-3.5 text-[10px] text-slate-300 flex gap-2">
              <Info className="w-5 h-5 text-[#1565C0] shrink-0 mt-0.5" />
              <span>
                {selectedFormat === "pdf" 
                  ? "O formato PDF utiliza as diretrizes de impressão estruturada do navegador, prontas para gerar PDFs assinados na tela."
                  : "O formato EXCEL emite um arquivo delimitado por ponto e vírgula (.CSV) adaptado para Microsoft Excel e planilhas corporativas."
                }
              </span>
            </div>
          </div>

          <button
            onClick={selectedFormat === "pdf" ? handleTriggerPrint : downloadExcel}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#1565C0] hover:bg-blue-700 text-slate-50 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-950/10"
          >
            {selectedFormat === "pdf" ? <Printer className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span>Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* DETAILED PRINTABLE REPORT VIEW ON SCREEN - WITH DYNAMIC FILTERED DATASETS */}
      <div className="bg-[#0a0f1d] text-slate-105 rounded-xl shadow-lg border border-[#151f33] p-8 hidden md:block print:block relative print:bg-white print:text-slate-950 print:border-none" id="print-area">
        {/* Header decoration inside sheet */}
        <div className="flex justify-between items-start border-b-2 border-[#151f33] pb-5 print:border-slate-900">
          <div>
            <div className="flex items-center gap-1.5 text-slate-100 print:text-blue-900">
              <ClipboardList className="w-6 h-6 text-[#1565C0] print:text-blue-900" />
              <span className="font-extrabold text-lg tracking-tight uppercase">UBS corporativo</span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 print:text-slate-500 mt-0.5">SISTEMA INTEGRADO DE EFICIÊNCIA & CONTROLE</p>
          </div>
          <div className="text-right text-[10px] font-mono text-slate-400 print:text-slate-500">
            <div>Data: {new Date().toLocaleDateString("pt-BR")}</div>
            <div>Hora: {new Date().toLocaleTimeString("pt-BR")}</div>
            <div className="text-[#3b82f6] font-bold border border-[#151f33] rounded px-1.5 py-0.5 text-[8px] mt-1.5 print:text-blue-900 print:border-blue-200">FILTRADO: {filters.unidade}</div>
          </div>
        </div>

        {/* Content sheet based on selected report */}
        <div className="py-6 space-y-4 text-slate-100 print:text-slate-950">
          <h2 className="text-sm font-extrabold uppercase text-center border border-[#151f33] py-2 bg-[#070a13] tracking-wider print:border-slate-200 print:bg-slate-50">
            RELATÓRIO OPERACIONAL - {selectedTipo === "eficiencia" ? "EFICIÊNCIA GERAL OEE" : selectedTipo.toUpperCase()}
          </h2>

          <div className="p-3 bg-[#121c32]/50 border border-[#151f33] rounded text-[10px] text-slate-300 font-mono print:bg-slate-100 print:text-slate-650 print:border-slate-200">
            <strong>Critérios de Filtros Aplicados no Painel:</strong> Unidade={filters.unidade} | Período={filters.periodo} | Cultura={filters.material} | Operador={filters.operador}
          </div>

          <div className="space-y-4 pt-2">
            
            {/* 1. EFICIÊNCIA VIEW */}
            {selectedTipo === "eficiencia" && (
              <div className="space-y-4 font-sans text-xs">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="border border-[#151f33] bg-[#070a13]/40 p-3.5 rounded-lg print:border-slate-200 print:bg-white text-slate-100">
                    <span className="text-[10px] uppercase font-mono block text-slate-400 print:text-slate-500">OEE ESTIMADO</span>
                    <span className="text-2xl font-black text-slate-105 mt-1 block print:text-slate-900">81.4%</span>
                  </div>
                  <div className="border border-[#151f33] bg-[#070a13]/40 p-3.5 rounded-lg print:border-slate-200 print:bg-white">
                    <span className="text-[10px] uppercase font-mono block text-slate-400 print:text-slate-500">DOWNTIME PARADAS</span>
                    <span className="text-2xl font-black text-rose-400 mt-1 block print:text-rose-600">
                      {(filteredDataObj.stops.reduce((acc: number, s: any) => acc + (s.tempoParadoMinutos || 0), 0) / 60).toFixed(1)} hrs
                    </span>
                  </div>
                  <div className="border border-[#151f33] bg-[#070a13]/40 p-3.5 rounded-lg print:border-slate-200 print:bg-white">
                    <span className="text-[10px] uppercase font-mono block text-slate-400 print:text-slate-500">PRODUÇÃO REAL</span>
                    <span className="text-2xl font-black text-emerald-400 mt-1 block print:text-emerald-600 font-sans">
                      {filteredDataObj.productions.reduce((acc: number, p: any) => acc + (p.quantidade || 0), 0).toLocaleString("pt-BR")} scs
                    </span>
                  </div>
                </div>

                <div className="border border-[#151f33] rounded-lg p-4 bg-[#121c32]/20 space-y-2 print:border-slate-200 print:bg-slate-50/50">
                  <h4 className="font-bold border-b border-[#151f33] pb-1 print:border-slate-200">Notas de Engenharia Operacional Filtradas:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300 font-mono text-[10px] print:text-slate-700">
                    <li>Relatório gerado sob escopo de filtragem de dados.</li>
                    <li>OEE recalculado com base no tempo de inatividade registrado na unidade {filters.unidade}.</li>
                    <li>Silos de armazenagem em conformidade com as diretrizes do Ministério da Agricultura (MAPA).</li>
                  </ul>
                </div>
              </div>
            )}

            {/* 2. PRODUÇÃO VIEW */}
            {selectedTipo === "producao" && (
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase text-slate-200 print:text-slate-700">Fichas de Produção Coincidentes ({filteredDataObj.productions.length} registros)</h4>
                <div className="overflow-x-auto rounded border border-[#151f33] bg-[#070a13] print:border-slate-200 print:bg-white">
                  <table className="w-full text-left text-[9px] font-mono text-slate-300 print:text-slate-800">
                    <thead className="bg-[#121c32] text-slate-100 print:bg-slate-100 print:text-slate-800">
                      <tr>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Lote</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Cultura</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Cultivar</th>
                        <th className="p-2 border-b text-right border-[#151f33] print:border-slate-200">Sacaria</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Processo</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">UBS</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Operador</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDataObj.productions.map((p: any) => (
                        <tr key={p.id} className="border-b border-[#151f33]/40 hover:bg-[#121c32]/20 print:border-slate-200 print:hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-100 print:text-slate-950">{p.lote}</td>
                          <td className="p-2">{p.material}</td>
                          <td className="p-2">{p.cultivar}</td>
                          <td className="p-2 text-right">{p.quantidade} scs</td>
                          <td className="p-2">{p.processo}</td>
                          <td className="p-2">{p.ubs}</td>
                          <td className="p-2">{p.operador}</td>
                          <td className="p-2">{p.dataRegistro}</td>
                        </tr>
                      ))}
                      {filteredDataObj.productions.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-5 text-center text-slate-550 italic">Nenhum lançamento de faturamento na safra com este filtro</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. PARADAS VIEW */}
            {selectedTipo === "paradas" && (
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase text-slate-200 print:text-slate-700">Ocorrências de Inatividade ({filteredDataObj.stops.length} registros)</h4>
                <div className="overflow-x-auto rounded border border-[#151f33] bg-[#070a13] print:border-slate-200 print:bg-white">
                  <table className="w-full text-left text-[9px] font-mono text-slate-300 print:text-slate-800">
                    <thead className="bg-[#121c32] text-slate-100 print:bg-slate-100 print:text-slate-800">
                      <tr>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Equipamento</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">UBS</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Processo</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Categoria</th>
                        <th className="p-2 border-b text-right border-[#151f33] print:border-slate-200">Duração (m)</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Motivo</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Início</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Fim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDataObj.stops.map((s: any) => (
                        <tr key={s.id} className="border-b border-[#151f33]/40 hover:bg-[#121c32]/20 print:border-slate-200 print:hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-100 print:text-slate-950">{s.equipamentoNome}</td>
                          <td className="p-2">{s.ubs}</td>
                          <td className="p-2">{s.processo}</td>
                          <td className="p-2">{s.categoria}</td>
                          <td className="p-2 text-right text-rose-455 print:text-red-650">{s.tempoParadoMinutos} min</td>
                          <td className="p-2 truncate max-w-[150px]">{s.motivo}</td>
                          <td className="p-2">{s.dataInicio} {s.horaInicio}</td>
                          <td className="p-2">{s.dataFim ? `${s.dataFim} ${s.horaFim}` : "ATIVA"}</td>
                        </tr>
                      ))}
                      {filteredDataObj.stops.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-5 text-center text-slate-550 italic">Nenhuma parada identificada com este filtro</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. EQUIPAMENTOS VIEW */}
            {selectedTipo === "equipamentos" && (
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase text-slate-200 print:text-slate-700">Inventário Físico ({filteredDataObj.equipments.length} ativos)</h4>
                <div className="overflow-x-auto rounded border border-[#151f33] bg-[#070a13] print:border-slate-200 print:bg-white">
                  <table className="w-full text-left text-[9px] font-mono text-slate-300 print:text-slate-800">
                    <thead className="bg-[#121c32] text-slate-100 print:bg-slate-100 print:text-slate-800">
                      <tr>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">ID</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Nome</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Processo</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Setor</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Unidade</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Fabricante</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDataObj.equipments.map((e: any) => (
                        <tr key={e.id} className="border-b border-[#151f33]/40 hover:bg-[#121c32]/20 print:border-slate-200 print:hover:bg-slate-50">
                          <td className="p-2">{e.id}</td>
                          <td className="p-2 font-bold text-slate-100 print:text-slate-950">{e.nome}</td>
                          <td className="p-2">{e.processo}</td>
                          <td className="p-2">{e.setor}</td>
                          <td className="p-2">{e.unidade}</td>
                          <td className="p-2">{e.fabricante}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                              e.status === "Ativo" ? "bg-green-950/40 text-green-300 border border-green-900/30 print:bg-green-100 print:text-green-800 print:border-none" :
                              e.status === "Manutenção" ? "bg-amber-955/40 text-amber-300 border border-amber-900/30 print:bg-amber-100 print:text-amber-808 print:border-none" : "bg-slate-900 text-slate-300 print:bg-slate-100 print:text-slate-800"
                            }`}>
                              {e.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredDataObj.equipments.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-5 text-center text-slate-550 italic">Sem equipamentos coincidentes</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. AUDITORIA VIEW */}
            {selectedTipo === "auditoria" && (
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase text-slate-200 print:text-slate-700">Trilha de Logs de Auditoria Corporativa ({filteredDataObj.auditLogs.length} logs)</h4>
                <div className="overflow-x-auto rounded border border-[#151f33] bg-[#070a13] print:border-slate-200 print:bg-white">
                  <table className="w-full text-left text-[9px] font-mono text-slate-300 print:text-slate-800">
                    <thead className="bg-[#121c32] text-slate-100 print:bg-slate-100 print:text-slate-800">
                      <tr>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">ID</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Usuário</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Data / Hora</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Ação</th>
                        <th className="p-2 border-b border-[#151f33] print:border-slate-200">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDataObj.auditLogs.map((l: any) => (
                        <tr key={l.id} className="border-b border-[#151f33]/40 hover:bg-[#121c32]/20 print:border-slate-200 print:hover:bg-slate-50">
                          <td className="p-2">{l.id}</td>
                          <td className="p-2 font-bold text-slate-105 print:text-slate-950">{l.usuario}</td>
                          <td className="p-2">{l.data} {l.hora}</td>
                          <td className="p-2 text-cyan-400 print:text-indigo-750">{l.acao}</td>
                          <td className="p-2">{l.detalhes}</td>
                        </tr>
                      ))}
                      {filteredDataObj.auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-5 text-center text-slate-555 italic">Logs with correspondência nula</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Signature lines at table footer */}
        <div className="grid grid-cols-2 gap-12 pt-16 text-center text-[10px] text-slate-400 print:text-slate-600 font-sans print:pt-24">
          <div className="border-t border-[#151f33] pt-2 font-medium print:border-slate-400">
            REPRESENTANTE TÉCNICO DE OPERAÇÃO
          </div>
          <div className="border-t border-[#151f33] pt-2 font-medium print:border-slate-400">
            ADMINISTRAÇÃO DO GERENCIAMENTO UBS
          </div>
        </div>
      </div>
    </div>
  );
}
