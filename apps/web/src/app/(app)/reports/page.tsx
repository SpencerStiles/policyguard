'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '@/lib/api';
import { logger } from '@/lib/logger';

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-neutral-500">Loading...</div>}>
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
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      >
        <h1 className="font-display text-3xl text-neutral-900">Reports</h1>
        <p className="mt-1 text-sm text-neutral-500">Generate analysis reports for clients</p>
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
        className="card p-6 mb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
      >
        <h2 className="text-base font-semibold text-neutral-900 mb-4">Generate Report</h2>
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
              <motion.button
                className="btn-primary"
                onClick={handleGenerate}
                disabled={!selectedAnalysis || loading}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                {loading ? 'Generating...' : 'Generate'}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {report && (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
              <h2 className="text-base font-semibold text-neutral-900">Report Output</h2>
              <motion.button
                className="btn-secondary text-xs"
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  const content = reportFormat === 'markdown' ? report.content : JSON.stringify(report, null, 2);
                  navigator.clipboard.writeText(content);
                }}
              >
                Copy to Clipboard
              </motion.button>
            </div>
            <div className="p-6">
              {reportFormat === 'markdown' ? (
                <pre className="whitespace-pre-wrap text-sm text-neutral-800 font-mono bg-neutral-50 rounded-lg p-4 max-h-[600px] overflow-auto">
                  {report.content}
                </pre>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-neutral-800 font-mono bg-neutral-50 rounded-lg p-4 max-h-[600px] overflow-auto">
                  {JSON.stringify(report, null, 2)}
                </pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
