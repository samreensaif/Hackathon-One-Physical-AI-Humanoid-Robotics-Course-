<!--
SYNC IMPACT REPORT
==================
Version change: [template] → 1.0.0
Modified principles: N/A (initial population from template)
Added sections:
  - Core Principles (8 principles)
  - Technology Stack & Constraints
  - Development Workflow
  - Governance

Templates reviewed:
  ✅ .specify/templates/plan-template.md — Constitution Check section present; aligns with principles
  ✅ .specify/templates/spec-template.md — User stories, FR, success criteria align with Content Sovereignty and Test-First principles
  ✅ .specify/templates/tasks-template.md — Phase structure aligns with Test-First and Incremental Delivery principles

Deferred TODOs:
  - TODO(RATIFICATION_DATE): Set to 2026-03-01 (project inception inferred from README + git log)
  - TODO(USER_IDENTITY): GitHub username placeholder in README still needs real value (out of scope for constitution)
-->

# Physical AI & Humanoid Robotics Textbook Constitution

## Core Principles

### I. Content Sovereignty

All educational content MUST be authored in MDX within `physical-ai-textbook/docs/` and treated
as the single source of truth. Content changes MUST be reflected in the Qdrant vector index
before the RAG chatbot is considered up-to-date. Raw content MUST be version-controlled; no
content-critical data may live exclusively in a database.

**Rationale**: The textbook's value is its content. Keeping content in Git ensures auditability,
collaborative contribution, and reproducibility of the AI assistant's knowledge.

### II. AI-Native RAG Pipeline

The chatbot MUST retrieve answers from indexed textbook content via Qdrant before generating
a response; it MUST NOT hallucinate facts not present in the corpus. Every chat response
MUST include source citations referencing the originating MDX chapter/section. The embedding
model and chunk parameters (size, overlap) MUST be documented and reproducible via a single
ingest command (`python ingest.py`).

**Rationale**: An AI-native textbook's credibility depends on grounded, citable answers.
Hallucination erodes trust; citation builds it.

### III. Multilingual Inclusivity (Urdu-First)

All user-facing UI strings and textbook chapter summaries MUST support Urdu translation.
RTL (right-to-left) layout MUST be preserved when Urdu locale is active. Translation strings
MUST be stored in locale files, never hardcoded. New UI components MUST include Urdu i18n
keys before a feature is marked complete.

**Rationale**: Urdu is the primary target language for underserved learners this textbook
aims to reach. Treating it as an afterthought breaks accessibility guarantees.

### IV. Personalization by Design

User onboarding questions MUST drive content recommendations, difficulty settings, and
chatbot response tone. Personalization logic MUST be decoupled from content rendering so
that changing an onboarding answer updates recommendations without a page reload dependency.
No personalization decision may silently fail; fallback to default content profile MUST be
explicit and logged.

**Rationale**: Learners arrive with varying backgrounds (beginner roboticist vs. ML engineer).
Adaptive content respects their time and maximises learning outcomes.

### V. Secure-by-Default Authentication

User authentication MUST use standard, audited mechanisms (JWT or session-based via a
well-maintained library). Secrets (API keys, DB URLs, JWT secrets) MUST be stored in `.env`
files and MUST NOT be committed to version control. The `.env.example` file MUST stay
current with every new environment variable. Onboarding data (user answers) MUST be stored
encrypted-at-rest in Neon Postgres. Authentication MUST be enforced before any write to user
preferences or chat history.

**Rationale**: User data and API credentials are high-value targets. A secure baseline from
day one is cheaper than retrofitting security after a breach.

### VI. Test-First Development (NON-NEGOTIABLE)

Tests MUST be written before implementation for every new feature (Red → Green → Refactor).
A task is not complete until its acceptance tests pass. Frontend component tests use the
testing library bundled with Docusaurus/React; backend tests use pytest. Integration tests
MUST cover: RAG pipeline (ingest → query → citation), auth flows, and personalization API.
Contract tests MUST cover all FastAPI endpoints before deployment.

**Rationale**: The RAG pipeline, auth, and personalization form a complex integration surface.
Test-first discipline surfaces regressions early and documents expected behaviour.

### VII. Performance & Accessibility

Docusaurus pages MUST achieve a Lighthouse performance score ≥ 85 and accessibility score
≥ 90 on desktop and mobile. RAG `/chat` endpoint p95 latency MUST be ≤ 3 s under typical
load. Vector search via Qdrant MUST return top-k results in ≤ 500 ms. Images MUST use
modern formats (WebP/AVIF) and include `alt` text. All interactive elements MUST be keyboard
navigable.

**Rationale**: A textbook that is slow or inaccessible fails learners on low-end devices and
assistive technologies — the exact audience this project targets.

### VIII. Operational Simplicity & Reproducibility

The entire local dev environment MUST be startable with ≤ 3 shell commands documented in
`README.md`. Every environment variable MUST have a corresponding entry in `.env.example`
with a description and example value. Deployment to GitHub Pages MUST be fully automated via
GitHub Actions on `push` to `main`. No manual build steps may be required post-merge.
Production secrets MUST be stored in GitHub Actions Secrets, never in workflow YAML.

**Rationale**: Complexity kills contributions. Reproducible environments lower the barrier
for new contributors and reduce "works on my machine" failures.

## Technology Stack & Constraints

| Layer | Technology | Constraint |
|---|---|---|
| Textbook site | Docusaurus v3, React 19, MDX | Must not require server-side rendering at build time |
| Chatbot widget | React (inline) | No additional npm deps beyond Docusaurus ecosystem |
| Backend API | FastAPI, Python 3.11+ | Must expose OpenAPI docs at `/docs` |
| Embeddings | OpenAI `text-embedding-3-small` | Chunk size 500 words, overlap 50 words |
| Chat model | OpenAI `gpt-4o-mini` | Max 3 retrieved chunks per query |
| Vector DB | Qdrant Cloud (free tier) | Collection name configurable via env var |
| Relational DB | Neon Serverless Postgres + asyncpg | Chat history + user profiles + onboarding answers |
| i18n | Docusaurus i18n plugin | Urdu locale (`ur`) MUST be first non-default locale |
| CI/CD | GitHub Actions + peaceiris/actions-gh-pages | Deploy only from `main` branch |

**Non-Goals (explicitly excluded)**:
- Self-hosted Qdrant or Postgres (cloud-managed only for MVP)
- Mobile native apps (Docusaurus PWA is the mobile story)
- Real-time collaborative editing of content
- Support for locales beyond English and Urdu in v1

## Development Workflow

### Branching & PR

1. Branch from `main` using `<issue-number>-short-description` convention.
2. Every PR MUST pass: lint, type-check, pytest, and Lighthouse CI.
3. PRs MUST reference the spec task ID from `specs/<feature>/tasks.md`.
4. Squash-merge to `main`; do not rebase public branches.

### Content Updates

1. Add/edit MDX files in `physical-ai-textbook/docs/`.
2. Run `python chatbot-backend/ingest.py` to refresh Qdrant index.
3. Verify RAG accuracy with at least 3 manual test queries covering the changed content.

### Environment Variables

1. Any new env var MUST be added to `chatbot-backend/.env.example` in the same PR.
2. Env vars MUST follow `SCREAMING_SNAKE_CASE` convention.
3. Sensitive values MUST use GitHub Actions Secrets for CI; never plain-text in workflows.

### Quality Gates

- All tests pass (`pytest` backend, `npm test` frontend)
- No secrets detected by `git-secrets` or equivalent pre-commit hook
- Lighthouse score thresholds met (Principle VII)
- Urdu i18n keys present for any new UI string (Principle III)

## Governance

This constitution is the authoritative document for all architectural and development
decisions in the Physical AI & Humanoid Robotics Textbook project. It supersedes any
contradicting conventions found in individual files or historical decisions.

**Amendment procedure**:
1. Propose amendment via PR with a brief rationale comment in this file.
2. Amendment requires approval from ≥ 1 project maintainer.
3. Version MUST be incremented per semantic versioning rules defined below.
4. Amended date MUST be updated on ratification.

**Versioning policy**:
- MAJOR: Principle removal, redefinition, or backward-incompatible governance change.
- MINOR: New principle or section added, or materially expanded guidance.
- PATCH: Clarification, wording fix, or non-semantic refinement.

**Compliance review**: Each sprint/milestone review MUST include a Constitution Check
(see `plan-template.md` § Constitution Check) verifying no new PRs violate these principles.

**Version**: 1.0.0 | **Ratified**: 2026-03-01 | **Last Amended**: 2026-03-01
