// ===== KONFIGURASI =====
const ADMIN_PIN = '0021';
const ADMIN_WA  = '6285811200013';

// ===== STATE =====
let data = JSON.parse(localStorage.getItem('arisan-data') || JSON.stringify({
  pengaturan: { nama: 'Arisan Gacha', iuran: 500000 },
  anggota: [],
  riwayat: []
}));

// Cek session admin (valid 8 jam)
let isAdmin = (() => {
  const s = localStorage.getItem('admin-session');
  return s && (Date.now() - parseInt(s)) < 8 * 3600 * 1000;
})();

function simpan() { localStorage.setItem('arisan-data', JSON.stringify(data)); }

// ===== UTILITY =====
function formatHP(hp) {
  let c = hp.replace(/\D/g,'');
  if (c.startsWith('0')) c = '62' + c.slice(1);
  return '+' + c;
}
function hpToWA(hp) {
  let c = hp.replace(/\D/g,'');
  if (c.startsWith('0')) c = '62' + c.slice(1);
  return c;
}
function rupiah(n) { return 'Rp ' + (n||0).toLocaleString('id-ID'); }

// ===== ADMIN =====
function cekAdmin() {
  const pin = prompt('Masukkan PIN Admin:');
  if (pin === null) return;
  if (pin === ADMIN_PIN) {
    isAdmin = true;
    localStorage.setItem('admin-session', Date.now());
    renderAll();
  } else {
    alert('❌ PIN salah!');
  }
}
function logout() {
  isAdmin = false;
  localStorage.removeItem('admin-session');
  renderAll();
}

// ===== TABS =====
function showTab(tab, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (el) el.classList.add('active');
  if (tab === 'undian') renderTube();
}

// ===== PENGATURAN =====
function simpanPengaturan() {
  if (!isAdmin) return cekAdmin();
  const nama = document.getElementById('nama-grup').value.trim();
  const iuran = parseInt(document.getElementById('iuran').value) || 500000;
  if (!nama) return alert('Nama grup harus diisi!');
  data.pengaturan = { nama, iuran };
  simpan();
  renderBeranda();
  alert('✅ Pengaturan disimpan!');
}

// ===== ANGGOTA =====
function tambahAnggota() {
  const nama = document.getElementById('nama-anggota').value.trim();
  const hp   = document.getElementById('no-hp').value.trim();
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

// ===== RENDER ANGGOTA =====
function renderAnggota() {
  const formEl = document.getElementById('form-admin');
  const listEl = document.getElementById('list-anggota');

  // Form admin / tombol login
  if (isAdmin) {
    formEl.innerHTML = `
      <div class="card admin-card">
        <div class="card-header-row">
          <h2>➕ Tambah Anggota</h2>
          <button class="btn-logout" onclick="logout()">🚪 Logout</button>
        </div>
        <input type="text" id="nama-anggota" placeholder="Nama anggota" />
        <input type="tel"  id="no-hp" placeholder="No. HP / WA (misal: 08123456789)" />
        <button class="btn-primary" onclick="tambahAnggota()">➕ Tambah</button>
      </div>`;
  } else {
    formEl.innerHTML = `
      <div class="card" style="text-align:center;padding:20px">
        <p style="color:#888;margin-bottom:15px">🔒 Hanya admin yang bisa menambah anggota</p>
        <button class="btn-primary" style="width:auto;padding:10px 30px" onclick="cekAdmin()">🔑 Login Admin</button>
      </div>`;
  }

  // List anggota
  if (!data.anggota.length) {
    listEl.innerHTML = '<p class="empty">Belum ada anggota</p>';
    return;
  }
  listEl.innerHTML = data.anggota.map(a => `
    <div class="anggota-item">
      <div class="avatar">${a.nama[0].toUpperCase()}</div>
      <div class="anggota-info">
        <div class="nama">${a.nama}</div>
        <div class="hp">${a.hp ? formatHP(a.hp) : 'No HP tidak ada'}</div>
      </div>
      <span class="badge ${a.sudahDapat ? 'badge-sudah':'badge-belum'}">
        ${a.sudahDapat ? '✅':'⏳'}
      </span>
      ${isAdmin ? `<button class="btn-hapus" onclick="hapusAnggota(${a.id})">🗑️</button>` : ''}
    </div>`).join('');
}

// ===== BERANDA =====
function renderBeranda() {
  const total = data.anggota.length;
  const sudah = data.anggota.filter(a => a.sudahDapat).length;
  document.getElementById('total-anggota').textContent = total;
  document.getElementById('belum-dapat').textContent  = total - sudah;
  document.getElementById('sudah-dapat').textContent  = sudah;
  document.getElementById('total-iuran').textContent  = rupiah(data.pengaturan.iuran * total);
  document.getElementById('nama-grup').value  = data.pengaturan.nama;
  document.getElementById('iuran').value      = data.pengaturan.iuran;
  document.getElementById('subtitle-nama').textContent = data.pengaturan.nama;

  const btnSimpan = document.getElementById('btn-simpan-setting');
  if (btnSimpan) btnSimpan.style.display = isAdmin ? 'block' : 'none';
}

// ===== TABUNG =====
const ITEM_H = 56;
const CENTER = 2; // index baris tengah dari 5 baris visible

function renderTube() {
  const belum  = data.anggota.filter(a => !a.sudahDapat);
  const hint   = document.getElementById('hint-peserta');
  const btn    = document.getElementById('btn-undian');
  const tube   = document.getElementById('tube-inner');
  if (!tube) return;

  if (!belum.length) {
    if (hint) hint.textContent = 'Semua anggota sudah mendapatkan arisan! 🏆';
    if (btn)  btn.disabled = true;
    tube.innerHTML = `<div class="tube-name-item" style="color:#f5c518;text-align:center">🏆 Selesai!</div>`;
    return;
  }

  if (hint) hint.textContent = `${belum.length} peserta belum mendapat giliran`;
  if (btn)  btn.disabled = false;

  // Pool nama: 6 kali ulang supaya tabung kelihatan penuh
  const pool = [];
  for (let i = 0; i < 6; i++) belum.forEach(a => pool.push(a.nama));

  tube.innerHTML = pool.map(n => `<div class="tube-name-item">${n}</div>`).join('');

  // Set posisi awal ke tengah pool
  const mid = Math.floor(pool.length / 2);
  tube.style.transition = 'none';
  tube.style.transform  = `translateY(-${(mid - CENTER) * ITEM_H}px)`;
}

// ===== UNDIAN =====
let isSpinning = false;

function mulaiUndian() {
  const belum = data.anggota.filter(a => !a.sudahDapat);
  if (!belum.length || isSpinning) return;

  isSpinning = true;
  const btn       = document.getElementById('btn-undian');
  const tube      = document.getElementById('tube-inner');
  const resultBox = document.getElementById('result-box');

  btn.disabled    = true;
  btn.textContent = '⏳ Mengundi...';
  resultBox.classList.add('hidden');

  // Pilih pemenang
  const pemenang = belum[Math.floor(Math.random() * belum.length)];

  // Buat pool panjang, akhiri dengan nama pemenang
  const pool = [];
  for (let i = 0; i < 10; i++) belum.forEach(a => pool.push(a.nama));
  pool.push(pemenang.nama); // item terakhir = pemenang

  tube.innerHTML = pool.map(n => `<div class="tube-name-item">${n}</div>`).join('');

  // Mulai dari atas
  tube.style.transition = 'none';
  tube.style.transform  = `translateY(${CENTER * ITEM_H}px)`;
  tube.getBoundingClientRect(); // force reflow

  // Animasi ke pemenang (index terakhir pool)
  const targetY = (CENTER - (pool.length - 1)) * ITEM_H;
  tube.style.transition = `transform 5000ms cubic-bezier(0.17, 0.67, 0.12, 1.0)`;
  tube.style.transform  = `translateY(${targetY}px)`;

  setTimeout(() => {
    isSpinning          = false;
    btn.disabled        = false;
    btn.textContent     = '🎰 PUTAR TABUNG!';

    // Simpan hasil
    const noPemenang = data.riwayat.length + 1;
    const totalHadiah = data.pengaturan.iuran * data.anggota.length;
    const tgl = new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'});

    const idx = data.anggota.findIndex(a => a.id === pemenang.id);
    data.anggota[idx].sudahDapat = true;
    data.riwayat.push({ no: noPemenang, nama: pemenang.nama, hp: pemenang.hp||'', tanggal: tgl, total: totalHadiah });
    simpan();

    // Tampilkan result
    document.getElementById('result-nama').textContent = '🏆 ' + pemenang.nama;
    document.getElementById('result-sub').textContent  =
      `Arisan ke-${noPemenang}  •  ${rupiah(totalHadiah)}  •  ${tgl}`;

    // Tombol WA pemenang
    const waBtn = document.getElementById('btn-wa-pemenang');
    if (pemenang.hp) {
      const waNum = hpToWA(pemenang.hp);
      const teks  = encodeURIComponent(
        `🎉 Selamat ${pemenang.nama}!\n\nAnda mendapatkan arisan *${data.pengaturan.nama}* periode ke-${noPemenang}.\n\nTotal hadiah: ${rupiah(totalHadiah)}\n\nSilakan hubungi admin untuk pencairan ya! 🎊`
      );
      waBtn.href         = `https://wa.me/${waNum}?text=${teks}`;
      waBtn.style.display = 'flex';
    } else {
      waBtn.style.display = 'none';
    }

    // Tombol notif ke admin
    const waAdmin = document.getElementById('btn-wa-admin');
    const teksAdmin = encodeURIComponent(
      `🎰 HASIL UNDIAN ARISAN\n\n` +
      `Grup: ${data.pengaturan.nama}\n` +
      `Pemenang: ${pemenang.nama}\n` +
      (pemenang.hp ? `No HP: ${formatHP(pemenang.hp)}\n` : '') +
      `Hadiah: ${rupiah(totalHadiah)}\n` +
      `Periode: ke-${noPemenang}\n` +
      `Tanggal: ${tgl}`
    );
    waAdmin.href = `https://wa.me/${ADMIN_WA}?text=${teksAdmin}`;

    resultBox.classList.remove('hidden');
    setTimeout(renderTube, 800);
    renderBeranda();
  }, 5200);
}

// ===== RIWAYAT =====
function renderRiwayat() {
  const el      = document.getElementById('list-riwayat');
  const cardReset = document.getElementById('card-reset');
  if (cardReset) cardReset.style.display = isAdmin ? 'block' : 'none';

  if (!data.riwayat.length) {
    el.innerHTML = '<p class="empty">Belum ada undian</p>';
    return;
  }
  el.innerHTML = [...data.riwayat].reverse().map(r => {
    const waLink = r.hp ? (() => {
      const n    = hpToWA(r.hp);
      const teks = encodeURIComponent(`Halo ${r.nama}, konfirmasi arisan ke-${r.no} 🎉`);
      return `<a class="btn-wa-kecil" href="https://wa.me/${n}?text=${teks}" target="_blank">💬 WA</a>`;
    })() : '';
    return `
      <div class="riwayat-item">
        <div class="riwayat-no">${r.no}</div>
        <div class="riwayat-info">
          <div class="nama">🏆 ${r.nama}</div>
          <div class="tgl">${r.tanggal} — ${rupiah(r.total)}</div>
        </div>
        ${waLink}
      </div>`;
  }).join('');
}

// ===== RESET =====
function resetArisan() {
  if (!isAdmin) return alert('Hanya admin yang bisa reset!');
  if (!confirm('Reset semua data untuk periode baru? Riwayat akan dihapus.')) return;
  data.anggota = data.anggota.map(a => ({...a, sudahDapat: false}));
  data.riwayat = [];
  simpan();
  renderAll();
  alert('✅ Arisan direset! Periode baru dimulai.');
}

// ===== INIT =====
function renderAll() {
  renderBeranda();
  renderAnggota();
  renderRiwayat();
  renderTube();
}

renderAll();
