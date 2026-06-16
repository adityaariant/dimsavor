# Dimsavor — Product Requirements Document (PRD)
**Version:** 1.0 | **Status:** Draft | **Owner:** Adit

---

## 1. Executive Summary

Dimsavor is a zero-budget internal mini-ERP for a home dimsum business operated by two partners (Adit and Kila). It replaces ad-hoc WhatsApp-based order tracking with a structured web dashboard. Orders arrive via WhatsApp and are manually entered by the admin through a smart parser. The system manages production scheduling, fulfillment tracking, and profit splitting per batch.

**Two-component architecture:**
- **Web Dashboard** (React + FastAPI + Supabase) — the daily operational interface
- **CLI Scaffolding Agent** (AI coding agent, e.g. Claude Code) — used during development only to generate and build the web application; not used after deployment

---

## 2. Business Model

| Attribute | Detail |
|---|---|
| Sales Model | Pre-Order (PO) Batch / Session |
| Customer Channel | WhatsApp only — no customer-facing web page |
| Production Constraint | Dimsum is steamed at day-H (time-limited); Bacar is pre-frozen and retrieved from freezer |
| Profit Model | 50/50 split between Adit and Kila, calculated from PAID orders only |
| Infrastructure Budget | Rp 0 — all free-tier services |

---

## 3. Non-Negotiable Constraints

1. **Zero cost** — no paid APIs, no paid hosting, no paid subscriptions
2. **No customer-facing web** — customers stay on WhatsApp; no public site to avoid 24/7 hosting costs
3. **Human-in-the-loop parser** — all parser output must be confirmed/edited by admin before any DB write
4. **Rule-based parser only** — Regex + dictionary matching; no LLM or generative AI API calls in the application
5. **Profit split only from PAID orders** — UNPAID and CANCELLED orders are excluded from all financial calculations
6. **Quota applies to dimsum production only** — Bacar is excluded from quota because it is pre-frozen and not kitchen-constrained

---

## 4. Primary User

**Admin: Adit**
- Sole operator of the dashboard
- Pastes WA chat text into the parser
- Confirms/edits parsed order before saving
- Toggles payment and delivery status
- Records expenses
- Closes batches and reviews profit split

Multi-user support is out of scope.

---

## 5. Product Menu & Pricing (Source of Truth)

| Product | Price | Unit | Notes |
|---|---|---|---|
| Dimsum Original | Rp 16.000 | 6 pcs | Shumai; locally called "dimsum" |
| Dimsum Mentai | Rp 19.000 | 6 pcs | |
| Dimsum Mentai | Rp 15.000 | 4 pcs | Separate SKU — different price tier |
| Bacar Kecil | Rp 8.000 | 1 pcs / 120ml | Banana Caramel |
| Bacar Besar | Rp 10.000 | 1 pcs / 150ml | Banana Caramel |
| Topping Regal | +Rp 1.000 | per Bacar | Modifier — not a standalone item |
| Topping Oreo | +Rp 1.000 | per Bacar | Modifier — not a standalone item |
| **BSweet** | Rp 27.000 | bundle | 3× Bacar Besar |
| **BAdil** | Rp 27.000 | bundle | 1× Bacar Besar + 3pcs Dimsum Ori + 3pcs Dimsum Mentai |

> ⚠️ **[Inference]** Kitchen codes for each product have not been confirmed by admin.
> Proposed codes: `O` (Dimsum Ori), `M6` / `M4` (Dimsum Mentai 6/4pcs), `bk` (Bacar Kecil), `bB` (Bacar Besar), `BS` (BSweet), `BD` (BAdil).
> Admin must confirm or replace all codes before seeding the Alias_Menu table. See SDD.md Section 7.

---

## 6. Quota Logic (Confirmed)

- **Quota unit = 1 box = 6 pcs dimsum**
- Quota tracks kitchen production capacity at day-H (steaming time)
- Only dimsum products consume quota; Bacar is pre-frozen and does NOT consume quota

| Product | Quota Cost |
|---|---|
| Dimsum Original (6pcs) | 1 unit |
| Dimsum Mentai 6pcs | 1 unit |
| Dimsum Mentai 4pcs | ⚠️ **[Unverified]** — needs admin confirmation |
| Bacar Kecil / Bacar Besar | 0 units |
| BSweet (3× Bacar Besar) | 0 units |
| BAdil (1× Bacar Besar + 6pcs dimsum) | 1 unit |

---

## 7. Ongkir Logic (Confirmed — Priority Order)

Evaluated top-to-bottom; first match wins.

| Priority | Condition | Ongkir |
|---|---|---|
| 1 (highest) | Area ∈ {Gunung Anyar, Rungkut} | Rp 0 — always free regardless of time |
| 2 | Area ∈ ITS (tekkim / itz / its / ...) **AND** delivery_slot.is_free_ongkir = TRUE | Rp 0 — free because admin is already on campus |
| 3 (default) | All other cases | Rp 2.000 flat |

> ⚠️ **[Unverified]** The complete list of ITS-area keywords beyond `tekkim` and `itz` is not confirmed.
> The system stores area keywords in a maintainable DB table (`area_keywords`), editable from the Alias Manager screen without code changes.

---

## 8. Delivery Fee Scenarios (Examples)

| Customer Area | Slot is_free_ongkir | Ongkir Result | Rule Applied |
|---|---|---|---|
| Gunung Anyar | FALSE | Rp 0 | Priority 1 |
| Gunung Anyar | TRUE | Rp 0 | Priority 1 |
| Rungkut | FALSE | Rp 0 | Priority 1 |
| ITS (tekkim) | TRUE | Rp 0 | Priority 2 |
| ITS (tekkim) | FALSE | Rp 2.000 | Priority 3 |
| Mulyosari | TRUE | Rp 2.000 | Priority 3 |
| Mulyosari | FALSE | Rp 2.000 | Priority 3 |

---

## 9. Batch Lifecycle

```
[New Session Created] → status: Active
        ↓
[Orders come in via WA → parsed → confirmed → saved]
        ↓
[Admin toggles PAID / SENT per order as fulfillment progresses]
        ↓
[Admin records expenses throughout the batch]
        ↓
[Admin manually triggers Close Batch when operations are winding down]
        ↓
[System calculates profit split → status: Closed → data becomes read-only]
```

**Operational convention (confirmed by admin):** By the time Close Batch is triggered, all recorded orders are expected to be PAID. The system does not need to handle UNPAID + Closed as a normal case. No carry-over mechanism needed.

---

## 10. Features (High-Level Priority)

| # | Feature | Priority |
|---|---|---|
| 1 | Executive Dashboard | P0 |
| 2 | PO Session & Delivery Slot Management | P0 |
| 3 | Smart WA Order Parser + Review Validator | P0 |
| 4 | Interactive Order Fulfillment (status toggles) | P0 |
| 5 | Finance & Profit Split | P0 |
| 6 | Alias / Dictionary Manager | P1 |
| 7 | Batch Analytics (time-series chart) | P2 |

---

## 11. Out of Scope

- Customer-facing web or mobile app
- Automated WhatsApp bot / WA API integration
- Real-time push notifications
- Multi-admin or role-based access
- Inventory management
- Paid API integrations of any kind
