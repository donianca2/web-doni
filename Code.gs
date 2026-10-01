/**
 * KAOSKU — Backend simulasi jualan baju (Google Apps Script)
 *
 * CARA PAKAI:
 * 1. Buka Google Spreadsheet > Extensions (Ekstensi) > Apps Script.
 * 2. Hapus isi Code.gs bawaan, tempel semua kode ini, lalu Save.
 * 3. (Opsional) Pilih fungsi "setup" > Run, untuk membuat sheet Produk & Pesanan beserta data contoh.
 *    Jika dilewati, sheet dibuat otomatis saat website pertama kali dibuka.
 * 4. Deploy > New deployment > jenis "Web app":
 *      Execute as : Me
 *      Who has access : Anyone
 *    Klik Deploy, izinkan akses, lalu salin URL yang berakhiran /exec.
 * 5. Tempel URL itu ke WEB_APP_URL di app.js.
 *
 * Setiap kali kode ini diubah: Deploy > Manage deployments > Edit > Version "New version" > Deploy.
 */

const SHEET_PRODUK = 'Produk';
const SHEET_PESANAN = 'Pesanan';
const HEAD_PRODUK = ['ID', 'Nama', 'Kategori', 'Warna', 'Harga', 'Stok', 'Ukuran (pisah koma)', 'Terlaris (ya/tidak)', 'Link Gambar (opsional, https)'];
const HEAD_PESANAN = ['Waktu', 'ID Pesanan', 'Nama', 'WhatsApp', 'Alamat', 'Catatan', 'ID Produk', 'Produk', 'Ukuran', 'Qty', 'Harga Satuan', 'Subtotal', 'Total Pesanan', 'Status'];

const SAMPLE = [
  ['K001', 'Kaos Polos Oversize', 'Kaos', 'Putih', 89000, 30, 'S,M,L,XL', 'ya', ''],
  ['K002', 'Kaos Polos Basic', 'Kaos', 'Hitam', 79000, 40, 'S,M,L,XL,XXL', 'tidak', ''],
  ['K003', 'Kaos Sablon Retro', 'Kaos', 'Merah', 99000, 18, 'M,L,XL', 'ya', ''],
  ['K004', 'Kaos Lengan Pendek', 'Kaos', 'Navy', 85000, 25, 'S,M,L,XL', 'tidak', ''],
  ['K005', 'Kaos Garis Santai', 'Kaos', 'Tosca', 95000, 12, 'S,M,L', 'tidak', ''],
  ['K006', 'Kaos Vintage Wash', 'Kaos', 'Krem', 109000, 20, 'M,L,XL', 'tidak', '']
];

/* ---------- Setup sheet ---------- */
function setup() {
  ensureProduk_();
  ensurePesanan_();
}

function styleHeader_(sh, n) {
  sh.getRange(1, 1, 1, n)
    .setBackground('#4a1c24').setFontColor('#ffffff').setFontWeight('bold')
    .setVerticalAlignment('middle');
  sh.setFrozenRows(1);
}

function ensureProduk_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_PRODUK);
  if (!sh) {
    sh = ss.insertSheet(SHEET_PRODUK);
    sh.getRange(1, 1, 1, HEAD_PRODUK.length).setValues([HEAD_PRODUK]);
    sh.getRange(2, 1, SAMPLE.length, HEAD_PRODUK.length).setValues(SAMPLE);
    styleHeader_(sh, HEAD_PRODUK.length);
    sh.getRange(2, 5, 500, 1).setNumberFormat('#,##0');
    sh.setColumnWidths(1, HEAD_PRODUK.length, 130);
    sh.setColumnWidth(2, 200);
  }
  return sh;
}

function ensurePesanan_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_PESANAN);
  if (!sh) {
    sh = ss.insertSheet(SHEET_PESANAN);
    sh.getRange(1, 1, 1, HEAD_PESANAN.length).setValues([HEAD_PESANAN]);
    styleHeader_(sh, HEAD_PESANAN.length);
    sh.getRange(2, 1, 1000, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sh.getRange(2, 4, 1000, 1).setNumberFormat('@');
    sh.getRange(2, 11, 1000, 3).setNumberFormat('#,##0');
    sh.setColumnWidths(1, HEAD_PESANAN.length, 130);
    sh.setColumnWidth(5, 260);
  }
  return sh;
}

/* ---------- GET: daftar produk ---------- */
function doGet(e) {
  try {
    const sh = ensureProduk_();
    const rows = sh.getDataRange().getValues();
    rows.shift();
    const products = rows
      .filter(function (r) { return String(r[0]).trim() !== '' && String(r[1]).trim() !== ''; })
      .map(function (r) {
        return {
          id: String(r[0]).trim(),
          nama: String(r[1]),
          kategori: String(r[2] || 'Kaos'),
          warna: String(r[3] || ''),
          harga: Number(r[4]) || 0,
          stok: Math.max(0, Number(r[5]) || 0),
          ukuran: String(r[6] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
          terlaris: String(r[7]).trim().toLowerCase() === 'ya',
          gambar: String(r[8] || '').trim()
        };
      });
    return json_({ ok: true, products: products });
  } catch (err) {
    return json_({ ok: false, error: 'Server error: ' + err });
  }
}

/* ---------- POST: simpan pesanan ---------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'Server sedang sibuk. Coba lagi sebentar.' });
  }
  try {
    const d = JSON.parse(e.postData.contents);
    const nama = clean_(d.nama, 80);
    const wa = String(d.wa == null ? '' : d.wa).replace(/[^0-9+\-\s()]/g, '').trim().slice(0, 20); // kolom WhatsApp berformat teks, aman dari formula
    const alamat = clean_(d.alamat, 300);
    const catatan = clean_(d.catatan, 200);

    if (nama.length < 2 || wa.replace(/\D/g, '').length < 9 || alamat.length < 5) {
      return json_({ ok: false, error: 'Data pemesan belum lengkap.' });
    }
    if (!Array.isArray(d.items) || d.items.length < 1 || d.items.length > 30) {
      return json_({ ok: false, error: 'Keranjang kosong atau terlalu banyak item.' });
    }

    const sp = ensureProduk_();
    const data = sp.getDataRange().getValues();
    const idx = {};
    for (let i = 1; i < data.length; i++) idx[String(data[i][0]).trim()] = i;

    const need = {};
    const lines = [];
    for (let k = 0; k < d.items.length; k++) {
      const it = d.items[k];
      const id = String(it.id).trim();
      const i = idx[id];
      if (i === undefined) return json_({ ok: false, error: 'Produk ' + id + ' tidak ditemukan.' });
      const qty = Math.floor(Number(it.qty));
      if (!(qty >= 1 && qty <= 99)) return json_({ ok: false, error: 'Jumlah barang tidak valid.' });
      const sizes = String(data[i][6] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      const size = String(it.size || '').trim();
      if (sizes.length && sizes.indexOf(size) < 0) return json_({ ok: false, error: 'Ukuran ' + size + ' tidak tersedia untuk ' + data[i][1] + '.' });
      need[id] = (need[id] || 0) + qty;
      lines.push({ i: i, id: id, size: size || '-', qty: qty });
    }

    for (const id in need) {
      const stok = Number(data[idx[id]][5]) || 0;
      if (need[id] > stok) {
        return json_({ ok: false, error: 'Stok ' + data[idx[id]][1] + ' tinggal ' + stok + '. Kurangi jumlahnya.' });
      }
    }

    // harga selalu dihitung dari spreadsheet, bukan dari browser
    let total = 0;
    lines.forEach(function (l) {
      l.harga = Number(data[l.i][4]) || 0;
      l.nama = String(data[l.i][1]);
      l.sub = l.harga * l.qty;
      total += l.sub;
    });

    const tz = Session.getScriptTimeZone();
    const now = new Date();
    const orderId = 'ORD-' + Utilities.formatDate(now, tz, 'yyMMdd') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

    const rows = lines.map(function (l) {
      return [now, orderId, nama, wa, alamat, catatan, l.id, l.nama, l.size, l.qty, l.harga, l.sub, total, 'Baru'];
    });

    const so = ensurePesanan_();
    const start = so.getLastRow() + 1;
    so.getRange(start, 4, rows.length, 1).setNumberFormat('@');
    so.getRange(start, 1, rows.length, HEAD_PESANAN.length).setValues(rows);

    for (const id in need) {
      sp.getRange(idx[id] + 1, 6).setValue((Number(data[idx[id]][5]) || 0) - need[id]);
    }
    SpreadsheetApp.flush();

    return json_({ ok: true, orderId: orderId, total: total });
  } catch (err) {
    return json_({ ok: false, error: 'Pesanan gagal diproses: ' + err });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Utilitas ---------- */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Bersihkan teks dan cegah formula injection (=, +, -, @ di awal)
function clean_(v, max) {
  let s = String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
