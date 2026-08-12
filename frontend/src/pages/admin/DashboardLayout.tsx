import { useState } from "react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard, Package, ListOrdered, Users, BarChart3, Settings,
  Menu, Bell, LogOut, Activity, Download, Image,
} from "lucide-react";
import logo from "@/imports/new-removebg-preview.png";
import { useAuth } from "../../context/AuthContext";

export const navItems = [
  { icon: LayoutDashboard, label: "Dashboard Overview", id: "overview" },
  { icon: Package, label: "Product Management", id: "products" },
  { icon: ListOrdered, label: "Quote Requests", id: "quotes" },
  { icon: Image, label: "Hero Slideshow", id: "banner" },
  { icon: Users, label: "Customers", id: "customers" },
  { icon: BarChart3, label: "Analytics", id: "analytics" },
  { icon: Settings, label: "Settings", id: "settings" },
];

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
  const navigate = useNavigate();
  const { logout } = useAuth();

  function handleBackToSite() {
    navigate("/");
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-60 bg-primary flex flex-col transition-transform duration-300`}
      >
        <div className="p-5 border-b border-white/10 flex items-center gap-3">
          <img src={logo} alt="MTI" className="h-15 w-auto object-contain brightness-0 invert" />
          <div className="text-white text-xs leading-tight">
            <div className="font-bold">Admin Console</div>
            <div className="opacity-60">Back Office</div>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
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
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <Bell size={15} /> Support
          </button>
          <button
            onClick={handleBackToSite}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOut size={15} /> Back to Site
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOut size={15} /> Sign Out
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
              {navItems.find((n) => n.id === activeSection)?.label ?? "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
              <Activity size={12} /> Last 30 Days
            </div>
            <button className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-900 transition-colors">
              <Download size={13} /> Export Report
            </button>
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">A</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}