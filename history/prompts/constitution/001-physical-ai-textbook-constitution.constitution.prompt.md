---
id: "001"
title: Physical AI Textbook Constitution Init
stage: constitution
date: 2026-03-01
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: architext
command: /sp.constitution
labels: ["constitution","docusaurus","fastapi","qdrant","neon","urdu","personalization","auth","rag"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .specify/memory/constitution.md
  - history/prompts/constitution/001-physical-ai-textbook-constitution.constitution.prompt.md
tests:
  - N/A — constitution creation, no tests run
---

## Prompt

Create principles for an AI-native Physical AI & Humanoid Robotics textbook built with Docusaurus v3,
FastAPI RAG chatbot, Qdrant vector search, Neon Postgres, featuring Urdu translation, content
personalization, and user authentication with onboarding questions.

## Response snapshot

Created `.specify/memory/constitution.md` v1.0.0 with 8 core principles:

I.   Content Sovereignty — MDX as single source of truth; Qdrant index kept in sync.
II.  AI-Native RAG Pipeline — grounded answers with mandatory source citations.
III. Multilingual Inclusivity (Urdu-First) — RTL support, locale files, i18n keys required.
IV.  Personalization by Design — onboarding-driven recommendations, decoupled from rendering.
V.   Secure-by-Default Authentication — JWT/session auth, encrypted user data, .env secrets.
VI.  Test-First Development (NON-NEGOTIABLE) — Red-Green-Refactor, contract + integration tests.
VII. Performance & Accessibility — Lighthouse ≥85/90, RAG p95 ≤3s, keyboard navigable.
VIII.Operational Simplicity & Reproducibility — ≤3 commands to run locally, automated CI/CD.

Technology stack table and non-goals documented. Governance with amendment + versioning policy added.
Sync impact report embedded as HTML comment at top of constitution file.

## Outcome

- ✅ Impact: Project constitution established from scratch; all 8 principles cover the unique
  requirements of an AI-native multilingual textbook with RAG, auth, and personalization.
- 🧪 Tests: No tests run (documentation artifact).
- 📁 Files: .specify/memory/constitution.md created at v1.0.0
- 🔁 Next prompts: /sp.specify <feature> to begin specifying individual features (e.g., urdu-translation, user-auth-onboarding, content-personalization)
- 🧠 Reflection: Constitution covers all requested dimensions. ADR candidates: choice of Qdrant over pgvector, Neon Postgres vs SQLite for chat history.

## Evaluation notes (flywheel)

- Failure modes observed: None — template had all placeholder tokens; all replaced cleanly.
- Graders run and results (PASS/FAIL): Manual review PASS — no bracket tokens remain.
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Run /sp.adr for "Qdrant vs pgvector" and "JWT vs session auth" if those decisions warrant formal ADRs.
