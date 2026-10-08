/* premium.js — dream.player : interface premium (à charger en dernier) */
(() => {
const $ = s => document.querySelector(s);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const root = document.documentElement.style;

/* ---------- Icônes vectorielles ---------- */
const IC = {
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>',
  prev: '<path d="M6 5h2.5v14H6zM20 5v14L9.500 12z"/>',
  next: '<path d="M15.500 5H18v14h-2.500zM4 5l10.500 7L4 19z"/>',
  shuffle: '<path d="M3 7h3.200c1.500 0 2.900.7 3.800 1.900L15 15.100c.9 1.200 2.300 1.900 3.800 1.900H21M3 17h3.200c1.500 0 2.900-.7 3.800-1.900M15 8.900c.9-1.200 2.300-1.900 3.800-1.900H21M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  repeat: '<path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4"/>'
};
icon = n => {
  const s = n === 'shuffle' || n === 'repeat';
  return `<svg viewBox="0 0 24 24" fill="${s ? 'none' : 'currentColor'}" stroke="${s ? 'currentColor' : 'none'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
};
[['#shuffle', 'shuffle'], ['#prev', 'prev'], ['#next', 'next'], ['#repeat', 'repeat'],
 ['#spshuf', 'shuffle'], ['#spprev', 'prev'], ['#spnext', 'next']].forEach(([s, n]) => { const e = $(s); if (e) e.innerHTML = icon(n); });
setPlayIcon();
if ($('#spplay')) $('#spplay').innerHTML = icon('play');

/* ---------- Libellés + fond flou + pochette par défaut ---------- */
document.querySelectorAll('.tab').forEach(t => {
  t.textContent = t.id === 'tabfx' ? 'Réglages' : t.dataset.view === 'spotify' ? 'Spotify' : 'Bibliothèque';
});
document.body.insertAdjacentHTML('afterbegin', '<div id="bgb"></div>');
const PH = 'data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><radialGradient id='g'><stop offset='0' stop-color='#3a2a6b'/><stop offset='1' stop-color='#0d0a1a'/></radialGradient></defs><rect width='100' height='100' fill='url(#g)'/><circle cx='50' cy='50' r='34' fill='none' stroke='#ffffff22'/><circle cx='50' cy='50' r='22' fill='none' stroke='#ffffff22'/><circle cx='50' cy='50' r='8' fill='#b79cff'/></svg>");
$('#cover').src = PH;

/* ---------- Couleur dominante de la pochette ---------- */
const dom = src => new Promise(ok => {
  const i = new Image();
  i.onload = () => {
    const k = document.createElement('canvas'); k.width = k.height = 8;
    const x = k.getContext('2d'); x.drawImage(i, 0, 0, 8, 8);
    const d = x.getImageData(0, 0, 8, 8).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let p = 0; p < d.length; p += 4) {
      const m = Math.max(d[p], d[p + 1], d[p + 2]), s = m - Math.min(d[p], d[p + 1], d[p + 2]);
      if (m > 60 && s > 25) { r += d[p]; g += d[p + 1]; b += d[p + 2]; n++; }
    }
    if (!n) return ok(null);
    r /= n; g /= n; b /= n;
    const f = Math.max(1, 170 / Math.max(r, g, b));
    ok([r, g, b].map(v => Math.min(255, v * f | 0)));
  };
  i.onerror = () => ok(null);
  i.src = src;
});
function color(src) {
  const bg = $('#bgb');
  if (!src) { root.removeProperty('--cov'); bg.classList.remove('on'); return; }
  bg.style.backgroundImage = `url(${src})`; bg.classList.add('on');
  dom(src).then(rgb => rgb ? root.setProperty('--cov', `rgb(${rgb})`) : root.removeProperty('--cov'));
}
const _l = load;
load = (i, a) => {
  _l(i, a);
  const t = tracks[i], im = $('#cover');
  if (!t.cover) im.src = PH;
  im.classList.remove('swap'); void im.offsetWidth; im.classList.add('swap');
  color(t.cover);
};

/* ---------- Curseurs avec remplissage ---------- */
const fill = e => e.style.setProperty('--p', ((e.value - e.min) / (e.max - e.min) * 100) + '%');
['#seek', '#vol'].forEach(s => { const e = $(s); e.addEventListener('input', () => fill(e)); fill(e); });
audio.addEventListener('timeupdate', () => fill($('#seek')));
document.querySelectorAll('.fx input[type=range]').forEach(e => { e.addEventListener('input', () => fill(e)); fill(e); });
document.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () =>
  document.querySelectorAll('.fx input[type=range]').forEach(e => fill(e))));

/* ---------- Animation lecture + swipe ---------- */
['play', 'pause'].forEach(ev => audio.addEventListener(ev, () => document.body.classList.toggle('playing', !audio.paused)));
let sx = null;
const sc = $('.screen');
sc.addEventListener('touchstart', e => { sx = e.target.closest('input') ? null : e.touches[0].clientX; }, { passive: true });
sc.addEventListener('touchend', e => {
  if (sx === null) return;
  const dx = e.changedTouches[0].clientX - sx; sx = null;
  if (Math.abs(dx) > 60) dx < 0 ? next(false) : prev();
});

/* ---------- Visualiseur lisse ---------- */
cv.width = 480; cv.height = 96;
let pm = 0, ACC = '#b79cff';
cv.addEventListener('click', () => { pm = (pm + 1) % 2; });
setInterval(() => { ACC = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || ACC; }, 800);
draw = () => {
  requestAnimationFrame(draw); t++;
  const W = cv.width, H = cv.height, w = W / BARS;
  c.clearRect(0, 0, W, H);
  const live = analyser && !audio.paused;
  if (live) analyser.getByteFrequencyData(data);
  c.fillStyle = ACC; c.shadowColor = ACC; c.shadowBlur = 12; c.globalAlpha = .9;
  for (let i = 0; i < BARS; i++) {
    const tg = live ? Math.min(1, Math.pow(data[i] / 255, 1.4) * 1.5) : (Math.sin(t / 40 + i / 2.5) + 1) / 16;
    level[i] += (tg - level[i]) * .3;
    const h = Math.max(4, level[i] * H * (pm ? .5 : 1));
    c.beginPath();
    const y = pm ? H / 2 - h : H - h, hh = pm ? h * 2 : h;
    c.roundRect ? c.roundRect(i * w + 2, y, w - 4, hh, 3) : c.rect(i * w + 2, y, w - 4, hh);
    c.fill();
  }
  c.globalAlpha = 1; c.shadowBlur = 0;
};

/* ---------- Sauvegarde : volume, morceau, position ---------- */
let lt = 0;
audio.addEventListener('timeupdate', () => {
  if (Date.now() - lt > 4000 && tracks[idx]) { lt = Date.now(); SS('dp_last', { id: tracks[idx].id, pos: audio.currentTime }); }
});
$('#vol').addEventListener('input', e => SS('dp_vol', +e.target.value));
const v0 = LS('dp_vol', null);
if (v0 !== null) { $('#vol').value = v0; audio.volume = v0; fill($('#vol')); }
setTimeout(() => {
  const L = LS('dp_last', null);
  if (!L || !L.id) return;
  const i = tracks.findIndex(x => x.id === L.id);
  if (i < 0) return;
  load(i, false);
  audio.addEventListener('loadedmetadata', () => { audio.currentTime = L.pos || 0; }, { once: true });
}, 1500);
})();