/**
 * Confidence scoring types for AI collaboration.
 *
 * These types model multi-factor confidence signals that allow both humans
 * and AI systems to express and reason about certainty levels in a
 * calibrated, evidence-backed way.
 */

/** Discrete confidence tier derived from the continuous 0-1 score. */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'uncertain';

/**
 * A single factor contributing to an overall confidence assessment.
 *
 * Each factor captures one dimension of certainty (e.g. "source quality",
 * "data recency", "domain expertise") along with its score, relative
 * weight, and supporting evidence.
 */
export interface ConfidenceFactor {
  /** Human-readable name of this factor (e.g. "source_quality"). */
  name: string;
  /** Continuous score in [0, 1] where 1 is maximum confidence. */
  score: number;
  /** Relative weight of this factor in [0, 1] during aggregation. */
  weight: number;
  /** Free-text evidence justifying the assigned score. */
  evidence: string;
  /** Optional origin of the evidence (model name, document id, etc.). */
  source?: string;
}

/**
 * Historical calibration data point that tracks how well predicted
 * confidence values matched observed outcomes.
 */
export interface CalibrationData {
  /** The confidence value that was predicted (0-1). */
  predicted: number;
  /** The observed accuracy / outcome rate (0-1). */
  actual: number;
  /** Number of observations backing this data point. */
  sampleSize: number;
  /** Domain or task category this calibration applies to. */
  domain: string;
}

/**
 * A composite confidence signal combining multiple factors, optional
 * calibration data, and provenance information.
 */
export interface ConfidenceSignal {
  /** Aggregated confidence score in [0, 1]. */
  overall: number;
  /** Discrete confidence level derived from `overall`. */
  level: ConfidenceLevel;
  /** Individual factors that were aggregated. */
  factors: ConfidenceFactor[];
  /** Optional calibration data for this signal. */
  calibration?: CalibrationData;
  /** References to the sources backing this signal. */
  sources: SourceReference[];
  /** Human-readable explanation of the confidence assessment. */
  explanation: string;
}

/**
 * A reference to a source of information that supports a confidence
 * assessment or piece of evidence.
 */
export interface SourceReference {
  /** Unique identifier for this source reference. */
  id: string;
  /** Display title or name of the source. */
  title: string;
  /** Category of source. */
  type: 'document' | 'database' | 'api' | 'model_knowledge' | 'user_input';
  /** Location within the source (page number, URL, line range, etc.). */
  location?: string;
  /** How relevant this source is to the current context (0-1). */
  relevanceScore: number;
  /** Short excerpt from the source that is most pertinent. */
  excerpt?: string;
}
