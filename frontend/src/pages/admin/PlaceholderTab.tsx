import { Users, BarChart3, Settings } from "lucide-react";

const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  customers: Users,
  analytics: BarChart3,
  settings: Settings,
};

export default function PlaceholderTab({ section }: { section: string }) {
  const Icon = icons[section] ?? Settings;
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4">
        <Icon size={28} className="text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2 capitalize">{section}</h2>
      <p className="text-muted-foreground text-sm">This section is coming soon.</p>
    </div>
  );
}
