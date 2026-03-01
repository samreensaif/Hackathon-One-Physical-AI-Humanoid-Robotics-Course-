---

description: "Task list for Physical AI & Humanoid Robotics Textbook Platform"
---

# Tasks: Physical AI & Humanoid Robotics Textbook Platform

**Input**: Design documents from `/specs/001-physical-ai-textbook/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/api.md ✅

**Context**: The core platform is ~75% implemented. Tasks focus on:
(a) adding the pytest test suite (Constitution gap — Principle VI),
(b) implementing the 5 identified feature gaps from research.md, and
(c) verifying all 6 user stories meet their acceptance criteria.

**Tests**: Included — Constitution Principle VI (Test-First, NON-NEGOTIABLE) requires a pytest suite
for all backend endpoints. The plan.md Constitution Check identified test absence as a HIGH-priority gap.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `physical-ai-textbook/src/`, `physical-ai-textbook/docs/`
- **Backend**: `chatbot-backend/`
- **CI/CD**: `.github/workflows/`
- **Specs**: `specs/001-physical-ai-textbook/`

---

## Phase 1: Setup (Environment Verification)

**Purpose**: Confirm development environment is correctly configured before implementing any gap.

- [X] T001 Verify Node 20+ and Python 3.11+ are installed; confirm `npm install` succeeds in `physical-ai-textbook/`
- [X] T002 [P] Copy `chatbot-backend/.env.example` to `chatbot-backend/.env` and fill in all required credentials (OPENAI_API_KEY, QDRANT_URL, QDRANT_API_KEY, NEON_DATABASE_URL, ALLOWED_ORIGINS)
- [X] T003 [P] Verify `uvicorn main:app --reload --port 8000` starts without errors in `chatbot-backend/`
- [X] T004 Run `python chatbot-backend/ingest.py` and confirm ~187 chunks uploaded to Qdrant `textbook_chunks` collection
- [X] T005 Run `cd physical-ai-textbook && npm start` and confirm site loads at `http://localhost:3000`

**Checkpoint**: All 5 setup tasks pass → local dev environment is confirmed working.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the pytest infrastructure required by Constitution Principle VI.
All endpoint tests (US2–US6) depend on this foundation.

**⚠️ CRITICAL**: No user story test tasks can be written until the pytest harness exists.

- [X] T006 Create `chatbot-backend/tests/` directory and add `chatbot-backend/tests/__init__.py` (empty)
- [X] T007 [P] Add `pytest`, `pytest-asyncio`, `httpx` to `chatbot-backend/requirements.txt` and install
- [X] T008 Create `chatbot-backend/tests/conftest.py` with an `AsyncClient` fixture pointing at `main.app` using `httpx.AsyncTransport(app=app)` base URL `http://testserver`
- [X] T009 [P] Create `chatbot-backend/tests/test_health.py` — write one test: `GET /health` returns 200 with `status == "ok"`; run pytest and confirm it FAILS (red) before verifying the endpoint is live
- [X] T010 Add `pytest.ini` (or `pyproject.toml [tool.pytest.ini_options]`) at `chatbot-backend/` with `asyncio_mode = "auto"` to support async tests

**Checkpoint**: `pytest chatbot-backend/tests/` runs without import errors and `test_health.py` is passing green.

---

## Phase 3: User Story 1 — Read Textbook Content (Priority: P1) 🎯 MVP

**Goal**: Confirm all 16 chapters render correctly on GitHub Pages; navigation works; Lighthouse CI enforced.

**Independent Test**: Deploy to GitHub Pages, navigate all 4 modules and 8 representative chapters, confirm
zero 404 errors, correct prev/next navigation, and Lighthouse scores ≥ 85/90.

### Implementation for User Story 1

- [X] T011 [P] [US1] Run `cd physical-ai-textbook && npm run build` and confirm zero errors and zero broken-link warnings across all 16 chapter MDX files
- [X] T012 [P] [US1] Verify sidebar structure in `physical-ai-textbook/sidebars.ts` lists all 16 chapters across 4 modules; fix any missing entries
- [X] T013 [US1] Add Lighthouse CI job to `.github/workflows/deploy.yml`: install `@lhci/cli`, run `lhci autorun` against the built site, assert `performance >= 85` and `accessibility >= 90`; add `lighthouserc.json` at repo root with these thresholds
- [X] T014 [US1] Create `lighthouserc.json` at repo root with configuration: `{ "ci": { "collect": { "staticDistDir": "./physical-ai-textbook/build" }, "assert": { "assertions": { "categories:performance": ["warn", { "minScore": 0.85 }], "categories:accessibility": ["error", { "minScore": 0.90 }] } } } }`
- [ ] T015 [US1] Verify all `<img>` elements in `physical-ai-textbook/docs/` MDX files have `alt` text (Accessibility Principle VII); add missing `alt` attributes
- [ ] T016 [P] [US1] Manually navigate prev/next links on `module1-ros2/chapter4` → `module2-simulation/chapter1` boundary and `module3-isaac/chapter4` → `module4-vla/chapter1` boundary; confirm correct cross-module navigation

**Checkpoint**: `npm run build` succeeds with zero errors; Lighthouse CI job added to deploy.yml; all chapters accessible.

---

## Phase 4: User Story 2 — RAG Chatbot Q&A (Priority: P2)

**Goal**: Add pytest contract tests for `/chat`, `/chat-selected`, and `/ingest`; verify chatbot widget
on every page; confirm citation appears on every response.

**Independent Test**: With backend running and content indexed, ask 5 questions covering each module.
All responses return within 5s with at least one source citation. `pytest chatbot-backend/tests/` passes.

### Tests for User Story 2 ⚠️ (Constitution Principle VI — write FIRST, verify FAIL, then green)

- [X] T017 [P] [US2] Create `chatbot-backend/tests/test_chat.py`: write test `POST /chat` with valid question returns 200, `answer` is non-empty string, `session_id` is UUID, `sources` is non-empty list each with `source`, `title`, `score` fields
- [X] T018 [P] [US2] In `chatbot-backend/tests/test_chat.py`: write test `POST /chat` with question exceeding 4000 chars returns 422 (Pydantic validation)
- [X] T019 [P] [US2] Create `chatbot-backend/tests/test_ingest.py`: write test `POST /ingest` returns 200 with `files > 0`, `chunks > 0`, `points_upserted > 0`

### Implementation for User Story 2

- [ ] T020 [US2] Verify `physical-ai-textbook/src/theme/Root.js` mounts `<ChatBot />` globally; confirm chatbot 💬 button renders on `/` homepage and on `module1-ros2/chapter1` chapter page
- [ ] T021 [US2] Verify `chatbot-backend/main.py` `_chat_core` always returns at least one entry in `sources[]`; if Qdrant returns empty results add a fallback source citation of `"No specific section found"`
- [ ] T022 [US2] Verify `chatbot-backend/main.py` CORS origins include `https://samreensaif.github.io` and `http://localhost:3000`; update `ALLOWED_ORIGINS` in `.env.example` if missing
- [ ] T023 [US2] Test multi-turn conversation: send 6 sequential messages using the same `session_id`; verify `get_recent_messages` in `chatbot-backend/database.py` returns the 6 most recent messages in order

**Checkpoint**: All 3 test files pass green; chatbot renders on every page with citation in response.

---

## Phase 5: User Story 3 — Text Selection Query (Priority: P3)

**Goal**: Add pytest test for `/chat-selected`; verify text selection UI flow end-to-end.

**Independent Test**: Select a passage from any chapter, click "Ask about this", submit a question,
confirm the response references the selected text and includes a source citation.

### Tests for User Story 3 ⚠️

- [X] T024 [P] [US3] In `chatbot-backend/tests/test_chat.py`: add test `POST /chat-selected` with valid `question` and `selected_text` returns 200 with non-empty `answer` and at least one source in `sources[]`
- [X] T025 [P] [US3] In `chatbot-backend/tests/test_chat.py`: add test `POST /chat-selected` with `selected_text` exceeding 8000 chars returns 422

### Implementation for User Story 3

- [ ] T026 [US3] Review `physical-ai-textbook/src/components/ChatBot/index.js`: confirm `mouseup` event listener is attached to `document` and shows the "Ask about this" floating button when `window.getSelection().toString().trim()` length > 10 characters
- [ ] T027 [US3] In `physical-ai-textbook/src/components/ChatBot/index.js`: verify that clicking "Ask about this" populates `selected_text` in the request body to `POST /chat-selected` (not `/chat`); add console.log trace to confirm correct endpoint during manual testing
- [X] T028 [US3] Handle edge case in `physical-ai-textbook/src/components/ChatBot/index.js`: if selected text is from a `<code>` element only, show informational tooltip "Select prose text to ask about" instead of "Ask about this"

**Checkpoint**: `/chat-selected` tests pass green; text selection UI shows button on prose selection; code-only selection shows informational tooltip.

---

## Phase 6: User Story 4 — Sign Up & Onboarding (Priority: P4)

**Goal**: Extend ROS experience field from boolean to 3-level enum; add form validation;
update backend Pydantic model to match.

**Independent Test**: Complete signup + onboarding from incognito window with each ROS experience level
(none/some/expert). Verify profile stored in localStorage with correct `rosExperience` field.

### Implementation for User Story 4

- [X] T029 [US4] Update `physical-ai-textbook/src/pages/signup.js` step-2 onboarding: replace "Used ROS Before: Yes | No" radio buttons with 3-option radio group: "None — I've never used ROS", "Some — I've dabbled with ROS 1 or ROS 2", "Expert — I'm proficient with ROS 2"
- [X] T030 [US4] In `physical-ai-textbook/src/pages/signup.js`: update stored `profile` object key from `usedRos: boolean` to `rosExperience: "none" | "some" | "expert"` in `localStorage['auth_user']`
- [X] T031 [US4] Update `physical-ai-textbook/src/components/PersonalizeButton/index.js`: change request body field from `used_ros: boolean` to `ros_experience: string` when calling `POST /personalize`
- [X] T032 [US4] Update `chatbot-backend/main.py` `PersonalizeRequest` Pydantic model: replace `used_ros: bool = False` with `ros_experience: str = "none"` (accepts "none", "some", "expert"); update the personalization system prompt to reference ROS experience level text instead of Yes/No
- [X] T033 [P] [US4] Add client-side validation to `physical-ai-textbook/src/pages/signup.js` step-1: show inline error if email format is invalid or password length < 6 chars before allowing form submission
- [X] T034 [P] [US4] Add client-side validation to `physical-ai-textbook/src/pages/signup.js` step-2: disable "Complete Setup" button until all 4 onboarding questions are answered; show visual indicator for unanswered questions
- [X] T035 [US4] Add success toast/notification in `physical-ai-textbook/src/pages/signup.js` after onboarding completion: "Welcome, {name}! Your personalized learning path is ready." before redirecting to homepage

**Checkpoint**: Signup + onboarding flow works end-to-end with 3-level ROS field; profile stored with `rosExperience`; form validation prevents invalid submissions.

---

## Phase 7: User Story 5 — Personalized Content Experience (Priority: P5)

**Goal**: Add home-page chapter recommendations driven by onboarding profile; add GPU-required indicators
on relevant chapters.

**Independent Test**: Create two accounts (beginner/no GPU vs. advanced/GPU). Navigate to homepage
after login. Verify different chapter sections are highlighted for each profile.

### Implementation for User Story 5

- [X] T036 [US5] Update `physical-ai-textbook/src/pages/index.tsx`: on mount, read `localStorage['auth_user']` and extract `profile.experienceLevel`, `profile.hasGpu`, `profile.rosExperience`; store in React state `userProfile`
- [X] T037 [US5] In `physical-ai-textbook/src/pages/index.tsx`: add a "Recommended for You" section that renders conditionally when `userProfile` is not null; map experience level to chapter recommendations:
  - Beginner → highlight Module 1 (ROS 2) chapters 1–2
  - Intermediate → highlight Module 1 ch3–4 + Module 2 ch1–2
  - Advanced → highlight Module 3 (Isaac) + Module 4 (VLA) chapters
- [X] T038 [US5] In `physical-ai-textbook/src/pages/index.tsx`: when `userProfile.hasGpu === false`, display a notice banner: "💡 Some chapters use GPU simulation — marked with 🖥️. Skip these or use cloud GPU alternatives." at the top of the recommendations section
- [X] T039 [US5] Add `gpu_required: true` YAML frontmatter to GPU-intensive chapter MDX files: `module2-simulation/chapter3.mdx`, `module2-simulation/chapter4.mdx`, `module3-isaac/chapter1.mdx`, `module3-isaac/chapter2.mdx`, `module3-isaac/chapter3.mdx`, `module3-isaac/chapter4.mdx`
- [X] T040 [US5] Create `physical-ai-textbook/src/components/HomepageFeatures/RecommendedChapters.tsx`: a React component that accepts `userProfile` prop and renders a list of recommended chapter cards with title, module, and a GPU badge (🖥️) if `gpu_required` — integrated directly into `index.tsx`
- [X] T041 [P] [US5] Add personalization fallback in `physical-ai-textbook/src/pages/index.tsx`: when `userProfile` is null (unauthenticated or no onboarding), show a "Get personalized recommendations → Sign Up" call-to-action card instead of the recommendations section
- [X] T042 [P] [US5] Add pytest test in `chatbot-backend/tests/test_personalize.py`: `POST /personalize` with `experience_level="Advanced"`, `ros_experience="expert"`, `has_gpu=true` returns 200 with non-empty `personalized_content` string

**Checkpoint**: Logged-in users see personalized chapter recommendations on homepage; GPU notice shown for users without GPU; unauthenticated users see sign-up CTA.

---

## Phase 8: User Story 6 — Urdu Translation (Priority: P6)

**Goal**: Add Docusaurus `ur` i18n locale with static translations for all primary UI navigation labels;
verify RTL layout; verify TranslateButton per-page translation still works.

**Independent Test**: Add `ur` to Docusaurus locales. Run `npm run build -- --locale ur`. Confirm
navbar and sidebar labels render in Urdu with RTL layout. TranslateButton still renders translated chapter body.

### Tests for User Story 6 ⚠️

- [X] T043 [P] [US6] Add pytest test in `chatbot-backend/tests/test_translate.py`: `POST /translate` with `text="Hello World"` and `target_language="urdu"` returns 200 with non-empty `translated_text`; verify response contains at least one Urdu/Arabic script character (regex `[\u0600-\u06FF]`)

### Implementation for User Story 6

- [X] T044 [US6] Update `physical-ai-textbook/docusaurus.config.ts` i18n section: add `"ur"` to the `locales` array → `locales: ["en", "ur"]`; set `defaultLocale: "en"`
- [ ] T045 [US6] Run `cd physical-ai-textbook && npm run write-translations -- --locale ur` to generate translation template files in `physical-ai-textbook/i18n/ur/`
- [X] T046 [US6] Translate `physical-ai-textbook/i18n/ur/docusaurus-theme-classic/navbar.json` navbar labels: "Tutorial" → "ٹیوٹوریل", "Blog" → "بلاگ", "GitHub" → "گٹ ہب", sign-in/up button labels as applicable
- [X] T047 [US6] Translate `physical-ai-textbook/i18n/ur/docusaurus-plugin-content-docs/current.json` sidebar category labels: "Module 1: ROS 2 Fundamentals" → "ماڈیول 1: ROS 2 بنیادیات", all 4 module names and "Introduction" entry
- [X] T048 [US6] Add `dir="rtl"` and `lang="ur"` to `physical-ai-textbook/docusaurus.config.ts` i18n `localeConfigs` so the Docusaurus HTML root gets correct RTL direction when building with `--locale ur`
- [X] T049 [US6] Add language switcher to `physical-ai-textbook/docusaurus.config.ts` navbar items: `{ type: "localeDropdown", position: "right" }` — this renders a native Docusaurus locale picker
- [ ] T050 [US6] Run `cd physical-ai-textbook && npm run build -- --locale ur` and confirm zero build errors; check that generated HTML for any chapter page has `<html dir="rtl" lang="ur">`
- [ ] T051 [P] [US6] Verify `physical-ai-textbook/src/components/TranslateButton/index.js` still applies `dir="rtl" lang="ur"` on the translated output container; this should be unaffected by i18n locale addition

**Checkpoint**: `npm run build -- --locale ur` succeeds; navbar and sidebar render Urdu labels; locale switcher dropdown visible in navbar; TranslateButton still works.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final gap closures, documentation, and validation.

- [X] T052 [P] Update `chatbot-backend/requirements.txt` with pytest, pytest-asyncio, httpx if not already added in T007; run `pip install -r requirements.txt` and confirm no conflicts
- [X] T053 [P] Update `chatbot-backend/.env.example` to document any new environment variables introduced during implementation (confirm all vars from `config.py` are listed with descriptions)
- [X] T054 [P] Update `README.md`: replace placeholder `YOUR_GITHUB_USERNAME` with `samreensaif`; update live site URL; add "Run tests: `pytest chatbot-backend/tests/`" to the Running Locally section
- [ ] T055 Run full quickstart.md validation: execute each command in `specs/001-physical-ai-textbook/quickstart.md` from a clean terminal and confirm all 5 verification steps pass
- [X] T056 [P] Fix `physical-ai-textbook/docusaurus.config.ts` footer copyright: replace "My Project, Inc." with "Physical AI & Humanoid Robotics Textbook" and update editUrl from facebook/docusaurus placeholder to the correct GitHub repo URL
- [ ] T057 Run complete pytest suite: `pytest chatbot-backend/tests/ -v` and confirm all tests pass; record test count in a comment at top of `chatbot-backend/tests/conftest.py`
- [ ] T058 [P] Run `cd physical-ai-textbook && npm run build` one final time after all changes; confirm zero errors, zero broken links, site builds successfully

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all pytest tasks
- **US1 (Phase 3)**: Depends on Phase 2 — Lighthouse CI (T013–T014) is independent of pytest
- **US2 (Phase 4)**: Depends on Phase 2 (pytest harness from T006–T010)
- **US3 (Phase 5)**: Depends on Phase 4 (uses same `test_chat.py` file)
- **US4 (Phase 6)**: Depends on Phase 2; backend Pydantic change (T032) is independent of frontend (T029–T031)
- **US5 (Phase 7)**: Depends on Phase 6 (needs `rosExperience` field from T030 to be in localStorage)
- **US6 (Phase 8)**: Depends on Phase 1 only (frontend-only changes + one backend test)
- **Polish (Phase 9)**: Depends on all user story phases

### User Story Dependencies

- **US1**: No story dependencies — verify existing content
- **US2**: No story dependencies — backend tests and widget verification
- **US3**: Depends on US2 test file (`test_chat.py` already created)
- **US4**: No story dependencies — onboarding extension is self-contained
- **US5**: Depends on US4 (needs `rosExperience` in localStorage schema from T030)
- **US6**: No story dependencies — Docusaurus i18n is independent

### Within Each User Story

- Tests MUST be written and confirmed FAILING before implementation tasks begin (Principle VI)
- Frontend and backend tasks for the same story can run in parallel (different files)
- Data model changes (T030) must complete before UI that reads the new field (T036–T038)
- T044–T045 (Docusaurus locale setup) must complete before T046–T048 (translation file edits)

### Parallel Opportunities

```bash
# Phase 1: All setup tasks in parallel (different concerns)
T001 (verify tools) || T002 (env vars) || T003 (backend start) # then T004, T005

# Phase 2: T007 and T009 in parallel after T006 and T008
T006 → (T007 || T009) → T010

# Phase 3: T011 and T012 in parallel, T013 + T014 together, T015 + T016 parallel
(T011 || T012) then (T013 + T014) and (T015 || T016)

# Phase 4: Tests and backend verification in parallel
(T017 || T018 || T019) then (T020 || T021 || T022) then T023

# Phase 6: Frontend and backend onboarding changes in parallel
(T029 → T030 → T031) || (T032)  # frontend chain || backend Pydantic
(T033 || T034) then T035

# Phase 7: Frontend state (T036→T037→T038) || GPU frontmatter (T039) || Component (T040)
(T036 → T037 → T038) || T039 || (T041 || T042)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (pytest harness)
3. Complete Phase 3: US1 (content verification + Lighthouse CI)
4. **STOP and VALIDATE**: All 16 chapters load; Lighthouse scores met; zero broken links
5. Deploy to GitHub Pages — this is independently valuable without auth, chatbot, or Urdu

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → **Deploy** — Content textbook MVP on GitHub Pages
3. US2 → **Deploy** — Add verified RAG chatbot (backend tests green)
4. US3 → **Deploy** — Add text selection queries
5. US4 → **Deploy** — Enhanced onboarding with 3-level ROS experience
6. US5 → **Deploy** — Personalized home-page recommendations
7. US6 → **Deploy** — Urdu i18n locale with language switcher
8. Polish → Final documentation and validation pass

### Parallel Team Strategy

With two developers:
- **Dev A**: Phases 2, 4, 5 (backend pytest suite and chat tests)
- **Dev B**: Phases 3, 6, 7 (Lighthouse CI, onboarding extension, home-page recommendations)
- Phase 8 (Urdu i18n): either developer after Phase 3 is complete

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in the same phase
- [Story] label maps task to specific user story for traceability
- Tasks T006–T010 (pytest harness) MUST complete before any test marked ⚠️ can be written
- The `test_personalize.py` (T042) and `test_translate.py` (T043) tests are self-contained (stateless endpoints) — they can run with mocked OpenAI responses in CI
- Commit after each checkpoint (end of each Phase) to ensure rollback points
- Avoid editing the same file from parallel tasks in the same phase
- Constitution Principle VI compliance: all test tasks marked ⚠️ must be FAILING (red) before their implementation tasks are attempted
