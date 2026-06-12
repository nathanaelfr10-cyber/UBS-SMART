import { useState, useEffect, FormEvent } from "react";
import { User, Ubs } from "../types";
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  ShieldCheck, 
  Key, 
  ShieldAlert, 
  Timer, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  Edit, 
  UserPlus, 
  X, 
  Globe 
} from "lucide-react";

interface UserManagerProps {
  userRole: string;
}

export default function UserManager({ userRole }: UserManagerProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [ubsList, setUbsList] = useState<Ubs[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create/Edit Form states
  const [editingUsr, setEditingUsr] = useState<any | null>(null);
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [funcao, setFuncao] = useState<"Operador" | "Líder" | "Supervisor" | "Coordenador" | "Administrador">("Operador");
  const [turno, setTurno] = useState("Turno A");
  const [unidade, setUnidade] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"Ativo" | "Inativo">("Ativo");
  const [showForm, setShowForm] = useState(false);

  // Authorize managers: Coordinators and Admins can write
  const canWrite = ["Administrador", "Coordenador"].includes(userRole);

  const loadData = async () => {
    setLoading(true);
    try {
      const authHeader = { "Authorization": `Bearer ${localStorage.getItem("ubs_token")}` };
      
      // Fetch users
      const usersRes = await fetch("/api/users", { headers: authHeader });
      const usersData = await usersRes.json();
      setUsers(usersData);

      // Fetch UBSs
      const ubsRes = await fetch("/api/ubs", { headers: authHeader });
      const ubsData = await ubsRes.json();
      setUbsList(ubsData);
      if (ubsData.length > 0 && !unidade) {
        setUnidade(ubsData[0].nome);
      }
    } catch (err: any) {
      console.error(err);
      setError("Erro ao ler dados de colaboradores do sistema.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateForm = () => {
    setEditingUsr(null);
    setNome("");
    setMatricula("");
    setFuncao("Operador");
    setTurno("Turno A");
    setEmail("");
    setStatus("Ativo");
    if (ubsList.length > 0) {
      setUnidade(ubsList[0].nome);
    }
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const handleOpenEditForm = (usr: any) => {
    setEditingUsr(usr);
    setNome(usr.nome);
    setMatricula(usr.matricula || "");
    setFuncao(usr.funcao);
    setTurno(usr.turno || "Turno A");
    setUnidade(usr.unidade || "");
    setEmail(usr.email || "");
    setStatus(usr.status || "Ativo");
    setShowForm(true);
    setError("");
    setSuccess("");
    setTimeout(() => {
      document.getElementById("user_form_anchor")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setError("");
    setSuccess("");

    if (!nome || !matricula || !funcao || !turno || !unidade) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const isEditing = !!editingUsr;
      const url = isEditing ? `/api/users/${editingUsr.id}` : "/api/users";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("ubs_token")}`
        },
        body: JSON.stringify({ nome, matricula, funcao, turno, unidade, email, status })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ocorreu uma falha no salvamento.");

      setSuccess(`Colaborador ${nome} ${isEditing ? "atualizado" : "registrado"} com sucesso.`);
      setNome("");
      setMatricula("");
      setFuncao("Operador");
      setTurno("Turno A");
      setEmail("");
      setStatus("Ativo");
      setEditingUsr(null);
      setShowForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Erro de validação ou segurança.");
    }
  };

  const filteredUsers = users.filter(usr => 
    usr.nome.toLowerCase().includes(search.toLowerCase()) ||
    (usr.matricula && usr.matricula.toLowerCase().includes(search.toLowerCase())) ||
    usr.email.toLowerCase().includes(search.toLowerCase()) ||
    usr.funcao.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" id="user_management_panel">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-1 gap-4 border-b border-[#151f33] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-[#1565C0]" />
            Gerenciamento de Operadores & Equipes
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-mono">
            Controle de perfis, turnos de beneficiamento, transferência entre UBS e inativação
          </p>
        </div>

        {canWrite && (
          <button
            onClick={handleOpenCreateForm}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-[#1565C0] hover:bg-[#1565C0]/85 text-white rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Colaborador</span>
          </button>
        )}
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {error && (
        <div className="p-4 bg-rose-950/40 border-l-4 border-[#ff1744] text-rose-200 text-xs font-semibold rounded flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-[#ff1744]" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-950/40 border-l-4 border-[#00C853] text-emerald-200 text-xs font-semibold rounded flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#00C853]" />
          <span>{success}</span>
        </div>
      )}

      {/* FORM REGISTRATION SECTION */}
      {showForm && canWrite && (
        <div className="bg-[#0a0f1d] rounded-xl shadow-2xl border border-[#151f33] p-6 animate-fade-in" id="user_form_anchor">
          <div className="flex justify-between items-center mb-4 border-b border-[#151f33] pb-2">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#1565C0]" />
              {editingUsr ? `Editar Colaborador: ${editingUsr.nome}` : "Novo Colaborador - Dados de Cadastro"}
            </h2>
            <button 
              onClick={() => { setShowForm(false); setEditingUsr(null); }}
              className="text-slate-400 hover:text-slate-350 rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end text-slate-300">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nome Completo
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Carlos Alberto de Oliveira"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="block w-full px-3 py-2 text-xs border border-[#151f33] bg-[#070a13] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Matrícula (Código Funcional)
              </label>
              <input
                type="text"
                required
                placeholder="Ex: MAT-882"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className="block w-full px-3 py-2 text-xs border border-[#151f33] bg-[#070a13] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0] font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="carlos@ubs.com"
                  value={email}
                  disabled={!!editingUsr}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-2 py-2 text-xs border border-[#151f33] bg-[#070a13] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0] disabled:bg-[#121c32] disabled:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Perfil de Acesso
              </label>
              <select
                value={funcao}
                onChange={(e) => setFuncao(e.target.value as any)}
                className="block w-full py-2 px-2 text-xs border border-[#151f33] bg-[#070a13] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer"
              >
                <option value="Operador">Operador (Painel)</option>
                <option value="Líder">Líder (Campo)</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Coordenador">Coordenador</option>
                <option value="Administrador">Administrador Geral</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Turno de Trabalho
              </label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
                className="block w-full py-2 px-2 text-xs border border-[#151f33] bg-[#070a13] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer"
              >
                <option value="Turno A">Turno A (06:00 - 14:00)</option>
                <option value="Turno B">Turno B (14:00 - 22:00)</option>
                <option value="Turno C">Turno C (22:00 - 06:00)</option>
                <option value="Administrativo">Administrativo Comercial</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Unidade Base (Transferir UBS)
              </label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="block w-full py-2 px-2 text-xs border border-[#151f33] bg-[#070a13] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer font-bold"
              >
                {ubsList.map(u => (
                  <option key={u.id} value={u.nome}>{u.nome} ({u.cidade})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Estado do Cadastro (Ativo / Inativo)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="block w-full py-2 px-2 text-xs border border-[#151f33] bg-[#070a13] rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] cursor-pointer font-mono"
              >
                <option value="Ativo">🟢 Ativo (Em Operação)</option>
                <option value="Inativo">🔴 Inativo (Bloqueado/Afastado)</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full px-4 py-2 text-xs font-bold bg-[#1565C0] border border-transparent rounded-lg shadow-md text-white hover:bg-[#1565C0]/85 focus:outline-none focus:ring-2 focus:ring-blue-650 transition-all cursor-pointer h-9 shrink-0 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{editingUsr ? "Atualizar Operador" : "Registrar Operador"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER SEARCH AND DATA LIST */}
      <div className="bg-[#0a0f1d] rounded-xl shadow-2xl border border-[#151f33] p-5 space-y-4">
        {/* Search Header */}
        <div className="flex justify-between items-center gap-4 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar colaborador por nome, email ou matrícula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 text-xs border border-[#151f33] rounded-lg bg-[#070a13] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
            />
          </div>
        </div>

        {/* LIST TABLE */}
        <div className="overflow-x-auto text-slate-300 rounded-xl border border-[#151f33]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#070a13] text-slate-200 uppercase text-[10px] font-mono tracking-wider border-b border-[#151f33]">
              <tr>
                <th className="px-6 py-3.5">Colaborador / Operador</th>
                <th className="px-6 py-3.5">Matrícula</th>
                <th className="px-6 py-3.5">E-mail Corporativo</th>
                <th className="px-6 py-3.5">Turno</th>
                <th className="px-6 py-3.5">Unidade UBS</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-center">Perfil de Acesso</th>
                {canWrite && <th className="px-6 py-3.5 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151f33]">
              {loading ? (
                <tr>
                  <td colSpan={canWrite ? 8 : 7} className="text-center py-10 text-slate-500 font-mono">
                    Carregando colaboradores corporativos...
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map(usr => (
                  <tr key={usr.id} className={`hover:bg-[#121c32]/50 transition-colors ${usr.status === "Inativo" ? "opacity-40 bg-[#070a13]/50" : ""}`}>
                    <td className="px-6 py-4 font-bold text-slate-100 text-sm flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs
                        ${usr.status === "Inativo" 
                          ? "bg-slate-800 text-slate-500 border border-slate-700" 
                          : "bg-blue-950/40 border border-blue-900/30 text-blue-300"}`}>
                        {usr.nome.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className={usr.status === "Inativo" ? "line-through text-slate-500" : "text-slate-100"}>{usr.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400 text-xs">{usr.matricula || "S/M"}</td>
                    <td className="px-6 py-4 text-slate-400">{usr.email}</td>
                    <td className="px-6 py-4 text-slate-300 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5 text-slate-500" />
                        {usr.turno}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-blue-400">{usr.unidade}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase
                        ${usr.status === "Inativo" 
                          ? "bg-rose-950/40 text-[#ff1744] border border-rose-900/40" 
                          : "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30"}`}>
                        {usr.status || "Ativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider
                        ${usr.funcao === "Administrador" 
                          ? "bg-rose-950/30 text-[#ff1744] border border-rose-900/40" 
                          : usr.funcao === "Supervisor" || usr.funcao === "Coordenador"
                          ? "bg-amber-950/30 text-amber-400 border border-amber-900/40"
                          : "bg-blue-950/30 text-blue-300 border border-blue-900/40"}
                      `}>
                        {usr.funcao}
                      </span>
                    </td>
                    {canWrite && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleOpenEditForm(usr)}
                          className="px-2 py-1.5 text-slate-400 hover:text-[#2196F3] hover:bg-[#121c32] rounded-lg border border-transparent hover:border-[#151f33] transition-all inline-flex items-center gap-1 cursor-pointer"
                          title="Editar/Transferir/Inativar Colaborador"
                        >
                          <Edit className="w-4 h-4" />
                          <span className="text-[10px] font-bold">Gerenciar</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canWrite ? 8 : 7} className="text-center py-10 text-slate-500 font-mono">
                    Nenhum colaborador encontrado com as definições informadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security alert block when not Admin/Coordinator */}
      {!canWrite && (
        <div className="bg-[#0a0f1d] shadow-inner rounded-xl border border-[#151f33] p-4 flex gap-3 text-slate-455">
          <Lock className="w-5 h-5 text-slate-500 shrink-0" />
          <div className="text-xs">
            <p className="font-bold uppercase text-slate-300 tracking-wider">Apenas Consulta ao Sistema</p>
            <p className="mt-0.5 text-slate-400">Seu nível atual de permissão ({userRole}) não autoriza gerenciar, editar ou inativar contas de colaboradores. Contate um Administrador ou Coordenador se precisar realizar alterações operacionais.</p>
          </div>
        </div>
      )}
    </div>
  );
}
