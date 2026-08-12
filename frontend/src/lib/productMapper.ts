import type { ApiProduct } from "./apiTypes";
import { formatPrice } from "./format";

// The original Product interface used throughout App.tsx's UI components.
// Kept identical so ProductCard / ProductModal / etc. require zero changes.
export interface UiProduct {
  id: number;
  brand: string;
  name: string;
  specs: string[];
  price: string;
  priceNum: number;
  originalPrice: string | null;
  badge: string | null;
  img: string;
  category: string;
  description: string;
  stock: number;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=420&fit=crop&auto=format";

export function mapApiProductToUi(p: ApiProduct): UiProduct {
  return {
    id: p.id,
    brand: p.brand,
    name: p.name,
    specs: p.specs,
    price: formatPrice(p.price_num),
    priceNum: p.price_num,
    originalPrice: p.original_price_num != null ? formatPrice(p.original_price_num) : null,
    badge: p.badge,
    img: p.image_url || FALLBACK_IMAGE,
    category: p.category,
    description: p.description,
    stock: p.stock,
  };
}
