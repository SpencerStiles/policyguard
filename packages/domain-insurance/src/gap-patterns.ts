import type { DomainGapPattern } from './types.js';

/**
 * Known coverage gap patterns in commercial insurance programs.
 *
 * Each pattern describes a scenario where protection is missing or
 * insufficient, along with detection hints and recommended remediation.
 */
export const INSURANCE_GAP_PATTERNS: DomainGapPattern[] = [
  {
    id: 'no-cyber-liability',
    name: 'Missing Cyber Liability Coverage',
    severity: 'critical',
    description:
      'The insured has no standalone cyber liability policy or cyber endorsement. Any business that stores, processes, or transmits personal data, protected health information, or financial records is exposed to breach response costs, regulatory fines, business interruption from cyber events, and third-party liability claims.',
    affectedCoverageTypes: ['cyber-liability'],
    industrySegments: ['technology-saas', 'healthcare-provider', 'financial-services', 'retail-ecommerce'],
    detectionHint: 'Search for any policy with coverage_type containing "cyber", "data breach", or "network security". If none found, flag this gap.',
    recommendedAction: 'Obtain a standalone cyber liability policy with minimum $1M limit. Ensure it includes first-party breach response, business interruption, social engineering fraud, and regulatory defense costs.',
  },
  {
    id: 'inadequate-umbrella-limits',
    name: 'Umbrella/Excess Limits Below Industry Standard',
    severity: 'high',
    description:
      'The umbrella or excess liability limits are below the typical threshold for the insured\'s industry and revenue size. Catastrophic claims — especially in auto, general liability, and employers liability — can easily exceed primary limits.',
    affectedCoverageTypes: ['umbrella-excess'],
    industrySegments: ['construction-general', 'manufacturing', 'transportation', 'hospitality'],
    detectionHint: 'Compare umbrella/excess limit against industry profile\'s recommended limit. Flag if current limit is less than 50% of recommended.',
    recommendedAction: 'Increase umbrella/excess limits to at least the industry-recommended level. Consider layered excess programs for high-hazard classes.',
  },
  {
    id: 'no-epli',
    name: 'Missing Employment Practices Liability',
    severity: 'high',
    description:
      'The insured has employees but no EPLI coverage. Employment-related claims (discrimination, harassment, wrongful termination) are among the most frequent and expensive lawsuits faced by businesses of all sizes. CGL policies explicitly exclude employment-related claims.',
    affectedCoverageTypes: ['epli'],
    industrySegments: ['technology-saas', 'healthcare-provider', 'professional-services', 'retail-ecommerce'],
    detectionHint: 'If insured has employees (check for workers compensation policy as proxy) but no EPLI policy or management liability package with EPLI, flag this gap.',
    recommendedAction: 'Obtain EPLI coverage, either standalone or as part of a management liability package. Ensure third-party coverage is included for customer-facing businesses.',
  },
  {
    id: 'no-professional-liability',
    name: 'Missing Professional Liability / E&O',
    severity: 'critical',
    description:
      'The insured provides professional services, advice, or technology solutions but has no professional liability or errors & omissions coverage. CGL policies exclude professional services claims. Any allegation of negligent advice, design error, or software failure could result in uninsured losses.',
    affectedCoverageTypes: ['professional-liability'],
    industrySegments: ['technology-saas', 'professional-services', 'consulting'],
    detectionHint: 'If insured\'s business description includes "consulting", "advisory", "technology", "software", "design", or "professional services" but no E&O or professional liability policy exists, flag this gap.',
    recommendedAction: 'Obtain professional liability / E&O coverage with limits appropriate to contract requirements and revenue. Ensure the retroactive date covers the full period of professional services rendered.',
  },
  {
    id: 'property-underinsurance',
    name: 'Property Coverage Below Replacement Cost',
    severity: 'high',
    description:
      'The insured property values listed on the policy appear to be significantly below current replacement cost, exposing the insured to coinsurance penalties and inadequate loss recovery. Construction costs and property values have increased substantially, and many policies have not been updated.',
    affectedCoverageTypes: ['commercial-property'],
    industrySegments: ['manufacturing', 'retail-ecommerce', 'hospitality', 'construction-general'],
    detectionHint: 'Compare declared building and BPP values against industry benchmarks per square foot. Flag if values are more than 20% below expected replacement cost.',
    recommendedAction: 'Obtain a current property appraisal and update insured values. Consider agreed amount endorsement to waive coinsurance. Review annually.',
  },
  {
    id: 'no-business-interruption',
    name: 'Missing or Inadequate Business Interruption Coverage',
    severity: 'high',
    description:
      'The insured has property coverage but no business interruption / business income coverage, or the limits are insufficient to cover the period of restoration after a major loss. Many businesses that survive the physical damage of a loss still fail because they cannot cover continuing expenses during rebuilding.',
    affectedCoverageTypes: ['business-interruption'],
    industrySegments: ['manufacturing', 'retail-ecommerce', 'hospitality', 'restaurant'],
    detectionHint: 'Check if commercial property policy or BOP includes business income coverage. If absent or if limit is less than 6 months of projected revenue, flag this gap.',
    recommendedAction: 'Add business income coverage with extended period of indemnity. Limit should cover at minimum 12 months of projected gross earnings. Include contingent business interruption for key suppliers.',
  },
  {
    id: 'no-directors-officers',
    name: 'Missing D&O Coverage',
    severity: 'high',
    description:
      'The insured has a board of directors, outside investors, or is a publicly traded entity but carries no directors & officers liability coverage. Directors and officers face personal liability for alleged mismanagement, breach of fiduciary duty, and securities violations.',
    affectedCoverageTypes: ['directors-officers'],
    industrySegments: ['technology-saas', 'financial-services', 'nonprofit'],
    detectionHint: 'If insured has a corporate structure with a board of directors or has taken investment capital but no D&O policy exists, flag this gap.',
    recommendedAction: 'Obtain D&O coverage with all three sides (A, B, C). Ensure Side A is standalone or DIC for maximum protection of individual directors.',
  },
  {
    id: 'workers-comp-gap',
    name: 'Workers Compensation Non-Compliance',
    severity: 'critical',
    description:
      'The insured has employees in states that require workers compensation coverage but either has no policy or the policy does not list all states where employees work. Failure to carry required workers compensation coverage is a criminal offense in most states and exposes the employer to unlimited personal liability.',
    affectedCoverageTypes: ['workers-compensation'],
    industrySegments: ['construction-general', 'manufacturing', 'hospitality', 'restaurant'],
    detectionHint: 'Check if insured has employees and verify workers compensation policy exists with all applicable state endorsements. Flag if missing or if "other states" endorsement (3A) does not include all operating states.',
    recommendedAction: 'Obtain or update workers compensation policy to include all states where employees work. Add "other states" endorsement for expansion. Verify compliance with monopolistic state fund requirements where applicable.',
  },
  {
    id: 'auto-hired-nonowned-gap',
    name: 'Missing Hired & Non-Owned Auto Coverage',
    severity: 'medium',
    description:
      'The insured\'s employees use personal vehicles or rental cars for business purposes, but the commercial auto policy does not include hired and non-owned auto coverage (symbols 8 and 9). The insured is vicariously liable for accidents involving vehicles used on its behalf.',
    affectedCoverageTypes: ['commercial-auto'],
    industrySegments: ['professional-services', 'technology-saas', 'consulting', 'real-estate'],
    detectionHint: 'If insured\'s business involves employee travel or deliveries, check commercial auto policy for symbols 8 (hired) and 9 (non-owned). Also check CGL for hired/non-owned auto endorsement. Flag if neither exists.',
    recommendedAction: 'Add hired and non-owned auto liability coverage via the commercial auto policy or as an endorsement to the CGL/BOP.',
  },
  {
    id: 'claims-made-gap-coverage',
    name: 'Claims-Made Policy Without Tail Coverage',
    severity: 'high',
    description:
      'A claims-made policy (professional liability, cyber, D&O, or EPLI) is being replaced or non-renewed without an extended reporting period (tail) endorsement. Claims arising from acts during the policy period but reported after expiration will be uninsured.',
    affectedCoverageTypes: ['professional-liability', 'cyber-liability', 'directors-officers', 'epli'],
    industrySegments: ['technology-saas', 'professional-services', 'healthcare-provider', 'financial-services'],
    detectionHint: 'If a claims-made policy has been cancelled or non-renewed, check for extended reporting period endorsement or verify replacement policy has full prior acts coverage with matching retroactive date.',
    recommendedAction: 'Purchase extended reporting period (tail) endorsement on the expiring policy, or ensure the replacement policy provides full prior acts coverage with a retroactive date matching or preceding the original policy inception.',
  },
];
