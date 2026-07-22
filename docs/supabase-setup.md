# Setup Supabase — FILMflik

Panduan menyalakan akun pengguna, progres tontonan, watchlist, dan reset password.

Kode integrasinya sudah lengkap di repo (`lib/supabase/`, `lib/entitlements.ts`,
`app/api/auth/`). Yang belum ada cuma kredensial dan konfigurasi di sisi dashboard.

---

## 0. Cek dulu: project-nya sudah ada atau belum?

**Jangan langsung bikin project baru.** Project baru = URL berbeda + tabel
`auth.users` kosong, jadi semua akun yang sudah terdaftar hilang.

Repo ini tidak menyimpan jawabannya — tidak ada `supabase/config.toml` (CLI belum
pernah di-`link`), dan URL project tidak pernah ter-commit karena `.gitignore`
menutup `.env*`. Jadi cek manual:

1. [supabase.com/dashboard](https://supabase.com/dashboard) — ada project di daftar?
2. Lebih cepat: **Vercel → Settings → Environment Variables**. Kalau
   `NEXT_PUBLIC_SUPABASE_URL` sudah ada di sana, itu sumber kebenarannya —
   salin ke `.env.local` supaya lokal dan produksi menunjuk project yang sama.

| Kondisi | Yang dikerjakan |
|---|---|
| Project sudah ada | Lewati langkah 1. Kerjakan 2 (cek dulu), 3, 4, 5 |
| Belum ada | Kerjakan semua |

---

## 1. Buat project & ambil kunci

New project → region terdekat (**Singapore** untuk Indonesia) → simpan password
database yang di-generate.

**Project Settings → API**, ambil tiga nilai:

| Di dashboard | Ke `.env.local` |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key (rahasia) | `SUPABASE_SERVICE_ROLE_KEY` |

Kalau dashboard menampilkan format kunci baru (`sb_publishable_…` /
`sb_secret_…`): publishable → anon, secret → service_role. Kode
memperlakukannya sebagai string biasa, keduanya jalan.

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

> **`service_role` itu WAJIB, bukan opsional.**
> `.env.example` menandainya *"optional for MVP"* — itu keliru.
> `app/api/auth/signup/route.ts` menolak dengan **503 "Auth is not configured"**
> kalau `hasServiceRole()` false. Tanpa kunci ini pendaftaran akun mati total.

Kunci `service_role` mem-bypass seluruh RLS. Jangan pernah diberi prefiks
`NEXT_PUBLIC_`, jangan sampai masuk git.

---

## 2. Migrasi database

**Cek dulu apakah sudah pernah dijalankan.** Di SQL Editor:

```sql
select tablename from pg_tables where schemaname = 'public';
```

Kalau `profiles`, `watch_progress`, `watchlist`, `subscriptions` sudah muncul —
**lewati langkah ini**.

Kalau belum: SQL Editor → New query → tempel seluruh isi
`supabase/migrations/001_user_system.sql` → Run.

Yang dibuat: empat tabel di atas (semuanya dengan RLS per-pengguna), plus trigger
`on_auth_user_created` yang otomatis membuat baris profil tiap ada pendaftar.

File `002_manual_subscription_example.sql` **tidak perlu dijalankan** — isinya
contoh yang sepenuhnya dikomentari, untuk memberi langganan manual nanti.

> **Migrasi ini tidak idempoten.**
> 9 statement aman diulang (`create table if not exists`, `create or replace
> function`), tapi 10 `create policy` tidak punya pengaman — dan Postgres tidak
> mendukung `CREATE POLICY IF NOT EXISTS`. Menjalankan ulang di database yang
> sudah termigrasi akan **error di baris 16**
> (`policy "profiles_select_own" already exists`).
> Data tidak hilang, cuma gagal di tengah. Karena itu cek dulu.

---

## 3. SMTP — ini yang menghidupkan reset password

**Authentication → Emails → SMTP Settings** → aktifkan *Enable Custom SMTP*.

Tanpa ini, email reset menabrak rate limit bawaan Supabase — tembok yang sama
yang dulu memaksa email konfirmasi dimatikan (commit `efbcbb1`).

Paling gampang pakai [Resend](https://resend.com): daftar → verifikasi domain →
buat API key → isi:

```
Host:         smtp.resend.com
Port:         587
Username:     resend
Password:     <API key Resend>
Sender email: noreply@domainkamu.com
```

Sender email **harus** dari domain yang sudah terverifikasi di penyedia, kalau
tidak email ditolak diam-diam.

Setelah SMTP kustom aktif, naikkan kuota di **Authentication → Rate Limits**.
Batas bawaannya sangat kecil.

---

## 4. Allowlist redirect URL

**Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (ganti domain produksi saat live)
- **Redirect URLs** — tambahkan keduanya:
  ```
  http://localhost:3000/auth/callback
  https://domainkamu.com/auth/callback
  ```

Kalau terlewat, tautan di email reset mental ke halaman error, bukan ke
`/reset-password`.

---

## 5. Restart & uji

```bash
npm run dev
```

Variabel `NEXT_PUBLIC_*` dibaca saat build — **restart wajib**, hot reload tidak cukup.

Alur uji:

1. `/signup` → buat akun (langsung terkonfirmasi, tanpa email)
2. `/login` → klik **Forgot?**
3. Masukkan email → cek inbox
4. Klik tautan → harus mendarat di `/reset-password`
5. Set password baru → login ulang dengan yang baru

---

## ⚠️ Efek samping: semua tontonan langsung terkunci login

`requireAuthToWatch()` di `lib/supabase/env.ts` **default-nya menyala** begitu URL +
anon key terisi. Detik langkah 1 selesai, setiap halaman `/watch/*` minta login —
`proxy.ts` melempar pengunjung anonim ke `/login`.

Kalau selama pengembangan ingin tontonan tetap terbuka:

```bash
REQUIRE_AUTH_TO_WATCH=false
```

Biarkan `REQUIRE_SUBSCRIPTION` apa adanya — default-nya mati, dan menyalakannya
akan memblokir semua orang karena belum ada cara menjual langganan.

---

## Status & langkah berikutnya

**Sudah selesai** (branch `feat/password-reset`):

- Reset password: `/forgot-password`, `/reset-password`,
  `POST /api/auth/forgot-password`, tautan "Forgot?" di halaman login
- Endpoint dijaga same-origin + rate limit (3/alamat/jam, 15/IP/jam) dan selalu
  membalas generik supaya tidak membocorkan apakah suatu email punya akun
- Terverifikasi: `tsc` 0 error, ESLint bersih, build produksi lolos, guard-nya
  diuji terhadap server hidup
- **Belum diuji end-to-end** — pengiriman email nyata perlu langkah 3 & 4 di atas

**Yang menunggu dikerjakan** (urut prioritas, dari audit):

1. Monetisasi — tabel `subscriptions` + `REQUIRE_SUBSCRIPTION` sudah ada tapi
   nol cara menjual. Langkah cepat: panel admin untuk grant manual
   (`provider: 'manual'` sudah ada di check constraint). Lalu gateway sungguhan —
   Midtrans/Xendit lebih cocok daripada Stripe untuk pasar Indonesia, dan perlu
   melonggarkan check constraint `provider` di migrasi 001.
2. "Populer" dari `watch_progress` — datanya sudah mengalir, belum ada satu pun
   query agregat. Rasio nilai/effort terbaik.
3. Dukungan series/episode — saat ini film-only. Ini perubahan skema
   `catalog.json`; lebih murah diputuskan sekarang selagi katalog kecil.
4. Metadata: `genre` masih string tunggal, `subtitleUrl` masih satu bahasa,
   satu `thumbnail` dipakai untuk poster grid sekaligus latar hero.

**Utang teknis yang diketahui:**

- `npm run lint` **gagal** — 3 error `react-hooks/set-state-in-effect` di
  `AuthNavMenu.tsx:26`, `ContinueWatchingRow.tsx:86`, `Hero.tsx:54`. Semuanya
  pre-existing (aturan baru React 19), bukan dari fitur reset password.
- 11 ekspor mati + 1 impor menganggur (`signStreamAssetUrl` di route media),
  sisa migrasi Storage-MP4 → Stream-HLS.
- `allowedPlaybackHosts` (`lib/playback-auth.ts`) dan `allowedRequestHosts`
  (`lib/request-guard.ts`) identik byte-for-byte.
- `README.md` mendeskripsikan versi proyek yang sudah tidak ada.
- `/api/catalog` mengirim seluruh katalog ke tiap pengunjung tanpa paginasi;
  search/filter semua di client.
