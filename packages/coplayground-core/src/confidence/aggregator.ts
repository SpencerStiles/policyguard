/**
 * Confidence aggregation engine.
 *
 * Combines multiple {@link ConfidenceFactor}s into a single
 * {@link ConfidenceSignal} using weighted averaging, and provides
 * utilities for immutably extending signals, sorting, and converting
 * source-quality data into factors.
 */

import type {
  ConfidenceFactor,
  ConfidenceLevel,
  ConfidenceSignal,
  SourceReference,
} from './types.js';

/** Thresholds for mapping a continuous score to a discrete level. */
const LEVEL_THRESHOLDS: { min: number; level: ConfidenceLevel }[] = [
  { min: 0.85, level: 'high' },
  { min: 0.6, level: 'medium' },
  { min: 0.3, level: 'low' },
  { min: 0, level: 'uncertain' },
];

/**
 * Determines the discrete {@link ConfidenceLevel} for a continuous score.
 */
function scoreToLevel(score: number): ConfidenceLevel {
  for (const { min, level } of LEVEL_THRESHOLDS) {
    if (score >= min) {
      return level;
    }
  }
  return 'uncertain';
}

/**
 * Builds a human-readable explanation string from a set of factors and
 * the resulting overall score.
 */
function buildExplanation(
  factors: ConfidenceFactor[],
  overall: number,
  level: ConfidenceLevel,
): string {
  if (factors.length === 0) {
    return 'No confidence factors available.';
  }

  const sorted = [...factors].sort((a, b) => b.weight * b.score - a.weight * a.score);
  const topFactor = sorted[0];
  const bottomFactor = sorted[sorted.length - 1];

  const parts: string[] = [
    `Overall confidence is ${(overall * 100).toFixed(1)}% (${level}).`,
  ];

  parts.push(
    `Strongest factor: "${topFactor.name}" scored ${(topFactor.score * 100).toFixed(0)}%` +
      ` (weight ${(topFactor.weight * 100).toFixed(0)}%) — ${topFactor.evidence}`,
  );

  if (factors.length > 1 && bottomFactor !== topFactor) {
    parts.push(
      `Weakest factor: "${bottomFactor.name}" scored ${(bottomFactor.score * 100).toFixed(0)}%` +
        ` (weight ${(bottomFactor.weight * 100).toFixed(0)}%) — ${bottomFactor.evidence}`,
    );
  }

  return parts.join(' ');
}

/**
 * Aggregates multiple confidence factors into composite signals.
 *
 * Supports optional per-factor weight overrides supplied at construction
 * time. When a factor name matches an override key the override weight
 * replaces the factor's intrinsic weight.
 */
export class ConfidenceAggregator {
  private readonly weightOverrides: Record<string, number>;

  /**
   * @param weights - Optional map of factor name to weight override.
   *   Values should be in [0, 1]. Any factor whose name matches a key
   *   in this map will use the override weight instead of its own.
   */
  constructor(weights?: Record<string, number>) {
    this.weightOverrides = weights ? { ...weights } : {};
  }

  /**
   * Aggregate an array of factors into a single confidence signal.
   *
   * Uses a weighted average: `sum(score_i * weight_i) / sum(weight_i)`.
   * If all weights are zero the overall score defaults to 0.
   */
  aggregate(factors: ConfidenceFactor[]): ConfidenceSignal {
    if (factors.length === 0) {
      return {
        overall: 0,
        level: 'uncertain',
        factors: [],
        sources: [],
        explanation: 'No confidence factors available.',
      };
    }

    let weightedSum = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      const effectiveWeight =
        this.weightOverrides[factor.name] ?? factor.weight;
      weightedSum += factor.score * effectiveWeight;
      totalWeight += effectiveWeight;
    }

    const overall = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const level = scoreToLevel(overall);
    const explanation = buildExplanation(factors, overall, level);

    return {
      overall,
      level,
      factors: [...factors],
      sources: [],
      explanation,
    };
  }

  /**
   * Immutably add a factor to an existing signal and recalculate.
   *
   * Returns a new {@link ConfidenceSignal}; the original is not mutated.
   */
  addFactor(
    signal: ConfidenceSignal,
    factor: ConfidenceFactor,
  ): ConfidenceSignal {
    const updatedFactors = [...signal.factors, factor];
    const recalculated = this.aggregate(updatedFactors);
    return {
      ...recalculated,
      sources: [...signal.sources],
      calibration: signal.calibration,
    };
  }

  /**
   * Comparator for sorting signals in descending confidence order.
   *
   * Returns a negative number if `a` should come before `b` (higher
   * confidence first), positive if after, or zero if equal.
   */
  compare(a: ConfidenceSignal, b: ConfidenceSignal): number {
    return b.overall - a.overall;
  }

  /**
   * Convert an array of source references into a single
   * {@link ConfidenceFactor} representing overall source quality.
   *
   * The score is the weighted average of each source's relevance score,
   * weighted by the source type's intrinsic reliability:
   *
   * - document: 0.9
   * - database: 0.85
   * - api: 0.8
   * - user_input: 0.7
   * - model_knowledge: 0.5
   */
  static fromSources(sources: SourceReference[]): ConfidenceFactor {
    if (sources.length === 0) {
      return {
        name: 'source_quality',
        score: 0,
        weight: 0.5,
        evidence: 'No sources provided.',
      };
    }

    const typeReliability: Record<SourceReference['type'], number> = {
      document: 0.9,
      database: 0.85,
      api: 0.8,
      user_input: 0.7,
      model_knowledge: 0.5,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const source of sources) {
      const reliability = typeReliability[source.type];
      weightedSum += source.relevanceScore * reliability;
      totalWeight += reliability;
    }

    const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

    const sourceDescriptions = sources
      .map((s) => `${s.title} (${s.type}, relevance ${(s.relevanceScore * 100).toFixed(0)}%)`)
      .join(', ');

    return {
      name: 'source_quality',
      score,
      weight: 0.5,
      evidence: `Based on ${sources.length} source(s): ${sourceDescriptions}.`,
    };
  }
}
