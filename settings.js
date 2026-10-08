/* settings.js — dream.player : texte, visualiseur, file d'attente, fondu, démarrage (APRÈS final.js) */
(() => {
const $ = s => document.querySelector(s);
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const root = document.documentElement.style;
const ST = Object.assign({ zm: 1, vs: 0, sens: 1, bass: true, fade: 0, sh: false, rp: 0 }, LS('dp_set2', {}));
const fp = e => e.style.setProperty('--p', ((e.value - e.min) / (e.max - e.min) * 100) + '%');

/* ---------- CSS ---------- */
const css = document.createElement('style');
css.textContent = `
.player{zoom:var(--zm,1)}
body.playing.bz #cover{transform:scale(calc(1 + var(--bass,0)*.05));transition:transform .1s linear}
.track .m{cursor:pointer}`;
document.head.appendChild(css);

/* ---------- Réglages ---------- */
$('#view-fx').insertAdjacentHTML('beforeend', `
<h3>CONFORT</h3>
<label><b>Taille texte</b><input type="range" id="zm" min=".85" max="1.3" step=".05"><i id="zmv"></i></label>
<h3>VISUALISEUR</h3>
<label><b>Style</b><select id="vs"><option value="0">Barres</option><option value="1">Miroir</option><option value="2">Cercle</option><option value="3">Onde</option></select></label>
<label><b>Sensibilité</b><input type="range" id="sens" min=".5" max="2" step=".1"><i id="sensv"></i></label>
<label><b>Basses / pochette</b><input type="checkbox" id="bass"></label>
<h3>LECTURE</h3>
<label><b>Fondu</b><select id="fade"><option value="0">Aucun</option><option value="2">2 s</option><option value="4">4 s</option><option value="6">6 s</option></select></label>
<label><b>Aléatoire</b><input type="checkbox" id="dsh"></label>
<label><b>Répétition</b><select id="drp"><option value="0">Non</option><option value="1">Tout</option><option value="2">Une piste</option></select></label>
<p class="hint">Aléatoire et répétition s'appliquent à l'ouverture de l'appli.</p>
<div class="presets"><button class="btn" id="rst">RÉINITIALISER LES RÉGLAGES</button></div>`);
const ap = () => {
  SS('dp_set2', ST);
  root.setProperty('--zm', ST.zm);
  document.body.classList.toggle('bz', ST.bass);
  $('#zmv').textContent = Math.round(ST.zm * 100) + '%';
  $('#sensv').textContent = ST.sens.toFixed(1) + 'x';
  fp($('#zm')); fp($('#sens'));
};
$('#zm').value = ST.zm; $('#sens').value = ST.sens; $('#vs').value = ST.vs; $('#bass').checked = ST.bass;
$('#fade').value = ST.fade; $('#dsh').checked = ST.sh; $('#drp').value = ST.rp;
$('#zm').oninput = e => { ST.zm = +e.target.value; ap(); };
$('#sens').oninput = e => { ST.sens = +e.target.value; ap(); };
$('#vs').onchange = e => { ST.vs = +e.target.value; ap(); };
$('#bass').onchange = e => { ST.bass = e.target.checked; ap(); };
$('#fade').onchange = e => { ST.fade = +e.target.value; if (fg) fg.gain.value = 1; ap(); };
$('#dsh').onchange = e => { ST.sh = e.target.checked; ap(); };
$('#drp').onchange = e => { ST.rp = +e.target.value; ap(); };
$('#rst').onclick = () => {
  if (!confirm('Remettre tous les réglages à zéro ? (tes morceaux sont conservés)')) return;
  ['dp_fx', 'dp_theme', 'dp_vm', 'dp_set', 'dp_set2', 'dp_scan', 'dp_vol'].forEach(k => localStorage.removeItem(k));
  location.reload();
};

/* ---------- Visualiseur : barres / miroir / cercle / onde ---------- */
let acc = '#b79cff';
setInterval(() => { acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || acc; }, 800);
cv.addEventListener('click', () => { ST.vs = (ST.vs + 1) % 4; $('#vs').value = ST.vs; ap(); });
const wv = new Uint8Array(128);
draw = () => {
  requestAnimationFrame(draw); t++;
  const W = cv.width, H = cv.height, live = analyser && !audio.paused;
  c.clearRect(0, 0, W, H);
  let bass = 0;
  if (live) { analyser.getByteFrequencyData(data); bass = (data[0] + data[1] + data[2] + data[3]) / 1020; }
  root.setProperty('--bass', Math.min(1, bass * ST.sens).toFixed(3));
  c.fillStyle = c.strokeStyle = acc; c.shadowColor = acc; c.shadowBlur = 12; c.globalAlpha = .9;
  if (ST.vs === 3) {
    if (live) analyser.getByteTimeDomainData(wv);
    c.lineWidth = 3; c.beginPath();
    for (let x = 0; x < 128; x++) {
      const v = live ? (wv[x] - 128) / 128 * ST.sens : Math.sin(t / 20 + x / 9) * .08;
      const px = x / 127 * W, py = H / 2 + v * H * .8;
      x ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke();
  } else {
    for (let i = 0; i < BARS; i++) {
      const tg = live ? Math.min(1, Math.pow(data[i] / 255, 1.4) * 1.5 * ST.sens) : (Math.sin(t / 40 + i / 2.5) + 1) / 16;
      level[i] += (tg - level[i]) * .3;
      if (ST.vs === 2) {
        const a = i / BARS * Math.PI * 2 - Math.PI / 2, r0 = H * .2, r1 = r0 + 4 + level[i] * H * .3;
        c.lineWidth = 4; c.beginPath();
        c.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0);
        c.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1);
        c.stroke();
      } else {
        const w = W / BARS, h = Math.max(4, level[i] * H * (ST.vs ? .5 : 1)), y = ST.vs ? H / 2 - h : H - h;
        c.beginPath();
        c.roundRect ? c.roundRect(i * w + 2, y, w - 4, ST.vs ? h * 2 : h, 3) : c.rect(i * w + 2, y, w - 4, ST.vs ? h * 2 : h);
        c.fill();
      }
    }
  }
  c.globalAlpha = 1; c.shadowBlur = 0;
};

/* ---------- Fondu début / fin de morceau ---------- */
let fg = null;
audio.addEventListener('play', () => {
  if (!started || fg) return;
  try { analyser.disconnect(); fg = actx.createGain(); analyser.connect(fg); fg.connect(actx.destination); } catch (e) { console.warn(e); }
});
audio.addEventListener('playing', () => {
  if (!fg || !ST.fade) return;
  fg.gain.cancelScheduledValues(actx.currentTime);
  fg.gain.setValueAtTime(0, actx.currentTime);
  fg.gain.linearRampToValueAtTime(1, actx.currentTime + Math.min(ST.fade, 3));
});
audio.addEventListener('timeupdate', () => {
  if (!fg || !ST.fade || !audio.duration) return;
  const rem = audio.duration - audio.currentTime;
  fg.gain.setTargetAtTime(rem < ST.fade ? Math.max(0, rem / ST.fade) : 1, actx.currentTime, .1);
});

/* ---------- Vue « File d'attente » ---------- */
const addQ = () => {
  const s = $('#vsel');
  if ([...s.options].some(o => o.value === 'queue')) return;
  const cur = s.value; s.add(new Option("File d'attente", 'queue')); s.value = cur;
};
new MutationObserver(addQ).observe($('#vsel'), { childList: true });
addQ();
const _rl = renderList;
renderList = () => {
  if ($('#vsel').value !== 'queue') return _rl();
  const l = $('#list'), Q = window.DP && window.DP.Q ? window.DP.Q() : null;
  l.classList.remove('gridv'); l.innerHTML = '';
  if (!Q || !Q.length) { l.innerHTML = '<div class="empty">File vide : utilise ⋯ › « Ajouter à la file »</div>'; return; }
  Q.forEach((id, k) => {
    const t = tracks.find(x => x.id === id);
    if (!t) return;
    const d = document.createElement('div');
    d.className = 'track';
    d.innerHTML = '<span class="n"></span><span class="t"></span><span class="m">▲</span><span class="m">▼</span><span class="m">✕</span>';
    d.children[0].textContent = String(k + 1).padStart(2, '0');
    d.children[1].textContent = t.name;
    const mv = j => { if (j < 0 || j >= Q.length) return; [Q[k], Q[j]] = [Q[j], Q[k]]; renderList(); };
    d.children[2].onclick = () => mv(k - 1);
    d.children[3].onclick = () => mv(k + 1);
    d.children[4].onclick = () => { Q.splice(k, 1); renderList(); };
    l.appendChild(d);
  });
};

/* ---------- Clavier : lignes de la liste ---------- */
new MutationObserver(() => document.querySelectorAll('#list .track').forEach(r => {
  if (!r.hasAttribute('role')) { r.setAttribute('role', 'button'); r.tabIndex = 0; }
})).observe($('#list'), { childList: true });
$('#list').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('track')) e.target.click(); });

/* ---------- Démarrage ---------- */
ap();
if (ST.sh) $('#shuffle').click();
for (let i = 0; i < ST.rp; i++) $('#repeat').click();
})();