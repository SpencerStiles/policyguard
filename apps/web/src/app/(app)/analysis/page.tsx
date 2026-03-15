'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import * as api from '@/lib/api';
import { formatDate, statusColor } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { StaggerContainer, FadeUpItem } from '@/components/motion';

export default function AnalysisListPage() {
  const [clients, setClients] = useState<api.ClientListItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [analyses, setAnalyses] = useState<api.AnalysisListItem[]>([]);
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
      .listAnalyses(selectedClient)
      .then(setAnalyses)
      .catch((err) => {
        logger.error('Failed to load analyses', { clientId: selectedClient, error: String(err) });
        setError('Failed to load analyses.');
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
          <h1 className="font-display text-3xl text-neutral-900">Analysis</h1>
          <p className="mt-1 text-sm text-neutral-500">View coverage gap and conflict analyses</p>
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
              <p className="text-sm text-neutral-500">Select a client to view their analyses.</p>
            </div>
          ) : analyses.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-neutral-500">No analyses for this client.</p>
              <Link href={`/clients/${selectedClient}`} className="btn-primary mt-4 inline-flex">
                Run Analysis
              </Link>
            </div>
          ) : (
            <StaggerContainer delay={0.2}>
              {analyses.map((a) => (
                <FadeUpItem key={a.id}>
                  <Link
                    href={`/analysis/${a.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{a.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{formatDate(a.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.overall_score != null && (
                        <span className="text-sm font-semibold tabular text-neutral-700">{a.overall_score}/100</span>
                      )}
                      <span className={`badge ${statusColor(a.status)}`}>{a.status}</span>
                      <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                </FadeUpItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </motion.div>
    </div>
  );
}
