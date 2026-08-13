import { useState } from "react";
import DashboardLayout from "./DashboardLayout";
import OverviewTab from "./OverviewTab";
import ProductsTab from "./ProductsTab";
import QuotesTab from "./QuotesTab";
import PlaceholderTab from "./PlaceholderTab";
import BannerTab from "./Bannertab";
import CustomersTab from "./CustomersTab";
import SettingsTab from "./SettingsTab";
import CategoryManagement from "../../pages/admin/CategoryManagement";


export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {activeSection === "overview" && (
        <OverviewTab onViewAllQuotes={() => setActiveSection("quotes")} />
      )}
      {activeSection === "products" && <ProductsTab />}
      {activeSection === "categories" && <CategoryManagement />}
      {activeSection === "quotes" && <QuotesTab />}
      {activeSection === "customers" && <CustomersTab />}
      {activeSection === "settings" && <SettingsTab/>}
      {[ "analytics"].includes(activeSection) && (
        <PlaceholderTab section={activeSection} />
      )}
      {activeSection === "banner" && <BannerTab />}
    </DashboardLayout>
  );
}