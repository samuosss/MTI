import { Mail, Phone, Globe } from "lucide-react";
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
              Empowering technical teams with high-performance hardware and enterprise-level IT infrastructure solutions.
            </p>
            <div className="flex gap-3 mt-4">
              <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><Mail size={14} /></button>
              <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><Phone size={14} /></button>
              <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><Globe size={14} /></button>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4 text-blue-100">Solutions</h4>
            <ul className="space-y-2 text-blue-200 text-sm">
              {["Hardware Solutions", "Managed IT Services", "Cloud Infrastructure", "Network Map"].map((t) => (
                <li key={t}><button className="hover:text-white transition-colors">{t}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4 text-blue-100">Support</h4>
            <ul className="space-y-2 text-blue-200 text-sm">
              {["Warranty Support", "Knowledge Base", "Contact Expert", "Partner Program"].map((t) => (
                <li key={t}><button className="hover:text-white transition-colors">{t}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4 text-blue-100">Company</h4>
            <ul className="space-y-2 text-blue-200 text-sm">
              {["About Us", "Careers", "SLA Agreements", "Terms of Service", "Privacy Policy"].map((t) => (
                <li key={t}><button className="hover:text-white transition-colors">{t}</button></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 text-center text-blue-300 text-xs">
          © 2026 MTI Multimédia Technologie Informatique. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
