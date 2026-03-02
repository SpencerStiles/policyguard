'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as api from '@/lib/api';
import { formatDate, severityColor, severityDot, statusColor } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { scoreToSignal, evidenceToSources } from '@/lib/coplayground-bridge';
import { ConfidenceMeter } from '@coplayground/react';
import { SourceBadge } from '@coplayground/react';
import { UncertaintyFlag } from '@coplayground/react';

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
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
    return <p className="text-center text-gray-500 py-20">Analysis not found.</p>;
  }

  const tabs = [
    { key: 'gaps' as const, label: 'Coverage Gaps', count: analysis.gaps?.length || 0 },
    { key: 'conflicts' as const, label: 'Conflicts', count: analysis.conflicts?.length || 0 },
    { key: 'recommendations' as const, label: 'Recommendations', count: analysis.recommendations?.length || 0 },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href="/clients" className="hover:text-gray-700">Clients</Link>
          <span>/</span>
          <Link href={`/clients/${analysis.client_id}`} className="hover:text-gray-700">Client</Link>
          <span>/</span>
          <span className="text-gray-900">Analysis</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{analysis.title}</h1>
            <div className="mt-1 flex items-center gap-3">
              <span className={`badge ${statusColor(analysis.status)}`}>{analysis.status}</span>
              <span className="text-sm text-gray-500">{formatDate(analysis.created_at)}</span>
              {analysis.overall_score != null && (
                <span className="text-sm font-semibold text-gray-700">Score: {analysis.overall_score}/100</span>
              )}
            </div>
          </div>
          {analysis.status === 'completed' && (
            <Link href={`/reports?analysis=${analysis.id}`} className="btn-secondary">
              View Report
            </Link>
          )}
        </div>
      </div>

      {/* Running state */}
      {analysis.status === 'running' && (
        <div className="card p-6 mb-6 flex items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <div>
            <p className="text-sm font-medium text-gray-900">Analysis in progress...</p>
            <p className="text-xs text-gray-500">This may take a few minutes. The page will auto-refresh.</p>
          </div>
        </div>
      )}

      {/* Summary */}
      {analysis.summary && (
        <div className="card p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Executive Summary</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>
        </div>
      )}

      {/* Stats bar */}
      {analysis.status === 'completed' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
          <div className="card px-5 py-4">
            <p className="text-xs text-gray-500">Overall Score</p>
            <p className="text-2xl font-bold text-gray-900">{analysis.overall_score ?? '-'}<span className="text-sm text-gray-400">/100</span></p>
          </div>
          <div className="card px-5 py-4">
            <p className="text-xs text-gray-500">Coverage Gaps</p>
            <p className="text-2xl font-bold text-red-600">{analysis.gaps?.length || 0}</p>
          </div>
          <div className="card px-5 py-4">
            <p className="text-xs text-gray-500">Conflicts</p>
            <p className="text-2xl font-bold text-amber-600">{analysis.conflicts?.length || 0}</p>
          </div>
          <div className="card px-5 py-4">
            <p className="text-xs text-gray-500">Recommendations</p>
            <p className="text-2xl font-bold text-brand-600">{analysis.recommendations?.length || 0}</p>
          </div>
        </div>
      )}

      {/* CoPlayground legend */}
      {analysis.status === 'completed' && (
        <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
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
        </div>
      )}

      {/* Tabs */}
      {analysis.status === 'completed' && (
        <>
          <div className="flex gap-1 border-b border-gray-200 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Gap findings */}
          {activeTab === 'gaps' && (
            <div className="space-y-4">
              {(analysis.gaps || []).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No coverage gaps identified.</p>
              ) : (
                (analysis.gaps || []).map((gap) => {
                  const signal = scoreToSignal(gap.confidence_score, 'Gap', gap.evidence);
                  const sources = evidenceToSources(gap.evidence);
                  return (
                    <div key={gap.id} className={`card border-l-4 p-5 ${severityBorder(gap.severity)}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${severityDot(gap.severity)}`} />
                          <h3 className="text-sm font-semibold text-gray-900">{gap.title}</h3>
                        </div>
                        <span className={`badge ${severityColor(gap.severity)}`}>{gap.severity}</span>
                      </div>

                      {/* CoPlayground: UncertaintyFlag wraps low-confidence findings */}
                      <UncertaintyFlag
                        level={signal.level}
                        message={signal.level !== 'high' ? signal.explanation : undefined}
                      >
                        <p className="text-sm text-gray-700 mb-3">{gap.description}</p>
                      </UncertaintyFlag>

                      {/* CoPlayground: ConfidenceMeter */}
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1.5 font-medium">AI Confidence</p>
                        <ConfidenceMeter signal={signal} size="sm" showLabel showFactors />
                      </div>

                      {/* CoPlayground: SourceBadges for evidence */}
                      {sources.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1.5 font-medium">Evidence Sources</p>
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
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Conflicts */}
          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              {(analysis.conflicts || []).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No policy conflicts identified.</p>
              ) : (
                (analysis.conflicts || []).map((conflict) => {
                  const signal = scoreToSignal(conflict.confidence_score, 'Conflict', conflict.evidence);
                  const sources = evidenceToSources(conflict.evidence);
                  return (
                    <div key={conflict.id} className={`card border-l-4 p-5 ${severityBorder(conflict.severity)}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${severityDot(conflict.severity)}`} />
                          <h3 className="text-sm font-semibold text-gray-900">{conflict.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`badge ${severityColor(conflict.severity)}`}>{conflict.severity}</span>
                          {conflict.conflict_type && (
                            <span className="badge bg-gray-50 text-gray-600 border-gray-200">{conflict.conflict_type}</span>
                          )}
                        </div>
                      </div>

                      <UncertaintyFlag
                        level={signal.level}
                        message={signal.level !== 'high' ? signal.explanation : undefined}
                      >
                        <p className="text-sm text-gray-700 mb-3">{conflict.description}</p>
                      </UncertaintyFlag>

                      {/* CoPlayground: ConfidenceMeter */}
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1.5 font-medium">AI Confidence</p>
                        <ConfidenceMeter signal={signal} size="sm" showLabel showFactors />
                      </div>

                      {/* CoPlayground: SourceBadges */}
                      {sources.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1.5 font-medium">Evidence Sources</p>
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
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Recommendations */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {(analysis.recommendations || []).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No recommendations generated.</p>
              ) : (
                (analysis.recommendations || []).map((rec) => {
                  const signal = scoreToSignal(rec.confidence_score, 'Recommendation');
                  return (
                    <div key={rec.id} className={`card border-l-4 p-5 ${severityBorder(rec.priority)}`}>
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">{rec.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`badge ${severityColor(rec.priority)}`}>{rec.priority}</span>
                          <span className="badge bg-gray-50 text-gray-600 border-gray-200">{rec.category}</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">{rec.description}</p>

                      {/* CoPlayground: ConfidenceMeter on recommendations */}
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1.5 font-medium">AI Confidence</p>
                        <ConfidenceMeter signal={signal} size="sm" showLabel />
                      </div>

                      {rec.estimated_impact && (
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Expected Impact:</span> {rec.estimated_impact}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function severityBorder(severity: string): string {
  switch (severity) {
    case 'critical': return 'border-l-red-500';
    case 'high': return 'border-l-orange-500';
    case 'medium': return 'border-l-amber-500';
    case 'low': return 'border-l-green-500';
    default: return 'border-l-gray-300';
  }
}
