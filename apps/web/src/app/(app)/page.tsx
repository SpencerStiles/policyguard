'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, FileText, FlaskConical, AlertTriangle, Activity, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import * as api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/auth';
import { StaggerContainer, FadeUpItem } from '@/components/motion';
import { useCountUp } from '@/hooks/use-count-up';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<api.ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    api.checkHealth().then(setApiHealthy);

    api
      .listClients()
      .then(setClients)
      .catch((err) => {
        logger.error('Failed to load clients', { error: String(err) });
        setError('Failed to load dashboard data. Is the API server running?');
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPolicies = clients.reduce((sum, c) => sum + c.policy_count, 0);
  const firstName = user?.full_name?.split(' ')[0] ?? null;

  return (
    <div>
      {/* Greeting header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      >
        <h1 className="font-display text-3xl text-neutral-900">
          {getGreeting()}{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          {loading
            ? 'Loading your workspace…'
            : `${clients.length} client${clients.length !== 1 ? 's' : ''} · ${totalPolicies} polic${totalPolicies !== 1 ? 'ies' : 'y'} tracked`}
        </p>
      </motion.div>

      {/* API Health Banner */}
      {apiHealthy !== null && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`mb-6 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${
            apiHealthy
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-amber-200 bg-amber-50 text-amber-700'
          }`}
        >
          <Activity className="h-4 w-4" />
          {apiHealthy
            ? 'API connected'
            : 'API is warming up — first requests may take a moment'}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </motion.div>
      )}

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8" delay={0.1}>
        <FadeUpItem>
          <StatCard title="Total Clients" value={clients.length} icon={Users} iconBg="bg-blue-100" iconColor="text-blue-600" loading={loading} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard title="Total Policies" value={totalPolicies} icon={FileText} iconBg="bg-emerald-100" iconColor="text-emerald-600" loading={loading} />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard title="Analyses Run" value={0} icon={FlaskConical} iconBg="bg-violet-100" iconColor="text-violet-600" loading={loading} dash />
        </FadeUpItem>
        <FadeUpItem>
          <StatCard title="Gaps Found" value={0} icon={AlertTriangle} iconBg="bg-amber-100" iconColor="text-amber-600" loading={loading} dash />
        </FadeUpItem>
      </StaggerContainer>

      {/* Recent Clients */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.3 }}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-base font-semibold text-neutral-900">Recent Clients</h2>
          <Link href="/clients" className="text-sm font-medium text-accent-600 hover:text-accent-700">
            View all
          </Link>
        </div>
        <div className="divide-y divide-neutral-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
            </div>
          ) : clients.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-10 w-10 text-neutral-300 float" />
              <h3 className="mt-3 text-sm font-medium text-neutral-900">No clients yet</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Get started by adding your first insurance client.
              </p>
              <Link href="/clients" className="btn-primary mt-4 inline-flex">
                <Plus className="h-4 w-4" />
                Add your first client
              </Link>
            </div>
          ) : (
            clients.slice(0, 5).map((client, i) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 250, damping: 28, delay: 0.35 + i * 0.04 }}
              >
                <Link
                  href={`/clients/${client.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-sm">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{client.name}</p>
                      <p className="text-xs text-neutral-500">{client.industry || 'No industry set'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular text-neutral-700">{client.policy_count} policies</p>
                    <p className="text-xs text-neutral-500">{formatDate(client.created_at)}</p>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  loading,
  dash,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  loading?: boolean;
  dash?: boolean;
}) {
  const displayed = useCountUp(loading ? 0 : value);

  return (
    <motion.div
      className="card px-6 py-5"
      whileHover={{ y: -2, boxShadow: '0 4px 16px -4px rgba(0,0,0,0.1)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div className="flex items-center gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>
          <p className="mt-0.5 text-2xl font-bold tabular text-neutral-900">
            {loading ? '—' : dash ? '—' : displayed}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
