-- SCRIPT SQL DE CRIAÇÃO DO BANCO DE DADOS (POSTGRESQL / SQLITE IMPLEMENTATION REFERENCE)
-- Este arquivo serve como referência direta para migrar o sistema UBS de JSON/SQLite para PostgreSQL corporativo no Hostinger/Railway.

-- Tabela de UBS
CREATE TABLE IF NOT EXISTS ubs (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    responsavel VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'Ativa' CHECK (status IN ('Ativa', 'Inativa')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Usuários (com Perfis de Acesso)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    matricula VARCHAR(50) NOT NULL UNIQUE,
    funcao VARCHAR(50) NOT NULL CHECK (funcao IN ('Operador', 'Líder', 'Supervisor', 'Coordenador', 'Administrador')),
    turno VARCHAR(50) NOT NULL,
    unidade VARCHAR(100) REFERENCES ubs(nome) ON UPDATE CASCADE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Equipamentos
CREATE TABLE IF NOT EXISTS equipments (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    processo VARCHAR(100) NOT NULL, -- Recebimento, Secagem, Limpeza, Beneficiamento, Tratamento, Ensaque
    setor VARCHAR(100) NOT NULL,
    unidade VARCHAR(100) REFERENCES ubs(nome) ON UPDATE CASCADE,
    fabricante VARCHAR(100),
    modelo VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Manutenção')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Registro de Paradas
CREATE TABLE IF NOT EXISTS stops (
    id VARCHAR(50) PRIMARY KEY,
    ubs VARCHAR(100) REFERENCES ubs(nome) ON UPDATE CASCADE,
    processo VARCHAR(100) NOT NULL,
    equipamento_id VARCHAR(50) REFERENCES equipments(id),
    equipamento_nome VARCHAR(100) NOT NULL,
    operador VARCHAR(100) NOT NULL,
    data_inicio DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    data_fim DATE,
    hora_fim TIME,
    motivo TEXT NOT NULL,
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('Mecânica', 'Elétrica', 'Operacional', 'Processo', 'Limpeza', 'Troca de cultivar', 'Logística', 'Programada', 'Outros')),
    observacao TEXT,
    tempo_parado_minutos INT NOT NULL DEFAULT 0,
    tempo_produtivo_minutos INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Controle de Produção
CREATE TABLE IF NOT EXISTS productions (
    id VARCHAR(50) PRIMARY KEY,
    material VARCHAR(100) NOT NULL, -- Soja, Milho, Algodão, etc.
    cultivar VARCHAR(100) NOT NULL,
    lote VARCHAR(100) NOT NULL,
    quantidade INT NOT NULL, -- Em sacos
    processo VARCHAR(100) NOT NULL,
    operador VARCHAR(100) NOT NULL,
    ubs VARCHAR(100) REFERENCES ubs(nome) ON UPDATE CASCADE,
    data_registro DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Auditoria (Registro de Ações)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    usuario VARCHAR(100) NOT NULL,
    data DATE NOT NULL,
    hora TIME NOT NULL,
    acao VARCHAR(100) NOT NULL, -- Login, Logout, Inclusão, Alteração, Exclusão
    detalhes TEXT NOT NULL
);

-- Índices Recomendados para Otimização de Relatórios Operacionais
CREATE INDEX IF NOT EXISTS idx_stops_ubs_date ON stops(ubs, data_inicio);
CREATE INDEX IF NOT EXISTS idx_productions_ubs_date ON productions(ubs, data_registro);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(data);
