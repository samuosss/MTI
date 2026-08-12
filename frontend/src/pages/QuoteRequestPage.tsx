import { useState } from "react";
import { FileText, Upload, ArrowRight, Shield, Users, Truck, MapPin, Phone, MessageCircle, ChevronDown } from "lucide-react";
import Footer from "../components/layout/Footer";

const faqItems = [
  { q: "Quel est le délai de réponse pour un devis ?", a: "Notre équipe répond généralement en 4 à 8 heures ouvrables." },
  { q: "Aidez-vous à définir les spécifications techniques ?", a: "Oui, nos ingénieurs avant-vente peuvent vous aider à choisir le matériel adapté." },
  { q: "Quels sont vos secteurs d'intervention ?", a: "Nous servons des clients particuliers et professionnels partout en Tunisie." },
];

export default function QuoteRequestPage() {
  const [form, setForm] = useState({ company: "", contact: "", email: "", phone: "", description: "" });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-primary py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Approvisionnement d'entreprise,<br />simplifié.</h1>
            <p className="text-blue-200 text-sm max-w-md">Des devis précis avec des tarifs de gros compétitifs.</p>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-full w-28 h-28 flex items-center justify-center">
            <FileText size={48} className="text-accent" />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <FileText size={20} className="text-primary" />
              <h2 className="text-lg font-bold text-foreground">Formulaire de demande de devis</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {[
                ["company", "Société / Organisation", "Ex: MTI Solutions"],
                ["contact", "Personne de contact", "Ex: Amine"],
                ["email", "Email professionnel", "exemple@entreprise.tn"],
                ["phone", "Téléphone", "+216 00 000 000"],
              ].map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">{label}</label>
                  <input
                    value={(form as any)[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Description du projet</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Décrivez les postes, le matériel réseau ou les services IT dont vous avez besoin..."
                rows={4}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none transition-colors"
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Télécharger le cahier des charges / fichier RFQ</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              >
                <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">Cliquez pour télécharger ou glissez-déposez</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX ou XLSX (max. 100 Mo)</p>
              </div>
            </div>

            <button className="w-full bg-accent text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 text-base">
              Envoyer la demande de devis <ArrowRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            {[
              { icon: Shield, title: "Partenaire agréé", desc: "Distributeur officiel de matériel informatique en Tunisie." },
              { icon: Users, title: "Support expert", desc: "Une équipe passionnée toujours prête à vous conseiller." },
              { icon: Truck, title: "Livraison rapide", desc: "Livraison rapide à travers toute la Tunisie." },
            ].map((b) => (
              <div key={b.title} className="bg-card rounded-xl border border-border p-4">
                <b.icon size={20} className="text-primary mb-2" />
                <h4 className="text-sm font-bold text-foreground mb-1">{b.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="font-bold text-foreground mb-4">Contact direct</h3>
            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Adresse</p>
                  <p className="text-xs text-muted-foreground">Rue des Agrumes, 8021 Beni Khalled</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Ligne directe</p>
                  <p className="text-xs text-muted-foreground">+216 98 241 122</p>
                </div>
              </div>
            </div>
            <a
              href="https://wa.me/21698241122"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-green-500 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle size={16} />
              Discuter via WhatsApp
            </a>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <iframe
              title="Localisation MTI Shop"
              src="https://maps.google.com/maps?q=36.6478364,10.5915072&z=15&output=embed"
              className="w-full h-32 border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              href="https://www.google.com/maps?q=36.6478364,10.5915072"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 text-xs text-muted-foreground flex items-center gap-2 hover:text-primary transition-colors"
            >
              <MapPin size={12} className="text-primary" /> MTI Shop — Rue des Agrumes, Beni Khalled
            </a>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="font-bold text-foreground mb-4">Questions fréquentes</h3>
            <div className="space-y-2">
              {faqItems.map((item, i) => (
                <div key={i} className="border-b border-border last:border-0 pb-2 last:pb-0">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-2 py-2 text-left text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {item.q}
                    <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === i && <p className="text-xs text-muted-foreground pb-2 leading-relaxed">{item.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}