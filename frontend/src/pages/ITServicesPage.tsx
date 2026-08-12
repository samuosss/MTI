import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, ChevronDown, Phone, Mail, Network, Camera, Server, Wrench, BarChart3 } from "lucide-react";
import Footer from "../components/layout/Footer";

const services = [
  { icon: Network, tag: "01 / INFRASTRUCTURE", title: "Installation réseau", desc: "Câblage Cat6A structuré et optimisation Wi-Fi 6E d'entreprise.", chips: ["Câblage structuré", "Cartographie du signal", "Fibre optique"], img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&h=200&fit=crop&auto=format", featured: false },
  { icon: Camera, tag: "02 / CONNECTIVITÉ", title: "Vidéosurveillance", desc: "Systèmes de surveillance IA et contrôle d'accès biométrique.", chips: null, img: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=300&h=200&fit=crop&auto=format", featured: false },
  { icon: Server, tag: "03 / SERVEURS", title: "Configuration de serveurs", desc: "Conception Windows/Linux hybride avec intégration AWS/Azure.", chips: ["Installation Active Directory", "Virtualisation (VMWare)"], img: null, featured: false },
  { icon: Wrench, tag: "04 / FIABILITÉ", title: "Maintenance & support", desc: "Contrats SLA prioritaires avec assistance 24/7.", chips: null, img: null, featured: true },
  { icon: BarChart3, tag: "05 / STRATÉGIE", title: "Conseil IT", desc: "Feuille de route stratégique de transformation numérique et audits.", chips: ["Programme de briefing technique"], img: null, featured: false },
];
const steps = [
  { num: "01", title: "Consultation", desc: "Sessions de découverte pour aligner les besoins techniques." },
  { num: "02", title: "Audit", desc: "Audit rigoureux de l'infrastructure existante." },
  { num: "03", title: "Déploiement", desc: "Déploiement précis par des ingénieurs certifiés." },
  { num: "04", title: "Support", desc: "Optimisation continue et maintenance proactive." },
];

export default function ITServicesPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", service: "Installation réseau", scope: "", details: "" });
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-white border-b border-border py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-widest mb-4">
              <span className="w-4 h-px bg-accent" /> Certification Entreprise
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-4">
              Solutions IT expertes pour<br />les entreprises
            </h1>
            <p className="text-muted-foreground mb-6 max-w-md">
              Architecture réseau précise, cybersécurité robuste et supervision technique 24/7.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate("/quote")} className="flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-md hover:bg-blue-900 transition-colors">
                Planifier un audit technique <ArrowRight size={16} />
              </button>
              <button onClick={() => navigate("/marketplace")} className="flex items-center gap-2 border border-border text-foreground font-medium px-6 py-3 rounded-md hover:border-primary transition-colors">
                Voir le catalogue de services
              </button>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="relative rounded-2xl overflow-hidden shadow-xl w-72 h-48">
              <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=400&fit=crop&auto=format" alt="Infrastructure serveur" className="w-full h-full object-cover" />
              <div className="absolute bottom-3 left-3 bg-white/95 rounded-lg px-3 py-2 shadow">
                <div className="text-2xl font-black text-primary">99.99%</div>
                <div className="text-xs text-muted-foreground">Garantie SLA Entreprise</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-2">Solutions techniques spécialisées</h2>
          <p className="text-muted-foreground text-sm">Expertise complète sur l'ensemble de l'écosystème numérique.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.title} className={`rounded-xl border overflow-hidden transition-shadow hover:shadow-lg ${s.featured ? "bg-primary border-primary" : "bg-card border-border"}`}>
              <div className="p-5">
                <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${s.featured ? "text-blue-300" : "text-muted-foreground"}`}>{s.tag}</div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.featured ? "bg-white/10" : "bg-primary/10"}`}>
                  <s.icon size={20} className={s.featured ? "text-white" : "text-primary"} />
                </div>
                <h3 className={`font-bold text-base mb-2 ${s.featured ? "text-white" : "text-foreground"}`}>{s.title}</h3>
                <p className={`text-sm leading-relaxed mb-3 ${s.featured ? "text-blue-200" : "text-muted-foreground"}`}>{s.desc}</p>
                {s.chips && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {s.chips.map((c) => (
                      <span key={c} className={`text-xs px-2 py-0.5 rounded-full ${s.featured ? "bg-white/10 text-blue-200" : "bg-secondary text-muted-foreground"}`}>{c}</span>
                    ))}
                  </div>
                )}
                {s.featured && (
                  <button className="mt-2 border border-white/30 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-white/10 transition-colors">
                    Télécharger les détails SLA
                  </button>
                )}
              </div>
              {s.img && (
                <div className="h-32 overflow-hidden">
                  <img src={s.img} alt={s.title} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="bg-card border-y border-border py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-2">Notre cadre de déploiement</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.num} className="relative">
                {i < steps.length - 1 && <div className="hidden md:block absolute top-7 left-1/2 w-full h-px bg-border" />}
                <div className="relative flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full border-2 border-primary/20 bg-white flex items-center justify-center mb-3 z-10">
                    <span className="text-sm font-black text-primary">{s.num}</span>
                  </div>
                  <h4 className="font-semibold text-foreground text-sm mb-1">{s.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-primary py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row gap-10 items-start">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-3">Lancez votre projet technique</h2>
            <p className="text-blue-200 text-sm mb-6">Un architecte senior répondra sous 12 heures ouvrables.</p>
            <div className="flex flex-col gap-3 text-blue-200 text-sm">
              <div className="flex items-center gap-2"><Phone size={14} /><span>+216 98 241 122</span></div>
              <div className="flex items-center gap-2"><Mail size={14} /><span>contact@mtishop.tn</span></div>
            </div>
          </div>
          <div className="w-full md:w-96 bg-white rounded-2xl p-6 shadow-xl">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Nom complet</label>
                <input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Ahmed Ben Ali" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Email professionnel</label>
                <input value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} placeholder="exemple@entreprise.tn" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-semibold text-foreground mb-1">Service souhaité</label>
              <div className="relative">
                <select value={formData.service} onChange={(e) => setFormData((p) => ({ ...p, service: e.target.value }))} className="w-full appearance-none border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary pr-8 bg-white">
                  {["Installation réseau", "Vidéosurveillance & Sécurité", "Configuration de serveurs", "Maintenance & support", "Conseil IT"].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-semibold text-foreground mb-1">Périmètre du projet</label>
              <input value={formData.scope} onChange={(e) => setFormData((p) => ({ ...p, scope: e.target.value }))} placeholder="Ex: 500 utilisateurs" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-foreground mb-1">Détails du projet</label>
              <textarea value={formData.details} onChange={(e) => setFormData((p) => ({ ...p, details: e.target.value }))} placeholder="Décrivez vos besoins..." rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none" />
            </div>
            <button className="w-full bg-accent text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2">
              Envoyer la demande <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}