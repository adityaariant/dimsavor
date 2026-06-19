# Panduan Setup Discord Bot Dimsavor

Bot Discord ini berfungsi untuk melakukan **batch parsing** terhadap chat pesanan WhatsApp yang disalin ke channel `#order-inbox`, serta secara otomatis mengirimkan **ringkasan harian (daily summary)** di channel `#daily-summary`.

---

## 1. Setup di Discord Developer Portal

1. Buka [Discord Developer Portal](https://discord.com/developers/applications) dan login dengan akun Discord Anda.
2. Klik tombol **New Application** di kanan atas, beri nama aplikasi (misalnya: `Dimsavor Bot`), lalu klik **Create**.
3. Masuk ke menu **Bot** di bilah menu kiri:
   - Klik **Reset Token** untuk mendapatkan token bot baru, lalu salin token tersebut. Ini adalah `DISCORD_BOT_TOKEN`.
   - Gulir ke bawah hingga bagian **Privileged Gateway Intents**.
   - Aktifkan **Message Content Intent** (wajib diaktifkan agar bot dapat membaca pesan teks pesanan).
   - Klik **Save Changes**.
4. Masuk ke menu **OAuth2** -> **URL Generator**:
   - Di bagian **Scopes**, centang **bot**.
   - Di bagian **Bot Permissions**, centang izin berikut:
     - `Send Messages`
     - `Embed Links`
     - `Read Message History`
     - `Manage Messages` (opsional, untuk tombol Dismiss yang menghapus pesan bot)
   - Salin URL yang dihasilkan di bagian bawah, buka URL tersebut di browser, lalu undang bot ke server Discord Anda.

---

## 2. Setup Akun Bot di Supabase

Karena sistem Dimsavor menggunakan autentikasi Supabase, bot memerlukan akun untuk login dan memperoleh JWT token.
1. Masuk ke dashboard Supabase Anda -> **Authentication** -> **Users**.
2. Klik **Add User** -> **Create User**.
3. Masukkan email bot (misalnya: `bot@dimsavor.internal`) dan password (misalnya: `SandiBotDimsavor123!`).
4. Pastikan akun tersebut dikonfirmasi (confirmed) agar dapat digunakan untuk login.
5. (Opsional) Di tabel `profiles` database Supabase Anda, tambahkan baris baru dengan `id` UUID bot Anda dan tentukan `display_name` (misalnya: `Discord Bot`). Jika dilewati, backend akan otomatis menggunakan nama `bot` dari awalan email.

---

## 3. Konfigurasi Environment Variables (`.env`)

Salin file `.env.example` menjadi `.env` di dalam folder ini:
```bash
cp .env.example .env
```
Lalu isi variabel di dalamnya:
- `DISCORD_BOT_TOKEN`: Token bot dari Discord Developer Portal.
- `DISCORD_CHANNEL_ID`: ID channel untuk `#order-inbox`.
- `DISCORD_SUMMARY_CHANNEL_ID`: ID channel untuk `#daily-summary`.
- `API_BASE_URL`: URL backend FastAPI Anda (misalnya `http://localhost:8000` saat lokal, atau URL Render Anda).
- `SUPABASE_URL` & `SUPABASE_ANON_KEY`: Salin dari pengaturan Supabase Anda.
- `SUPABASE_BOT_EMAIL`: Email bot yang Anda buat (`bot@dimsavor.internal`).
- `SUPABASE_BOT_PASSWORD`: Password bot yang Anda buat.

*(Catatan: Untuk mendapatkan ID channel di Discord, aktifkan **Developer Mode** di Discord Settings -> Advanced, lalu klik kanan channel dan pilih **Copy Channel ID**).*

---

## 4. Instalasi dan Menjalankan Bot

Pastikan Anda telah menginstal Python 3.10 ke atas, lalu jalankan perintah berikut di terminal:

```bash
# Install dependencies
pip install -r requirements.txt

# Jalankan bot
python main.py
```

### Perintah Khusus Bot:
- `!check`: Untuk memeriksa status bot, koneksi ke backend FastAPI, serta sesi PO aktif.
- `!summary`: Untuk memicu pengiriman ringkasan produksi 7 metrik secara manual ke channel `#daily-summary`.
