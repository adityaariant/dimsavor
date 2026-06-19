
# Overhaul Design — Warm Artisan Refresh

Tujuan: hilangin kesan "AI slop / dark generic + amber" jadi tampilan yang punya karakter craft — cocok buat brand makanan UMKM (Dimsavor). Fitur, struktur halaman, dan logika **tidak diubah**. Cuma lapisan visual.

## Design Direction

**Mood:** warm, tactile, editorial — kayak menu cafe artisan / kemasan craft, bukan dashboard SaaS.

**Palette (light-first, hangat):**
- Background base: `#FAF6EF` (cream paper)
- Surface/card: `#FFFFFF` dengan border `#E8DFCF`
- Ink (teks utama): `#1F1A14` (almost-black warm)
- Muted text: `#6B5E4C`
- Primary accent: `#B8462A` (terracotta) — ganti amber norak yang sekarang
- Secondary accent: `#3D5A3A` (sage/forest) buat status positif (PAID/SENT)
- Warning/danger: `#A8341F` (rust merah), bukan merah neon
- Highlight halus: `#E8C9A0` (sand) buat badge/hover

**Tipografi:**
- Display/heading: **Fraunces** (serif modern, sedikit quirky — kasih rasa craft/editorial)
- Body & UI: **Inter Tight** atau **DM Sans** (clean, readable)
- Mono (untuk ID PO, kode kitchen, angka tabel): **JetBrains Mono** — dipertahankan karena fungsional

**Komponen & detail:**
- Border-radius lebih lembut & konsisten (cards 14px, buttons 10px, inputs 10px)
- Shadow halus berbasis warna ink (bukan pure black) → berasa printed paper, bukan glow
- Badge status pakai pill dengan warna soft + teks gelap (PAID = sage bg + ink text), bukan saturated block
- Tabel: row divider tipis warm-gray, hover row dengan cream tint
- Sidebar: background sedikit lebih gelap dari canvas (`#F1EADC`), active item pakai terracotta indicator bar di kiri + teks ink (bukan full block amber)
- Top banner "Read-only" jadi strip tipis terracotta muted, bukan amber tebal

## Yang Dikerjakan

1. **Tokens (`src/styles.css`)**
   - Rewrite `:root` + `@theme inline` dengan palet warm artisan di atas
   - Tambah token `--shadow-paper`, `--gradient-warm` untuk dipakai di card hero (laba/tagihan)
   - Pastikan kontras OK (WCAG AA untuk text on cream)

2. **Tipografi**
   - `bun add @fontsource/fraunces @fontsource/inter-tight @fontsource/jetbrains-mono`
   - Import di `src/main.tsx` (atau entry yang dipakai)
   - Map `--font-display`, `--font-sans`, `--font-mono` di `@theme`
   - Heading di semua halaman pakai Fraunces; body Inter Tight

3. **Polish komponen shadcn (variant-level, bukan rewrite)**
   - `button.tsx`: variant `default` jadi terracotta, `secondary` jadi sand, hilangkan ring biru default
   - `badge.tsx`: tambah variant `paid`, `pending`, `sent`, `cancelled`, `unpaid` dengan warna sesuai palet
   - `card.tsx`: shadow + border baru
   - `table.tsx`: spacing & divider warm
   - `input.tsx` / `select.tsx`: background cream, border warm

4. **Halaman (visual-only sweep)**
   - Dashboard: hero stat cards (Tagihan Unpaid, Laba Bersih) pakai gradient warm subtle + Fraunces besar untuk angka; ringkasan produksi jadi grid lebih airy
   - Sessions: tabel diperhalus, status badge konsisten
   - Finance & Profit Split: section Laba Bersih jadi focal point editorial (display serif besar, garis pemisah tipis), Settlement card dikasih treatment "receipt"
   - Alias Manager: tab pill diperbaiki, row form ditambah breathing room
   - Assets: card asset dengan border craft + label kategori jadi small caps

5. **Sidebar & top banner**
   - Sidebar warna cream-tinted gelap, active state pakai left-indicator terracotta
   - Banner read-only jadi strip tipis terracotta muted dengan ikon kecil

## Yang TIDAK Diubah
- Routing, state, server functions, schema, fitur parser, perhitungan finance — semua tetap
- Susunan section di tiap halaman (urutan & jumlah card sama)
- Bahasa Indonesia di semua copy tetap

## Catatan
Karena ini visual refresh, perubahan terjadi mostly di `src/styles.css`, `src/components/ui/*`, dan className di halaman. Setelah selesai aku verifikasi visual via screenshot biar nggak ada kontras jelek atau layout pecah.
