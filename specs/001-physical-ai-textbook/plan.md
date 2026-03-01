# Implementation Plan: Physical AI & Humanoid Robotics Textbook Platform

**Branch**: `001-physical-ai-textbook` | **Date**: 2026-03-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-physical-ai-textbook/spec.md`

## Summary

A full-stack AI-native textbook platform covering Physical AI and Humanoid Robotics (4 modules,
16 chapters). The static Docusaurus v3 frontend is deployed on GitHub Pages and is enriched with:
a floating RAG chatbot (FastAPI + Qdrant + GPT-4o-mini), per-page text-selection queries, Urdu
translation (TranslateButton via `/translate`), content personalization (PersonalizeButton via
`/personalize`), and client-side localStorage auth with a 4-question onboarding questionnaire.
The FastAPI backend is deployed on Render.com and connects to Qdrant Cloud and Neon Postgres.

**Current state**: The core platform is substantially built. This plan documents the as-built
architecture, identifies remaining gaps, and defines the completion roadmap.

## Technical Context

**Language/Version**: Python 3.11 (backend) · TypeScript 5.6 / Node 20 (frontend)
**Primary Dependencies**: FastAPI 0.111, uvicorn, openai 1.35, qdrant-client 1.9, asyncpg 0.29,
pydantic-settings 2.3 (backend) · Docusaurus 3.9.2, React 19, MDX 3 (frontend)
**Storage**: Qdrant Cloud (vector, textbook embeddings) + Neon Serverless Postgres (chat history)
+ localStorage (user auth + onboarding profile — client only)
**Testing**: pytest (backend) · Docusaurus/React Testing Library (frontend)
**Target Platform**: GitHub Pages (static frontend) + Render.com (FastAPI backend, always-on or
free tier)
**Project Type**: Web application — monorepo with `physical-ai-textbook/` (frontend) and
`chatbot-backend/` (backend) at repo root
**Performance Goals**: RAG `/chat` p95 ≤ 3 s · Qdrant vector search ≤ 500 ms · Lighthouse
performance ≥ 85, accessibility ≥ 90 · Page load ≤ 2 s on 4G
**Constraints**: GitHub Pages = static only (no SSR at request time) · Qdrant Cloud free tier
= 1 collection, ~1 GB storage · Render.com free tier = cold start risk · localStorage auth = no
server-side user store in v1
**Scale/Scope**: ~16 chapters, ~200 Qdrant chunks, small learner audience (< 1000 concurrent)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status | Evidence |
|---|---|---|---|
| I. Content Sovereignty | MDX in `physical-ai-textbook/docs/` is single source of truth; Qdrant sync before chatbot considered current | ✅ PASS | 16 MDX files in `docs/`; `ingest.py` reindexes all chapters; content is Git-versioned |
| II. AI-Native RAG Pipeline | Every `/chat` response includes source citations; no hallucination beyond corpus | ✅ PASS | `_chat_core` enforces RAG-before-generation; `sources[]` returned on every response |
| III. Multilingual Inclusivity | Urdu supported; RTL when active; strings in locale files | ⚠️ PARTIAL | `TranslateButton` per-page translate works; full Docusaurus i18n locale (`ur`) not yet configured — **required gap** |
| IV. Personalization by Design | Onboarding → recommendations; fallback explicit | ⚠️ PARTIAL | `PersonalizeButton` per-page rewrite works; home-page recommendations not yet implemented — **required gap** |
| V. Secure-by-Default Auth | Secrets in `.env`; no hardcoded credentials; auth before writes | ✅ PASS | `.env.example` current; API keys env-configured; localStorage auth is documented assumption |
| VI. Test-First | Tests before implementation; pytest backend; contract tests on all endpoints | ⚠️ GAP | No test files found in chatbot-backend/; frontend tests absent — **required gap** |
| VII. Performance & Accessibility | Lighthouse ≥ 85/90; RAG p95 ≤ 3s; keyboard navigable | ⚠️ UNVERIFIED | Lighthouse CI not configured; no perf budget enforcement — **required gap** |
| VIII. Operational Simplicity | ≤ 3 commands to run locally; `.env.example` complete; CI/CD automated | ✅ PASS | README documents 3-command startup; `.env.example` current; GitHub Actions deploys on push |

**Constitution Check Result**: 4/8 PASS · 3/8 PARTIAL/GAP · 1/8 UNVERIFIED

**Violations requiring justification**:

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Principle III: Urdu via TranslateButton (not Docusaurus i18n locale) | Faster path to Urdu output using existing `/translate` LLM endpoint; no static translation files needed | Static locale files require manual translation of all 16 chapters; LLM translation is dynamic and maintainable for v1 |
| Principle V: localStorage auth (not server-side) | Backend is read-only RAG; no user DB exists | Adding server-side auth requires Postgres user table, JWT infra — deferred to v2 as documented assumption |
| Principle VI: Tests absent | Project built under hackathon time constraints | Test coverage MUST be remediated in implementation tasks before feature is marked done |
| Principle VII: Lighthouse CI absent | Not yet configured | Must be added to GitHub Actions workflow |

## Project Structure

### Documentation (this feature)

```text
specs/001-physical-ai-textbook/
├── plan.md              # This file
├── research.md          # Phase 0 findings
├── data-model.md        # Data model for all entities
├── quickstart.md        # Local dev setup
├── contracts/
│   └── api.md           # FastAPI endpoint contracts
└── tasks.md             # Generated by /sp.tasks
```

### Source Code (repository root)

```text
physical-ai-textbook/               # Docusaurus 3 frontend
├── docs/
│   ├── intro.md
│   ├── module1-ros2/chapter{1-4}.mdx
│   ├── module2-simulation/chapter{1-4}.mdx
│   ├── module3-isaac/chapter{1-4}.mdx
│   └── module4-vla/chapter{1-4}.mdx
├── src/
│   ├── pages/
│   │   ├── index.tsx              # Homepage with personalized recommendations
│   │   ├── signup.js              # 2-step: account creation + onboarding
│   │   └── signin.js              # localStorage auth
│   ├── components/
│   │   ├── AuthButtons/           # Navbar: Sign In / Sign Up / Sign Out
│   │   ├── ChatBot/               # Floating RAG widget (general + selection)
│   │   ├── PersonalizeButton/     # Per-page content adaptation
│   │   └── TranslateButton/       # Per-page Urdu translation
│   └── theme/
│       ├── Root.js                # Global ChatBot mount
│       └── NavbarItem/ComponentTypes.js
├── i18n/
│   └── ur/                        # [GAP] Urdu locale strings (to be added)
├── docusaurus.config.ts
└── sidebars.ts

chatbot-backend/                    # FastAPI backend
├── main.py                        # API server (6 endpoints)
├── ingest.py                      # Standalone ingest CLI
├── ingest_service.py              # MDX → chunks → embeddings
├── qdrant_service.py              # Qdrant CRUD + semantic search
├── database.py                    # Neon Postgres sessions/messages
├── config.py                      # pydantic-settings configuration
├── requirements.txt
├── .env.example
├── Procfile                       # Render.com: uvicorn main:app
└── tests/                         # [GAP] pytest suite to be created
    ├── test_health.py
    ├── test_chat.py
    ├── test_ingest.py
    ├── test_personalize.py
    └── test_translate.py

.github/workflows/
└── deploy.yml                     # GitHub Actions: build + deploy Docusaurus
```

**Structure Decision**: Web application (Option 2) with `physical-ai-textbook/` as frontend and
`chatbot-backend/` as backend. This mirrors the actual repository layout. No src/ refactoring
needed — directory names are semantically clear and already in production.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Two separate deployment targets (GitHub Pages + Render.com) | Static frontend must deploy to GitHub Pages (project requirement); dynamic RAG backend requires persistent compute | Combining into a single server would break GitHub Pages static deployment model |
| Dual data stores (Qdrant + Neon Postgres) | Qdrant for vector similarity (semantic search) requires specialized index structures; Postgres for relational chat history | Storing embeddings in Postgres with pgvector is viable but requires self-managed extension on Neon; Qdrant Cloud free tier is ready now |
| Client-side localStorage auth (not server-side) | No server-side user DB in v1; GitHub Pages is static | Documented in spec assumptions; flagged for migration to server-side auth in v2 |
