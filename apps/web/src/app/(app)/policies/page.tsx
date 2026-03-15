'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import * as api from '@/lib/api';
import { formatDate, formatFileSize, statusColor } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { StaggerContainer, FadeUpItem } from '@/components/motion';

export default function PoliciesPage() {
  const [clients, setClients] = useState<api.ClientListItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [policies, setPolicies] = useState<api.Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listClients().then((c) => {
      setClients(c);
      if (c.length > 0) setSelectedClient(c[0].id);
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
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      >
        <div>
          <h1 className="font-display text-3xl text-neutral-900">Policies</h1>
          <p className="mt-1 text-sm text-neutral-500">View and manage uploaded policy documents</p>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </motion.div>
      )}

      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.08 }}
      >
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
      </motion.div>

      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.15 }}
      >
        <div className="divide-y divide-neutral-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
            </div>
          ) : !selectedClient ? (
            <div className="py-12 text-center">
              <p className="text-sm text-neutral-500">Select a client to view their policies.</p>
            </div>
          ) : policies.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-neutral-500">No policies for this client.</p>
              <Link href={`/clients/${selectedClient}`} className="btn-primary mt-4 inline-flex">
                Upload Policy
              </Link>
            </div>
          ) : (
            <StaggerContainer delay={0.2}>
              {policies.map((policy) => (
                <FadeUpItem key={policy.id}>
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">{policy.original_filename}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                          <span className="tabular">{formatFileSize(policy.file_size)}</span>
                          {policy.page_count && <span className="tabular">{policy.page_count} pages</span>}
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
                          <p className="mt-1 text-xs text-neutral-400">
                            Effective: {formatDate(policy.effective_date)} — {formatDate(policy.expiration_date)}
                          </p>
                        )}
                      </div>
                      <span className={`badge ${statusColor(policy.status)}`}>{policy.status}</span>
                    </div>
                  </div>
                </FadeUpItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </motion.div>
    </div>
  );
}
