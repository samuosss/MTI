import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import {
  Heart, ShoppingCart, LayoutDashboard, Menu, X,
  ChevronDown, ChevronRight, User, LogOut,
  Monitor, Laptop, Wifi, HardDrive, Cpu, Headphones, Server,
} from "lucide-react";
import logo from "@/imports/new-removebg-preview.png";
import { listCategoriesTree } from "../../api/products";
import type { CategoryTreeOut } from "../../types/product";
import { useAuthModal } from "../../context/AuthModalContext";
import { useCustomerAuth } from "../../context/CustomerAuthContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Desktops: Monitor,
  Laptops: Laptop,
  Workstations: Server,
  Networking: Wifi,
  Storage: HardDrive,
  Components: Cpu,
  Accessories: Headphones,
};

const FEATURED_BRANDS = ["Dell", "HP", "Lenovo", "Cisco", "Fortinet", "Synology"];

const OTHER_LINKS = [
  { label: "Services IT", path: "/services" },
  { label: "Support", path: "/quote" },
];

function AccountMenu({
  fullName,
  onLogout,
  open,
  setOpen,
}: {
  fullName: string;
  onLogout: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="hidden md:flex items-center gap-2 text-sm font-semibold text-muted-foreground border border-border px-4 py-2 rounded-md hover:border-accent hover:text-accent transition-colors"
      >
        <User size={15} />
        {fullName.split(" ")[0]}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
            >
              <LogOut size={14} /> Déconnexion
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMarketOpen, setMobileMarketOpen] = useState(false);
  const [mobileCatId, setMobileCatId] = useState<number | null>(null);

  const [categories, setCategories] = useState<CategoryTreeOut[]>([]);
  const [megaOpen, setMegaOpen] = useState(false);
  const [hoveredCat, setHoveredCat] = useState<CategoryTreeOut | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const { openAuthModal } = useAuthModal();
  const { isAuthenticated, customer, logout } = useCustomerAuth();
  const { cartCount } = useCart();
  const { wishlist } = useWishlist();

  useEffect(() => {
    listCategoriesTree().then((cats) => {
      setCategories(cats);
      if (cats.length > 0) setHoveredCat(cats[0]);
    });
  }, []);

  const openMega = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMegaOpen(true);
  }, []);

  const closeMega = useCallback(() => {
    closeTimer.current = setTimeout(() => setMegaOpen(false), 120);
  }, []);

  const keepMega = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const goToCategory = (categoryId: number) => {
    setMegaOpen(false);
    setMobileOpen(false);
    navigate(`/marketplace?category=${categoryId}`);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav ref={navRef} className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-24">

        {/* Logo */}
        <Link to="/" className="flex items-center shrink-0">
          <img src={logo} alt="MTI Logo" className="h-20 lg:h-24 w-auto object-contain" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1 text-sm font-medium text-muted-foreground">

          {/* Marketplace trigger */}
          <div className="relative">
            <button
              onMouseEnter={openMega}
              onMouseLeave={closeMega}
              onClick={() => navigate("/marketplace")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-medium transition-colors
                ${megaOpen || isActive("/marketplace") ? "text-accent" : "text-muted-foreground hover:text-accent"}`}
            >
              Boutique
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* ── Full-width Mega Menu ── */}
            {megaOpen && (
              <div
                onMouseEnter={keepMega}
                onMouseLeave={closeMega}
                className="fixed left-0 right-0 bg-white border-t border-b border-border shadow-2xl"
                style={{
                  top: navRef.current ? navRef.current.getBoundingClientRect().bottom : 96,
                  animation: "megaFadeIn 0.15s ease-out",
                  zIndex: 49,
                }}
              >
                <div className="max-w-7xl mx-auto flex" style={{ minHeight: 340 }}>

                  {/* Left panel — parent categories (fixed width, accent bg) */}
                  <div className="w-96 bg-gray-50 border-r border-border py-4 flex-shrink-0">
                    <p className="px-5 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Categories
                    </p>
                    {categories.map((cat) => {
                      const Icon = CATEGORY_ICONS[cat.name] ?? Monitor;
                      const active = hoveredCat?.id === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onMouseEnter={() => setHoveredCat(cat)}
                          onClick={() => goToCategory(cat.id)}
                          className={`w-full flex items-center justify-between gap-3 px-5 py-3 text-sm font-medium transition-colors
                            ${active
                              ? "bg-accent text-white"
                              : "text-foreground hover:bg-orange-50 hover:text-accent"
                            }`}
                        >
                          <span className="flex items-center gap-3">
                            <Icon size={15} className="flex-shrink-0" />
                            {cat.name}
                          </span>
                          {cat.children?.length > 0 && (
                            <ChevronRight size={13} className="opacity-50 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right panel — subcategories in columns like tunisianet */}
                  <div className="flex-1 px-8 py-6">
                    {hoveredCat && (
                      <>
                        {/* Category title */}
                        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border">
                          {(() => {
                            const Icon = CATEGORY_ICONS[hoveredCat.name] ?? Monitor;
                            return <Icon size={18} className="text-accent" />;
                          })()}
                          <h3 className="text-base font-bold text-foreground">{hoveredCat.name}</h3>
                        </div>

                        {hoveredCat.children?.length > 0 ? (
                          /* Multi-column grid — adapts: 2 cols for few items, up to 4 for many */
                          <div
                            className="grid gap-x-8 gap-y-1"
                            style={{
                              gridTemplateColumns: `repeat(${Math.min(
                                Math.ceil(hoveredCat.children.length / 4),
                                4
                              )}, minmax(160px, 1fr))`,
                            }}
                          >
                            {hoveredCat.children.map((sub: CategoryTreeOut) => (
                              <button
                                key={sub.id}
                                onClick={() => goToCategory(sub.id)}
                                className="flex items-center gap-2.5 py-2.5 text-sm text-foreground hover:text-accent transition-colors text-left group border-b border-transparent hover:border-accent/20"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-accent/30 group-hover:bg-accent transition-colors flex-shrink-0" />
                                {sub.name}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => goToCategory(hoveredCat.id)}
                            className="flex items-center gap-1.5 text-sm text-accent font-medium hover:underline"
                          >
                            Parcourir tout {hoveredCat.name} <ChevronRight size={13} />
                          </button>
                        )}

                        <button
                          onClick={() => goToCategory(hoveredCat.id)}
                          className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline uppercase tracking-wide"
                        >
                          Voir tout {hoveredCat.name} <ChevronRight size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Brand strip */}
                <div className="border-t border-border bg-gray-50">
                  <div className="max-w-7xl mx-auto px-5 py-3 flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-2 flex-shrink-0">
                      Marques
                    </span>
                    {FEATURED_BRANDS.map((brand) => (
                      <button
                        key={brand}
                        onClick={() => { setMegaOpen(false); navigate(`/marketplace?brand=${brand}`); }}
                        className="text-xs font-semibold text-foreground hover:text-accent px-3 py-1.5 rounded-md hover:bg-white transition-colors border border-transparent hover:border-border"
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Other links */}
          {OTHER_LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.path}
              className={`px-4 py-2.5 rounded-lg transition-colors
                ${isActive(l.path) ? "text-accent border-b-2 border-accent pb-1" : "text-muted-foreground hover:text-accent"}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/wishlist")}
            className="hidden md:flex relative text-muted-foreground hover:text-accent transition-colors"
          >
            <Heart size={20} />
            {wishlist.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </button>

          <Link to="/cart" className="relative flex text-muted-foreground hover:text-accent transition-colors">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          {isAuthenticated && customer ? (
            <AccountMenu
              fullName={customer.full_name}
              onLogout={logout}
              open={accountMenuOpen}
              setOpen={setAccountMenuOpen}
            />
          ) : (
            <button
              onClick={() => openAuthModal("login")}
              className="hidden md:flex items-center gap-2 text-sm font-semibold text-muted-foreground border border-border px-4 py-2 rounded-md hover:border-accent hover:text-accent transition-colors"
            >
              <User size={15} />
              Se connecter
            </button>
          )}

          
          <Link
            to="/quote"
            className="hidden md:flex bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-md hover:bg-orange-600 transition-colors"
          >
            Demander un devis
          </Link>

          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white px-4 py-4 flex flex-col gap-2 shadow-lg">
          <button
            onClick={() => setMobileMarketOpen((v) => !v)}
            className="flex items-center justify-between text-sm font-medium text-foreground hover:text-accent transition-colors py-1"
          >
            <span>Boutique</span>
            <ChevronDown size={14} className={`transition-transform ${mobileMarketOpen ? "rotate-180" : ""}`} />
          </button>

          {mobileMarketOpen && (
            <div className="ml-3 border-l-2 border-border pl-3 flex flex-col gap-1">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.name] ?? Monitor;
                return (
                  <div key={cat.id}>
                    <button
                      onClick={() => setMobileCatId(mobileCatId === cat.id ? null : cat.id)}
                      className="w-full flex items-center justify-between py-2 text-sm text-foreground hover:text-accent transition-colors"
                    >
                      <span className="flex items-center gap-2"><Icon size={13} />{cat.name}</span>
                      {cat.children?.length > 0 && (
                        <ChevronDown size={12} className={`transition-transform ${mobileCatId === cat.id ? "rotate-180" : ""}`} />
                      )}
                    </button>
                    {mobileCatId === cat.id && cat.children?.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => goToCategory(sub.id)}
                        className="w-full text-left pl-6 py-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
                      >
                        ↳ {sub.name}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {OTHER_LINKS.map((l) => (
            <Link key={l.label} to={l.path} onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-foreground hover:text-accent transition-colors py-1">
              {l.label}
            </Link>
          ))}

          <Link to="/wishlist" onClick={() => setMobileOpen(false)}
            className="text-sm font-medium text-foreground hover:text-accent py-1">
            Favoris {wishlist.length > 0 && `(${wishlist.length})`}
          </Link>

          <Link to="/cart" onClick={() => setMobileOpen(false)}
            className="text-sm font-medium text-foreground hover:text-accent py-1">
            Panier {cartCount > 0 && `(${cartCount})`}
          </Link>

          {isAuthenticated && customer ? (
            <button
              onClick={() => { logout(); setMobileOpen(false); }}
              className="text-left text-sm font-medium text-foreground hover:text-accent py-1 flex items-center gap-2"
            >
              <LogOut size={14} /> Déconnexion ({customer.full_name.split(" ")[0]})
            </button>
          ) : (
            <button
              onClick={() => { openAuthModal("login"); setMobileOpen(false); }}
              className="text-left text-sm font-medium text-foreground hover:text-accent py-1 flex items-center gap-2"
            >
              <User size={14} /> Se connecter
            </button>
          )}

          <button onClick={() => { navigate("/admin"); setMobileOpen(false); }}
            className="text-left text-sm font-medium text-foreground hover:text-accent py-1">
            Tableau de bord admin
          </button>

          <Link to="/quote" onClick={() => setMobileOpen(false)}
            className="bg-accent text-white text-center font-semibold py-3 rounded-md hover:bg-orange-600 transition-colors mt-2">
            Demander un devis
          </Link>
        </div>
      )}

      <style>{`
        @keyframes megaFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </nav>
  );
}