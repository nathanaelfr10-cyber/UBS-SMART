export interface User {
  id: string;
  nome: string;
  matricula: string;
  funcao: "Operador" | "Líder" | "Supervisor" | "Coordenador" | "Administrador";
  turno: string;
  unidade: string;
  email: string;
  createdAt?: string;
  status?: "Ativo" | "Inativo";
}

export interface Ubs {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  responsavel: string;
  status: "Ativa" | "Inativa";
  metaDiaria: number;
  createdAt?: string;
}

export interface Equipment {
  id: string;
  nome: string;
  processo: string;
  setor: string;
  unidade: string;
  fabricante: string;
  modelo: string;
  status: "Ativo" | "Inativo" | "Manutenção" | "Arquivado";
  createdAt?: string;
  criticidade?: "Baixa" | "Média" | "Alta" | "Crítica";
  observacoes?: string;
  codigoInterno?: string;
}

export interface StopRecord {
  id: string;
  ubs: string;
  processo: string;
  equipamentoId: string;
  equipamentoNome: string;
  operador: string;
  dataInicio: string;
  horaInicio: string;
  dataFim: string | null;
  horaFim: string | null;
  motivo: string;
  categoria: "Mecânica" | "Elétrica" | "Operacional" | "Processo" | "Limpeza" | "Troca de cultivar" | "Logística" | "Programada" | "Outros";
  observacao: string;
  tempoParadoMinutos: number;
  tempoProdutivoMinutos: number;
  impactouProducao: boolean;
  createdAt?: string;
}

export interface ProductionRecord {
  id: string;
  material: string;
  cultivar: string;
  lote: string;
  quantidade: number;
  processo: string;
  operador: string;
  ubs: string;
  dataRegistro: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  usuario: string;
  data: string;
  hora: string;
  acao: string;
  detalhes: string;
}

export interface DashboardCounters {
  eficienciaPct: number;
  disponibilidadePct: number;
  producaoTotal: number;
  producaoHoje: number;
  horasProdutivas: number;
  horasParadas: number;
  mtbf: number;
  mttr: number;
  paradasContagem: number;
}

export interface RankingEquipment {
  nome: string;
  minutos: number;
  horas: number;
  quantidadeParadas: number;
}

export interface RankingCausa {
  categoria: string;
  minutos: number;
  horas: number;
}

export interface TimelineData {
  data: string;
  total: number;
}

export interface DashboardStats {
  contadores: DashboardCounters;
  rankingEquipamentos: RankingEquipment[];
  rankingCausas: RankingCausa[];
  producaoTimeline: TimelineData[];
}

export interface DailyProductionRecord {
  id: string;
  unidade: string;
  data: string; // YYYY-MM-DD
  material: string; // Soja, Milho, etc.
  quantidadeToneladas: number;
  operador: string;
  hora: string; // HH:MM or HH:MM:SS
  createdAt?: string;
}
