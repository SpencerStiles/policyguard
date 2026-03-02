# PolicyGuard AI

**AI-powered insurance policy analysis.** Upload a policy PDF, get instant analysis of coverage gaps, conflicts, and actionable recommendations.

[**Request a Demo →**](https://cal.com/spencerstiles) | [Live Demo](https://policyguard.spencerstiles.com)

---

## The Problem

Insurance policies are dense, contradictory, and full of exclusions that only matter when you need to file a claim. Brokers spend hours manually reviewing policies. PolicyGuard automates this in seconds.

## What It Does

- **Coverage Gap Detection** — Identifies what's not covered and what should be
- **Conflict Analysis** — Flags contradictions between policies (e.g. two policies with overlapping exclusions)
- **Actionable Recommendations** — Plain-English summaries with specific remediation steps
- **Multi-Policy Upload** — Analyze and compare multiple PDFs in one session
- **Audit Trail** — Full history of analyses per client

## Who It's For

- Insurance brokers reviewing client portfolios
- Risk management teams at mid-market companies
- Legal teams reviewing vendor or lease agreements with insurance requirements
- Compliance officers in regulated industries

## Pricing

| | Starter | Professional | Enterprise |
|-|---------|-------------|------------|
| Users | 1 | 5 | Unlimited |
| Analyses/mo | 20 | 200 | Unlimited |
| Policy storage | 1GB | 10GB | Custom |
| API access | — | — | ✓ |
| Price | $49/mo | $79/mo | Contact |

[**Start free trial →**](https://cal.com/spencerstiles)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Frontend | Next.js 14 |
| AI | OpenAI GPT-4o |
| Vector DB | ChromaDB (RAG for document search) |
| Auth | JWT (RS256) |
| Infra | Docker, PostgreSQL |
| CI/CD | GitHub Actions |

## Architecture

```
policyguard/
├── apps/
│   ├── api/          # FastAPI backend — upload, analysis, auth
│   └── web/          # Next.js frontend — dashboard, viewer
└── packages/
    └── domain-insurance/   # Insurance domain knowledge & prompts
```

## Running Locally

```bash
# Prerequisites: Docker, Python 3.11+, Node 18+
git clone https://github.com/SpencerStiles/policyguard
cd policyguard
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
docker-compose up
```

## Custom Deployment / Consulting

Want PolicyGuard tailored to your industry (legal contracts, vendor agreements, HR policies)?
I do custom AI document analysis implementations. [Let's talk →](https://cal.com/spencerstiles)
