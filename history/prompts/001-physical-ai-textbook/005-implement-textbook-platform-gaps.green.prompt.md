---
id: "005"
title: implement-textbook-platform-gaps
stage: green
date: 2026-03-01
surface: agent
model: claude-sonnet-4-6
feature: 001-physical-ai-textbook
branch: 001-physical-ai-textbook
user: samreensaif
command: /sp.implement
labels: ["implementation","pytest","i18n","personalization","onboarding","chatbot","urdu","rtl"]
links:
  spec: specs/001-physical-ai-textbook/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - chatbot-backend/tests/__init__.py
  - chatbot-backend/tests/conftest.py
  - chatbot-backend/tests/test_health.py
  - chatbot-backend/tests/test_chat.py
  - chatbot-backend/tests/test_ingest.py
  - chatbot-backend/tests/test_personalize.py
  - chatbot-backend/tests/test_translate.py
  - chatbot-backend/pytest.ini
  - chatbot-backend/requirements.txt
  - chatbot-backend/main.py
  - chatbot-backend/.env.example
  - physical-ai-textbook/src/pages/signup.js
  - physical-ai-textbook/src/pages/index.tsx
  - physical-ai-textbook/src/components/PersonalizeButton/index.js
  - physical-ai-textbook/src/components/ChatBot/index.js
  - physical-ai-textbook/docusaurus.config.ts
  - physical-ai-textbook/i18n/ur/docusaurus-theme-classic/navbar.json
  - physical-ai-textbook/i18n/ur/docusaurus-plugin-content-docs/current.json
  - physical-ai-textbook/docs/module2-simulation/chapter3.mdx
  - physical-ai-textbook/docs/module2-simulation/chapter4.mdx
  - physical-ai-textbook/docs/module3-isaac/chapter1.mdx
  - physical-ai-textbook/docs/module3-isaac/chapter2.mdx
  - physical-ai-textbook/docs/module3-isaac/chapter3.mdx
  - physical-ai-textbook/docs/module3-isaac/chapter4.mdx
  - lighthouserc.json
  - .github/workflows/deploy.yml
  - README.md
  - specs/001-physical-ai-textbook/tasks.md
tests:
  - chatbot-backend/tests/test_health.py
  - chatbot-backend/tests/test_chat.py
  - chatbot-backend/tests/test_ingest.py
  - chatbot-backend/tests/test_personalize.py
  - chatbot-backend/tests/test_translate.py
---

## Prompt

/sp.implement

## Response snapshot

Executed the full 58-task implementation plan for the Physical AI & Humanoid Robotics Textbook Platform.
Starting from the checklist (requirements.md 14/14 PASS), proceeded through all 9 phases:

**Phase 2 (T006–T010)**: Created pytest harness — `tests/`, `conftest.py` with AsyncClient fixture,
`test_health.py`, `pytest.ini` with `asyncio_mode=auto`, added pytest/pytest-asyncio/anyio to
`requirements.txt`.

**Phase 3 (T013–T014)**: Added Lighthouse CI to `.github/workflows/deploy.yml` and created
`lighthouserc.json` asserting performance≥0.85 and accessibility≥0.90.

**Phase 4–5 (T017–T019, T024–T025)**: Created `test_chat.py` (valid Q&A, 4000-char limit, session
persistence, /chat-selected valid + 8000-char limit), `test_ingest.py`.

**Phase 6 (T029–T035)**: Refactored `signup.js` — RadioGroup accepts `{value,label}` objects, migrated
`usedROS: bool` → `rosExperience: "none"/"some"/"expert"`, added `isValidEmail()`, `onboardingComplete`
gate, success message. Updated `PersonalizeButton/index.js` (`used_ros` → `ros_experience`). Updated
`main.py` `PersonalizeRequest` (`used_ros: bool` → `ros_experience: str`).

**Phase 7 (T036–T042)**: Completely rewrote `index.tsx` — 16-chapter data array with `gpuRequired`
flags, `getRecommendedChapters()` mapping exp level to chapter IDs, `PersonalizedSection` component
with GPU notice banner, sign-up CTA for anonymous users. Created `test_personalize.py` and
`test_translate.py`.

**Phase 8 (T043–T049)**: Created `tests/test_translate.py` (POST /translate returns Urdu script chars).
Updated `docusaurus.config.ts`: added `ur` locale, `localeConfigs` with `direction:'rtl'`/`htmlLang:'ur'`,
`localeDropdown` navbar item, fixed footer copyright and editUrls. Created
`i18n/ur/docusaurus-theme-classic/navbar.json` and
`i18n/ur/docusaurus-plugin-content-docs/current.json` with Urdu translations.

**Phase 8 continued (T028, T039)**: ChatBot code-only selection detection — sets `__code_only__`
sentinel, renders informational tooltip instead of "Ask about this". Added `gpu_required: true`
frontmatter to 6 GPU-intensive chapter MDX files (module2 ch3–4, module3 ch1–4).

**Phase 9 (T053–T054, T056)**: Updated `.env.example` with all config.py vars including optional RAG
parameters. Updated `README.md` with correct live site URL, added pytest instructions, added
personalize/translate to API endpoint table. (T056 already completed — footer copyright fixed.)

Updated `tasks.md` with all completed task checkboxes marked `[X]`.

## Outcome

- ✅ Impact: Closed all 4 Constitution gaps identified in plan.md — pytest harness created (Principle VI),
  home-page personalization implemented (Principle IV), Docusaurus `ur` i18n locale configured with RTL
  (Principle III), Lighthouse CI added (Principle VII). Total: 46 of 58 tasks completed; 12 remaining
  are manual verification steps (T015–T016, T020–T023, T026–T027, T045, T050–T051, T055, T057–T058)
  or require live credentials.
- 🧪 Tests: 5 test files created — test_health.py (1), test_chat.py (4), test_ingest.py (1),
  test_personalize.py (2), test_translate.py (2). All require live backend credentials to run green.
- 📁 Files: 28 files created/modified across frontend, backend, CI, and docs.
- 🔁 Next prompts: Run `pytest chatbot-backend/tests/ -v` with live .env, run
  `npm run build -- --locale ur` to verify RTL HTML output, deploy to GitHub Pages and validate
  live site.
- 🧠 Reflection: The "file not yet read" error from the Write/Edit tool required re-reading files
  immediately before edits in the same session. Coordinating 3 interconnected `rosExperience` changes
  (signup.js, PersonalizeButton, main.py) required careful sequencing. The T040 RecommendedChapters
  component was integrated directly into index.tsx instead of a separate file, which was simpler
  and avoided extra import complexity.

## Evaluation notes (flywheel)

- Failure modes observed: Write/Edit tool "file not yet read" error when too many tool calls elapsed
  between Read and Write; Python heredoc syntax conflicts with bash `${}`; PowerShell backtick
  escaping issues in multi-line strings.
- Graders run and results (PASS/FAIL): requirements.md checklist 14/14 PASS (auto-checked at start)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Add `--no-build` option to Lighthouse CI step so it
  uses the already-built site from the previous step rather than re-building.
