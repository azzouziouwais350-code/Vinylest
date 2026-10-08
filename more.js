/* more.js — dream.player : albums, artistes, grille, paroles, listes auto (à charger APRÈS extras.js) */
(() => {
const $ = s => document.querySelector(s);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
let GQ = [], grp = null, GM = LS('dp_grid', false), LY = [], LP = '';
const PH = 'data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><rect width='10' height='10' fill='#2a2150'/><circle cx='5' cy='5' r='2' fill='#b79cff'/></svg>");

/* ---------- CSS ---------- */
const css = document.createElement('style');
css.textContent = `
#lyr{order:1;text-align:center;font:500 13px 'Inter',sans-serif;color:var(--accent);min-height:18px;margin:2px 0 4px;cursor:pointer}
#list.gridv{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px;padding:10px;max-height:360px}
#list.gridv .track{flex-direction:column;align-items:stretch;gap:6px;border:1px solid var(--line);border-radius:14px;padding:8px}
#list.gridv .track .n{display:none}
#list.gridv .track img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px}
#list.gridv .track .t{white-space:normal;font-size:12px}
#list.gridv .track small{font-size:11px;color:var(--mut)}
.ghead{display:flex;gap:12px;align-items:center;padding:12px}
.ghead img{width:72px;height:72px;border-radius:12px;object-fit:cover}
.ghead b{display:block;font:600 16px 'Inter',sans-serif}
.ghead small{color:var(--mut);font-size:12px}
.gbar{display:flex;gap:8px;padding:0 12px 10px;flex-wrap:wrap}
.gbar button{background:rgba(255,255,255,.1);border:0;color:#fff;border-radius:10px;padding:9px 12px;font:600 12px 'Inter',sans-serif}
.sh pre{white-space:pre-wrap;font:15px/1.6 'Inter',sans-serif;color:#fff;margin:0 6px}`;
document.head.appendChild(css);

let tt;
const say = m => {
  let e = $('#toast');
  if (!e) { e = document.createElement('div'); e.id = 'toast'; document.body.appendChild(e); }
  e.textContent = m; e.classList.add('on');
  clearTimeout(tt); tt = setTimeout(() => e.classList.remove('on'), 2400);
};

/* ---------- Album + année (tags ID3) ---------- */
async function meta(f) {
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
      if (id === 'TALB') o.album = dec(d);
      else if (id === 'TYER' || id === 'TDRC') o.year = dec(d).slice(0, 4);
      p += 10 + fs;
    }
    return o;
  } catch { return {}; }
}
let busy = false;
async function enrich() {
  if (busy) return; busy = true;
  let ch = false;
  for (const t of [...tracks]) if (!t._m) { t._m = 1; const m = await meta(t.blob); t.alb = m.album || ''; t.yr = m.year || ''; ch = true; }
  busy = false;
  if (ch && /^(albums|artists)$/.test($('#vsel').value)) renderList();
}

/* ---------- Lecture d'une liste ---------- */
function playList(list, sh) {
  list = [...list];
  if (sh) list.sort(() => Math.random() - .5);
  const i = tracks.findIndex(t => t.id === list[0].id);
  GQ = list.slice(1).map(t => t.id);
  load(i, true);
}
const _n = next;
next = a => {
  while (GQ.length) { const i = tracks.findIndex(x => x.id === GQ.shift()); if (i >= 0) return load(i, true); }
  _n(a);
};
$('#list').addEventListener('click', () => { if (!/^(albums|artists|top|never)$/.test($('#vsel').value)) GQ = []; }, true);

/* ---------- Vues Albums / Artistes / listes auto ---------- */
const addOpts = () => {
  const s = $('#vsel');
  if ([...s.options].some(o => o.value === 'albums')) return;
  const cur = s.value;
  [['albums', 'Albums'], ['artists', 'Artistes'], ['top', 'Les plus écoutées'], ['never', 'Jamais écoutées']].forEach(([v, t]) => s.add(new Option(t, v)));
  s.value = cur;
};
new MutationObserver(addOpts).observe($('#vsel'), { childList: true });
addOpts();
$('#vsel').onchange = () => {
  grp = null;
  $('#plren').style.display = $('#pldel').style.display = $('#vsel').value.startsWith('pl:') ? '' : 'none';
  renderList();
};
const groups = v => {
  const m = new Map();
  tracks.forEach(t => {
    const k = v === 'albums' ? (t.alb || 'Sans album') : (t.artist || 'Artiste inconnu');
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(t);
  });
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
};
function simpleRows(list, l) {
  list.forEach((t, k) => {
    const d = document.createElement('div');
    d.className = 'track' + (tracks[idx] === t ? ' cur' : '');
    d.innerHTML = '<span class="n"></span><span class="t"></span>';
    d.children[0].textContent = String(k + 1).padStart(2, '0');
    d.children[1].textContent = t.name;
    d.onclick = () => playList(list.slice(k), false);
    l.appendChild(d);
  });
}
function thumbs(l) {
  l.querySelectorAll('.track').forEach(r => {
    const t = tracks.find(x => x.name === r.querySelector('.t').textContent), im = document.createElement('img');
    im.alt = ''; im.src = t && t.cover ? t.cover : PH;
    r.insertBefore(im, r.firstChild);
  });
}
const _rl = renderList;
renderList = () => {
  const l = $('#list'), v = $('#vsel').value, special = /^(albums|artists|top|never)$/.test(v);
  enrich();
  l.classList.toggle('gridv', special ? (v === 'albums' || v === 'artists') && !grp : GM);
  if (!special) { _rl(); if (GM) thumbs(l); return; }
  l.innerHTML = '';
  const empty = () => { l.innerHTML = '<div class="empty">Rien ici pour le moment</div>'; };
  if (v === 'top' || v === 'never') {
    const H = LS('dp_hist', {});
    const list = v === 'top' ? tracks.filter(t => H[t.id]).sort((a, b) => H[b.id].n - H[a.id].n) : tracks.filter(t => !H[t.id]);
    return list.length ? simpleRows(list, l) : empty();
  }
  const g = groups(v);
  if (!g.length) return empty();
  if (!grp) {
    g.forEach(([name, list]) => {
      const d = document.createElement('div'), t0 = list.find(t => t.cover);
      d.className = 'track';
      d.innerHTML = '<img alt=""><span class="t"></span><small></small>';
      d.querySelector('img').src = t0 ? t0.cover : PH;
      d.querySelector('.t').textContent = name;
      d.querySelector('small').textContent = list.length + ' titre' + (list.length > 1 ? 's' : '');
      d.onclick = () => { grp = name; renderList(); };
      l.appendChild(d);
    });
    return;
  }
  const cur = g.find(x => x[0] === grp);
  if (!cur) { grp = null; return renderList(); }
  const list = cur[1], t0 = list.find(t => t.cover), yr = list.map(t => t.yr).find(Boolean) || '';
  const h = document.createElement('div');
  h.className = 'ghead';
  h.innerHTML = '<img alt=""><div><b></b><small></small></div>';
  h.querySelector('img').src = t0 ? t0.cover : PH;
  h.querySelector('b').textContent = grp;
  h.querySelector('small').textContent = [v === 'albums' ? (list[0].artist || '') : '', yr, list.length + ' titre' + (list.length > 1 ? 's' : '')].filter(Boolean).join(' · ');
  l.appendChild(h);
  const bar = document.createElement('div');
  bar.className = 'gbar';
  [['← Retour', () => { grp = null; renderList(); }], ['▶ Tout lire', () => playList(list, false)], ['Aléatoire', () => playList(list, true)]].forEach(([n, f]) => {
    const b = document.createElement('button'); b.textContent = n; b.onclick = f; bar.appendChild(b);
  });
  l.appendChild(bar);
  simpleRows(list, l);
};

/* ---------- Grille + paroles : boutons ---------- */
$('#qclr').insertAdjacentHTML('afterend', '<button class="btn" id="gridb"></button><button class="btn" id="lrcb">PAROLES</button><input type="file" id="lrcf" accept=".lrc,.txt" hidden>');
const gb = () => { $('#gridb').textContent = GM ? 'LISTE' : 'GRILLE'; };
$('#gridb').onclick = () => { GM = !GM; try { localStorage.setItem('dp_grid', JSON.stringify(GM)); } catch {} gb(); renderList(); };
gb();

/* ---------- Paroles (.lrc ou texte) ---------- */
$('#now').insertAdjacentHTML('afterend', '<div id="lyr"></div>');
const parseL = s => {
  const out = []; let any = false;
  s.split(/\r?\n/).forEach(ln => {
    const m = ln.match(/^((?:\[\d+:\d+(?:[.:]\d+)?\])+)(.*)$/);
    if (!m) return;
    any = true;
    [...m[1].matchAll(/\[(\d+):(\d+)(?:[.:](\d+))?\]/g)].forEach(x => out.push({ t: +x[1] * 60 + +x[2] + (x[3] ? +('0.' + x[3]) : 0), s: m[2].trim() }));
  });
  return any ? out.sort((a, b) => a.t - b.t) : [];
};
function setLy(t) {
  LY = []; LP = ''; $('#lyr').textContent = '';
  if (!t) return;
  const raw = localStorage.getItem('dp_lrc_' + t.id);
  if (!raw) return;
  LY = parseL(raw);
  LP = LY.length ? LY.map(x => x.s).join('\n') : raw;
  if (!LY.length) $('#lyr').textContent = '♪ paroles (touche pour lire)';
}
audio.addEventListener('timeupdate', () => {
  if (!LY.length) return;
  let s = '';
  for (const x of LY) { if (x.t <= audio.currentTime) s = x.s; else break; }
  if ($('#lyr').textContent !== s) $('#lyr').textContent = s;
});
const _ld = load;
load = (i, a) => { _ld(i, a); setLy(tracks[i]); };
$('#lrcb').onclick = () => { if (idx < 0) return say("Choisis d'abord un morceau"); $('#lrcf').click(); };
$('#lrcf').onchange = async e => {
  const f = e.target.files[0];
  if (f && tracks[idx]) {
    try { localStorage.setItem('dp_lrc_' + tracks[idx].id, await f.text()); setLy(tracks[idx]); say('Paroles ajoutées'); }
    catch { say('Impossible de lire ce fichier'); }
  }
  e.target.value = '';
};
$('#lyr').onclick = () => {
  if (!LP) return;
  const o = document.createElement('div');
  o.className = 'sheet';
  o.innerHTML = '<div class="sh"><h4></h4><pre></pre></div>';
  o.querySelector('h4').textContent = tracks[idx] ? tracks[idx].name : '';
  o.querySelector('pre').textContent = LP;
  o.onclick = e => { if (e.target === o) o.remove(); };
  document.body.appendChild(o);
};

renderList();
})();