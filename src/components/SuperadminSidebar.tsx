import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Building2, Monitor, PieChart,
  TrendingUp, LogOut, LogIn, ChevronLeft, ChevronRight
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
  { id: "venues", label: "Venue & Kiosk", icon: Building2 },
  { id: "revenue", label: "Bagi Hasil", icon: PieChart },
];

interface SuperadminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const SuperadminSidebar = ({ activeSection, onSectionChange }: SuperadminSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className={`${collapsed ? "w-16" : "w-56"} transition-all duration-300 border-r border-border bg-card/50 flex flex-col shrink-0`}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div>
            <h2 className="text-sm font-bold text-foreground">Superadmin</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-[10px] text-muted-foreground font-mono">PT ZMI</span>
            </div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activeSection === item.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        {user ? (
          <button
            onClick={async () => { await signOut(); navigate("/"); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Keluar</span>}
          </button>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-primary hover:opacity-80 transition-opacity"
          >
            <LogIn className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Masuk</span>}
          </button>
        )}
      </div>
    </div>
  );
};

export default SuperadminSidebar;
