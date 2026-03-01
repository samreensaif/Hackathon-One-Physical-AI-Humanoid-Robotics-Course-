---
id: "003"
title: Physical AI Textbook Implementation Plan
stage: plan
date: 2026-03-01
surface: agent
model: claude-sonnet-4-6
feature: 001-physical-ai-textbook
branch: 001-physical-ai-textbook
user: architext
command: /sp.plan
labels: ["plan","fastapi","docusaurus","qdrant","neon","openai","github-pages","render","rag","constitution-check"]
links:
  spec: specs/001-physical-ai-textbook/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-physical-ai-textbook/plan.md
  - specs/001-physical-ai-textbook/research.md
  - specs/001-physical-ai-textbook/data-model.md
  - specs/001-physical-ai-textbook/quickstart.md
  - specs/001-physical-ai-textbook/contracts/api.md
  - CLAUDE.md
  - history/prompts/001-physical-ai-textbook/003-physical-ai-textbook-impl-plan.plan.prompt.md
tests:
  - N/A — planning artifact, no tests run
---

## Prompt

Tech stack: Docusaurus v3 React/MDX frontend on GitHub Pages, FastAPI Python 3.11 backend on Render.com,
OpenAI gpt-4o-mini for chat/translate/personalize endpoints, text-embedding-3-small for embeddings,
Qdrant Cloud free tier for vector search, Neon Serverless Postgres for chat history, GitHub Actions
for CI/CD deployment.

## Response snapshot

Generated full Phase 0 + Phase 1 planning artifacts for feature 001-physical-ai-textbook:

**plan.md**: Technical Context filled (Python 3.11/TS 5.6, FastAPI, Qdrant+Neon, GitHub Pages+Render).
Constitution Check: 4/8 PASS, 3/8 PARTIAL/GAP, 1/8 UNVERIFIED. Three justified violations documented.
Actual source code tree documented (physical-ai-textbook/ + chatbot-backend/).

**research.md**: 8 technical decisions resolved (RAG vs fine-tuning, embedding model, chunking strategy,
localStorage auth rationale, Urdu translation approach, personalization depth, test strategy, CI/CD).
5 implementation gaps identified: pytest suite, home-page recommendations, Docusaurus ur locale,
Lighthouse CI, and ROS experience granularity.

**data-model.md**: Full schema for localStorage (auth_user, UserProfile, auth_session, chatbot_session_id),
Neon Postgres (chat_sessions, chat_messages), Qdrant (textbook_chunks collection), and MDX content model.
State machines for auth and chat session flows.

**contracts/api.md**: Full OpenAPI-style contracts for all 6 endpoints (/health, /chat, /chat-selected,
/personalize, /translate, /ingest) with request/response schemas, constraints, error taxonomy, and
idempotency table.

**quickstart.md**: 3-command local dev setup, required env vars table, verification checklist, common
issues, deployment instructions.

**CLAUDE.md**: Updated with tech stack via update-agent-context.ps1.

## Outcome

- ✅ Impact: Complete implementation plan documented. Constitution Check reveals 4 gaps requiring
  implementation tasks: pytest suite, home-page personalization, Docusaurus ur locale, Lighthouse CI.
- 🧪 Tests: N/A — planning artifact.
- 📁 Files: 5 new spec artifacts + CLAUDE.md updated.
- 🔁 Next prompts: /sp.tasks to generate implementation task list
- 🧠 Reflection: Platform is ~75% built. Remaining work is gap-filling: tests, home-page recommendations,
  Docusaurus i18n locale for Urdu, and Lighthouse CI. No architectural changes needed.

## Evaluation notes (flywheel)

- Failure modes observed: setup-plan.ps1 ran successfully; update-agent-context.ps1 ran successfully.
- Graders run and results (PASS/FAIL): Constitution Check PARTIAL — 4 gaps documented with justifications.
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Run /sp.tasks 001-physical-ai-textbook to generate prioritized task list targeting the 5 identified implementation gaps.
