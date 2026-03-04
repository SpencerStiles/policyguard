'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  FlaskConical,
  BarChart3,
  Shield,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/policies', label: 'Policies', icon: FileText },
  { href: '/analysis', label: 'Analysis', icon: FlaskConical },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-full w-64 flex-col bg-brand-900">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-brand-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500 flex-shrink-0">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <span className="text-base font-bold text-white tracking-tight">PolicyGuard</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-800 text-white border-l-2 border-accent-400 pl-[10px]'
                  : 'text-brand-300 hover:bg-brand-800 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-brand-800 px-4 py-4">
        {user && (
          <div className="mb-3 px-1">
            <p className="text-xs text-brand-400 truncate">{user.full_name || 'Account'}</p>
            <p className="text-xs text-brand-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-300 hover:bg-brand-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
