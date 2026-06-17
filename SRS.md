# Dimsavor — Software Requirements Specification (SRS)
**Version:** 1.0

---

## 1. Introduction

### 1.1 Purpose
This document specifies all functional and non-functional requirements for the Dimsavor internal ERP web application. It is the authoritative reference for the CLI scaffolding agent and for admin review during development.

### 1.2 Scope
The system covers:
- PO Session and Delivery Slot management
- WA chat text parsing into structured orders
- Order fulfillment status tracking (paginated order list on Dashboard)
- Production summary (7-metric decomposition on Dashboard)
- Financial expense tracking and profit split calculation (with automated settlement transfers)
- Dictionary management (aliases and area keywords)

### 1.3 Definitions

| Term | Definition |
|---|---|
| PO Session / Batch | A bounded sales period with open/close dates and a dimsum production quota |
| Delivery Slot | A scheduled delivery window with an optional free-ongkir flag |
| Kitchen Code | A short alphanumeric code identifying a product on the production board |
| Quota Unit | One 6pcs box of dimsum (or one 4pcs box); the unit of production capacity |
| Bacar | Banana Caramel drink (Kecil 120ml / Besar 150ml); exempt from quota |
| Bundle | A fixed product combination (BSweet, BAdil) sold at a flat price |
| Alias | A slang or abbreviated term mapping to a canonical product name |
| Review Form | The editable form presented to admin for order confirmation / manual overrides |
| Admin | Adit (sole user of the system) |

---

## 2. Functional Requirements

### 2.1 PO Session Management

**FR-S01** Admin can create a new PO Session specifying: `tanggal_buka`, `tanggal_tutup`, `kuota_maksimal` (in dimsum boxes).

**FR-S02** Only one PO Session can have `status = Active` at any time. The system must reject a new session creation if an Active session exists.

**FR-S03** Admin can add Delivery Slots to the active session. Each slot requires: `jadwal_teks` (free text), `is_free_ongkir` (boolean, default FALSE).

**FR-S04** Admin can toggle `is_free_ongkir` on any slot. The update persists to DB without page reload.

**FR-S05** Admin can delete a Delivery Slot. If any orders reference the slot, a confirmation warning is shown before deletion.

**FR-S06** Admin can trigger Close Batch manually. The system must:
  - Block close if any order in the session has `status_bayar = UNPAID`
  - Present a confirmation modal before executing
  - Set session `status = Closed` and make all data read-only

**FR-S07** Quota is enforced at the order-confirmation step. The system warns admin when a new order would exceed `kuota_maksimal`. Admin can override the warning.

**FR-S08** Quota is counted from `Order_Items` by traversing `bundle_components` for bundle items:
  - Dimsum Original 6pcs → 1 quota unit
  - Dimsum Mentai 6pcs → 1 quota unit
  - Dimsum Mentai 4pcs → 1 quota unit
  - Bacar (any variant) → 0 quota units
  - BSweet → 0 quota units (contains only Bacar)
  - BAdil → 1 quota unit (contains 6pcs dimsum)

---

### 2.2 Delivery Slot & Ongkir Management

**FR-D01** Ongkir is calculated per order using the following 3-rule priority (first match wins):

| Priority | Condition | Ongkir |
|---|---|---|
| 1 | `area_tag` ∈ {Gunung Anyar, Rungkut} | Rp 0 |
| 2 | `area_tag` = ITS **AND** `slot.is_free_ongkir = TRUE` | Rp 0 |
| 3 | All other cases | Rp 2.000 |

**FR-D02** Area detection reads from the `area_keywords` table. Area keywords are maintainable by admin via the Dictionary Manager screen without code changes.

**FR-D03** If `id_slot` is NULL (no delivery slot matched), the system defaults to Priority 3 (Rp 2.000) and flags the slot field as unmatched in the Review Form.

**FR-D04** The ongkir result and the rule label (`Area` / `Slot` / `Flat`) are stored on the `orders` row for display purposes.

---

### 2.3 Smart Order Parser & Review Form

**FR-P01** Admin pastes raw WA chat text into a textarea on the Dashboard and triggers parsing via a "Parse" button.

**FR-P02** The parser must implement the following 9-step pipeline:
```
Step 1: Split raw text on newline + delimiter keywords (Nama:, Pesanan:, Alamat:, Bayar:, Waktu:)
Step 2: Tokenize pesanan lines by comma and/or newline
Step 3: For each token — match against alias_menu.kata_kunci (substring → exact → fuzzy)
Step 4: Extract qty (regex: integer adjacent to or preceding the matched token)
Step 5: Detect topping modifier (regal / oreo) and associate with nearest Bacar item
Step 6: Detect area_tag from alamat using area_keywords table
Step 7: Match jadwal_kirim_request text against active Delivery Slots (substring match on jadwal_teks)
Step 8: Calculate ongkir using 3-rule priority logic (FR-D01)
Step 9: Return structured ReviewFormObject — does NOT write to DB
```

**FR-P03** Parser uses only Python standard library and `re` module. No LLM, no paid API.

**FR-P04** Unmatched tokens must be flagged with `_unmatched: true` in the output and displayed visibly in the Review Form.

**FR-P05** All parsed output is presented in an editable Review Form directly on the Dashboard before any DB write. Admin must click "Konfirmasi & Simpan" explicitly.

**FR-P06** Admin can edit any field in the Review Form: name, address, delivery slot (with option to type a new slot), ongkir (manual override), payment method, item quantities, toppings, and can add or delete items.

**FR-P07** If an item subtotal or order ongkir is manually overridden, it activates manual override flags (`is_custom_price` or `is_custom_ongkir`) locking them from automatic recalculations. Admin can click an "Auto" or "Reset Otomatis" button to restore default rules.

**FR-P08** The Review Form shows a Quota Impact indicator: how many dimsum boxes this order will add to the active session.

---

### 2.4 Order Management

**FR-O01** Orders are listed on the Dashboard screen in a filterable table. The table displays a maximum of **5 rows of data** per page with functional `← Prev` and `Next →` navigation.

**FR-O02** Table filtering is supported by: status (Semua, UNPAID, PAID, PENDING, SENT, CANCELLED), delivery slot dropdown, and search by customer name.

**FR-O03** Admin can toggle `status_bayar`: UNPAID ↔ PAID. The update uses optimistic UI (instant local state change, reverts on API error).

**FR-O04** Admin can toggle `status_kirim`: PENDING ↔ SENT. Same optimistic UI behavior.

**FR-O05** Admin can cancel an order. This sets both `status_bayar = CANCELLED` and `status_kirim = CANCELLED`. A confirmation modal is required. CANCELLED orders are greyed out with strikethrough styling and disabled status toggles.

**FR-O06** Admin can click the action arrow on a row to open the **Order Detail Drawer** in the right sidebar. The drawer displays full details and allows the admin to edit the order (opening the Review Form inside the drawer) or cancel the order.

---

### 2.5 Production summary & Decomposition

**FR-K01** The Dashboard displays a **Ringkasan Produksi** card aggregating all non-cancelled order items that match the active session filters (status, delivery slot, and customer name search).

**FR-K02** Before aggregation, all bundle items are decomposed using `bundle_components`:
- BSweet → 3× Bacar Besar 150ml
- BAdil → 1× Bacar Besar + 3× Dimsum Original (pcs) + 3× Dimsum Mentai (pcs)

**FR-K03** Decomposition is used only for kitchen production summary and quota calculations. The database stores the original bundle items to preserve pricing and billing integrity.

**FR-K04** The board shows a 7-metric production summary breakdown:
- Box Mentai (standard Mentai boxes)
- Box Original (standard Original boxes)
- Box Mix (boxes containing 3 Ori + 3 Mentai from decomposed BAdil bundles)
- Pcs Mentai (total Mentai pieces)
- Pcs Original (total Original pieces)
- Cup BB (Bacar Besar)
- Cup BK (Bacar Kecil)

---

### 2.6 Finance & Profit Split

**FR-F01** Admin can record expenses with fields: `nama_bahan`, `nominal`, `dibayar_oleh` (Adit or Kila).

**FR-F02** Admin can delete any expense entry.

**FR-F03** The profit split and partner settlement recalculate automatically on every PAID status change and every expense add/delete.

**FR-F04** Profit split formula:
```
Total Pendapatan PAID = Σ (order.subtotal_items + order.ongkir) for all PAID orders
Total Modal          = Σ expenses.nominal
Laba Bersih          = Total Pendapatan PAID - Total Modal

Adit menerima = Σ expenses where dibayar_oleh = 'Adit' + (Laba Bersih ÷ 2)
Kila menerima = Σ expenses where dibayar_oleh = 'Kila' + (Laba Bersih ÷ 2)
```

**FR-F05** Only orders with `status_bayar = PAID` contribute to `Total Pendapatan PAID`. UNPAID and CANCELLED orders are excluded.

**FR-F06** Finalizing a batch is irreversible. It requires explicit admin confirmation via modal. After finalization:
- Session `status` → Closed
- All orders, items, expenses become read-only
- A Closed Batch Summary view is shown with all inputs disabled

**FR-F07** The system tracks cash holding based on the payment method (`metode_bayar`):
- Payments via `BCA`, `Dana`, or `Cash Adit` accumulate into `adit_pegang` (Adit holds cash).
- Payments via `QRIS`, `BNI`, `Shopeepay`, or `Cash Kila` accumulate into `kila_pegang` (Kila holds cash).

**FR-F08** The system calculates final transfer settlement instructions:
- `adit_transfer_to_kila = max(0, adit_pegang - adit_receives)`
- `kila_transfer_to_adit = max(0, kila_pegang - kila_receives)`
- It renders an instructions box on the Finance screen showing who needs to transfer what amount to whom (e.g. "Adit transfer ke Kila sebesar Rp X").

---

### 2.7 Dictionary Management

**FR-A01** Admin can view all `alias_menu` entries in a table.

**FR-A02** Admin can add, inline-edit, and delete alias entries.

**FR-A03** Each alias entry has: `kata_kunci`, `nama_produk_baku`, `kitchen_code`.

**FR-A04** Admin can manage `area_keywords` from the Area Keywords tab of the Dictionary Manager screen.

**FR-A05** Changes to alias and area keyword tables take effect on the next parser run (no restart required).

---

## 3. Non-Functional Requirements

**NFR-01 Cost**
All infrastructure must remain at zero recurring cost. No paid APIs, paid hosting tiers, or paid SaaS subscriptions.

**NFR-02 Availability**
The backend runs on Render free tier. Cold starts of up to ~30 seconds on first request are acceptable. The frontend must show a loading indicator during cold start.

**NFR-03 Data Integrity**
No order data is written to DB without explicit admin confirmation through the Review Form (`POST /orders` is only called after "Konfirmasi & Simpan").

**NFR-04 Security**
Supabase URL and service key are stored in environment variables only. They must never appear in source code or frontend bundles. The service key is backend-only.

**NFR-05 Responsiveness**
All status toggles (UNPAID → PAID, PENDING → SENT) must update without full page reload, using optimistic UI with error reversion.

**NFR-06 Maintainability**
Parser dictionary (alias_menu) and area keywords are editable through the UI without code changes or redeployment.

**NFR-07 Single-User Scope**
The system is designed for a single admin. No authentication, no multi-user access control, no concurrent write conflict handling is required.

**NFR-08 Parser Accuracy**
The parser is Rule-Based (not AI). It is expected to have imperfect recall on informal language. The human-in-the-loop Review Form is the accuracy mitigant — parser errors are corrected by admin before save, not by the algorithm itself.

---

## 4. Business Rules Summary

### BR-1: One Active Session
Only one PO Session may be in Active status. System enforces this at DB level (unique partial index).

### BR-2: Quota Scope
Quota counts dimsum production boxes only. Bacar production is unconstrained (pre-frozen, served from freezer).

### BR-3: Ongkir Priority
See FR-D01. Area-based free ongkir (Gunung Anyar/Rungkut) takes absolute priority over slot-based free ongkir.

### BR-4: Bundle Decomposition Scope
Bundles are decomposed only for kitchen board and quota calculation. `order_items` stores bundles as single line items to preserve pricing integrity.

### BR-5: Profit from PAID Only
Profit calculation and split are based exclusively on orders with `status_bayar = PAID`. Operational convention: all orders are expected to be PAID before Close Batch is triggered.

### BR-6: Irreversible Close
Once a batch is Closed, no data modifications are possible. This is by design — financial records must be immutable after settlement.


---

## 8. Security & Authentication Requirements
To protect the system from unauthorized access and brute-force attacks while allowing the repository to remain public, the following security requirements are enforced:

### SR-1: Stateless In-Memory PIN
The administrative dashboard requires a secret PIN to access. This PIN MUST NOT be stored in \localStorage\, \sessionStorage\, or cookies. It must be maintained purely in the React application's in-memory state via the Context API, meaning a hard page refresh requires re-authentication.

### SR-2: API Key Header Validation
All requests from the frontend to the backend business logic endpoints MUST include the \X-API-Key\ header. The backend validates this header against a server-side \ADMIN_SECRET_KEY\ environment variable. Invalid keys result in a \401 Unauthorized\ response.

### SR-3: Rate Limiting
To prevent abuse, the backend enforces IP-based rate limiting:
- **Global API Rate Limit:** 60 requests per minute per IP.
- **Login Endpoint Limit:** 5 requests per minute per IP to prevent PIN brute-force attempts.

