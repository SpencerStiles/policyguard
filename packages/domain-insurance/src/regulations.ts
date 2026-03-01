import type { DomainRegulation } from './types.js';

/**
 * Regulatory requirements that mandate certain insurance coverages or
 * minimum limits. Focused on U.S. state and federal requirements as of
 * 2024-2025.
 */
export const INSURANCE_REGULATIONS: DomainRegulation[] = [
  {
    id: 'ca-workers-comp',
    name: 'California Workers Compensation Requirement',
    jurisdiction: 'California',
    description:
      'California Labor Code §3700 requires every employer to secure workers compensation coverage for all employees. Failure to carry coverage is a criminal offense (misdemeanor) punishable by fine and imprisonment. The employer is also liable for the cost of all benefits that would have been provided.',
    requiredCoverages: [
      { coverageTypeId: 'workers-compensation' },
    ],
    effectiveDate: '1913-01-01',
    source: 'California Labor Code §3700-3709.5',
  },
  {
    id: 'multi-state-employers-liability',
    name: 'Multi-State Employers Liability Requirements',
    jurisdiction: 'Federal / Multi-State',
    description:
      'Employers operating in multiple states must maintain workers compensation coverage compliant with each state\'s laws. The "other states" endorsement (WC 00 03 01 A) should list all states where employees work or may work. Monopolistic state fund states (OH, ND, WA, WY) require separate state fund coverage.',
    requiredCoverages: [
      { coverageTypeId: 'workers-compensation', minimumLimit: 500_000 },
    ],
    effectiveDate: '2000-01-01',
    source: 'State workers compensation statutes (varies by state)',
  },
  {
    id: 'tx-cgl-requirements',
    name: 'Texas Contractual CGL Requirements',
    jurisdiction: 'Texas',
    description:
      'Texas Government Code §2253.021 and many Texas construction contracts require contractors to maintain CGL coverage with minimum limits. State and municipal projects typically require $1M per occurrence / $2M aggregate. Additional insured status for the project owner is standard.',
    requiredCoverages: [
      { coverageTypeId: 'cgl', minimumLimit: 1_000_000 },
    ],
    effectiveDate: '2005-09-01',
    source: 'Texas Government Code §2253.021; Texas Insurance Code',
  },
  {
    id: 'ny-commercial-auto',
    name: 'New York Commercial Auto Minimum Limits',
    jurisdiction: 'New York',
    description:
      'New York Vehicle & Traffic Law §388 imposes vicarious liability on vehicle owners for permissive users. New York Insurance Law §3420 requires minimum auto liability limits. Commercial vehicles must carry higher limits than personal vehicles, with for-hire vehicles requiring $1.5M or more.',
    requiredCoverages: [
      { coverageTypeId: 'commercial-auto', minimumLimit: 500_000 },
    ],
    effectiveDate: '2000-01-01',
    source: 'NY Vehicle & Traffic Law §388; NY Insurance Law §3420',
  },
  {
    id: 'fl-property-requirements',
    name: 'Florida Commercial Property Wind Coverage',
    jurisdiction: 'Florida',
    description:
      'Florida Statute §627.712 requires residential property insurers to offer wind coverage. Commercial property policies in Florida must address windstorm exposure, though coverage may be obtained through the Florida Hurricane Catastrophe Fund or Citizens Property Insurance Corporation as a last resort. Deductibles for named storms are typically 2-5% of insured value.',
    requiredCoverages: [
      { coverageTypeId: 'commercial-property' },
    ],
    effectiveDate: '2003-01-01',
    source: 'Florida Statute §627.712; Florida Building Code',
  },
  {
    id: 'state-cyber-notification',
    name: 'State Data Breach Notification Laws',
    jurisdiction: 'All 50 States + DC',
    description:
      'All 50 U.S. states, the District of Columbia, and U.S. territories have enacted data breach notification laws requiring organizations to notify affected individuals and state regulators when personal information is compromised. Notification deadlines range from 30 to 90 days. Some states (CA, NY, MA) impose additional security requirements. Cyber liability insurance covers breach response costs including forensics, notification, and regulatory defense.',
    requiredCoverages: [
      { coverageTypeId: 'cyber-liability', minimumLimit: 1_000_000 },
    ],
    effectiveDate: '2018-04-01',
    source: 'State data breach notification statutes (varies by state); NAIC Insurance Data Security Model Law',
  },
  {
    id: 'erisa-fiduciary',
    name: 'ERISA Fiduciary Liability Requirements',
    jurisdiction: 'Federal',
    description:
      'The Employee Retirement Income Security Act (ERISA) §412 requires every fiduciary of an employee benefit plan to be bonded. While bonding is distinct from fiduciary liability insurance, fiduciary liability coverage provides broader protection against claims of mismanagement of employee benefit plans. Companies sponsoring 401(k), pension, or health plans should maintain fiduciary liability coverage.',
    requiredCoverages: [
      { coverageTypeId: 'directors-officers' },
    ],
    effectiveDate: '1974-09-02',
    source: 'ERISA §412; 29 U.S.C. §1112',
  },
  {
    id: 'soc2-cyber-requirements',
    name: 'SOC 2 Cyber Insurance Requirements',
    jurisdiction: 'Industry:Technology',
    description:
      'While SOC 2 (Service Organization Control 2) does not legally mandate cyber insurance, enterprise customers and auditors increasingly require SOC 2 compliant service providers to maintain cyber liability coverage as a risk mitigation control. Typical contractual requirements are $2M-$5M cyber limits for SaaS providers.',
    requiredCoverages: [
      { coverageTypeId: 'cyber-liability', minimumLimit: 2_000_000 },
      { coverageTypeId: 'professional-liability', minimumLimit: 2_000_000 },
    ],
    effectiveDate: '2020-01-01',
    source: 'AICPA SOC 2 Trust Services Criteria; Enterprise customer contract requirements',
  },
];
