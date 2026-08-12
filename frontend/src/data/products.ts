// NOTE: this is still the mockup's hardcoded demo data. Replacing this with
// real API calls (listProducts / getProductBySlug from src/api/products.ts)
// is tracked as a separate step — see FRONTEND_INTEGRATION_PLAN.md Stage 5.
// Kept as-is for now so the public pages keep working exactly like before
// while we focus this pass on routing + admin auth.

export interface Product {
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

export interface CartItem {
  product: Product;
  qty: number;
}

export const allProducts: Product[] = [
  { id: 1, brand: "LENOVO", name: "ThinkPad X1 Carbon Gen 11", specs: ["Core i7-1365U", "32GB LPDDR5", "1TB Gen4 SSD"], price: "$2,149.00", priceNum: 2149, originalPrice: "$2,499", badge: "IN STOCK", img: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=420&fit=crop&auto=format", category: "Laptops", description: "The ThinkPad X1 Carbon Gen 11 is the world's lightest 14-inch business laptop. Features Intel vPro technology, MIL-SPEC durability, and up to 15 hours of battery life.", stock: 12 },
  { id: 2, brand: "DELL PRECISION", name: "Precision 7960 Tower", specs: ["Xeon W5-2455X", "64GB ECC RAM", "RTX 6000 Ada"], price: "$5,899.00", priceNum: 5899, originalPrice: null, badge: "CUSTOM BUILD", img: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&h=420&fit=crop&auto=format", category: "Desktops", description: "The Dell Precision 7960 Tower is engineered for 3D rendering, AI/ML training, and large-scale simulations. Supports dual Xeon processors and up to 2TB of ECC DDR5 RAM.", stock: 5 },
  { id: 3, brand: "CISCO SYSTEMS", name: "Catalyst 9300 48-Port", specs: ["48x 10/100/1000", "PoE+ Support", "Network Advantage"], price: "$3,420.00", priceNum: 3420, originalPrice: null, badge: null, img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=420&fit=crop&auto=format", category: "Networking", description: "Cisco Catalyst 9300 is the industry's leading enterprise access switching platform. Provides full PoE+ capability across all 48 ports with stacking bandwidth up to 480 Gbps.", stock: 8 },
  { id: 4, brand: "HP", name: "ZBook Fury 16 G10", specs: ["Core i9-13950HX", "64GB DDR5", "NVIDIA RTX 4000"], price: "$3,899.00", priceNum: 3899, originalPrice: null, badge: "IN STOCK", img: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&h=420&fit=crop&auto=format", category: "Laptops", description: "The HP ZBook Fury 16 G10 is HP's most powerful mobile workstation. ISV-certified with NVIDIA RTX 4000 Ada with 20GB GDDR6 and a DreamColor display.", stock: 7 },
  { id: 5, brand: "SUPERMICRO", name: "SuperServer 2U Rackmount", specs: ["Dual Xeon SP", "256GB ECC RAM", "10GbE Dual Port"], price: "$8,750.00", priceNum: 8750, originalPrice: null, badge: "CUSTOM BUILD", img: "https://images.unsplash.com/photo-1537432376769-00f5c2f4c8d2?w=600&h=420&fit=crop&auto=format", category: "Desktops", description: "Supermicro 2U Rackmount — dual 4th Gen Intel Xeon Scalable, up to 4TB DDR5 ECC, 24x NVMe U.3 drives.", stock: 3 },
  { id: 6, brand: "SYNOLOGY", name: "DiskStation DS1823xs+", specs: ["8-Bay NAS", "8GB ECC RAM", "10GbE + 25GbE"], price: "$1,999.00", priceNum: 1999, originalPrice: null, badge: "IN STOCK", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=420&fit=crop&auto=format", category: "Storage", description: "Synology DS1823xs+ — 8-bay NAS with AMD Ryzen V1780B quad-core, dual 25GbE, expandable to 180 bays.", stock: 15 },
];
