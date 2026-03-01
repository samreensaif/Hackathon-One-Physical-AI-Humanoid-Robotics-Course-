---
id: "004"
title: Physical AI Textbook Implementation Tasks
stage: tasks
date: 2026-03-01
surface: agent
model: claude-sonnet-4-6
feature: 001-physical-ai-textbook
branch: 001-physical-ai-textbook
user: architext
command: /sp.tasks
labels: ["tasks","pytest","lighthouse","urdu-i18n","personalization","onboarding","rag","constitution-gap"]
links:
  spec: specs/001-physical-ai-textbook/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-physical-ai-textbook/tasks.md
  - history/prompts/001-physical-ai-textbook/004-physical-ai-textbook-tasks.tasks.prompt.md
tests:
  - N/A — task generation artifact, no tests run
---

## Prompt

(empty — /sp.tasks invoked with no additional arguments)

## Response snapshot

Generated `specs/001-physical-ai-textbook/tasks.md` with 58 tasks across 9 phases:

Phase 1 — Setup (T001–T005, 5 tasks): Environment verification
Phase 2 — Foundational (T006–T010, 5 tasks): pytest harness (Constitution Principle VI gap)
Phase 3 — US1 Read Content (T011–T016, 6 tasks): Lighthouse CI, broken-link check, nav verification
Phase 4 — US2 RAG Chatbot (T017–T023, 7 tasks): /chat, /chat-selected, /ingest contract tests + widget verify
Phase 5 — US3 Text Selection (T024–T028, 5 tasks): /chat-selected tests + selection UI edge case
Phase 6 — US4 Onboarding (T029–T035, 7 tasks): ROS 3-level field, form validation, success toast
Phase 7 — US5 Personalization (T036–T042, 7 tasks): Home-page recommendations, GPU badges, fallback
Phase 8 — US6 Urdu i18n (T043–T051, 9 tasks): Docusaurus ur locale, RTL, locale dropdown, translate test
Phase 9 — Polish (T052–T058, 7 tasks): Docs, final build validation, test suite run

Key design choices:
- Tests included (Constitution Principle VI NON-NEGOTIABLE; test absence was a HIGH gap in plan.md)
- Incremental delivery: each US phase is independently deployable
- US5 (personalization) depends on US4 (new rosExperience field in localStorage)
- US3 (text selection) reuses US2 test_chat.py file (dependency noted)
- Parallel execution maps provided for each phase

## Outcome

- ✅ Impact: 58 actionable tasks targeting 5 implementation gaps + verification of existing ~75% implementation.
- 🧪 Tests: 8 pytest test tasks across 4 test files; all marked ⚠️ (write red before green).
- 📁 Files: specs/001-physical-ai-textbook/tasks.md
- 🔁 Next prompts: /sp.implement to begin executing tasks, or /sp.git.commit_pr to commit spec artifacts
- 🧠 Reflection: The largest implementation gap is the pytest suite (5 foundational tasks). The Urdu i18n
  locale has the most tasks (9) but they're largely mechanical (translation string edits). Home-page
  personalization (US5) has the most product risk — the recommendation algorithm needs UX validation.

## Evaluation notes (flywheel)

- Failure modes observed: None — all prerequisite documents were available; check-prerequisites.ps1 ran cleanly.
- Graders run and results (PASS/FAIL): Task format validation — all 58 tasks follow `- [ ] TN [P?] [US?] description with/file/path` format.
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Run /sp.implement starting from Phase 2 (T006–T010) to establish pytest harness before any other work.
