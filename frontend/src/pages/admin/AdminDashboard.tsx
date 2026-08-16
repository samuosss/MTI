import { useEffect, useState } from "react";
import DashboardLayout from "./DashboardLayout";
import OverviewTab from "./OverviewTab";
import ProductsTab from "./ProductsTab";
import QuotesTab from "./QuotesTab";
import PlaceholderTab from "./PlaceholderTab";
import BannerTab from "./Bannertab";
import CustomersTab from "./CustomersTab";
import SettingsTab from "./SettingsTab";
import ModeratorsTab from "./ModeratorsTab";
import CategoryManagement from "../../pages/admin/CategoryManagement";
import DeliveryPage from "./DeliveryPage"; 
import { useAuth } from "../../context/AuthContext";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const { isAdmin } = useAuth();

  // Safety net: if a non-admin somehow lands on "moderators" (e.g. stale
  // deep link), bounce them back to the overview instead of rendering it.
  useEffect(() => {
    if (activeSection === "moderators" && !isAdmin) {
      setActiveSection("overview");
    }
  }, [activeSection, isAdmin]);

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {activeSection === "overview" && (
        <OverviewTab onViewAllQuotes={() => setActiveSection("quotes")} />
      )}
      {activeSection === "products" && <ProductsTab />}
      {activeSection === "categories" && <CategoryManagement />}
      {activeSection === "quotes" && <QuotesTab />}
      {activeSection === "customers" && <CustomersTab />}
      {activeSection === "settings" && <SettingsTab />}
      {activeSection === "moderators" && isAdmin && <ModeratorsTab />}
      {["analytics"].includes(activeSection) && (
        <PlaceholderTab section={activeSection} />
      )}
      {activeSection === "banner" && <BannerTab />}
      {activeSection === "delivery" && <DeliveryPage />}
    </DashboardLayout>
  );
}