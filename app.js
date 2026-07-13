// ===== KONFIGURASI =====
const ADMIN_PIN = '1234'; // PIN admin default, bisa diganti
const ADMIN_WA = '6285811200013'; // WhatsApp admin (Wawan)

// ===== DATA =====
let data = JSON.parse(localStorage.getItem('arisan-data') || JSON.stringify({
  pengaturan: { nama: 'Arisan Gacha', iuran: 500000 },
  anggota: [],
  riwayat: []
}));

let isAdmin = false;

function simpan() {
  localStorage.setItem('arisan-data', JSON.stringify(data));
}

// ===== LOGIN ADMIN =====
function cekAdmin() {
  const pin = prompt('Masukkan PIN Admin:');
  if (pin === ADMIN_PIN) {
    isAdmin = true;
    localStorage.setItem('admin-session', Date.now());
    alert('✅ Login admin berhasil!');
    renderAll();
  } else if (pin !== null) {
    alert('❌ PIN salah!');
  }
}

function logout() {
  isAdmin = false;
  localStorage.removeItem('admin-session');
  renderAll();
}

// Cek session admin (valid 8 jam)
const adminSession = localStorage.getItem('admin-session');
if (adminSession && (Date.now() - parseInt(adminSession)) < 8 * 60 * 60 * 1000) {
  isAdmin = true;
}

// ===== TABS =====
function showTab(tab, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (el) el.classList.add('active');
  renderAll();
}

// ===== PENGATURAN =====
function simpanPengaturan() {
  if (!isAdmin) return alert('Hanya admin yang bisa mengubah pengaturan!');
  const nama = document.getElementById('nama-grup').value.trim();
  const iuran = parseInt(document.getElementById('iuran').value);
  if (!nama) return alert('Nama grup harus diisi!');
  data.pengaturan = { nama, iuran: iuran || 500000 };
  simpan();
  document.getElementById('subtitle-nama').textContent = nama;
  alert('✅ Pengaturan disimpan!');
  renderBeranda();
}

// ===== ANGGOTA =====
function tambahAnggota() {
  if (!isAdmin) return alert('Hanya admin yang bisa menambah anggota!');
  const nama = document.getElementById('nama-anggota').value.trim();
  const hp = document.getElementById('no-hp').value.trim();
  if (!nama) return alert('Nama anggota harus diisi!');
  data.anggota.push({ id: Date.now(), nama, hp, sudahDapat: false });
  simpan();
  document.getElementById('nama-anggota').value = '';
  document.getElementById('no-hp').value = '';
  renderAnggota();
  renderBeranda();
  renderTube();
}

function hapusAnggota(id) {
  if (!isAdmin) return alert('Hanya admin yang bisa menghapus anggota!');
  if (!confirm('Hapus anggota ini?')) return;
  data.anggota = data.anggota.filter(a => a.id !== id);
  simpan();
  renderAnggota();
  renderBeranda();
  renderTube();
}

function renderAnggota() {
  const el = document.getElementById('list-anggota');
  if (!data.anggota.length) { el.innerHTML = '<p class="empty">Belum ada anggota</p>'; return; }

  const adminBadge = isAdmin
    ? `<div class="admin-badge">🔑 Mode Admin</div>`
    : `<div class="admin-badge viewer">👁️ Mode Viewer — <a href="#" onclick="cekAdmin()">Login Admin</a></div>`;

  el.innerHTML = adminBadge + data.anggota.map(a => `
    <div class="anggota-item">
      <div class="avatar">${a.nama[0].toUpperCase()}</div>
      <div class="anggota-info">
        <div class="nama">${a.nama}</div>
        <div class="hp">${a.hp ? formatHP(a.hp) : 'No HP tidak ada'}</div>
      </div>
      <span class="badge ${a.sudahDapat ? 'badge-sudah' : 'badge-belum'}">
        ${a.sudahDapat ? '✅' : '⏳'}
      </span>
      ${isAdmin ? `<button class="btn-hapus" onclick="hapusAnggota(${a.id})">🗑️</button>` : ''}
    </div>
  `).join('');
}

function formatHP(hp) {
  // Format nomor HP ke format internasional
  let clean = hp.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = '62' + clean.slice(1);
  return '+' + clean;
}

function hpToWA(hp) {
  let clean = hp.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = '62' + clean.slice(1);
  return clean;
}

// ===== FORM ADMIN =====
function renderFormAdmin() {
  const el = document.getElementById('form-admin');
  if (!el) return;
  if (isAdmin) {
    el.innerHTML = `
      <div class="card admin-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">
          <h2>➕ Tambah Anggota</h2>
          <button class="btn-logout" onclick="logout()">🚪 Logout</button>
        </div>
        <input type="text" id="nama-anggota" placeholder="Nama anggota" />
        <input type="tel" id="no-hp" placeholder="No. HP / WhatsApp (misal: 08123456789)" />
        <button class="btn-primary" onclick="tambahAnggota()">➕ Tambah Anggota</button>
      </div>
    `;
  } else {
    el.innerHTML = `
      <div class="card">
        <div style="text-align:center;padding:10px">
          <p style="color:#888;margin-bottom:15px">🔒 Tambah anggota hanya untuk admin</p>
          <button class="btn-primary" onclick="cekAdmin()" style="width:auto;padding:10px 30px">🔑 Login Admin</button>
        </div>
      </div>
    `;
  }
}

// ===== TABUNG =====
const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);

function renderTube() {
  const belum = data.anggota.filter(a => !a.sudahDapat);
  const hint = document.getElementById('hint-peserta');
  const btn = document.getElementById('btn-undian');
  const tube = document.getElementById('tube-inner');
  if (!tube) return;

  if (belum.length === 0) {
    if (hint) hint.textContent = 'Semua anggota sudah mendapatkan arisan!';
    if (btn) btn.disabled = true;
    tube.innerHTML = '<div class="tube-name-item" style="color:#f5c518">🏆 Selesai!</div>';
    return;
  }

  if (hint) hint.textContent = `${belum.length} peserta belum mendapatkan arisan`;
  if (btn) btn.disabled = false;

  const pool = [];
  for (let i = 0; i < 5; i++) pool.push(...belum.map(a => a.nama));

  tube.innerHTML = pool.map(nama =>
    `<div class="tube-name-item">${nama}</div>`
  ).join('');

  const startIndex = Math.floor(pool.length / 2);
  tube.style.transition = 'none';
  tube.style.transform = `translateY(-${(startIndex - CENTER_INDEX) * ITEM_HEIGHT}px)`;
}

// ===== UNDIAN =====
let isSpinning = false;

function mulaiUndian() {
  const belum = data.anggota.filter(a => !a.sudahDapat);
  if (!belum.length || isSpinning) return;

  isSpinning = true;
  const btn = document.getElementById('btn-undian');
  const tube = document.getElementById('tube-inner');
  const resultBox = document.getElementById('result-box');

  btn.disabled = true;
  btn.textContent = '⏳ Mengundi...';
  resultBox.classList.add('hidden');

  const pemenang = belum[Math.floor(Math.random() * belum.length)];

  const pool = [];
  for (let i = 0; i < 8; i++) pool.push(...belum.map(a => a.nama));
  pool.push(pemenang.nama);

  tube.innerHTML = pool.map(nama =>
    `<div class="tube-name-item">${nama}</div>`
  ).join('');

  const duration = 5000;
  const totalItems = pool.length;
  const targetIndex = totalItems - 1;

  let startOffset = CENTER_INDEX * ITEM_HEIGHT;
  tube.style.transition = 'none';
  tube.style.transform = `translateY(${startOffset}px)`;
  tube.getBoundingClientRect();

  const targetOffset = (CENTER_INDEX - targetIndex) * ITEM_HEIGHT;
  tube.style.transition = `transform ${duration}ms cubic-bezier(0.23, 1, 0.32, 1)`;
  tube.style.transform = `translateY(${targetOffset}px)`;

  setTimeout(() => {
    btn.textContent = '🎰 PUTAR TABUNG!';
    btn.disabled = false;
    isSpinning = false;

    const idx = data.anggota.findIndex(a => a.id === pemenang.id);
    data.anggota[idx].sudahDapat = true;
    const noPemenang = data.riwayat.length + 1;
    const totalHadiah = data.pengaturan.iuran * data.anggota.length;
    data.riwayat.push({
      no: noPemenang,
      nama: pemenang.nama,
      hp: pemenang.hp || '',
      tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      total: totalHadiah
    });
    simpan();

    // Tampilkan result
    document.getElementById('result-nama').textContent = '🏆 ' + pemenang.nama;
    document.getElementById('result-sub').textContent =
      `Arisan ke-${noPemenang} • Rp ${totalHadiah.toLocaleString('id-ID')}`;

    // Tombol WA ke pemenang
    const waBtn = document.getElementById('btn-wa-pemenang');
    const waBtnAdmin = document.getElementById('btn-wa-admin');
    if (pemenang.hp) {
      const waNum = hpToWA(pemenang.hp);
      const pesanPemenang = encodeURIComponent(
        `🎉 Selamat ${pemenang.nama}!\n\nAnda memenangkan Arisan *${data.pengaturan.nama}* periode ke-${noPemenang}.\n\nTotal hadiah: Rp ${totalHadiah.toLocaleString('id-ID')}\n\nSilakan hubungi admin untuk pencairan. 🎊`
      );
      waBtn.href = `https://wa.me/${waNum}?text=${pesanPemenang}`;
      waBtn.style.display = 'inline-flex';
    } else {
      waBtn.style.display = 'none';
    }

    // Notif ke admin
    const pesanAdmin = encodeURIComponent(
      `🎰 *HASIL UNDIAN ARISAN*\n\n` +
      `Grup: ${data.pengaturan.nama}\n` +
      `Pemenang: *${pemenang.nama}*\n` +
      `${pemenang.hp ? 'No HP: ' + formatHP(pemenang.hp) + '\n' : ''}` +
      `Hadiah: Rp ${totalHadiah.toLocaleString('id-ID')}\n` +
      `Periode: ke-${noPemenang}\n` +
      `Tanggal: ${new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'})}`
    );
    waBtnAdmin.href = `https://wa.me/${ADMIN_WA}?text=${pesanAdmin}`;

    resultBox.classList.remove('hidden');
    setTimeout(renderTube, 1200);
    renderBeranda();
  }, duration + 100);
}

// ===== RIWAYAT =====
function renderRiwayat() {
  const el = document.getElementById('list-riwayat');
  if (!data.riwayat.length) { el.innerHTML = '<p class="empty">Belum ada undian</p>'; return; }
  el.innerHTML = [...data.riwayat].reverse().map(r => {
    const waLink = r.hp ? (() => {
      const waNum = hpToWA(r.hp);
      const pesan = encodeURIComponent(`Halo ${r.nama}, ini konfirmasi arisan ke-${r.no} 🎉`);
      return `<a class="btn-wa-kecil" href="https://wa.me/${waNum}?text=${pesan}" target="_blank">💬 WA</a>`;
    })() : '';
    return `
      <div class="riwayat-item">
        <div class="riwayat-no">${r.no}</div>
        <div class="riwayat-info">
          <div class="nama">🏆 ${r.nama}</div>
          <div class="tgl">${r.tanggal} — Rp ${(r.total||0).toLocaleString('id-ID')}</div>
        </div>
        ${waLink}
      </div>
    `;
  }).join('');
}

// ===== BERANDA =====
function renderBeranda() {
  const total = data.anggota.length;
  const sudah = data.anggota.filter(a => a.sudahDapat).length;
  document.getElementById('total-anggota').textContent = total;
  document.getElementById('belum-dapat').textContent = total - sudah;
  document.getElementById('sudah-dapat').textContent = sudah;
  document.getElementById('total-iuran').textContent = 'Rp ' + (data.pengaturan.iuran * total).toLocaleString('id-ID');
  document.getElementById('nama-grup').value = data.pengaturan.nama;
  document.getElementById('iuran').value = data.pengaturan.iuran;
  document.getElementById('subtitle-nama').textContent = data.pengaturan.nama;
  const btnSimpan = document.getElementById('btn-simpan-setting');
  if (btnSimpan) btnSimpan.style.display = isAdmin ? 'block' : 'none';
}

// ===== RESET =====
function resetArisan() {
  if (!isAdmin) return alert('Hanya admin yang bisa reset!');
  if (!confirm('Reset semua data untuk periode baru? Riwayat akan dihapus.')) return;
  data.anggota = data.anggota.map(a => ({ ...a, sudahDapat: false }));
  data.riwayat = [];
  simpan();
  alert('✅ Arisan direset!');
  renderAll();
}

function renderAll() {
  renderBeranda();
  renderFormAdmin();
  renderAnggota();
  renderRiwayat();
  renderTube();
}

renderAll();
