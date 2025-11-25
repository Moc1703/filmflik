# FilmFlik - Film Streaming Platform

Platform streaming film dengan subtitle Indonesia menggunakan Next.js 16.

## 🎬 Fitur Utama

- **Video Player HTML5** dengan kontrol penuh
- **Subtitle Indonesia** dalam format WebVTT
- **Pencarian Film** real-time
- **Info Detail Film** dengan modal interaktif
- **Auto-pause Info** - Menampilkan info film setelah 30 detik pause
- **Responsive Design** - Optimized untuk semua device
- **13+ Film Sample** dari public domain

## 🚀 Teknologi

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Lucide React** untuk icons

## 📦 Instalasi

```bash
# Clone repository
git clone https://github.com/Moc1703/filmflik.git

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🌐 Deploy ke Vercel

1. Push code ke GitHub (sudah selesai ✅)
2. Buka [Vercel](https://vercel.com)
3. Import repository `Moc1703/filmflik`
4. Klik "Deploy"
5. Done! 🎉

Vercel akan otomatis detect Next.js project dan menggunakan konfigurasi yang tepat.

## 📁 Struktur Project

```
film-streaming/
├── app/
│   ├── page.tsx              # Homepage
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   └── watch/[id]/
│       └── page.tsx          # Video player page
├── components/
│   ├── Navbar.tsx            # Navigation dengan search
│   ├── Hero.tsx              # Hero section dengan modal
│   └── MovieRow.tsx          # Grid film
├── lib/
│   └── movies.ts             # Data film
├── public/
│   └── subtitles/            # File subtitle .vtt
└── ...
```

## 🎯 Cara Menggunakan

1. **Browse Film**: Scroll homepage untuk lihat koleksi film
2. **Search**: Klik icon search di navbar untuk cari film
3. **Info Detail**: Klik "Info Lebih" untuk lihat detail lengkap
4. **Tonton Film**: Klik "Putar" atau thumbnail film
5. **Pause Info**: Pause video 30 detik untuk lihat info film

## 📝 Menambah Film Baru

Edit file `lib/movies.ts`:

```typescript
{
  id: "film-id",
  title: "Judul Film",
  description: "Deskripsi film...",
  thumbnail: "URL_thumbnail",
  videoUrl: "URL_video.mp4",
  subtitleUrl: "/subtitles/film-id.vtt", // optional
  duration: "2:30:00",
  genre: "Action",
  year: 2024,
}
```

## 🔒 Environment Variables

Tidak ada environment variable yang diperlukan untuk versi ini.

## 📄 License

MIT License - Free to use untuk proyek personal dan komersial.

## 👨‍💻 Developer

Dibuat dengan ❤️ menggunakan Factory AI
