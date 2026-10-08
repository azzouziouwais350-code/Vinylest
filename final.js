/* final.js — dream.player : aléatoire intelligent, glisser-déposer, préchargement, intro (APRÈS more.js) */
(() => {
const $ = s => document.querySelector(s);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

/* ---------- CSS ---------- */
const css = document.createElement('style');
css.textContent = `
#splash{position:fixed;inset:0;z-index:300;background:#07060d;display:grid;place-items:center;animation:spl 1.7s ease forwards}
#splash div{font:600 20px 'Inter',sans-serif;letter-spacing:.35em;color:#fff;text-shadow:0 0 30px var(--accent)}
@keyframes spl{0%,65%{opacity:1}100%{opacity:0}}
.player{animation:rise .9s .25s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(18px) scale(.98)}}
.now.tin{animation:tin .6s ease both}
@keyframes tin{from{opacity:0;transform:translateY(8px)}}
#clk{display:flex;justify-content:space-between;font:600 10px 'Inter',sans-serif;letter-spacing:.2em;color:var(--mut);margin:0 6px 10px}
.dh{padding:0 8px;font-size:20px;opacity:.6;cursor:grab;touch-action:none}
.track.drag{position:relative;z-index:2;background:rgba(255,255,255,.18);box-shadow:0 8px 24px rgba(0,0,0,.5)}`;
document.head.appendChild(css);

/* ---------- Intro animée + horloge ---------- */
document.body.insertAdjacentHTML('afterbegin', '<div id="splash"><div>dream.player</div></div>');
setTimeout(() => { const s = $('#splash'); if (s) s.remove(); }, 1800);
$('.tabs').insertAdjacentHTML('beforebegin', '<div id="clk"><span>DREAM.PLAYER</span><span id="clkt"></span></div>');
const tick = () => { $('#clkt').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
tick(); setInterval(tick, 20000);

/* ---------- Préchargement + animation du titre ---------- */
const RH = [];
const PRE = new Audio();
PRE.preload = 'auto'; PRE.muted = true;
const _ld = load;
load = (i, a) => {
  _ld(i, a);
  const t = tracks[i];
  if (!t) return;
  RH.push(t.id); if (RH.length > 30) RH.shift();
  const n = $('#now'); n.classList.remove('tin'); void n.offsetWidth; n.classList.add('tin');
  const nx = tracks[i + 1];
  if (!shuffle && nx && nx.url) PRE.src = nx.url;
};

/* ---------- Aléatoire intelligent ---------- */
function pick() {
  const H = LS('dp_hist', {}), avoid = new Set(RH.slice(-Math.min(10, tracks.length - 1)));
  let tot = 0;
  const w = tracks.map((t, i) => {
    if (i === idx || avoid.has(t.id)) return 0;
    const n = (H[t.id] || {}).n || 0;
    const x = (t.fav ? 2 : 1) * (n ? 1 / (1 + n * .3) : 1.5);
    tot += x; return x;
  });
  if (!tot) return -1;
  let r = Math.random() * tot;
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0 && w[i]) return i; }
  return w.findIndex(x => x > 0);
}
const _nx = next;
next = a => {
  if (shuffle && tracks.length > 2 && !(a && repeat === 2)) {
    const p = pick();
    if (p >= 0) {
      shuffle = false; idx = p - 1;
      try { _nx(a); } finally { shuffle = true; }
      return;
    }
  }
  _nx(a);
};

/* ---------- Glisser-déposer dans les playlists ---------- */
const _rl = renderList;
renderList = () => {
  _rl();
  const v = $('#vsel').value;
  if (!v.startsWith('pl:') || !window.DP || $('#q').value || $('#favf').classList.contains('on')) return;
  const l = $('#list'), arr = window.DP.PL()[v.slice(3)];
  if (!arr) return;
  const ids = arr.filter(id => tracks.some(t => t.id === id));
  [...l.querySelectorAll('.track')].forEach((r, k) => {
    if (k >= ids.length) return;
    const h = document.createElement('span');
    h.className = 'dh'; h.textContent = '≡';
    h.onclick = e => e.stopPropagation();
    h.onpointerdown = e => {
      e.preventDefault(); e.stopPropagation();
      h.setPointerCapture(e.pointerId); r.classList.add('drag');
      const y0 = e.clientY; let to = k;
      h.onpointermove = ev => {
        r.style.transform = `translateY(${ev.clientY - y0}px)`;
        const rows = [...l.querySelectorAll('.track')];
        to = rows.findIndex((x, j) => j !== k && ev.clientY < x.getBoundingClientRect().top + x.offsetHeight / 2);
        if (to < 0) to = rows.length;
      };
      h.onpointerup = h.onpointercancel = () => {
        h.onpointermove = h.onpointerup = h.onpointercancel = null;
        r.classList.remove('drag'); r.style.transform = '';
        const ins = to > k ? to - 1 : to;
        if (ins !== k) {
          const [m] = ids.splice(k, 1); ids.splice(ins, 0, m);
          arr.splice(0, arr.length, ...ids); window.DP.save();
        }
        renderList();
      };
    };
    r.appendChild(h);
  });
};
renderList();
})();