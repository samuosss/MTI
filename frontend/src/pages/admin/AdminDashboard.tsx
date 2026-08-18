import { useEffect } from "react";
import { useSearchParams } from "react-router";
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

const DEFAULT_SECTION = "overview";

export default function AdminDashboard() {
  // The active section is kept in sync with a `?tab=` query param so other
  // pages (e.g. the product create/edit tab) can deep-link straight back
  // into a specific section, like /admin?tab=products.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("tab") ?? DEFAULT_SECTION;
  const { isAdmin } = useAuth();

  function setActiveSection(id: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id === DEFAULT_SECTION) {
        next.delete("tab");
      } else {
        next.set("tab", id);
      }
      return next;
    });
  }

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