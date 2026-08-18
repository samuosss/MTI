import { useState, useEffect, useRef } from "react";
import {
  X, Star, Package, Minus, Plus, ShoppingCart, ImagePlus,
  ZoomIn, ChevronLeft, ChevronRight, Sparkles, FileText, Eye,
} from "lucide-react";
import { resolveImageUrl } from "../../api/client";
import { listProducts } from "../../api/products";
import type { ProductOut } from "../../types/product";

// ── Suggested product card ────────────────────────────────────────────────
function SuggestedCard({
  product,
  onView,
  onAddToCart,
  onQuote,
}: {
  product: ProductOut;
  onView: () => void;
  onAddToCart: (p: ProductOut, qty: number) => void;
  onQuote: () => void;
}) {
  const primaryImg = product.images.find((i) => i.is_primary) ?? product.images[0];
  const [hovered, setHovered] = useState(false);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
      <div
        className="relative h-36 bg-secondary overflow-hidden cursor-pointer"
        onClick={onView}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {primaryImg ? (
          <>
            <img
              src={resolveImageUrl(primaryImg.image_url)}
              alt={product.name}
              className={`w-full h-full object-contain transition-transform duration-500 ease-out ${hovered ? "scale-125" : "scale-100"}`}
            />
            <div className={`absolute inset-0 bg-black/10 flex items-center justify-center transition-opacity duration-300 ${hovered ? "opacity-100" : "opacity-0"}`}>
              <div className="bg-white/90 rounded-full p-1.5 shadow"><ZoomIn size={14} className="text-foreground" /></div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><ImagePlus size={24} /></div>
        )}
        {product.badge && (
          <span className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10 ${
            product.badge === "IN STOCK" ? "bg-green-100 text-green-700" :
            product.badge === "CUSTOM BUILD" ? "bg-blue-100 text-blue-700" : "bg-secondary text-muted-foreground"
          }`}>{product.badge}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
        >
          <Eye size={12} className="text-foreground" />
        </button>
        {product.original_price && product.original_price > product.price && (
          <span className="absolute bottom-2 left-2 bg-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">
            -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-0.5 gap-2">
          <div className="flex items-center gap-1 min-w-0">
            {product.brand?.logo_url && (
              <img
                src={resolveImageUrl(product.brand.logo_url)}
                alt={product.brand.name}
                className="h-3.5 w-auto max-w-[36px] object-contain flex-shrink-0"
              />
            )}
            <span className="text-[10px] font-bold text-accent uppercase tracking-wide truncate">{product.brand?.name ?? "—"}</span>
          </div>
          {product.category && <span className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full flex-shrink-0">{product.category.name}</span>}
        </div>
        <h4 onClick={onView} className="text-xs font-semibold text-foreground mb-1.5 line-clamp-2 cursor-pointer hover:text-primary leading-snug">{product.name}</h4>
        {product.specs.length > 0 && (
          <ul className="space-y-0.5 mb-2">
            {product.specs.slice(0, 2).map((s) => (
              <li key={s.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-1 h-1 rounded-full bg-primary/50 flex-shrink-0" />
                <span className="font-medium text-foreground/70">{s.label}:</span>
                <span className="truncate">{s.value}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-baseline gap-1.5 mt-auto mb-1.5">
          <span className="text-sm font-black text-foreground">{product.price.toLocaleString()} TND</span>
          {product.original_price && <span className="text-[10px] text-muted-foreground line-through">{product.original_price.toLocaleString()} TND</span>}
        </div>
        <span className={`text-[10px] font-semibold mb-2 ${product.stock > 5 ? "text-green-600" : product.stock > 0 ? "text-orange-500" : "text-red-500"}`}>
          {product.stock > 5 ? `${product.stock} en stock` : product.stock > 0 ? `Plus que ${product.stock}` : "Rupture de stock"}
        </span>
        <div className="flex gap-1.5">
          <button onClick={() => onAddToCart(product, 1)} disabled={product.stock === 0}
            className="flex-1 flex items-center justify-center gap-1 bg-primary text-white text-[10px] font-semibold py-1.5 rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-40">
            <ShoppingCart size={10} /> Ajouter
          </button>
          <button onClick={onQuote}
            className="flex items-center justify-center gap-1 border border-border text-[10px] font-semibold px-2 py-1.5 rounded-lg hover:border-primary hover:text-primary transition-colors">
            <FileText size={10} /> Devis
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────
export default function ProductModal({
  product,
  onClose,
  onAddToCart,
  onRequestQuote,
  onViewSuggestion,
}: {
  product: ProductOut;
  onClose: () => void;
  onAddToCart: (p: ProductOut, qty: number) => void;
  onRequestQuote: () => void;
  onViewSuggestion?: (p: ProductOut) => void;
}) {
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductOut[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Zoom lens state
  const [isHoveringImg, setIsHoveringImg] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const ZOOM_FACTOR = 2.5;

  const images = product.images;
  const currentImg = images[activeImg];

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = imgContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }

  // Load suggestions
  useEffect(() => {
    setLoadingSuggestions(true);
    listProducts({ page: 1, page_size: 20, category_id: product.category?.id, sort: "newest" })
      .then((res) => setSuggestions(res.items.filter((p) => p.id !== product.id).slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoadingSuggestions(false));
  }, [product.id]);

  useEffect(() => {
    setQty(1);
    setActiveImg(0);
    setIsHoveringImg(false);
    setLightboxOpen(false);
  }, [product.id]);

  const prevImg = () => setActiveImg((i) => (i - 1 + images.length) % images.length);
  const nextImg = () => setActiveImg((i) => (i + 1) % images.length);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-card rounded-2xl shadow-2xl w-full max-w-5xl my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Top section: image + zoom preview + info ───────────────── */}
          <div className="flex flex-col md:flex-row">

            {/* Left: image panel */}
            <div className="md:w-[38%] flex-shrink-0 flex flex-col gap-3 p-4 bg-secondary/40 rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none border-b md:border-b-0 md:border-r border-border">

              {/* Main image — zoom lens source */}
              <div
                ref={imgContainerRef}
                className="relative rounded-xl overflow-hidden bg-white flex items-center justify-center cursor-crosshair select-none"
                style={{ height: "260px" }}
                onMouseEnter={() => setIsHoveringImg(true)}
                onMouseLeave={() => setIsHoveringImg(false)}
                onMouseMove={handleMouseMove}
                onClick={() => setLightboxOpen(true)}
              >
                {currentImg ? (
                  <>
                    <img
                      src={resolveImageUrl(currentImg.image_url)}
                      alt={product.name}
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />
                    {/* Lens square indicator */}
                    {isHoveringImg && (
                      <div
                        className="absolute border-2 border-primary/60 bg-primary/10 pointer-events-none"
                        style={{
                          width: `${100 / ZOOM_FACTOR}%`,
                          height: `${100 / ZOOM_FACTOR}%`,
                          left: `${Math.max(0, Math.min(zoomPos.x - 100 / ZOOM_FACTOR / 2, 100 - 100 / ZOOM_FACTOR))}%`,
                          top: `${Math.max(0, Math.min(zoomPos.y - 100 / ZOOM_FACTOR / 2, 100 - 100 / ZOOM_FACTOR))}%`,
                        }}
                      />
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground/30 gap-2">
                    <ImagePlus size={40} />
                    <span className="text-xs">Aucune image</span>
                  </div>
                )}

                {/* Nav arrows */}
                {images.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); prevImg(); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors z-10">
                      <ChevronLeft size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); nextImg(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors z-10">
                      <ChevronRight size={14} />
                    </button>
                  </>
                )}

                {/* Badges */}
                {product.badge && (
                  <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 ${
                    product.badge === "IN STOCK" ? "bg-green-100 text-green-700" :
                    product.badge === "CUSTOM BUILD" ? "bg-blue-100 text-blue-700" : "bg-accent/10 text-accent"
                  }`}>{product.badge}</span>
                )}
                {product.original_price && product.original_price > product.price && (
                  <span className="absolute top-2 right-2 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                    -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
                  </span>
                )}

                {/* Hint */}
                {!isHoveringImg && currentImg && (
                  <div className="absolute bottom-2 right-2 bg-white/80 rounded-full px-2 py-0.5 flex items-center gap-1 text-[10px] text-muted-foreground shadow">
                    <ZoomIn size={10} /> Survoler pour zoomer
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {images.map((img, i) => (
                    <button key={img.id} onClick={() => setActiveImg(i)}
                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all bg-white ${
                        i === activeImg ? "border-primary shadow-md scale-105" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={resolveImageUrl(img.image_url)} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              {/* Dot indicators */}
              {images.length > 1 && (
                <div className="flex gap-1.5 justify-center">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setActiveImg(i)}
                      className={`h-1.5 rounded-full transition-all ${i === activeImg ? "bg-primary w-4" : "bg-border w-1.5"}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Center: zoom preview panel */}
            {currentImg && (
              <div
                className={`hidden md:flex items-center justify-center bg-white border-r border-border transition-all duration-200 overflow-hidden ${
                  isHoveringImg ? "w-72 opacity-100" : "w-0 opacity-0"
                }`}
                style={{ minHeight: "340px" }}
              >
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `url(${resolveImageUrl(currentImg.image_url)})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: `${ZOOM_FACTOR * 100}%`,
                    backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                    minHeight: "340px",
                  }}
                />
              </div>
            )}

            {/* Right: info panel */}
            <div className="flex-1 p-6 flex flex-col min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {product.brand?.logo_url && (
                    <img
                      src={resolveImageUrl(product.brand.logo_url)}
                      alt={product.brand.name}
                      className="h-5 w-auto max-w-[64px] object-contain"
                    />
                  )}
                  <span className="text-xs font-bold text-accent uppercase tracking-widest">{product.brand?.name ?? "—"}</span>
                  {product.category && (
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{product.category.name}</span>
                  )}
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-border transition-colors ml-2 flex-shrink-0">
                  <X size={16} />
                </button>
              </div>

              {/* Name */}
              <h2 className="text-xl font-bold text-foreground mb-2 leading-snug">{product.name}</h2>

              {/* Rating */}
              <div className="flex items-center gap-1.5 mb-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={13} className={i <= Math.round(product.rating) ? "text-accent fill-accent" : "text-border fill-border"} />
                ))}
                <span className="text-xs text-muted-foreground font-medium">{product.rating.toFixed(1)}</span>
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">{product.description}</p>
              )}

              {/* Specs */}
              {product.specs.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Spécifications</p>
                  <div className="grid grid-cols-1 gap-0">
                    {product.specs.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground w-28 flex-shrink-0 text-xs">{s.label}</span>
                        <span className="font-semibold text-foreground text-xs">{s.value}</span>
                        {s.notes && <span className="text-[10px] text-muted-foreground ml-auto">({s.notes})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-2 mt-auto">
                <span className="text-2xl font-black text-primary">{product.price.toLocaleString()} TND</span>
                {product.original_price && (
                  <span className="text-sm text-muted-foreground line-through">{product.original_price.toLocaleString()} TND</span>
                )}
                {product.original_price && product.original_price > product.price && (
                  <span className="text-sm font-bold text-green-600">
                    -{(product.original_price - product.price).toLocaleString()} TND
                  </span>
                )}
              </div>

              {/* Stock */}
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${product.stock > 5 ? "bg-green-500" : product.stock > 0 ? "bg-orange-400" : "bg-red-500"}`} />
                <Package size={13} className={product.stock > 0 ? "text-green-600" : "text-red-500"} />
                <span className={`font-semibold text-xs ${product.stock > 5 ? "text-green-600" : product.stock > 0 ? "text-orange-500" : "text-red-500"}`}>
                  {product.stock > 5 ? `${product.stock} unités disponibles` : product.stock > 0 ? `Plus que ${product.stock} en stock !` : "Rupture de stock"}
                </span>
              </div>

              {/* Qty + Add to Cart */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center border border-border rounded-xl overflow-hidden">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2.5 hover:bg-secondary transition-colors"><Minus size={14} /></button>
                  <span className="px-4 py-2.5 text-sm font-bold border-x border-border min-w-[40px] text-center">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(Math.max(product.stock, 1), q + 1))} className="px-3 py-2.5 hover:bg-secondary transition-colors"><Plus size={14} /></button>
                </div>
                <button
                  disabled={product.stock === 0}
                  onClick={() => { onAddToCart(product, qty); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingCart size={16} /> Ajouter au panier
                </button>
              </div>

              <button
                onClick={() => { onRequestQuote(); onClose(); }}
                className="w-full border-2 border-accent text-accent font-bold py-2.5 rounded-xl hover:bg-accent hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <FileText size={15} /> Demander un devis
              </button>
            </div>
          </div>

          {/* ── Suggested products ──────────────────────────────────────── */}
          {(suggestions.length > 0 || loadingSuggestions) && (
            <div className="border-t border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-accent" />
                <h3 className="font-bold text-foreground text-sm">Produits similaires</h3>
                {product.category && <span className="text-xs text-muted-foreground">— {product.category.name}</span>}
              </div>
              {loadingSuggestions ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="bg-secondary rounded-xl h-56 animate-pulse" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {suggestions.map((p) => (
                    <SuggestedCard
                      key={p.id}
                      product={p as unknown as any}
                      onView={() => onViewSuggestion?.(p)}
                      onAddToCart={onAddToCart}
                      onQuote={onRequestQuote}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────── */}
      {lightboxOpen && currentImg && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightboxOpen(false)}>
          <button onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
            <X size={20} className="text-white" />
          </button>
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prevImg(); }}
                className="absolute left-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <ChevronLeft size={20} className="text-white" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); nextImg(); }}
                className="absolute right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <ChevronRight size={20} className="text-white" />
              </button>
            </>
          )}
          <img
            src={resolveImageUrl(currentImg.image_url)}
            alt={product.name}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <div className="absolute bottom-4 flex gap-2">
              {images.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setActiveImg(i); }}
                  className={`h-1.5 rounded-full transition-all ${i === activeImg ? "bg-white w-5" : "bg-white/40 w-1.5"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}