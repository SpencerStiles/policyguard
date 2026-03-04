'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import * as api from '@/lib/api';
import { logger } from '@/lib/logger';

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-gray-500">Loading...</div>}>
      <ReportsContent />
    </Suspense>
  );
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const analysisIdParam = searchParams.get('analysis');

  const [clients, setClients] = useState<api.ClientListItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [analyses, setAnalyses] = useState<api.AnalysisListItem[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string>(analysisIdParam || '');
  const [report, setReport] = useState<any>(null);
  const [reportFormat, setReportFormat] = useState<'json' | 'markdown'>('json');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listClients().then((c) => {
      setClients(c);
      if (c.length > 0 && !selectedClient) setSelectedClient(c[0].id);
    }).catch((err) => {
      logger.error('Failed to load clients for reports', { error: String(err) });
      setError('Failed to load clients. Is the API server running?');
    });
  }, []);

  useEffect(() => {
    if (!selectedClient) return;
    api.listAnalyses(selectedClient).then((a) => {
      setAnalyses(a);
      if (analysisIdParam && a.some((x) => x.id === analysisIdParam)) {
        setSelectedAnalysis(analysisIdParam);
      }
    }).catch((err) => {
      logger.error('Failed to load analyses for reports', { clientId: selectedClient, error: String(err) });
      setError('Failed to load analyses.');
    });
  }, [selectedClient, analysisIdParam]);

  const handleGenerate = async () => {
    if (!selectedAnalysis) return;
    setLoading(true);
    setReport(null);
    setError(null);
    try {
      const data = await api.getReport(selectedAnalysis, reportFormat);
      setReport(data);
    } catch (err) {
      logger.error('Failed to generate report', { analysisId: selectedAnalysis, error: String(err) });
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Generate analysis reports for clients</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate Report</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Client</label>
            <select
              className="input"
              value={selectedClient}
              onChange={(e) => { setSelectedClient(e.target.value); setSelectedAnalysis(''); }}
            >
              <option value="">Choose a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Analysis</label>
            <select
              className="input"
              value={selectedAnalysis}
              onChange={(e) => setSelectedAnalysis(e.target.value)}
            >
              <option value="">Choose an analysis...</option>
              {analyses
                .filter((a) => a.status === 'completed')
                .map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="label">Format</label>
            <div className="flex gap-2">
              <select
                className="input flex-1"
                value={reportFormat}
                onChange={(e) => setReportFormat(e.target.value as 'json' | 'markdown')}
              >
                <option value="json">JSON</option>
                <option value="markdown">Markdown</option>
              </select>
              <button
                className="btn-primary"
                onClick={handleGenerate}
                disabled={!selectedAnalysis || loading}
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report output */}
      {report && (
        <div className="card">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Report Output</h2>
            <button
              className="btn-secondary text-xs"
              onClick={() => {
                const content = reportFormat === 'markdown' ? report.content : JSON.stringify(report, null, 2);
                navigator.clipboard.writeText(content);
              }}
            >
              Copy to Clipboard
            </button>
          </div>
          <div className="p-6">
            {reportFormat === 'markdown' ? (
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-auto">
                {report.content}
              </pre>
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-auto">
                {JSON.stringify(report, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
