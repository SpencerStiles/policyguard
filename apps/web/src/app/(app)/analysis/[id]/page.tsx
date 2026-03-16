'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '@/lib/api';
import { formatDate, severityColor, severityDot, statusColor } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { scoreToSignal, evidenceToSources } from '@/lib/coplayground-bridge';
import { ConfidenceMeter } from '@coplayground/react';
import { SourceBadge } from '@coplayground/react';
import { UncertaintyFlag } from '@coplayground/react';
import { StaggerContainer, FadeUpItem } from '@/components/motion';
import { useCountUp } from '@/hooks/use-count-up';

const gentle = { type: 'spring', stiffness: 200, damping: 25 } as const;
const snappy = { type: 'spring', stiffness: 400, damping: 30 } as const;

export default function AnalysisDetailPage() {
  const params = useParams();
  const analysisId = params.id as string;

  const [analysis, setAnalysis] = useState<api.Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gaps' | 'conflicts' | 'recommendations'>('gaps');

  useEffect(() => {
    api
      .getAnalysis(analysisId)
      .then(setAnalysis)
      .catch((err) => {
        logger.error('Failed to load analysis', { analysisId, error: String(err) });
        setError('Failed to load analysis details.');
      })
      .finally(() => setLoading(false));
  }, [analysisId]);

  useEffect(() => {
    if (!analysis || analysis.status !== 'running') return;
    const interval = setInterval(() => {
      api.getAnalysis(analysisId).then((a) => {
        setAnalysis(a);
        if (a.status !== 'running') clearInterval(interval);
      }).catch((err) => {
        logger.warn('Polling analysis failed', { analysisId, error: String(err) });
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [analysis?.status, analysisId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!analysis) {
    return <p className="text-center text-neutral-500 py-20">Analysis not found.</p>;
  }

  const tabs = [
    { key: 'gaps' as const, label: 'Coverage Gaps', count: analysis.gaps?.length || 0 },
    { key: 'conflicts' as const, label: 'Conflicts', count: analysis.conflicts?.length || 0 },
    { key: 'recommendations' as const, label: 'Recommendations', count: analysis.recommendations?.length || 0 },
  ];

  return (
    <div>
      {/* Header */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={gentle}
      >
        <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
          <Link href="/clients" className="hover:text-neutral-700">Clients</Link>
          <span>/</span>
          <Link href={`/clients/${analysis.client_id}`} className="hover:text-neutral-700">Client</Link>
          <span>/</span>
          <span className="text-neutral-900">Analysis</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-neutral-900">{analysis.title}</h1>
            <div className="mt-1.5 flex items-center gap-3">
              <span className={`badge ${statusColor(analysis.status)}`}>{analysis.status}</span>
              <span className="text-sm text-neutral-500">{formatDate(analysis.created_at)}</span>
              {analysis.overall_score != null && (
                <span className="text-sm font-semibold tabular text-neutral-700">
                  Score: {analysis.overall_score}/100
                </span>
              )}
            </div>
          </div>
          {analysis.status === 'completed' && (
            <Link href={`/reports?analysis=${analysis.id}`} className="btn-secondary">
              View Report
            </Link>
          )}
        </div>
      </motion.div>

      {/* Running state */}
      <AnimatePresence>
        {analysis.status === 'running' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="overflow-hidden"
          >
            <div className="card p-6 mb-6 flex items-center gap-4">
              <div className="relative flex h-6 w-6 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-accent-400 opacity-25 animate-ping" />
                <div className="h-3 w-3 rounded-full bg-accent-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">Analysis in progress…</p>
                <p className="text-xs text-neutral-500">This may take a few minutes. The page will auto-refresh.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Executive Summary */}
      <AnimatePresence>
        {analysis.summary && (
          <motion.div
            className="card p-6 mb-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...gentle, delay: 0.08 }}
          >
            <h2 className="text-sm font-semibold text-neutral-900 mb-2">Executive Summary</h2>
            <p className="text-sm text-neutral-700 leading-relaxed">{analysis.summary}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats bar */}
      {analysis.status === 'completed' && (
        <StaggerContainer className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6" delay={0.1}>
          <FadeUpItem>
            <ScoreCard label="Overall Score" value={analysis.overall_score ?? 0} suffix="/100" color="text-neutral-900" dash={analysis.overall_score == null} />
          </FadeUpItem>
          <FadeUpItem>
            <ScoreCard label="Coverage Gaps" value={analysis.gaps?.length || 0} color="text-red-600" />
          </FadeUpItem>
          <FadeUpItem>
            <ScoreCard label="Conflicts" value={analysis.conflicts?.length || 0} color="text-amber-600" />
          </FadeUpItem>
          <FadeUpItem>
            <ScoreCard label="Recommendations" value={analysis.recommendations?.length || 0} color="text-accent-600" />
          </FadeUpItem>
        </StaggerContainer>
      )}

      {/* Confidence legend */}
      {analysis.status === 'completed' && (
        <motion.div
          className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Confidence Guide</span>
          <span className="flex items-center gap-1.5 text-xs text-blue-700">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />High ≥ 85% — strong textual evidence
          </span>
          <span className="flex items-center gap-1.5 text-xs text-blue-700">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />Medium 60–85% — verify recommended
          </span>
          <span className="flex items-center gap-1.5 text-xs text-blue-700">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />Low 30–60% — manual review needed
          </span>
          <span className="flex items-center gap-1.5 text-xs text-blue-700">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />Uncertain &lt;30% — insufficient data
          </span>
        </motion.div>
      )}

      {/* Tabs + content */}
      {analysis.status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...gentle, delay: 0.22 }}
        >
          {/* Tab bar */}
          <div className="relative flex gap-1 border-b border-neutral-200 mb-6">
            {tabs.map((tab) => (
              <motion.button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-accent-600'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
                whileTap={{ scale: 0.97 }}
                transition={snappy}
              >
                {tab.label}
                <span className={`ml-1.5 rounded-full px-2 py-0.5 text-xs ${
                  activeTab === tab.key
                    ? 'bg-accent-100 text-accent-700'
                    : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {tab.count}
                </span>
                {/* Spring-animated underline indicator (layoutId pattern) */}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-accent-600"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
              </motion.button>
            ))}
          </div>

          {/* Tab panels with AnimatePresence cross-fade */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'gaps' && (
                <FindingList
                  items={analysis.gaps || []}
                  emptyMessage="No coverage gaps identified."
                  renderItem={(gap) => {
                    const signal = scoreToSignal(gap.confidence_score, 'Gap', gap.evidence);
                    const sources = evidenceToSources(gap.evidence);
                    return (
                      <motion.div
                        key={gap.id}
                        className={`card border-l-4 p-5 ${severityBorder(gap.severity)}`}
                        whileHover={{ y: -1, boxShadow: '0 4px 16px -4px rgba(0,0,0,0.08)' }}
                        transition={snappy}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block h-2 w-2 rounded-full ${severityDot(gap.severity)}`} />
                            <h3 className="text-sm font-semibold text-neutral-900">{gap.title}</h3>
                          </div>
                          <span className={`badge ${severityColor(gap.severity)}`}>{gap.severity}</span>
                        </div>
                        <UncertaintyFlag
                          level={signal.level}
                          message={signal.level !== 'high' ? signal.explanation : undefined}
                        >
                          <p className="text-sm text-neutral-700 mb-3">{gap.description}</p>
                        </UncertaintyFlag>
                        <div className="mb-3">
                          <p className="text-xs text-neutral-500 mb-1.5 font-medium">AI Confidence</p>
                          <ConfidenceMeter signal={signal} size="sm" showLabel showFactors />
                        </div>
                        {sources.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-neutral-500 mb-1.5 font-medium">Evidence Sources</p>
                            <div className="flex flex-wrap gap-1.5">
                              {sources.map((src) => (
                                <SourceBadge key={src.id} source={src} compact />
                              ))}
                            </div>
                          </div>
                        )}
                        {gap.recommended_action && (
                          <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2">
                            <p className="text-xs font-medium text-blue-800">Recommended Action</p>
                            <p className="text-xs text-blue-700 mt-0.5">{gap.recommended_action}</p>
                          </div>
                        )}
                      </motion.div>
                    );
                  }}
                />
              )}

              {activeTab === 'conflicts' && (
                <FindingList
                  items={analysis.conflicts || []}
                  emptyMessage="No policy conflicts identified."
                  renderItem={(conflict) => {
                    const signal = scoreToSignal(conflict.confidence_score, 'Conflict', conflict.evidence);
                    const sources = evidenceToSources(conflict.evidence);
                    return (
                      <motion.div
                        key={conflict.id}
                        className={`card border-l-4 p-5 ${severityBorder(conflict.severity)}`}
                        whileHover={{ y: -1, boxShadow: '0 4px 16px -4px rgba(0,0,0,0.08)' }}
                        transition={snappy}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block h-2 w-2 rounded-full ${severityDot(conflict.severity)}`} />
                            <h3 className="text-sm font-semibold text-neutral-900">{conflict.title}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`badge ${severityColor(conflict.severity)}`}>{conflict.severity}</span>
                            {conflict.conflict_type && (
                              <span className="badge bg-neutral-50 text-neutral-600 border-neutral-200">{conflict.conflict_type}</span>
                            )}
                          </div>
                        </div>
                        <UncertaintyFlag
                          level={signal.level}
                          message={signal.level !== 'high' ? signal.explanation : undefined}
                        >
                          <p className="text-sm text-neutral-700 mb-3">{conflict.description}</p>
                        </UncertaintyFlag>
                        <div className="mb-3">
                          <p className="text-xs text-neutral-500 mb-1.5 font-medium">AI Confidence</p>
                          <ConfidenceMeter signal={signal} size="sm" showLabel showFactors />
                        </div>
                        {sources.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-neutral-500 mb-1.5 font-medium">Evidence Sources</p>
                            <div className="flex flex-wrap gap-1.5">
                              {sources.map((src) => (
                                <SourceBadge key={src.id} source={src} compact />
                              ))}
                            </div>
                          </div>
                        )}
                        {conflict.resolution && (
                          <div className="rounded-md bg-green-50 border border-green-100 px-3 py-2">
                            <p className="text-xs font-medium text-green-800">Resolution</p>
                            <p className="text-xs text-green-700 mt-0.5">{conflict.resolution}</p>
                          </div>
                        )}
                      </motion.div>
                    );
                  }}
                />
              )}

              {activeTab === 'recommendations' && (
                <FindingList
                  items={analysis.recommendations || []}
                  emptyMessage="No recommendations generated."
                  renderItem={(rec) => {
                    const signal = scoreToSignal(rec.confidence_score, 'Recommendation');
                    return (
                      <motion.div
                        key={rec.id}
                        className={`card border-l-4 p-5 ${severityBorder(rec.priority)}`}
                        whileHover={{ y: -1, boxShadow: '0 4px 16px -4px rgba(0,0,0,0.08)' }}
                        transition={snappy}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-sm font-semibold text-neutral-900">{rec.title}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`badge ${severityColor(rec.priority)}`}>{rec.priority}</span>
                            <span className="badge bg-neutral-50 text-neutral-600 border-neutral-200">{rec.category}</span>
                          </div>
                        </div>
                        <p className="text-sm text-neutral-700 mb-3">{rec.description}</p>
                        <div className="mb-3">
                          <p className="text-xs text-neutral-500 mb-1.5 font-medium">AI Confidence</p>
                          <ConfidenceMeter signal={signal} size="sm" showLabel />
                        </div>
                        {rec.estimated_impact && (
                          <p className="text-xs text-neutral-500">
                            <span className="font-medium">Expected Impact:</span> {rec.estimated_impact}
                          </p>
                        )}
                      </motion.div>
                    );
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// ─── Score Card with count-up ─────────────────────────────────────────────────

function ScoreCard({
  label,
  value,
  suffix,
  color,
  dash,
}: {
  label: string;
  value: number;
  suffix?: string;
  color: string;
  dash?: boolean;
}) {
  const displayed = useCountUp(dash ? 0 : value);
  return (
    <motion.div
      className="card px-5 py-4"
      whileHover={{ y: -1, boxShadow: '0 4px 16px -4px rgba(0,0,0,0.08)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular ${color}`}>
        {dash ? '—' : displayed}
        {!dash && suffix && <span className="text-sm text-neutral-400">{suffix}</span>}
      </p>
    </motion.div>
  );
}

// ─── Finding list with stagger ────────────────────────────────────────────────

function FindingList<T>({
  items,
  emptyMessage,
  renderItem,
}: {
  items: T[];
  emptyMessage: string;
  renderItem: (item: T) => React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-neutral-500 text-center py-8">{emptyMessage}</p>
    );
  }
  return (
    <StaggerContainer className="space-y-4" delay={0}>
      {items.map((item, i) => (
        <FadeUpItem key={i}>
          {renderItem(item)}
        </FadeUpItem>
      ))}
    </StaggerContainer>
  );
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

function severityBorder(severity: string): string {
  switch (severity) {
    case 'critical': return 'border-l-red-500';
    case 'high': return 'border-l-orange-500';
    case 'medium': return 'border-l-amber-500';
    case 'low': return 'border-l-green-500';
    default: return 'border-l-neutral-300';
  }
}
