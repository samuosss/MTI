import { Routes, Route, useNavigate } from "react-router";
import { useEffect, useRef } from "react";
import Nav from "../components/layout/Nav";
import RequireAuth from "../components/RequireAuth";
import HomePage from "../pages/HomePage";
import MarketplacePage from "../pages/MarketplacePage";
import ProductPage from "../pages/ProductPage";
import ITServicesPage from "../pages/ITServicesPage";
import QuoteRequestPage from "../pages/QuoteRequestPage";
import CartPage from "../pages/CartPage";
import WishlistPage from "../pages/customer/WishlistPage";
import ResetPasswordPage from "../pages/customer/ResetPasswordPage";
import VerifyEmailPage from "../pages/VerifyEmailPage";
import LoginPage from "../pages/LoginPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AuthModal from "../components/customer/AuthModal";
import EmailVerificationBanner from "../components/layout/EmailVerificationBanner";
import { useCart } from "../context/CartContext";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import MaintenanceGate from "../components/MaintenanceGate";


function PublicLayout({ children }: { children: React.ReactNode }) {
  const { customer } = useCustomerAuth();
  const { verificationRequired, dismissVerificationRequired } = useCart();
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!verificationRequired) return;
    // Ajout au panier bloqué : ramène l'attention vers la bannière plutôt que
    // de laisser l'échec passer inaperçu, puis referme après quelques secondes.
    bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const timeout = setTimeout(dismissVerificationRequired, 5000);
    return () => clearTimeout(timeout);
  }, [verificationRequired, dismissVerificationRequired]);

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div
        ref={bannerRef}
        className={verificationRequired ? "animate-pulse" : undefined}
      >
        <EmailVerificationBanner customer={customer} />
      </div>
      <MaintenanceGate>{children}</MaintenanceGate>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const { cart, addToCart, updateQty, removeFromCart, clearCart } = useCart();

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />

        <Route path="/" element={
          <PublicLayout>
            <HomePage onAddToCart={addToCart} />
          </PublicLayout>
        } />
        <Route path="/marketplace" element={
          <PublicLayout>
            <MarketplacePage onAddToCart={addToCart} />
          </PublicLayout>
        } />
        <Route path="/product/:slug" element={
          <PublicLayout>
            <ProductPage onAddToCart={addToCart} />
          </PublicLayout>
        } />
        <Route path="/services" element={
          <PublicLayout>
            <ITServicesPage />
          </PublicLayout>
        } />
        <Route path="/quote" element={
          <PublicLayout>
            <QuoteRequestPage />
          </PublicLayout>
        } />
        <Route path="/wishlist" element={
          <PublicLayout>
            <WishlistPage />
          </PublicLayout>
        } />
        <Route path="/cart" element={
          <PublicLayout>
            <CartPage
              cart={cart}
              onUpdateQty={updateQty}
              onRemove={removeFromCart}
              onOrderPlaced={clearCart}
              onAddToCart={addToCart}
              onViewProduct={(p) => navigate(`/product/${p.slug}`)}
            />
          </PublicLayout>
        } />
      </Routes>
      <AuthModal />
    </>
  );
}