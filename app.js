const $ = (selector) => document.querySelector(selector);
const state = { apps: [], countries: [], orders: [], toastTimer: null };
$('#year').textContent = new Date().getFullYear();

function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}
function getArray(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    for (const key of ['data', 'results', 'items', 'apps', 'countries', 'orders', 'servers', 'prices']) {
        if (Array.isArray(data[key])) return data[key];
    }
    if (data.data && typeof data.data === 'object') {
        for (const key of ['items', 'results', 'apps', 'countries', 'orders', 'servers', 'prices']) {
            if (Array.isArray(data.data[key])) return data.data[key];
        }
    }
    return [];
}
function pick(obj, keys, fallback = '—') {
    for (const key of keys) if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
    return fallback;
}
function safeText(value) { return String(value ?? '—'); }
function money(value, currency = 'IDR') {
    const num = Number(value);
    return Number.isFinite(num) ? new Intl.NumberFormat('id-ID', { style: 'currency', currency, maximumFractionDigits: 0 }).format(num) : safeText(value);
}
async function api(resource, params = {}) {
    const query = new URLSearchParams(params);
    const response = await fetch(`/api/${resource}${query.toString() ? `?${query}` : ''}`);
    let data;
    try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) throw new Error(data.error || data.message || `API error (${response.status})`);
    return data;
}
function setConnection(ok, message) {
    $('#connection-text').textContent = ok ? 'Terhubung' : 'Perlu diperiksa';
    $('#connection-title').textContent = ok ? 'Server API merespons' : 'Belum terhubung';
    $('#connection-detail').textContent = message;
    $('.status-dot').style.background = ok ? '#43d6a0' : '#f0b45c';
}
function renderCards(container, items, type) {
    if (!items.length) {
        container.innerHTML = '<div class="empty-state">Data kosong atau format respons API berbeda dari perkiraan.</div>';
        return;
    }
    container.innerHTML = items.map((item) => {
        const name = pick(item, ['name', 'title', 'app_name', 'country_name', 'id', 'code']);
        const id = pick(item, ['id', 'app_id', 'country_id', 'code']);
        const extra = type === 'countries'
            ? `${pick(item, ['iso', 'iso2', 'country_code'], '')} ${pick(item, ['calling_code', 'dial_code'], '')}`
            : type === 'prices' ? money(pick(item, ['price', 'amount', 'cost'], '—'), pick(item, ['currency'], 'IDR'))
            : pick(item, ['description', 'slug', 'server', 'status'], 'Data dari API Telekos');
        return `<article class="data-card"><h3>${escapeHtml(name)}</h3><p>ID: ${escapeHtml(id)}</p><p>${escapeHtml(extra)}</p><span class="tag">${escapeHtml(type)}</span></article>`;
    }).join('');
}
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function renderOrders(container, orders, compact = false) {
    state.orders = orders;
    $('#orders-count').textContent = orders.length;
    if (!orders.length) { container.innerHTML = '<div class="empty-state">Tidak ada pesanan yang ditampilkan.</div>'; return; }
    const rows = orders.map(order => {
        const id = pick(order, ['id', 'order_id', 'trx_id']);
        const app = pick(order.app || {}, ['name', 'id'], pick(order, ['app_name', 'app']));
        const country = pick(order.country || {}, ['name', 'iso'], pick(order, ['country_name', 'country']));
        const status = pick(order, ['status', 'state']);
        const price = money(pick(order, ['price', 'amount', 'cost']), pick(order, ['currency'], 'IDR'));
        return `<tr><td>${escapeHtml(id)}</td><td>${escapeHtml(app)}</td><td>${escapeHtml(country)}</td><td><span class="status">${escapeHtml(status)}</span></td><td>${escapeHtml(price)}</td></tr>`;
    }).join('');
    container.innerHTML = `<table><thead><tr><th>Order ID</th><th>App</th><th>Country</th><th>Status</th><th>Price</th></tr></thead><tbody>${rows}</tbody></table>`;
}
async function loadBalance() {
    const data = await api('balance');
    const obj = data.data || data;
    const value = pick(obj, ['balance', 'amount', 'available_balance', 'credit'], null);
    $('#balance-value').textContent = value === null ? 'Tersedia' : money(value, pick(obj, ['currency'], 'IDR'));
}
async function loadApps() {
    const data = await api('apps');
    state.apps = getArray(data);
    $('#apps-count').textContent = state.apps.length || '—';
    renderCards($('#applications-list'), state.apps, 'applications');
    const select = $('#country-app');
    const previous = select.value;
    if (state.apps.length) {
        select.innerHTML = state.apps.map(app => {
            const id = pick(app, ['id', 'app_id', 'code', 'slug'], 'wa');
            const name = pick(app, ['name', 'title'], id);
            return `<option value="${escapeHtml(id)}">${escapeHtml(name)} (${escapeHtml(id)})</option>`;
        }).join('');
        if ([...select.options].some(option => option.value === previous)) select.value = previous;
    }
}
async function loadCountries() {
    const app = $('#country-app').value || 'wa';
    const data = await api('countries', { app });
    state.countries = getArray(data);
    $('#countries-count').textContent = state.countries.length || '—';
    renderCards($('#countries-list'), state.countries, 'countries');
}
async function loadPrices() {
    const params = {
        server: $('#price-server').value.trim(),
        app: $('#price-app').value.trim(),
        country: $('#price-country').value.trim()
    };
    if (!params.server || !params.app || !params.country) {
        toast('Isi Server ID, App ID, dan Country ID terlebih dahulu.'); return;
    }
    const data = await api('prices', params);
    renderCards($('#prices-list'), getArray(data), 'prices');
}
async function loadOrders() {
    const page = $('#orders-page').value || '1';
    const data = await api('orders', { page });
    const orders = getArray(data);
    renderOrders($('#orders-list'), orders);
    renderOrders($('#recent-orders'), orders.slice(0, 5), true);
}
async function refreshDashboard() {
    $('#refresh-btn').disabled = true;
    $('#refresh-btn').textContent = '↻ Loading…';
    try {
        const results = await Promise.allSettled([loadBalance(), loadApps(), loadCountries(), loadOrders()]);
        const failed = results.filter(result => result.status === 'rejected');
        if (failed.length === results.length) {
            setConnection(false, failed[0].reason.message);
            toast(`API belum berhasil dimuat: ${failed[0].reason.message}`);
        } else {
            setConnection(true, failed.length ? `${failed.length} bagian gagal dimuat. Periksa konfigurasi atau format respons.` : 'Data utama berhasil dimuat dari API.');
            if (failed.length) toast(failed[0].reason.message);
        }
    } finally {
        $('#refresh-btn').disabled = false;
        $('#refresh-btn').innerHTML = '↻ <span>Refresh data</span>';
    }
}
function showPage(page) {
    const valid = ['dashboard', 'applications', 'countries', 'prices', 'orders'].includes(page) ? page : 'dashboard';
    document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === `page-${valid}`));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.page === valid));
    $('#page-title').textContent = ({ dashboard: 'Dashboard', applications: 'Applications', countries: 'Countries', prices: 'Live price', orders: 'Orders' })[valid];
    $('.sidebar').classList.remove('open');
    if (valid === 'applications') loadApps().catch(err => toast(err.message));
    if (valid === 'countries') loadCountries().catch(err => toast(err.message));
    if (valid === 'orders') loadOrders().catch(err => toast(err.message));
}
document.querySelectorAll('[data-page]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); showPage(link.dataset.page); history.replaceState(null, '', `#${link.dataset.page}`); }));
document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => { showPage(button.dataset.go); history.replaceState(null, '', `#${button.dataset.go}`); }));
$('#refresh-btn').addEventListener('click', refreshDashboard);
$('#load-countries').addEventListener('click', () => loadCountries().catch(err => toast(err.message)));
$('#load-prices').addEventListener('click', () => loadPrices().catch(err => toast(err.message)));
$('#load-orders').addEventListener('click', () => loadOrders().catch(err => toast(err.message)));
$('#load-order-detail').addEventListener('click', async () => {
    const id = $('#order-id').value.trim();
    if (!id) return toast('Masukkan ID pesanan terlebih dahulu.');
    try {
        const data = await api('order', { id });
        const order = data.data?.order || data.order || data.data || data;
        const fields = [['Order ID', pick(order, ['id', 'order_id'])], ['Status', pick(order, ['status'])], ['Application', pick(order.app || {}, ['name', 'id'])], ['Country', pick(order.country || {}, ['name', 'iso'])], ['Price', money(pick(order, ['price', 'amount']), pick(order, ['currency'], 'IDR'))], ['Created', pick(order, ['created_at'])], ['Expires', pick(order, ['expires_at'])]];
        $('#order-detail').innerHTML = `<article class="panel detail-card"><div class="panel-heading"><div><h3>Order details</h3><p>Informasi pesanan tanpa data OTP</p></div></div>${fields.map(([label, value]) => `<div class="small-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</article>`;
    } catch (err) { toast(err.message); }
});
$('#menu-toggle').addEventListener('click', () => $('.sidebar').classList.toggle('open'));
window.addEventListener('hashchange', () => showPage(location.hash.slice(1)));
showPage(location.hash.slice(1) || 'dashboard');
refreshDashboard();
