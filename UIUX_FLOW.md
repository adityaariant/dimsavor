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
│  Sesi: PO-004 (Active)  │  [Screen renders   │
│  ─────────────────────  │   here]            │
│  > Dashboard            │                    │
│    Sessions             │                    │
│    Finance              │                    │
│    Alias Manager        │                    │
│    Assets               │                    │
└─────────────────────────────────────────────┘
```

**Global conventions:**
- Active session name shown in sidebar header
- All navigations are simplified into a single-page Dashboard workspace (excluding Sesi, Finance, and Alias Manager)
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

## Screen 1: /dashboard — Executive Dashboard (Unified Workspace)

### Layout

```
[Session Name: PO-004]                                      [Close Batch ▼]

┌─────────────────────────────────┐ ┌─────────────────┐ ┌──────────────────┐
│  Ringkasan Produksi             │ │  Tagihan UNPAID  │ │  Est. Laba Bersih │
│  - Box Mentai: 13 box (78 pcs)  │ │  Rp 281.000      │ │  -Rp 49.000       │
│  - Box Original: 1 box (6 pcs)  │ │                  │ │  (dari PAID)      │
│  - Box Mix: 0 box (0 O / 0 M)   │ │                  │ │                  │
│  - BB: 1 cup | BK: 1 cup        │ │                  │ │                  │
│  Kuota: 14 / 10 box dimsum      │ │                  │ │                  │
└─────────────────────────────────┘ └─────────────────┘ └──────────────────┘

┌───────────────────────────────────────┬──────────────────────────────────┐
│  Smart Order Parser                   │  Daftar Pesanan                  │
│                                       │  Filter: [Semua] [UNPAID] [PAID] │
│  [textarea]                           │  Slot: [Semua Jadwal Kirim    ▼] │
│  Paste chat WA di sini...             │  Search: [cari pelanggan...]     │
│                                       │                                  │
│  [Parse Teks Chat]                    │  ┌──────┬────────┬────────┬──────┐  │
│                                       │  │ Nama │ Items  │ Total  │ Aksi │  │
│                                       │  ├──────┼────────┼────────┼──────┤  │
│                                       │  │ Budi │ 2M6    │ 38.000 │ [→]  │  │
│                                       │  └──────┴────────┴────────┴──────┘  │
│                                       │  Halaman 1 dari 3 [← Prev] [Next →] │
└───────────────────────────────────────┴──────────────────────────────────┘
```

### 1. Ringkasan Produksi Terperinci
Menampilkan breakdown produksi PO aktif secara presisi (diperbarui real-time mengikuti pencarian, status, dan filter jadwal kirim yang aktif pada Daftar Pesanan, mengecualikan pesanan CANCELLED):
- **Box Mentai**: Standard boxes Mentai (`Dimsum Mentai 6pcs` & `Dimsum Mentai 4pcs`).
- **Box Original**: Standard boxes Original (`Dimsum Original`).
- **Box Mix**: Box campuran berisi 3 Original + 3 Mentai (dari bundle BAdil).
- **Pcs Mentai / Original**: Total butir dimsum yang harus dikukus di dapur (dihitung otomatis dari box standard + bundle + pcs kustom).
- **Cup BB / BK**: Bacar Besar (150ml + dekomposisi bundle) & Bacar Kecil (120ml).
- **Kuota Terpakai**: Hanya menghitung box dimsum (Bacar diabaikan).

### 2. Smart Order Parser & Review Form (Kolom Kiri)
- **Input Text**: Textarea untuk paste chat WA pelanggan. Klik **Parse Teks Chat** untuk memicu pendeteksian otomatis.
- **Review Form**: Muncul langsung menggantikan textarea setelah diparse.
  - **Identitas**: Input Nama, Alamat, dan Dropdown Jadwal Kirim (Delivery Slot).
  - **Pembayaran & Ongkir**: Dropdown metode bayar dan input manual biaya ongkir.
  - **Tabel Item Pesanan (Kustomisasi Penuh)**:
    - **Nama Produk**: Menggunakan input teks dengan `<datalist>` autocomplete (admin bisa memilih produk baku atau mengetik menu kustom sesuka hati, misal: `"Mentai 7 pcs"`).
    - **Qty**: Angka kuantitas pesanan.
    - **Topping**: String topping (Oreo/Regal).
    - **Subtotal (Override Harga)**: Berupa input angka. Mengubah harga secara manual mengaktifkan mode harga kustom (`is_custom_price: true`), mengunci harga agar tidak ditimpa kalkulasi otomatis. Terdapat tombol **"Auto"** untuk mengembalikan ke harga otomatis.
    - **Tambah Item**: Tombol **"+ Tambah Item Baru"** untuk menyisipkan baris kosong kustom.
    - **Gunakan Teks Asli**: Tombol instan pada item unmatched untuk menyetujui teks chat raw sebagai nama produk kustom.
  - **Success Action**: Menyimpan pesanan merefresh data di background dan mengosongkan kembali parser.

### 3. Daftar Pesanan & Pagination (Kolom Kanan)
- **Filters**: Filter status bayar/kirim, filter slot jadwal kirim (dropdown), dan pencarian nama pelanggan.
- **Pagination**: Tabel dibatasi menampilkan maksimal **5 baris data pesanan** per halaman. Tombol `← Prev` dan `Next →` otomatis muncul untuk navigasi halaman jika data > 5. Ganti filter/search otomatis mereset halaman ke 1.
- **Optimistic Toggle**: Klik badge status Bayar (`UNPAID` ↔ `PAID`) atau Kirim (`PENDING` ↔ `SENT`) di tabel akan langsung memperbarui status di database secara optimis.
- **Action [→]**: Membuka **Order Detail Drawer** di sisi kanan screen:
  - Menampilkan ringkasan data pelanggan, jadwal kirim, metode pembayaran, ongkir, status (bayar/kirim) dan daftar rincian item pesanan.
  - Tombol **Edit Pesanan** membuka Review Form secara inline di dalam drawer, membiarkan admin mengedit data pesanan dan item-itemnya secara live.
  - Tombol **Batalkan Pesanan** membatalkan pesanan (mengubah status bayar & kirim ke `CANCELLED`).

```
┌──────────────────────────────────────────────┐
│ Detail Pesanan #4                       [X]  │
├──────────────────────────────────────────────┤
│ Pelanggan: Budi                              │
│ Alamat: ITS Tekkim                           │
│ Area: ITS (Jadwal: Rabu 17/6 Pagi)           │
│ Bayar: QRIS | Ongkir: Rp 0 (Slot)            │
│ Status: [PAID] | [PENDING]                   │
├──────────────────────────────────────────────┤
│ 1x Dimsum Original 6pcs            Rp 16.000 │
│ 1x Bacar Besar 150ml (Regal)       Rp 11.000 │
│                                   ────────── │
│ Subtotal:                          Rp 27.000 │
│ Ongkir:                            Rp      0 │
│ Total:                             Rp 27.000 │
├──────────────────────────────────────────────┤
│ [Edit Pesanan]             [Batalkan Pesanan]│
└──────────────────────────────────────────────┘
```

### 4. Close Batch Button
- Tombol di pojok kanan atas untuk menutup sesi PO.
- Menonaktifkan tombol (disabled) jika ada pesanan dalam status `UNPAID` di sesi aktif.
- Menampilkan konfirmasi modal sebelum mengunci data sesi menjadi status `Closed` (read-only) dan mengarahkan ke halaman `/finance`.

---

## Screen 2: /sessions — PO Session & Delivery Slot Manager

### Layout

```
PO Sessions                                                 [+ New Session]

┌──────┬──────────────┬───────────────┬───────┬──────────┐
│ ID   │ Tanggal Buka │ Tanggal Tutup │ Kuota │ Status   │
├──────┼──────────────┼───────────────┼───────┼──────────┤
│ PO-4 │ 15 Juni 2026 │ 20 Juni 2026  │ 10    │ [Active] │
└──────┴──────────────┴───────────────┴───────┴──────────┘

▼ Delivery Slots untuk PO-4
┌─────────────────────────────┬────────────────┬─────────┐
│ Jadwal                      │ Gratis Ongkir  │ Aksi    │
├─────────────────────────────┼────────────────┼─────────┤
│ Rabu 17 Juni Pagi           │ [ON]           │ [Hapus] │
│ Kamis 18 Juni Pagi          │ [OFF]          │ [Hapus] │
│ [Contoh: Rabu 17 Juni]      │ OFF (default)  │ [Simpan]│
└─────────────────────────────┴────────────────┴─────────┘
```

### UX & Interactions:
1. **Daftar Sesi**: Menampilkan riwayat sesi PO. Hanya boleh ada 1 sesi dengan status `Active` pada satu waktu.
2. **Tambah Sesi Baru**: Tombol "+ New Session" membuka modal formulir input Tanggal Buka, Tanggal Tutup, dan Kuota Maksimal. Dinonaktifkan (disabled) jika sudah ada sesi yang `Active`.
3. **Detail Delivery Slot (Panel Ekspansi)**:
   - Mengklik baris tabel sesi akan melakukan expand/collapse panel daftar delivery slots di bawah baris tersebut.
   - Menampilkan tabel slot: teks jadwal, tombol switch toggle gratis ongkir (`ON` ↔ `OFF`), dan link **Hapus**.
   - Input field di baris paling bawah panel untuk menambahkan jadwal slot baru ke sesi tersebut.

---

## Screen 3: /finance — Finance & Profit Split

### Layout

```
Finance & Profit Split (PO-4)                                 [🔒 Batch Ditutup]

┌─────────────────────────────────────────┐ ┌─────────────────────────────────────────┐
│  Pengeluaran                            │ │  Kalkulasi Bagi Hasil                   │
│                                         │ │                                         │
│  ┌──────────────┬─────────┬──────┬────┐ │ │  Total Pendapatan (PAID):  Rp 237.000   │
│  │ Nama Bahan   │ Nominal │ Oleh │    │ │ │  Total Modal:              -Rp 97.000   │
│  ├──────────────┼─────────┼──────┼────┤ │ │                            ──────────   │
│  │ Kulit dimsum │ 45.000  │ Adit │[del]│ │  Laba Bersih:              Rp 140.000   │
│  │ Daging ayam  │ 32.000  │ Kila │[del]│ │                                         │
│  │ [Bahan...]   │ [Rp...] │[Adit▼│[add]│ │  Porsi Adit:   Rp 45.000 + Rp 70.000    │
│  └──────────────┴─────────┴──────┴────┘ │ │                = Rp 115.000             │
│                                         │ │  Porsi Kila:   Rp 52.000 + Rp 70.000    │
│  Adit total: Rp 45.000                  │ │                = Rp 122.000             │
│  Kila total: Rp 52.000                  │ │                                         │
│  Total Modal: Rp 97.000                 │ │  Settlement Akhir                       │
│                                         │ │  - Uang dipegang Adit: Rp 180.000       │
│                                         │ │  - Uang dipegang Kila: Rp 57.000        │
│                                         │ │                                         │
│                                         │ │  ┌───────────────────────────────────┐  │
│                                         │ │  │ 💸 Instruksi Transfer             │  │
│                                         │ │  │ Adit transfer ke Kila sebesar:    │  │
│                                         │ │  │ Rp 65.000                         │  │
│                                         │ │  └───────────────────────────────────┘  │
│                                         │ │  [Close Batch & Finalisasi]             │
└─────────────────────────────────────────┘ └─────────────────────────────────────────┘
```

### UX & Interactions:
1. **Expense Tracker (Kolom Kiri)**:
   - Admin dapat mencatat pengeluaran bahan baku selama batch PO berjalan. Input berupa Nama Bahan, Nominal (angka), dan Dibayar Oleh (Dropdown Adit/Kila).
   - Mengklik **Simpan** akan menyisipkan pengeluaran baru. Link **Hapus** menghapusnya secara instan.
   - Total modal Adit, Kila, dan total gabungan terhitung di bawah tabel secara real-time.
2. **Kalkulasi Bagi Hasil & Settlement Akhir (Kolom Kanan)**:
   - **Laba Bersih**: Dihitung dari Total Pendapatan PAID - Total Modal.
   - **Porsi Akhir**: Masing-masing partner berhak mendapatkan nominal modal yang mereka bayarkan ditambah setengah dari Laba Bersih.
   - **Settlement Akhir**:
     - Sistem mendeteksi total uang tunai/digital yang secara fisik dipegang oleh masing-masing partner berdasarkan kolom `metode_bayar` order (BCA/Dana/Cash Adit dihitung ke Adit; QRIS/BNI/Shopeepay/Cash Kila ke Kila).
     - Menampilkan instruksi transfer yang akurat: Partner yang memegang uang lebih banyak harus mentransfer nominal selisih ke partner lainnya agar pembagian profit adil 50/50.
3. **Close Batch & Finalisasi**:
   - Tombol konfirmasi finalisasi. Jika diklik, membuka konfirmasi modal. Setelah disetujui, sesi PO dikunci menjadi status `Closed`, dan seluruh input/hapus di halaman ini dibekukan (read-only).

---

## Screen 4: /alias — Dictionary Manager

### Layout

```
Dictionary Manager
┌─────────────────────────────────┐
│ [Product Aliases] [Area Keywords]│
└─────────────────────────────────┘

Search: [kata kunci...]

┌──────────────────────┬────────────────────────┬──────────────┬─────────┐
│ Kata Kunci (slang)   │ Nama Produk Baku       │ Kitchen Code │ Aksi    │
├──────────────────────┼────────────────────────┼──────────────┼─────────┤
│ roti yummy           │ Bacar Kecil 120ml      │ bk           │ [Edit]  │
│ badil                │ BAdil                  │ BD           │ [Edit]  │
│ [kata kunci...]      │ [baku...]              │ [code]       │ [Tambah]│
└──────────────────────┴────────────────────────┴──────────────┴─────────┘
```

### UX & Interactions:
1. **Tab Switcher**: Admin dapat beralih antara tabel **Product Aliases** (untuk slang menu) dan **Area Keywords** (untuk tag daerah pengiriman).
2. **Product Aliases**:
   - Menampilkan kata kunci slang, produk baku tujuan, dan kitchen code.
   - Mengklik **Edit** mengubah baris menjadi input field inline yang dapat langsung diubah dan disimpan.
   - Kolom paling bawah merupakan form input untuk menambahkan alias baru.
3. **Area Keywords**:
   - Menampilkan daftar keyword daerah pengiriman yang dipetakan ke area resmi (cth: `tekkim` -> `ITS`, `rungkut` -> `Rungkut`).
   - Admin dapat menambahkan keyword baru atau menghapus keyword lama.

---

## Screen 5: /assets — Assets Library

### Layout

```
Assets Library
Kumpulan QRIS dan materi promosi.

┌──────────────────────────────────────┐ ┌──────────────────────────────────────┐
│  QRIS                                │ │  Poster                              │
│  ┌────────────────────────────────┐  │ │  ┌────────────────────────────────┐  │
│  │                                │  │ │  │                                │  │
│  │         [Image QRIS]           │  │ │  │        [Image Poster]          │  │
│  │                                │  │ │  │                                │  │
│  └────────────────────────────────┘  │ │  └────────────────────────────────┘  │
│  Category: Payment                   │ │  Category: Marketing                 │
│  Description: QRIS Dimsavor (BCA)    │ │  Description: Poster promosi         │
│  [Download]                          │ │  [Download]                          │
└──────────────────────────────────────┘ └──────────────────────────────────────┘
```

### UX & Interactions:
1. **Grid Asset**: Menampilkan galeri visual asset penting (QRIS pembayaran, Poster promosi).
2. **Lihat Penuh**: Mengklik area gambar membuka modal fullscreen visualizer untuk memeriksa detail gambar.
3. **Download**: Mengklik tombol download akan mengarahkan browser untuk mengunduh asset secara lokal.

---

## Error & Loading States (Global)

| Situation | Behavior |
|---|---|
| First API call (Render cold start) | Full-page spinner + "Menghubungkan ke server... (~30 detik)" |
| Subsequent API loading | Inline skeleton / spinner per component |
| API error on toggle | Revert optimistic update + toast: "Gagal memperbarui. Coba lagi." |
| Empty table | Contextual empty message (e.g. "Belum ada pesanan di sesi ini.") |
| Session not found | Redirect to /sessions with error banner |

