# Research: Physical AI & Humanoid Robotics Textbook Platform

**Branch**: `001-physical-ai-textbook` | **Date**: 2026-03-01
**Phase**: 0 — Codebase audit + technology validation

## Summary

The platform is substantially implemented. Research confirmed the existing technology choices,
identified three implementation gaps, and resolved all technical questions raised by the spec.
No NEEDS CLARIFICATION items remain.

---

## Decision 1: RAG Architecture — Retrieve-then-Generate vs. Fine-Tuning

**Decision**: Retrieve-then-Generate (RAG) using Qdrant semantic search + GPT-4o-mini completion.

**Rationale**:
- Textbook content changes when chapters are updated; RAG allows re-indexing without retraining.
- Source citations are naturally supported — each retrieved chunk carries `{source, title}` metadata.
- Fine-tuning would bake content into model weights, making updates expensive and citations fragile.
- Existing implementation (`ingest_service.py` → `qdrant_service.py` → `main.py _chat_core`) is
  production-validated and working.

**Alternatives considered**:
- Fine-tuned GPT-3.5: Higher per-query cost, no easy content updates, no citation metadata.
- BM25 keyword search: Lower retrieval quality for paraphrased questions.
- pgvector on Neon: Viable, but Qdrant Cloud free tier is already provisioned and supports 1.5k-dim
  vectors natively without extension management.

---

## Decision 2: Embedding Model — text-embedding-3-small (1536-dim)

**Decision**: `text-embedding-3-small` at 1536 dimensions.

**Rationale**:
- Best cost/quality ratio in the OpenAI embedding family for short-to-medium passages (textbook chunks).
- 1536-dim cosine similarity is supported natively by Qdrant and delivers strong semantic recall for
  technical robotics content.
- The existing `config.py` already hard-codes this as the default; confirmed in Qdrant collection
  creation (reset_collection uses `embedding_dimensions=1536`).

**Alternatives considered**:
- `text-embedding-3-large` (3072-dim): ~2× cost, marginal recall improvement for this domain size.
- Open-source embeddings (sentence-transformers): Require self-hosting; complexity not justified.

---

## Decision 3: Chunking Strategy — Section-based + Character Overlap

**Decision**: Split MDX by H2 headings first, then chunk sections at 1500 chars with 150-char overlap.

**Rationale**:
- Section-based splitting preserves semantic coherence (each H2 heading = a conceptual unit).
- Character overlap prevents context loss at chunk boundaries (sentences referencing prior definitions).
- Existing `ingest_service._split_into_sections` + `_chunk_text` implements this already.
- ~200 chunks at 1500 chars/chunk = ~300k tokens total embedding cost per ingest (very low).

---

## Decision 4: Authentication Strategy — localStorage (v1) → Server-Side (v2)

**Decision**: localStorage-only auth for v1. Server-side user store deferred to v2.

**Rationale**:
- GitHub Pages is static; there is no server to validate sessions at request time.
- The RAG backend has no user-facing auth endpoints — it only handles chat/translate/personalize.
- Adding JWT auth to the backend + Neon user table in v1 would double implementation scope.
- Spec explicitly documents localStorage auth as an intentional assumption.

**Risks**: Passwords are stored client-side (SHA-256 hashed at minimum). Users who clear localStorage
lose their account. Acceptable for hackathon/MVP audience; must migrate before production launch.

**Migration path**: v2 adds `POST /auth/register`, `POST /auth/login`, `GET /auth/me` to the
FastAPI backend with a Neon `users` table; localStorage session replaced by HttpOnly cookie or
Bearer token.

---

## Decision 5: Urdu Translation — LLM-Powered (v1) vs. Docusaurus i18n Locale (v2)

**Decision**: v1 uses `TranslateButton` (per-page LLM translation via `/translate`). v2 will add
the Docusaurus `ur` i18n locale with static translated strings for UI navigation.

**Rationale**:
- Static Docusaurus i18n requires manually translating all sidebar labels, navbar items, and search
  UI — approximately 50+ strings — before the feature can be enabled.
- The `TranslateButton` approach delivers Urdu content immediately for chapter body text, which is
  the highest-value translation surface.
- RTL is correctly applied via `dir="rtl" lang="ur"` attributes on the translated output container.

**Gap identified**: Full Docusaurus `i18n: { locales: ['en', 'ur'] }` configuration with
`i18n/ur/` locale files is not yet in place. This must be added for the language switcher to
work as a first-class Docusaurus feature (Constitution Principle III).

**Alternatives considered**:
- Machine translation at build time (e.g., DeepL API in CI): Requires managing translated MDX
  files in Git; high storage and maintenance overhead for 16 chapters.
- Community-contributed manual translations: Correct long-term approach; deferred to v3.

---

## Decision 6: Personalization — Per-Page LLM Rewrite (v1) vs. Adaptive Content (v2)

**Decision**: v1 personalizes via `PersonalizeButton` (sends page content to `/personalize` for
LLM rewrite). Home-page chapter recommendations based on user profile are a v1 gap.

**Rationale**:
- Per-page personalization is already implemented and working.
- Home-page recommendations require reading the user profile from localStorage and mapping it to
  a chapter recommendation algorithm (simple rule-based: beginner → Module 1 chapters first;
  advanced → Module 3-4 chapters first; no GPU → skip GPU-heavy chapters).
- Recommendation logic is pure frontend JavaScript; no backend changes needed.

**Gap identified**: `src/pages/index.tsx` does not yet read user profile from localStorage to
render personalized chapter recommendations. This must be added.

---

## Decision 7: Test Strategy — pytest (backend) + React Testing Library (frontend)

**Decision**: pytest for all FastAPI endpoints; React Testing Library for React components; no
separate E2E test framework in v1.

**Rationale**:
- pytest is the de-facto standard for FastAPI testing; HTTPX provides async test client.
- React Testing Library integrates with Docusaurus build tools; no extra framework needed.
- E2E (Playwright/Cypress) is valuable but adds complexity; deferred to v2 when deployment is stable.

**Gap identified**: No test files currently exist in `chatbot-backend/tests/`. This is a
Constitution Principle VI violation and must be remediated in implementation tasks.

---

## Decision 8: CI/CD — GitHub Actions for Frontend; Backend Deployed Manually to Render

**Decision**: GitHub Actions auto-deploys Docusaurus to gh-pages on push to main. Backend is
deployed to Render.com via Git push; Render's native CI picks up `main` branch changes.

**Rationale**:
- The existing `deploy.yml` workflow is correct and production-validated.
- Render.com's native Git integration handles backend deployment without additional workflow steps.
- Adding Lighthouse CI to `deploy.yml` is the remaining gap for Principle VII.

**Gap identified**: Lighthouse CI score enforcement (≥ 85 performance, ≥ 90 accessibility) is
not yet integrated into the GitHub Actions workflow.

---

## Resolved Technical Questions

| Question | Answer |
|---|---|
| Which embedding model? | `text-embedding-3-small` (1536-dim) — already configured |
| Which LLM for chat? | `gpt-4o-mini` — already configured |
| Which LLM for translate/personalize? | Same `gpt-4o-mini` instance — confirmed in main.py |
| How many retrieved chunks per query? | `top_k_chunks = 5` (config default) |
| How is chat history stored? | Neon Postgres `chat_messages` table, last 6 turns per session |
| How are sessions identified? | UUID stored in `localStorage['chatbot_session_id']` |
| What is the deployment backend URL? | `https://hackathon-one-physical-ai-humanoid.onrender.com` (hardcoded in docusaurus.config.ts headTags) |
| How does text selection work? | `mouseup` event listener in ChatBot component detects selection; `POST /chat-selected` sends `{question, selected_text}` |
| Is Urdu RTL applied? | Yes — `dir="rtl" lang="ur"` on translation output container in TranslateButton |

---

## Implementation Gaps Summary

| Gap | Principle | Priority | Effort |
|---|---|---|---|
| Backend pytest test suite (`chatbot-backend/tests/`) | VI | HIGH | Medium |
| Home-page personalized chapter recommendations | IV | HIGH | Low |
| Docusaurus `ur` i18n locale + language switcher | III | MEDIUM | Medium |
| Lighthouse CI in GitHub Actions | VII | MEDIUM | Low |
| Onboarding: extend ROS experience to 3 levels (none/some/expert) | IV | LOW | Low |
