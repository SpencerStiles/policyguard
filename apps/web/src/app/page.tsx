'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, FileText, FlaskConical, AlertTriangle, Activity, Plus } from 'lucide-react';
import * as api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { logger } from '@/lib/logger';

export default function DashboardPage() {
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your PolicyGuard workspace</p>
      </div>

      {/* API Health Banner */}
      {apiHealthy !== null && (
        <div
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
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Clients"
          value={clients.length}
          icon={Users}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Total Policies"
          value={totalPolicies}
          icon={FileText}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Analyses Run"
          value="-"
          icon={FlaskConical}
          iconBg="bg-violet-100"
          iconColor="text-violet-600"
        />
        <StatCard
          title="Gaps Found"
          value="-"
          icon={AlertTriangle}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
      </div>

      {/* Recent Clients */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Clients</h2>
          <Link href="/clients" className="text-sm font-medium text-accent-600 hover:text-accent-700">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
            </div>
          ) : clients.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-10 w-10 text-gray-300" />
              <h3 className="mt-3 text-sm font-medium text-gray-900">No clients yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first insurance client.
              </p>
              <Link href="/clients" className="btn-primary mt-4 inline-flex">
                <Plus className="h-4 w-4" />
                Add your first client
              </Link>
            </div>
          ) : (
            clients.slice(0, 5).map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-sm">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-500">{client.industry || 'No industry set'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">{client.policy_count} policies</p>
                  <p className="text-xs text-gray-500">{formatDate(client.created_at)}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="card px-6 py-5">
      <div className="flex items-center gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-0.5 text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
