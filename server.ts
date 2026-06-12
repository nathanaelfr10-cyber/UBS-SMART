import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { db, User, Ubs, Equipment, StopRecord, ProductionRecord, AuditLog } from "./src/db/db.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "ubs-coporate-industrial-secret-key-2026-secure";

app.use(express.json());

// Helper function to log audit actions
function logAudit(usuario: string, acao: "Login" | "Logout" | "Inclusão" | "Alteração" | "Exclusão", detalhes: string) {
  const now = new Date();
  const data = now.toISOString().split("T")[0];
  const hora = now.toTimeString().split(" ")[0];
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    usuario,
    data,
    hora,
    acao,
    detalhes
  };
  const logs = db.auditLogs;
  logs.unshift(newLog); // newer first
  db.auditLogs = logs;
}

// Global Middleware to verify JWT and attach user
interface AuthRequest extends Request {
  user?: {
    id: string;
    nome: string;
    email: string;
    funcao: string;
    turno: string;
    unidade: string;
  };
}

const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
    } catch (e) {
      // Ignora erro no opcional
    }
  }
  next();
};

const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Sessão expirada ou token não fornecido. Faça login novamente." });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Sessão inválida. Faça login novamente." });
  }
};

// --- AUTH ENDPOINTS ---

// Obter colaboradores para login (sem autenticação prévia)
app.get("/api/auth/collaborators", (req: Request, res: Response) => {
  const list = db.users.map(u => ({
    id: u.id,
    nome: u.nome,
    funcao: u.funcao,
    turno: u.turno,
    unidade: u.unidade,
    email: u.email
  }));
  res.json(list);
});

// Login - apenas o nome do colaborador como identificação
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { nome } = req.body;
  if (!nome) {
    return res.status(400).json({ error: "O nome do colaborador é obrigatório." });
  }

  // Buscar colaborador pelo nome exato (case insensitive e aparando espaços)
  const user = db.users.find(u => u.nome.trim().toLowerCase() === nome.trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ error: `Colaborador "${nome}" não encontrado no cadastro do sistema.` });
  }

  // Generate token containing profile
  const tokenPayload = {
    id: user.id,
    nome: user.nome,
    email: user.email,
    funcao: user.funcao,
    turno: user.turno,
    unidade: user.unidade
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "12h" });

  logAudit(user.nome, "Login", `Operador realizou login identificando-se como: ${user.nome} (${user.funcao})`);

  res.json({
    token,
    user: tokenPayload
  });
});

// Get context user
app.get("/api/auth/me", requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// Alterar senha
app.post("/api/auth/change-password", requireAuth, (req: AuthRequest, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  const userEmail = req.user?.email;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias." });
  }

  const usersList = db.users;
  const userIdx = usersList.findIndex(u => u.email === userEmail);
  if (userIdx === -1) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  const user = usersList[userIdx];
  if (!bcrypt.compareSync(oldPassword, user.passwordHash)) {
    return res.status(400).json({ error: "Senha atual incorreta." });
  }

  user.passwordHash = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
  usersList[userIdx] = user;
  db.users = usersList;

  logAudit(user.email, "Alteração", "Alterou a própria senha de segurança.");
  res.json({ success: true, message: "Senha atualizada com sucesso." });
});

// Recuperar senha (mock)
app.post("/api/auth/recover-password", (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "E-mail é obrigatório." });
  }
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "E-mail não encontrado na base de dados de funcionários." });
  }

  logAudit(email, "Alteração", "Solicitou link de recuperação de senha.");
  res.json({
    success: true,
    message: `Instruções de redefinição de acesso enviadas com sucesso para o e-mail corporativo: ${email}.`
  });
});

// --- DASHBOARD OPERACIONAL & FILTROS & INDICADORES ---

app.get("/api/dashboard/stats", (req: Request, res: Response) => {
  const { ubs, periodo, processo, turno } = req.query;

  // Carregar dados
  let stops = db.stops;
  let productions = db.productions;
  let equipments = db.equipments;

  // Filtrar Stops
  if (ubs && ubs !== "Todas") {
    stops = stops.filter(s => s.ubs === ubs);
    productions = productions.filter(p => p.ubs === ubs);
    equipments = equipments.filter(e => e.unidade === ubs);
  }

  if (processo && processo !== "Todos") {
    stops = stops.filter(s => s.processo === processo);
    productions = productions.filter(p => p.processo === processo);
    equipments = equipments.filter(e => e.processo === processo);
  }

  // Períodos: Hoje, 7d, 30d, Historico
  const now = new Date();
  let minDate = new Date(0); // far back
  let totalDays = 30; // base de cálculo disponibilidade

  if (periodo === "Hoje") {
    const todayStr = now.toISOString().split("T")[0];
    stops = stops.filter(s => s.dataInicio === todayStr);
    productions = productions.filter(p => p.dataRegistro === todayStr);
    totalDays = 1;
  } else if (periodo === "7d") {
    minDate = new Date(now.getTime() - 7 * 86400000);
    const minDateStr = minDate.toISOString().split("T")[0];
    stops = stops.filter(s => s.dataInicio >= minDateStr);
    productions = productions.filter(p => p.dataRegistro >= minDateStr);
    totalDays = 7;
  } else if (periodo === "30d") {
    minDate = new Date(now.getTime() - 30 * 86400000);
    const minDateStr = minDate.toISOString().split("T")[0];
    stops = stops.filter(s => s.dataInicio >= minDateStr);
    productions = productions.filter(p => p.dataRegistro >= minDateStr);
    totalDays = 30;
  } else {
    // Todos / Histórico
    totalDays = 60; // default benchmark
  }

  if (turno && turno !== "Todos") {
    // Filtrar operadores com o mesmo turno correspondente se necessário
    const usersInTurn = db.users.filter(u => u.turno === turno).map(u => u.nome);
    stops = stops.filter(s => usersInTurn.includes(s.operador));
    productions = productions.filter(p => usersInTurn.includes(p.operador));
  }

  // --- CALCULO INDICADORES ---
  
  // 1. Produção do dia e produção total do período (em sacos)
  const producaoTotalSacos = productions.reduce((acc, curr) => acc + Number(curr.quantidade), 0);

  // 1b. Produção em Toneladas (diária) do período
  let dailyProductions = db.dailyProductions;
  if (ubs && ubs !== "Todas") {
    dailyProductions = dailyProductions.filter(p => p.unidade === ubs);
  }
  if (periodo === "Hoje") {
    const todayStr = now.toISOString().split("T")[0];
    dailyProductions = dailyProductions.filter(p => p.data === todayStr);
  } else if (periodo === "7d") {
    const minDateStr = minDate.toISOString().split("T")[0];
    dailyProductions = dailyProductions.filter(p => p.data >= minDateStr);
  } else if (periodo === "30d") {
    const minDateStr = minDate.toISOString().split("T")[0];
    dailyProductions = dailyProductions.filter(p => p.data >= minDateStr);
  }
  const toneladasBeneficiadas = dailyProductions.reduce((acc, curr) => acc + Number(curr.quantidadeToneladas), 0);

  // 2. Horas Paradas (Gerais e Com Impacto na Produção)
  const stopsWithImpact = stops.filter(s => s.impactouProducao === true);
  const tempoParadoImpactoMinutos = stopsWithImpact.reduce((acc, curr) => acc + (curr.tempoParadoMinutos || 0), 0);
  const horasParadasComImpacto = Number((tempoParadoImpactoMinutos / 60).toFixed(1));

  // Tempo parado total geral (com ou sem impacto, para historicos)
  const tempoParadoTotalMinutos = stops.reduce((acc, curr) => acc + (curr.tempoParadoMinutos || 0), 0);
  const horasParadasTotal = Number((tempoParadoTotalMinutos / 60).toFixed(1));

  // 3. Horas Disponíveis Teóricas e Disponibilidade/Aproveitamento
  const numUbs = ubs && ubs !== "Todas" ? 1 : Math.max(1, db.ubs.length);
  const totalHorasDisponiveisPeriodo = totalDays * 24 * numUbs;
  
  // Horas Produtivas = Horas Disponíveis - Horas Paradas que impactaram a produção
  const horasProdutivas = Number(Math.max(0, totalHorasDisponiveisPeriodo - horasParadasComImpacto).toFixed(1));

  // Aproveitamento (%) = (Horas Produtivas ÷ Horas Disponíveis) * 100
  let disponibilidadePct = 100;
  if (totalHorasDisponiveisPeriodo > 0) {
    disponibilidadePct = Number(((horasProdutivas / totalHorasDisponiveisPeriodo) * 100).toFixed(1));
    if (disponibilidadePct < 0) disponibilidadePct = 0;
    if (disponibilidadePct > 100) disponibilidadePct = 100;
  }

  // Produção por Hora = Toneladas Beneficiadas ÷ Horas Produtivas
  const producaoPorHora = horasProdutivas > 0 ? Number((toneladasBeneficiadas / horasProdutivas).toFixed(2)) : 0;

  // 4. Eficiência Operacional (Baseada no OEE simulado: Aproveitamento/Disponibilidade * Performance * Qualidade)
  const performanceFator = 0.95;
  const qualidadeFator = 0.985;
  const eficiênciaOperacionalPct = Number(((disponibilidadePct / 100) * performanceFator * qualidadeFator * 100).toFixed(1));

  // 5. MTBF e MTTR
  // MTBF (Mean Time Between Failures) = Tempo Operativo Total / Número de Paradas Corretivas (Mecânica, Elétrica, Operacional)
  // MTTR (Mean Time To Repair) = Tempo Total Parado Corretivas / Número de Paradas Corretivas
  const paradasCorretivas = stops.filter(s => ["Mecânica", "Elétrica", "Operacional", "Processo"].includes(s.categoria));
  const numFalhas = paradasCorretivas.length;

  const mttrHoras = numFalhas > 0 
    ? Number((paradasCorretivas.reduce((acc, curr) => acc + curr.tempoParadoMinutos, 0) / numFalhas / 60).toFixed(2)) 
    : 0;

  const mtbfHoras = numFalhas > 0 
    ? Number((horasProdutivas / numFalhas).toFixed(1)) 
    : Number(horasProdutivas.toFixed(1));

  // 6. Ranking de Equipamentos que mais pararam (por minutos de parada)
  const eqStopMap: { [key: string]: { nome: string; minutos: number; contagem: number } } = {};
  stops.forEach(s => {
    if (!eqStopMap[s.equipamentoId]) {
      eqStopMap[s.equipamentoId] = { nome: s.equipamentoNome, minutos: 0, contagem: 0 };
    }
    eqStopMap[s.equipamentoId].minutos += s.tempoParadoMinutos;
    eqStopMap[s.equipamentoId].contagem += 1;
  });

  const rankingEquipamentos = Object.values(eqStopMap)
    .sort((a, b) => b.minutos - a.minutos)
    .slice(0, 5)
    .map(item => ({
      nome: item.nome,
      minutos: item.minutos,
      horas: Number((item.minutos / 60).toFixed(1)),
      quantidadeParadas: item.contagem
    }));

  // 7. Ranking de causas de parada (Categorias)
  const catStopMap: { [key: string]: number } = {};
  stops.forEach(s => {
    catStopMap[s.categoria] = (catStopMap[s.categoria] || 0) + s.tempoParadoMinutos;
  });
  const rankingCausas = Object.entries(catStopMap).map(([categoria, minutos]) => ({
    categoria,
    minutos,
    horas: Number((minutos / 60).toFixed(1))
  })).sort((a, b) => b.minutos - a.minutos);

  // 8. Gráfico de Produção ao longo do tempo (últimos 7 dias ou por registro do período)
  const producaoTimelineMap: { [key: string]: number } = {};
  productions.forEach(p => {
    producaoTimelineMap[p.dataRegistro] = (producaoTimelineMap[p.dataRegistro] || 0) + p.quantidade;
  });
  const producaoTimeline = Object.entries(producaoTimelineMap).map(([data, total]) => ({
    data,
    total
  })).sort((a, b) => a.data.localeCompare(b.data));

  res.json({
    contadores: {
      eficienciaPct: eficiênciaOperacionalPct,
      disponibilidadePct,
      producaoTotal: producaoTotalSacos,
      producaoHoje: productions.filter(p => p.dataRegistro === now.toISOString().split("T")[0]).reduce((acc, curr) => acc + curr.quantidade, 0),
      horasProdutivas,
      horasParadas: horasParadasComImpacto,
      horasParadasComImpacto,
      horasParadasTotal,
      horasDisponiveis: totalHorasDisponiveisPeriodo,
      toneladasBeneficiadas,
      producaoPorHora,
      mtbf: mtbfHoras,
      mttr: mttrHoras,
      paradasContagem: stops.length
    },
    rankingEquipamentos,
    rankingCausas,
    producaoTimeline
  });
});

// --- UBS ENDPOINTS ---
app.get("/api/ubs", (req, res) => {
  res.json(db.ubs);
});

app.post("/api/ubs", requireAuth, (req: AuthRequest, res) => {
  if (req.user?.funcao !== "Administrador" && req.user?.funcao !== "Supervisor" && req.user?.funcao !== "Coordenador") {
    return res.status(403).json({ error: "Acesso negado. Apenas perfis de liderança podem cadastrar UBS." });
  }
  const { nome, cidade, estado, responsavel, status } = req.body;
  if (!nome || !cidade || !estado || !responsavel) {
    return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
  }

  const ubsList = db.ubs;
  if (ubsList.some(u => u.nome.toLowerCase() === nome.toLowerCase())) {
    return res.status(400).json({ error: "Já existe uma unidade cadastrada com este nome." });
  }

  const newUbs: Ubs = {
    id: `ubs-${Date.now()}`,
    nome,
    cidade,
    estado,
    responsavel,
    status: status || "Ativa",
    metaDiaria: Number(req.body.metaDiaria) || 150,
    createdAt: new Date().toISOString()
  };

  ubsList.push(newUbs);
  db.ubs = ubsList;

  logAudit(req.user.email, "Inclusão", `Cadastrou nova unidade UBS: ${nome} em ${cidade}-${estado}`);
  res.status(201).json(newUbs);
});

app.put("/api/ubs/:id", requireAuth, (req: AuthRequest, res) => {
  if (req.user?.funcao !== "Administrador" && req.user?.funcao !== "Supervisor" && req.user?.funcao !== "Coordenador") {
    return res.status(403).json({ error: "Acesso negado. Apenas administradores ou coordenadores/supervisores podem alterar as configurações e metas de UBS." });
  }
  const { id } = req.params;
  const { metaDiaria, responsavel, status, cidade, estado } = req.body;

  const ubsList = db.ubs;
  const index = ubsList.findIndex(u => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Unidade não encontrada." });
  }

  const ubs = ubsList[index];
  if (metaDiaria !== undefined) ubs.metaDiaria = Number(metaDiaria);
  if (responsavel !== undefined) ubs.responsavel = responsavel;
  if (status !== undefined) ubs.status = status;
  if (cidade !== undefined) ubs.cidade = cidade;
  if (estado !== undefined) ubs.estado = estado;

  ubsList[index] = ubs;
  db.ubs = ubsList;

  logAudit(req.user.email, "Alteração", `Alterou configurações da unidade ${ubs.nome}. Nova meta diária: ${ubs.metaDiaria}t.`);
  res.json(ubs);
});

// --- USUÁRIOS ENDPOINTS ---
app.get("/api/users", requireAuth, (req, res) => {
  // Return list with masks
  const users = db.users.map(u => ({
    id: u.id,
    nome: u.nome,
    matricula: u.matricula,
    funcao: u.funcao,
    turno: u.turno,
    unidade: u.unidade,
    email: u.email,
    status: u.status || "Ativo",
    createdAt: u.createdAt
  }));
  res.json(users);
});

app.post("/api/users", requireAuth, (req: AuthRequest, res) => {
  if (req.user?.funcao !== "Administrador" && req.user?.funcao !== "Coordenador") {
    return res.status(403).json({ error: "Acesso restrito. Apenas administradores do sistema podem criar novos logins e perfis." });
  }
  const { nome, matricula, funcao, turno, unidade, email, status } = req.body;
  if (!nome || !matricula || !funcao || !turno || !unidade) {
    return res.status(400).json({ error: "Preencha todos os campos obrigatórios (Nome, Matrícula, Função, Turno e Unidade) para cadastrar o colaborador." });
  }

  const usersList = db.users;
  const userEmail = email || `${nome.toLowerCase().replace(/\s+/g, ".")}@ubs.com`;
  
  if (usersList.some(u => u.email.toLowerCase() === userEmail.toLowerCase())) {
    return res.status(400).json({ error: "Este email já possui cadastro ativo no sistema." });
  }
  if (usersList.some(u => u.matricula === matricula)) {
    return res.status(400).json({ error: "Esta matrícula já foi registrada para outro colaborador." });
  }

  const hash = bcrypt.hashSync("sem-senha", bcrypt.genSaltSync(10));
  const newUser: User = {
    id: `usr-${Date.now()}`,
    nome,
    matricula,
    funcao,
    turno,
    unidade,
    email: userEmail,
    passwordHash: hash,
    status: status || "Ativo",
    createdAt: new Date().toISOString()
  };

  usersList.push(newUser);
  db.users = usersList;

  logAudit(req.user.email, "Inclusão", `Registrou novo colaborador: ${nome} (${funcao})`);
  res.status(201).json({ id: newUser.id, nome, email, funcao, matricula, status: newUser.status });
});

app.put("/api/users/:id", requireAuth, (req: AuthRequest, res) => {
  if (req.user?.funcao !== "Administrador" && req.user?.funcao !== "Coordenador") {
    return res.status(403).json({ error: "Acesso restrito. Apenas administradores ou coordenadores/supervisores podem alterar perfis de cooperados ou operadores." });
  }
  const { id } = req.params;
  const { nome, matricula, funcao, turno, unidade, email, status } = req.body;

  const usersList = db.users;
  const userIdx = usersList.findIndex(u => u.id === id);
  if (userIdx === -1) {
    return res.status(404).json({ error: "Colaborador não encontrado." });
  }

  const existingUser = usersList[userIdx];
  const updatedUser = {
    ...existingUser,
    nome: nome !== undefined ? nome : existingUser.nome,
    matricula: matricula !== undefined ? matricula : existingUser.matricula,
    funcao: funcao !== undefined ? funcao : existingUser.funcao,
    turno: turno !== undefined ? turno : existingUser.turno,
    unidade: unidade !== undefined ? unidade : existingUser.unidade,
    email: email !== undefined ? email : existingUser.email,
    status: status !== undefined ? status : (existingUser.status || "Ativo")
  };

  if (!updatedUser.nome || !updatedUser.matricula || !updatedUser.funcao || !updatedUser.unidade) {
    return res.status(400).json({ error: "Nome, Matrícula, Função e Unidade são obrigatórios." });
  }

  usersList[userIdx] = updatedUser;
  db.users = usersList;

  logAudit(req.user.email, "Alteração", `Alterou perfil de cooperado/operador: ${updatedUser.nome} (Unidade: ${updatedUser.unidade}, Status: ${updatedUser.status})`);
  res.json({
    id: updatedUser.id,
    nome: updatedUser.nome,
    email: updatedUser.email,
    funcao: updatedUser.funcao,
    matricula: updatedUser.matricula,
    turno: updatedUser.turno,
    unidade: updatedUser.unidade,
    status: updatedUser.status
  });
});

// --- EQUIPAMENTOS ENDPOINTS ---
app.get("/api/equipments", requireAuth, (req, res) => {
  res.json(db.equipments);
});

app.post("/api/equipments", requireAuth, (req: AuthRequest, res) => {
  if (!["Administrador", "Supervisor", "Coordenador", "Líder"].includes(req.user?.funcao || "")) {
    return res.status(403).json({ error: "Apenas perfis gerenciais ou líderes de processo podem cadastrar equipamentos." });
  }
  const { nome, processo, setor, unidade, fabricante, modelo, status, criticidade, observacoes, codigoInterno } = req.body;
  if (!nome || !processo || !setor || !unidade) {
    return res.status(400).json({ error: "Preencha Nome, Processo, Setor e Unidade organizacional." });
  }

  const equipmentsList = db.equipments;
  const newEq: Equipment = {
    id: `eq-${Date.now()}`,
    nome,
    processo,
    setor,
    unidade,
    fabricante: fabricante || "",
    modelo: modelo || "",
    status: status || "Ativo",
    criticidade: criticidade || "Média",
    observacoes: observacoes || "",
    codigoInterno: codigoInterno || `COD-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString()
  };

  equipmentsList.push(newEq);
  db.equipments = equipmentsList;

  logAudit(req.user.email, "Inclusão", `Cadastrou equipamento: ${nome} na unidade ${unidade}`);
  res.status(201).json(newEq);
});

// Editar equipamento (Alterar dados / Vincular processo / Inativar)
app.put("/api/equipments/:id", requireAuth, (req: AuthRequest, res) => {
  if (!["Administrador", "Supervisor", "Coordenador", "Líder"].includes(req.user?.funcao || "")) {
    return res.status(403).json({ error: "Apenas perfis gerenciais ou líderes de processo podem alterar equipamentos." });
  }
  const { id } = req.params;
  const { nome, processo, setor, unidade, fabricante, modelo, status, criticidade, observacoes, codigoInterno } = req.body;

  const equipmentsList = db.equipments;
  const eqIdx = equipmentsList.findIndex(e => e.id === id);
  if (eqIdx === -1) {
    return res.status(404).json({ error: "Equipamento não encontrado." });
  }

  const existingEq = equipmentsList[eqIdx];
  const updatedEq = {
    ...existingEq,
    nome: nome !== undefined ? nome : existingEq.nome,
    processo: processo !== undefined ? processo : existingEq.processo,
    setor: setor !== undefined ? setor : existingEq.setor,
    unidade: unidade !== undefined ? unidade : existingEq.unidade,
    fabricante: fabricante !== undefined ? fabricante : existingEq.fabricante,
    modelo: modelo !== undefined ? modelo : existingEq.modelo,
    status: status !== undefined ? status : existingEq.status,
    criticidade: criticidade !== undefined ? criticidade : existingEq.criticidade,
    observacoes: observacoes !== undefined ? observacoes : existingEq.observacoes,
    codigoInterno: codigoInterno !== undefined ? codigoInterno : existingEq.codigoInterno,
  };

  if (!updatedEq.nome || !updatedEq.processo || !updatedEq.setor || !updatedEq.unidade) {
    return res.status(400).json({ error: "Nome, Processo, Setor e Unidade são obrigatórios." });
  }

  equipmentsList[eqIdx] = updatedEq;
  db.equipments = equipmentsList;

  logAudit(req.user.email, "Alteração", `Alterou equipamento: ${updatedEq.nome} (Status: ${updatedEq.status}, Processo: ${updatedEq.processo})`);
  res.json(updatedEq);
});

// Excluir / Arquivar equipamento
app.delete("/api/equipments/:id", requireAuth, (req: AuthRequest, res) => {
  if (req.user?.funcao !== "Administrador" && req.user?.funcao !== "Coordenador" && req.user?.funcao !== "Supervisor") {
    return res.status(403).json({ error: "Acesso negado. Apenas administradores, coordenadores ou supervisores podem arquivar equipamentos." });
  }
  const { id } = req.params;
  const equipmentsList = db.equipments;
  const eqIdx = equipmentsList.findIndex(e => e.id === id);

  if (eqIdx === -1) {
    return res.status(404).json({ error: "Equipamento não encontrado." });
  }

  const eq = equipmentsList[eqIdx];
  eq.status = "Arquivado";
  equipmentsList[eqIdx] = eq;
  db.equipments = equipmentsList;

  logAudit(req.user.email, "Exclusão", `Arquivou o equipamento ${eq.nome} (Preservando histórico de paradas)`);
  res.json({ success: true, message: "Equipamento arquivado com sucesso. Histórico de paradas preservado.", equipment: eq });
});

// --- REGISTRO DE PARADAS ENDPOINTS ---
app.get("/api/stops", requireAuth, (req, res) => {
  res.json(db.stops);
});

// Cadastrar parada
app.post("/api/stops", requireAuth, (req: AuthRequest, res) => {
  const { ubs, processo, equipamentoId, dataInicio, horaInicio, dataFim, horaFim, motivo, categoria, observacao, impactouProducao } = req.body;

  if (!ubs || !processo || !equipamentoId || !dataInicio || !horaInicio || !motivo || !categoria) {
    return res.status(400).json({ error: "Informe Unidade, Processo, Equipamento, Início, Categoria e Motivo da parada." });
  }

  const eq = db.equipments.find(e => e.id === equipamentoId);
  const equipamentoNome = eq ? eq.nome : "Equipamento Desconhecido";

  // Calcular tempo parado se houver término informado
  let tempoParadoMinutos = 0;
  if (dataFim && horaFim) {
    const startObj = new Date(`${dataInicio}T${horaInicio}`);
    const endObj = new Date(`${dataFim}T${horaFim}`);
    const diffMs = endObj.getTime() - startObj.getTime();
    if (diffMs > 0) {
      tempoParadoMinutos = Math.floor(diffMs / 60000);
    }
  }

  // A parada interrompeu o beneficiamento? Se não informado, default true
  const hasImpact = impactouProducao !== undefined ? (impactouProducao === true || String(impactouProducao) === "true") : true;

  const stopsList = db.stops;
  const newStop: StopRecord = {
    id: `stp-${Date.now()}`,
    ubs,
    processo,
    equipamentoId,
    equipamentoNome,
    operador: req.user?.nome || "Operador de Painel",
    dataInicio,
    horaInicio,
    dataFim: dataFim || null,
    horaFim: horaFim || null,
    motivo,
    categoria,
    observacao: observacao || "",
    tempoParadoMinutos,
    tempoProdutivoMinutos: 480, // Padronizado 1 turno de trabalho
    impactouProducao: hasImpact,
    createdAt: new Date().toISOString()
  };

  // Se houver parada ativa em andamento no mesmo equipamento, avisar
  const conflito = stopsList.some(s => s.equipamentoId === equipamentoId && !s.dataFim);
  if (conflito && !dataFim) {
    return res.status(400).json({ error: "Já existe um registro de parada ativo e não finalizado para este equipamento no terminal corporativo." });
  }

  stopsList.unshift(newStop); // newer first
  db.stops = stopsList;

  // Atualizar status do equipamento afetado
  const eqList = db.equipments;
  const eqIdx = eqList.findIndex(e => e.id === equipamentoId);
  if (eqIdx !== -1) {
    eqList[eqIdx].status = dataFim ? "Ativo" : "Inativo";
    db.equipments = eqList;
  }

  logAudit(req.user?.email || "operador@ubs.com", "Inclusão", `Registrou parada de classe ${categoria} no equipamento ${equipamentoNome}`);
  res.status(201).json(newStop);
});

// Finalizar parada operacional ativa
app.put("/api/stops/:id/finalize", requireAuth, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { dataFim, horaFim, observacao } = req.body;

  if (!dataFim || !horaFim) {
    return res.status(400).json({ error: "Data e hora de finalização são indispensáveis." });
  }

  const stopsList = db.stops;
  const idx = stopsList.findIndex(s => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Registro de parada operacional não localizado." });
  }

  const stop = stopsList[idx];
  stop.dataFim = dataFim;
  stop.horaFim = horaFim;
  if (observacao) {
    stop.observacao = observacao;
  }

  const startObj = new Date(`${stop.dataInicio}T${stop.horaInicio}`);
  const endObj = new Date(`${dataFim}T${horaFim}`);
  const diffMs = endObj.getTime() - startObj.getTime();
  if (diffMs > 0) {
    stop.tempoParadoMinutos = Math.floor(diffMs / 60000);
  } else {
    stop.tempoParadoMinutos = 15; // fallback se for menor ou igual
  }

  stopsList[idx] = stop;
  db.stops = stopsList;

  // Restaurar status do equipamento para ativo
  const eqList = db.equipments;
  const eqIdx = eqList.findIndex(e => e.id === stop.equipamentoId);
  if (eqIdx !== -1) {
    eqList[eqIdx].status = "Ativo";
    db.equipments = eqList;
  }

  logAudit(req.user?.email || "operador@ubs.com", "Alteração", `Finalizou parada de ID ${id}. Duração calculada: ${stop.tempoParadoMinutos} minutos.`);
  res.json(stop);
});

// Excluir parada
app.delete("/api/stops/:id", requireAuth, (req: AuthRequest, res) => {
  if (req.user?.funcao !== "Administrador" && req.user?.funcao !== "Supervisor") {
    return res.status(403).json({ error: "Autoridade insuficiente para excluir registros estruturais do banco de paradas." });
  }
  const { id } = req.params;
  const stopsList = db.stops;
  const stopIndex = stopsList.findIndex(s => s.id === id);

  if (stopIndex === -1) {
    return res.status(404).json({ error: "Parada não encontrada." });
  }

  const stop = stopsList[stopIndex];
  stopsList.splice(stopIndex, 1);
  db.stops = stopsList;

  logAudit(req.user.email, "Exclusão", `Excluiu parada de ID ${id} registrada no equipamento ${stop.equipamentoNome}`);
  res.json({ success: true, message: "Registro de parada removido com sucesso." });
});

// --- CONTROLE DE PRODUÇÃO ENDPOINTS ---
app.get("/api/productions", requireAuth, (req, res) => {
  res.json(db.productions);
});

app.post("/api/productions", requireAuth, (req: AuthRequest, res) => {
  const { material, cultivar, lote, quantidade, processo, ubs } = req.body;
  if (!material || !cultivar || !lote || !quantidade || !processo || !ubs) {
    return res.status(400).json({ error: "Preencha todos os campos obrigatórios da ficha de produção." });
  }

  const prodList = db.productions;
  const newProd: ProductionRecord = {
    id: `prd-${Date.now()}`,
    material,
    cultivar,
    lote,
    quantidade: Number(quantidade),
    processo,
    operador: req.user?.nome || "Operador Clínico",
    ubs,
    dataRegistro: new Date().toISOString().split("T")[0],
    createdAt: new Date().toISOString()
  };

  prodList.unshift(newProd);
  db.productions = prodList;

  logAudit(req.user?.email || "operador@ubs.com", "Inclusão", `Registrou loteamento de produção de ${quantidade} scs de ${material} (${cultivar}) na UBS ${ubs}`);
  res.status(201).json(newProd);
});

app.delete("/api/productions/:id", requireAuth, (req: AuthRequest, res) => {
  if (req.user?.funcao !== "Administrador" && req.user?.funcao !== "Supervisor") {
    return res.status(403).json({ error: "Apenas administradores ou supervisores podem limpar registros consolidados de produção." });
  }
  const { id } = req.params;
  const prodList = db.productions;
  const prodIdx = prodList.findIndex(p => p.id === id);

  if (prodIdx === -1) {
    return res.status(404).json({ error: "Registro de produção não localizado." });
  }

  const prod = prodList[prodIdx];
  prodList.splice(prodIdx, 1);
  db.productions = prodList;

  logAudit(req.user.email, "Exclusão", `Excluiu registro de lote produzido de ID ${id} (${prod.quantidade} scs ${prod.material})`);
  res.json({ success: true, message: "Registro de produção excluído com sucesso." });
});

// --- PRODUÇÃO DIÁRIA EM TONELADAS ENDPOINTS ---
app.get("/api/daily-productions", requireAuth, (req, res) => {
  res.json(db.dailyProductions || []);
});

app.post("/api/daily-productions", requireAuth, (req: AuthRequest, res) => {
  const { unidade, data, material, quantidadeToneladas } = req.body;
  if (!unidade || !material || quantidadeToneladas === undefined || quantidadeToneladas === "") {
    return res.status(400).json({ error: "Preencha todos os campos obrigatórios: Unidade, Data, Material e Quantidade Beneficiada (Toneladas)." });
  }

  const tons = Number(quantidadeToneladas);
  if (isNaN(tons) || tons <= 0) {
    return res.status(400).json({ error: "A quantidade beneficiada deve ser um número positivo em toneladas." });
  }

  const list = db.dailyProductions || [];
  
  // Format current HH:MM:SS
  const now = new Date();
  const rawHours = String(now.getHours()).padStart(2, '0');
  const rawMin = String(now.getMinutes()).padStart(2, '0');
  const rawSec = String(now.getSeconds()).padStart(2, '0');
  const currentTime = `${rawHours}:${rawMin}:${rawSec}`;

  const inputDate = data ? data : now.toISOString().split("T")[0];
  const inputOperador = req.body.operador && req.body.operador.trim() !== "" ? req.body.operador : (req.user?.nome || "Operador de Painel");
  const inputHora = req.body.hora && req.body.hora.trim() !== "" ? req.body.hora : currentTime;

  const newDaily = {
    id: `dlp-${Date.now()}`,
    unidade,
    data: inputDate,
    material,
    quantidadeToneladas: tons,
    operador: inputOperador,
    hora: inputHora,
    createdAt: now.toISOString()
  };

  list.unshift(newDaily);
  db.dailyProductions = list;

  logAudit(req.user?.email || "operador@ubs.com", "Inclusão", `Registrou produção diária de ${tons} t de ${material} na UBS ${unidade}`);
  res.status(201).json(newDaily);
});

app.delete("/api/daily-productions/:id", requireAuth, (req: AuthRequest, res) => {
  if (req.user?.funcao !== "Administrador" && req.user?.funcao !== "Supervisor" && req.user?.funcao !== "Coordenador") {
    return res.status(403).json({ error: "Acesso negado. Apenas administradores, supervisores ou coordenadores podem excluir lançamentos de produção diária." });
  }
  const { id } = req.params;
  const list = db.dailyProductions || [];
  const idx = list.findIndex(p => p.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: "Registro de produção diária não encontrado." });
  }

  const removed = list[idx];
  list.splice(idx, 1);
  db.dailyProductions = list;

  logAudit(req.user.email, "Exclusão", `Excluiu produção diária de ID ${id} (${removed.quantidadeToneladas} t de ${removed.material} da Unidade ${removed.unidade})`);
  res.json({ success: true, message: "Lançamento de produção diária excluído com sucesso." });
});

// --- AUDITORIA ENDPOINTS ---
app.get("/api/audit", requireAuth, (req: AuthRequest, res) => {
  if (req.user?.funcao !== "Administrador" && req.user?.funcao !== "Supervisor" && req.user?.funcao !== "Coordenador") {
    return res.status(403).json({ error: "Acesso reservado aos auditores e administradores." });
  }
  res.json(db.auditLogs);
});

// --- IA OPERACIONAL ASSISTANTE COM GEMINI ---
app.post("/api/assistant/chat", requireAuth, async (req: AuthRequest, res) => {
  const { message, chatHistory } = req.body;
  if (!message) {
    return res.status(400).json({ error: "A mensagem é obrigatória." });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey || geminiApiKey === "MY_GEMINI_API_KEY") {
    // Elegant system answering simulated fallback when Gemini API key is not configured locally in the developer frame.
    return res.json({
      reply: "Olá! Eu sou o assistente IA Operacional especializado no gerenciamento de Unidades de Beneficiamento de Sementes (UBS). No momento, estou simulando respostas de inteligência operacional técnica, pois a chave do Gemini API está em processo de configuração.\n\nCom base na análise simulada de suas plantas:\n- A **UBS-MG** apresenta a maior taxa de paradas mecânicas decorrente de manutenções corretivas em correias e secadores rotativos (alto MTTR de 3.5h).\n- Recomendo programar uma manutenção preventiva imediata na mesa gravimétrica e classificadores da Kepler Weber para evitar perdas de grão descartado.\n- A eficiência geral de produção de sementes ensacadas está em **81.4%**. Podemos aumentar este indicador em até **7%** se otimizarmos as transições de troca de cultivar de soja no loteamento de sementes de soja.\n\nComo posso ajudar você com melhores especificações de processos hoje?"
    });
  }

  try {
    // Instantiate recommended SDK for Google Gen AI
    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });

    // Load actual DB stats to pass to context for grounded business calculations
    const statsSummary = {
      totalUbs: db.ubs.length,
      unidades: db.ubs.map(u => u.nome).join(", "),
      totalEquipamentos: db.equipments.length,
      totalParadas: db.stops.length,
      tempoParadoTotal: db.stops.reduce((acc, curr) => acc + curr.tempoParadoMinutos, 0) + " minutos",
      totalSacosProduzidos: db.productions.reduce((acc, curr) => acc + curr.quantidade, 0) + " sacos",
      principaisEquipamentosComParada: db.stops.slice(0, 3).map(s => `${s.equipamentoNome} (${s.categoria}: ${s.tempoParadoMinutos} min)`).join("; "),
      rankingCausasId: db.stops.slice(0, 5).map(s => `${s.categoria} - ${s.motivo}`).join("; ")
    };

    const systemInstruction = `Você é o "IA Operacional UBS", um assistente executivo altamente experiente e especializado em processos industriais e de sementes nas Unidades de Beneficiamento de Sementes (UBS).
Você fala estritamente em Português do Brasil com tom altamente profissional, objetivo, de suporte corporativo eficiente.
Você tem acesso aos seguintes dados de estatísticas em tempo real do sistema Operacional:
- Unidades Ativas: ${statsSummary.unidades} (Total: ${statsSummary.totalUbs})
- Equipamentos Cadastrados: ${statsSummary.totalEquipamentos}
- Volume de Produção Total Registrado: ${statsSummary.totalSacosProduzidos}
- Incidentes de Paradas Registrados: ${statsSummary.totalParadas} (Total de ${statsSummary.tempoParadoTotal} parado)
- Principais ocorrências de gargalo: ${statsSummary.principaisEquipamentosComParada}

Use esses dados para:
1. Responder perguntas de forma realística sobre o que está acontecedo na fábrica.
2. Sugerir melhorias imediatas para processos de recebimento, classificação, secagem, padronização, tratamento e ensaque.
3. Explicar conceitos industriais como OEE (Disponibilidade, Eficiência, Qualidade), tempos de reparo (MTTR) e confiabilidade de ativos (MTBF) focados em sementes de alta qualidade (soja, milho, algodão).

Seja conciso, evite rodeios técnicos acadêmicos e dê sugestões acionáveis para líderes de turno e supervisores agrícolas.`;

    const contents = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach(turn => {
        contents.push({
          role: turn.sender === "user" ? "user" : "model",
          parts: [{ text: turn.text }]
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });

    const reply = response.text || "Fui capaz de interpretar seus dados, no entanto não recebi texto válido de volta.";
    res.json({ reply });
  } catch (error: any) {
    console.error("Erro ao chamar o Gemini API:", error);
    res.status(500).json({ error: "Erro interno no processamento de linguagem natural do assistente UBS. Tente mais tarde." });
  }
});

// --- RELATÓRIOS EXPORT & AUDITORIA DOWNLOADS ---
app.get("/api/reports/export", requireAuth, (req, res) => {
  const { format } = req.query; // pdf | excel
  
  // Como estamos em ambiente web no iframe, geramos um payload estruturado para impressão em tela,
  // ou simulação com excel amigável que o browser executa em formato CSV/JSON com cabeçalho limpo.
  const auditLogs = db.auditLogs;
  const stops = db.stops;
  const productions = db.productions;
  const equipments = db.equipments;

  res.json({
    dataGeracao: new Date().toISOString(),
    formato: format || "pdf",
    stops,
    productions,
    equipments,
    auditLogs
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok"
  });
});

// Let's configure Vite in development, static in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[UBS SUITE COMPORTADA] Servidor rodando na porta ${PORT} de forma segura`);
  });
}

startServer().catch((e) => {
  console.error("Falha ao inicializar o servidor Express + Vite de alta eficiência:", e);
});
