# Dimsavor — Task Breakdown (TODO.md)
**Version:** 1.1 (Updated)

---

## Phase 0 — Pre-Build Setup

- [x] **U-1** Confirm kitchen codes for all 7 menu products
- [x] **U-2** Confirm Dimsum Mentai 4pcs quota unit rule
- [x] **U-3** Confirm full ITS-area keyword list
- [x] Create Supabase project (free tier) and note URL + service key
- [x] Create Vercel project for frontend and note project ID
- [x] Create Render project for backend (free tier, Python/FastAPI)
- [x] Initialize Git repository in monorepo root
- [x] Add `.gitignore` (exclude `.env`, `__pycache__`, `node_modules`, `.venv`)
- [x] Run Agent Task 0 (project initialization) — see AGENTS.md

---

## Phase 1 — Database Layer

- [x] Run Agent Task 1: generate `001_initial_schema.sql`
  - [x] Verify all 8 tables are present (see SDD.md Section 2)
  - [x] Verify all enum types: `session_status`, `payment_status`, `delivery_status`, `payment_method`, `expense_payer`
  - [x] Verify unique partial index for single-active-session constraint
  - [x] Verify foreign keys and CASCADE deletes
- [x] Run Agent Task 2: generate `002_seed_data.sql`
  - [x] Review `alias_menu` seed — confirm or replace kitchen codes (U-1)
  - [x] Verify `bundle_components` seed (BSweet → 3× bB, BAdil → 1× bB + 3× O + 3× M)
  - [x] Review `area_keywords` seed — add any missing ITS keywords (U-3)
- [x] Run migrations on Supabase dashboard
- [x] Verify all tables exist and seed data is correct in Supabase Table Editor

---

## Phase 2 — Backend: FastAPI Core

- [x] Run Agent Task 3: FastAPI routers
  - [x] `sessions.py` — CRUD + close action + unique-active-session enforcement
  - [x] `slots.py` — CRUD, linked to session, is_free_ongkir toggle
  - [x] `orders.py` — CRUD, pay/send/cancel toggles
  - [x] `kitchen.py` — aggregated production endpoint (calls decomposer)
  - [x] `finance.py` — preview + close batch
  - [x] `alias.py` — alias_menu CRUD
- [x] Run Agent Task 5: utility modules
  - [x] `ongkir.py` — 3-rule priority logic (confirm against PRD.md Section 7)
  - [x] `decomposer.py` — bundle component expansion
  - [x] `quota.py` — dimsum-only box count (add TODO for U-2)
- [x] Set up `requirements.txt` (fastapi, uvicorn, supabase, python-dotenv)
- [x] Set `CORS_ALLOWED_ORIGINS` to Vercel preview URL
- [x] Test all endpoints locally with a `.env` file

---

## Phase 3 — Backend: Parser Module

- [x] Run Agent Task 4: `parser.py`
  - [x] Verify Step 1 (field splitting) handles: `Nama:`, `Pesanan:`, `Alamat:`, `Bayar:`, `Waktu:`
  - [x] Verify Step 3 (alias matching) loads from `alias_menu` table
  - [x] Verify Step 4 (qty extraction) handles: bare integers, "x" notation, unit suffixes
  - [x] Verify Step 5 (topping detection) associates regal/oreo with nearest Bacar item
  - [x] Verify Step 6 (area detection) loads from `area_keywords` table
  - [x] Verify Step 7 (slot matching) compares against active session's slots
  - [x] Verify Step 8 (ongkir) calls `ongkir.py` utility with detected area and slot
  - [x] Verify unmatched tokens are flagged (`_unmatched: true`) in output
- [x] Run unit tests: `pytest backend/tests/test_parser.py`
  - [x] Test: clean WA template input
  - [x] Test: slang / abbreviated input (`roti yummy`, `badil`, etc.)
  - [x] Test: missing fields (no Bayar line, no Waktu line)
  - [x] Test: all 3 ongkir rule combinations
  - [x] Test: bundle item in pesanan
  - [x] Test: unknown product token (should flag, not crash)

---

## Phase 4 — Backend: Tests & Validation

- [x] Unit tests: `test_ongkir.py` — all 7 scenarios from PRD.md Section 8
- [x] Unit tests: `test_decomposer.py` — BSweet, BAdil, non-bundle item
- [x] Unit tests: `test_quota.py` — at limit, over limit, Bacar exclusion, BSweet exclusion, BAdil counts as 1
- [x] Unit tests: `test_finance.py` — profit split formula correctness
- [x] Run Agent Task 8: smoke test
  - [x] Run against local Supabase dev project
  - [x] All assertions pass before moving to Phase 5

---

## Phase 5 — Frontend: React Dashboard

- [x] Run Agent Task 6: scaffold + routing + shared components
  - [x] Verify `Layout.jsx` shows active session name in sidebar
  - [x] Verify `StatusBadge.jsx` renders correct colors per status
  - [x] Verify `ConfirmModal.jsx` is reusable with custom title/body/action
  - [x] Verify `formatRupiah(27000)` → `"Rp 27.000"`
- [x] Run Agent Task 7 (per screen):
  - [x] **Dashboard** — summary cards, production board grid, close batch button
  - [x] **Session Manager** — session list, new session form, slot management with toggles
  - [x] **Order Parser** — textarea input, Review Form with all editable fields, quota impact indicator
  - [x] **Order List** — filter bar, table with optimistic toggles, detail drawer, cancel with modal
  - [x] **Kitchen Board** — date tabs, decomposed production table, summary cards
  - [x] **Finance** — expense tracker, live profit split preview, close batch flow
  - [x] **Alias Manager** — inline-editable alias table

---

## Phase 6 — Integration & Deployment

- [x] Connect all frontend screens to backend API via `client.js`
- [x] Add loading states to all API calls (show spinner on first Render request — may cold-start ~30s)
- [x] Add error states to all API calls (show inline error message, do not crash)
- [x] Add empty state UI for all tables and boards
- [x] Mobile-responsive check (not primary target, but avoid horizontal scroll)
- [x] Deploy frontend to Vercel
  - [x] Set `VITE_API_BASE_URL` environment variable in Vercel project settings
- [x] Deploy backend to Render
  - [x] Set `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CORS_ALLOWED_ORIGINS` in Render dashboard
- [x] Run smoke test against production URLs
- [x] End-to-end test: create session → parse order → confirm → toggle paid → close batch → verify split

---

## Phase 7 — Post-Launch Maintenance

- [x] Populate `alias_menu` with real customer slang discovered from live WA orders
- [x] Add ITS-area keywords to `area_keywords` table via Alias Manager as they are discovered
- [x] Monitor Render free-tier: if cold starts become disruptive, consider a lightweight ping strategy (still free)
- [x] After first real batch closure: verify profit split calculation against manual calculation

---

## Summary: Task-to-Agent Mapping

| TODO Phase | Agent Task (AGENTS.md) |
|---|---|
| Phase 0 | Task 0 |
| Phase 1 | Task 1, Task 2 |
| Phase 2 | Task 3, Task 5 |
| Phase 3 | Task 4 |
| Phase 4 | Task 8 |
| Phase 5 | Task 6, Task 7 |
| Phase 6 | (manual deployment steps) |
