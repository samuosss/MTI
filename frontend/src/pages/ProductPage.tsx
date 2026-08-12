import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ChevronLeft, ChevronRight, Star, Package, Minus, Plus,
  ShoppingCart, ImagePlus, ZoomIn, X, FileText, Sparkles,
  Eye, ZoomIn as ZoomInIcon,
} from "lucide-react";
import { resolveImageUrl } from "../api/client";
import { getProductBySlug, listProducts } from "../api/products";
import Footer from "../components/layout/Footer";
import type { ProductOut } from "../types/product";

function SuggestedCard({
  product,
  onAddToCart,
}: {
  product: ProductOut;
  onAddToCart: (p: ProductOut, qty: number) => void;
}) {
  const navigate = useNavigate();
  const primaryImg = product.images.find((i) => i.is_primary) ?? product.images[0];
  const [hovered, setHovered] = useState(false);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col">
      <div
        className="relative h-36 bg-secondary overflow-hidden cursor-pointer"
        onClick={() => navigate(`/product/${product.slug}`)}
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
        {product.original_price && product.original_price > product.price && (
          <span className="absolute bottom-2 left-2 bg-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">
            -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] font-bold text-accent uppercase tracking-wide">{product.brand?.name ?? "—"}</span>
          {product.category && <span className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{product.category.name}</span>}
        </div>
        <h4
          onClick={() => navigate(`/product/${product.slug}`)}
          className="text-xs font-semibold text-foreground mb-1.5 line-clamp-2 cursor-pointer hover:text-primary leading-snug"
        >
          {product.name}
        </h4>
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
          <button
            onClick={() => onAddToCart(product, 1)}
            disabled={product.stock === 0}
            className="flex-1 flex items-center justify-center gap-1 bg-primary text-white text-[10px] font-semibold py-1.5 rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-40"
          >
            <ShoppingCart size={10} /> Ajouter
          </button>
          <button
            onClick={() => navigate("/quote")}
            className="flex items-center justify-center gap-1 border border-border text-[10px] font-semibold px-2 py-1.5 rounded-lg hover:border-primary hover:text-primary transition-colors"
          >
            <FileText size={10} /> Devis
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductPage({
  onAddToCart,
}: {
  onAddToCart: (p: ProductOut, qty: number) => void;
}) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductOut[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [isHoveringImg, setIsHoveringImg] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const ZOOM_FACTOR = 2.5;

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    getProductBySlug(slug)
      .then((p) => {
        setProduct(p);
        setQty(1);
        setActiveImg(0);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    setLoadingSuggestions(true);
    listProducts({ page: 1, page_size: 20, category_id: product.category?.id, sort: "newest" })
      .then((res) => setSuggestions(res.items.filter((p) => p.id !== product.id).slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoadingSuggestions(false));
  }, [product?.id]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = imgContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="h-8 w-40 bg-secondary rounded-lg animate-pulse mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-96 bg-secondary rounded-2xl animate-pulse" />
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-6 bg-secondary rounded-lg animate-pulse" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground mb-2">Produit introuvable</p>
          <p className="text-muted-foreground text-sm mb-6">Ce produit n'existe pas ou a été supprimé.</p>
          <button
            onClick={() => navigate("/marketplace")}
            className="bg-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-blue-900 transition-colors"
          >
            Retour à la boutique
          </button>
        </div>
      </div>
    );
  }

  const images = product.images;
  const currentImg = images[activeImg];
  const prevImg = () => setActiveImg((i) => (i - 1 + images.length) % images.length);
  const nextImg = () => setActiveImg((i) => (i + 1) % images.length);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb / back nav */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <button
            onClick={() => navigate("/marketplace")}
            className="flex items-center gap-1.5 hover:text-primary transition-colors font-medium"
          >
            <ChevronLeft size={16} /> Retour à la boutique
          </button>
          <span>/</span>
          {product.category && (
            <>
              <button
                onClick={() => navigate(`/marketplace?category=${product.category!.id}`)}
                className="hover:text-primary transition-colors"
              >
                {product.category.name}
              </button>
              <span>/</span>
            </>
          )}
          <span className="text-foreground font-medium truncate max-w-xs">{product.name}</span>
        </div>

        {/* Main product section */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-8">
          <div className="flex flex-col lg:flex-row">

            {/* Left: image panel */}
            <div className="lg:w-[42%] flex-shrink-0 flex flex-col gap-4 p-6 bg-secondary/40 border-b lg:border-b-0 lg:border-r border-border">

              {/* Main image */}
              <div
                ref={imgContainerRef}
                className="relative rounded-xl overflow-hidden bg-white flex items-center justify-center cursor-crosshair select-none"
                style={{ height: "360px" }}
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
                    <ImagePlus size={48} />
                    <span className="text-sm">Aucune image</span>
                  </div>
                )}

                {images.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); prevImg(); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors z-10">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); nextImg(); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors z-10">
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}

                {product.badge && (
                  <span className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full z-10 ${
                    product.badge === "IN STOCK" ? "bg-green-100 text-green-700" :
                    product.badge === "CUSTOM BUILD" ? "bg-blue-100 text-blue-700" : "bg-accent/10 text-accent"
                  }`}>{product.badge}</span>
                )}
                {product.original_price && product.original_price > product.price && (
                  <span className="absolute top-3 right-3 bg-accent text-white text-xs font-bold px-2.5 py-1 rounded-full z-10">
                    -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
                  </span>
                )}
                {!isHoveringImg && currentImg && (
                  <div className="absolute bottom-3 right-3 bg-white/80 rounded-full px-2.5 py-1 flex items-center gap-1.5 text-xs text-muted-foreground shadow">
                    <ZoomInIcon size={11} /> Survoler pour zoomer
                  </div>
                )}
              </div>

              {/* Zoom preview */}
              {currentImg && isHoveringImg && (
                <div
                  className="rounded-xl overflow-hidden border border-border bg-white"
                  style={{
                    height: "200px",
                    backgroundImage: `url(${resolveImageUrl(currentImg.image_url)})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: `${ZOOM_FACTOR * 100}%`,
                    backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                  }}
                />
              )}

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {images.map((img, i) => (
                    <button key={img.id} onClick={() => setActiveImg(i)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all bg-white ${
                        i === activeImg ? "border-primary shadow-md scale-105" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={resolveImageUrl(img.image_url)} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              {images.length > 1 && (
                <div className="flex gap-2 justify-center">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setActiveImg(i)}
                      className={`h-1.5 rounded-full transition-all ${i === activeImg ? "bg-primary w-5" : "bg-border w-1.5"}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right: info panel */}
            <div className="flex-1 p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-xs font-bold text-accent uppercase tracking-widest">{product.brand?.name ?? "—"}</span>
                {product.category && (
                  <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">{product.category.name}</span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-foreground mb-3 leading-snug">{product.name}</h1>

              <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={15} className={i <= Math.round(product.rating) ? "text-accent fill-accent" : "text-border fill-border"} />
                ))}
                <span className="text-sm text-muted-foreground font-medium">{product.rating.toFixed(1)}</span>
              </div>

              {product.description && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">{product.description}</p>
              )}

              {product.specs.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Spécifications</p>
                  <div className="rounded-xl border border-border overflow-hidden">
                    {product.specs.map((s, i) => (
                      <div key={s.id} className={`flex items-center gap-4 px-4 py-3 ${i % 2 === 0 ? "bg-secondary/40" : "bg-card"}`}>
                        <span className="text-muted-foreground w-36 flex-shrink-0 text-sm">{s.label}</span>
                        <span className="font-semibold text-foreground text-sm">{s.value}</span>
                        {s.notes && <span className="text-xs text-muted-foreground ml-auto">({s.notes})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-baseline gap-4 mb-3 mt-auto">
                <span className="text-3xl font-black text-primary">{product.price.toLocaleString()} TND</span>
                {product.original_price && (
                  <>
                    <span className="text-base text-muted-foreground line-through">{product.original_price.toLocaleString()} TND</span>
                    {product.original_price > product.price && (
                      <span className="text-base font-bold text-green-600">
                        -{(product.original_price - product.price).toLocaleString()} TND
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 mb-6">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${product.stock > 5 ? "bg-green-500" : product.stock > 0 ? "bg-orange-400" : "bg-red-500"}`} />
                <Package size={14} className={product.stock > 0 ? "text-green-600" : "text-red-500"} />
                <span className={`font-semibold text-sm ${product.stock > 5 ? "text-green-600" : product.stock > 0 ? "text-orange-500" : "text-red-500"}`}>
                  {product.stock > 5 ? `${product.stock} unités disponibles` : product.stock > 0 ? `Plus que ${product.stock} en stock !` : "Rupture de stock"}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center border border-border rounded-xl overflow-hidden">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-4 py-3 hover:bg-secondary transition-colors"><Minus size={15} /></button>
                  <span className="px-5 py-3 text-sm font-bold border-x border-border min-w-[48px] text-center">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(Math.max(product.stock, 1), q + 1))} className="px-4 py-3 hover:bg-secondary transition-colors"><Plus size={15} /></button>
                </div>
                <button
                  disabled={product.stock === 0}
                  onClick={() => onAddToCart(product, qty)}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                  <ShoppingCart size={17} /> Ajouter au panier
                </button>
              </div>

              <button
                onClick={() => navigate("/quote")}
                className="w-full border-2 border-accent text-accent font-bold py-3 rounded-xl hover:bg-accent hover:text-white transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <FileText size={16} /> Demander un devis
              </button>
            </div>
          </div>
        </div>

        {/* Suggested products */}
        {(suggestions.length > 0 || loadingSuggestions) && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={17} className="text-accent" />
              <h3 className="font-bold text-foreground">Produits similaires</h3>
              {product.category && <span className="text-sm text-muted-foreground">— {product.category.name}</span>}
            </div>
            {loadingSuggestions ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="bg-secondary rounded-xl h-64 animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {suggestions.map((p) => (
                  <SuggestedCard
                    key={p.id}
                    product={p as unknown as any}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />

      {/* Lightbox */}
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
    </div>
  );
}