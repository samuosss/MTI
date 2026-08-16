import { useState, useEffect, useRef } from "react";
import {
  Upload, Trash2, ImageIcon, Loader2, CheckCircle2,
  AlertCircle, Eye, EyeOff, Link, X,
} from "lucide-react";
import { apiGet, apiForm, apiJson, apiDelete } from "../../api/client";
import { listProducts } from "../../api/products";
import type { ProductOut } from "../../types/product";

interface HeroSlide {
  id: number;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  link_url: string | null;
}

function resolveUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `/uploads/${url.replace(/^\/+/, "")}`;
}

export default function BannerTab() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // product picker state
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<ProductOut[]>([]);
  const [linkedProduct, setLinkedProduct] = useState<ProductOut | null>(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (productQuery.trim().length < 2) { setProductResults([]); return; }
    const t = setTimeout(() => {
      listProducts({ search: productQuery, page_size: 6 })
        .then((r) => setProductResults(r.items))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [productQuery]);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<HeroSlide[]>("/hero-slides/admin");
      setSlides(data.sort((a, b) => a.sort_order - b.sort_order));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load slides");
    } finally {
      setLoading(false);
    }
  }

  function notify(msg: string, type: "ok" | "err" = "ok") {
    if (type === "ok") { setSuccess(msg); setError(null); }
    else { setError(msg); setSuccess(null); }
    setTimeout(() => { setSuccess(null); setError(null); }, 3500);
  }

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      notify("Seuls les fichiers image sont acceptés.", "err");
      return;
    }
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function confirmUpload() {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", pendingFile);
      fd.append("sort_order", String(slides.length));
      if (linkedProduct) {
        fd.append("link_url", `/marketplace?product=${linkedProduct.slug}`);
      }
      const slide = await apiForm<HeroSlide>("/hero-slides/admin", "POST", fd);
      setSlides((prev) => [...prev, slide]);
      notify("Diapositive ajoutée avec succès.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Échec du téléchargement.", "err");
    } finally {
      setUploading(false);
      setPendingFile(null);
      setPreview(null);
      setLinkedProduct(null);
      setProductQuery("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function cancelPreview() {
    setPendingFile(null);
    setPreview(null);
    setLinkedProduct(null);
    setProductQuery("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function toggleActive(slide: HeroSlide) {
    try {
      const updated = await apiJson<HeroSlide>(
        `/hero-slides/admin/${slide.id}`,
        "PATCH",
        { is_active: !slide.is_active }
      );
      setSlides((prev) => prev.map((s) => (s.id === slide.id ? updated : s)));
    } catch (e) {
      notify(e instanceof Error ? e.message : "Update failed.", "err");
    }
  }

  async function deleteSlide(id: number) {
    if (!confirm("Supprimer cette diapositive ?")) return;
    try {
      await apiDelete(`/hero-slides/admin/${id}`);
      setSlides((prev) => prev.filter((s) => s.id !== id));
      notify("Diapositive supprimée.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Échec de la suppression.", "err");
    }
  }

  async function moveSlide(index: number, dir: -1 | 1) {
    const newSlides = [...slides];
    const target = index + dir;
    if (target < 0 || target >= newSlides.length) return;
    [newSlides[index], newSlides[target]] = [newSlides[target], newSlides[index]];
    const reordered = newSlides.map((s, i) => ({ ...s, sort_order: i }));
    setSlides(reordered);
    try {
      await Promise.all(
        reordered.map((s) =>
          apiJson(`/hero-slides/admin/${s.id}`, "PATCH", { sort_order: s.sort_order })
        )
      );
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-foreground">Diaporama principal</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Images affichées dans le carrousel de la page d'accueil. Réorganisez, activez ou supprimez des diapositives.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle size={15} className="shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
          <CheckCircle2 size={15} className="shrink-0" /> {success}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Ajouter une nouvelle diapositive</h3>

        {preview ? (
          <div className="space-y-3">
            <div className="w-full h-48 rounded-xl overflow-hidden border border-border bg-secondary">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <p className="text-xs text-muted-foreground truncate">{pendingFile?.name}</p>

            {/* Product picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Link size={11} /> Lier à un produit (optionnel)
              </label>
              {linkedProduct ? (
                <div className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2 text-sm border border-border">
                  <span className="font-medium text-foreground truncate">{linkedProduct.name}</span>
                  <button
                    onClick={() => { setLinkedProduct(null); setProductQuery(""); }}
                    className="text-muted-foreground hover:text-red-500 ml-2 shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Search products by name…"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:border-primary transition-colors"
                  />
                  {productResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-card border border-border rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                      {productResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setLinkedProduct(p);
                            setProductResults([]);
                            setProductQuery(p.name);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmUpload}
                disabled={uploading}
                className="flex-1 bg-primary text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {uploading
                  ? <><Loader2 size={14} className="animate-spin" /> Uploading…</>
                  : "Add to slideshow"}
              </button>
              <button
                onClick={cancelPreview}
                disabled={uploading}
                className="px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFileSelect(file);
            }}
            className={`border-2 border-dashed rounded-xl h-36 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-secondary/50"
            }`}
          >
            <Upload size={22} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Click or drag an image here</span>
            <span className="text-xs text-muted-foreground">JPG, PNG, WebP</span>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }}
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="border-b border-border px-5 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Current slides <span className="text-muted-foreground font-normal">({slides.length})</span>
          </h3>
          <span className="text-xs text-muted-foreground">
            {slides.filter((s) => s.is_active).length} active
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-muted-foreground text-sm">
            Loading…
          </div>
        ) : slides.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
              <ImageIcon size={22} />
            </div>
            <p className="text-sm">No slides yet. Upload your first image above.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {slides.map((s, index) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors ${
                  s.is_active ? "" : "opacity-50"
                }`}
              >
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveSlide(index, -1)}
                    disabled={index === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20 text-xs leading-none"
                    title="Move up"
                  >▲</button>
                  <button
                    onClick={() => moveSlide(index, 1)}
                    disabled={index === slides.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20 text-xs leading-none"
                    title="Move down"
                  >▼</button>
                </div>

                <div className="w-20 h-12 rounded-lg bg-secondary overflow-hidden shrink-0 border border-border">
                  {s.image_url ? (
                    <img src={resolveUrl(s.image_url)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={16} className="text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Slide #{index + 1}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {s.is_active ? "Visible on homepage" : "Hidden"}
                  </p>
                  {s.link_url && (
                    <p className="text-[10px] text-primary mt-0.5 flex items-center gap-1 truncate">
                      <Link size={9} />
                      {s.link_url}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(s)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      s.is_active
                        ? "text-primary bg-primary/10 hover:bg-primary/20"
                        : "text-muted-foreground bg-secondary hover:bg-border"
                    }`}
                    title={s.is_active ? "Hide" : "Show"}
                  >
                    {s.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => deleteSlide(s.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}