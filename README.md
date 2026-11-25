# Pantau Pengadaan Infokom

Web app monitoring proses pesanan pengadaan, realisasi anggaran MAK (`BMB`, `BDC`, `BDB`), dan proyeksi ketersediaan dana berbasis **Google Sheets + Google Apps Script + Google Drive + Cloudflare Pages**.

---

## 🚀 Langkah Setup & Deploy

### 1. Buat Google Sheets & Deploy Google Apps Script
1. Buat Google Spreadsheet baru di Google Drive (misal: `DB Pantau Pengadaan Infokom`).
2. Buka menu **Extensions → Apps Script**.
3. Buat file `.gs` di editor Apps Script sesuai isi folder `google-apps-script/`:
   - `Code.gs`
   - `Auth.gs`
   - `Tickets.gs`
   - `Tickets2.gs`
   - `Drive.gs`
   - `Dokumen.gs`
   - `FaDetail.gs`
   - `Settings.gs`
   - `Users.gs`
4. Di editor Apps Script, pilih fungsi **`setupDatabase`** pada dropdown di atas, lalu klik **Run** (sekali saja).
   - Berikan izin akses Google Sheets & Google Drive saat diminta.
   - Ini otomatis membuat 9 sheet beserta data awal:
     - Akun login default (password: `adaptif 2025`):
       - `admin` (role: `admin`)
       - `user` (role: `user`)
       - `pbj` (role: `pbj`)
     - 9 item default pada `harga_referensi` (Input Cepat).
5. Klik **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy **Web app URL** (berakhiran `/exec`).

### 2. Setup Google Drive Folder Root
1. Buat folder baru di Google Drive Anda, misalnya `Pantau Pengadaan Infokom`.
2. Copy **Folder ID** dari URL browser (`https://drive.google.com/drive/folders/<FOLDER_ID>`).
3. Login ke web app sebagai `admin`, buka menu **Pengaturan AI & Drive**, lalu tempel Folder ID dan klik **Test Akses Folder** → **Simpan**.

### 3. Setup AI Router (9Router / OpenAI-Compatible / Gemini)
1. Login sebagai `admin` → buka **Pengaturan AI & Drive**.
2. Isi **Endpoint URL**, **Nama Model**, dan **API Key** (misalnya 9Router endpoint Anda).
3. Klik **Test Koneksi AI** → **Simpan**.

### 4. Deploy & CI/CD Otomatis (GitHub → Cloudflare Pages)

1. Isi `GAS_URL` di `js/config.js` dengan URL Web App GAS Anda (atau atur langsung dari tombol *Konfigurasi URL Server* di halaman Login).
2. Buat repository di GitHub, lalu push project ini ke branch `main`:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Pantau Pengadaan Infokom"
   git branch -M main
   git remote add origin https://github.com/<username>/<nama-repo>.git
   git push -u origin main
   ```
3. Di Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**:
   - Pilih repo GitHub Anda
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: *(kosongkan)*
   - Build output directory: `/`
4. Klik **Save and Deploy**. Selanjutnya setiap kali Anda `git push` ke `main`, Cloudflare Pages otomatis build dan deploy versi terbaru!
