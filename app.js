/* =====================================================
   PENGATURAN — isi di sini saja
   Tempel URL Web App dari Apps Script (Deploy > Web app),
   contoh: "https://script.google.com/macros/s/AKfyc.../exec"
   Kosongkan untuk mode demo (data contoh, pesanan tidak dikirim).
   ===================================================== */
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzVXBzmmgDtLwUH8x1VND8MNoSj9iS7gsykkQyAZbbnmuRjUhvDLx-MjJlW5FAPzf8X/exec";
/* ===================================================== */

(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rupiah = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const BG = ['#12a99a', '#f08a1c', '#e8472b', '#8b1e2e'];
const WARNA = {putih:'#f6f1e7',hitam:'#262626',merah:'#e8472b',biru:'#2a6fdb',navy:'#1f2f56',hijau:'#2f9e5b',kuning:'#fdc70f',oranye:'#f08a1c',abu:'#9aa0a6',krem:'#e9d8b4',maroon:'#8b1e2e',pink:'#f49ac1',ungu:'#7a4fc9',coklat:'#8a5a3b',cokelat:'#8a5a3b',tosca:'#12a99a'};
const colorOf = n => { n = String(n).toLowerCase(); for (const k in WARNA) if (n.includes(k)) return WARNA[k]; return '#fdc70f'; };

const DEMO = [
  {id:'K001',nama:'Kaos Polos Oversize',kategori:'Kaos',warna:'Putih',harga:89000,stok:30,ukuran:['S','M','L','XL'],terlaris:true,gambar:''},
  {id:'K002',nama:'Kaos Polos Basic',kategori:'Kaos',warna:'Hitam',harga:79000,stok:40,ukuran:['S','M','L','XL','XXL'],terlaris:false,gambar:''},
  {id:'K003',nama:'Kaos Sablon Retro',kategori:'Kaos',warna:'Merah',harga:99000,stok:18,ukuran:['M','L','XL'],terlaris:true,gambar:''},
  {id:'K004',nama:'Kaos Lengan Pendek',kategori:'Kaos',warna:'Navy',harga:85000,stok:25,ukuran:['S','M','L','XL'],terlaris:false,gambar:''},
  {id:'K005',nama:'Kaos Garis Santai',kategori:'Kaos',warna:'Tosca',harga:95000,stok:12,ukuran:['S','M','L'],terlaris:false,gambar:''},
  {id:'K006',nama:'Kaos Vintage Wash',kategori:'Kaos',warna:'Krem',harga:109000,stok:0,ukuran:['M','L','XL'],terlaris:false,gambar:''}
];

/* ---------- ilustrasi kaos (SVG) ---------- */
const shirt = (c, w = '') => `<svg viewBox="0 0 200 200" ${w} aria-hidden="true"><path d="M70 28 40 44 14 86l32 16 12-14v84c0 4 3 7 7 7h74c4 0 7-3 7-7V88l12 14 32-16-26-42-30-16c-6 18-18 26-30 26S76 46 70 28z" fill="${c}" stroke="rgba(0,0,0,.22)" stroke-width="3" stroke-linejoin="round"/><path d="M70 28c6 18 18 26 30 26s24-8 30-26" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="4" stroke-linecap="round"/><circle cx="100" cy="100" r="15" fill="rgba(255,255,255,.8)"/><circle cx="100" cy="100" r="6" fill="rgba(0,0,0,.35)"/></svg>`;

/* ---------- state ---------- */
let products = [];
let cart = [];
let fi = 0;
try { cart = JSON.parse(localStorage.getItem('kaosku_cart') || '[]'); if (!Array.isArray(cart)) cart = []; } catch (e) { cart = []; }
const saveCart = () => { try { localStorage.setItem('kaosku_cart', JSON.stringify(cart)); } catch (e) {} };
const find = id => products.find(p => p.id === id);
const qtyOf = id => cart.filter(x => x.id === id).reduce((a, b) => a + b.qty, 0);

/* ---------- reveal saat scroll ---------- */
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {threshold: .12, rootMargin: '0px 0px -6% 0px'})
  : null;
const observe = (root = document) => $$('.rv:not(.in)', root).forEach(el => io ? io.observe(el) : el.classList.add('in'));

/* ---------- kartu produk ---------- */
function cardHTML(p, i, reveal = true) {
  const bg = BG[i % BG.length];
  const sizes = p.ukuran.length ? p.ukuran : ['All'];
  const out = p.stok <= 0;
  const art = /^https:\/\//i.test(p.gambar) ? `<img src="${esc(p.gambar)}" alt="${esc(p.nama)}" loading="lazy">` : shirt(colorOf(p.warna));
  return `<article class="card${reveal ? ' rv' : ''}" data-id="${esc(p.id)}" style="--c:${bg};--d:${(i % 4) * .08}s">
    <div class="art" style="background:${bg}">${art}<span class="pill">${esc(p.kategori || 'Kaos')}</span>${p.terlaris ? '<span class="best">BEST<br>SELLER</span>' : ''}</div>
    <div class="info">
      <div class="r1"><span>${esc(p.nama)}</span><b>${rupiah(p.harga)}</b></div>
      <div class="r2"><em>${esc(p.warna)}</em><span>${out ? 'stok habis' : 'stok ' + p.stok}</span></div>
      <div class="sizes" role="group" aria-label="Pilih ukuran">${sizes.map((s, k) => `<button type="button" class="sz${k ? '' : ' on'}" data-size="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <button type="button" class="add" data-add ${out ? 'disabled' : ''}>${out ? 'stok habis' : '+ tambah ke keranjang'}</button>
    </div>
  </article>`;
}

const rail = $('#rail');
function renderRail() {
  rail.innerHTML = products.length ? products.map((p, i) => cardHTML(p, i)).join('') : '<div class="msg">Belum ada produk. Tambahkan produk di sheet "Produk".</div>';
  observe(rail); updateProg();
}
function renderFeatured(anim) {
  const box = $('#featured');
  if (!products.length) { box.innerHTML = ''; return; }
  const draw = () => { box.innerHTML = cardHTML(products[fi], fi + 1, false); box.classList.remove('out'); };
  if (anim) { box.classList.add('out'); setTimeout(draw, 300); } else draw();
}

/* ---------- progres & panah carousel ---------- */
const thumb = $('#thumb');
function updateProg() {
  const sw = rail.scrollWidth || 1;
  thumb.style.width = Math.min(100, rail.clientWidth / sw * 100) + '%';
  thumb.style.left = (rail.scrollLeft / sw * 100) + '%';
}
rail.addEventListener('scroll', updateProg, {passive: true});
addEventListener('resize', updateProg);
const step = () => (rail.querySelector('.card')?.offsetWidth || 260) + 18;
$('#prev').onclick = () => rail.scrollBy({left: -step()});
$('#next').onclick = () => rail.scrollBy({left: step()});
$('#viewAll').onclick = () => rail.scrollTo({left: 0});
const cyc = d => { if (!products.length) return; fi = (fi + d + products.length) % products.length; renderFeatured(true); };
$('#fprev').onclick = () => cyc(-1);
$('#fnext').onclick = () => cyc(1);

/* ---------- ambil produk ---------- */
function normalize(list) {
  return (list || []).map(p => ({
    id: String(p.id), nama: String(p.nama || ''), kategori: String(p.kategori || 'Kaos'), warna: String(p.warna || ''),
    harga: Number(p.harga) || 0, stok: Math.max(0, Number(p.stok) || 0),
    ukuran: Array.isArray(p.ukuran) ? p.ukuran.map(String) : [], terlaris: !!p.terlaris, gambar: String(p.gambar || '')
  })).filter(p => p.id && p.nama);
}
async function loadProducts(silent) {
  if (!silent) rail.innerHTML = '<div class="sk"></div>'.repeat(4);
  try {
    if (!WEB_APP_URL) { products = normalize(DEMO); $('#notice').hidden = false; }
    else {
      const res = await fetch(WEB_APP_URL + (WEB_APP_URL.includes('?') ? '&' : '?') + 'action=products&_=' + Date.now());
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Gagal membaca data');
      products = normalize(data.products);
    }
  } catch (err) {
    if (silent && products.length) return;
    rail.innerHTML = '<div class="msg">Produk belum bisa dimuat. Periksa WEB_APP_URL dan pengaturan akses Web App, lalu coba lagi.<br><button class="btn" id="retry">muat ulang</button></div>';
    $('#retry').onclick = () => loadProducts();
    return;
  }
  cart = cart.filter(x => find(x.id)).map(x => ({...x, qty: Math.max(1, Math.min(x.qty, find(x.id).stok))})).filter(x => find(x.id).stok > 0);
  saveCart();
  if (fi >= products.length) fi = 0;
  const keep = silent ? rail.scrollLeft : 0;
  renderRail(); rail.scrollLeft = keep; renderFeatured(false); renderCart();
}

/* ---------- toast ---------- */
let tt;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- keranjang ---------- */
const db = $('#db');
db.innerHTML = `<div id="view">
  <div id="items"></div>
  <div class="tot"><span>Total</span><span id="total">Rp 0</span></div>
  <form id="co" novalidate>
    <label>Nama lengkap<input name="nama" maxlength="80" autocomplete="name"></label>
    <label>No. WhatsApp<input name="wa" inputmode="tel" maxlength="20" autocomplete="tel" placeholder="08xxxxxxxxxx"></label>
    <label>Alamat pengiriman<textarea name="alamat" rows="3" maxlength="300" autocomplete="street-address"></textarea></label>
    <label>Catatan (opsional)<input name="catatan" maxlength="200"></label>
    <p class="err" id="err" role="alert"></p>
    <button class="btn full" id="submit" type="submit">buat pesanan</button>
  </form></div>
  <div id="doneView" hidden></div>`;

function renderCart() {
  const items = $('#items');
  const count = cart.reduce((a, b) => a + b.qty, 0);
  $('#cartCount').textContent = count;
  let total = 0;
  items.innerHTML = cart.length ? cart.map(x => {
    const p = find(x.id); const sub = p.harga * x.qty; total += sub;
    const th = /^https:\/\//i.test(p.gambar) ? `<img src="${esc(p.gambar)}" alt="">` : shirt(colorOf(p.warna));
    return `<div class="it"><div class="th" style="background:${BG[products.indexOf(p) % 4]}">${th}</div>
      <div><div class="n">${esc(p.nama)}</div><div class="s">${esc(p.warna)} • ${esc(x.size)}</div>
      <div class="qt"><button type="button" data-act="dec" data-id="${esc(x.id)}" data-size="${esc(x.size)}" aria-label="Kurangi">−</button><span>${x.qty}</span><button type="button" data-act="inc" data-id="${esc(x.id)}" data-size="${esc(x.size)}" aria-label="Tambah">+</button></div></div>
      <div class="pr">${rupiah(sub)}<button type="button" class="del" data-act="del" data-id="${esc(x.id)}" data-size="${esc(x.size)}">hapus</button></div></div>`;
  }).join('') : '<div class="empty">Keranjang masih kosong.<br>Pilih kaos dulu, ya.</div>';
  $('#total').textContent = rupiah(total);
  $('#submit').disabled = !cart.length;
}
function addToCart(id, size) {
  const p = find(id); if (!p) return;
  if (qtyOf(id) >= p.stok) { toast('Stok ' + p.nama + ' tidak cukup'); return; }
  const ex = cart.find(x => x.id === id && x.size === size);
  ex ? ex.qty++ : cart.push({id, size, qty: 1});
  saveCart(); renderCart();
  const b = $('#cartCount'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  toast(p.nama + ' (' + size + ') masuk keranjang');
}
function changeQty(id, size, act) {
  const i = cart.findIndex(x => x.id === id && x.size === size); if (i < 0) return;
  const p = find(id);
  if (act === 'del') cart.splice(i, 1);
  else if (act === 'dec') { cart[i].qty--; if (cart[i].qty < 1) cart.splice(i, 1); }
  else if (act === 'inc') { if (qtyOf(id) >= p.stok) { toast('Stok tidak cukup'); return; } cart[i].qty++; }
  saveCart(); renderCart();
}
function openCart(o) {
  document.body.classList.toggle('open', o);
  document.body.style.overflow = o ? 'hidden' : '';
  $('#drawer').setAttribute('aria-hidden', String(!o));
  if (o) setTimeout(() => $('#closeCart').focus(), 300);
}
$('#openCart').onclick = () => { $('#view').hidden = false; $('#doneView').hidden = true; openCart(true); };
$('#closeCart').onclick = $('#ov').onclick = () => openCart(false);
addEventListener('keydown', e => { if (e.key === 'Escape') openCart(false); });

/* ---------- klik di kartu & keranjang ---------- */
document.addEventListener('click', e => {
  const sz = e.target.closest('.sz');
  if (sz) { $$('.sz', sz.parentElement).forEach(b => b.classList.toggle('on', b === sz)); return; }
  const add = e.target.closest('[data-add]');
  if (add) { const c = add.closest('.card'); addToCart(c.dataset.id, $('.sz.on', c)?.dataset.size || 'All'); return; }
  const act = e.target.closest('[data-act]');
  if (act) changeQty(act.dataset.id, act.dataset.size, act.dataset.act);
});

/* ---------- kirim pesanan ---------- */
$('#co').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, err = $('#err'), btn = $('#submit');
  const v = {nama: f.nama.value.trim(), wa: f.wa.value.trim(), alamat: f.alamat.value.trim(), catatan: f.catatan.value.trim()};
  err.textContent = '';
  if (!cart.length) { err.textContent = 'Keranjang masih kosong.'; return; }
  if (v.nama.length < 2) { err.textContent = 'Isi nama lengkap dulu.'; f.nama.focus(); return; }
  if (!/^[0-9+\-\s()]{9,20}$/.test(v.wa) || v.wa.replace(/\D/g, '').length < 9) { err.textContent = 'Nomor WhatsApp belum benar. Contoh: 081234567890'; f.wa.focus(); return; }
  if (v.alamat.length < 5) { err.textContent = 'Isi alamat pengiriman dengan lengkap.'; f.alamat.focus(); return; }
  btn.disabled = true; btn.textContent = 'mengirim pesanan...';
  const payload = {...v, items: cart.map(x => ({id: x.id, size: x.size, qty: x.qty}))};
  try {
    let result;
    if (!WEB_APP_URL) {
      await new Promise(r => setTimeout(r, 700));
      result = {ok: true, orderId: 'DEMO-' + Math.random().toString(36).slice(2, 7).toUpperCase(), total: cart.reduce((a, x) => a + find(x.id).harga * x.qty, 0)};
    } else {
      const res = await fetch(WEB_APP_URL, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(payload)});
      result = await res.json();
    }
    if (!result.ok) throw new Error(result.error || 'Pesanan gagal disimpan');
    cart = []; saveCart(); f.reset(); renderCart();
    $('#view').hidden = true;
    const d = $('#doneView');
    d.hidden = false;
    d.innerHTML = `<div class="done"><div class="tick"><svg viewBox="0 0 40 40"><path d="M8 21l8 8 16-17"/></svg></div>
      <div class="hd">Pesanan masuk!</div><p>Nomor pesananmu</p><div class="oid hd">${esc(result.orderId)}</div>
      <p>Total ${rupiah(result.total)}. Simpan nomor ini untuk konfirmasi ke admin.</p>
      <br><button class="btn" id="again" type="button">belanja lagi</button></div>`;
    $('#again').onclick = () => { openCart(false); document.getElementById('koleksi').scrollIntoView({behavior: 'smooth'}); };
    if (WEB_APP_URL) loadProducts(true);
  } catch (ex) {
    err.textContent = (ex && ex.message && ex.message !== 'Failed to fetch') ? ex.message : 'Koneksi bermasalah. Periksa internet lalu coba lagi.';
  } finally {
    btn.textContent = 'buat pesanan'; btn.disabled = !cart.length;
  }
});

/* ---------- dekorasi: hero, collage, ikon ---------- */
const PAL = ['#ffffff', '#4a1c24', '#e8472b', '#12a99a', '#2f3d8f', '#f08a1c', '#8b1e2e', '#f6f1e7'];
$('#heroArt').innerHTML = '<div class="tilt">' + Array.from({length: 12}, (_, i) =>
  `<div class="fs" style="--r:${(i % 3 - 1) * 6}deg;animation-delay:${-i * .6}s">${shirt(PAL[(i * 3) % PAL.length])}</div>`).join('') + '</div>';
const pos = [['4%', '10%'], ['50%', '4%'], ['6%', '52%'], ['50%', '48%']];
$('#collage').insertAdjacentHTML('beforeend', pos.map((p, i) =>
  `<div class="cg" style="left:${p[0]};top:${p[1]};transform:rotate(${(i % 2 ? 1 : -1) * 8}deg);animation-delay:${-i * 1.5}s">${shirt(['#fdc70f', '#ffffff', '#4a1c24', '#12a99a'][i])}</div>`).join(''));
$$('.ic[data-shirt]').forEach(el => el.innerHTML = shirt(el.dataset.shirt));

/* ---------- efek scroll ---------- */
const nav = $('#nav'), big = $('#big').firstElementChild, bigBox = $('#big');
let tick = false;
function onScroll() {
  nav.classList.toggle('sc', scrollY > 10);
  const r = bigBox.getBoundingClientRect(), vh = innerHeight;
  const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
  const max = Math.max(0, big.offsetWidth - bigBox.clientWidth);
  big.style.transform = `translateX(${-p * max}px)`;
  tick = false;
}
addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, {passive: true});
addEventListener('resize', onScroll);

/* ---------- mulai ---------- */
observe();
onScroll();
loadProducts();
})();
