/**
 * Generic domain types for PolicyGuard industry packages.
 *
 * These interfaces define the contract that any industry-specific domain
 * package must implement. The insurance package is the reference
 * implementation; future packages (e.g., domain-healthcare, domain-finserv)
 * should export data conforming to these same shapes.
 */

// ---------------------------------------------------------------------------
// Coverage / Protection Types
// ---------------------------------------------------------------------------

/**
 * Represents a category of coverage or protection within the domain.
 * In insurance this maps to a line of business or policy type.
 * In other industries it could represent compliance controls, security
 * measures, or service-level guarantees.
 */
export interface DomainCoverageType {
  /** Unique, machine-readable identifier (e.g. "cgl", "cyber-liability"). */
  id: string;

  /** Human-readable display name. */
  name: string;

  /**
   * Broad grouping for the coverage type.
   * Insurance examples: "liability", "property", "specialty".
   */
  category: string;

  /** Detailed professional description of what this coverage type protects. */
  description: string;

  /**
   * Typical monetary limits observed in the market.
   * Values are in USD for insurance; other domains may use different units.
   */
  commonLimits: {
    /** Lowest limit commonly seen in practice. */
    min: number;
    /** Most frequently selected limit. */
    typical: number;
    /** Best-practice / recommended limit for adequate protection. */
    recommended: number;
  };

  /**
   * Identifiers of regulations, contracts, or standards that mandate
   * this coverage type.  References DomainRegulation.id values.
   */
  requiredBy?: string[];

  /**
   * IDs of other DomainCoverageType entries that are frequently bundled,
   * coordinated with, or complementary to this one.
   */
  relatedTypes: string[];
}

// ---------------------------------------------------------------------------
// Gap Patterns
// ---------------------------------------------------------------------------

/**
 * A known pattern where protection is missing or insufficient.
 * Gap detection is one of the core value propositions of PolicyGuard.
 */
export interface DomainGapPattern {
  /** Unique identifier (e.g. "no-cyber-liability"). */
  id: string;

  /** Short, descriptive name. */
  name: string;

  /** How critical this gap is when detected. */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** Professional explanation of the gap and its potential consequences. */
  description: string;

  /** IDs of DomainCoverageType entries affected by this gap. */
  affectedCoverageTypes: string[];

  /**
   * Industry segments or business profiles where this gap is most
   * commonly observed.  References DomainProfile.id values.
   */
  industrySegments: string[];

  /**
   * A human-readable hint (or machine-parsable rule stub) describing
   * how to detect this gap in a set of policies.
   */
  detectionHint: string;

  /** Recommended remediation action. */
  recommendedAction: string;
}

// ---------------------------------------------------------------------------
// Conflict Patterns
// ---------------------------------------------------------------------------

/**
 * A known pattern where two or more policies or provisions create
 * ambiguity, overlap, or outright contradiction.
 */
export interface DomainConflictPattern {
  /** Unique identifier. */
  id: string;

  /** Short, descriptive name. */
  name: string;

  /** How severe the conflict is when detected. */
  severity: 'critical' | 'high' | 'medium';

  /** Professional explanation of the conflict and its impact. */
  description: string;

  /**
   * Classification of the conflict.
   * Examples: "overlap", "contradiction", "coordination", "exclusion-gap".
   */
  conflictType: string;

  /**
   * A human-readable rule or heuristic for detecting this conflict
   * across a set of policies.
   */
  detectionRule: string;

  /** Recommended steps to resolve the conflict. */
  resolution: string;
}

// ---------------------------------------------------------------------------
// Regulatory Requirements
// ---------------------------------------------------------------------------

/**
 * A regulation, statute, or contractual standard that mandates certain
 * coverages or minimum limits.
 */
export interface DomainRegulation {
  /** Unique identifier (e.g. "ca-workers-comp"). */
  id: string;

  /**
   * Jurisdiction or scope.
   * Examples: "California", "Federal", "EU", "Industry:Healthcare".
   */
  jurisdiction: string;

  /** Official or commonly used name of the regulation. */
  name: string;

  /** Summary of the regulation's requirements. */
  description: string;

  /** Specific coverages mandated by this regulation. */
  requiredCoverages: {
    /** References DomainCoverageType.id. */
    coverageTypeId: string;
    /** Minimum limit required, if specified by the regulation. */
    minimumLimit?: number;
  }[];

  /** Date the regulation became or becomes effective (ISO 8601). */
  effectiveDate: string;

  /** Citation, URL, or reference to the authoritative source. */
  source: string;
}

// ---------------------------------------------------------------------------
// Industry / Business Profiles
// ---------------------------------------------------------------------------

/**
 * A profile representing a class of business or industry segment.
 * Used to surface relevant gaps, recommend coverages, and tailor analysis.
 */
export interface DomainProfile {
  /** Unique identifier (e.g. "technology-saas"). */
  id: string;

  /** Human-readable name. */
  name: string;

  /** Description of the industry segment and its risk landscape. */
  description: string;

  /**
   * IDs of DomainCoverageType entries that are typically needed
   * by businesses in this segment.
   */
  typicalCoverages: string[];

  /**
   * Key risk factors or exposures characteristic of this segment.
   */
  riskFactors: string[];
}

// ---------------------------------------------------------------------------
// Aggregate Domain Package Interface
// ---------------------------------------------------------------------------

/**
 * The shape of a complete domain knowledge package.
 * Every industry package should default-export an object conforming to
 * this interface (or export the individual arrays separately).
 */
export interface DomainKnowledgePackage {
  coverageTypes: DomainCoverageType[];
  gapPatterns: DomainGapPattern[];
  conflictPatterns: DomainConflictPattern[];
  regulations: DomainRegulation[];
  industryProfiles: DomainProfile[];
}
