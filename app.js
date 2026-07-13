// ===== KONFIGURASI =====
const ADMIN_PIN  = '0021';
const ADMIN_WA   = '6285811200013';
const SPIN_DURATION = 10000; // 10 detik
const CIRCUMFERENCE = 2 * Math.PI * 54; // ~339.3

// ===== STATE =====
let db        = null;
let useFirebase = false;
let data = {
  pengaturan: { nama: 'Arisan Gacha', iuran: 500000 },
  anggota: [],
  riwayat: []
};

let isAdmin = (() => {
  const s = localStorage.getItem('admin-session');
  return s && (Date.now() - parseInt(s)) < 8 * 3600 * 1000;
})();

// ===== FIREBASE SETUP =====
function connectFirebase() {
  const raw = document.getElementById('fb-config').value.trim();
  try {
    const config = JSON.parse(raw);
    if (!config.databaseURL) throw new Error('databaseURL wajib ada');
    if (!firebase.apps.length) firebase.initializeApp(config);
    db = firebase.database();
    useFirebase = true;
    localStorage.setItem('fb-config', raw);
    startFirebaseSync();
    showMainApp();
  } catch(e) {
    alert('❌ Config Firebase tidak valid:\n' + e.message);
  }
}

function useLocal() {
  useFirebase = false;
  data = JSON.parse(localStorage.getItem('arisan-data') || JSON.stringify(data));
  showMainApp();
}

function showMainApp() {
  document.getElementById('tab-setup').classList.add('hidden');
  document.getElementById('tab-setup').classList.remove('active');
  showTab('beranda', document.querySelector('.tab'));
  renderAll();

  const badge = document.getElementById('mode-badge');
  if (useFirebase) {
    badge.className = 'mode-badge mode-firebase';
    badge.textContent = '🔥 Mode Firebase — Real-time Multi Perangkat';
  } else {
    badge.className = 'mode-badge mode-local';
    badge.textContent = '📱 Mode Lokal — Hanya perangkat ini';
  }
}

function startFirebaseSync() {
  db.ref('arisan').on('value', snap => {
    const val = snap.val();
    if (val) {
      data = val;
      renderAll();
    }
  });
}

// ===== SIMPAN =====
function simpan() {
  if (useFirebase) {
    db.ref('arisan').set(data);
  } else {
    localStorage.setItem('arisan-data', JSON.stringify(data));
  }
}

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
  const tabEl = document.getElementById('tab-' + tab);
  if (tabEl) tabEl.classList.add('active');
  if (el) el.classList.add('active');
  if (tab === 'undian') renderTube();
}

// ===== PENGATURAN =====
function simpanPengaturan() {
  if (!isAdmin) return cekAdmin();
  const nama  = document.getElementById('nama-grup').value.trim();
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
  if (!data.anggota) data.anggota = [];
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
  if (!formEl || !listEl) return;

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

  const anggota = data.anggota || [];
  if (!anggota.length) {
    listEl.innerHTML = '<p class="empty">Belum ada anggota</p>';
    return;
  }
  listEl.innerHTML = anggota.map(a => `
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
  const anggota = data.anggota || [];
  const total   = anggota.length;
  const sudah   = anggota.filter(a => a.sudahDapat).length;
  const elTA    = document.getElementById('total-anggota');
  const elBD    = document.getElementById('belum-dapat');
  const elSD    = document.getElementById('sudah-dapat');
  const elTI    = document.getElementById('total-iuran');
  if (elTA) elTA.textContent = total;
  if (elBD) elBD.textContent = total - sudah;
  if (elSD) elSD.textContent = sudah;
  if (elTI) elTI.textContent = rupiah((data.pengaturan?.iuran || 0) * total);

  const ngEl = document.getElementById('nama-grup');
  const iuEl = document.getElementById('iuran');
  const snEl = document.getElementById('subtitle-nama');
  if (ngEl) ngEl.value = data.pengaturan?.nama || '';
  if (iuEl) iuEl.value = data.pengaturan?.iuran || 500000;
  if (snEl) snEl.textContent = data.pengaturan?.nama || 'Arisan Gacha';

  const btnSimpan = document.getElementById('btn-simpan-setting');
  if (btnSimpan) btnSimpan.style.display = isAdmin ? 'block' : 'none';
}

// ===== TABUNG =====
const ITEM_H = 56;
const CENTER = 2;

function renderTube() {
  const belum = (data.anggota || []).filter(a => !a.sudahDapat);
  const hint  = document.getElementById('hint-peserta');
  const btn   = document.getElementById('btn-undian');
  const tube  = document.getElementById('tube-inner');
  if (!tube) return;

  if (!belum.length) {
    if (hint) hint.textContent = 'Semua anggota sudah mendapatkan arisan! 🏆';
    if (btn)  btn.disabled = true;
    tube.innerHTML = `<div class="tube-name-item" style="color:#f5c518;text-align:center">🏆 Selesai!</div>`;
    return;
  }

  if (hint) hint.textContent = `${belum.length} peserta belum mendapat giliran`;
  if (btn)  btn.disabled = false;

  const pool = [];
  for (let i = 0; i < 6; i++) belum.forEach(a => pool.push(a.nama));
  tube.innerHTML = pool.map(n => `<div class="tube-name-item">${n}</div>`).join('');
  tube.style.transition = 'none';
  tube.style.transform  = `translateY(-${(Math.floor(pool.length/2) - CENTER) * ITEM_H}px)`;
}

// ===== COUNTDOWN =====
let countdownInterval = null;

function startCountdown(seconds, onDone) {
  const wrap   = document.getElementById('countdown-wrap');
  const numEl  = document.getElementById('countdown-number');
  const ring   = document.getElementById('ring-progress');
  wrap.classList.remove('hidden');

  // Add SVG gradient
  const svgEl = wrap.querySelector('.countdown-svg');
  if (!svgEl.querySelector('defs')) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
    defs.innerHTML = `<linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#f5c518"/><stop offset="100%" style="stop-color:#f5576c"/></linearGradient>`;
    svgEl.prepend(defs);
    ring.setAttribute('stroke','url(#ringGrad)');
  }

  let remaining = seconds;
  ring.style.strokeDasharray  = CIRCUMFERENCE;
  ring.style.strokeDashoffset = '0';
  numEl.textContent = remaining;

  countdownInterval = setInterval(() => {
    remaining--;
    numEl.textContent = remaining;
    const progress = remaining / seconds;
    ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
    if (remaining <= 3) numEl.style.color = '#f5576c';
    else numEl.style.color = '#fff';
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      wrap.classList.add('hidden');
      numEl.style.color = '#fff';
      if (onDone) onDone();
    }
  }, 1000);
}

// ===== CONFETTI =====
function launchConfetti() {
  const canvas  = document.getElementById('confetti-canvas');
  const ctx     = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const pieces  = [];
  const colors  = ['#f5c518','#f5576c','#f093fb','#00c864','#667eea','#fff'];

  for (let i = 0; i < 200; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: Math.random() * 12 + 5,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - .5) * 6,
      vy: Math.random() * 4 + 2,
      vx: (Math.random() - .5) * 2,
      opacity: 1
    });
  }

  let frame;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.y  += p.vy;
      p.x  += p.vx;
      p.rot += p.rotSpeed;
      if (p.y > canvas.height - 100) p.opacity -= 0.02;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    if (pieces.some(p => p.opacity > 0)) {
      frame = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  animate();
  setTimeout(() => { cancelAnimationFrame(frame); ctx.clearRect(0, 0, canvas.width, canvas.height); }, 5000);
}

// ===== UNDIAN =====
let isSpinning = false;

function mulaiUndian() {
  const belum = (data.anggota || []).filter(a => !a.sudahDapat);
  if (!belum.length || isSpinning) return;

  isSpinning = true;
  const btn       = document.getElementById('btn-undian');
  const tube      = document.getElementById('tube-inner');
  const tubeGlow  = document.getElementById('tube-glow');
  const resultBox = document.getElementById('result-box');

  btn.disabled = true;
  btn.textContent = '⏳ Sedang Mengundi...';
  btn.classList.add('spinning');
  resultBox.classList.add('hidden');
  tubeGlow.classList.add('active');

  const pemenang = belum[Math.floor(Math.random() * belum.length)];

  const pool = [];
  for (let i = 0; i < 15; i++) belum.forEach(a => pool.push(a.nama));
  pool.push(pemenang.nama);

  tube.innerHTML = pool.map(n => `<div class="tube-name-item">${n}</div>`).join('');
  tube.style.transition = 'none';
  tube.style.transform  = `translateY(${CENTER * ITEM_H}px)`;
  tube.getBoundingClientRect();

  // Mulai countdown 10 detik
  startCountdown(10, null);

  // Fase 1: spin cepat 7 detik
  const targetY = (CENTER - (pool.length - 1)) * ITEM_H;
  tube.style.transition = `transform 7000ms cubic-bezier(0.1, 0.5, 0.1, 1.0)`;
  tube.style.transform  = `translateY(${targetY}px)`;

  // Fase 2: slow down 3 detik ke posisi final
  setTimeout(() => {
    tube.style.transition = `transform 3000ms cubic-bezier(0.05, 0.9, 0.1, 1.0)`;
    tube.style.transform  = `translateY(${targetY}px)`;
  }, 7000);

  setTimeout(() => {
    finishUndian(pemenang, btn, tubeGlow);
  }, SPIN_DURATION + 300);
}

function finishUndian(pemenang, btn, tubeGlow) {
  isSpinning = false;
  btn.disabled    = false;
  btn.textContent = '🎰 PUTAR TABUNG!';
  btn.classList.remove('spinning');
  tubeGlow.classList.remove('active');

  const noPemenang  = (data.riwayat?.length || 0) + 1;
  const totalHadiah = (data.pengaturan?.iuran || 0) * (data.anggota?.length || 0);
  const tgl = new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'});

  const idx = data.anggota.findIndex(a => a.id === pemenang.id);
  if (idx !== -1) data.anggota[idx].sudahDapat = true;
  if (!data.riwayat) data.riwayat = [];
  data.riwayat.push({ no: noPemenang, nama: pemenang.nama, hp: pemenang.hp||'', tanggal: tgl, total: totalHadiah });
  simpan();

  document.getElementById('result-nama').textContent = '🏆 ' + pemenang.nama;
  document.getElementById('result-sub').textContent  =
    `Arisan ke-${noPemenang}  •  ${rupiah(totalHadiah)}  •  ${tgl}`;

  const waBtn = document.getElementById('btn-wa-pemenang');
  if (pemenang.hp) {
    const waNum = hpToWA(pemenang.hp);
    const teks  = encodeURIComponent(
      `🎉 Selamat ${pemenang.nama}!\n\nAnda mendapatkan arisan *${data.pengaturan.nama}* periode ke-${noPemenang}.\n\nTotal hadiah: ${rupiah(totalHadiah)}\n\nSilakan hubungi admin untuk pencairan ya! 🎊`
    );
    waBtn.href          = `https://wa.me/${waNum}?text=${teks}`;
    waBtn.style.display = 'flex';
  } else {
    waBtn.style.display = 'none';
  }

  const waAdmin   = document.getElementById('btn-wa-admin');
  const teksAdmin = encodeURIComponent(
    `🎰 HASIL UNDIAN ARISAN\n\nGrup: ${data.pengaturan.nama}\nPemenang: ${pemenang.nama}\n` +
    (pemenang.hp ? `No HP: ${formatHP(pemenang.hp)}\n` : '') +
    `Hadiah: ${rupiah(totalHadiah)}\nPeriode: ke-${noPemenang}\nTanggal: ${tgl}`
  );
  waAdmin.href = `https://wa.me/${ADMIN_WA}?text=${teksAdmin}`;

  const resultBox = document.getElementById('result-box');
  resultBox.classList.remove('hidden');

  // Confetti!
  launchConfetti();

  setTimeout(renderTube, 800);
  renderBeranda();
  renderRiwayat();
}

// ===== RIWAYAT =====
function renderRiwayat() {
  const el        = document.getElementById('list-riwayat');
  const cardReset = document.getElementById('card-reset');
  if (!el) return;
  if (cardReset) cardReset.style.display = isAdmin ? 'block' : 'none';

  const riwayat = data.riwayat || [];
  if (!riwayat.length) {
    el.innerHTML = '<p class="empty">Belum ada undian</p>';
    return;
  }
  el.innerHTML = [...riwayat].reverse().map(r => `
    <div class="riwayat-item">
      <div class="riwayat-no">${r.no}</div>
      <div class="riwayat-info">
        <div class="nama">${r.nama}</div>
        <div class="tgl">${r.tanggal} • ${rupiah(r.total)}</div>
      </div>
      ${r.hp ? `<a class="btn-wa-kecil" href="https://wa.me/${hpToWA(r.hp)}" target="_blank">💬 WA</a>` : ''}
    </div>`).join('');
}

function resetArisan() {
  if (!isAdmin) return cekAdmin();
  if (!confirm('Reset semua data undian? Anggota tetap ada, tapi status "sudah dapat" direset.')) return;
  data.anggota  = (data.anggota||[]).map(a => ({...a, sudahDapat: false}));
  data.riwayat  = [];
  simpan();
  renderAll();
  alert('✅ Arisan direset! Siap periode baru.');
}

// ===== RENDER ALL =====
function renderAll() {
  renderBeranda();
  renderAnggota();
  renderTube();
  renderRiwayat();
}

// ===== INIT =====
window.onload = () => {
  // Cek apakah ada saved firebase config
  const savedConfig = localStorage.getItem('fb-config');
  if (savedConfig) {
    document.getElementById('fb-config').value = savedConfig;
  }
};
