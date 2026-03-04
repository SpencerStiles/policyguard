'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, FlaskConical, BarChart3, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/policies', label: 'Policies', icon: FileText },
  { href: '/analysis', label: 'Analysis', icon: FlaskConical },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-shrink-0 bg-brand-900 lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-brand-800 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">PolicyGuard</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-800 text-white border-l-2 border-accent-400'
                    : 'text-brand-300 hover:bg-brand-800 hover:text-white',
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-brand-800 p-4">
          <div className="rounded-lg bg-brand-800 p-3">
            <p className="text-xs font-medium text-brand-200">PolicyGuard AI v0.1.0</p>
            <p className="mt-0.5 text-xs text-brand-400">AI-Powered Policy Analysis</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
