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
function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  event.target.classList.add('active');
  renderAll();
}

// ===== PENGATURAN =====
function simpanPengaturan() {
  const nama = document.getElementById('nama-grup').value.trim();
  const iuran = parseInt(document.getElementById('iuran').value);
  if (!nama) return alert('Nama grup harus diisi!');
  data.pengaturan = { nama, iuran: iuran || 500000 };
  simpan();
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
}

function hapusAnggota(id) {
  if (!confirm('Hapus anggota ini?')) return;
  data.anggota = data.anggota.filter(a => a.id !== id);
  simpan();
  renderAnggota();
  renderBeranda();
}

function renderAnggota() {
  const el = document.getElementById('list-anggota');
  if (data.anggota.length === 0) {
    el.innerHTML = '<p class="empty">Belum ada anggota</p>';
    return;
  }
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

// ===== UNDIAN =====
let isSpinning = false;

function mulaiUndian() {
  const belum = data.anggota.filter(a => !a.sudahDapat);
  if (belum.length === 0) {
    alert('Semua anggota sudah mendapatkan arisan! Reset untuk periode baru.');
    return;
  }
  if (isSpinning) return;

  isSpinning = true;
  const btn = document.getElementById('btn-undian');
  const drum = document.getElementById('drum');
  const display = document.getElementById('drum-display');
  const status = document.getElementById('status-undian');

  btn.disabled = true;
  btn.textContent = '⏳ Mengundi...';
  status.textContent = '';
  drum.classList.add('spinning');

  let count = 0;
  const interval = setInterval(() => {
    const random = belum[Math.floor(Math.random() * belum.length)];
    display.textContent = random.nama;
    count++;
    if (count > 30) {
      clearInterval(interval);
      drum.classList.remove('spinning');

      // Pilih pemenang
      const pemenang = belum[Math.floor(Math.random() * belum.length)];
      display.textContent = '🎉 ' + pemenang.nama;
      status.textContent = `Selamat ${pemenang.nama}! Mendapatkan arisan ke-${data.riwayat.length + 1}`;

      // Update data
      const idx = data.anggota.findIndex(a => a.id === pemenang.id);
      data.anggota[idx].sudahDapat = true;
      data.riwayat.push({
        no: data.riwayat.length + 1,
        nama: pemenang.nama,
        tanggal: new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }),
        iuran: data.pengaturan.iuran * data.anggota.length
      });
      simpan();

      btn.disabled = false;
      btn.textContent = '🎰 MULAI UNDIAN!';
      isSpinning = false;
      renderBeranda();
    }
  }, 80);
}

// ===== RIWAYAT =====
function renderRiwayat() {
  const el = document.getElementById('list-riwayat');
  if (data.riwayat.length === 0) {
    el.innerHTML = '<p class="empty">Belum ada undian</p>';
    return;
  }
  el.innerHTML = [...data.riwayat].reverse().map(r => `
    <div class="riwayat-item">
      <div class="riwayat-no">${r.no}</div>
      <div class="riwayat-info">
        <div class="nama">🏆 ${r.nama}</div>
        <div class="tgl">${r.tanggal} — Rp ${r.iuran.toLocaleString('id-ID')}</div>
      </div>
    </div>
  `).join('');
}

// ===== BERANDA =====
function renderBeranda() {
  const total = data.anggota.length;
  const sudah = data.anggota.filter(a => a.sudahDapat).length;
  const iuran = data.pengaturan.iuran;
  document.getElementById('total-anggota').textContent = total;
  document.getElementById('belum-dapat').textContent = total - sudah;
  document.getElementById('sudah-dapat').textContent = sudah;
  document.getElementById('total-iuran').textContent = 'Rp ' + (iuran * total).toLocaleString('id-ID');
  document.getElementById('nama-grup').value = data.pengaturan.nama;
  document.getElementById('iuran').value = data.pengaturan.iuran;
}

// ===== RESET =====
function resetArisan() {
  if (!confirm('Reset semua data arisan untuk periode baru? Riwayat akan dihapus.')) return;
  data.anggota = data.anggota.map(a => ({ ...a, sudahDapat: false }));
  data.riwayat = [];
  simpan();
  alert('✅ Arisan direset! Periode baru dimulai.');
  renderAll();
}

function renderAll() {
  renderBeranda();
  renderAnggota();
  renderRiwayat();
}

// Init
renderAll();
