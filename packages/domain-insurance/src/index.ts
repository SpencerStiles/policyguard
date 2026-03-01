export type {
  DomainCoverageType,
  DomainGapPattern,
  DomainConflictPattern,
  DomainRegulation,
  DomainProfile,
  DomainKnowledgePackage,
} from './types.js';

export { INSURANCE_COVERAGE_TYPES } from './coverage-types.js';
export { INSURANCE_GAP_PATTERNS } from './gap-patterns.js';
export { INSURANCE_CONFLICT_PATTERNS } from './conflict-patterns.js';
export { INSURANCE_REGULATIONS } from './regulations.js';
export { INSURANCE_INDUSTRY_PROFILES } from './industry-profiles.js';

import type { DomainKnowledgePackage } from './types.js';
import { INSURANCE_COVERAGE_TYPES } from './coverage-types.js';
import { INSURANCE_GAP_PATTERNS } from './gap-patterns.js';
import { INSURANCE_CONFLICT_PATTERNS } from './conflict-patterns.js';
import { INSURANCE_REGULATIONS } from './regulations.js';
import { INSURANCE_INDUSTRY_PROFILES } from './industry-profiles.js';

/**
 * Complete insurance domain knowledge package.
 * Import this as the single source of truth for insurance-specific
 * coverage types, gap patterns, conflict patterns, regulations, and
 * industry profiles.
 */
export const insuranceDomain: DomainKnowledgePackage = {
  coverageTypes: INSURANCE_COVERAGE_TYPES,
  gapPatterns: INSURANCE_GAP_PATTERNS,
  conflictPatterns: INSURANCE_CONFLICT_PATTERNS,
  regulations: INSURANCE_REGULATIONS,
  industryProfiles: INSURANCE_INDUSTRY_PROFILES,
};
