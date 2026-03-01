/**
 * Bridge utilities that convert PolicyGuard API types into
 * @coplayground/core types for rendering with CoPlayground components.
 */
import type { ConfidenceSignal, ConfidenceLevel, ConfidenceFactor, SourceReference } from '@coplayground/core';

/**
 * Convert a raw 0-1 confidence score into a full ConfidenceSignal
 * suitable for the ConfidenceMeter and UncertaintyFlag components.
 */
export function scoreToSignal(
  score: number,
  label: string = 'AI Analysis',
  evidence?: string | null,
): ConfidenceSignal {
  const clamped = Math.max(0, Math.min(1, score));

  const level: ConfidenceLevel =
    clamped >= 0.85 ? 'high' :
    clamped >= 0.6  ? 'medium' :
    clamped >= 0.3  ? 'low' :
    'uncertain';

  const factors: ConfidenceFactor[] = [
    {
      name: 'Extraction Confidence',
      score: clamped,
      weight: 0.6,
      evidence: `AI confidence in the accuracy of this ${label.toLowerCase()} finding`,
      source: 'model_analysis',
    },
    {
      name: 'Evidence Strength',
      score: evidence ? Math.min(1, clamped + 0.1) : clamped * 0.7,
      weight: 0.4,
      evidence: evidence
        ? 'Finding is supported by extracted policy text'
        : 'Finding based on domain knowledge patterns without direct text evidence',
      source: 'rag_retrieval',
    },
  ];

  const sources: SourceReference[] = evidenceToSources(evidence);

  const explanations: Record<ConfidenceLevel, string> = {
    high: `The AI has high confidence (${Math.round(clamped * 100)}%) in this finding based on clear textual evidence in the policy documents.`,
    medium: `The AI has moderate confidence (${Math.round(clamped * 100)}%) in this finding. Some aspects may require human verification.`,
    low: `The AI has low confidence (${Math.round(clamped * 100)}%) in this finding. Manual review is strongly recommended.`,
    uncertain: `The AI is uncertain (${Math.round(clamped * 100)}%) about this finding. It may be based on incomplete data or ambiguous policy language.`,
  };

  return {
    overall: clamped,
    level,
    factors,
    sources,
    explanation: explanations[level],
  };
}

/**
 * Parse an evidence string (may be a JSON array or plain text) into
 * an array of SourceReference objects for SourceBadge components.
 */
export function evidenceToSources(evidence?: string | null): SourceReference[] {
  if (!evidence) return [];

  // Try to parse as JSON array of strings or objects
  try {
    const parsed = JSON.parse(evidence);

    if (Array.isArray(parsed)) {
      return parsed.map((item, idx) => {
        const text = typeof item === 'string' ? item : JSON.stringify(item);
        const pageMatch = text.match(/page[s]?\s*(\d+)/i);
        return {
          id: `src-${idx + 1}`,
          title: `Policy Document`,
          type: 'document' as const,
          location: pageMatch ? `Page ${pageMatch[1]}` : undefined,
          relevanceScore: 0.85,
          excerpt: text.length > 200 ? text.slice(0, 200) + '…' : text,
        };
      });
    }

    if (typeof parsed === 'object' && parsed !== null) {
      return [{
        id: 'src-1',
        title: (parsed as { source?: string }).source ?? 'Policy Document',
        type: 'document' as const,
        relevanceScore: 0.85,
        excerpt: (parsed as { text?: string }).text ?? JSON.stringify(parsed),
      }];
    }
  } catch {
    // Not JSON — treat as plain text evidence
  }

  return [{
    id: 'src-1',
    title: 'Policy Document',
    type: 'document' as const,
    relevanceScore: 0.8,
    excerpt: evidence.length > 200 ? evidence.slice(0, 200) + '…' : evidence,
  }];
}

/**
 * Return a short human-readable label for a confidence level.
 */
export function confidenceLevelLabel(level: ConfidenceLevel): string {
  const labels: Record<ConfidenceLevel, string> = {
    high: 'High Confidence',
    medium: 'Moderate Confidence',
    low: 'Low Confidence',
    uncertain: 'Uncertain',
  };
  return labels[level];
}
