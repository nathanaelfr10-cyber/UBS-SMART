import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DB_FILE = path.join(process.cwd(), "data", "database.json");

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

export interface User {
  id: string;
  nome: string;
  matricula: string;
  funcao: string; // Operador, Líder, Supervisor, Coordenador, Administrador
  turno: string; // Turno A, Turno B, Turno C, Administrativo
  unidade: string; // e.g. UBS-MG, UBS-GO
  email: string;
  passwordHash: string;
  createdAt: string;
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
  createdAt: string;
}

export interface Equipment {
  id: string;
  nome: string;
  processo: string; // Recebimento, Secagem, Limpeza, Beneficiamento, Tratamento, Ensaque
  setor: string;
  unidade: string;
  fabricante: string;
  modelo: string;
  status: "Ativo" | "Inativo" | "Manutenção" | "Arquivado";
  createdAt: string;
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
  dataInicio: string; // YYYY-MM-DD
  horaInicio: string; // HH:MM
  dataFim: string | null; // YYYY-MM-DD
  horaFim: string | null; // HH:MM
  motivo: string;
  categoria: "Mecânica" | "Elétrica" | "Operacional" | "Processo" | "Limpeza" | "Troca de cultivar" | "Logística" | "Programada" | "Outros";
  observacao: string;
  tempoParadoMinutos: number; // calculated
  tempoProdutivoMinutos: number; // calculated range since last stop/shift
  impactouProducao: boolean;
  createdAt: string;
}

export interface ProductionRecord {
  id: string;
  material: string; // Soja, Milho, Algodão, Sorgo etc.
  cultivar: string;
  lote: string;
  quantidade: number; // em sacos
  processo: string; // Recebimento, Secagem, Limpeza, Beneficiamento, Tratamento, Ensaque
  operador: string;
  ubs: string;
  dataRegistro: string; // YYYY-MM-DD
  createdAt: string;
}

export interface DailyProductionRecord {
  id: string;
  unidade: string;
  data: string; // YYYY-MM-DD
  material: string; // Soja, Milho, Algodão, Sorgo etc.
  quantidadeToneladas: number;
  operador: string;
  hora: string; // HH:MM
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  usuario: string; // e.g. Email ou Nome
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM:SS
  acao: string; // Login, Logout, Inclusão de UBS, etc.
  detalhes: string;
}

export interface DatabaseSchema {
  users: User[];
  ubs: Ubs[];
  equipments: Equipment[];
  stops: StopRecord[];
  productions: ProductionRecord[];
  auditLogs: AuditLog[];
  dailyProductions: DailyProductionRecord[];
}

const defaultSchema: DatabaseSchema = {
  users: [],
  ubs: [],
  equipments: [],
  stops: [],
  productions: [],
  auditLogs: [],
  dailyProductions: []
};

// Singleton DB Class
class LocalDatabase {
  private data: DatabaseSchema = { ...defaultSchema };

  constructor() {
    this.load();
    if (this.data.users.length === 0) {
      this.seed();
    }
    this.ensureUbsMgEquipments();
  }

  private ensureUbsMgEquipments() {
    const ubsMgEquipments = [
      // Recebimento e Pré-Limpeza
      { nome: "ELEVADOR DA MOEGA", processo: "Recebimento", setor: "Recebimento e Pré-Limpeza" },
      { nome: "PRÉ-LIMPEZA", processo: "Limpeza", setor: "Recebimento e Pré-Limpeza" },
      { nome: "MESA PÓS-LIMPEZA", processo: "Limpeza", setor: "Recebimento e Pré-Limpeza" },
      { nome: "ROSCA DE DESCARTE", processo: "Limpeza", setor: "Recebimento e Pré-Limpeza" },
      { nome: "ELEVADOR DO ESPIRAL", processo: "Limpeza", setor: "Recebimento e Pré-Limpeza" },
      // Transporte Interno
      { nome: "FITA TRANSPORTADORA 01", processo: "Recebimento", setor: "Transporte Interno" },
      { nome: "FITA TRANSPORTADORA 02", processo: "Limpeza", setor: "Transporte Interno" },
      // Beneficiamento
      { nome: "PADRONIZADOR P1", processo: "Beneficiamento", setor: "Beneficiamento" },
      { nome: "PADRONIZADOR P2", processo: "Beneficiamento", setor: "Beneficiamento" },
      // Elevadores
      { nome: "ELEVADOR P1", processo: "Beneficiamento", setor: "Elevadores" },
      { nome: "ELEVADOR P2", processo: "Beneficiamento", setor: "Elevadores" },
      { nome: "ELEVADOR INTERMEDIÁRIO", processo: "Beneficiamento", setor: "Elevadores" },
      { nome: "ELEVADOR DE ENSAQUE", processo: "Ensaque", setor: "Elevadores" },
      // Mesas Densimétricas
      { nome: "MESA DENSIMÉTRICA 01", processo: "Beneficiamento", setor: "Mesas Densimétricas" },
      { nome: "MESA DENSIMÉTRICA 02", processo: "Beneficiamento", setor: "Mesas Densimétricas" },
      { nome: "MESA DENSIMÉTRICA 03", processo: "Beneficiamento", setor: "Mesas Densimétricas" },
      { nome: "MESA DENSIMÉTRICA 04", processo: "Beneficiamento", setor: "Mesas Densimétricas" },
      { nome: "MESA DENSIMÉTRICA 05", processo: "Beneficiamento", setor: "Mesas Densimétricas" },
      // Armazenamento e Expedição
      { nome: "SILO DE ESPERA", processo: "Secagem", setor: "Armazenamento e Expedição" },
      { nome: "CAIXA DE ENSAQUE", processo: "Ensaque", setor: "Armazenamento e Expedição" },
      // Tratamento Industrial
      { nome: "FULL COLOR", processo: "Tratamento", setor: "Tratamento Industrial" }
    ];

    let modified = false;
    for (const eq of ubsMgEquipments) {
      const exists = this.data.equipments.some(
        e => e.unidade === "UBS-MG" && e.nome.trim().toUpperCase() === eq.nome.trim().toUpperCase()
      );
      if (!exists) {
        this.data.equipments.push({
          id: `eq-mg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          nome: eq.nome,
          processo: eq.processo,
          setor: eq.setor,
          unidade: "UBS-MG",
          fabricante: "Equipamento UBS-MG",
          modelo: "PADRÃO",
          status: "Ativo",
          createdAt: new Date().toISOString()
        });
        modified = true;
      }
    }
    if (modified) {
      this.save();
    }
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(fileContent);
        // Ensure all arrays exist
        this.data.users = this.data.users || [];
        this.data.ubs = this.data.ubs || [];
        this.data.equipments = this.data.equipments || [];
        this.data.stops = this.data.stops || [];
        this.data.productions = this.data.productions || [];
        this.data.auditLogs = this.data.auditLogs || [];
        this.data.dailyProductions = this.data.dailyProductions || [];
        
        this.data.users = (this.data.users || []).map(u => ({
          ...u,
          status: u.status || "Ativo"
        }));
        
        // Define default daily goals per unit if missing
        this.data.ubs = (this.data.ubs || []).map(u => ({
          ...u,
          metaDiaria: u.metaDiaria !== undefined ? u.metaDiaria : (
            u.nome === "UBS-MG" ? 200 :
            u.nome === "UBS-GO" ? 180 :
            u.nome === "UBS-BA" ? 150 :
            u.nome === "UBS-TO" ? 120 : 150
          )
        }));

        // Assegurar compatibilidade com paradas antigas definindo impacto como true por padrão
        this.data.stops = (this.data.stops || []).map(s => ({
          ...s,
          impactouProducao: s.impactouProducao !== undefined ? s.impactouProducao : true
        }));
      } else {
        this.data = { ...defaultSchema };
        this.save();
      }
    } catch (e) {
      console.error("Erro ao carregar banco de dados:", e);
      this.data = { ...defaultSchema };
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("Erro ao salvar banco de dados:", e);
    }
  }

  private seed() {
    console.log("Semeando banco de dados com dados iniciais profissionais...");

    // 1. Criar unidades UBS com metas de beneficiamento diárias (toneladas)
    const initialUbs: Ubs[] = [
      { id: "ubs-1", nome: "UBS-MG", cidade: "Patos de Minas", estado: "MG", responsavel: "Roberto Silva", status: "Ativa", metaDiaria: 200, createdAt: new Date().toISOString() },
      { id: "ubs-2", nome: "UBS-GO", cidade: "Rio Verde", estado: "GO", responsavel: "Amanda Souza", status: "Ativa", metaDiaria: 180, createdAt: new Date().toISOString() },
      { id: "ubs-3", nome: "UBS-BA", cidade: "Luís Eduardo Magalhães", estado: "BA", responsavel: "Carlos Santos", status: "Ativa", metaDiaria: 150, createdAt: new Date().toISOString() },
      { id: "ubs-4", nome: "UBS-TO", cidade: "Porto Nacional", estado: "TO", responsavel: "Maria Oliveira", status: "Ativa", metaDiaria: 120, createdAt: new Date().toISOString() }
    ];
    this.data.ubs = initialUbs;

    // 2. Criar Usuários iniciais com senhas hash
    const salt = bcrypt.genSaltSync(10);
    const initialUsers: User[] = [
      {
        id: "usr-admin",
        nome: "Administrador Geral",
        matricula: "MAT-001",
        funcao: "Administrador",
        turno: "Administrativo",
        unidade: "UBS-MG",
        email: "admin@ubs.com",
        passwordHash: bcrypt.hashSync("admin123", salt),
        createdAt: new Date().toISOString()
      },
      {
        id: "usr-operador",
        nome: "João Silva - Op",
        matricula: "MAT-102",
        funcao: "Operador",
        turno: "Turno A",
        unidade: "UBS-GO",
        email: "operator@ubs.com",
        passwordHash: bcrypt.hashSync("operador123", salt),
        createdAt: new Date().toISOString()
      },
      {
        id: "usr-lider",
        nome: "Marcos Souza",
        matricula: "MAT-203",
        funcao: "Líder",
        turno: "Turno B",
        unidade: "UBS-BA",
        email: "lider@ubs.com",
        passwordHash: bcrypt.hashSync("lider123", salt),
        createdAt: new Date().toISOString()
      },
      {
        id: "usr-supervisor",
        nome: "Juliana Santos",
        matricula: "MAT-304",
        funcao: "Supervisor",
        turno: "Administrativo",
        unidade: "UBS-TO",
        email: "supervisor@ubs.com",
        passwordHash: bcrypt.hashSync("supervisor123", salt),
        createdAt: new Date().toISOString()
      },
      {
        id: "usr-coordenador",
        nome: "André Oliveira",
        matricula: "MAT-405",
        funcao: "Coordenador",
        unidade: "UBS-MG",
        turno: "Administrativo",
        email: "coordenador@ubs.com",
        passwordHash: bcrypt.hashSync("coordenador123", salt),
        createdAt: new Date().toISOString()
      }
    ];
    this.data.users = initialUsers;

    // 3. Criar Equipamentos
    const initialEquipments: Equipment[] = [
      { id: "eq-1", nome: "Classificador Pneumático KW", processo: "Limpeza", setor: "Limpeza & Beneficiamento", unidade: "UBS-MG", fabricante: "Kepler Weber", modelo: "KWXS-100", status: "Ativo", createdAt: new Date().toISOString() },
      { id: "eq-2", nome: "Secador Rotativo SR-50", processo: "Secagem", setor: "Recepção & Secagem", unidade: "UBS-MG", fabricante: "Casp", modelo: "SEC-ROT-50", status: "Ativo", createdAt: new Date().toISOString() },
      { id: "eq-3", nome: "Mesa Gravimétrica MG-300", processo: "Beneficiamento", setor: "Seleção Sementes", unidade: "UBS-MG", fabricante: "Silpar", modelo: "MG-300", status: "Ativo", createdAt: new Date().toISOString() },
      { id: "eq-4", nome: "Tratadora de Sementes TSI-10", processo: "Tratamento", setor: "TSI - Industrial", unidade: "UBS-GO", fabricante: "Syngenta", modelo: "Plural-10", status: "Ativo", createdAt: new Date().toISOString() },
      { id: "eq-5", nome: "Ensacadora Automática Toledo", processo: "Ensaque", setor: "Expedição", unidade: "UBS-GO", fabricante: "Toledo", modelo: "9091", status: "Ativo", createdAt: new Date().toISOString() },
      { id: "eq-6", nome: "Recepção Tombador T-80", processo: "Recebimento", setor: "Recepção & Descarga", unidade: "UBS-BA", fabricante: "Saur", modelo: "TOMB-80", status: "Ativo", createdAt: new Date().toISOString() }
    ];
    this.data.equipments = initialEquipments;

    // 4. Paradas Simuladas (com duração em minutos para estatísticas reais de MTBF e MTTR)
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0];

    const initialStops: StopRecord[] = [
      {
        id: "stp-1",
        ubs: "UBS-MG",
        processo: "Secagem",
        equipamentoId: "eq-2",
        equipamentoNome: "Secador Rotativo SR-50",
        operador: "João Silva - Op",
        dataInicio: fiveDaysAgo,
        horaInicio: "08:15",
        dataFim: fiveDaysAgo,
        horaFim: "11:45",
        motivo: "Troca do mancal do eixo traseiro que estava superaquecendo",
        categoria: "Mecânica",
        observacao: "Mancal original foi substituído por sobressalente em estoque. Testado sob carga e liberado.",
        tempoParadoMinutos: 210, // 3h30
        tempoProdutivoMinutos: 1440,
        impactouProducao: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "stp-2",
        ubs: "UBS-MG",
        processo: "Limpeza",
        equipamentoId: "eq-1",
        equipamentoNome: "Classificador Pneumático KW",
        operador: "Marcos Souza",
        dataInicio: threeDaysAgo,
        horaInicio: "14:00",
        dataFim: threeDaysAgo,
        horaFim: "15:30",
        motivo: "Atuador pneumático da comporta de descarte travou",
        categoria: "Elétrica",
        observacao: "Efetuada limpeza de poeira do sensor e lubrificação do pistão. Funcionamento normalizado.",
        tempoParadoMinutos: 90, // 1h30
        tempoProdutivoMinutos: 1800,
        impactouProducao: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "stp-3",
        ubs: "UBS-GO",
        processo: "Tratamento",
        equipamentoId: "eq-4",
        equipamentoNome: "Tratadora de Sementes TSI-10",
        operador: "João Silva - Op",
        dataInicio: yesterday,
        horaInicio: "09:00",
        dataFim: yesterday,
        horaFim: "13:00",
        motivo: "Troca de cultivar no loteamento - Higienização completa da câmara",
        categoria: "Troca de cultivar",
        observacao: "Limpeza completa para evitar contaminação genética entre cultivares de soja.",
        tempoParadoMinutos: 240, // 4 horas
        tempoProdutivoMinutos: 2400,
        impactouProducao: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "stp-4",
        ubs: "UBS-MG",
        processo: "Beneficiamento",
        equipamentoId: "eq-3",
        equipamentoNome: "PADRONIZADOR P1",
        operador: "André Oliveira",
        dataInicio: today,
        horaInicio: "07:30",
        dataFim: today,
        horaFim: "15:30",
        motivo: "Quebra do motor principal do elevador acoplado",
        categoria: "Mecânica",
        observacao: "O equipamento PADRONIZADOR P1 gerou 8 horas de parada produtiva no período.",
        tempoParadoMinutos: 480, // 8 horas
        tempoProdutivoMinutos: 600,
        impactouProducao: true,
        createdAt: new Date().toISOString()
      },
      {
        id: "stp-5",
        ubs: "UBS-MG",
        processo: "Beneficiamento",
        equipamentoId: "eq-mg-mesa-3",
        equipamentoNome: "MESA DENSIMÉTRICA 03",
        operador: "André Oliveira",
        dataInicio: today,
        horaInicio: "16:00",
        dataFim: today,
        horaFim: "16:30",
        motivo: "Ajuste fino de ângulo de vibração da mesa",
        categoria: "Operacional",
        observacao: "A MESA DENSIMÉTRICA 03 apresentou ocorrências, porém sem impacto no beneficiamento.",
        tempoParadoMinutos: 30, // 30 min
        tempoProdutivoMinutos: 360,
        impactouProducao: false,
        createdAt: new Date().toISOString()
      }
    ];
    this.data.stops = initialStops;

    // 5. Produções Simuladas
    const initialProductions: ProductionRecord[] = [
      { id: "prd-1", material: "Soja", cultivar: "M7739 IPRO", lote: "SOJ-2026-A101", quantidade: 1250, processo: "Limpeza", operador: "João Silva - Op", ubs: "UBS-MG", dataRegistro: fiveDaysAgo, createdAt: new Date().toISOString() },
      { id: "prd-2", material: "Soja", cultivar: "M8210 IPRO", lote: "SOJ-2026-A102", quantidade: 980, processo: "Beneficiamento", operador: "Marcos Souza", ubs: "UBS-MG", dataRegistro: threeDaysAgo, createdAt: new Date().toISOString() },
      { id: "prd-3", material: "Milho", cultivar: "AG8030 PRO3", lote: "MIL-2026-B055", quantidade: 1100, processo: "Secagem", operador: "João Silva - Op", ubs: "UBS-GO", dataRegistro: yesterday, createdAt: new Date().toISOString() },
      { id: "prd-4", material: "Algodão", cultivar: "DP1852 B3RF", lote: "ALG-2026-X01", quantidade: 450, processo: "Ensaque", operador: "Juliana Santos", ubs: "UBS-GO", dataRegistro: today, createdAt: new Date().toISOString() },
      { id: "prd-5", material: "Soja", cultivar: "M7739 IPRO", lote: "SOJ-2026-A103", quantidade: 1530, processo: "Tratamento", operador: "André Oliveira", ubs: "UBS-MG", dataRegistro: today, createdAt: new Date().toISOString() }
    ];
    this.data.productions = initialProductions;

    // 6. Logs de Auditoria Iniciais
    const initialLogs: AuditLog[] = [
      { id: "log-1", usuario: "admin@ubs.com", data: today, hora: "08:00:15", acao: "Login", detalhes: "Login bem sucedido do Administrador via painel web corporativo." },
      { id: "log-2", usuario: "admin@ubs.com", data: today, hora: "08:15:30", acao: "Inclusão", detalhes: "Cadastrado novo equipamento: Recebimento Tombador T-80." },
      { id: "log-3", usuario: "operator@ubs.com", data: today, hora: "11:00:00", acao: "Login", detalhes: "Login do Operador via terminal de campo." },
      { id: "log-4", usuario: "operator@ubs.com", data: today, hora: "11:12:00", acao: "Inclusão", detalhes: "Registrada parada operacional no Secador Rotativo SR-50." }
    ];
    this.data.auditLogs = initialLogs;

    this.save();
  }

  // Quick helper getters/setters for collections
  get users() { this.load(); return this.data.users; }
  set users(val) { this.data.users = val; this.save(); }

  get ubs() { this.load(); return this.data.ubs; }
  set ubs(val) { this.data.ubs = val; this.save(); }

  get equipments() { this.load(); return this.data.equipments; }
  set equipments(val) { this.data.equipments = val; this.save(); }

  get stops() { this.load(); return this.data.stops; }
  set stops(val) { this.data.stops = val; this.save(); }

  get productions() { this.load(); return this.data.productions; }
  set productions(val) { this.data.productions = val; this.save(); }

  get auditLogs() { this.load(); return this.data.auditLogs; }
  set auditLogs(val) { this.data.auditLogs = val; this.save(); }

  get dailyProductions() { this.load(); return this.data.dailyProductions || []; }
  set dailyProductions(val) { this.data.dailyProductions = val; this.save(); }
}

export const db = new LocalDatabase();
