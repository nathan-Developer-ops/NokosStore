# Nokos Store

Dashboard Node.js + Express + HTML/CSS/JS untuk membaca data Telekos. API key hanya digunakan di backend.

## Fitur
- Dashboard saldo, aplikasi, negara, dan jumlah order
- Applications, Countries, Live Price, Orders, detail order
- Proxy server-side ke endpoint Telekos
- Detail order meredaksi nilai OTP/message
- Responsif untuk HP dan desktop

## Jalankan lokal
1. Install Node.js 18 atau lebih baru.
2. Salin `.env.example` menjadi `.env`.
3. Isi `TELEKOS_API_KEY` pada `.env` menggunakan key rahasia milikmu.
4. Jalankan `npm install` lalu `npm start`.
5. Buka `http://localhost:3000`.

Jangan unggah file `.env` ke GitHub dan jangan letakkan API key di `public/app.js` atau HTML.

## Deploy dari HP
1. Buat repository GitHub dan unggah isi folder ini, kecuali `.env` dan `node_modules`.
2. Buat layanan web Node.js di penyedia hosting yang mendukung Node.js.
3. Hubungkan repository dan set build command `npm install`, start command `npm start`.
4. Tambahkan environment variable `TELEKOS_API_KEY` di pengaturan hosting. Opsional `PORT` biasanya diatur otomatis oleh hosting.
5. Deploy lalu buka URL yang diberikan.

## Endpoint proxy
- `GET /api/balance`
- `GET /api/servers`
- `GET /api/apps`
- `GET /api/countries?app=wa`
- `GET /api/prices?server=server3&app=1&country=6`
- `GET /api/orders?page=1`
- `GET /api/order?id=TRX-...`

API ini sengaja read-only; pembelian, pembatalan, penyelesaian, dan tampilan kode OTP tidak diaktifkan pada template ini. Respons Telekos yang berbeda dari format umum mungkin memerlukan penyesuaian `getArray()` di `public/app.js`.
