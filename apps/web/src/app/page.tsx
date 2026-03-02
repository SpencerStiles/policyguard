'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { logger } from '@/lib/logger';

export default function DashboardPage() {
  const [clients, setClients] = useState<api.ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Clients" value={clients.length} icon="clients" />
        <StatCard title="Total Policies" value={totalPolicies} icon="policies" />
        <StatCard title="Analyses Run" value="-" icon="analysis" />
        <StatCard title="Gaps Found" value="-" icon="gaps" />
      </div>

      {/* Recent Clients */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Clients</h2>
          <Link href="/clients" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          ) : clients.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">No clients yet.</p>
              <Link href="/clients" className="btn-primary mt-4 inline-flex">
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
                <div>
                  <p className="text-sm font-medium text-gray-900">{client.name}</p>
                  <p className="text-xs text-gray-500">{client.industry || 'No industry set'}</p>
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

function StatCard({ title, value, icon }: { title: string; value: string | number; icon: string }) {
  return (
    <div className="card px-6 py-5">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
