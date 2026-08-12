import { useState, useEffect, useMemo } from "react";
import { Plus, X, Pencil, Trash2, ImagePlus, GripVertical, AlertCircle, CheckCircle, Search, ChevronDown } from "lucide-react";
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  setPrimaryImage,
  deleteProductImage,
  listCategories,
  listBrands,
  type ProductWriteInput,
} from "../../api/products";
import { resolveImageUrl } from "../../api/client";
import type { ProductOut, CategoryOut, BrandOut } from "../../types/product";
import { useRef } from "react";

const SPEC_LABELS = ["RAM", "Processor", "Graphics Card", "Storage", "Screen"] as const;
type SpecLabel = (typeof SPEC_LABELS)[number];

interface SpecRow {
  label: SpecLabel;
  value: string;
  notes: string;
}

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

// ── Image Uploader ────────────────────────────────────────────────────────────
function ImageUploader({
  files, onChange, existingImages, onDeleteExisting, onSetPrimary,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  existingImages?: { id: number; image_url: string; is_primary: boolean }[];
  onDeleteExisting?: (id: number) => void;
  onSetPrimary?: (id: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = files.map((f) => URL.createObjectURL(f));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    onChange([...files, ...dropped]);
  };

  return (
    <div className="space-y-3">
      {existingImages && existingImages.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">Current Images</p>
          <div className="flex flex-wrap gap-2">
            {existingImages.map((img) => (
              <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 group flex-shrink-0"
                style={{ borderColor: img.is_primary ? "hsl(var(--primary))" : "hsl(var(--border))" }}>
                <img src={resolveImageUrl(img.image_url)} alt="" className="w-full h-full object-cover" />
                {img.is_primary && (
                  <span className="absolute bottom-0 left-0 right-0 bg-primary/90 text-white text-[8px] text-center font-bold py-0.5 tracking-wide">PRIMARY</span>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                  {onDeleteExisting && (
                    <button type="button" onClick={() => onDeleteExisting(img.id)}
                      className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors">
                      <Trash2 size={11} />
                    </button>
                  )}
                  {onSetPrimary && !img.is_primary && (
                    <button type="button" onClick={() => onSetPrimary(img.id)}
                      className="text-[9px] font-bold bg-primary/90 hover:bg-primary text-white px-1.5 py-0.5 rounded-full transition-colors whitespace-nowrap">
                      Set primary
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Hover an image to delete it or set it as primary.</p>
        </div>
      )}
      <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
        <ImagePlus size={24} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">Drop images here or <span className="text-primary font-semibold">browse</span></p>
        <p className="text-xs text-muted-foreground">First new image becomes the cover photo</p>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onChange([...files, ...Array.from(e.target.files ?? [])])} />
      </div>
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-border group flex-shrink-0">
              <img src={src} alt="" className="w-full h-full object-cover" />
              {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-[8px] text-center font-bold py-0.5">COVER</span>}
              <button type="button" onClick={(e) => { e.stopPropagation(); onChange(files.filter((_, j) => j !== i)); }}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Spec Builder ──────────────────────────────────────────────────────────────
function SpecBuilder({ specs, onChange }: { specs: SpecRow[]; onChange: (specs: SpecRow[]) => void }) {
  const usedLabels = specs.map((s) => s.label);
  const availableLabels = SPEC_LABELS.filter((l) => !usedLabels.includes(l));

  return (
    <div className="space-y-2">
      {specs.map((spec, i) => (
        <div key={i} className="flex gap-2 items-start">
          <GripVertical size={14} className="mt-2.5 text-muted-foreground flex-shrink-0" />
          <select value={spec.label} onChange={(e) => onChange(specs.map((s, j) => j === i ? { ...s, label: e.target.value as SpecLabel } : s))}
            className="border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-primary bg-background w-36 flex-shrink-0">
            <option value={spec.label}>{spec.label}</option>
            {availableLabels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <input placeholder="Value (e.g. 16GB)" value={spec.value}
            onChange={(e) => onChange(specs.map((s, j) => j === i ? { ...s, value: e.target.value } : s))}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary flex-1" />
          <input placeholder="Notes (optional)" value={spec.notes}
            onChange={(e) => onChange(specs.map((s, j) => j === i ? { ...s, notes: e.target.value } : s))}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary w-28" />
          <button type="button" onClick={() => onChange(specs.filter((_, j) => j !== i))}
            className="mt-2 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"><X size={14} /></button>
        </div>
      ))}
      {availableLabels.length > 0 && (
        <button type="button" onClick={() => onChange([...specs, { label: availableLabels[0], value: "", notes: "" }])}
          className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
          <Plus size={12} /> Add spec
        </button>
      )}
      {availableLabels.length === 0 && specs.length > 0 && <p className="text-xs text-muted-foreground">All spec labels used.</p>}
    </div>
  );
}

// ── Product Form Modal ────────────────────────────────────────────────────────
function ProductFormModal({ product, categories, brands, onClose, onSaved }: {
  product: ProductOut | null; categories: CategoryOut[]; brands: BrandOut[];
  onClose: () => void; onSaved: (p: ProductOut) => void;
}) {
  const isEdit = product !== null;
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [originalPrice, setOriginalPrice] = useState(product?.original_price?.toString() ?? "");
  const [badge, setBadge] = useState(product?.badge ?? "");
  const [stock, setStock] = useState(product?.stock?.toString() ?? "0");
  const [categoryId, setCategoryId] = useState<string>(product?.category?.id?.toString() ?? "");
  const [brandId, setBrandId] = useState<string>(product?.brand?.id?.toString() ?? "");
  const [specs, setSpecs] = useState<SpecRow[]>(
    product?.specs.map((s) => ({ label: s.label as SpecLabel, value: s.value, notes: s.notes ?? "" })) ?? []
  );
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState(product?.images ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topLevel = categories.filter((c) => c.parent_id === null);
  const subCategories = categories.filter((c) => c.parent_id !== null);

  async function handleDeleteExisting(imageId: number) {
    if (!product) return;
    try { await deleteProductImage(product.id, imageId); setExistingImages((prev) => prev.filter((img) => img.id !== imageId)); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete image."); }
  }

  async function handleSetPrimary(imageId: number) {
    if (!product) return;
    try { const updated = await setPrimaryImage(product.id, imageId); setExistingImages(updated.images); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to set primary image."); }
  }

  async function handleSave() {
    if (!name.trim()) { setError("Product name is required."); return; }
    if (!price || isNaN(Number(price))) { setError("A valid price is required."); return; }
    setSaving(true); setError(null);
    try {
      const payload: ProductWriteInput = {
        name: name.trim(), description: description.trim() || null,
        price: Number(price), original_price: originalPrice ? Number(originalPrice) : null,
        badge: badge.trim() || null, stock: Number(stock),
        category_id: categoryId ? Number(categoryId) : null,
        brand_id: brandId ? Number(brandId) : null,
        specs: specs.filter((s) => s.value.trim()).map((s) => ({ label: s.label, value: s.value.trim(), notes: s.notes.trim() || null })),
        images: images.length > 0 ? images : undefined,
        primary_index: images.length > 0 ? 0 : null,
      };
      const saved = isEdit ? await updateProduct(product!.id, payload) : await createProduct(payload);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-bold text-foreground">{isEdit ? "Edit Product" : "New Listing"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
              <AlertCircle size={15} />{error}
            </div>
          )}
          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Basic Info</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Product Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dell OptiPlex 7090"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short product description..." rows={3}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors resize-none" />
              </div>
            </div>
          </section>
          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Pricing & Inventory</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Price (TND) *</label>
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Original Price (optional)</label>
                <input type="number" min="0" step="0.01" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="Shown as crossed-out"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Stock (units)</label>
                <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Badge</label>
                <select value={badge} onChange={(e) => setBadge(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors bg-background">
                  <option value="">None</option>
                  <option value="IN STOCK">IN STOCK</option>
                  <option value="CUSTOM BUILD">CUSTOM BUILD</option>
                  <option value="OUT OF STOCK">OUT OF STOCK</option>
                </select>
              </div>
            </div>
          </section>
          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Classification</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Category</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors bg-background">
                  <option value="">— None —</option>
                  {topLevel.length > 0 && <optgroup label="Top Level">{topLevel.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                  {subCategories.length > 0 && <optgroup label="Subcategories">{subCategories.map((c) => <option key={c.id} value={c.id}>↳ {c.name}</option>)}</optgroup>}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Brand</label>
                <select value={brandId} onChange={(e) => setBrandId(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors bg-background">
                  <option value="">— None —</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
          </section>
          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Technical Specs</h3>
            <SpecBuilder specs={specs} onChange={setSpecs} />
          </section>
          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">{isEdit ? "Add More Images" : "Product Images"}</h3>
            <ImageUploader files={images} onChange={setImages} existingImages={existingImages}
              onDeleteExisting={isEdit ? handleDeleteExisting : undefined}
              onSetPrimary={isEdit ? handleSetPrimary : undefined} />
          </section>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border sticky bottom-0 bg-card">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm">
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
          </button>
          <button onClick={onClose} className="px-5 border border-border text-muted-foreground rounded-lg hover:border-primary transition-colors text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ProductsTab ──────────────────────────────────────────────────────────
export default function ProductsTab() {
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [brands, setBrands] = useState<BrandOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<ProductOut | null>(null);
  const [showAdd, setShowAdd] = useState(false);
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

  // ── Filtered products ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return products.filter((p) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const inName = p.name.toLowerCase().includes(q);
        const inBrand = p.brand?.name.toLowerCase().includes(q) ?? false;
        if (!inName && !inBrand) return false;
      }
      // Category — match product category id OR its parent id
      if (filterCategoryId) {
        const catId = Number(filterCategoryId);
        const match = p.category?.id === catId ||
          categories.find((c) => c.id === p.category?.id)?.parent_id === catId;
        if (!match) return false;
      }
      // Brand
      if (filterBrandId && p.brand?.id !== Number(filterBrandId)) return false;
      // Stock
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

  const handleSaved = (saved: ProductOut) => {
    setProducts((prev) => {
      const exists = prev.find((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
    });
    setEditingProduct(null);
    setShowAdd(false);
    setToast({ message: editingProduct ? "Product updated." : "Product created.", type: "success" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setToast({ message: "Product deleted.", type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Delete failed.", type: "error" });
    } finally { setDeletingId(null); }
  };

  // Build category options: top-level + sub
  const topLevelCats = categories.filter((c) => c.parent_id === null);
  const subCats = categories.filter((c) => c.parent_id !== null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading…" : (
            <>
              <span className="font-semibold text-foreground">{filtered.length}</span>
              {filtered.length !== products.length && (
                <span className="text-muted-foreground"> / {products.length}</span>
              )}
              {" "}product{products.length !== 1 ? "s" : ""}
              {activeFilterCount > 0 && <span className="text-primary font-medium"> (filtered)</span>}
            </>
          )}
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus size={15} /> New Listing
        </button>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border p-3 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or brand…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="relative">
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className={`appearance-none pl-3 pr-8 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:border-primary transition-colors cursor-pointer ${
              filterCategoryId ? "border-primary text-primary font-semibold" : "border-border text-foreground"
            }`}
          >
            <option value="">All Categories</option>
            {topLevelCats.length > 0 && (
              <optgroup label="— Top Level —">
                {topLevelCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            )}
            {subCats.length > 0 && (
              <optgroup label="— Subcategories —">
                {subCats.map((c) => <option key={c.id} value={c.id}>↳ {c.name}</option>)}
              </optgroup>
            )}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {/* Brand filter */}
        <div className="relative">
          <select
            value={filterBrandId}
            onChange={(e) => setFilterBrandId(e.target.value)}
            className={`appearance-none pl-3 pr-8 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:border-primary transition-colors cursor-pointer ${
              filterBrandId ? "border-primary text-primary font-semibold" : "border-border text-foreground"
            }`}
          >
            <option value="">All Brands</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {/* Stock filter */}
        <div className="relative">
          <select
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value)}
            className={`appearance-none pl-3 pr-8 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:border-primary transition-colors cursor-pointer ${
              filterStock ? "border-primary text-primary font-semibold" : "border-border text-foreground"
            }`}
          >
            <option value="">All Stock</option>
            <option value="low">Low Stock (≤5)</option>
            <option value="out">Out of Stock</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline px-2 py-2"
          >
            <X size={12} /> Clear ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Active filter chips */}
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
              {filterStock === "low" ? "Low Stock" : "Out of Stock"}
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

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary border-b border-border">
            <tr>
              <th className="text-left text-xs text-muted-foreground font-semibold px-4 py-3">Product</th>
              <th className="text-left text-xs text-muted-foreground font-semibold px-4 py-3 hidden md:table-cell">Category</th>
              <th className="text-left text-xs text-muted-foreground font-semibold px-4 py-3">Price</th>
              <th className="text-left text-xs text-muted-foreground font-semibold px-4 py-3 hidden sm:table-cell">Stock</th>
              <th className="text-left text-xs text-muted-foreground font-semibold px-4 py-3">Status</th>
              <th className="text-right text-xs text-muted-foreground font-semibold px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Loading products…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-sm font-semibold text-foreground mb-1">
                    {products.length === 0 ? "No products yet." : "No products match your filters."}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {products.length === 0 ? "Add your first listing." : "Try adjusting your search or filters."}
                  </p>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-primary font-semibold hover:underline">
                      Clear all filters
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
                  <td className="px-4 py-3 text-sm font-bold text-foreground">{p.price.toLocaleString()} TND</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs font-semibold ${p.stock === 0 ? "text-red-500" : p.stock <= 5 ? "text-orange-500" : "text-green-600"}`}>
                      {p.stock === 0 ? "Out of stock" : `${p.stock} units`}
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
                      <button onClick={() => setEditingProduct(p)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/10">
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

      {(showAdd || editingProduct) && (
        <ProductFormModal product={editingProduct} categories={categories} brands={brands}
          onClose={() => { setShowAdd(false); setEditingProduct(null); }} onSaved={handleSaved} />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}