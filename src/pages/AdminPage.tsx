import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminKiosks from "@/components/admin/AdminKiosks";
import AdminTransactions from "@/components/admin/AdminTransactions";
import AdminPricing from "@/components/admin/AdminPricing";
import AdminTemplates from "@/components/admin/AdminTemplates";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminCameraSettings from "@/components/admin/AdminCameraSettings";
import AdminLoyalty from "@/components/admin/AdminLoyalty";
import AdminVenues from "@/components/admin/AdminVenues";
import AdminPromoDisplay from "@/components/admin/AdminPromoDisplay";
import AdminRevenueSplits from "@/components/admin/AdminRevenueSplits";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminHardware from "@/components/admin/AdminHardware";
import AdminVouchers from "@/components/admin/AdminVouchers";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

const AdminPage = () => {
  const [activeSection, setActiveSection] = useState("overview");
  useRealtimeNotifications();

  const renderContent = () => {
    switch (activeSection) {
      case "overview": return <AdminOverview />;
      case "kiosks": return <AdminKiosks />;
      case "hardware": return <AdminHardware />;
      case "camera": return <AdminCameraSettings />;
      case "transactions": return <AdminTransactions />;
      case "pricing": return <AdminPricing />;
      case "templates": return <AdminTemplates />;
      case "venues": return <AdminVenues />;
      case "users": return <AdminUsers />;
      case "promo-display": return <AdminPromoDisplay />;
      case "revenue": return <AdminRevenueSplits />;
      case "vouchers": return <AdminVouchers />;
      case "loyalty": return <AdminLoyalty />;
      case "analytics": return <AdminAnalytics />;
      default: return <AdminOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border p-4 flex items-center gap-4 shrink-0">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm text-muted-foreground">← Kembali ke Home</span>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
