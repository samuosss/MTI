import { Mail, Phone, Linkedin, Facebook, X, Code2 } from "lucide-react";

interface ContactLink {
  icon: typeof Mail;
  label: string;
  value: string;
  href: string;
  colorClass: string;
}

const CONTACT_LINKS: ContactLink[] = [
  {
    icon: Mail,
    label: "Email",
    value: "samimiza9402@gmail.com",
    href: "mailto:samimiza9402@gmail.com",
    colorClass: "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white",
  },
  {
    icon: Phone,
    label: "Téléphone",
    value: "46 637 353",
    href: "tel:+21646637353",
    colorClass: "bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white",
  },
  {
    icon: Linkedin,
    label: "LinkedIn",
    value: "sami-boumaiza",
    href: "https://www.linkedin.com/in/sami-boumaiza-87b65a221/",
    colorClass: "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
  },
  {
    icon: Facebook,
    label: "Facebook",
    value: "sami.boumaiza.758",
    href: "https://www.facebook.com/sami.boumaiza.758",
    colorClass: "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
  },
];

export default function DeveloperContactModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl border border-border w-full max-w-sm max-h-[85vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-primary px-6 pt-8 pb-14 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={16} />
          </button>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-white mb-3">
              <Code2 size={26} />
            </div>
            <h2 className="text-white font-bold text-lg">Sami Boumaiza</h2>
            <p className="text-blue-200 text-xs font-medium">Développeur du site</p>
          </div>
        </div>

        {/* Contact links */}
        <div className="px-5 -mt-8 pb-6 space-y-2.5">
          {CONTACT_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="group flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${link.colorClass}`}>
                <link.icon size={17} />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{link.label}</p>
                <p className="text-sm font-semibold text-foreground truncate">{link.value}</p>
              </div>
            </a>
          ))}

          <p className="text-center text-xs text-muted-foreground pt-2">
            Une question sur le site ou un bug à signaler ? N'hésitez pas à me contacter.
          </p>
        </div>
      </div>
    </div>
  );
}