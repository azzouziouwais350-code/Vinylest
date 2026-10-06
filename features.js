/* features.js — dream.player : fonctions en plus (se charge après script.js) */
(() => {
const $ = s => document.querySelector(s);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/* ---------- CSS en plus ---------- */
const st = document.createElement('style');
st.textContent = `
.noscan::after{display:none}
.cover{display:none;width:72px;height:72px;margin:10px auto 0;border:3px solid var(--white);object-fit:cover}
.srch{display:flex;gap:6px;margin-bottom:8px}
.srch input{flex:1;min-width:0;background:var(--dark);color:var(--white);border:3px solid var(--white);padding:8px;font:20px 'VT323',monospace;outline:none;border-radius:0}
.srch .btn{height:auto;min-width:44px;font-size:12px}
.h{font-size:16px;padding:0 4px;color:var(--pink)}
.track.cur .h{color:var(--dark)}
.fx h3{font:9px 'Press Start 2P',monospace;color:var(--yellow);margin:16px 0 8px}
.fx label{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:19px}
.fx label b{width:92px;font-weight:400;flex:none}
.fx label i{width:48px;font-style:normal;text-align:right;color:var(--cyan);flex:none}
.fx input[type=range]{flex:1;min-width:0;width:auto}
.fx .presets{margin-bottom:4px}`;
document.head.appendChild(st);

/* ---------- Base de données (IndexedDB) ---------- */
const DB = new Promise((ok, ko) => {
  const r = indexedDB.open('dreamplayer', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('t', { keyPath: 'id' });
  r.onsuccess = () => ok(r.result);
  r.onerror = () => ko(r.error);
});
const db = (m, f) => DB.then(d => new Promise((ok, ko) => {
  const q = f(d.transaction('t', m).objectStore('t'));
  q.onsuccess = () => ok(q.result);
  q.onerror = () => ko(q.error);
}));
const put = t => db('readwrite', s => s.put({ id: t.id, file: t.blob, fb: t.fb, fav: !!t.fav, added: t.added }));

/* ---------- Tags ID3 (titre, artiste, pochette) ---------- */
async function id3(f) {
  try {
    const b = new Uint8Array(await f.slice(0, 400000).arrayBuffer()), o = {};
    if (b[0] !== 73 || b[1] !== 68 || b[2] !== 51) return o;
    const v = b[3], end = Math.min(((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]) + 10, b.length);
    const dec = a => new TextDecoder(a[0] === 1 || a[0] === 2 ? 'utf-16' : a[0] === 3 ? 'utf-8' : 'iso-8859-1').decode(a.slice(1)).replace(/\0/g, '');
    for (let p = 10; p + 10 < end;) {
      const id = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]);
      const fs = v === 4 ? (b[p + 4] << 21) | (b[p + 5] << 14) | (b[p + 6] << 7) | b[p + 7]
                         : ((b[p + 4] << 24) | (b[p + 5] << 16) | (b[p + 6] << 8) | b[p + 7]) >>> 0;
      if (!fs || !/^[A-Z0-9]{4}$/.test(id)) break;
      const d = b.slice(p + 10, p + 10 + fs);
      if (id === 'TIT2') o.title = dec(d);
      else if (id === 'TPE1') o.artist = dec(d);
      else if (id === 'APIC' && !o.cover) {
        let i = 1; while (d[i]) i++; i += 2;
        if (d[0] === 1 || d[0] === 2) { while (i < d.length && (d[i] || d[i + 1])) i += 2; i += 2; }
        else { while (d[i]) i++; i++; }
        if (i < d.length) o.cover = URL.createObjectURL(new Blob([d.slice(i)], { type: 'image/jpeg' }));
      }
      p += 10 + fs;
    }
    return o;
  } catch { return {}; }
}
async function mk(blob, o) {
  const m = await id3(blob), title = m.title || o.fb, artist = m.artist || '';
  return { id: o.id, blob, fb: o.fb, title, artist, name: artist ? artist + ' – ' + title : title,
           url: URL.createObjectURL(blob), cover: m.cover, fav: o.fav, added: o.added };
}

/* ---------- Import (remplace celui de script.js) ---------- */
addFiles = async files => {
  for (const f of [...files]) {
    if (!f.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f.name)) continue;
    const t = await mk(f, { id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), fb: clean(f.name), fav: false, added: Date.now() });
    tracks.push(t); put(t);
  }
  renderList();
  if (idx === -1 && tracks.length) load(0, false);
};

/* ---------- Pochette + suppression ---------- */
$('#now').insertAdjacentHTML('beforebegin', '<img id="cover" class="cover" alt="">');
const _load = load;
load = (i, a) => {
  _load(i, a);
  const t = tracks[i], im = $('#cover');
  if (t.cover) { im.src = t.cover; im.style.display = 'block'; } else im.style.display = 'none';
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title, artist: t.artist || 'dream.player', artwork: t.cover ? [{ src: t.cover }] : []
  });
};
const _rm = removeTrack;
removeTrack = i => {
  const t = tracks[i];
  _rm(i);
  if (t && t.id) db('readwrite', s => s.delete(t.id));
  if (idx === -1) $('#cover').style.display = 'none';
};

/* ---------- Recherche + favoris ---------- */
$('#list').insertAdjacentHTML('beforebegin',
  '<div class="srch"><input id="q" type="text" placeholder="Rechercher..." autocomplete="off"><button class="btn" id="favf" aria-label="Favoris">♥</button></div>');
let q = '', fo = false;
$('#q').oninput = e => { q = e.target.value.toLowerCase(); renderList(); };
$('#favf').onclick = e => { fo = !fo; e.currentTarget.classList.toggle('on', fo); renderList(); };
renderList = () => {
  const l = $('#list');
  const rows = tracks.map((t, i) => [t, i]).filter(([t]) => (!fo || t.fav) && t.name.toLowerCase().includes(q));
  if (!rows.length) { l.innerHTML = '<div class="empty">' + (tracks.length ? 'Aucun résultat' : 'Playlist vide...') + '</div>'; return; }
  l.innerHTML = '';
  rows.forEach(([t, i]) => {
    const d = document.createElement('div');
    d.className = 'track' + (i === idx ? ' cur' : '');
    d.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t"></span><span class="h">${t.fav ? '♥' : '♡'}</span><span class="x">X</span>`;
    d.querySelector('.t').textContent = t.name;
    d.onclick = () => load(i, true);
    d.querySelector('.h').onclick = e => { e.stopPropagation(); t.fav = !t.fav; put(t); renderList(); };
    d.querySelector('.x').onclick = e => { e.stopPropagation(); removeTrack(i); };
    l.appendChild(d);
  });
};

/* ---------- Effets audio : vitesse, réverb, égaliseur ---------- */
const S = Object.assign({ sp: 1, rv: 0, lo: 0, mi: 0, hi: 0, kp: false }, LS('dp_fx', {}));
const P = [
  { sp: 1, rv: 0, lo: 0, mi: 0, hi: 0 },
  { sp: .85, rv: .55, lo: 3, mi: 0, hi: -3 },
  { sp: 1.25, rv: .1, lo: 0, mi: 0, hi: 2 },
  { sp: 1, rv: 0, lo: 8, mi: 0, hi: -2 },
  { sp: 1, rv: .1, lo: -3, mi: 4, hi: 2 }
];
const fx = {};
const impulse = ctx => {
  const n = ctx.sampleRate * 2.8 | 0, b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let k = 0; k < 2; k++) { const d = b.getChannelData(k); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
  return b;
};
function apply() {
  SS('dp_fx', S);
  audio.defaultPlaybackRate = audio.playbackRate = S.sp;
  audio.preservesPitch = audio.webkitPreservesPitch = audio.mozPreservesPitch = S.kp;
  if (!fx.low) return;
  fx.low.gain.value = S.lo; fx.mid.gain.value = S.mi; fx.high.gain.value = S.hi;
  fx.dry.gain.value = 1 - S.rv * .4; fx.wet.gain.value = S.rv * 1.4;
}
initAudioCtx = () => {
  if (started) { if (actx.state === 'suspended') actx.resume(); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const src = actx.createMediaElementSource(audio);
    const f = (type, hz) => { const b = actx.createBiquadFilter(); b.type = type; b.frequency.value = hz; return b; };
    fx.low = f('lowshelf', 120); fx.mid = f('peaking', 1000); fx.high = f('highshelf', 6000);
    fx.dry = actx.createGain(); fx.wet = actx.createGain();
    fx.conv = actx.createConvolver(); fx.conv.buffer = impulse(actx);
    fx.master = actx.createGain(); fx.master.gain.value = +$('#vol').value;
    analyser = actx.createAnalyser(); analyser.fftSize = 128; analyser.smoothingTimeConstant = .75;
    data = new Uint8Array(analyser.frequencyBinCount);
    src.connect(fx.low); fx.low.connect(fx.mid); fx.mid.connect(fx.high);
    fx.high.connect(fx.dry); fx.high.connect(fx.conv); fx.conv.connect(fx.wet);
    fx.dry.connect(fx.master); fx.wet.connect(fx.master);
    fx.master.connect(analyser); analyser.connect(actx.destination);
    started = true; audio.volume = 1; apply();
  } catch (e) { console.warn(e); }
};
/* volume via Web Audio (le volume natif ne marche pas sur iPad) */
$('#vol').addEventListener('input', e => { audio.volume = 1; if (fx.master) fx.master.gain.value = +e.target.value; });

/* ---------- Thèmes ---------- */
let C = ['#7ff5ff', '#ff8fd8', '#fff29a'];
const TH = {
  dream:  ['#1a1033', '#3b1f6b', '#ff9ad5', '#ff8fd8', '#7ff5ff', '#fff29a', '#241447'],
  vapor:  ['#0b1033', '#1d3b8f', '#7ff5ff', '#c28bff', '#7ff5ff', '#ff8fd8', '#14204d'],
  ember:  ['#1f0a0a', '#6b1f1f', '#ffb36b', '#ff7a59', '#ffd36b', '#fff29a', '#3a1414'],
  matrix: ['#02130a', '#0b4a24', '#7dffb0', '#5dff8a', '#b6ffd0', '#e6ff9a', '#06260f']
};
const theme = n => {
  const T = TH[n] || TH.dream, r = document.documentElement.style;
  ['bg1', 'bg2', 'bg3', 'pink', 'cyan', 'yellow', 'panel'].forEach((k, i) => r.setProperty('--' + k, T[i]));
  document.body.style.background = `linear-gradient(180deg,${T[0]} 0%,${T[1]} 60%,${T[2]} 100%) fixed`;
  C = [T[4], T[3], T[5]];
  SS('dp_theme', n);
};

/* ---------- Onglet FX ---------- */
$('.tabs').insertAdjacentHTML('beforeend', '<button class="tab" id="tabfx">FX</button>');
$('.footer').insertAdjacentHTML('beforebegin', '<section class="view fx" id="view-fx"></section>');
const sl = (id, lab, min, max, step) => `<label><b>${lab}</b><input type="range" id="${id}" min="${min}" max="${max}" step="${step}"><i id="${id}v"></i></label>`;
const bt = (k, arr) => arr.map(([v, n]) => `<button class="btn" data-${k}="${v}">${n}</button>`).join('');
$('#view-fx').innerHTML = `
<h3>AMBIANCE</h3>
<div class="presets">${bt('p', [[0, 'NORMAL'], [1, 'SLOWED'], [2, 'SPED UP'], [3, 'BASS'], [4, 'VOCAL']])}</div>
${sl('sp', 'Vitesse', .5, 1.5, .01)}${sl('rv', 'Réverb', 0, 1, .01)}
<label><b>Hauteur fixe</b><input type="checkbox" id="kp"></label>
<h3>ÉGALISEUR</h3>${sl('lo', 'Graves', -12, 12, 1)}${sl('mi', 'Médiums', -12, 12, 1)}${sl('hi', 'Aigus', -12, 12, 1)}
<h3>MINUTEUR</h3>
<div class="presets">${bt('s', [[15, '15 MIN'], [30, '30 MIN'], [60, '60 MIN'], [0, 'OFF']])}</div>
<p class="hint" id="slst">Minuteur : off</p>
<h3>THÈME</h3>
<div class="presets">${bt('t', [['dream', 'DREAM'], ['vapor', 'VAPOR'], ['ember', 'EMBER'], ['matrix', 'MATRIX']])}</div>
<h3>AFFICHAGE</h3>
<label><b>Scanlines</b><input type="checkbox" id="scan"></label>
<p class="hint">Touche le visualiseur pour changer de mode.</p>`;

$('#tabfx').onclick = e => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
  e.currentTarget.classList.add('active');
  $('#view-fx').classList.add('active');
};
const ids = ['sp', 'rv', 'lo', 'mi', 'hi'];
const sync = () => {
  ids.forEach(k => {
    $('#' + k).value = S[k];
    $('#' + k + 'v').textContent = k === 'sp' ? S[k].toFixed(2) + 'x' : k === 'rv' ? Math.round(S[k] * 100) + '%' : S[k] + 'dB';
  });
  $('#kp').checked = S.kp;
};
ids.forEach(k => $('#' + k).oninput = e => { S[k] = +e.target.value; sync(); apply(); });
$('#kp').onchange = e => { S.kp = e.target.checked; apply(); };
document.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { Object.assign(S, P[b.dataset.p]); sync(); apply(); });
document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => theme(b.dataset.t));
$('#scan').checked = LS('dp_scan', true);
document.body.classList.toggle('noscan', !$('#scan').checked);
$('#scan').onchange = e => { SS('dp_scan', e.target.checked); document.body.classList.toggle('noscan', !e.target.checked); };

/* ---------- Minuteur de sommeil ---------- */
let tm;
const sleep = m => {
  clearTimeout(tm);
  $('#slst').textContent = m ? 'Minuteur : ' + m + ' min' : 'Minuteur : off';
  if (!m) return;
  tm = setTimeout(() => {
    const g = fx.master;
    if (g) { g.gain.setValueAtTime(g.gain.value, actx.currentTime); g.gain.linearRampToValueAtTime(0, actx.currentTime + 6); }
    setTimeout(() => { audio.pause(); if (g) g.gain.value = +$('#vol').value; $('#slst').textContent = 'Minuteur : off'; }, 6200);
  }, m * 60000);
};
document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => sleep(+b.dataset.s));

/* ---------- Visualiseur : 3 modes (barres / onde / miroir) ---------- */
let vm = LS('dp_vm', 0);
const wv = new Uint8Array(128);
cv.addEventListener('click', () => { vm = (vm + 1) % 3; SS('dp_vm', vm); });
draw = () => {
  requestAnimationFrame(draw); t++;
  c.fillStyle = '#0a0618'; c.fillRect(0, 0, 128, 48);
  const live = analyser && !audio.paused;
  if (vm === 1) {
    if (live) analyser.getByteTimeDomainData(wv);
    c.fillStyle = C[0];
    for (let x = 0; x < 128; x += 2) {
      const v = live ? (wv[x] - 128) / 128 : Math.sin(t / 20 + x / 9) * .1;
      c.fillRect(x, 22 + Math.round(v * 22), 3, 3);
    }
    return;
  }
  if (live) analyser.getByteFrequencyData(data);
  for (let i = 0; i < BARS; i++) {
    const tg = live ? Math.min(1, Math.pow(data[i] / 255, 1.4) * 1.5) : (Math.sin(t / 40 + i / 2.5) + 1) / 14;
    level[i] += (tg - level[i]) * .35;
    const h = Math.max(1, Math.round(level[i] * (vm ? ROWS / 2 : ROWS)));
    for (let j = 0; j < h; j++) {
      const k = vm === 2 ? j * 2 : j;
      c.fillStyle = C[k > 8 ? 2 : k > 4 ? 1 : 0];
      if (vm === 2) { c.fillRect(i * 4, 22 - j * 4, 3, 3); c.fillRect(i * 4, 23 + j * 4, 3, 3); }
      else c.fillRect(i * 4, 44 - j * 4, 3, 3);
    }
  }
};

/* ---------- Démarrage ---------- */
theme(LS('dp_theme', 'dream'));
sync(); apply();
(async () => {
  try {
    const recs = await db('readonly', s => s.getAll());
    recs.sort((a, b) => a.added - b.added);
    for (const r of recs) tracks.push(await mk(r.file, { id: r.id, fb: r.fb, fav: r.fav, added: r.added }));
    renderList();
    if (idx === -1 && tracks.length) load(0, false);
  } catch (e) { console.warn(e); }
})();
})();