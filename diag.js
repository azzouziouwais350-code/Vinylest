/* diag.js — dream.player : diagnostic (à charger EN PREMIER, avant script.js) */
(() => {
const errs = [];
let last = 0;
const note = m => {
  errs.push(new Date().toLocaleTimeString() + ' ' + m);
  if (errs.length > 30) errs.shift();
  if (Date.now() - last < 3000) return;
  last = Date.now();
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:500;background:#7a1f33;color:#fff;padding:10px 14px;border-radius:12px;font:12px/1.4 monospace;max-width:90vw;word-break:break-word';
  d.textContent = m;
  (document.body || document.documentElement).appendChild(d);
  setTimeout(() => d.remove(), 5000);
};
addEventListener('error', e => note('Erreur : ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')'));
addEventListener('unhandledrejection', e => note('Promesse : ' + ((e.reason && e.reason.message) || e.reason)));

function show(txt) {
  const o = document.createElement('div');
  o.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.7);display:grid;place-items:center;padding:16px';
  o.innerHTML = '<div style="background:#15111f;color:#fff;border-radius:18px;padding:16px;max-width:560px;width:100%;max-height:80vh;overflow:auto;font:13px/1.5 monospace"><pre style="white-space:pre-wrap;word-break:break-word;margin:0 0 12px"></pre><button id="dgc" style="padding:10px 14px;border-radius:10px;border:0;background:#b79cff;font-weight:600">COPIER</button> <button id="dgx" style="padding:10px 14px;border-radius:10px;border:0;background:#333;color:#fff">FERMER</button></div>';
  o.querySelector('pre').textContent = txt;
  o.querySelector('#dgx').onclick = () => o.remove();
  o.querySelector('#dgc').onclick = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { o.querySelector('#dgc').textContent = 'COPIÉ ✓'; });
  };
  document.body.appendChild(o);
}

async function report() {
  const mods = { 'script.js': '#play', 'features.js': '#tabfx', 'spotify.js': '#spx', 'premium.js': '#bgb',
    'extras.js': '#vsel', 'more.js': '#gridb', 'final.js': '#clk', 'settings.js': '#zm', 'layout.js': '.colL' };
  const L = Object.entries(mods).map(([f, s]) => (document.querySelector(s) ? 'OK     ' : 'MANQUE ') + f);
  let sw = 'non supporté', ck = 'non supporté';
  try { if (navigator.serviceWorker) sw = (await navigator.serviceWorker.getRegistrations()).length; } catch {}
  try { if (window.caches) ck = (await caches.keys()).join(', ') || 'aucun'; } catch {}
  L.push('', 'Service worker : ' + sw, 'Caches : ' + ck,
    'IndexedDB : ' + (window.indexedDB ? 'oui' : 'non'),
    'Web Audio : ' + (window.AudioContext || window.webkitAudioContext ? 'oui' : 'non'),
    'Morceaux : ' + (typeof tracks !== 'undefined' ? tracks.length : '?'),
    'Page : ' + location.href, 'Navigateur : ' + navigator.userAgent, '',
    'Erreurs (' + errs.length + ') :', ...(errs.length ? errs : ['aucune']));
  show(L.join('\n'));
}

addEventListener('load', () => {
  const fx = document.getElementById('view-fx');
  if (!fx) return;
  fx.insertAdjacentHTML('beforeend', '<h3>DIAGNOSTIC</h3><div class="presets"><button class="btn" id="dg">VÉRIFIER</button></div><p class="hint">En cas de bug : touche VÉRIFIER, puis COPIER, et envoie le texte.</p>');
  document.getElementById('dg').onclick = report;
});
})();