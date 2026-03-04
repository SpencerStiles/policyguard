'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as api from '@/lib/api';
import { formatDate, formatFileSize, statusColor } from '@/lib/utils';
import { logger } from '@/lib/logger';

export default function PoliciesPage() {
  const [clients, setClients] = useState<api.ClientListItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [policies, setPolicies] = useState<api.Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listClients().then((c) => {
      setClients(c);
      if (c.length > 0) {
        setSelectedClient(c[0].id);
      }
      setLoading(false);
    }).catch((err) => {
      logger.error('Failed to load clients', { error: String(err) });
      setError('Failed to load clients. Is the API server running?');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedClient) return;
    setLoading(true);
    setError(null);
    api
      .listPolicies(selectedClient)
      .then(setPolicies)
      .catch((err) => {
        logger.error('Failed to load policies', { clientId: selectedClient, error: String(err) });
        setError('Failed to load policies.');
      })
      .finally(() => setLoading(false));
  }, [selectedClient]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policies</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage uploaded policy documents</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Client selector */}
      <div className="mb-6">
        <label className="label">Select Client</label>
        <select
          className="input max-w-sm"
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
        >
          <option value="">Choose a client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Policy list */}
      <div className="card">
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
            </div>
          ) : !selectedClient ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">Select a client to view their policies.</p>
            </div>
          ) : policies.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">No policies for this client.</p>
              <Link href={`/clients/${selectedClient}`} className="btn-primary mt-4 inline-flex">
                Upload Policy
              </Link>
            </div>
          ) : (
            policies.map((policy) => (
              <div key={policy.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{policy.original_filename}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>{formatFileSize(policy.file_size)}</span>
                      {policy.page_count && <span>{policy.page_count} pages</span>}
                      {policy.carrier && <span className="font-medium">{policy.carrier}</span>}
                      {policy.coverage_type && (
                        <span className="capitalize rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">
                          {policy.coverage_type.replace(/-/g, ' ')}
                        </span>
                      )}
                      {policy.policy_number && <span>#{policy.policy_number}</span>}
                      <span>Uploaded {formatDate(policy.created_at)}</span>
                    </div>
                    {policy.effective_date && (
                      <p className="mt-1 text-xs text-gray-400">
                        Effective: {formatDate(policy.effective_date)} — {formatDate(policy.expiration_date)}
                      </p>
                    )}
                  </div>
                  <span className={`badge ${statusColor(policy.status)}`}>{policy.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
