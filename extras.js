/* extras.js — dream.player : playlists, file d'attente, réglages, données (à charger APRÈS premium.js) */
let PL = LS('dp_pl', {}), H = LS('dp_hist', {}), Q = [];
window.DP = { PL: () => PL, save: () => savePL(), Q: () => Q };
(() => {
const $ = s => document.querySelector(s);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const root = document.documentElement.style;
let PL = LS('dp_pl', {}), H = LS('dp_hist', {}), Q = [];
const CF = Object.assign({ mode: '', fi: .6, anim: true, acc: '', notif: false }, LS('dp_set', {}));

/* ---------- CSS ---------- */
const css = document.createElement('style');
css.textContent = `
#toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translate(-50%,20px);background:rgba(20,16,34,.92);color:#fff;padding:11px 18px;border-radius:14px;border:1px solid var(--line);font:500 13px 'Inter',sans-serif;opacity:0;pointer-events:none;transition:.3s;z-index:200;max-width:86vw;text-align:center}
#toast.on{opacity:1;transform:translate(-50%,0)}
.sheet{position:fixed;inset:0;z-index:150;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}
.sheet .sh{width:100%;max-width:440px;background:#15111f;border:1px solid var(--line);border-radius:22px 22px 0 0;padding:16px 14px calc(16px + env(safe-area-inset-bottom));animation:up .25s ease;max-height:80vh;overflow-y:auto}
@keyframes up{from{transform:translateY(40px);opacity:0}}
.sheet h4{font:600 14px 'Inter',sans-serif;color:var(--mut);margin:0 6px 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sheet button{display:block;width:100%;text-align:left;background:none;border:0;color:#fff;font:500 15px 'Inter',sans-serif;padding:14px 8px;border-radius:10px}
.sheet button:active{background:rgba(255,255,255,.08)}
.sheet button.d{color:#ff7a90}
select{background:rgba(255,255,255,.07);color:#fff;border:1px solid var(--line);border-radius:12px;padding:10px;font:400 14px 'Inter',sans-serif;min-width:0}
select option{background:#15111f}
input[type=color]{width:44px;height:34px;border:0;background:none;padding:0}
.tb{display:flex;gap:8px;margin-bottom:8px}.tb select{flex:1}
.m{font-size:18px;padding:0 6px;opacity:.7}
body.noanim *{animation:none!important;transition:none!important}
body::after{opacity:calc(.14*var(--fi,.6))}
body.m-vhs::before{display:block;content:"";position:fixed;inset:0;pointer-events:none;z-index:98;background:repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 2px,transparent 2px 4px);opacity:var(--fi,.6)}
body.m-vhs .now,body.m-vhs .tab.active{text-shadow:1.5px 0 rgba(255,0,80,.6),-1.5px 0 rgba(0,200,255,.6)}
body.m-mono .player,body.m-mono #bgb{filter:grayscale(1) contrast(1.05)}
body.m-lim .player,body.m-lim #bgb{filter:sepia(.45) saturate(.7) brightness(1.05) hue-rotate(-15deg)}`;
document.head.appendChild(css);

/* ---------- Outils ---------- */
let tt;
const toast = m => {
  let e = $('#toast');
  if (!e) { e = document.createElement('div'); e.id = 'toast'; document.body.appendChild(e); }
  e.textContent = m; e.classList.add('on');
  clearTimeout(tt); tt = setTimeout(() => e.classList.remove('on'), 2400);
};
const fp = e => e.style.setProperty('--p', ((e.value - e.min) / (e.max - e.min) * 100) + '%');
const R = new Promise((ok, ko) => {
  const r = indexedDB.open('dreamplayer', 1);
  r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('t')) r.result.createObjectStore('t', { keyPath: 'id' }); };
  r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
});
const favSave = t => R.then(d => {
  const s = d.transaction('t', 'readwrite').objectStore('t'), g = s.get(t.id);
  g.onsuccess = () => { if (g.result) { g.result.fav = !!t.fav; s.put(g.result); } };
}).catch(() => {});
const toggleFav = t => { t.fav = !t.fav; favSave(t); };
const savePL = () => SS('dp_pl', PL);

/* ---------- Menu en feuille ---------- */
function sheet(title, items) {
  const o = document.createElement('div');
  o.className = 'sheet';
  o.innerHTML = '<div class="sh"><h4></h4></div>';
  o.querySelector('h4').textContent = title;
  items.forEach(([label, fn, danger]) => {
    const b = document.createElement('button');
    b.textContent = label; if (danger) b.className = 'd';
    b.onclick = () => { o.remove(); fn(); };
    o.firstChild.appendChild(b);
  });
  o.onclick = e => { if (e.target === o) o.remove(); };
  document.body.appendChild(o);
}
const newPl = t => {
  const n = (prompt('Nom de la playlist') || '').trim();
  if (!n) return;
  PL[n] = PL[n] || [];
  if (t && !PL[n].includes(t.id)) PL[n].push(t.id);
  savePL(); fillView(t ? undefined : 'pl:' + n); renderList();
  if (t) toast('Ajouté à ' + n);
};
const addTo = t => sheet('Ajouter à…', [
  ...Object.keys(PL).map(n => [n, () => { if (!PL[n].includes(t.id)) PL[n].push(t.id); savePL(); toast('Ajouté à ' + n); }]),
  ['+ Nouvelle playlist', () => newPl(t)]
]);
const mv = (pn, t, d) => {
  const a = PL[pn], k = a.indexOf(t.id), j = k + d;
  if (k < 0 || j < 0 || j >= a.length) return;
  [a[k], a[j]] = [a[j], a[k]]; savePL(); renderList();
};
const share = t => {
  if (navigator.share) navigator.share({ text: t.name }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(t.name).then(() => toast('Copié'));
  else toast(t.name);
};
function menu(t, i) {
  const v = $('#vsel').value, pn = v.startsWith('pl:') ? v.slice(3) : null, n = (H[t.id] || {}).n || 0;
  const it = [
    ['Lire ensuite', () => { Q.unshift(t.id); toast('Lu ensuite'); }],
    ['Ajouter à la file', () => { Q.push(t.id); toast('Dans la file (' + Q.length + ')'); }],
    ['Ajouter à une playlist…', () => addTo(t)],
    ['Partager / copier', () => share(t)]
  ];
  if (pn) it.push(['Monter dans la playlist', () => mv(pn, t, -1)], ['Descendre dans la playlist', () => mv(pn, t, 1)],
    ['Retirer de la playlist', () => { PL[pn] = PL[pn].filter(x => x !== t.id); savePL(); renderList(); }, 1]);
  it.push(['Supprimer de la bibliothèque', () => removeTrack(i), 1]);
  sheet(t.name + (n ? ' · ' + n + ' lecture' + (n > 1 ? 's' : '') : ''), it);
}

/* ---------- Barre bibliothèque ---------- */
$('.srch').insertAdjacentHTML('beforebegin', `
<div class="tb"><select id="vsel"></select>
<select id="ssel"><option value="add">Ordre d'ajout</option><option value="title">Titre A–Z</option><option value="artist">Artiste A–Z</option></select></div>
<div class="presets"><button class="btn" id="plnew">+ PLAYLIST</button><button class="btn" id="plren">RENOMMER</button><button class="btn" id="pldel">SUPPR.</button><button class="btn" id="qclr">VIDER LA FILE</button></div>`);
function fillView(sel) {
  const s = $('#vsel'), v = sel || s.value || 'all';
  s.innerHTML = '';
  [['all', 'Toute la bibliothèque'], ['rec', 'Récemment jouées'], ['new', 'Ajoutées récemment'], ...Object.keys(PL).map(n => ['pl:' + n, '♪ ' + n])]
    .forEach(([val, txt]) => s.add(new Option(txt, val)));
  s.value = [...s.options].some(o => o.value === v) ? v : 'all';
  $('#plren').style.display = $('#pldel').style.display = s.value.startsWith('pl:') ? '' : 'none';
}
$('#vsel').onchange = () => { fillView(); renderList(); };
$('#ssel').onchange = () => renderList();
$('#plnew').onclick = () => newPl();
$('#plren').onclick = () => {
  const o = $('#vsel').value.slice(3), n = (prompt('Nouveau nom', o) || '').trim();
  if (!n || n === o || PL[n]) return;
  PL[n] = PL[o]; delete PL[o]; savePL(); fillView('pl:' + n); renderList();
};
$('#pldel').onclick = () => {
  const o = $('#vsel').value.slice(3);
  if (!confirm('Supprimer la playlist « ' + o + ' » ?')) return;
  delete PL[o]; savePL(); fillView('all'); renderList();
};
$('#qclr').onclick = () => { Q = []; toast("File d'attente vidée"); };

/* ---------- Liste (remplace la précédente) ---------- */
const fz = (s, q) => { if (s.includes(q)) return true; let j = 0; for (const ch of s) if (ch === q[j] && ++j === q.length) return true; return !q.length; };
renderList = () => {
  const l = $('#list'), q = ($('#q').value || '').toLowerCase().trim(), fo = $('#favf').classList.contains('on');
  const v = $('#vsel').value, s = $('#ssel').value;
  let rows = tracks.map((t, i) => [t, i]);
  if (v === 'rec') rows = rows.filter(r => H[r[0].id]).sort((a, b) => H[b[0].id].t - H[a[0].id].t);
  else if (v === 'new') rows.sort((a, b) => b[0].added - a[0].added);
  else if (v.startsWith('pl:')) rows = (PL[v.slice(3)] || []).map(id => rows.find(r => r[0].id === id)).filter(Boolean);
  else if (s === 'title') rows.sort((a, b) => a[0].title.localeCompare(b[0].title));
  else if (s === 'artist') rows.sort((a, b) => (a[0].artist || '').localeCompare(b[0].artist || ''));
  if (fo) rows = rows.filter(r => r[0].fav);
  if (q) rows = rows.filter(r => fz(r[0].name.toLowerCase(), q));
  if (!rows.length) { l.innerHTML = '<div class="empty">' + (q ? 'Aucun résultat' : fo ? 'Aucun favori' : 'Rien ici pour le moment') + '</div>'; return; }
  l.innerHTML = '';
  rows.forEach(([t, i]) => {
    const d = document.createElement('div');
    d.className = 'track' + (i === idx ? ' cur' : '');
    d.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t"></span><span class="h">${t.fav ? '♥' : '♡'}</span><span class="m">⋯</span>`;
    d.querySelector('.t').textContent = t.name;
    d.onclick = () => load(i, true);
    d.querySelector('.h').onclick = e => { e.stopPropagation(); toggleFav(t); renderList(); };
    d.querySelector('.m').onclick = e => { e.stopPropagation(); menu(t, i); };
    l.appendChild(d);
  });
};

/* ---------- File d'attente, historique, notifications ---------- */
const _n = next;
next = a => {
  while (Q.length) { const i = tracks.findIndex(x => x.id === Q.shift()); if (i >= 0) return load(i, true); }
  _n(a);
};
const _ld = load;
load = (i, a) => {
  _ld(i, a);
  const t = tracks[i];
  if (a) {
    H[t.id] = { n: ((H[t.id] || {}).n || 0) + 1, t: Date.now() }; SS('dp_hist', H);
    if ($('#vsel').value === 'rec') renderList();
    if (CF.notif && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(t.title, { body: t.artist || '', icon: t.cover || 'icon-192.png', silent: true }); } catch {}
    }
  }
};

/* ---------- Erreurs propres ---------- */
play = () => {
  initAudioCtx();
  audio.play().catch(e => { if (e.name !== 'AbortError') toast(e.name === 'NotAllowedError' ? 'Touche ▶ pour lancer la lecture' : 'Lecture impossible'); });
};
let fails = 0;
audio.addEventListener('playing', () => { fails = 0; });
audio.addEventListener('error', () => {
  if (!audio.getAttribute('src')) return;
  toast('Fichier illisible ou format non supporté');
  if (tracks.length > 1 && ++fails < 3) setTimeout(() => next(true), 900);
});
const _af = addFiles;
addFiles = fs => {
  const bad = [...fs].filter(f => !f.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f.name));
  if (bad.length) toast(bad.length + ' fichier(s) ignoré(s) : format non supporté');
  return _af(fs);
};

/* ---------- Volume, muet, clavier ---------- */
const vol = d => { const v = $('#vol'); v.value = Math.min(1, Math.max(0, +v.value + d)); v.dispatchEvent(new Event('input')); };
let pv = null;
const mute = () => {
  const v = $('#vol');
  if (pv === null) { pv = v.value; v.value = 0; } else { v.value = pv; pv = null; }
  v.dispatchEvent(new Event('input')); toast(pv === null ? 'Son activé' : 'Muet');
};
$('.vol span').onclick = mute;
$('.screen').addEventListener('wheel', e => { e.preventDefault(); vol(-Math.sign(e.deltaY) * .05); }, { passive: false });
document.addEventListener('keydown', e => {
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.metaKey || e.ctrlKey) return;
  const k = e.key.toLowerCase();
  if (k === 'n') next(false); else if (k === 'p') prev(); else if (k === 'm') mute();
  else if (k === 's') $('#shuffle').click(); else if (k === 'r') $('#repeat').click();
  else if (k === 'arrowup') { e.preventDefault(); vol(.05); } else if (k === 'arrowdown') { e.preventDefault(); vol(-.05); }
  else if (k === 'f' && tracks[idx]) { toggleFav(tracks[idx]); renderList(); toast(tracks[idx].fav ? '♥ Favori' : 'Retiré des favoris'); }
});
$('#cover').addEventListener('dblclick', () => toast("~ le temps s'est arrêté ici ~"));

/* ---------- Réglages (onglet Réglages) ---------- */
$('#view-fx').insertAdjacentHTML('beforeend', `
<h3>EFFETS</h3>
<label><b>Mode</b><select id="mode"><option value="">Normal</option><option value="vhs">VHS</option><option value="mono">Monochrome</option><option value="lim">Liminal</option></select></label>
<label><b>Intensité</b><input type="range" id="fxi" min="0" max="1" step=".05"><i id="fxiv"></i></label>
<label><b>Animations</b><input type="checkbox" id="anim"></label>
<label><b>Accent</b><input type="color" id="acc" value="#b79cff"><button class="btn" id="accr">AUTO</button></label>
<label><b>Notifications</b><input type="checkbox" id="notif"></label>
<h3>DONNÉES</h3>
<div class="presets"><button class="btn" id="dexp">EXPORTER</button><button class="btn" id="dimp">IMPORTER</button><button class="btn" id="dclr">TOUT EFFACER</button></div>
<p class="hint">Tout reste sur cet appareil : tes fichiers sont dans le navigateur, tes réglages en local. Rien n'est envoyé sur un serveur (sauf Spotify si tu l'utilises). L'export contient playlists, favoris et réglages, pas les fichiers audio.</p>
<h3>AUTRE</h3>
<div class="presets"><button class="btn" id="fs">PLEIN ÉCRAN</button></div>
<p class="hint">Raccourcis : Espace lecture · ←/→ ±5 s · ↑/↓ volume · N/P suivant/précédent · M muet · S aléatoire · R répéter · F favori.</p>
<input type="file" id="dfile" accept=".json" hidden>`);
const applyCF = () => {
  SS('dp_set', CF);
  ['vhs', 'mono', 'lim'].forEach(m => document.body.classList.toggle('m-' + m, CF.mode === m));
  document.body.classList.toggle('noanim', !CF.anim);
  root.setProperty('--fi', CF.fi);
  CF.acc ? root.setProperty('--accent', CF.acc) : root.removeProperty('--accent');
  $('#fxiv').textContent = Math.round(CF.fi * 100) + '%';
  fp($('#fxi'));
};
$('#mode').value = CF.mode; $('#fxi').value = CF.fi; $('#anim').checked = CF.anim; $('#notif').checked = CF.notif;
if (CF.acc) $('#acc').value = CF.acc;
$('#mode').onchange = e => { CF.mode = e.target.value; applyCF(); };
$('#fxi').oninput = e => { CF.fi = +e.target.value; applyCF(); };
$('#anim').onchange = e => { CF.anim = e.target.checked; applyCF(); };
$('#acc').oninput = e => { CF.acc = e.target.value; applyCF(); };
$('#accr').onclick = () => { CF.acc = ''; applyCF(); };
$('#notif').onchange = async e => {
  if (!e.target.checked) { CF.notif = false; return applyCF(); }
  const p = 'Notification' in window ? await Notification.requestPermission() : 'denied';
  CF.notif = p === 'granted'; e.target.checked = CF.notif;
  if (!CF.notif) toast('Notifications non autorisées sur ce navigateur');
  applyCF();
};
$('#fs').onclick = () => {
  const e = document.documentElement, f = e.requestFullscreen || e.webkitRequestFullscreen;
  f ? f.call(e) : toast("Plein écran indisponible ici (ajoute l'appli à l'écran d'accueil)");
};

/* ---------- Export / import / effacement ---------- */
const KEYS = ['dp_fx', 'dp_theme', 'dp_vm', 'dp_vol', 'dp_pl', 'dp_hist', 'dp_set'];
$('#dexp').onclick = () => {
  const o = { v: 1, ls: {}, favs: tracks.filter(t => t.fav).map(t => t.id) };
  KEYS.forEach(k => { const x = localStorage.getItem(k); if (x !== null) o.ls[k] = x; });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(o)], { type: 'application/json' }));
  a.download = 'dream-player-donnees.json'; a.click();
  toast('Export prêt');
};
$('#dimp').onclick = () => $('#dfile').click();
$('#dfile').onchange = async e => {
  try {
    const o = JSON.parse(await e.target.files[0].text());
    Object.entries(o.ls || {}).forEach(([k, v]) => KEYS.includes(k) && localStorage.setItem(k, v));
    (o.favs || []).forEach(id => { const t = tracks.find(x => x.id === id); if (t) { t.fav = true; favSave(t); } });
    toast('Données importées'); setTimeout(() => location.reload(), 900);
  } catch { toast('Fichier invalide'); }
  e.target.value = '';
};
$('#dclr').onclick = async () => {
  if (!confirm('Effacer tous tes morceaux, playlists et réglages sur cet appareil ?')) return;
  try {
    const d = await R;
    await new Promise(ok => { const q = d.transaction('t', 'readwrite').objectStore('t').clear(); q.onsuccess = q.onerror = ok; });
  } catch {}
  localStorage.clear(); location.reload();
};

/* ---------- Démarrage ---------- */
fillView('all'); applyCF(); renderList();
})();