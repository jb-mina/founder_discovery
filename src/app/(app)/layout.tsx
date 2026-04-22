import Link from "next/link";
import { Brain, Map, Crosshair, ClipboardList, AlertCircle } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "대시보드", icon: Map },
  { href: "/self-map", label: "Self Map", icon: Brain },
  { href: "/problems", label: "Problem Universe", icon: Crosshair },
  { href: "/fit", label: "Founder-Problem Fit", icon: AlertCircle },
  { href: "/validation", label: "Validation Backlog", icon: ClipboardList },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="px-4 py-5 border-b border-border">
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest">Discovery OS</p>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-tertiary hover:bg-wash hover:text-foreground transition-colors"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-border">
          <p className="text-xs text-subtle">Powered by Claude</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
