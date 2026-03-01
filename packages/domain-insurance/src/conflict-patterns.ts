import type { DomainConflictPattern } from './types.js';

/**
 * Known policy conflict patterns in commercial insurance programs.
 *
 * Each pattern describes a situation where two or more policies or provisions
 * create ambiguity, overlap, or contradiction, along with detection rules
 * and recommended resolutions.
 */
export const INSURANCE_CONFLICT_PATTERNS: DomainConflictPattern[] = [
  {
    id: 'cgl-professional-liability-overlap',
    name: 'CGL vs. Professional Liability Overlap',
    severity: 'high',
    description:
      'The CGL policy and professional liability policy may both attempt to respond to a claim involving bodily injury or property damage arising from professional services. The CGL may exclude professional services via endorsement (CG 22 79 or similar), creating a potential gap, or both policies may assert "other insurance" clauses leading to coverage disputes and delayed defense.',
    conflictType: 'overlap',
    detectionRule: 'If both CGL and professional liability policies exist, check CGL for professional services exclusion endorsements. Check both policies for "other insurance" provisions and determine which is primary for professional services claims.',
    resolution: 'Coordinate policies so the CGL\'s professional services exclusion aligns with the professional liability\'s scope. Ensure no gap exists between the two policies\' coverage grants. Consider adding a professional services endorsement to the CGL or ensuring the E&O provides defense for BI/PD claims arising from professional acts.',
  },
  {
    id: 'auto-cgl-loading-unloading',
    name: 'Auto vs. CGL Loading/Unloading Dispute',
    severity: 'medium',
    description:
      'Both the commercial auto policy and the CGL policy may cover bodily injury or property damage occurring during loading and unloading of vehicles. The mobile equipment exclusion on the auto policy and the auto exclusion on the CGL can create a grey area where neither insurer accepts primary responsibility.',
    conflictType: 'coordination',
    detectionRule: 'If both commercial auto and CGL policies exist, review the auto exclusion on the CGL (typically exclusion g) and the loading/unloading definition on the auto policy. Flag if the definitions are inconsistent.',
    resolution: 'Ensure both policies are with the same carrier where possible (to avoid disputes), or add endorsements that clearly allocate loading/unloading coverage. The standard ISO approach assigns loading/unloading to auto, but non-standard forms may differ.',
  },
  {
    id: 'umbrella-underlying-schedule-mismatch',
    name: 'Umbrella Schedule Does Not Match Underlying Policies',
    severity: 'critical',
    description:
      'The umbrella or excess policy\'s schedule of underlying insurance does not accurately list all primary policies or their correct limits. This can result in the umbrella insurer denying coverage for claims arising from an unlisted underlying policy, or gaps where the umbrella\'s attachment point assumes a higher underlying limit than actually exists.',
    conflictType: 'coordination',
    detectionRule: 'Compare the umbrella\'s schedule of underlying insurance against all primary policies. Flag any primary policy not listed on the schedule, or any listed limit that does not match the actual primary policy limit.',
    resolution: 'Update the umbrella schedule to accurately reflect all underlying policies and their current limits. Request a mid-term endorsement if policies have changed since the umbrella was bound.',
  },
  {
    id: 'cyber-cgl-data-breach',
    name: 'Cyber vs. CGL Data Breach Coverage Conflict',
    severity: 'high',
    description:
      'The CGL policy may provide limited coverage for "personal and advertising injury" including publication of private information, while the cyber policy provides specific data breach coverage. Insurers may dispute which policy is primary for a data breach claim, and the CGL\'s coverage may be narrowed or excluded by endorsement (ISO CG 21 06 or CG 21 07).',
    conflictType: 'overlap',
    detectionRule: 'If both CGL and cyber policies exist, check CGL for data-related exclusions (CG 21 06, CG 21 07, or similar). Review cyber policy\'s "other insurance" clause. Flag if CGL has not been endorsed to exclude data breach and both policies could respond.',
    resolution: 'Endorse the CGL to exclude electronic data liability (add CG 21 06/07) and ensure the cyber policy is the designated primary responder for all data breach claims. This eliminates disputes and ensures the specialized cyber coverage applies.',
  },
  {
    id: 'bop-standalone-conflict',
    name: 'BOP vs. Standalone Policy Duplication',
    severity: 'medium',
    description:
      'The insured has a Business Owners Policy (BOP) that includes general liability and property coverage, but also has separate standalone CGL and/or commercial property policies. This creates duplicate coverage, wasted premium, and potential "other insurance" disputes at claim time.',
    conflictType: 'overlap',
    detectionRule: 'If a BOP exists alongside a standalone CGL or standalone commercial property policy, flag as duplicate coverage.',
    resolution: 'Consolidate into either the BOP (if limits are adequate and the insured qualifies) or standalone policies (if higher limits or broader coverage is needed). Do not maintain both.',
  },
  {
    id: 'workers-comp-employers-liability-umbrella',
    name: 'Workers Comp Employers Liability vs. Umbrella Mismatch',
    severity: 'high',
    description:
      'The umbrella policy schedules employers liability as an underlying coverage, but the employers liability limits on the workers compensation policy (Part B) do not match the umbrella\'s required underlying limits. The umbrella may not drop down to fill the gap between actual and required underlying limits.',
    conflictType: 'coordination',
    detectionRule: 'Compare workers compensation Part B (employers liability) limits against the umbrella\'s scheduled underlying employers liability limits. Flag if the actual limits are lower than what the umbrella schedule requires.',
    resolution: 'Increase employers liability limits on the workers compensation policy to match the umbrella\'s required underlying schedule. Standard umbrella requirements are typically $1M/$1M/$1M for employers liability.',
  },
  {
    id: 'additional-insured-conflict',
    name: 'Inconsistent Additional Insured Status Across Policies',
    severity: 'medium',
    description:
      'A third party (landlord, general contractor, client) is named as an additional insured on the CGL but not on the umbrella, auto, or other relevant policies. This creates gaps where the additional insured\'s contractual insurance requirements are not fully satisfied.',
    conflictType: 'coordination',
    detectionRule: 'For each additional insured on the CGL, check whether they are also listed on the umbrella, commercial auto, and any other policies required by their contract. Flag mismatches.',
    resolution: 'Ensure additional insured status is consistent across all policies required by the underlying contract. Most contracts require AI status on CGL, umbrella, and commercial auto at minimum.',
  },
  {
    id: 'property-valuation-conflict',
    name: 'Inconsistent Property Valuation Across Policies',
    severity: 'medium',
    description:
      'The commercial property policy uses one valuation method (e.g., replacement cost) while the business interruption coverage uses another (e.g., actual cash value), or the property values declared on the property policy are inconsistent with those on the inland marine or equipment breakdown policy.',
    conflictType: 'contradiction',
    detectionRule: 'Compare valuation methods and declared values across all property-related policies (commercial property, inland marine, equipment breakdown, BOP). Flag inconsistencies in valuation basis or declared amounts.',
    resolution: 'Standardize valuation methods across all property policies (replacement cost is generally preferred). Ensure declared values are consistent and based on current appraisals.',
  },
];
