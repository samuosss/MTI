import { useState } from "react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard, Package, FolderTree, ListOrdered, Users, BarChart3, Settings,
  Menu, Bell, LogOut, Activity, Download, Image, ExternalLink, ShieldCheck, UserCog, KeyRound,
} from "lucide-react";
import logo from "@/imports/new-removebg-preview.png";
import { useAuth } from "../../context/AuthContext";
import ChangePasswordModal from "./ChangePasswordModal";

export const navItems = [
  { icon: LayoutDashboard, label: "tableau de bord", id: "overview", adminOnly: false },
  { icon: Package, label: "Gestion des produits", id: "products", adminOnly: false },
  { icon: FolderTree, label: "Catégories et marques", id: "categories", adminOnly: false },
  { icon: ListOrdered, label: "Demandes de devis", id: "quotes", adminOnly: false },
  { icon: Image, label: "Diaporama principal", id: "banner", adminOnly: false },
  { icon: Users, label: "Clients", id: "customers", adminOnly: false },
  { icon: BarChart3, label: "Analytique", id: "analytics", adminOnly: false },
  { icon: UserCog, label: "Modérateurs", id: "moderators", adminOnly: true },
  { icon: Settings, label: "Paramètres", id: "settings", adminOnly: false },
];

const ROLE_LABELS_FR: Record<string, string> = {
  admin: "Administrateur",
  moderator: "Modérateur",
};

export default function DashboardLayout({
  activeSection,
  onSectionChange,
  children,
}: {
  activeSection: string;
  onSectionChange: (id: string) => void;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const navigate = useNavigate();
  const { logout, user, isAdmin } = useAuth();

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  function handleBackToSite() {
    window.open("/", "_blank", "noopener,noreferrer");
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  const initial = user?.full_name?.trim()?.[0]?.toUpperCase() ?? "A";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-60 bg-primary flex flex-col transition-transform duration-300`}
      >
        <div className="p-5 border-b border-white/10 flex items-center gap-3">
          <img src={logo} alt="MTI" className="h-15 w-auto object-contain brightness-0 invert" />
          <div className="text-white text-xs leading-tight">
            <div className="font-bold">Console d'administration</div>
            <div className="opacity-60">Bureau d'arrière-plan</div>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onSectionChange(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${activeSection === item.id ? "bg-white/15 text-white border-r-2 border-accent" : "text-blue-200 hover:bg-white/10 hover:text-white"}`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-1">
  <button
    onClick={() => setShowChangePassword(true)}
    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
  >
    <KeyRound size={14} className="flex-shrink-0" /> Changer le mot de passe
  </button>
  <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
    <Bell size={14} className="flex-shrink-0" /> Aide
  </button>
  <button
    onClick={handleBackToSite}
    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
  >
    <ExternalLink size={14} className="flex-shrink-0" /> Retour au site
  </button>
  <button
    onClick={handleLogout}
    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
  >
    <LogOut size={14} className="flex-shrink-0" /> Déconnexion
  </button>
</div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-border px-4 sm:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold text-foreground">
              {navItems.find((n) => n.id === activeSection)?.label ?? "Tableau de bord"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
              <Activity size={12} /> 30 derniers jours
            </div>
            <button className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-900 transition-colors">
              <Download size={13} /> Exporter le rapport
            </button>
            {user && (
              <div className="hidden sm:flex items-center gap-2 pl-1">
                <div className="text-right leading-tight">
                  <div className="text-xs font-semibold text-foreground">{user.full_name}</div>
                  <div className="flex items-center gap-1 justify-end text-[10px] font-bold text-muted-foreground">
                    {isAdmin ? <ShieldCheck size={10} className="text-primary" /> : <UserCog size={10} className="text-accent" />}
                    {ROLE_LABELS_FR[user.role] ?? user.role}
                  </div>
                </div>
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
              {initial}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
          {children}
        </main>
      </div>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}