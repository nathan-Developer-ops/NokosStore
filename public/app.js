const $ = s => document.querySelector(s);
const state = {servers:[],apps:[],countries:[],prices:[],orders:[],server:null,app:null,country:null,price:null};
const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr = data => {
 if(Array.isArray(data)) return data;
 if(!data || typeof data!=='object') return [];
 for(const k of ['data','results','items','servers','apps','countries','orders','prices']) if(Array.isArray(data[k])) return data[k];
 if(data.data && typeof data.data==='object') for(const k of ['items','results','servers','apps','countries','orders','prices']) if(Array.isArray(data.data[k])) return data.data[k];
 return [];
};
const val=(o,keys,fallback='')=>{for(const k of keys)if(o&&o[k]!==undefined&&o[k]!==null&&o[k]!=='')return o[k];return fallback};
const idOf=(o,keys)=>String(val(o,keys,''));
const labelOf=(o,keys)=>String(val(o,keys,idOf(o,['id','code','slug'])||'Tidak diketahui'));
const money=(v,c='IDR')=>{let n=Number(v);if(!Number.isFinite(n))return v||'—';try{return new Intl.NumberFormat('id-ID',{style:'currency',currency:c,maximumFractionDigits:0}).format(n)}catch{return 'Rp '+n.toLocaleString('id-ID')}};
async function api(resource,params={}){const q=new URLSearchParams(params);const r=await fetch('/api/'+resource+(q.size?'?'+q:''));let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||d.message||`API error ${r.status}`);return d}
function toast(s){const el=$('#toast');el.textContent=s;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),3600)}
function showModal(title,text){$('#modalTitle').textContent=title;$('#modalText').textContent=text;$('#modal').classList.add('show')}
function serverId(s){return val(s,['id','server_id','code','slug','name'],'')}
function appId(a){return val(a,['id','app_id','code','slug'],'')}
function countryId(c){return val(c,['id','country_id','code','iso','iso2'],'')}
function serverName(s){return String(val(s,['name','title','label'],`Server ${serverId(s)}`))}
function appName(a){return String(val(a,['name','title','app_name','label'],appId(a)))}
function countryName(c){return String(val(c,['name','title','country_name','label'],countryId(c)))}
function renderServers(){
 const el=$('#servers');
 if(!state.servers.length){el.innerHTML='<div class="loading">Server tidak ditemukan dari API.</div>';return}
 el.innerHTML=state.servers.map((s,i)=>{const id=serverId(s);return `<button class="choice server-choice ${state.server&&String(serverId(state.server))===String(id)?'selected':''}" data-server-index="${i}"><span class="server-icon">▦</span><span><strong>${escapeHtml(serverName(s))}</strong><small>${escapeHtml(val(s,['description','status','type'],'Tersedia di API'))}</small></span></button>`}).join('');
 el.querySelectorAll('[data-server-index]').forEach(b=>b.onclick=()=>{state.server=state.servers[Number(b.dataset.serverIndex)];state.country=null;state.price=null;renderServers();updateSummary();if(state.app)loadCountries().catch(e=>toast(e.message));else toast('Sekarang tekan Pilih Platform untuk memilih aplikasi dari API.')});
 $('#serverStatus').innerHTML=state.servers.map(s=>`<div class="server-line"><span class="mini-server">▦</span><span>${escapeHtml(serverName(s))}<small><i></i> Data API</small></span></div>`).join('');
}
function renderApps(){
 const el=$('#platforms');
 if(!state.apps.length){el.innerHTML='<div class="loading">Aplikasi tidak ditemukan dari API.</div>';return}
 el.innerHTML=state.apps.map((a,i)=>{const name=appName(a);const icons={'WhatsApp':'🟢','Whatsapp':'🟢','Telegram':'✈️','Instagram':'📸','Facebook':'🔵','TikTok':'🎵','X':'𝕏'};return `<button class="choice app-choice ${state.app&&String(appId(state.app))===String(appId(a))?'selected':''}" data-app-index="${i}"><span class="app-icon">${icons[name]||'📱'}</span><strong>${escapeHtml(name)}</strong></button>`}).join('');
 el.querySelectorAll('[data-app-index]').forEach(b=>b.onclick=async()=>{state.app=state.apps[Number(b.dataset.appIndex)];state.country=null;state.price=null;renderApps();$('#platformHint').textContent='Dipilih: '+appName(state.app);$('#platformToggle').setAttribute('aria-expanded','true');$('#platformArea').hidden=false;updateSummary();try{await loadCountries()}catch(e){toast(e.message)}});
}
function renderCountries(filter=''){
 const el=$('#countries');const list=state.countries.filter(c=>countryName(c).toLowerCase().includes(filter.toLowerCase())||String(val(c,['iso','iso2','country_code'],'')).toLowerCase().includes(filter.toLowerCase()));
 if(!list.length){el.innerHTML='<div class="loading">Tidak ada negara yang cocok, atau API mengembalikan daftar kosong.</div>';return}
 el.innerHTML=list.map(c=>{const idx=state.countries.indexOf(c);const name=countryName(c);const flags={'Indonesia':'🇮🇩','Malaysia':'🇲🇾','Singapura':'🇸🇬','Singapore':'🇸🇬','Amerika Serikat':'🇺🇸','United States':'🇺🇸','Inggris':'🇬🇧','United Kingdom':'🇬🇧','Canada':'🇨🇦','Kanada':'🇨🇦','Germany':'🇩🇪','Jerman':'🇩🇪','Australia':'🇦🇺','India':'🇮🇳','Brazil':'🇧🇷','Brasil':'🇧🇷'};const p=priceForCountry(c);return `<button class="choice country-choice ${state.country&&String(countryId(state.country))===String(countryId(c))?'selected':''}" data-country-index="${idx}"><span class="flag">${flags[name]||'🌐'}</span><strong>${escapeHtml(name)}</strong><small>${p!==null?escapeHtml(money(p)):escapeHtml(val(c,['calling_code','dial_code'],'Tersedia'))}</small></button>`}).join('');
 el.querySelectorAll('[data-country-index]').forEach(b=>b.onclick=async()=>{state.country=state.countries[Number(b.dataset.countryIndex)];state.price=null;renderCountries($('#countrySearch').value);updateSummary();try{await loadPrice()}catch(e){toast('Negara dipilih, tetapi harga belum berhasil dimuat: '+e.message)}});
}
function priceForCountry(c){const cid=String(countryId(c));const found=state.prices.find(p=>String(val(p,['country_id','country','id'],'!'))===cid);const n=Number(val(found||{},['price','amount','cost','rate'],NaN));return Number.isFinite(n)?n:null}
async function loadServers(){const d=await api('servers');state.servers=arr(d);if(!state.server)state.server=state.servers[0]||null;renderServers();updateSummary()}
async function loadApps(){const d=await api('apps');state.apps=arr(d);renderApps();$('#platformHint').textContent=state.app?'Dipilih: '+appName(state.app):'Ketuk untuk melihat aplikasi dari API'}
async function loadCountries(){if(!state.app){$('#countryPrompt').textContent='Pilih platform terlebih dahulu.';return}const app=appId(state.app);const d=await api('countries',{app});state.countries=arr(d);$('#countryPrompt').hidden=state.countries.length>0;$('#countryArea').hidden=!state.countries.length;$('#countrySearch').value='';renderCountries();$('#platformHint').textContent='Dipilih: '+appName(state.app)}
async function loadPrice(){
 if(!state.server||!state.app||!state.country)return;
 const params={server:String(serverId(state.server)),app:String(appId(state.app)),country:String(countryId(state.country))};
 const d=await api('prices',params);state.prices=arr(d);
 const exact=state.prices.find(p=>String(val(p,['country_id','country','countryId'],'!'))===params.country);
 const p=exact||state.prices[0];
 if(p){state.price=val(p,['price','amount','cost','rate'],null);if(state.price===null&&typeof p==='number')state.price=p}
 updateSummary();
 if(state.price===null||state.price===undefined)toast('API harga merespons, tetapi field harga tidak dikenali. Periksa format respons Telekos.');
}
async function loadBalance(){const d=await api('balance');const o=d.data||d;const v=val(o,['balance','amount','available_balance','credit'],null);$('#balanceValue').textContent=v===null?'Tersedia':money(v,val(o,['currency'],'IDR'))}
async function loadOrders(){const d=await api('orders',{page:'1'});state.orders=arr(d);$('#recentOrders').innerHTML=state.orders.length?state.orders.slice(0,5).map(o=>`<div class="recent-item"><span class="recent-icon">📱</span><span><strong>#${escapeHtml(val(o,['id','order_id','trx_id'],'—'))}</strong><small>${escapeHtml(val(o.app||{},['name','id'],val(o,['app_name','app'],'Aplikasi')))} · ${escapeHtml(val(o.country||{},['name','iso'],val(o,['country_name','country'],'Negara')))}</small></span><b class="status">${escapeHtml(val(o,['status','state'],'—'))}</b></div>`).join(''):'<div class="loading">Belum ada pesanan pada respons API.</div>'}
function updateSummary(){
 $('#sumServer').textContent=state.server?serverName(state.server):'—';$('#sumPlatform').textContent=state.app?appName(state.app):'Belum dipilih';$('#sumCountry').textContent=state.country?countryName(state.country):'Belum dipilih';
 const p=state.price!==null&&state.price!==undefined?money(state.price):'—';$('#sumPrice').textContent=p;$('#price').textContent=p;$('#serverChip').textContent=state.server?serverName(state.server):'Belum dipilih';
 document.querySelectorAll('.step').forEach((el,i)=>el.classList.toggle('active',i===0?!!state.server:i===1?!!state.app:i===2?!!state.country:i===3?false:false));
}
async function refreshAll(){
 $('#refreshBtn').disabled=true;$('#refreshBtn').textContent='↻ Memuat API…';
 try{
  const results=await Promise.allSettled([loadServers(),loadApps(),loadBalance(),loadOrders()]);
  const failed=results.filter(r=>r.status==='rejected');
  if(failed.length===results.length){$('#apiBadge').textContent='API gagal';$('#statusTitle').textContent='API belum terhubung';$('#statusDetail').textContent=failed[0].reason.message;$('#statusDot').classList.add('offline');toast(failed[0].reason.message)}
  else{$('#apiBadge').textContent=failed.length?'API sebagian':'API terhubung';$('#statusTitle').textContent=failed.length?'Sebagian API merespons':'Server API merespons';$('#statusDetail').textContent=failed.length?failed[0].reason.message:'Data dibaca dari backend Telekos';$('#statusDot').classList.toggle('offline',!!failed.length);if(failed.length)toast(failed[0].reason.message)}
 }finally{$('#refreshBtn').disabled=false;$('#refreshBtn').textContent='↻ Refresh data API'}
}
$('#platformToggle').addEventListener('click',async()=>{const open=$('#platformArea').hidden;$('#platformArea').hidden=!open;$('#platformToggle').setAttribute('aria-expanded',String(open));$('#platformArrow').textContent=open?'−':'＋';if(open&&!state.apps.length){try{await loadApps()}catch(e){toast(e.message)}}});
$('#countrySearch').addEventListener('input',e=>renderCountries(e.target.value));
$('#orderBtn').addEventListener('click',()=>showModal('Pembelian belum diaktifkan','File server.js yang kamu kirim hanya menyediakan endpoint baca: saldo, server, aplikasi, negara, harga, dan riwayat. Endpoint POST untuk membuat pesanan belum ada, jadi tombol ini belum bisa membeli nomor. Server.js tidak saya ubah.'));
$('#refreshBtn').addEventListener('click',refreshAll);$('#refreshOrders').addEventListener('click',()=>loadOrders().catch(e=>toast(e.message)));
$('#modalClose').addEventListener('click',()=>$('#modal').classList.remove('show'));$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')$('#modal').classList.remove('show')});
$('#loginBtn').addEventListener('click',()=>showModal('Login / Register','Login belum tersedia karena paket asli belum memiliki backend akun pengguna.'));
$('#themeBtn').addEventListener('click',()=>document.body.classList.toggle('light'));
$('#menuBtn').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
document.querySelectorAll('a[href="#history"]').forEach(a=>a.addEventListener('click',()=>setTimeout(()=>$('#history').scrollIntoView({behavior:'smooth'}),0)));
document.querySelectorAll('a[href="#balance"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();$('#balance').scrollIntoView({behavior:'smooth'})}));
document.querySelectorAll('a[href="#help"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();showModal('Bantuan','Jika API gagal, pastikan TELEKOS_API_KEY sudah diatur sebagai environment variable di hosting. Jangan memasukkan API key ke file frontend.')}));
$('#year').textContent=new Date().getFullYear();
refreshAll().catch(e=>toast(e.message));
