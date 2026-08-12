import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Search, ChevronDown, ChevronLeft, ChevronRight, X,
  Monitor, Laptop, Wifi, HardDrive, Cpu, Headphones, Server, SlidersHorizontal,
} from "lucide-react";
import Footer from "../components/layout/Footer";
import ProductCard from "../components/products/ProductCard";
import { listProducts, listCategoriesTree, listBrands } from "../api/products";
import type { ProductOut, CategoryTreeOut, BrandOut } from "../types/product";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Desktops: Monitor, Laptops: Laptop, Workstations: Server,
  Networking: Wifi, Storage: HardDrive, Components: Cpu, Accessories: Headphones,
};

const SORT_OPTIONS = [
  { label: "Newest Arrivals", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Name A–Z", value: "name" },
];

const PAGE_SIZE = 12;

function FilterSection({
  title, children, defaultOpen = true,
}: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-sm font-bold text-primary uppercase tracking-wide mb-3"
      >
        {title}
        <ChevronDown size={14} className={`transition-transform duration-200 text-muted-foreground ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function PriceSlider({ min, max, value, onChange }: {
  min: number; max: number; value: [number, number]; onChange: (v: [number, number]) => void;
}) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div>
      <div className="relative h-5 flex items-center mb-3">
        <div className="absolute left-0 right-0 h-1.5 bg-border rounded-full" />
        <div className="absolute h-1.5 bg-primary rounded-full" style={{ left: `${pct(value[0])}%`, right: `${100 - pct(value[1])}%` }} />
        <input type="range" min={min} max={max} step={50} value={value[0]}
          onChange={(e) => { const v = Number(e.target.value); if (v < value[1]) onChange([v, value[1]]); }}
          className="absolute w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <input type="range" min={min} max={max} step={50} value={value[1]}
          onChange={(e) => { const v = Number(e.target.value); if (v > value[0]) onChange([value[0], v]); }}
          className="absolute w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-xs font-semibold text-muted-foreground">
        <span>{value[0].toLocaleString()} TND</span>
        <span>{value[1].toLocaleString()} TND</span>
      </div>
    </div>
  );
}

function CheckItem({ label, count, checked, onChange }: {
  label: string; count?: number; checked: boolean; onChange: () => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer py-1 group">
      <div className="flex items-center gap-2">
        <div onClick={onChange} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${checked ? "bg-primary border-primary" : "border-border group-hover:border-primary/60"}`}>
          {checked && (
            <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white fill-none stroke-current stroke-2">
              <polyline points="1.5,5 4,7.5 8.5,2.5" />
            </svg>
          )}
        </div>
        <span className="text-sm text-foreground">{label}</span>
      </div>
      {count !== undefined && <span className="text-xs text-muted-foreground">({count})</span>}
    </label>
  );
}

function extractSpecValues(products: ProductOut[], label: string): string[] {
  const vals = new Set<string>();
  products.forEach((p) => p.specs.filter((s) => s.label.toLowerCase() === label.toLowerCase()).forEach((s) => vals.add(s.value)));
  return Array.from(vals).sort();
}

export default function MarketplacePage({
  onAddToCart,
}: {
  onAddToCart: (p: ProductOut, qty: number) => void;
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlCategory = searchParams.get("category");
  const urlBrand = searchParams.get("brand");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(urlCategory ? Number(urlCategory) : null);
  const [activeBrandIds, setActiveBrandIds] = useState<number[]>([]);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [hoveredCatId, setHoveredCatId] = useState<number | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [selectedRam, setSelectedRam] = useState<string[]>([]);
  const [selectedProcessor, setSelectedProcessor] = useState<string[]>([]);
  const [selectedStorage, setSelectedStorage] = useState<string[]>([]);

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000]);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(20000);
  const [priceInitialized, setPriceInitialized] = useState(false);

  const [allProducts, setAllProducts] = useState<ProductOut[]>([]);
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<CategoryTreeOut[]>([]);
  const [brands, setBrands] = useState<BrandOut[]>([]);
  const [loading, setLoading] = useState(true);

  const ramOptions = extractSpecValues(allProducts, "RAM");
  const processorOptions = extractSpecValues(allProducts, "Processor");
  const storageOptions = extractSpecValues(allProducts, "Storage");

  // ── hero carousel deep-link: ?product=<slug> → navigate to product page
  useEffect(() => {
    const slug = searchParams.get("product");
    if (!slug) return;
    setSearchParams((prev) => { prev.delete("product"); return prev; }, { replace: true });
    navigate(`/product/${slug}`);
  }, []);

  useEffect(() => {
    if (!urlBrand || brands.length === 0) return;
    const match = brands.find((b) => b.name.toLowerCase() === urlBrand.toLowerCase());
    if (match) setActiveBrandIds([match.id]);
  }, [urlBrand, brands]);

  useEffect(() => {
    const catParam = searchParams.get("category");
    if (catParam) {
      setActiveCategoryId(Number(catParam));
      setSearchParams((prev) => { prev.delete("category"); return prev; }, { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    Promise.all([listCategoriesTree(), listBrands()]).then(([cats, brs]) => {
      setCategories(cats);
      setBrands(brs);
    });
  }, []);

  useEffect(() => {
    listProducts({ page: 1, page_size: 200, category_id: activeCategoryId ?? undefined, brand_id: activeBrandIds.length === 1 ? activeBrandIds[0] : undefined })
      .then((res) => {
        setAllProducts(res.items);
        if (!priceInitialized && res.items.length > 0) {
          const prices = res.items.map((p) => p.price);
          const mn = Math.floor(Math.min(...prices) / 50) * 50;
          const mx = Math.ceil(Math.max(...prices) / 50) * 50;
          setPriceMin(mn); setPriceMax(mx); setPriceRange([mn, mx]);
          setPriceInitialized(true);
        }
      });
  }, [activeCategoryId, activeBrandIds]);

  useEffect(() => { setPriceInitialized(false); }, [activeCategoryId, activeBrandIds]);

  useEffect(() => {
    setLoading(true);
    listProducts({
      page, page_size: PAGE_SIZE,
      search: debouncedSearch || undefined,
      category_id: activeCategoryId ?? undefined,
      brand_id: activeBrandIds.length === 1 ? activeBrandIds[0] : undefined,
      sort: sort as "newest" | "price_asc" | "price_desc" | "name",
    })
      .then((res) => {
        let items = res.items;
        items = items.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);
        if (selectedRam.length > 0) items = items.filter((p) => p.specs.some((s) => s.label.toLowerCase() === "ram" && selectedRam.includes(s.value)));
        if (selectedProcessor.length > 0) items = items.filter((p) => p.specs.some((s) => s.label.toLowerCase() === "processor" && selectedProcessor.includes(s.value)));
        if (selectedStorage.length > 0) items = items.filter((p) => p.specs.some((s) => s.label.toLowerCase() === "storage" && selectedStorage.includes(s.value)));
        setProducts(items);
        setTotal(items.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, activeCategoryId, activeBrandIds, sort, priceRange, selectedRam, selectedProcessor, selectedStorage]);

  useEffect(() => { setPage(1); }, [debouncedSearch, activeCategoryId, activeBrandIds, sort, priceRange, selectedRam, selectedProcessor, selectedStorage]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const toggleBrand = (id: number) => setActiveBrandIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleSpec = (val: string, selected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) =>
    setSelected((prev) => prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]);

  const clearAll = () => {
    setActiveCategoryId(null); setActiveBrandIds([]); setSearch(""); setSort("newest");
    setSelectedRam([]); setSelectedProcessor([]); setSelectedStorage([]);
    setPriceRange([priceMin, priceMax]);
  };

  const activeCategoryName = activeCategoryId
    ? categories.flatMap((c) => [c, ...(c.children ?? [])]).find((c) => c.id === activeCategoryId)?.name ?? ""
    : "";

  const activeFiltersCount =
    (activeCategoryName ? 1 : 0) + activeBrandIds.length + selectedRam.length +
    selectedProcessor.length + selectedStorage.length +
    (priceRange[0] !== priceMin || priceRange[1] !== priceMax ? 1 : 0);

  const SidebarContent = (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground text-sm">Filtrer</h3>
        {activeFiltersCount > 0 && (
          <button onClick={clearAll} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            <X size={11} /> Effacer ({activeFiltersCount})
          </button>
        )}
      </div>

      <FilterSection title="Catégories">
        <div className="space-y-0.5">
          <button onClick={() => setActiveCategoryId(null)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${activeCategoryId === null ? "text-primary font-semibold" : "text-foreground hover:text-primary"}`}>
            Tous les produits
          </button>
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.name] ?? Monitor;
            const isParentActive = activeCategoryId === cat.id;
            const isChildActive = cat.children?.some((s) => s.id === activeCategoryId);
            const showSubs = hoveredCatId === cat.id || isChildActive;
            return (
              <div key={cat.id} onMouseEnter={() => setHoveredCatId(cat.id)} onMouseLeave={() => setHoveredCatId(null)}>
                <button onClick={() => setActiveCategoryId(cat.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${isParentActive || isChildActive ? "text-primary font-semibold" : "text-foreground hover:text-primary"}`}>
                  <input type="checkbox" readOnly checked={isParentActive || isChildActive} className="w-3.5 h-3.5 accent-primary flex-shrink-0" />
                  <Icon size={13} className="flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-left">{cat.name}</span>
                  {cat.children?.length > 0 && <span className="text-xs text-muted-foreground">+</span>}
                </button>
                {cat.children?.length > 0 && (
                  <div className={`overflow-hidden transition-all duration-200 ${showSubs ? "max-h-60" : "max-h-0"}`}>
                    <div className="pl-6 space-y-0.5">
                      {cat.children.map((sub) => (
                        <button key={sub.id} onClick={() => setActiveCategoryId(sub.id)}
                          className={`w-full flex items-center gap-2 px-2 py-1 text-xs rounded-lg transition-colors ${activeCategoryId === sub.id ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"}`}>
                          <input type="checkbox" readOnly checked={activeCategoryId === sub.id} className="w-3 h-3 accent-primary flex-shrink-0" />
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Prix">
        <PriceSlider min={priceMin} max={priceMax} value={priceRange} onChange={setPriceRange} />
      </FilterSection>

      {brands.length > 0 && (
        <FilterSection title="Fabricants">
          <div className="space-y-0.5">
            {brands.map((b) => (
              <CheckItem key={b.id} label={b.name} checked={activeBrandIds.includes(b.id)} onChange={() => toggleBrand(b.id)} />
            ))}
          </div>
        </FilterSection>
      )}

      {ramOptions.length > 0 && (
        <FilterSection title="Mémoire" defaultOpen={false}>
          <div className="space-y-0.5">
            {ramOptions.map((v) => <CheckItem key={v} label={v} checked={selectedRam.includes(v)} onChange={() => toggleSpec(v, selectedRam, setSelectedRam)} />)}
          </div>
        </FilterSection>
      )}

      {processorOptions.length > 0 && (
        <FilterSection title="Processeur" defaultOpen={false}>
          <div className="space-y-0.5">
            {processorOptions.map((v) => <CheckItem key={v} label={v} checked={selectedProcessor.includes(v)} onChange={() => toggleSpec(v, selectedProcessor, setSelectedProcessor)} />)}
          </div>
        </FilterSection>
      )}

      {storageOptions.length > 0 && (
        <FilterSection title="Stockage" defaultOpen={false}>
          <div className="space-y-0.5">
            {storageOptions.map((v) => <CheckItem key={v} label={v} checked={selectedStorage.includes(v)} onChange={() => toggleSpec(v, selectedStorage, setSelectedStorage)} />)}
          </div>
        </FilterSection>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-background overflow-y-auto p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground">Filtres</h2>
              <button onClick={() => setMobileSidebarOpen(false)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            {SidebarContent}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Marketplace</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {loading ? "Chargement…" : `${total} produit${total !== 1 ? "s" : ""} trouvé${total !== 1 ? "s" : ""}`}
              {activeCategoryName && <span className="ml-2 text-primary font-medium">— {activeCategoryName}</span>}
            </p>
          </div>
          <button onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden flex items-center gap-2 border border-border px-3 py-2 rounded-lg text-sm font-medium">
            <SlidersHorizontal size={15} /> Filtrer
            {activeFiltersCount > 0 && (
              <span className="bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{activeFiltersCount}</span>
            )}
          </button>
        </div>

        <div className="flex gap-6">
          <aside className="hidden md:block w-56 flex-shrink-0">{SidebarContent}</aside>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher produits, marques..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div className="relative">
                <select value={sort} onChange={(e) => setSort(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:border-primary transition-colors cursor-pointer">
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {activeCategoryName && (
                  <span className="flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-xs px-3 py-1 rounded-full font-medium">
                    {activeCategoryName}<button onClick={() => setActiveCategoryId(null)}><X size={11} /></button>
                  </span>
                )}
                {activeBrandIds.map((id) => {
                  const b = brands.find((b) => b.id === id);
                  return b ? (
                    <span key={id} className="flex items-center gap-1 bg-secondary border border-border text-xs px-3 py-1 rounded-full text-foreground">
                      {b.name}<button onClick={() => toggleBrand(id)}><X size={11} /></button>
                    </span>
                  ) : null;
                })}
                {selectedRam.map((v) => (
                  <span key={v} className="flex items-center gap-1 bg-secondary border border-border text-xs px-3 py-1 rounded-full text-foreground">
                    RAM: {v}<button onClick={() => toggleSpec(v, selectedRam, setSelectedRam)}><X size={11} /></button>
                  </span>
                ))}
                {selectedProcessor.map((v) => (
                  <span key={v} className="flex items-center gap-1 bg-secondary border border-border text-xs px-3 py-1 rounded-full text-foreground">
                    CPU: {v}<button onClick={() => toggleSpec(v, selectedProcessor, setSelectedProcessor)}><X size={11} /></button>
                  </span>
                ))}
                {selectedStorage.map((v) => (
                  <span key={v} className="flex items-center gap-1 bg-secondary border border-border text-xs px-3 py-1 rounded-full text-foreground">
                    Stockage: {v}<button onClick={() => toggleSpec(v, selectedStorage, setSelectedStorage)}><X size={11} /></button>
                  </span>
                ))}
                <button onClick={clearAll} className="text-xs text-primary font-medium hover:underline">Tout effacer</button>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <div key={i} className="bg-card rounded-xl border border-border h-80 animate-pulse" />)}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-lg font-semibold mb-2">Aucun produit trouvé</p>
                <p className="text-sm">Essayez d'ajuster vos filtres ou votre recherche.</p>
                {activeFiltersCount > 0 && (
                  <button onClick={clearAll} className="mt-4 text-sm text-primary font-medium hover:underline">Effacer tous les filtres</button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p as unknown as any}
                    onView={() => navigate(`/product/${p.slug}`)}
                    onAddToCart={onAddToCart}
                    onQuote={() => navigate("/quote")}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-8 h-8 rounded-md border border-border flex items-center justify-center hover:border-primary transition-colors disabled:opacity-40">
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const n = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                  return (
                    <button key={n} onClick={() => setPage(n)}
                      className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${page === n ? "bg-primary text-white" : "border border-border hover:border-primary text-foreground"}`}>
                      {n}
                    </button>
                  );
                })}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-8 h-8 rounded-md border border-border flex items-center justify-center hover:border-primary transition-colors disabled:opacity-40">
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}