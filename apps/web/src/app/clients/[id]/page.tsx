'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as api from '@/lib/api';
import { formatDate, formatFileSize, statusColor, formatCurrency } from '@/lib/utils';
import { logger } from '@/lib/logger';

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<api.Client | null>(null);
  const [policies, setPolicies] = useState<api.Policy[]>([]);
  const [analyses, setAnalyses] = useState<api.AnalysisListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysisTitle, setAnalysisTitle] = useState('');
  const [showAnalysisForm, setShowAnalysisForm] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, p, a] = await Promise.all([
        api.getClient(clientId),
        api.listPolicies(clientId),
        api.listAnalyses(clientId),
      ]);
      setClient(c);
      setPolicies(p);
      setAnalyses(a);
    } catch (err) {
      logger.error('Failed to load client details', { clientId, error: String(err) });
      setError('Failed to load client data. Is the API server running?');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await api.uploadPolicy(clientId, file);
      load();
    } catch (err) {
      logger.error('Failed to upload policy', { clientId, error: String(err) });
      setError('Failed to upload policy. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleCreateAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createAnalysis({
        client_id: clientId,
        title: analysisTitle || `Analysis - ${new Date().toLocaleDateString()}`,
        industry_profile_id: client?.industry || undefined,
      });
      setAnalysisTitle('');
      setShowAnalysisForm(false);
      load();
    } catch (err) {
      logger.error('Failed to create analysis', { clientId, error: String(err) });
      setError('Failed to start analysis. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!client) {
    return <p className="text-center text-gray-500 py-20">Client not found.</p>;
  }

  return (
    <div>
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/clients" className="hover:text-gray-700">Clients</Link>
            <span>/</span>
            <span className="text-gray-900">{client.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
          {client.industry && <p className="mt-1 text-sm text-gray-500 capitalize">{client.industry.replace(/-/g, ' ')}</p>}
          {client.description && <p className="mt-2 text-sm text-gray-600">{client.description}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Policies Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Policies */}
          <div className="card">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Policies ({policies.length})</h2>
              <label className={`btn-primary cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
                {uploading ? 'Uploading...' : '+ Upload PDF'}
                <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
            <div className="divide-y divide-gray-100">
              {policies.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500">No policies uploaded yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Upload a PDF to start analyzing coverage.</p>
                </div>
              ) : (
                policies.map((policy) => (
                  <div key={policy.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{policy.original_filename}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                          <span>{formatFileSize(policy.file_size)}</span>
                          {policy.page_count && <span>{policy.page_count} pages</span>}
                          {policy.carrier && <span>{policy.carrier}</span>}
                          {policy.coverage_type && <span className="capitalize">{policy.coverage_type.replace(/-/g, ' ')}</span>}
                        </div>
                      </div>
                      <span className={`badge ${statusColor(policy.status)}`}>{policy.status}</span>
                    </div>
                    {policy.effective_date && (
                      <p className="mt-1 text-xs text-gray-400">
                        {formatDate(policy.effective_date)} — {formatDate(policy.expiration_date)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Analyses */}
          <div className="card">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Analyses ({analyses.length})</h2>
              <button className="btn-primary" onClick={() => setShowAnalysisForm(!showAnalysisForm)}>
                {showAnalysisForm ? 'Cancel' : '+ Run Analysis'}
              </button>
            </div>

            {showAnalysisForm && (
              <form onSubmit={handleCreateAnalysis} className="border-b border-gray-200 px-6 py-4 bg-gray-50">
                <div className="flex gap-3">
                  <input
                    className="input flex-1"
                    placeholder="Analysis title (optional)"
                    value={analysisTitle}
                    onChange={(e) => setAnalysisTitle(e.target.value)}
                  />
                  <button className="btn-primary" type="submit">Run</button>
                </div>
              </form>
            )}

            <div className="divide-y divide-gray-100">
              {analyses.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500">No analyses yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Upload policies first, then run an analysis.</p>
                </div>
              ) : (
                analyses.map((analysis) => (
                  <Link
                    key={analysis.id}
                    href={`/analysis/${analysis.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{analysis.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(analysis.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {analysis.overall_score != null && (
                        <span className="text-sm font-semibold text-gray-700">{analysis.overall_score}/100</span>
                      )}
                      <span className={`badge ${statusColor(analysis.status)}`}>{analysis.status}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Client Info</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500">Industry</dt>
                <dd className="text-sm text-gray-900 capitalize">{client.industry?.replace(/-/g, ' ') || 'Not set'}</dd>
              </div>
              {client.contact_email && (
                <div>
                  <dt className="text-xs text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">{client.contact_email}</dd>
                </div>
              )}
              {client.contact_phone && (
                <div>
                  <dt className="text-xs text-gray-500">Phone</dt>
                  <dd className="text-sm text-gray-900">{client.contact_phone}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500">Added</dt>
                <dd className="text-sm text-gray-900">{formatDate(client.created_at)}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Policies</dt>
                <dd className="text-sm font-medium text-gray-900">{policies.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Analyses</dt>
                <dd className="text-sm font-medium text-gray-900">{analyses.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Parsed</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {policies.filter((p) => p.status === 'parsed').length}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
