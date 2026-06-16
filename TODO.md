# Dimsavor — Task Breakdown (TODO.md)
**Version:** 1.1 (Updated)

---

## Phase 0 — Pre-Build Setup

- [x] **U-1** Confirm kitchen codes for all 7 menu products
- [x] **U-2** Confirm Dimsum Mentai 4pcs quota unit rule
- [x] **U-3** Confirm full ITS-area keyword list
- [ ] Create Supabase project (free tier) and note URL + service key
- [ ] Create Vercel project for frontend and note project ID
- [ ] Create Render project for backend (free tier, Python/FastAPI)
- [ ] Initialize Git repository in monorepo root
- [ ] Add `.gitignore` (exclude `.env`, `__pycache__`, `node_modules`, `.venv`)
- [ ] Run Agent Task 0 (project initialization) — see AGENTS.md

---

## Phase 1 — Database Layer

- [ ] Run Agent Task 1: generate `001_initial_schema.sql`
  - [ ] Verify all 8 tables are present (see SDD.md Section 2)
  - [ ] Verify all enum types: `session_status`, `payment_status`, `delivery_status`, `payment_method`, `expense_payer`
  - [ ] Verify unique partial index for single-active-session constraint
  - [ ] Verify foreign keys and CASCADE deletes
- [ ] Run Agent Task 2: generate `002_seed_data.sql`
  - [ ] Review `alias_menu` seed — confirm or replace kitchen codes (U-1)
  - [ ] Verify `bundle_components` seed (BSweet → 3× bB, BAdil → 1× bB + 3× O + 3× M)
  - [ ] Review `area_keywords` seed — add any missing ITS keywords (U-3)
- [ ] Run migrations on Supabase dashboard
- [ ] Verify all tables exist and seed data is correct in Supabase Table Editor

---

## Phase 2 — Backend: FastAPI Core

- [ ] Run Agent Task 3: FastAPI routers
  - [ ] `sessions.py` — CRUD + close action + unique-active-session enforcement
  - [ ] `slots.py` — CRUD, linked to session, is_free_ongkir toggle
  - [ ] `orders.py` — CRUD, pay/send/cancel toggles
  - [ ] `kitchen.py` — aggregated production endpoint (calls decomposer)
  - [ ] `finance.py` — preview + close batch
  - [ ] `alias.py` — alias_menu CRUD
- [ ] Run Agent Task 5: utility modules
  - [ ] `ongkir.py` — 3-rule priority logic (confirm against PRD.md Section 7)
  - [ ] `decomposer.py` — bundle component expansion
  - [ ] `quota.py` — dimsum-only box count (add TODO for U-2)
- [ ] Set up `requirements.txt` (fastapi, uvicorn, supabase, python-dotenv)
- [ ] Set `CORS_ALLOWED_ORIGINS` to Vercel preview URL
- [ ] Test all endpoints locally with a `.env` file

---

## Phase 3 — Backend: Parser Module

- [ ] Run Agent Task 4: `parser.py`
  - [ ] Verify Step 1 (field splitting) handles: `Nama:`, `Pesanan:`, `Alamat:`, `Bayar:`, `Waktu:`
  - [ ] Verify Step 3 (alias matching) loads from `alias_menu` table
  - [ ] Verify Step 4 (qty extraction) handles: bare integers, "x" notation, unit suffixes
  - [ ] Verify Step 5 (topping detection) associates regal/oreo with nearest Bacar item
  - [ ] Verify Step 6 (area detection) loads from `area_keywords` table
  - [ ] Verify Step 7 (slot matching) compares against active session's slots
  - [ ] Verify Step 8 (ongkir) calls `ongkir.py` utility with detected area and slot
  - [ ] Verify unmatched tokens are flagged (`_unmatched: true`) in output
- [ ] Run unit tests: `pytest backend/tests/test_parser.py`
  - [ ] Test: clean WA template input
  - [ ] Test: slang / abbreviated input (`roti yummy`, `badil`, etc.)
  - [ ] Test: missing fields (no Bayar line, no Waktu line)
  - [ ] Test: all 3 ongkir rule combinations
  - [ ] Test: bundle item in pesanan
  - [ ] Test: unknown product token (should flag, not crash)

---

## Phase 4 — Backend: Tests & Validation

- [ ] Unit tests: `test_ongkir.py` — all 7 scenarios from PRD.md Section 8
- [ ] Unit tests: `test_decomposer.py` — BSweet, BAdil, non-bundle item
- [ ] Unit tests: `test_quota.py` — at limit, over limit, Bacar exclusion, BSweet exclusion, BAdil counts as 1
- [ ] Unit tests: `test_finance.py` — profit split formula correctness
- [ ] Run Agent Task 8: smoke test
  - [ ] Run against local Supabase dev project
  - [ ] All assertions pass before moving to Phase 5

---

## Phase 5 — Frontend: React Dashboard

- [ ] Run Agent Task 6: scaffold + routing + shared components
  - [ ] Verify `Layout.jsx` shows active session name in sidebar
  - [ ] Verify `StatusBadge.jsx` renders correct colors per status
  - [ ] Verify `ConfirmModal.jsx` is reusable with custom title/body/action
  - [ ] Verify `formatRupiah(27000)` → `"Rp 27.000"`
- [ ] Run Agent Task 7 (per screen):
  - [ ] **Dashboard** — summary cards, production board grid, close batch button
  - [ ] **Session Manager** — session list, new session form, slot management with toggles
  - [ ] **Order Parser** — textarea input, Review Form with all editable fields, quota impact indicator
  - [ ] **Order List** — filter bar, table with optimistic toggles, detail drawer, cancel with modal
  - [ ] **Kitchen Board** — date tabs, decomposed production table, summary cards
  - [ ] **Finance** — expense tracker, live profit split preview, close batch flow
  - [ ] **Alias Manager** — inline-editable alias table

---

## Phase 6 — Integration & Deployment

- [ ] Connect all frontend screens to backend API via `client.js`
- [ ] Add loading states to all API calls (show spinner on first Render request — may cold-start ~30s)
- [ ] Add error states to all API calls (show inline error message, do not crash)
- [ ] Add empty state UI for all tables and boards
- [ ] Mobile-responsive check (not primary target, but avoid horizontal scroll)
- [ ] Deploy frontend to Vercel
  - [ ] Set `VITE_API_BASE_URL` environment variable in Vercel project settings
- [ ] Deploy backend to Render
  - [ ] Set `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CORS_ALLOWED_ORIGINS` in Render dashboard
- [ ] Run smoke test against production URLs
- [ ] End-to-end test: create session → parse order → confirm → toggle paid → close batch → verify split

---

## Phase 7 — Post-Launch Maintenance

- [ ] Populate `alias_menu` with real customer slang discovered from live WA orders
- [ ] Add ITS-area keywords to `area_keywords` table via Alias Manager as they are discovered
- [ ] Monitor Render free-tier: if cold starts become disruptive, consider a lightweight ping strategy (still free)
- [ ] After first real batch closure: verify profit split calculation against manual calculation

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
