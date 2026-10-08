x/* polish.js — dream.player : finitions (APRÈS layout.js) */
(() => {
const $ = s => document.querySelector(s);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const P = Object.assign({ spin: false, tilt: true }, LS('dp_pol', {}));

/* ---------- CSS ---------- */
const css = document.createElement('style');
css.textContent = `
@keyframes pop{40%{transform:scale(1.7)}}
.h.pop{display:inline-block;animation:pop .35s ease}
#seek{filter:drop-shadow(0 0 6px var(--accent))}
body.spin.playing #cover{animation:spin 18s linear infinite;border-radius:50%}
@keyframes spin{to{transform:rotate(360deg)}}`;
document.head.appendChild(css);

/* ---------- Réglages ---------- */
$('#view-fx').insertAdjacentHTML('beforeend', `
<h3>POCHETTE</h3>
<label><b>Vinyle qui tourne</b><input type="checkbox" id="spin"></label>
<label><b>Effet 3D (souris)</b><input type="checkbox" id="tilt"></label>`);
const ap = () => { SS('dp_pol', P); document.body.classList.toggle('spin', P.spin); };
$('#spin').checked = P.spin; $('#tilt').checked = P.tilt;
$('#spin').onchange = e => { P.spin = e.target.checked; ap(); };
$('#tilt').onchange = e => { P.tilt = e.target.checked; ap(); };
ap();

/* ---------- Effet 3D ---------- */
const cov = $('#cover');
cov.addEventListener('pointermove', e => {
  if (!P.tilt || P.spin || e.pointerType !== 'mouse') return;
  const r = cov.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  cov.style.transition = 'transform .1s';
  cov.style.transform = `perspective(600px) rotateY(${x * 18}deg) rotateX(${-y * 18}deg) scale(1.03)`;
});
cov.addEventListener('pointerleave', () => { cov.style.transform = ''; cov.style.transition = ''; });

/* ---------- Animation du cœur ---------- */
$('#list').addEventListener('click', e => {
  if (!e.target.classList.contains('h')) return;
  const name = e.target.parentNode.querySelector('.t').textContent;
  setTimeout(() => document.querySelectorAll('#list .track').forEach(r => {
    if (r.querySelector('.t').textContent === name) r.querySelector('.h').classList.add('pop');
  }), 0);
}, true);

/* ---------- Dernière page ouverte ---------- */
const tabs = [...document.querySelectorAll('.tab')];
tabs.forEach((t, i) => t.addEventListener('click', () => SS('dp_tab', i)));
const lt = LS('dp_tab', 0);
if (lt && tabs[lt]) tabs[lt].click();
const sv = $('#vsel');
sv.addEventListener('change', () => SS('dp_view', sv.value));
const lv = LS('dp_view', 'all');
if (lv !== 'all' && [...sv.options].some(o => o.value === lv)) { sv.value = lv; sv.dispatchEvent(new Event('change')); }
})();