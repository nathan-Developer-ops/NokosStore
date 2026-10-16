require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TELEKOS_API_KEY;
const API_BASE = 'https://telekos.id/v1';

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Read-only proxy: the private key is never sent to the browser.
const allowedRoutes = {
    balance: () => '/balance',
    servers: () => '/servers',
    apps: () => '/apps',
    countries: (q) => `/countries?app=${encodeURIComponent(q.app || 'wa')}`,
    prices: (q) => {
        const params = new URLSearchParams();
        for (const key of ['server', 'app', 'country']) {
            if (q[key] !== undefined && String(q[key]).length <= 80) params.set(key, String(q[key]));
        }
        return `/prices?${params.toString()}`;
    },
    orders: (q) => `/orders?page=${encodeURIComponent(String(q.page || '1'))}`,
    order: (q) => `/orders/${encodeURIComponent(String(q.id || ''))}`
};

app.get('/api/:resource', async (req, res) => {
    const builder = allowedRoutes[req.params.resource];
    if (!builder) return res.status(404).json({ error: 'Endpoint tidak tersedia.' });
    if (!API_KEY) return res.status(503).json({ error: 'API key belum diatur di environment server.' });
    if (req.params.resource === 'order' && !/^[a-zA-Z0-9_-]{4,100}$/.test(req.query.id || '')) {
        return res.status(400).json({ error: 'ID pesanan tidak valid.' });
    }
    try {
        const url = API_BASE + builder(req.query);
        const upstream = await fetch(url, {
            headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' },
            signal: AbortSignal.timeout(15000)
        });
        const text = await upstream.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { message: text.slice(0, 1000) }; }
        // Do not return OTP codes/messages from order details to the browser.
        if (req.params.resource === 'order' && data && typeof data === 'object') {
            const root = data.data?.order || data.order || data.data;
            if (root && Array.isArray(root.otps)) {
                root.otps = root.otps.map(({ id, sender, received_at }) => ({ id, sender, received_at, code: '[REDACTED]', message: '[REDACTED]' }));
            }
        }
        res.status(upstream.status).json(data);
    } catch (error) {
        res.status(502).json({ error: 'Tidak dapat menghubungi API Telekos.', detail: error.name === 'TimeoutError' ? 'Permintaan timeout.' : 'Periksa koneksi atau konfigurasi API.' });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(`Nokos Store berjalan di port ${PORT}`));
