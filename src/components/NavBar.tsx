'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, MessageSquare, Settings, BarChart3, Rocket } from 'lucide-react';

export default function NavBar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Chat', icon: MessageSquare },
    { href: '/brain', label: 'Brain', icon: Brain },
    { href: '/stats', label: 'Stats', icon: BarChart3 },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/onboarding', label: 'Setup', icon: Rocket },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-base/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-text hover:text-accent transition-colors">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            S
          </div>
          <span className="hidden sm:inline">Shivver</span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map(link => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5
                  ${isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:text-text hover:bg-surface'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
