/**
 * Confidence calibration engine.
 *
 * Tracks historical predicted-vs-actual confidence outcomes and uses
 * them to adjust future confidence scores, correcting for systematic
 * over- or under-confidence.
 */

import type { CalibrationData } from './types.js';

/**
 * Records historical prediction accuracy and uses it to calibrate
 * future confidence scores.
 *
 * Calibration is tracked per-domain so that adjustments are scoped to
 * the type of task (e.g. "code_review" vs. "legal_analysis").
 */
export class ConfidenceCalibrator {
  /** Chronological history of calibration observations. */
  readonly history: CalibrationData[] = [];

  /**
   * Record a new observation pairing a predicted confidence with an
   * observed outcome.
   *
   * @param predicted - The confidence score that was predicted (0-1).
   * @param actual - The observed outcome (1 = correct, 0 = incorrect, or
   *   a continuous measure in [0, 1]).
   * @param domain - The task domain for this observation.
   */
  record(predicted: number, actual: number, domain: string): void {
    const existing = this.history.find((h) => h.domain === domain);

    if (existing) {
      // Incrementally update the running averages.
      const n = existing.sampleSize;
      existing.predicted = (existing.predicted * n + predicted) / (n + 1);
      existing.actual = (existing.actual * n + actual) / (n + 1);
      existing.sampleSize = n + 1;
    } else {
      this.history.push({
        predicted,
        actual,
        sampleSize: 1,
        domain,
      });
    }
  }

  /**
   * Retrieve the aggregated calibration data for a specific domain, or
   * across all domains if no domain is specified.
   *
   * @param domain - Optional domain to scope the query. When omitted the
   *   result spans all recorded domains.
   * @returns Aggregated {@link CalibrationData}. If no data exists the
   *   returned sample size is 0 and predicted/actual are both 0.
   */
  getCalibration(domain?: string): CalibrationData {
    const relevant =
      domain !== undefined
        ? this.history.filter((h) => h.domain === domain)
        : this.history;

    if (relevant.length === 0) {
      return {
        predicted: 0,
        actual: 0,
        sampleSize: 0,
        domain: domain ?? 'all',
      };
    }

    let totalSamples = 0;
    let weightedPredicted = 0;
    let weightedActual = 0;

    for (const entry of relevant) {
      totalSamples += entry.sampleSize;
      weightedPredicted += entry.predicted * entry.sampleSize;
      weightedActual += entry.actual * entry.sampleSize;
    }

    return {
      predicted: weightedPredicted / totalSamples,
      actual: weightedActual / totalSamples,
      sampleSize: totalSamples,
      domain: domain ?? 'all',
    };
  }

  /**
   * Adjust a raw confidence score using historical calibration data.
   *
   * The adjustment uses a simple linear correction:
   *
   *   adjusted = raw + (historicalActual - historicalPredicted) * correctionStrength
   *
   * where `correctionStrength` ramps up with sample size (capped at 1.0
   * after 50 observations) so that small samples do not cause wild swings.
   *
   * The result is clamped to [0, 1].
   *
   * @param raw - The unadjusted confidence score (0-1).
   * @param domain - Optional domain to scope calibration lookup.
   * @returns The calibrated confidence score (0-1).
   */
  adjustConfidence(raw: number, domain?: string): number {
    const cal = this.getCalibration(domain);

    if (cal.sampleSize === 0) {
      return raw;
    }

    // Ramp correction strength logarithmically, reaching ~1.0 at 50+ samples.
    const correctionStrength = Math.min(1, Math.log2(cal.sampleSize + 1) / Math.log2(51));

    const bias = cal.actual - cal.predicted;
    const adjusted = raw + bias * correctionStrength;

    return Math.max(0, Math.min(1, adjusted));
  }

  /**
   * Compute an overall reliability score for the calibrator's estimates.
   *
   * Reliability is based on two factors:
   * 1. How close historical predicted values are to actual values (accuracy).
   * 2. How many samples we have (confidence in the calibration itself).
   *
   * @returns A score in [0, 1] where 1 means perfectly calibrated with
   *   ample data.
   */
  getReliabilityScore(): number {
    if (this.history.length === 0) {
      return 0;
    }

    let totalSamples = 0;
    let weightedAbsError = 0;

    for (const entry of this.history) {
      const absError = Math.abs(entry.predicted - entry.actual);
      weightedAbsError += absError * entry.sampleSize;
      totalSamples += entry.sampleSize;
    }

    if (totalSamples === 0) {
      return 0;
    }

    // Accuracy component: 1 minus the weighted mean absolute error.
    const accuracy = 1 - weightedAbsError / totalSamples;

    // Sample-size component: ramps toward 1.0 as total samples grow.
    const sampleConfidence = Math.min(1, totalSamples / 100);

    // Geometric mean so both components must be high for a high score.
    return Math.sqrt(accuracy * sampleConfidence);
  }
}
