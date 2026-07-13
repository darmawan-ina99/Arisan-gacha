// ===== DATA =====
let data = JSON.parse(localStorage.getItem('arisan-data') || JSON.stringify({
  pengaturan: { nama: 'Arisan Gacha', iuran: 500000 },
  anggota: [],
  riwayat: []
}));

function simpan() {
  localStorage.setItem('arisan-data', JSON.stringify(data));
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
  el.innerHTML = data.anggota.map(a => `
    <div class="anggota-item">
      <div class="avatar">${a.nama[0].toUpperCase()}</div>
      <div class="anggota-info">
        <div class="nama">${a.nama}</div>
        <div class="hp">${a.hp || '-'}</div>
      </div>
      <span class="badge ${a.sudahDapat ? 'badge-sudah' : 'badge-belum'}">
        ${a.sudahDapat ? '✅ Sudah' : '⏳ Belum'}
      </span>
      <button class="btn-hapus" onclick="hapusAnggota(${a.id})">🗑️</button>
    </div>
  `).join('');
}

// ===== TABUNG =====
const ITEM_HEIGHT = 56; // px, harus sama dengan CSS
const VISIBLE_ITEMS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);

function renderTube() {
  const belum = data.anggota.filter(a => !a.sudahDapat);
  const hint = document.getElementById('hint-peserta');
  const btn = document.getElementById('btn-undian');
  const tube = document.getElementById('tube-inner');

  if (belum.length === 0) {
    hint.textContent = 'Semua anggota sudah mendapatkan arisan!';
    btn.disabled = true;
    tube.innerHTML = '<div class="tube-name-item" style="color:#f5c518">🏆 Selesai!</div>';
    return;
  }

  hint.textContent = `${belum.length} peserta belum mendapatkan arisan`;
  btn.disabled = false;

  // Buat list panjang untuk ilusi scroll: duplikasi nama
  const pool = [];
  for (let i = 0; i < 5; i++) pool.push(...belum.map(a => a.nama));

  tube.innerHTML = pool.map((nama, i) =>
    `<div class="tube-name-item" id="ti-${i}">${nama}</div>`
  ).join('');

  // Posisikan ke tengah pool
  const startIndex = Math.floor(pool.length / 2);
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

  // Pilih pemenang terlebih dahulu
  const pemenang = belum[Math.floor(Math.random() * belum.length)];

  // Buat pool besar — targetkan pemenang di posisi tengah di akhir
  const pool = [];
  for (let i = 0; i < 8; i++) pool.push(...belum.map(a => a.nama));
  // Tambahkan pemenang di dekat akhir pool
  pool.push(pemenang.nama);

  tube.innerHTML = pool.map(nama =>
    `<div class="tube-name-item">${nama}</div>`
  ).join('');

  // Durasi animasi: 5 detik
  const duration = 5000;
  const totalItems = pool.length;
  const targetIndex = totalItems - 1; // pemenang di akhir

  // Mulai dari awal pool
  let startOffset = CENTER_INDEX * ITEM_HEIGHT;
  tube.style.transition = 'none';
  tube.style.transform = `translateY(${startOffset}px)`;

  // Force reflow
  tube.getBoundingClientRect();

  // Animasi ke target
  const targetOffset = (CENTER_INDEX - targetIndex) * ITEM_HEIGHT;
  tube.style.transition = `transform ${duration}ms cubic-bezier(0.23, 1, 0.32, 1)`;
  tube.style.transform = `translateY(${targetOffset}px)`;

  setTimeout(() => {
    // Tampilkan hasil
    btn.textContent = '🎰 PUTAR TABUNG!';
    btn.disabled = false;
    isSpinning = false;

    // Update data
    const idx = data.anggota.findIndex(a => a.id === pemenang.id);
    data.anggota[idx].sudahDapat = true;
    data.riwayat.push({
      no: data.riwayat.length + 1,
      nama: pemenang.nama,
      tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      total: data.pengaturan.iuran * data.anggota.length
    });
    simpan();

    // Tampilkan result box
    document.getElementById('result-nama').textContent = '🏆 ' + pemenang.nama;
    document.getElementById('result-sub').textContent =
      `Mendapatkan arisan ke-${data.riwayat.length} • Rp ${(data.pengaturan.iuran * data.anggota.length).toLocaleString('id-ID')}`;
    resultBox.classList.remove('hidden');

    // Re-render tabung
    setTimeout(renderTube, 1200);
    renderBeranda();
  }, duration + 100);
}

// ===== RIWAYAT =====
function renderRiwayat() {
  const el = document.getElementById('list-riwayat');
  if (!data.riwayat.length) { el.innerHTML = '<p class="empty">Belum ada undian</p>'; return; }
  el.innerHTML = [...data.riwayat].reverse().map(r => `
    <div class="riwayat-item">
      <div class="riwayat-no">${r.no}</div>
      <div class="riwayat-info">
        <div class="nama">🏆 ${r.nama}</div>
        <div class="tgl">${r.tanggal} — Rp ${(r.total||0).toLocaleString('id-ID')}</div>
      </div>
    </div>
  `).join('');
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
}

// ===== RESET =====
function resetArisan() {
  if (!confirm('Reset semua data untuk periode baru? Riwayat akan dihapus.')) return;
  data.anggota = data.anggota.map(a => ({ ...a, sudahDapat: false }));
  data.riwayat = [];
  simpan();
  alert('✅ Arisan direset!');
  renderAll();
}

function renderAll() {
  renderBeranda();
  renderAnggota();
  renderRiwayat();
  renderTube();
}

renderAll();
