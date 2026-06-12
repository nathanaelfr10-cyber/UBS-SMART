import { useState } from "react";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  FlameKindling,
  Cylinder,
  FileSpreadsheet, 
  ShieldAlert, 
  Sparkles, 
  LogOut, 
  Menu, 
  ChevronLeft,
  ChevronRight,
  Shield,
  Wrench,
  Package
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: {
    nome: string;
    email: string;
    funcao: string;
    turno: string;
    unidade: string;
  };
  onLogout: () => void;
}

export default function Sidebar({ currentTab, setCurrentTab, user, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Operador", "Líder", "Supervisor", "Coordenador", "Administrador"] },
    { id: "ubs", label: "Cadastros UBS", icon: Building2, roles: ["Supervisor", "Coordenador", "Administrador"] },
    { id: "users", label: "Colaboradores", icon: Users, roles: ["Supervisor", "Coordenador", "Administrador"] },
    { id: "equipments", label: "Monitor de Ativos", icon: Wrench, roles: ["Operador", "Líder", "Supervisor", "Coordenador", "Administrador"] },
    { id: "stops", label: "Registro de Paradas", icon: ShieldAlert, roles: ["Operador", "Líder", "Supervisor", "Coordenador", "Administrador"] },
    { id: "production", label: "Controle de Produção", icon: Package, roles: ["Operador", "Líder", "Supervisor", "Coordenador", "Administrador"] },
    { id: "reports", label: "Relatórios & Exportação", icon: FileSpreadsheet, roles: ["Operador", "Líder", "Supervisor", "Coordenador", "Administrador"] },
    { id: "audit", label: "Trilha de Auditoria", icon: Shield, roles: ["Supervisor", "Coordenador", "Administrador"] },
    { id: "ai_assistant", label: "IA Operacional UBS", icon: Sparkles, roles: ["Operador", "Líder", "Supervisor", "Coordenador", "Administrador"], highlight: true },
  ];

  // Filter menu based on user role
  const filteredMenu = menuItems.filter(item => item.roles.includes(user.funcao));

  return (
    <>
      {/* Mobile Header Banner */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-sm tracking-tight">UBS SMART</span>
        </div>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Backdrop for mobile drawer */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        />
      )}

      {/* Main Corporate Sidebar */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 bg-slate-900 text-white border-r border-slate-800 z-50 flex flex-col transition-all duration-300
          ${collapsed ? "w-20" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        id="side_menu_rail"
      >
        {/* Toggle Collapse Button on Desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute top-6 -right-3 w-6 h-6 bg-blue-900 rounded-full border border-slate-800 items-center justify-center text-slate-300 hover:text-white hover:bg-blue-700 cursor-pointer shadow-lg"
          title={collapsed ? "Expandir Menu" : "Recolher Menu"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Sidebar Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 rounded-lg backdrop-blur-md border border-blue-500/10 shrink-0">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h2 className="text-sm font-bold tracking-tight text-white uppercase">UBS SMART</h2>
              <span className="text-[9px] text-slate-400 font-mono tracking-widest block mt-0.5">ESTATÍSTICAS & OEE</span>
            </div>
          )}
        </div>

        {/* Navigation Menu List */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1 scrollbar-thin">
          {filteredMenu.map(item => {
            const IconComponent = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200
                  ${isActive 
                    ? "bg-blue-900 text-white shadow-md shadow-blue-950/20" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800/80"}
                  ${item.highlight && !isActive ? "border border-blue-500/25 bg-blue-950/20 text-blue-300 hover:bg-blue-950/40" : ""}
                `}
                title={collapsed ? item.label : ""}
              >
                <IconComponent className={`w-5 h-5 shrink-0 transition-transform ${isActive ? "scale-110" : ""}`} />
                {(!collapsed || mobileOpen) && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
                {item.highlight && !collapsed && (
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer Section */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          {(!collapsed || mobileOpen) ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/20 text-xs font-bold leading-none select-none shrink-0">
                  {user.nome.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-slate-200 truncate">{user.nome}</h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.funcao} • {user.unidade}</p>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">{user.turno}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/50">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-red-950/30 hover:bg-red-900/50 text-[10px] font-medium text-red-300 transition-colors cursor-pointer"
                  title="Encerrar Sessão Segura"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div 
                className="w-9 h-9 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/20 text-xs font-bold shrink-0 select-none"
                title={`${user.nome} (${user.funcao})`}
              >
                {user.nome.substring(0, 2).toUpperCase()}
              </div>
              <button 
                onClick={onLogout} 
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Encerrar Sessão"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
