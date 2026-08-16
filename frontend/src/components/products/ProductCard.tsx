import { ShoppingCart, FileText, Eye, ImagePlus, ZoomIn, Heart } from "lucide-react";
import { useState } from "react";
import { resolveImageUrl, formatPrice } from "../../api/client";
import { useWishlist } from "../../context/WishlistContext";
import type { ProductOut } from "../../types/product";

export default function ProductCard({
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
  const [isZoomed, setIsZoomed] = useState(false);
  const { isSaved, toggleWishlist } = useWishlist();
  const saved = isSaved(product.id);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">
      {/* Image with zoom */}
      <div
        className="relative h-48 bg-secondary overflow-hidden cursor-pointer"
        onClick={onView}
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
      >
        {primaryImg ? (
          <>
            <img
              src={resolveImageUrl(primaryImg.image_url)}
              alt={product.name}
              className={`w-full h-full object-contain transition-transform duration-500 ease-out ${
                isZoomed ? "scale-125" : "scale-100"
              }`}
            />
            {/* Zoom overlay */}
            <div
              className={`absolute inset-0 bg-black/10 flex items-center justify-center transition-opacity duration-300 ${
                isZoomed ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="bg-white/90 rounded-full p-2 shadow-lg">
                <ZoomIn size={18} className="text-foreground" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/30 gap-2">
            <ImagePlus size={36} />
            <span className="text-xs">Aucune image</span>
          </div>
        )}

        {/* Badge */}
        {product.badge && (
          <span
            className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 ${
              product.badge === "IN STOCK"
                ? "bg-green-100 text-green-700"
                : product.badge === "CUSTOM BUILD"
                ? "bg-blue-100 text-blue-700"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {product.badge}
          </span>
        )}

        {/* Save / wishlist button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-2 right-11 w-8 h-8 rounded-full flex items-center justify-center shadow z-10 transition-all ${
            saved
              ? "bg-red-50 opacity-100"
              : "bg-white/90 opacity-0 group-hover:opacity-100"
          }`}
        >
          <Heart size={14} className={saved ? "text-red-500 fill-red-500" : "text-foreground"} />
        </button>

        {/* Quick view button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
        >
          <Eye size={14} className="text-foreground" />
        </button>

        {/* Discount badge */}
        {product.original_price && product.original_price > product.price && (
          <span className="absolute bottom-2 left-2 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
            -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Brand + category */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-accent uppercase tracking-wide">
            {product.brand?.name ?? "—"}
          </span>
          {product.category && (
            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {product.category.name}
            </span>
          )}
        </div>

        {/* Name */}
        <h3
          onClick={onView}
          className="text-sm font-semibold text-foreground mb-2 line-clamp-2 cursor-pointer hover:text-primary transition-colors leading-snug"
        >
          {product.name}
        </h3>

        {/* Specs */}
        {product.specs.length > 0 && (
          <ul className="space-y-0.5 mb-3">
            {product.specs.slice(0, 3).map((s) => (
              <li key={s.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                <span className="font-medium text-foreground/70">{s.label}:</span>
                <span className="truncate">{s.value}</span>
              </li>
            ))}
            {product.specs.length > 3 && (
              <li className="text-xs text-muted-foreground pl-3">+{product.specs.length - 3} de plus</li>
            )}
          </ul>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto mb-3">
          <span className="text-lg font-black text-foreground">
            {formatPrice(product.price)} TND
          </span>
          {product.original_price && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.original_price)} TND
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onAddToCart(product, 1)}
            disabled={product.stock === 0}
            className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white text-xs font-semibold py-2 rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={13} /> Ajouter au panier
          </button>
          <button
            onClick={onQuote}
            className="flex items-center justify-center gap-1.5 border border-border text-xs font-semibold px-3 py-2 rounded-lg hover:border-primary hover:text-primary transition-colors"
          >
            <FileText size={13} /> Devis
          </button>
        </div>
      </div>
    </div>
  );
}