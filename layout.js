/* layout.js — dream.player : mise en page PC, mode Y2K, volume de départ (APRÈS settings.js) */
(() => {
const $ = s => document.querySelector(s);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

/* ---------- CSS ---------- */
const css = document.createElement('style');
css.textContent = `
.colL,.colR{display:contents}
.track{content-visibility:auto;contain-intrinsic-size:auto 52px}
@media(min-width:1000px){
 body{align-items:center}
 .player{max-width:1080px;padding:26px 30px}
 #view-local.active{display:grid;grid-template-columns:340px 1fr;gap:34px;align-items:start}
 #view-local .colL,#view-local .colR{display:block}
 .colL{position:sticky;top:24px}
 #list,#list.gridv{max-height:62vh}
}
body.m-y2k{background:radial-gradient(900px 600px at 10% -10%,#ff9de2,transparent 60%),radial-gradient(800px 600px at 100% 100%,#8fb8ff,transparent 60%),#2a1b5e !important;--accent:#ff6ec7}
body.m-y2k .player{background:linear-gradient(160deg,rgba(255,255,255,.26),rgba(120,90,220,.38));border:2px solid rgba(255,255,255,.65);border-radius:34px;box-shadow:inset 0 2px 0 rgba(255,255,255,.7),0 20px 60px rgba(120,80,255,.4)}
body.m-y2k .btn{background:linear-gradient(#fff,#d6ddff 55%,#a9b6ff);color:#4a2f9e;border:2px solid #fff;box-shadow:inset 0 -3px 6px rgba(80,60,200,.25),0 4px 10px rgba(80,60,200,.3)}
body.m-y2k .btn.big{background:linear-gradient(#ffd1f0,#ff6ec7);color:#fff}
body.m-y2k .btn.on{background:linear-gradient(#fff6b0,#ffd23f)}
body.m-y2k .tab.active{background:linear-gradient(#fff,#d6ddff);color:#4a2f9e}`;
document.head.appendChild(css);

/* ---------- Deux colonnes (PC) : on regroupe les blocs ---------- */
const v = $('#view-local'), L = document.createElement('div'), R = document.createElement('div');
L.className = 'colL'; R.className = 'colR';
['.screen', '.controls', '.vol'].forEach(s => { const e = v.querySelector(s); if (e) L.appendChild(e); });
['.drop', '.tb', '.presets', '.srch', '#list'].forEach(s => { const e = v.querySelector(s); if (e) R.appendChild(e); });
v.append(L, R);

/* ---------- Mode Y2K ---------- */
const sel = $('#mode');
if (sel) {
  sel.add(new Option('Y2K', 'y2k'));
  sel.value = (LS('dp_set', {}) || {}).mode || '';
  const y2k = () => document.body.classList.toggle('m-y2k', sel.value === 'y2k');
  sel.addEventListener('change', y2k); y2k();
}

/* ---------- Volume au démarrage ---------- */
$('#view-fx').insertAdjacentHTML('beforeend', `
<h3>DÉMARRAGE</h3>
<label><b>Volume départ</b><select id="sv"><option value="last">Dernier utilisé</option><option value="0.3">30 %</option><option value="0.5">50 %</option><option value="0.7">70 %</option><option value="1">100 %</option></select></label>`);
const sv = $('#sv');
sv.value = localStorage.getItem('dp_sv') || 'last';
sv.onchange = () => { try { localStorage.setItem('dp_sv', sv.value); } catch {} };
if (sv.value !== 'last') {
  const vol = $('#vol');
  vol.value = sv.value;
  vol.dispatchEvent(new Event('input'));
}
})();