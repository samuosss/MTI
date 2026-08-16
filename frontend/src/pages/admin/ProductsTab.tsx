import { useState, useEffect, useMemo } from "react";
import { Plus, X, Pencil, Trash2, ImagePlus, AlertCircle, CheckCircle, Search, ChevronDown } from "lucide-react";
import { listProducts, deleteProduct, listCategories, listBrands } from "../../api/products";
import { resolveImageUrl, formatPrice } from "../../api/client";
import type { ProductOut, CategoryOut, BrandOut } from "../../types/product";
import { PRODUCT_CHANNEL_NAME } from "../../pages/admin/ProductFormPage";

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
      {type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

// ── Main ProductsTab ──────────────────────────────────────────────────────────
export default function ProductsTab() {
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [brands, setBrands] = useState<BrandOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("");
  const [filterBrandId, setFilterBrandId] = useState<string>("");
  const [filterStock, setFilterStock] = useState<string>("");  // "all" | "low" | "out"

  useEffect(() => {
    Promise.all([listProducts(), listCategories(), listBrands()])
      .then(([pr, cats, brs]) => { setProducts(pr.items); setCategories(cats); setBrands(brs); })
      .catch(() => setToast({ message: "Failed to load products.", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  // Listen for saves happening in the add/edit tab and merge them in live.
  useEffect(() => {
    const channel = new BroadcastChannel(PRODUCT_CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event.data?.type === "product-saved") {
        const saved: ProductOut = event.data.product;
        setProducts((prev) => {
          const exists = prev.find((p) => p.id === saved.id);
          return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
        });
        setToast({ message: "Produit enregistré.", type: "success" });
      }
    };
    return () => channel.close();
  }, []);

  // ── Filtered products ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const inName = p.name.toLowerCase().includes(q);
        const inBrand = p.brand?.name.toLowerCase().includes(q) ?? false;
        if (!inName && !inBrand) return false;
      }
      if (filterCategoryId) {
        const catId = Number(filterCategoryId);
        const match = p.category?.id === catId ||
          categories.find((c) => c.id === p.category?.id)?.parent_id === catId;
        if (!match) return false;
      }
      if (filterBrandId && p.brand?.id !== Number(filterBrandId)) return false;
      if (filterStock === "low" && p.stock > 5) return false;
      if (filterStock === "out" && p.stock !== 0) return false;
      return true;
    });
  }, [products, search, filterCategoryId, filterBrandId, filterStock, categories]);

  const activeFilterCount = [
    search.trim() ? 1 : 0,
    filterCategoryId ? 1 : 0,
    filterBrandId ? 1 : 0,
    filterStock ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setSearch("");
    setFilterCategoryId("");
    setFilterBrandId("");
    setFilterStock("");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce produit ? Cette action ne peut pas être annulée.")) return;
    setDeletingId(id);
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setToast({ message: "Produit supprimé.", type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Échec de la suppression.", type: "error" });
    } finally { setDeletingId(null); }
  };

  const topLevelCats = categories.filter((c) => c.parent_id === null);
  const subCats = categories.filter((c) => c.parent_id !== null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? "Chargement..." : (
            <>
              <span className="font-semibold text-foreground">{filtered.length}</span>
              {filtered.length !== products.length && (
                <span className="text-muted-foreground"> / {products.length}</span>
              )}
              {" "}produit{products.length !== 1 ? "s" : ""}
              {activeFilterCount > 0 && <span className="text-primary font-medium"> (filtré)</span>}
            </>
          )}
        </p>
        <button
          onClick={() => window.open("/admin/products/new", "_blank")}
          className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus size={15} /> Nouvelle annonce
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou marque..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className={`appearance-none pl-3 pr-8 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:border-primary transition-colors cursor-pointer ${
              filterCategoryId ? "border-primary text-primary font-semibold" : "border-border text-foreground"
            }`}
          >
            <option value="">Toutes les catégories</option>
            {topLevelCats.length > 0 && (
              <optgroup label="— Niveau supérieur —">
                {topLevelCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            )}
            {subCats.length > 0 && (
              <optgroup label="— Sous-catégories —">
                {subCats.map((c) => <option key={c.id} value={c.id}>↳ {c.name}</option>)}
              </optgroup>
            )}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterBrandId}
            onChange={(e) => setFilterBrandId(e.target.value)}
            className={`appearance-none pl-3 pr-8 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:border-primary transition-colors cursor-pointer ${
              filterBrandId ? "border-primary text-primary font-semibold" : "border-border text-foreground"
            }`}
          >
            <option value="">Toutes les marques</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value)}
            className={`appearance-none pl-3 pr-8 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:border-primary transition-colors cursor-pointer ${
              filterStock ? "border-primary text-primary font-semibold" : "border-border text-foreground"
            }`}
          >
            <option value="">Tous les stocks</option>
            <option value="low">Stock faible (≥05)</option>
            <option value="out">En rupture</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline px-2 py-2"
          >
            <X size={12} /> Effacer ({activeFilterCount})
          </button>
        )}
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filterCategoryId && (
            <span className="flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-xs px-3 py-1 rounded-full font-medium">
              {categories.find((c) => c.id === Number(filterCategoryId))?.name}
              <button onClick={() => setFilterCategoryId("")}><X size={10} /></button>
            </span>
          )}
          {filterBrandId && (
            <span className="flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-xs px-3 py-1 rounded-full font-medium">
              {brands.find((b) => b.id === Number(filterBrandId))?.name}
              <button onClick={() => setFilterBrandId("")}><X size={10} /></button>
            </span>
          )}
          {filterStock && (
            <span className="flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-600 text-xs px-3 py-1 rounded-full font-medium">
              {filterStock === "low" ? "Stock faible" : "En rupture"}
              <button onClick={() => setFilterStock("")}><X size={10} /></button>
            </span>
          )}
          {search.trim() && (
            <span className="flex items-center gap-1 bg-secondary border border-border text-foreground text-xs px-3 py-1 rounded-full font-medium">
              "{search}"
              <button onClick={() => setSearch("")}><X size={10} /></button>
            </span>
          )}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary border-b border-border">
            <tr>
              <th className="text-left text-xs text-muted-foreground font-semibold px-4 py-3">Produit</th>
              <th className="text-left text-xs text-muted-foreground font-semibold px-4 py-3 hidden md:table-cell">Catégorie</th>
              <th className="text-left text-xs text-muted-foreground font-semibold px-4 py-3">Prix</th>
              <th className="text-left text-xs text-muted-foreground font-semibold px-4 py-3 hidden sm:table-cell">Stock</th>
              <th className="text-left text-xs text-muted-foreground font-semibold px-4 py-3">Statut</th>
              <th className="text-right text-xs text-muted-foreground font-semibold px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Chargement des produits...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-sm font-semibold text-foreground mb-1">
                    {products.length === 0 ? "Aucun produit pour le moment." : "Aucun produit ne correspond à vos filtres."}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {products.length === 0 ? "Ajoutez votre première annonce." : "Essayez d'ajuster votre recherche ou vos filtres."}
                  </p>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-primary font-semibold hover:underline">
                      Effacer tous les filtres
                    </button>
                  )}
                </td>
              </tr>
            )}
            {filtered.map((p) => {
              const primaryImg = p.images.find((i) => i.is_primary) ?? p.images[0];
              return (
                <tr key={p.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                        {primaryImg ? (
                          <img src={resolveImageUrl(primaryImg.image_url)} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImagePlus size={14} /></div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-accent">{p.brand?.name ?? "—"}</p>
                        <p className="text-sm font-semibold text-foreground line-clamp-1 max-w-[160px]">{p.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      {p.category?.name ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground">{formatPrice(p.price)} TND</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs font-semibold ${p.stock === 0 ? "text-red-500" : p.stock <= 5 ? "text-orange-500" : "text-green-600"}`}>
                      {p.stock === 0 ? "En rupture" : `${p.stock} unités`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.badge === "IN STOCK" ? "bg-green-100 text-green-700" :
                      p.badge === "CUSTOM BUILD" ? "bg-blue-100 text-blue-700" :
                      "bg-secondary text-muted-foreground"
                    }`}>
                      {p.badge ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => window.open(`/admin/products/${p.id}/edit`, "_blank")}
                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/10">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                        className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}