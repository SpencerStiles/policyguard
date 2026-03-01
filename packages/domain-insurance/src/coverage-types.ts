import type { DomainCoverageType } from './types.js';

/**
 * Insurance industry coverage types (lines of business).
 *
 * Each entry represents a distinct policy type or coverage form commonly
 * encountered in commercial insurance programs.  Limits are expressed in
 * USD and reflect typical U.S. market ranges as of 2024-2025.
 */
export const INSURANCE_COVERAGE_TYPES: DomainCoverageType[] = [
  // -----------------------------------------------------------------------
  // Liability
  // -----------------------------------------------------------------------
  {
    id: 'cgl',
    name: 'Commercial General Liability (CGL)',
    category: 'liability',
    description:
      'Provides coverage for third-party bodily injury, property damage, personal injury, and advertising injury arising out of the insured\'s premises, operations, products, and completed operations. Typically written on ISO form CG 00 01 and serves as the foundation of most commercial insurance programs. Includes coverage for defense costs, which are paid in addition to the policy limits under standard occurrence forms.',
    commonLimits: {
      min: 500_000,
      typical: 1_000_000,
      recommended: 2_000_000,
    },
    requiredBy: ['tx-cgl-requirements'],
    relatedTypes: ['umbrella-excess', 'product-liability', 'commercial-auto'],
  },
  {
    id: 'commercial-property',
    name: 'Commercial Property',
    category: 'property',
    description:
      'Covers direct physical loss or damage to buildings, business personal property, tenant improvements, and in some cases property of others in the insured\'s care, custody, or control. Policies may be written on a named-peril or special (open-peril) basis. Valuation methods include replacement cost, actual cash value, or agreed amount. Sub-limits often apply to specific perils such as wind/hail, earthquake, flood, and equipment breakdown.',
    commonLimits: {
      min: 250_000,
      typical: 1_000_000,
      recommended: 5_000_000,
    },
    requiredBy: ['fl-property-requirements'],
    relatedTypes: ['business-interruption', 'inland-marine', 'equipment-breakdown'],
  },
  {
    id: 'bop',
    name: 'Business Owners Policy (BOP)',
    category: 'package',
    description:
      'A bundled policy combining commercial property and general liability coverages into a single form, typically available to small-to-medium businesses that meet specific eligibility criteria (e.g., revenue, square footage, employee count). BOPs often include business interruption coverage and may offer optional endorsements for cyber, hired/non-owned auto, and employment practices liability. They provide cost efficiency but may carry lower sub-limits than standalone policies.',
    commonLimits: {
      min: 300_000,
      typical: 1_000_000,
      recommended: 2_000_000,
    },
    relatedTypes: ['cgl', 'commercial-property', 'business-interruption'],
  },
  {
    id: 'professional-liability',
    name: 'Professional Liability / Errors & Omissions (E&O)',
    category: 'liability',
    description:
      'Provides coverage for claims alleging negligent acts, errors, or omissions in the performance of professional services. Written on a claims-made basis with a retroactive date that establishes the earliest date from which covered acts may arise. Essential for firms providing advice, design, consulting, technology, or other professional services. Defense costs are typically included within the policy limit, eroding available indemnity.',
    commonLimits: {
      min: 250_000,
      typical: 1_000_000,
      recommended: 5_000_000,
    },
    relatedTypes: ['cyber-liability', 'cgl', 'directors-officers'],
  },
  {
    id: 'directors-officers',
    name: 'Directors & Officers Liability (D&O)',
    category: 'management-liability',
    description:
      'Protects the personal assets of corporate directors and officers, and reimburses the organization for indemnification payments made on their behalf, when they are sued for alleged wrongful acts in their capacity as leaders. Side A covers individual directors/officers when the company cannot indemnify; Side B reimburses the entity; Side C (entity coverage) covers securities claims against the company itself. Critical for any organization with a board of directors or outside investors.',
    commonLimits: {
      min: 1_000_000,
      typical: 5_000_000,
      recommended: 10_000_000,
    },
    relatedTypes: ['epli', 'fiduciary-liability', 'professional-liability'],
  },
  {
    id: 'epli',
    name: 'Employment Practices Liability (EPLI)',
    category: 'management-liability',
    description:
      'Covers claims brought by employees, former employees, or applicants alleging wrongful employment practices including discrimination, harassment, wrongful termination, retaliation, failure to promote, and wage-and-hour disputes. Written on a claims-made basis. Defense costs are typically within limits. Third-party coverage (claims by customers or vendors alleging discriminatory treatment) is available by endorsement and increasingly important for customer-facing businesses.',
    commonLimits: {
      min: 250_000,
      typical: 1_000_000,
      recommended: 3_000_000,
    },
    relatedTypes: ['directors-officers', 'cgl', 'workers-compensation'],
  },
  {
    id: 'cyber-liability',
    name: 'Cyber Liability',
    category: 'specialty',
    description:
      'Provides first-party and third-party coverage for losses arising from data breaches, network security failures, cyber extortion, business interruption caused by cyber events, and regulatory proceedings. First-party insuring agreements typically include breach response costs (forensics, notification, credit monitoring, crisis management), data restoration, and cyber-related business income loss. Third-party coverage responds to claims alleging failure to protect personal or confidential information. Many policies also cover social engineering fraud and funds transfer fraud.',
    commonLimits: {
      min: 500_000,
      typical: 2_000_000,
      recommended: 5_000_000,
    },
    requiredBy: ['state-cyber-notification'],
    relatedTypes: ['professional-liability', 'crime-fidelity', 'business-interruption'],
  },
  {
    id: 'workers-compensation',
    name: 'Workers Compensation',
    category: 'statutory',
    description:
      'Statutory coverage providing medical benefits, wage replacement, rehabilitation, and death benefits to employees who suffer work-related injuries or illnesses. Part A (workers compensation) pays benefits as required by the applicable state statute with no policy limit. Part B (employers liability) covers the employer against common-law suits by employees and is subject to per-occurrence, per-disease per-employee, and aggregate disease limits. Coverage must be compliant with the laws of every state in which the insured has employees.',
    commonLimits: {
      min: 100_000,
      typical: 500_000,
      recommended: 1_000_000,
    },
    requiredBy: ['ca-workers-comp', 'multi-state-employers-liability'],
    relatedTypes: ['epli', 'umbrella-excess', 'commercial-auto'],
  },
  {
    id: 'commercial-auto',
    name: 'Commercial Auto',
    category: 'liability',
    description:
      'Covers liability arising from the ownership, maintenance, or use of vehicles owned, hired, or used on behalf of the insured business. Includes auto liability (bodily injury and property damage to third parties), physical damage (comprehensive and collision for owned vehicles), medical payments, uninsured/underinsured motorist coverage, and hired/non-owned auto liability. The symbol system (symbols 1-19) determines which vehicles are covered under each insuring agreement.',
    commonLimits: {
      min: 500_000,
      typical: 1_000_000,
      recommended: 2_000_000,
    },
    requiredBy: ['ny-commercial-auto'],
    relatedTypes: ['cgl', 'umbrella-excess', 'workers-compensation'],
  },
  {
    id: 'umbrella-excess',
    name: 'Umbrella / Excess Liability',
    category: 'liability',
    description:
      'Provides additional limits of liability above the insured\'s underlying policies (CGL, auto, employers liability). A true umbrella policy may also "drop down" to provide primary coverage for claims not covered by the underlying policies, subject to a self-insured retention. An excess policy sits directly over the underlying limits on a follow-form or specified-form basis without drop-down provisions. Critical for catastrophic loss protection and frequently required by contracts and landlords.',
    commonLimits: {
      min: 1_000_000,
      typical: 5_000_000,
      recommended: 10_000_000,
    },
    relatedTypes: ['cgl', 'commercial-auto', 'workers-compensation'],
  },
  {
    id: 'business-interruption',
    name: 'Business Interruption / Business Income',
    category: 'property',
    description:
      'Covers the loss of business income (net profit plus continuing operating expenses) and extra expense incurred when a covered physical loss or damage to insured property causes a necessary suspension of operations. Coverage is typically provided as part of the commercial property policy or BOP. Key provisions include the period of restoration, extended period of indemnity, and ordinary payroll limitations. Contingent business interruption extends coverage to losses caused by damage to a dependent property (supplier or customer).',
    commonLimits: {
      min: 100_000,
      typical: 500_000,
      recommended: 2_000_000,
    },
    relatedTypes: ['commercial-property', 'cyber-liability', 'bop'],
  },
  {
    id: 'product-liability',
    name: 'Product Liability',
    category: 'liability',
    description:
      'Covers claims alleging bodily injury or property damage caused by the insured\'s products after they leave the insured\'s premises or are completed (products-completed operations hazard). While CGL policies include products-completed operations coverage, standalone product liability policies or manuscripted endorsements are often necessary for manufacturers, distributors, and importers with significant product exposure. Key considerations include the aggregate limit for products, recall expense coverage, and vendor/additional insured requirements from retail partners.',
    commonLimits: {
      min: 500_000,
      typical: 2_000_000,
      recommended: 5_000_000,
    },
    relatedTypes: ['cgl', 'umbrella-excess', 'commercial-property'],
  },
];
