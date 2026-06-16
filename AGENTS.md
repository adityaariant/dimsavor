# Dimsavor — CLI Scaffolding Agent Guide (AGENTS.md)
**Version:** 1.0

---

## 1. Purpose & Role

This document defines how to operate the CLI AI coding agent (e.g. Claude Code) to build the Dimsavor web application. The agent's sole role is **code generation and scaffolding during development**. It is not part of the deployed application and is not used in daily operations.

The agent reads the project documentation suite (PRD, SRS, SDD, UIUX_FLOW) as its source of truth and generates a full-stack codebase: Supabase migrations, FastAPI backend, and React frontend.

---

## 2. Document Reading Order (Agent Initialization)

Before any code generation task, the agent must read documents in this order:

```
1. PRD.md       → Business rules, menu, quota, ongkir logic
2. SRS.md       → All functional requirements and business rules
3. SDD.md       → Database schema, API design, component architecture
4. UIUX_FLOW.md → Screen-by-screen layout and interactions
5. TODO.md      → Task sequence and pending confirmations
```

---

## 3. Agent System Prompt (Use This When Starting a Session)

```
You are building Dimsavor, a zero-budget internal mini-ERP for a home 
dimsum business. Your full specification is in PRD.md, SRS.md, SDD.md, 
and UIUX_FLOW.md located in this project directory.

Constraints:
- Never use paid APIs, paid hosting, or paid services anywhere in the application code
- Never call any LLM or AI API from the application itself
- Always use environment variables for Supabase credentials (never hardcode them)
- Always ask for confirmation before overwriting existing files
- All parser output must be presented to admin before DB write — never auto-save parsed orders
- Never use localStorage or sessionStorage in React code
- Follow the database schema in SDD.md exactly — do not add tables or columns not specified there
- When you are uncertain about a business rule, check PRD.md first, then SRS.md
- Items marked [Unverified] or [Inference] in the docs require admin confirmation before implementation — flag them with a TODO comment in code

Stack: React (Vite) + Tailwind CSS on Vercel | FastAPI (Python) on Render | 
Supabase (PostgreSQL free tier)
```

---

## 4. Monorepo Structure (Expected Output)

```
dimsavor/
├── README.md
├── .gitignore
├── docs/               ← (this document suite)
├── frontend/
│   ├── .env.example
│   ├── vite.config.js
│   ├── package.json
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── api/client.js
│       ├── components/
│       ├── screens/
│       └── utils/
└── backend/
    ├── .env.example
    ├── requirements.txt
    ├── main.py
    ├── app/
    │   ├── routers/
    │   ├── utils/
    │   └── parser.py
    ├── migrations/
    │   ├── 001_initial_schema.sql
    │   └── 002_seed_data.sql
    └── tests/
```

---

## 5. Task Sequence & Prompts

Run tasks in order. Each task produces files listed under "Output."

---

### Task 0 — Project Initialization

**Prompt:**
> "Initialize a monorepo with `/frontend` (Vite + React + Tailwind CSS) and `/backend` (FastAPI + Python 3.11). Add `.env.example` for both with all keys listed in SDD.md Section 8. Add a root `.gitignore` that excludes `.env`, `__pycache__`, `node_modules`, `.venv`. Add a root `README.md` that describes the project and references this AGENTS.md."

**Output:** `frontend/`, `backend/`, `README.md`, `.gitignore`

---

### Task 1 — Database Migration

**Prompt:**
> "Generate a complete Supabase PostgreSQL migration file from the schema in SDD.md Section 2. Include: all enum types, all 8 tables with columns, constraints, foreign keys, and indexes. Add the unique partial index for one-active-session constraint. File: `/backend/migrations/001_initial_schema.sql`"

**Output:** `backend/migrations/001_initial_schema.sql`

**Agent must flag:** The `[Unverified]` kitchen codes and the Dimsum Mentai 4pcs quota rule with `-- TODO: confirm with admin` comments in the seed file.

---

### Task 2 — Seed Data

**Prompt:**
> "Generate a SQL seed file at `/backend/migrations/002_seed_data.sql`. It must seed:
> 1. `alias_menu` — all confirmed product names from PRD.md Section 5 with proposed kitchen codes (mark each as `-- [Inference] confirm with admin`)
> 2. `bundle_components` — BSweet and BAdil decompositions from SDD.md Section 2.8
> 3. `area_keywords` — Gunung Anyar, Rungkut, tekkim, itz, its entries from SDD.md Section 2.9"

**Output:** `backend/migrations/002_seed_data.sql`

---

### Task 3 — FastAPI Backend Core

**Prompt:**
> "Generate FastAPI routers for all endpoints defined in SDD.md Section 3. Place each router in `/backend/app/routers/`. Use the Supabase Python client (`supabase-py`) for all DB operations. Each router file: `sessions.py`, `slots.py`, `orders.py`, `kitchen.py`, `finance.py`, `alias.py`. Add CORS middleware in `main.py` using `CORS_ALLOWED_ORIGINS` from environment. Reference SRS.md for all business rule constraints."

**Output:** `backend/app/routers/*.py`, `backend/main.py`, `backend/requirements.txt`

---

### Task 4 — Parser Module

**Prompt:**
> "Generate the WA text parser at `/backend/app/parser.py` implementing the 9-step pipeline from SRS.md Section 4.3. Requirements:
> - Class `WaOrderParser` with `__init__(alias_map, area_keywords, active_slots)` and `parse(raw_text) -> dict`
> - Uses only Python standard library + `re` (no AI/LLM calls)
> - Returns a ReviewFormObject dict (not saved to DB)
> - Flags unmatched tokens with `_unmatched: true` in the output
> - Implement `_split_fields`, `_tokenize_pesanan`, `_match_items`, `_detect_area`, `_match_slot`, `_calc_ongkir`, `_build_review_form` as private methods
> Also generate unit tests at `/backend/tests/test_parser.py` covering: normal WA text, slang inputs, missing fields, unmatched product, all 3 ongkir rules."

**Output:** `backend/app/parser.py`, `backend/tests/test_parser.py`

---

### Task 5 — Business Logic Utilities

**Prompt:**
> "Generate three utility modules:
> 1. `/backend/app/utils/ongkir.py` — implements 3-rule priority logic from PRD.md Section 7. Function: `calculate_ongkir(area_tag: str, slot: dict | None) -> tuple[int, str]` returning (amount, rule_label)
> 2. `/backend/app/utils/decomposer.py` — expands bundle Order_Items into components using `bundle_components` table. Function: `decompose_items(items: list, bundle_map: dict) -> list`
> 3. `/backend/app/utils/quota.py` — counts dimsum boxes from Order_Items for a given session. Function: `count_dimsum_boxes(items: list, bundle_map: dict) -> int`. Add TODO comment for Dimsum Mentai 4pcs rule (currently [Unverified])."

**Output:** `backend/app/utils/ongkir.py`, `backend/app/utils/decomposer.py`, `backend/app/utils/quota.py`

---

### Task 6 — React Frontend Scaffold

**Prompt:**
> "Scaffold the React frontend with React Router v6 for these routes: `/dashboard`, `/sessions`, `/parse`, `/orders`, `/kitchen`, `/finance`, `/alias`. Add a persistent sidebar `Layout.jsx` showing navigation links and the active session name. Add placeholder screen components for each route. Create reusable components: `StatusBadge.jsx` (pill badge with color per status), `ConfirmModal.jsx` (generic confirmation dialog), `SummaryCard.jsx` (metric card). Create `src/api/client.js` as a fetch wrapper reading `VITE_API_BASE_URL` from env. Create `src/utils/format.js` with `formatRupiah(n)` and `formatDate(d)` helpers."

**Output:** `frontend/src/**`

---

### Task 7 — React Screens (Run One Prompt Per Screen)

For each screen below, prompt individually after the previous screen is working:

**Dashboard:**
> "Build `Dashboard.jsx` per UIUX_FLOW.md Screen 1. Include: 3 SummaryCards (quota used/max, total UNPAID Rp, estimated net profit), Production Board grid (date columns × kitchen code rows), Close Batch button (disabled if any UNPAID orders exist in active session)."

**Session Manager:**
> "Build `Sessions.jsx` per UIUX_FLOW.md Screen 2. Include: session list table, new session creation form (open date, close date, quota), delivery slot sub-panel with is_free_ongkir toggle."

**Order Parser:**
> "Build `Parse.jsx` and `ReviewForm.jsx` per UIUX_FLOW.md Screen 3. Textarea posts to `POST /parse` endpoint. Result renders in ReviewForm with all editable fields. Show area tag badge and ongkir rule explanation badge. Show quota impact indicator. Confirm & Save posts to `POST /orders`."

**Order List:**
> "Build `Orders.jsx` and `OrderDrawer.jsx` per UIUX_FLOW.md Screen 4. Table with filter bar, optimistic UI for PAID/SENT toggles, Cancel with confirmation modal."

**Kitchen Board:**
> "Build `Kitchen.jsx` per UIUX_FLOW.md Screen 5. Date filter tabs, decomposed per-date production table, production summary cards. Data from `GET /kitchen`."

**Finance:**
> "Build `Finance.jsx` per UIUX_FLOW.md Screen 6. Expense tracker table with add/delete, live profit split preview card, Close Batch & Finalize button with confirmation modal."

**Alias Manager:**
> "Build `Alias.jsx` per UIUX_FLOW.md Screen 7. Inline-editable table for alias_menu CRUD."

---

### Task 8 — Integration & Smoke Test

**Prompt:**
> "Write a smoke test script at `/backend/tests/smoke_test.py` that tests the full order lifecycle against a local Supabase instance:
> 1. Create a PO session
> 2. Add two delivery slots (one free, one paid ongkir)
> 3. POST to /parse with a sample WA text containing one dimsum and one bacar order for an ITS address at the free slot
> 4. Assert parsed ongkir = 0 and rule = 'Slot'
> 5. Confirm the order via POST /orders
> 6. Toggle to PAID via PATCH /orders/{id}/pay
> 7. Add one expense
> 8. GET /finance/preview and assert Adit and Kila amounts are non-zero
> 9. POST /finance/close and assert session status = Closed"

**Output:** `backend/tests/smoke_test.py`

---

## 6. Agent Constraints (Hard Rules)

| Rule | Reason |
|---|---|
| Never call external paid APIs from app code | Zero-budget constraint |
| Never auto-save parser output | Human-in-the-loop requirement |
| Never use localStorage / sessionStorage in React | Breaks in Claude.ai artifact environment; also not needed here |
| Always use .env for secrets | Security |
| Never auto-close a batch | Requires explicit admin confirmation (FR-F05) |
| Always read the full schema from SDD.md | Do not invent columns or tables |
| Flag all [Unverified] items with TODO comments | Admin must validate before going live |

---

## 7. Expected Deliverable Per Task

Each completed task should produce:
1. The source file(s) as specified
2. A one-paragraph summary of what was generated and any assumptions made
3. A list of any `[Unverified]` or `[Inference]` items encountered, with `TODO` comments placed in the code
