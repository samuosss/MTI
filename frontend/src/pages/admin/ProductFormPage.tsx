import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router";
import { ArrowLeft, X, Plus, Trash2, ImagePlus, GripVertical, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import {
  listProducts,
  createProduct,
  updateProduct,
  setPrimaryImage,
  deleteProductImage,
  listCategories,
  listBrands,
  type ProductWriteInput,
} from "../../api/products";
import { resolveImageUrl } from "../../api/client";
import type { ProductOut, CategoryOut, BrandOut } from "../../types/product";

export const PRODUCT_CHANNEL_NAME = "mti-admin-products";

const SPEC_LABELS = ["RAM", "Processor", "Graphics Card", "Storage", "Screen"] as const;
type SpecLabel = (typeof SPEC_LABELS)[number];

interface SpecRow {
  label: SpecLabel;
  value: string;
  notes: string;
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
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">Images actuelles</p>
          <div className="flex flex-wrap gap-2">
            {existingImages.map((img) => (
              <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 group flex-shrink-0"
                style={{ borderColor: img.is_primary ? "hsl(var(--primary))" : "hsl(var(--border))" }}>
                <img src={resolveImageUrl(img.image_url)} alt="" className="w-full h-full object-cover" />
                {img.is_primary && (
                  <span className="absolute bottom-0 left-0 right-0 bg-primary/90 text-white text-[8px] text-center font-bold py-0.5 tracking-wide">PRINCIPAL</span>
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
                      Définir comme principal
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Survolez une image pour la supprimer ou la définir comme principal.</p>
        </div>
      )}
      <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
        <ImagePlus size={24} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">Déposez les images ici ou <span className="text-primary font-semibold">parcourez</span></p>
        <p className="text-xs text-muted-foreground">La première nouvelle image devient la photo de couverture</p>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onChange([...files, ...Array.from(e.target.files ?? [])])} />
      </div>
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-border group flex-shrink-0">
              <img src={src} alt="" className="w-full h-full object-cover" />
              {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-[8px] text-center font-bold py-0.5">COUVERTURE</span>}
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
          <input placeholder="Valeur (ex. 16 Go)" value={spec.value}
            onChange={(e) => onChange(specs.map((s, j) => j === i ? { ...s, value: e.target.value } : s))}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary flex-1" />
          <input placeholder="Notes (optionnel)" value={spec.notes}
            onChange={(e) => onChange(specs.map((s, j) => j === i ? { ...s, notes: e.target.value } : s))}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary w-28" />
          <button type="button" onClick={() => onChange(specs.filter((_, j) => j !== i))}
            className="mt-2 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"><X size={14} /></button>
        </div>
      ))}
      {availableLabels.length > 0 && (
        <button type="button" onClick={() => onChange([...specs, { label: availableLabels[0], value: "", notes: "" }])}
          className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
          <Plus size={12} /> Ajouter spéc
        </button>
      )}
      {availableLabels.length === 0 && specs.length > 0 && <p className="text-xs text-muted-foreground">Tous les labels de spéc utilisés.</p>}
    </div>
  );
}

// ── Main page (standalone route, meant to be opened in its own tab) ────────
export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [brands, setBrands] = useState<BrandOut[]>([]);
  const [product, setProduct] = useState<ProductOut | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [badge, setBadge] = useState("");
  const [stock, setStock] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [specs, setSpecs] = useState<SpecRow[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<ProductOut["images"]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<ProductOut | null>(null);

  // Load categories, brands, and (if editing) the product itself.
  useEffect(() => {
    Promise.all([
      listCategories(),
      listBrands(),
      isEdit ? listProducts({ page: 1, page_size: 100 }) : Promise.resolve(null),
    ])
      .then(([cats, brs, productsRes]) => {
        setCategories(cats);
        setBrands(brs);
        if (isEdit && productsRes) {
          const found = productsRes.items.find((p) => p.id === Number(id));
          if (!found) {
            setInitError("Produit introuvable.");
            return;
          }
          setProduct(found);
          setName(found.name);
          setDescription(found.description ?? "");
          setPrice(found.price?.toString() ?? "");
          setOriginalPrice(found.original_price?.toString() ?? "");
          setBadge(found.badge ?? "");
          setStock(found.stock?.toString() ?? "0");
          setCategoryId(found.category?.id?.toString() ?? "");
          setBrandId(found.brand?.id?.toString() ?? "");
          setSpecs(found.specs.map((s) => ({ label: s.label as SpecLabel, value: s.value, notes: s.notes ?? "" })));
          setExistingImages(found.images);
        }
      })
      .catch((e) => setInitError(e instanceof Error ? e.message : "Échec du chargement."))
      .finally(() => setInitializing(false));
  }, [id, isEdit]);

  const topLevel = categories.filter((c) => c.parent_id === null);
  const subCategories = categories.filter((c) => c.parent_id !== null);

  function tryCloseTab() {
    // Works when this tab was opened via window.open() from the list page (window.opener set).
    // If the browser blocks it (e.g. tab opened by typing the URL directly), the user
    // just sees this page stay open — the success/cancel state below still makes that clear.
    window.close();
  }

  async function handleDeleteExisting(imageId: number) {
    if (!product) return;
    try {
      await deleteProductImage(product.id, imageId);
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete image.");
    }
  }

  async function handleSetPrimary(imageId: number) {
    if (!product) return;
    try {
      const updated = await setPrimaryImage(product.id, imageId);
      setExistingImages(updated.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set primary image.");
    }
  }

  async function handleSave() {
    if (!name.trim()) { setError("Le nom du produit est obligatoire."); return; }
    if (!price || isNaN(Number(price))) { setError("Un prix valide est obligatoire."); return; }
    setSaving(true);
    setError(null);
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
      const result = isEdit ? await updateProduct(product!.id, payload) : await createProduct(payload);

      // Tell the list tab it can refresh, no backend/polling needed.
      const channel = new BroadcastChannel(PRODUCT_CHANNEL_NAME);
      channel.postMessage({ type: "product-saved", product: result });
      channel.close();

      setSaved(result);
      setTimeout(tryCloseTab, 900); // auto-close if the browser allows it
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la sauvegarde. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle size={28} className="text-red-500 mx-auto mb-3" />
          <p className="font-semibold text-foreground mb-1">{initError}</p>
          <button onClick={tryCloseTab} className="text-sm text-primary font-semibold hover:underline mt-2">
            Fermer cet onglet
          </button>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
          <p className="font-bold text-foreground mb-1">{isEdit ? "Produit mis à jour" : "Produit créé"}</p>
          <p className="text-sm text-muted-foreground mb-5">"{saved.name}" a été enregistré. Cet onglet peut être fermé.</p>
          <button onClick={tryCloseTab}
            className="bg-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-900 transition-colors text-sm">
            Fermer cet onglet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-border bg-white flex-shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={tryCloseTab} className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors flex-shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">{isEdit ? "Modifier le produit" : "Nouvelle annonce"}</h1>
            {isEdit && product && <p className="text-xs text-muted-foreground truncate">{product.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={tryCloseTab} className="px-4 py-2 text-sm border border-border text-muted-foreground rounded-lg hover:border-primary hover:text-foreground transition-colors">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            className="bg-primary text-white font-semibold px-5 py-2 rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm">
            {saving ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Créer un produit"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
              <AlertCircle size={15} />{error}
            </div>
          )}

          <section className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Informations de base</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Nom du produit *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Dell OptiPlex 7090"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brève description du produit..." rows={3}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors resize-none" />
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Prix et inventaire</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Prix (TND) *</label>
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Prix d'origine (optionnel)</label>
                <input type="number" min="0" step="0.01" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="Affiché barré"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Stock (unités)</label>
                <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Insigne</label>
                <select value={badge} onChange={(e) => setBadge(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors bg-background">
                  <option value="">Aucun</option>
                  <option value="IN STOCK">EN STOCK</option>
                  <option value="CUSTOM BUILD">PERSONNALISÉ</option>
                  <option value="OUT OF STOCK">HOR STOCK</option>
                </select>
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Classification</h3>
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

          <section className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Caractéristiques techniques</h3>
            <SpecBuilder specs={specs} onChange={setSpecs} />
          </section>

          <section className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">{isEdit ? "Ajouter d'autres images" : "Images du produit"}</h3>
            <ImageUploader files={images} onChange={setImages} existingImages={existingImages}
              onDeleteExisting={isEdit ? handleDeleteExisting : undefined}
              onSetPrimary={isEdit ? handleSetPrimary : undefined} />
          </section>

          <div className="flex gap-3 pb-4">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-primary text-white font-semibold py-3 rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm">
              {saving ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Créer un produit"}
            </button>
            <button onClick={tryCloseTab} className="px-6 border border-border text-muted-foreground rounded-xl hover:border-primary transition-colors text-sm">
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}