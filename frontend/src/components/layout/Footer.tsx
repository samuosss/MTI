import { Mail, Phone, MapPin } from "lucide-react";
import logo from "../../imports/new-removebg-preview.png";

export default function Footer() {
  return (
    <footer className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <img src={logo} alt="MTI Logo" className="h-35 w-auto object-contain brightness-0 invert" />
            </div>
            <p className="text-blue-200 text-sm leading-relaxed">
              Accompagner les équipes techniques avec du matériel performant et des solutions d'infrastructure IT d'entreprise.
            </p>
            <div className="space-y-2 mt-4 text-blue-200 text-xs">
              <div className="flex items-center gap-2"><MapPin size={13} /> Rue des Agrumes, 8021 Beni Khalled</div>
              <div className="flex items-center gap-2"><Phone size={13} /> +216 98 241 122</div>
              <div className="flex items-center gap-2"><Mail size={13} /> contact@mtishop.tn</div>
            </div>
            <div className="flex gap-3 mt-4">
              <a href="mailto:contact@mtishop.tn" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><Mail size={14} /></a>
              <a href="tel:+21698241122" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><Phone size={14} /></a>
              <a href="https://mtishop.tn" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><MapPin size={14} /></a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4 text-blue-100">Nos Solutions</h4>
            <ul className="space-y-2 text-blue-200 text-sm">
              {["Matériel informatique", "Services IT managés", "Infrastructure Cloud", "Cartographie réseau"].map((t) => (
                <li key={t}><button className="hover:text-white transition-colors">{t}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4 text-blue-100">Support</h4>
            <ul className="space-y-2 text-blue-200 text-sm">
              {["Support garantie", "Base de connaissances", "Contacter un expert", "Programme partenaire"].map((t) => (
                <li key={t}><button className="hover:text-white transition-colors">{t}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4 text-blue-100">Entreprise</h4>
            <ul className="space-y-2 text-blue-200 text-sm">
              {["À propos", "Carrières", "Accords SLA", "Conditions d'utilisation", "Politique de confidentialité"].map((t) => (
                <li key={t}><button className="hover:text-white transition-colors">{t}</button></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 text-center text-blue-300 text-xs">
          © 2026 MTI Multimédia Technologie Informatique. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}