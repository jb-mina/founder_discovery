import Link from "next/link";
import { Brain, Map, Crosshair, ClipboardList, AlertCircle } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "대시보드", short: "홈", icon: Map },
  { href: "/self-map", label: "Self Map", short: "Self", icon: Brain },
  { href: "/problems", label: "Problem Universe", short: "문제", icon: Crosshair },
  { href: "/fit", label: "Founder-Problem Fit", short: "Fit", icon: AlertCircle },
  { href: "/validation", label: "Validation Backlog", short: "검증", icon: ClipboardList },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-border bg-surface flex-col">
        <div className="px-4 py-5 border-b border-border">
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest">My 0to1</p>
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

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-border z-30 flex">
        {nav.map(({ href, short, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 text-tertiary hover:text-foreground transition-colors"
          >
            <Icon size={20} />
            <span className="text-[10px]">{short}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
