import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router";
import {
  ShoppingCart, ArrowRight, ChevronLeft, Minus, Plus, Trash2,
  Shield, Truck, Check, ImagePlus, AlertCircle, Loader2, Sparkles,
} from "lucide-react";
import Footer from "../components/layout/Footer";
import { resolveImageUrl } from "../api/client";
import { submitQuote } from "../api/quotes";
import { listProducts } from "../api/products";
import type { ProductOut } from "../types/product";

interface CartItem {
  product: ProductOut;
  qty: number;
}

// Mini product card for suggestions
function SuggestionCard({
  product,
  onView,
  onAddToCart,
}: {
  product: ProductOut;
  onView: () => void;
  onAddToCart: (p: ProductOut, qty: number) => void;
}) {
  const primaryImg = product.images.find((i) => i.is_primary) ?? product.images[0];
  const [hovered, setHovered] = useState(false);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-all group flex flex-col">
      <div
        className="relative h-36 bg-secondary overflow-hidden cursor-pointer"
        onClick={onView}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {primaryImg ? (
          <img
            src={resolveImageUrl(primaryImg.image_url)}
            alt={product.name}
            className={`w-full h-full object-contain transition-transform duration-500 ${hovered ? "scale-115" : "scale-100"}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <ImagePlus size={28} />
          </div>
        )}
        {product.badge && (
          <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
            {product.badge}
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <span className="text-[10px] font-bold text-accent uppercase mb-0.5">{product.brand?.name ?? "—"}</span>
        <h4
          onClick={onView}
          className="text-xs font-semibold text-foreground line-clamp-2 cursor-pointer hover:text-primary mb-2 leading-snug"
        >
          {product.name}
        </h4>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-sm font-black text-foreground">{product.price.toLocaleString()} TND</span>
          <button
            onClick={() => onAddToCart(product, 1)}
            disabled={product.stock === 0}
            className="flex items-center gap-1 bg-primary text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-40"
          >
            <ShoppingCart size={11} /> Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CartPage({
  cart,
  onUpdateQty,
  onRemove,
  onOrderPlaced,
  onViewProduct,
  onAddToCart,
}: {
  cart: CartItem[];
  onUpdateQty: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  onOrderPlaced: () => void;
  onViewProduct?: (p: ProductOut) => void;
  onAddToCart: (p: ProductOut, qty: number) => void;
}) {
  const navigate = useNavigate();
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; percent: number } | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [customer, setCustomer] = useState({ company: "", contactPerson: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successReference, setSuccessReference] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ProductOut[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const discount = Math.round(subtotal * ((appliedPromo?.percent ?? 0) / 100));
  const discountedSubtotal = Math.max(subtotal - discount, 0);
  const tax = Math.round(discountedSubtotal * 0.19);
  const total = discountedSubtotal + tax;

  const promoCodes: Record<string, { percent: number; minSubtotal?: number }> = {
    MTI10: { percent: 10 },
    WELCOME5: { percent: 5 },
    ENTERPRISE15: { percent: 15, minSubtotal: 5000 },
  };

  // Load suggestions based on cart categories
  useEffect(() => {
    if (cart.length === 0) return;
    setLoadingSuggestions(true);

    // Get unique category IDs from cart
    const categoryIds = [...new Set(cart.map((i) => i.product.category?.id).filter(Boolean))] as number[];
    const cartProductIds = new Set(cart.map((i) => i.product.id));

    // Fetch from first category
    const catId = categoryIds[0];
    listProducts({
      page: 1,
      page_size: 20,
      category_id: catId,
      sort: "newest",
    })
      .then((res) => {
        // Exclude products already in cart, take 4
        const filtered = res.items
          .filter((p) => !cartProductIds.has(p.id))
          .slice(0, 4);

        // If not enough from category, fetch more from general
        if (filtered.length < 4) {
          return listProducts({ page: 1, page_size: 20, sort: "newest" }).then((res2) => {
            const extra = res2.items.filter((p) => !cartProductIds.has(p.id) && !filtered.some((f) => f.id === p.id));
            setSuggestions([...filtered, ...extra].slice(0, 4));
          });
        }
        setSuggestions(filtered);
      })
      .catch(() => {})
      .finally(() => setLoadingSuggestions(false));
  }, [cart.length]);

  function applyPromoCode() {
    const code = promoInput.trim().toUpperCase();
    const promo = promoCodes[code];
    setPromoMessage(null);
    if (!code) { setAppliedPromo(null); setPromoMessage("Entrez un code promo."); return; }
    if (!promo) { setAppliedPromo(null); setPromoMessage("Code promo invalide."); return; }
    if (promo.minSubtotal && subtotal < promo.minSubtotal) {
      setAppliedPromo(null);
      setPromoMessage(`Ce code requiert un minimum de ${promo.minSubtotal.toLocaleString()} TND.`);
      return;
    }
    setAppliedPromo({ code, percent: promo.percent });
    setPromoMessage(`Réduction de ${promo.percent}% appliquée !`);
  }

  async function handlePlaceOrder(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setSuccessReference(null);
    if (!customer.company || !customer.contactPerson || !customer.email) {
      setSubmitError("Société, contact et email sont requis.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await submitQuote({
        company: customer.company,
        contact_person: customer.contactPerson,
        email: customer.email,
        phone: customer.phone || null,
        category: "Cart order",
        description: [
          "Commande depuis le marketplace.",
          appliedPromo ? `Code promo: ${appliedPromo.code} (${appliedPromo.percent}%).` : null,
          `Sous-total: ${subtotal.toLocaleString()} TND.`,
          appliedPromo ? `Réduction: ${discount.toLocaleString()} TND.` : null,
          `TVA: ${tax.toLocaleString()} TND.`,
          `Total: ${total.toLocaleString()} TND.`,
        ].filter(Boolean).join("\n"),
        items: cart.map((item) => ({ product_id: item.product.id, quantity: item.qty })),
      });
      const reference =
        response && typeof response === "object" && "reference" in response
          ? String((response as { reference: unknown }).reference)
          : "submitted";
      setSuccessReference(reference);
      onOrderPlaced();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Erreur. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  if (successReference) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24 px-4 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
            <Check size={36} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Commande envoyée</h2>
          <p className="text-muted-foreground text-sm max-w-md">
            Votre demande {successReference} a été transmise à l'équipe MTI. Nous confirmerons les détails sous peu.
          </p>
          <button
            onClick={() => navigate("/marketplace")}
            className="flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-md hover:bg-blue-900 transition-colors mt-2"
          >
            Retour au marketplace <ArrowRight size={16} />
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center">
            <ShoppingCart size={36} className="text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Votre panier est vide</h2>
          <p className="text-muted-foreground text-sm">Ajoutez des produits pour commencer.</p>
          <button
            onClick={() => navigate("/marketplace")}
            className="flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-md hover:bg-blue-900 transition-colors mt-2"
          >
            Parcourir le catalogue <ArrowRight size={16} />
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-2xl font-bold text-foreground">Mon Panier</h1>
          <span className="bg-primary/10 text-primary text-sm px-2.5 py-0.5 rounded-full font-semibold">
            {cart.reduce((s, i) => s + i.qty, 0)} article{cart.reduce((s, i) => s + i.qty, 0) !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map(({ product: p, qty }) => {
              const primaryImg = p.images.find((i) => i.is_primary) ?? p.images[0];
              return (
                <div key={p.id} className="bg-card rounded-xl border border-border p-4 flex gap-4 hover:border-primary/30 transition-colors">
                  <div className="w-24 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                    {primaryImg ? (
                      <img
                        src={resolveImageUrl(primaryImg.image_url)}
                        alt={p.name}
                        className="w-full h-full object-contain hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                        <ImagePlus size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-accent mb-0.5">{p.brand?.name ?? "—"}</p>
                    <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-1">{p.name}</h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.specs.slice(0, 2).map((s) => (
                        <span key={s.id} className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                          {s.label}: {s.value}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-border rounded-lg overflow-hidden">
                        <button onClick={() => onUpdateQty(p.id, qty - 1)} className="px-2.5 py-1.5 hover:bg-secondary transition-colors">
                          <Minus size={12} />
                        </button>
                        <span className="px-3 py-1.5 text-sm font-semibold border-x border-border">{qty}</span>
                        <button onClick={() => onUpdateQty(p.id, qty + 1)} className="px-2.5 py-1.5 hover:bg-secondary transition-colors">
                          <Plus size={12} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold text-primary">
                          {(p.price * qty).toLocaleString()} TND
                        </span>
                        <button onClick={() => onRemove(p.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => navigate("/marketplace")}
              className="flex items-center gap-2 text-primary text-sm font-medium hover:gap-3 transition-all"
            >
              <ChevronLeft size={16} /> Continuer les achats
            </button>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Order summary */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-bold text-foreground mb-4">Résumé de commande</h3>
              <div className="space-y-2.5 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-medium">{subtotal.toLocaleString()} TND</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-green-600">
                    <span>Promo ({appliedPromo.code})</span>
                    <span className="font-medium">-{discount.toLocaleString()} TND</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TVA (7%)</span>
                  <span className="font-medium">{tax.toLocaleString()} TND</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Livraison</span>
                  <span className="text-green-600 font-medium">Sur devis</span>
                </div>
              </div>
              <div className="border-t border-border pt-3 flex justify-between mb-5">
                <span className="font-bold text-foreground">Total estimé</span>
                <span className="font-black text-lg text-primary">{total.toLocaleString()} TND</span>
              </div>
              <button
                onClick={() => navigate("/quote")}
                className="w-full bg-accent text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
              >
                Demander un devis <ArrowRight size={16} />
              </button>
            </div>

            {/* Promo code */}
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Code Promo</p>
              <div className="flex gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyPromoCode()}
                  placeholder="Ex: MTI10"
                  className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={applyPromoCode}
                  className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Appliquer
                </button>
              </div>
              {promoMessage && (
                <p className={`text-xs mt-2 font-medium ${appliedPromo ? "text-green-600" : "text-red-500"}`}>
                  {appliedPromo ? "✓ " : "✗ "}{promoMessage}
                </p>
              )}
            </div>

            {/* Place order form */}
            <form onSubmit={handlePlaceOrder} className="bg-card rounded-xl border border-border p-4">
              <h3 className="font-bold text-foreground mb-4">Passer la commande</h3>
              <div className="space-y-3">
                {[
                  { key: "company", placeholder: "Société / Organisation *", required: true },
                  { key: "contactPerson", placeholder: "Personne de contact *", required: true },
                  { key: "email", placeholder: "Email professionnel *", required: true, type: "email" },
                  { key: "phone", placeholder: "Téléphone", required: false },
                ].map(({ key, placeholder, required, type }) => (
                  <input
                    key={key}
                    required={required}
                    type={type ?? "text"}
                    value={customer[key as keyof typeof customer]}
                    onChange={(e) => setCustomer((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                ))}
              </div>

              {submitError && (
                <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 border border-primary text-primary font-semibold py-3 rounded-xl hover:bg-primary hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Envoi en cours...</>
                ) : (
                  "Confirmer la commande"
                )}
              </button>
            </form>

            {/* Guarantees */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              {[
                { icon: Shield, text: "Paiement 100% sécurisé" },
                { icon: Truck, text: "Livraison express disponible" },
                { icon: Check, text: "Garantie constructeur incluse" },
              ].map((g) => (
                <div key={g.text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <g.icon size={16} className="text-primary flex-shrink-0" />
                  {g.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Suggestions section ── */}
        {(suggestions.length > 0 || loadingSuggestions) && (
          <div className="mt-14">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles size={18} className="text-accent" />
              <h2 className="text-lg font-bold text-foreground">Vous pourriez aussi aimer</h2>
              <span className="text-xs text-muted-foreground font-medium ml-1">
                — basé sur votre panier
              </span>
            </div>

            {loadingSuggestions ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-card rounded-xl border border-border h-52 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {suggestions.map((p) => (
                  <SuggestionCard
                    key={p.id}
                    product={p as unknown as any}
                    onView={() => onViewProduct?.(p)}
                    onAddToCart={onAddToCart as (p: ProductOut, qty: number) => void}
                  />
                ))}
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate("/marketplace")}
                className="inline-flex items-center gap-2 border border-border text-sm font-medium px-5 py-2.5 rounded-lg hover:border-primary hover:text-primary transition-colors"
              >
                Voir tous les produits <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}