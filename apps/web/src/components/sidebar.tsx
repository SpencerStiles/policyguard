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
  Menu,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/policies', label: 'Policies', icon: FileText },
  { href: '/analysis', label: 'Analysis', icon: FlaskConical },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
] as const;

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col bg-brand-900">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-brand-800">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500 flex-shrink-0"
          style={{ boxShadow: '0 0 16px -2px rgba(39, 171, 131, 0.5)' }}
        >
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
              onClick={onNavClick}
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

      {/* Teal gradient accent at bottom of sidebar */}
      <div
        className="h-px mx-4"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(39,171,131,0.4), transparent)' }}
      />

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
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-full w-64 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 bg-brand-900 px-4 py-3 border-b border-brand-800">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-300 hover:bg-brand-800 hover:text-white transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500 flex-shrink-0"
            style={{ boxShadow: '0 0 12px -2px rgba(39, 171, 131, 0.5)' }}
          >
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">PolicyGuard</span>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="lg:hidden fixed inset-0 z-40 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer */}
            <motion.aside
              key="drawer"
              className="lg:hidden fixed top-0 left-0 z-50 h-full w-72"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            >
              <SidebarContent onNavClick={() => setMobileOpen(false)} />
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-brand-300 hover:bg-brand-800 hover:text-white transition-colors"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
