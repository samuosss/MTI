import { Heart } from "lucide-react";
import Footer from "../../components/layout/Footer";
import ProductCard from "../../components/products/ProductCard";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { useNavigate } from "react-router";
import type { ProductOut } from "../../types/product";

export default function WishlistPage() {
  const { wishlist, loading } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleView = (p: ProductOut) => navigate(`/product/${p.slug}`);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-2xl font-bold text-foreground">Mes favoris</h1>
          {wishlist.length > 0 && (
            <span className="bg-primary/10 text-primary text-sm px-2.5 py-0.5 rounded-full font-semibold">
              {wishlist.length} produit{wishlist.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border h-80 animate-pulse" />
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart size={28} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold mb-2 text-foreground">Aucun favori pour le moment</p>
            <p className="text-sm">Cliquez sur le cœur d'un produit pour l'ajouter ici.</p>
            <button
              onClick={() => navigate("/marketplace")}
              className="mt-4 text-sm text-primary font-medium hover:underline"
            >
              Parcourir le catalogue
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wishlist.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onView={() => handleView(p)}
                onAddToCart={addToCart}
                onQuote={() => navigate("/quote")}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}