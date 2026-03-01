/**
 * Explanation and reasoning-trace types for transparent AI collaboration.
 *
 * These types capture the step-by-step reasoning an AI system follows,
 * including alternative conclusions and counterfactual analysis, enabling
 * humans to audit and understand AI-generated outputs.
 */

import type { ConfidenceSignal, SourceReference } from '../confidence/types.js';

/**
 * A single step in a reasoning trace.
 *
 * Steps can be nested to represent sub-arguments or branching logic.
 */
export interface ReasoningStep {
  /** Unique identifier for this step. */
  id: string;
  /** Human-readable description of what this step concludes or asserts. */
  description: string;
  /** Optional evidence backing this step. */
  evidence?: SourceReference[];
  /** Confidence in this individual step (0-1). */
  confidence: number;
  /** Optional child steps that decompose this step further. */
  children?: ReasoningStep[];
}

/**
 * A complete reasoning trace from question to conclusion, including
 * the chain of steps, overall confidence, and alternative conclusions
 * that were considered but not selected.
 */
export interface ReasoningTrace {
  /** Unique identifier for this trace. */
  id: string;
  /** The question or task that initiated this reasoning. */
  question: string;
  /** Ordered sequence of reasoning steps. */
  steps: ReasoningStep[];
  /** The final conclusion reached by the reasoning process. */
  conclusion: string;
  /** Aggregated confidence signal for the entire trace. */
  overallConfidence: ConfidenceSignal;
  /**
   * Alternative conclusions that were considered, each with its own
   * confidence estimate and an explanation of why it was not chosen.
   */
  alternatives?: {
    conclusion: string;
    confidence: number;
    whyNot: string;
  }[];
}

/**
 * A counterfactual scenario describing how a different input condition
 * would have changed the conclusion.
 */
export interface Counterfactual {
  /** The hypothetical condition that differs from reality. */
  condition: string;
  /** The conclusion that would follow under this condition. */
  alternativeConclusion: string;
  /** How significantly this counterfactual changes the outcome. */
  impact: 'major' | 'minor' | 'negligible';
}

/**
 * A piece of evidence drawn from a specific source, annotated with
 * its relevance and whether it supports or contradicts the conclusion.
 */
export interface EvidenceItem {
  /** The source this evidence is drawn from. */
  source: SourceReference;
  /** Short excerpt or summary of the evidence. */
  excerpt: string;
  /** How relevant this evidence is to the question at hand (0-1). */
  relevance: number;
  /** Whether this evidence supports, contradicts, or is neutral to the conclusion. */
  supports: 'for' | 'against' | 'neutral';
}
