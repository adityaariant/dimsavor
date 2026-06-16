# Dimsavor — Software Design Document (SDD)
**Version:** 1.0

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     USER (Adit)                          │
│              Browser on any device                       │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────┐
│          React SPA (Vite + Tailwind)                     │
│          Hosted: Vercel (free tier)                      │
└───────────────────────────┬─────────────────────────────┘
                            │ REST / HTTPS
┌───────────────────────────▼─────────────────────────────┐
│          FastAPI (Python 3.11)                           │
│          Hosted: Render (free tier)                      │
│          Contains: parser, ongkir, decomposer, quota     │
└───────────────────────────┬─────────────────────────────┘
                            │ Supabase Python client
┌───────────────────────────▼─────────────────────────────┐
│          Supabase (PostgreSQL)                           │
│          Hosted: Supabase free tier                      │
└─────────────────────────────────────────────────────────┘
```

**Design decisions:**
- No WebSockets — single admin, no real-time multi-user sync needed
- Frontend fetches on user action or screen load; no polling
- Parser logic lives entirely in the backend; frontend only sends raw text and receives a ReviewFormObject
- Supabase service key is backend-only; frontend never calls Supabase directly

---

## 2. Database Schema (PostgreSQL / Supabase)

### 2.1 Enum Types

```sql
CREATE TYPE session_status   AS ENUM ('Active', 'Closed');
CREATE TYPE payment_status   AS ENUM ('UNPAID', 'PAID', 'CANCELLED');
CREATE TYPE delivery_status  AS ENUM ('PENDING', 'SENT', 'CANCELLED');
CREATE TYPE payment_method   AS ENUM (
  'QRIS', 'BCA', 'BNI', 'Cash Adit', 'Cash Kila', 'Shopeepay', 'Dana'
);
CREATE TYPE expense_payer    AS ENUM ('Adit', 'Kila');
```

---

### 2.2 Table: po_sessions

```sql
CREATE TABLE po_sessions (
  id_po          SERIAL PRIMARY KEY,
  tanggal_buka   DATE          NOT NULL,
  tanggal_tutup  DATE          NOT NULL,
  kuota_maksimal INTEGER       NOT NULL,  -- unit: 6pcs dimsum boxes
  status         session_status NOT NULL DEFAULT 'Active',
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

-- Enforce single active session at DB level
CREATE UNIQUE INDEX idx_one_active_session
  ON po_sessions (status)
  WHERE status = 'Active';
```

---

### 2.3 Table: delivery_slots

```sql
CREATE TABLE delivery_slots (
  id_slot        SERIAL PRIMARY KEY,
  id_po          INTEGER       NOT NULL REFERENCES po_sessions(id_po) ON DELETE CASCADE,
  jadwal_teks    VARCHAR(100)  NOT NULL,  -- e.g. "Rabu 17 Juni 10.00-13.00"
  is_free_ongkir BOOLEAN       NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_slots_po ON delivery_slots(id_po);
```

---

### 2.4 Table: orders

```sql
CREATE TABLE orders (
  id_order              SERIAL PRIMARY KEY,
  id_po                 INTEGER        NOT NULL REFERENCES po_sessions(id_po),
  nama_pelanggan        VARCHAR(100)   NOT NULL,
  alamat                TEXT           NOT NULL,
  area_tag              VARCHAR(50),   -- 'Gunung Anyar', 'Rungkut', 'ITS', 'Lainnya'
  jadwal_kirim_request  TEXT,          -- raw text from customer
  id_slot               INTEGER        REFERENCES delivery_slots(id_slot),  -- NULL if unmatched
  metode_bayar          payment_method,
  ongkir                INTEGER        NOT NULL DEFAULT 0,   -- 0 or 2000 (Rupiah)
  ongkir_rule           VARCHAR(10),   -- 'Area', 'Slot', or 'Flat' — for UI badge
  status_bayar          payment_status  NOT NULL DEFAULT 'UNPAID',
  status_kirim          delivery_status NOT NULL DEFAULT 'PENDING',
  created_at            TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX idx_orders_po       ON orders(id_po);
CREATE INDEX idx_orders_status   ON orders(status_bayar);
```

**Design notes:**
- `area_tag` and `ongkir_rule` stored redundantly for UI display (avoids re-running ongkir logic on read)
- `id_slot` may be NULL when parser finds no matching slot; ongkir defaults to Rp 2.000 in this case

---

### 2.5 Table: order_items

```sql
CREATE TABLE order_items (
  id_item       SERIAL PRIMARY KEY,
  id_order      INTEGER       NOT NULL REFERENCES orders(id_order) ON DELETE CASCADE,
  nama_produk   VARCHAR(100)  NOT NULL,  -- canonical name from alias_menu.nama_produk_baku
  qty           INTEGER       NOT NULL DEFAULT 1,
  is_bundle     BOOLEAN       NOT NULL DEFAULT FALSE,  -- TRUE for BSweet, BAdil
  topping       VARCHAR(20),  -- 'Regal', 'Oreo', or NULL
  subtotal      INTEGER       NOT NULL   -- in Rupiah (qty × unit_price + topping cost)
);

CREATE INDEX idx_items_order ON order_items(id_order);
```

**Design note:** `is_bundle = TRUE` marks items that require decomposition via `bundle_components` for kitchen board and quota calculation. Financial rows (subtotal) remain as-is.

---

### 2.6 Table: expenses

```sql
CREATE TABLE expenses (
  id_expense    SERIAL PRIMARY KEY,
  id_po         INTEGER        NOT NULL REFERENCES po_sessions(id_po),
  nama_bahan    VARCHAR(100)   NOT NULL,
  nominal       INTEGER        NOT NULL,   -- in Rupiah
  dibayar_oleh  expense_payer  NOT NULL,
  created_at    TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX idx_expenses_po ON expenses(id_po);
```

---

### 2.7 Table: alias_menu

```sql
CREATE TABLE alias_menu (
  id_alias        SERIAL PRIMARY KEY,
  kata_kunci      VARCHAR(100) NOT NULL UNIQUE,  -- the slang/abbreviation
  nama_produk_baku VARCHAR(100) NOT NULL,         -- canonical product name
  kitchen_code    VARCHAR(10)  NOT NULL
);
```

---

### 2.8 Table: bundle_components (new — added from loophole analysis)

```sql
CREATE TABLE bundle_components (
  id_component         SERIAL PRIMARY KEY,
  nama_produk_bundle   VARCHAR(100) NOT NULL,  -- matches alias_menu.nama_produk_baku
  nama_produk_komponen VARCHAR(100) NOT NULL,
  qty_komponen         INTEGER      NOT NULL
);
```

**Seed data:**

```sql
INSERT INTO bundle_components (nama_produk_bundle, nama_produk_komponen, qty_komponen) VALUES
  ('BSweet', 'Bacar Besar 150ml',    3),
  ('BAdil',  'Bacar Besar 150ml',    1),
  ('BAdil',  'Dimsum Original (pcs)', 3),
  ('BAdil',  'Dimsum Mentai (pcs)',   3);
```

---

### 2.9 Table: area_keywords (new — added for ongkir maintainability)

```sql
CREATE TABLE area_keywords (
  id_keyword  SERIAL PRIMARY KEY,
  keyword     VARCHAR(50) NOT NULL UNIQUE,  -- lowercase, used for substring match
  area_tag    VARCHAR(50) NOT NULL          -- 'Gunung Anyar', 'Rungkut', 'ITS'
);
```

**Seed data:**

```sql
INSERT INTO area_keywords (keyword, area_tag) VALUES
  ('gunung anyar', 'Gunung Anyar'),
  ('rungkut',      'Rungkut'),
  ('tekkim',       'ITS'),
  ('itz',          'ITS'),
  ('its',          'ITS');
-- [Unverified] Additional ITS-area keywords may need to be added by admin via Alias Manager
```

---

## 3. API Design (FastAPI)

**Base URL**
- Development: `http://localhost:8000`
- Production: set via `VITE_API_BASE_URL` env var in frontend

All endpoints return `application/json`. All errors return `{"detail": "<message>"}`.

---

### 3.1 Sessions

```
GET    /sessions                      List all sessions (ordered by created_at DESC)
POST   /sessions                      Create new session
       Body: {tanggal_buka, tanggal_tutup, kuota_maksimal}
       Error 409 if Active session exists

GET    /sessions/{id_po}              Get session detail + slots + order count + quota used
PATCH  /sessions/{id_po}/close        Close session
       Error 400 if any UNPAID orders exist
       Triggers: set status=Closed, all data becomes read-only
```

### 3.2 Delivery Slots

```
GET    /sessions/{id_po}/slots        List slots for session
POST   /sessions/{id_po}/slots        Add slot
       Body: {jadwal_teks, is_free_ongkir}

PATCH  /slots/{id_slot}               Update slot
       Body: {jadwal_teks?, is_free_ongkir?}
DELETE /slots/{id_slot}               Delete slot
       Error 400 if orders reference this slot (with warning override option)
```

### 3.3 Orders

```
GET    /orders                        List orders
       Query: ?session_id=&status_bayar=&status_kirim=&search=
POST   /orders                        Create order from confirmed Review Form
       Body: {id_po, nama_pelanggan, alamat, area_tag, jadwal_kirim_request,
              id_slot, metode_bayar, ongkir, ongkir_rule, items: [...]}

GET    /orders/{id_order}             Full order detail
PATCH  /orders/{id_order}/pay         Toggle payment status (UNPAID ↔ PAID)
PATCH  /orders/{id_order}/send        Toggle delivery status (PENDING → SENT)
PATCH  /orders/{id_order}/cancel      Cancel order (sets both statuses to CANCELLED)
```

### 3.4 Parser

```
POST   /parse                         Parse raw WA text — returns ReviewFormObject, does NOT write DB
       Body: {raw_text: string, session_id: int}
       Returns: {
         nama_pelanggan, alamat, area_tag,
         jadwal_kirim_request, matched_slot,
         metode_bayar, ongkir, ongkir_rule,
         items: [{nama_produk, qty, topping, subtotal, _unmatched}],
         total, quota_impact, unmatched_tokens: [...]
       }
```

### 3.5 Kitchen

```
GET    /kitchen                       Aggregated production view
       Query: ?session_id=&date=
       Returns decomposed items grouped by delivery date
       Bundles expanded via bundle_components before aggregation
```

### 3.6 Finance

```
GET    /expenses                      List expenses
       Query: ?session_id=
POST   /expenses                      Add expense
       Body: {id_po, nama_bahan, nominal, dibayar_oleh}
DELETE /expenses/{id_expense}         Delete expense

GET    /finance/preview               Live profit split preview
       Query: ?session_id=
       Returns: {total_paid, total_modal, laba_bersih, adit_amount, kila_amount}
POST   /finance/close                 Finalize and close batch
       Query: ?session_id=
       Error 400 if UNPAID orders exist
```

### 3.7 Alias Manager

```
GET    /alias                         List all alias_menu entries
POST   /alias                         Add alias
       Body: {kata_kunci, nama_produk_baku, kitchen_code}
PATCH  /alias/{id_alias}              Update alias
DELETE /alias/{id_alias}              Delete alias

GET    /area-keywords                 List all area_keywords
POST   /area-keywords                 Add area keyword
       Body: {keyword, area_tag}
DELETE /area-keywords/{id_keyword}    Delete area keyword
```

---

## 4. Frontend Component Architecture

```
frontend/src/
├── App.jsx                     # React Router v6 setup
├── api/
│   └── client.js               # fetch wrapper — reads VITE_API_BASE_URL
├── components/
│   ├── Layout.jsx              # Persistent sidebar + top bar
│   ├── StatusBadge.jsx         # Colored pill: UNPAID/PAID/PENDING/SENT/CANCELLED
│   ├── ConfirmModal.jsx        # Generic confirmation dialog (title, body, onConfirm)
│   └── SummaryCard.jsx         # Metric card (label, value, sub-label)
├── screens/
│   ├── Dashboard.jsx           # Summary cards + production board + batch analytics
│   ├── Sessions.jsx            # Session list + new session form + slot management
│   ├── Parse.jsx               # Raw text input + Review Form
│   │   └── ReviewForm.jsx      # Editable parsed order; calls POST /orders on confirm
│   ├── Orders.jsx              # Filterable order table + optimistic toggles
│   │   └── OrderDrawer.jsx     # Full order detail side panel
│   ├── Kitchen.jsx             # Date tabs + decomposed production table
│   ├── Finance.jsx             # Expense tracker + profit split preview + close batch
│   └── Alias.jsx               # Alias table CRUD + area keywords sub-section
└── utils/
    └── format.js               # formatRupiah(n), formatDate(d)
```

---

## 5. Business Logic Module Design (Backend Python)

### 5.1 Parser (`/backend/app/parser.py`)

```python
class WaOrderParser:
    def __init__(
        self,
        alias_map: dict[str, dict],     # {kata_kunci: {nama_produk_baku, kitchen_code}}
        area_keywords: dict[str, str],  # {keyword: area_tag}
        active_slots: list[dict]        # [{id_slot, jadwal_teks, is_free_ongkir}]
    ):
        ...

    def parse(self, raw_text: str) -> dict:
        """9-step pipeline. Returns ReviewFormObject. Does NOT write to DB."""
        fields  = self._split_fields(raw_text)      # Step 1
        tokens  = self._tokenize_pesanan(fields)     # Step 2
        items   = self._match_items(tokens)          # Steps 3-5
        area    = self._detect_area(fields)          # Step 6
        slot    = self._match_slot(fields)           # Step 7
        ongkir, rule = self._calc_ongkir(area, slot) # Step 8
        return self._build_review_form(              # Step 9
            fields, items, area, slot, ongkir, rule
        )
```

All alias and area keyword data is loaded from DB before instantiating the parser (on each `/parse` request — data is small, and this ensures the latest aliases are always used).

---

### 5.2 Ongkir Utility (`/backend/app/utils/ongkir.py`)

```python
FREE_AREA_TAGS = {'Gunung Anyar', 'Rungkut'}
ITS_AREA_TAG   = 'ITS'

def calculate_ongkir(area_tag: str, slot: dict | None) -> tuple[int, str]:
    """
    Returns (ongkir_amount, rule_label).
    Rule labels: 'Area', 'Slot', 'Flat'
    """
    if area_tag in FREE_AREA_TAGS:
        return (0, 'Area')
    if area_tag == ITS_AREA_TAG and slot and slot.get('is_free_ongkir'):
        return (0, 'Slot')
    return (2000, 'Flat')
```

---

### 5.3 Bundle Decomposer (`/backend/app/utils/decomposer.py`)

```python
def decompose_items(
    items: list[dict],
    bundle_map: dict[str, list[dict]]  # {bundle_name: [{komponen, qty}]}
) -> list[dict]:
    """
    Expands bundle items into constituent components.
    Used ONLY for kitchen board and quota calculation.
    Original order_items rows are NOT modified.
    """
    result = []
    for item in items:
        if item.get('is_bundle') and item['nama_produk'] in bundle_map:
            for component in bundle_map[item['nama_produk']]:
                result.append({
                    'nama_produk': component['nama_produk_komponen'],
                    'qty': component['qty_komponen'] * item['qty'],
                    'topping': item.get('topping'),
                    'source_order_id': item['id_order'],
                    'source_bundle': item['nama_produk']
                })
        else:
            result.append(item)
    return result
```

---

### 5.4 Quota Guard (`/backend/app/utils/quota.py`)

```python
DIMSUM_PRODUCTS = {
    'Dimsum Original',        # 6pcs = 1 box
    'Dimsum Mentai 6pcs',     # 6pcs = 1 box
    # TODO [Unverified U-2]: Dimsum Mentai 4pcs quota rule not confirmed by admin
    # Current placeholder: treat as 1 box (same as 6pcs) — confirm before go-live
}

PIECES_PER_BOX = 6

def count_dimsum_boxes(decomposed_items: list[dict]) -> int:
    """
    Counts quota units from a list of DECOMPOSED order items.
    Call decompose_items() before calling this function.
    """
    total_pcs = 0
    for item in decomposed_items:
        if item['nama_produk'] in DIMSUM_PRODUCTS:
            total_pcs += item['qty']  # qty is in pcs at this point (post-decompose)
    return total_pcs // PIECES_PER_BOX
```

---

### 5.5 Finance Calculator (`/backend/app/finance.py`)

```python
def calculate_profit_split(
    paid_orders: list[dict],    # orders with status_bayar = PAID
    expenses: list[dict]        # all expenses for the session
) -> dict:
    total_revenue = sum(
        o['subtotal_items'] + o['ongkir'] for o in paid_orders
    )
    total_modal   = sum(e['nominal'] for e in expenses)
    laba_bersih   = total_revenue - total_modal

    adit_modal = sum(e['nominal'] for e in expenses if e['dibayar_oleh'] == 'Adit')
    kila_modal = sum(e['nominal'] for e in expenses if e['dibayar_oleh'] == 'Kila')

    return {
        'total_revenue':  total_revenue,
        'total_modal':    total_modal,
        'laba_bersih':    laba_bersih,
        'adit_receives':  adit_modal + (laba_bersih // 2),
        'kila_receives':  kila_modal + (laba_bersih // 2),
    }
```

---

## 6. Data Flow: Order Creation

```
Admin pastes WA text
        ↓
POST /parse (raw_text, session_id)
        ↓
Backend:
  1. Load alias_map, area_keywords, active_slots from Supabase
  2. WaOrderParser.parse(raw_text) → ReviewFormObject
  3. Return ReviewFormObject to frontend (no DB write)
        ↓
Frontend: Render ReviewForm (editable)
        ↓
Admin reviews, edits if needed, clicks "Konfirmasi & Simpan"
        ↓
POST /orders (confirmed ReviewFormObject)
        ↓
Backend:
  1. Decompose bundles → count quota impact
  2. Check quota: current_used + impact ≤ kuota_maksimal (warn if exceeded)
  3. Write to orders table
  4. Write to order_items table
  5. Return created order
        ↓
Frontend: Show success toast, reset Parse screen
```

---

## 7. Kitchen Code Reference (Proposed)

> ⚠️ **[Inference]** All kitchen codes below are proposed values based on blueprint examples (`bk`, `M`, `O`). Admin must confirm or replace every code before seeding `alias_menu`. These should not be treated as finalized until confirmed.

| Product | Proposed Code | Notes |
|---|---|---|
| Dimsum Original | `O` | From blueprint example |
| Dimsum Mentai 6pcs | `M6` | Inferred — distinguishes from 4pcs |
| Dimsum Mentai 4pcs | `M4` | Inferred |
| Bacar Kecil 120ml | `bk` | From blueprint example |
| Bacar Besar 150ml | `bB` | Inferred |
| BSweet | `BS` | Inferred |
| BAdil | `BD` | Inferred |

**Usage in Production Board:** `{qty}{code}` per customer per date, e.g. `2M6`, `1bk`, `3bB`.

---

## 8. Environment Variables

### Backend (`/backend/.env`)

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...          # Service role key — backend only, never expose
CORS_ALLOWED_ORIGINS=https://Dimsavor.vercel.app
```

### Frontend (`/frontend/.env`)

```
VITE_API_BASE_URL=https://Dimsavor-api.onrender.com
```

---

## 9. Free-Tier Infrastructure Notes & Risk Mitigations

| Service | Free Limit | Risk | Mitigation |
|---|---|---|---|
| Supabase | 500MB DB, 2GB bandwidth/month | Low — small dataset | None needed |
| Render (backend) | 512MB RAM, sleeps after 15min idle | Cold start ~30s | Show "Menghubungkan ke server..." spinner on first load |
| Vercel (frontend) | 100GB bandwidth/month | No realistic risk | None needed |
| Render (backend) | 750 compute hours/month free | ~31 days × 24h = within limit for single-admin use | Monitor if heavy use |

---

## 10. Open Design Items

| # | Item | Status |
|---|---|---|
| U-1 | Kitchen codes for all 7 products | Awaiting admin confirmation |
| U-2 | Dimsum Mentai 4pcs quota unit rule | Awaiting admin confirmation |
| U-3 | Complete ITS-area keyword list | Handled via maintainable DB table; expand as needed |
| U-4 | Cash receiver reconciliation in profit split | Deferred — `metode_bayar` stored, reconciliation logic TBD |

---

## 11. Security Architecture
The application is secured using a lightweight, stateless architecture designed for single-admin use while keeping the repository public.

### 11.1 Frontend Authentication (In-Memory)
- The admin PIN is stored exclusively in React's `AuthContext` state memory.
- `localStorage`, `sessionStorage`, and cookies are explicitly banned to prevent XSS exfiltration.
- A hard page refresh intentionally clears the session, forcing re-authentication.

### 11.2 Backend Validation & Rate Limiting
- The backend utilizes a dependency (`get_api_key`) to validate the `X-API-Key` header against `ADMIN_SECRET_KEY`.
- `slowapi` enforces strict rate limits based on client IP:
  - **Global Limit:** 60 requests per minute to prevent general spam.
  - **Login Limit (`/auth/verify`):** 5 requests per minute to prevent brute-force attacks on the PIN.
