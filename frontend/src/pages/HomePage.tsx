import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, Monitor, Laptop, Server, Cpu, Wifi, HardDrive, Headphones, Network, Camera, Wrench } from "lucide-react";
import HeroCarousel from "../components/layout/HeroCarousel";
import Footer from "../components/layout/Footer";
import ProductCard from "../components/products/ProductCard";
import { listProducts } from "../api/products";
import type { ProductOut } from "../types/product";

const categoryIcons: Record<string, React.ElementType> = {
  Desktops: Monitor, Laptops: Laptop, Workstations: Server,
  Components: Cpu, Networking: Wifi, Storage: HardDrive,
  Accessories: Headphones, "Office Supplies": Headphones,
};

const expertServices = [
  { icon: Network, title: "Network Setup", desc: "Custom architecture, fiber optic cabling, enterprise-grade Wi-Fi and switching solutions for office spaces." },
  { icon: Camera, title: "Surveillance & CCTV", desc: "High-definition security systems featuring AI-powered facial recognition, remote monitoring for your facility." },
  { icon: Wrench, title: "AMC & Maintenance", desc: "Comprehensive Annual Maintenance Contracts (AMC) to ensure your IT infrastructure runs smoothly." },
];

export default function HomePage({
  onAddToCart,
}: {
  onAddToCart: (p: ProductOut, qty: number) => void;
}) {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<ProductOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProducts({ page: 1, page_size: 4 })
      .then((res) => setFeatured(res.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <HeroCarousel />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Explore Categories</h2>
            <p className="text-muted-foreground text-sm mt-1">Browse from high-grade enterprise hardware</p>
          </div>
          <button onClick={() => navigate("/marketplace")} className="text-primary text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
          {Object.entries(categoryIcons).map(([label, Icon]) => (
            <button
              key={label}
              onClick={() => navigate("/marketplace")}
              className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Icon size={20} className="text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Featured Products</h2>
          <button onClick={() => navigate("/marketplace")} className="text-primary text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
            View All <ChevronRight size={16} />
          </button>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border h-72 animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-12">No products yet. Add some from the admin panel.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onView={() => navigate(`/product/${p.slug}`)}
                onAddToCart={onAddToCart}
                onQuote={() => navigate("/quote")}
              />
            ))}
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <div className="bg-primary rounded-2xl overflow-hidden relative">
          <div className="absolute right-0 top-0 w-1/3 h-full opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #F97316 0%, transparent 70%)" }} />
          <div className="relative flex flex-col md:flex-row items-center justify-between p-8 md:p-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
                Bulk Purchase<br />Discount: Save<br /><span className="text-accent">up to 25%</span>
              </h2>
              <p className="text-blue-200 text-sm max-w-xs">
                Upgrade your entire office fleet with flexible pricing on workstations and networking equipment for orders over 10 units.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white/10 border border-white/20 rounded-xl p-5 text-center">
                <div className="text-white font-semibold text-sm mb-1">Offer Ends In</div>
                <div className="text-accent font-black text-2xl">14 Days : 22 Hours</div>
              </div>
              <button onClick={() => navigate("/quote")} className="bg-accent text-white font-semibold px-8 py-3 rounded-md hover:bg-orange-600 transition-colors">
                Request Bulk Quote
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-2">Expert IT Solutions for Your Business</h2>
          <p className="text-muted-foreground text-sm">Beyond hardware, we provide end-to-end technical support and infrastructure management.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {expertServices.map((s) => (
            <div key={s.title} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <s.icon size={24} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">{s.desc}</p>
              <button onClick={() => navigate("/services")} className="text-primary text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                Learn More <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-6">Official Distribution Partners</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-40 grayscale">
            {["CISCO", "HP", "Dell", "Lenovo", "Intel", "ASUS"].map((b) => (
              <span key={b} className="text-xl font-black text-foreground">{b}</span>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}