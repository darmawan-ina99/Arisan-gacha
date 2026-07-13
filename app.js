// ===== CONFIG =====
const API_URL = 'https://api.base44.app/api/apps/6a5497f88dea110ab5e19b42/functions/arisanApi';
const ADMIN_WA = '6285811200013';
const SPIN_DURATION = 10000;
const CIRCUMFERENCE = 2 * Math.PI * 54;

// ===== STATE =====
let grupId = null;
let data = { pengaturan: { nama: 'Arisan Gacha', iuran: 500000 }, anggota: [], riwayat: [] };
let isAdmin = false;
let isSpinning = false;
let pollInterval = null;

// ===== API =====
async function api(action, payload = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });
  return res.json();
}

// ===== POLLING (real-time multi-device) =====
function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    if (isSpinning) return;
    await loadData();
  }, 3000);
}

async function loadData() {
  try {
    const [gRes, aRes, rRes] = await Promise.all([
      api('getGrup'),
      api('getAnggota', { grup_id: grupId }),
      api('getRiwayat', { grup_id: grupId })
    ]);
    if (gRes.grup) {
      data.pengaturan = { nama: gRes.grup.nama, iuran: gRes.grup.iuran };
    }
    data.anggota = (aRes.anggota || []).map(a => ({
      id: a.id, nama: a.nama, hp: a.no_hp || '', sudahDapat: a.sudah_dapat
    }));
    data.riwayat = (rRes.riwayat || []).map(r => ({
      no: r.periode, nama: r.nama_pemenang, hp: r.no_hp, tanggal: r.tanggal, total: r.total_hadiah
    }));
    renderAll();
  } catch(e) { console.error('loadData error', e); }
}

// ===== INIT =====
window.onload = async () => {
  showLoading(true);
  try {
    const gRes = await api('getGrup');
    if (gRes.grup) {
      grupId = gRes.grup.id;
    } else {
      const created = await api('saveGrup', { nama: 'Arisan Gacha', iuran: 500000, admin_pin: '0021' });
      grupId = created.grup.id;
    }
    await loadData();
    startPolling();
    showLoading(false);
    showMainApp();
  } catch(e) {
    showLoading(false);
    alert('Gagal terhubung ke server. Cek koneksi internet kamu!');
  }
};

function showLoading(show) {
  let el = document.getElementById('loading-screen');
  if (!el) return;
  el.style.display = show ? 'flex' : 'none';
}

function showMainApp() {
  document.getElementById('loading-screen').style.display = 'none';
  showTab('beranda', document.querySelector('.tab'));
}

// ===== UTILITY =====
function formatHP(hp) {
  if (!hp) return '';
  let c = hp.replace(/\D/g,'');
  if (c.startsWith('0')) c = '62' + c.slice(1);
  return '+' + c;
}
function hpToWA(hp) {
  if (!hp) return '';
  let c = hp.replace(/\D/g,'');
  if (c.startsWith('0')) c = '62' + c.slice(1);
  return c;
}
function rupiah(n) { return 'Rp ' + (n||0).toLocaleString('id-ID'); }

// ===== ADMIN =====
async function cekAdmin() {
  const pin = prompt('Masukkan PIN Admin:');
  if (pin === null) return;
  const res = await api('verifyPin', { pin });
  if (res.ok) {
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

// Cek session admin (valid 8 jam)
(() => {
  const s = localStorage.getItem('admin-session');
  if (s && (Date.now() - parseInt(s)) < 8 * 3600 * 1000) isAdmin = true;
})();

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
async function simpanPengaturan() {
  if (!isAdmin) return cekAdmin();
  const nama  = document.getElementById('nama-grup').value.trim();
  const iuran = parseInt(document.getElementById('iuran').value) || 500000;
  if (!nama) return alert('Nama grup harus diisi!');
  await api('saveGrup', { nama, iuran, admin_pin: '0021' });
  data.pengaturan = { nama, iuran };
  renderBeranda();
  alert('✅ Pengaturan disimpan!');
}

// ===== ANGGOTA =====
async function tambahAnggota() {
  const nama = document.getElementById('nama-anggota').value.trim();
  const hp   = document.getElementById('no-hp').value.trim();
  if (!nama) return alert('Nama anggota harus diisi!');
  const res = await api('tambahAnggota', { grup_id: grupId, nama, no_hp: hp });
  data.anggota.push({ id: res.anggota.id, nama, hp, sudahDapat: false });
  document.getElementById('nama-anggota').value = '';
  document.getElementById('no-hp').value = '';
  renderAnggota(); renderBeranda(); renderTube();
}

async function hapusAnggota(id) {
  if (!confirm('Hapus anggota ini?')) return;
  await api('hapusAnggota', { id });
  data.anggota = data.anggota.filter(a => a.id !== id);
  renderAnggota(); renderBeranda(); renderTube();
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
      ${isAdmin ? `<button class="btn-hapus" onclick="hapusAnggota('${a.id}')">🗑️</button>` : ''}
    </div>`).join('');
}

// ===== BERANDA =====
function renderBeranda() {
  const total = data.anggota.length;
  const sudah = data.anggota.filter(a => a.sudahDapat).length;
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('total-anggota', total);
  set('belum-dapat', total - sudah);
  set('sudah-dapat', sudah);
  set('total-iuran', rupiah((data.pengaturan?.iuran || 0) * total));
  set('subtitle-nama', data.pengaturan?.nama || 'Arisan Gacha');
  const ngEl = document.getElementById('nama-grup');
  const iuEl = document.getElementById('iuran');
  if (ngEl) ngEl.value = data.pengaturan?.nama || '';
  if (iuEl) iuEl.value = data.pengaturan?.iuran || 500000;
  const btnSimpan = document.getElementById('btn-simpan-setting');
  if (btnSimpan) btnSimpan.style.display = isAdmin ? 'block' : 'none';
  const btnLoginAdmin = document.getElementById('btn-login-admin');
  if (btnLoginAdmin) btnLoginAdmin.style.display = isAdmin ? 'none' : 'block';
}

// ===== TABUNG =====
const ITEM_H = 56;
const CENTER = 2;

function renderTube() {
  const belum = data.anggota.filter(a => !a.sudahDapat);
  const hint  = document.getElementById('hint-peserta');
  const btn   = document.getElementById('btn-undian');
  const tube  = document.getElementById('tube-inner');
  if (!tube) return;

  if (!belum.length) {
    if (hint) hint.textContent = 'Semua anggota sudah mendapatkan arisan! 🏆';
    if (btn)  btn.disabled = true;
    tube.innerHTML = `<div class="tube-name-item" style="color:#f5c518">🏆 Selesai!</div>`;
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

function startCountdown(seconds) {
  const wrap  = document.getElementById('countdown-wrap');
  const numEl = document.getElementById('countdown-number');
  const ring  = document.getElementById('ring-progress');
  wrap.classList.remove('hidden');

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
    ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - remaining / seconds);
    numEl.style.color = remaining <= 3 ? '#f5576c' : '#fff';
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      wrap.classList.add('hidden');
      numEl.style.color = '#fff';
    }
  }, 1000);
}

// ===== CONFETTI =====
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx    = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ['#f5c518','#f5576c','#f093fb','#00c864','#667eea','#fff'];
  const pieces = Array.from({length: 200}, () => ({
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
  }));

  let frame;
  (function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.y += p.vy; p.x += p.vx; p.rot += p.rotSpeed;
      if (p.y > canvas.height - 100) p.opacity -= 0.02;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    if (pieces.some(p => p.opacity > 0)) frame = requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })();
  setTimeout(() => { cancelAnimationFrame(frame); ctx.clearRect(0, 0, canvas.width, canvas.height); }, 5000);
}

// ===== UNDIAN =====
async function mulaiUndian() {
  const belum = data.anggota.filter(a => !a.sudahDapat);
  if (!belum.length || isSpinning) return;

  isSpinning = true;
  const btn      = document.getElementById('btn-undian');
  const tube     = document.getElementById('tube-inner');
  const tubeGlow = document.getElementById('tube-glow');
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

  startCountdown(10);

  const targetY = (CENTER - (pool.length - 1)) * ITEM_H;
  tube.style.transition = `transform 7000ms cubic-bezier(0.1,0.5,0.1,1.0)`;
  tube.style.transform  = `translateY(${targetY}px)`;
  setTimeout(() => {
    tube.style.transition = `transform 3000ms cubic-bezier(0.05,0.9,0.1,1.0)`;
    tube.style.transform  = `translateY(${targetY}px)`;
  }, 7000);

  setTimeout(async () => {
    await finishUndian(pemenang, btn, tubeGlow);
  }, SPIN_DURATION + 300);
}

async function finishUndian(pemenang, btn, tubeGlow) {
  const noPemenang  = (data.riwayat?.length || 0) + 1;
  const totalHadiah = (data.pengaturan?.iuran || 0) * (data.anggota?.length || 0);
  const tgl = new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'});

  await api('updateAnggota', { id: pemenang.id, sudah_dapat: true });
  await api('tambahRiwayat', { grup_id: grupId, nama_pemenang: pemenang.nama, no_hp: pemenang.hp || '', periode: noPemenang, total_hadiah: totalHadiah, tanggal: tgl });

  const idx = data.anggota.findIndex(a => a.id === pemenang.id);
  if (idx !== -1) data.anggota[idx].sudahDapat = true;
  data.riwayat.push({ no: noPemenang, nama: pemenang.nama, hp: pemenang.hp || '', tanggal: tgl, total: totalHadiah });

  isSpinning = false;
  btn.disabled = false;
  btn.textContent = '🎰 PUTAR TABUNG!';
  btn.classList.remove('spinning');
  tubeGlow.classList.remove('active');

  document.getElementById('result-nama').textContent = '🏆 ' + pemenang.nama;
  document.getElementById('result-sub').textContent  = `Arisan ke-${noPemenang}  •  ${rupiah(totalHadiah)}  •  ${tgl}`;

  const waBtn = document.getElementById('btn-wa-pemenang');
  if (pemenang.hp) {
    const waNum = hpToWA(pemenang.hp);
    const teks = encodeURIComponent(`🎉 Selamat ${pemenang.nama}!\n\nAnda mendapatkan arisan *${data.pengaturan.nama}* periode ke-${noPemenang}.\n\nTotal hadiah: ${rupiah(totalHadiah)}\n\nSilakan hubungi admin untuk pencairan ya! 🎊`);
    waBtn.href = `https://wa.me/${waNum}?text=${teks}`;
    waBtn.style.display = 'flex';
  } else {
    waBtn.style.display = 'none';
  }

  const teksAdmin = encodeURIComponent(`🎰 HASIL UNDIAN ARISAN\n\nGrup: ${data.pengaturan.nama}\nPemenang: ${pemenang.nama}\n${pemenang.hp ? `No HP: ${formatHP(pemenang.hp)}\n` : ''}Hadiah: ${rupiah(totalHadiah)}\nPeriode: ke-${noPemenang}\nTanggal: ${tgl}`);
  document.getElementById('btn-wa-admin').href = `https://wa.me/${ADMIN_WA}?text=${teksAdmin}`;

  document.getElementById('result-box').classList.remove('hidden');
  launchConfetti();
  setTimeout(renderTube, 800);
  renderBeranda();
  renderRiwayat();
}

// ===== RIWAYAT =====
function renderRiwayat() {
  const el = document.getElementById('list-riwayat');
  const cardReset = document.getElementById('card-reset');
  if (!el) return;
  if (cardReset) cardReset.style.display = isAdmin ? 'block' : 'none';

  if (!data.riwayat.length) {
    el.innerHTML = '<p class="empty">Belum ada undian</p>';
    return;
  }
  el.innerHTML = [...data.riwayat].reverse().map(r => `
    <div class="riwayat-item">
      <div class="riwayat-no">${r.no}</div>
      <div class="riwayat-info">
        <div class="nama">${r.nama}</div>
        <div class="tgl">${r.tanggal} • ${rupiah(r.total)}</div>
      </div>
      ${r.hp ? `<a class="btn-wa-kecil" href="https://wa.me/${hpToWA(r.hp)}" target="_blank">💬 WA</a>` : ''}
    </div>`).join('');
}

async function resetArisan() {
  if (!isAdmin) return cekAdmin();
  if (!confirm('Reset semua data undian? Anggota tetap ada, tapi status "sudah dapat" direset.')) return;
  await api('resetArisan', { grup_id: grupId });
  data.anggota = data.anggota.map(a => ({...a, sudahDapat: false}));
  data.riwayat = [];
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
