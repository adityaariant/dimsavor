# Dimsavor — UI/UX Flow
**Version:** 1.0

---

## Application Entry Logic

```
App loads
    ↓
Check: active PO Session exists?
    ├── NO  → Redirect to /sessions
    │         Show banner: "Belum ada sesi PO aktif. Buat sesi baru untuk mulai."
    └── YES → Load /dashboard
```

---

## Global Layout

```
┌─────────────────────────────────────────────┐
│  Sidebar (persistent)   │  Main Content Area │
│  ─────────────────────  │                    │
│  🍜 Dimsavor           │                    │
│  Sesi: PO-003 (Active)  │  [Screen renders   │
│  ─────────────────────  │   here]            │
│  > Dashboard            │                    │
│    PO Sessions          │                    │
│    Parse Order   [★]    │                    │
│    Orders               │                    │
│    Kitchen              │                    │
│    Finance              │                    │
│    Alias Manager        │                    │
└─────────────────────────────────────────────┘
```

**Global conventions:**
- Active session name shown in sidebar header
- [★] = quick-access highlight for Parse Order
- All monetary values formatted as `Rp X.XXX` (Indonesian dot separator)
- Status badges as colored pills:

| Status | Color |
|---|---|
| UNPAID | Orange |
| PAID | Green |
| PENDING | Grey |
| SENT | Blue |
| CANCELLED | Red / Strikethrough |
| Active (session) | Green |
| Closed (session) | Grey |

---

## Screen 1: /dashboard — Executive Dashboard

### Layout

```
[Session Name: PO-003]                    [Close Batch ▼]

┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐
│  Produksi       │ │  Tagihan UNPAID  │ │  Est. Laba Bersih │
│  7 / 10 box     │ │  Rp 108.000      │ │  Rp 43.000        │
│  dimsum         │ │                  │ │  (dari PAID)      │
└─────────────────┘ └─────────────────┘ └──────────────────┘

Production Board
┌──────────────────────────────────────────────┐
│            │  Rabu 17/6  │  Kamis 18/6       │
│─────────────────────────────────────────────  │
│ Summary    │  4 box, 3bB │  3 box, 5bk        │
│────────────────────────────────────────────── │
│ Aqel_2M    │      ✓      │                   │
│ Aqel_1O    │      ✓      │                   │
│ vina_1bk   │             │      ✓            │
│ dini_3M6   │             │      ✓            │
└──────────────────────────────────────────────┘

Batch Analytics
[Line chart: revenue per PO session, last 6 batches]
```

### Production Board Detail
- **Columns:** Delivery Slot dates (from active session's Delivery_Slots)
- **Rows:** `{nama_pelanggan}_{qty}{kitchen_code}` per item per date
- **Summary row (top of grid):** Total dimsum boxes + total Bacar cups per date
- Bundles are shown in **decomposed form** — BAdil shows as `1bB` + `1 Mix(3O+3M)` for the same customer
- Click a row → navigates to /orders with that customer highlighted

### Close Batch Button
- Disabled if any order in active session has `status_bayar = UNPAID`
- Tooltip on disabled: "Ada pesanan UNPAID. Lunasin dulu sebelum tutup batch."
- Enabled → opens confirmation modal → on confirm, redirects to /finance (Close Batch sub-view)

---

## Screen 2: /sessions — PO Session & Delivery Management

### Sub-view A: Session List

```
PO Sessions                              [+ New Session]

┌──────┬──────────────┬──────────────┬───────┬────────┐
│ ID   │ Tanggal Buka │ Tanggal Tutup│ Kuota │ Status │
├──────┼──────────────┼──────────────┼───────┼────────┤
│ PO-3 │ 10 Jun 2025  │ 20 Jun 2025  │ 10    │ Active │ ← expandable
│ PO-2 │ 01 Mei 2025  │ 10 Mei 2025  │  8    │ Closed │
│ PO-1 │ 01 Apr 2025  │ 10 Apr 2025  │ 10    │ Closed │
└──────┴──────────────┴──────────────┴───────┴────────┘
```

- Click active session row → expands Delivery Slots panel below
- Closed sessions → click → read-only detail view

### Sub-view B: New Session Form (modal/drawer)

```
Tanggal Buka:   [date picker]
Tanggal Tutup:  [date picker]
Kuota Maksimal: [number input] box dimsum
                (Bacar tidak dihitung dalam kuota)

[Cancel]  [Buat Sesi]
```

- Only one Active session allowed at a time — system blocks creation if one exists

### Sub-view C: Delivery Slot Panel (expanded under active session)

```
Delivery Slots untuk PO-003

┌──────┬────────────────────────────┬──────────────┬────────┐
│ ID   │ Jadwal                     │ Gratis Ongkir│ Aksi   │
├──────┼────────────────────────────┼──────────────┼────────┤
│  1   │ Rabu 17 Juni 10.00-13.00   │  [●] ON      │ [del]  │
│  2   │ Kamis 18 Juni 15.00-17.00  │  [○] OFF     │ [del]  │
│ new  │ [_________________________]│  [○]         │ [save] │
└──────┴────────────────────────────┴──────────────┴────────┘
[+ Tambah Slot]
```

- Toggle `is_free_ongkir` updates DB instantly (no reload)
- `jadwal_teks` is free-text (e.g. "Rabu 17 Juni 10.00-13.00")
- Delete prompts confirmation if any orders are using this slot

---

## Screen 3: /parse — Smart Order Parser

### Layout (Two-panel)

```
┌──────────────────────────┬─────────────────────────────┐
│  Input Panel             │  Review Form                 │
│                          │  (appears after Parse click) │
│  [textarea]              │                              │
│  Paste chat WA di sini...│  ...                         │
│                          │                              │
│  [Parse →]               │                              │
└──────────────────────────┴─────────────────────────────┘
```

### Review Form (right panel — fully editable)

```
── Identitas Pelanggan ───────────────────────────
Nama:     [Maharaja Aqel              ]
Alamat:   [Teknik Kimia ITS lt 3      ]  🏷️ ITS
Jadwal:   [▼ Rabu 17 Juni 10.00-13.00 ]  (dropdown: active slots + "Manual")
Ongkir:   Rp 0  🟢 Gratis (Slot)

── Metode Pembayaran ─────────────────────────────
          [▼ QRIS                     ]

── Item Pesanan ──────────────────────────────────
┌────────────────────────┬─────┬──────────┬────────┬─────┐
│ Produk                 │ Qty │ Topping  │Subtotal│     │
├────────────────────────┼─────┼──────────┼────────┼─────┤
│ Dimsum Mentai 6pcs     │  2  │    —     │ 38.000 │ [×] │
│ Bacar Kecil 120ml      │  1  │ Regal    │  9.000 │ [×] │
│ ⚠️ "bakso???"  [?]     │     │          │        │ [×] │  ← unmatched token
└────────────────────────┴─────┴──────────┴────────┴─────┘
[+ Tambah Item Baru]

── Ringkasan ─────────────────────────────────────
Subtotal items:    Rp 47.000
Ongkir:            Rp 0
Total:             Rp 47.000
Kuota terpakai:    +2 box dimsum  (used 7/10 → will be 9/10)

[Discard]                      [✓ Konfirmasi & Simpan]
```

### Ongkir Badge Labels
| Condition | Badge |
|---|---|
| Priority 1 (Area) | 🟢 Gratis (Area) |
| Priority 2 (Slot) | 🟢 Gratis (Slot) |
| Priority 3 (Flat) | 🟡 Rp 2.000 |

### Unmatched Token Behavior
- Shown as `⚠️ "{raw_token}" [?]` row
- Admin can: select a product from dropdown to replace it, or delete the row
- Save is **not blocked** by unmatched tokens (admin may choose to ignore/delete them)

### Quota Warning (on Confirm)
- If adding this order would exceed `kuota_maksimal` → modal:
  > "Pesanan ini akan melebihi kuota (N/Max box). Tetap simpan?"
  > [Batal] [Simpan tetap]
- Admin can override (some Bacar-heavy orders don't affect dimsum production)

---

## Screen 4: /orders — Interactive Order Fulfillment

### Layout

```
Filter: [Semua] [UNPAID] [PAID] [PENDING] [SENT] [CANCELLED]
Search: [nama pelanggan...]          Sort: [Jadwal Kirim ▼]

┌──────┬────────────┬─────────────┬──────────────┬──────────┬────────┬──────┬──────┬──────┐
│  #   │ Nama       │ Items       │ Jadwal Kirim │ Total    │ Ongkir │ Bayar│ Kirim│ Aksi │
├──────┼────────────┼─────────────┼──────────────┼──────────┼────────┼──────┼──────┼──────┤
│  1   │ Aqel       │ 2M6, 1bk   │ Rab 17/6 10- │ 47.000   │ Gratis │ PAID │ SENT │ [→]  │
│  2   │ vina lucu  │ 1O, 1bB    │ Kam 18/6 15- │ 26.000   │ 2.000  │UNPAID│PNDG  │ [→]  │
│  3   │ dini       │ 2BS        │ Rab 17/6 10- │ 54.000   │ Gratis │ PAID │ SENT │ [→]  │
└──────┴────────────┴─────────────┴──────────────┴──────────┴────────┴──────┴──────┴──────┘
```

- **Items column** shows kitchen code summary (e.g. `2M6, 1bk`)
- **Bayar toggle:** Click `UNPAID` → turns `PAID` (optimistic update, reverts on error)
- **Kirim toggle:** Click `PENDING` → turns `SENT` (same)
- **[→] button** → opens Order Detail Drawer
- CANCELLED rows: greyed out, all toggles disabled, strikethrough on name

### Order Detail Drawer (slides in from right)

```
── Pesanan #2 — vina lucu ────────────────────────── [×]
Alamat:    Jl. Rungkut Asri Timur 3 No.5
Area:      Rungkut  🟢
Jadwal:    Kamis 18 Juni 15.00-17.00
Slot:      PO-003 / Slot-2
Metode:    QRIS
Ongkir:    Rp 2.000  (area Rungkut → gratis? No — lihat catatan)

Dimsum Original 6pcs     x1    Rp 16.000
Bacar Besar 150ml        x1    Rp 10.000
                               ──────────
Subtotal:                      Rp 26.000
Ongkir:                        Rp  2.000
Total:                         Rp 28.000

[Batalkan Pesanan]
```

---

## Screen 5: /kitchen — Kitchen Production Board

### Layout

```
Kitchen Board

Date tabs: [Rabu 17/6] [Kamis 18/6]

── Rabu 17 Juni ─────────────────────────────────────
Produksi: 9 box dimsum (54 pcs) · 5 cup Bacar

┌────────────────────┬────────────────┬──────────────┬──────────┐
│ Kitchen Code       │ Customer       │ Notes        │ Status   │
├────────────────────┼────────────────┼──────────────┼──────────┤
│ 2M6                │ Aqel           │ —            │ SENT     │
│ 1bk                │ Aqel           │ Regal        │ SENT     │
│ 3BS → 3bB          │ dini           │ 1 Oreo, 2 —  │ PENDING  │
│ 1BD → 1bB+3O+3M    │ sari           │ —            │ PENDING  │
└────────────────────┴────────────────┴──────────────┴──────────┘
```

- Bundles are shown in decomposed form with `→` notation
- Topping notes shown per Bacar item
- `Status` column shows delivery status (PENDING/SENT) for quick kitchen reference

---

## Screen 6: /finance — Finance & Profit Split

### Sub-view A: Expense Tracker

```
Modal / Pengeluaran

┌───────────────────────────┬─────────┬────────────┬──────┐
│ Nama Bahan                │ Nominal │ Dibayar    │ Aksi │
├───────────────────────────┼─────────┼────────────┼──────┤
│ Kulit dimsum              │ 45.000  │ Adit       │ [del]│
│ Daging ayam               │ 32.000  │ Kila       │ [del]│
│ Pisang + gula             │ 20.000  │ Kila       │ [del]│
│ [___________________]     │[_____]  │[Adit▼]     │[add] │
└───────────────────────────┴─────────┴────────────┴──────┘

Adit total:  Rp 45.000
Kila total:  Rp 52.000
Total Modal: Rp 97.000
```

### Sub-view B: Profit Split Preview (live, auto-recalculates)

```
── Kalkulasi Bagi Hasil ──────────────────────────────────
Total Pendapatan (PAID):   Rp 237.000
Total Modal:               Rp  97.000
                           ──────────
Laba Bersih:               Rp 140.000

Adit:   Rp 45.000  +  Rp 70.000  =  Rp 115.000
        (modal)       (laba ÷ 2)
Kila:   Rp 52.000  +  Rp 70.000  =  Rp 122.000
        (modal)       (laba ÷ 2)

[Close Batch & Finalisasi →]
```

- Preview recalculates live on every PAID toggle or expense change
- "Close Batch" → confirmation modal:
  > "Tindakan ini tidak bisa dibatalkan. Semua data akan dikunci. Lanjutkan?"
  > [Batal] [Ya, Tutup Batch]

### Sub-view C: Closed Batch Summary (read-only)

Shown when session status = Closed. Identical layout to Preview but with "Sudah Ditutup" banner and all inputs disabled.

---

## Screen 7: /alias — Alias Dictionary Manager

### Layout

```
Alias Manager

Search: [kata kunci...]                         [+ Tambah Alias]

┌───────────────────────────┬──────────────────────┬──────────────┬──────┐
│ Kata Kunci (slang)        │ Nama Produk Baku     │ Kitchen Code │ Aksi │
├───────────────────────────┼──────────────────────┼──────────────┼──────┤
│ roti yummy                │ Bacar Kecil 120ml    │ bk           │[edit]│
│ badil                     │ BAdil                │ BD           │[edit]│
│ mentai                    │ Dimsum Mentai 6pcs   │ M6           │[edit]│
│ [___________________]     │ [__________________] │[__]          │[save]│
└───────────────────────────┴──────────────────────┴──────────────┴──────┘
```

- Edit button → row becomes inline editable
- Delete button on each row (with confirmation)
- This screen also doubles as the Area Keywords manager (separate tab or section):

```
[Aliases] [Area Keywords]

Area Keywords

┌───────────────────┬──────────────────┬──────┐
│ Keyword           │ Area Tag         │ Aksi │
├───────────────────┼──────────────────┼──────┤
│ gunung anyar      │ Gunung Anyar     │[del] │
│ rungkut           │ Rungkut          │[del] │
│ tekkim            │ ITS              │[del] │
│ itz               │ ITS              │[del] │
│ its               │ ITS              │[del] │
│ [_______________] │ [______________] │[add] │
└───────────────────┴──────────────────┴──────┘
```

---

## Error & Loading States (Global)

| Situation | Behavior |
|---|---|
| First API call (Render cold start) | Full-page spinner + "Menghubungkan ke server... (~30 detik)" |
| Subsequent API loading | Inline skeleton / spinner per component |
| API error on toggle | Revert optimistic update + toast: "Gagal memperbarui. Coba lagi." |
| Empty table | Illustration + contextual empty message (e.g. "Belum ada pesanan di sesi ini.") |
| Session not found | Redirect to /sessions with error banner |
