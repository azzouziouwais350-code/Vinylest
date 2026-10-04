const $ = s => document.querySelector(s);
const audio = new Audio();
audio.preload = 'metadata';

let tracks = [];            // {name, url}
let idx = -1;
let shuffle = false;
let repeat = 0;             // 0 off, 1 tout, 2 une piste
let seeking = false;

/* ---------- Étoiles ---------- */
for (let i = 0; i < 30; i++) {
  const s = document.createElement('div');
  s.className = 'star';
  s.style.left = Math.random() * 100 + 'vw';
  s.style.top = Math.random() * 50 + 'vh';
  s.style.animationDelay = Math.random() * 2 + 's';
  document.body.appendChild(s);
}

/* ---------- Onglets ---------- */
document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  $('#view-' + t.dataset.view).classList.add('active');
  if (t.dataset.view === 'spotify') audio.pause();
});

/* ---------- Utilitaires ---------- */
const fmt = s => isNaN(s) ? '0:00' : Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const clean = n => n.replace(/\.[^.]+$/, '').replace(/_+/g, ' ');

/* ---------- Import de fichiers ---------- */
function addFiles(files) {
  [...files].forEach(f => {
    if (!f.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f.name)) return;
    tracks.push({ name: clean(f.name), url: URL.createObjectURL(f) });
  });
  renderList();
  if (idx === -1 && tracks.length) load(0, false);
}
$('#file').onchange = e => { addFiles(e.target.files); e.target.value = ''; };

const drop = $('#drop');
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });

/* ---------- Playlist ---------- */
function renderList() {
  const l = $('#list');
  if (!tracks.length) { l.innerHTML = '<div class="empty">Playlist vide...</div>'; return; }
  l.innerHTML = '';
  tracks.forEach((t, i) => {
    const d = document.createElement('div');
    d.className = 'track' + (i === idx ? ' cur' : '');
    d.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t"></span><span class="x">X</span>`;
    d.querySelector('.t').textContent = t.name;
    d.onclick = () => load(i, true);
    d.querySelector('.x').onclick = e => { e.stopPropagation(); removeTrack(i); };
    l.appendChild(d);
  });
}
function removeTrack(i) {
  URL.revokeObjectURL(tracks[i].url);
  tracks.splice(i, 1);
  if (i === idx) {
    audio.pause(); audio.removeAttribute('src'); idx = -1;
    setPlayIcon();
    $('#nowTitle').textContent = '— aucune piste —';
    if (tracks.length) load(Math.min(i, tracks.length - 1), false);
  } else if (i < idx) idx--;
  renderList();
}

/* ---------- Lecture ---------- */
function load(i, autoplay) {
  idx = i;
  audio.src = tracks[i].url;
  $('#nowTitle').textContent = '♪ ' + tracks[i].name + ' ♪';
  renderList();
  if (autoplay) play();
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: tracks[i].name, artist: 'Vinylest' });
  }
}
function setPlayIcon() { $('#play').textContent = audio.paused ? '▶' : '❚❚'; }
function play() { initAudioCtx(); audio.play().catch(() => {}); }
function toggle() { if (idx === -1) return; audio.paused ? play() : audio.pause(); }

function next(auto) {
  if (!tracks.length) return;
  if (auto && repeat === 2) { audio.currentTime = 0; play(); return; }
  let n;
  if (shuffle && tracks.length > 1) {
    do { n = Math.floor(Math.random() * tracks.length); } while (n === idx);
  } else {
    n = idx + 1;
    if (n >= tracks.length) {
      if (repeat === 1 || !auto) n = 0;
      else { audio.pause(); return; }
    }
  }
  load(n, true);
}
function prev() {
  if (!tracks.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  load((idx - 1 + tracks.length) % tracks.length, true);
}

$('#play').onclick = toggle;
$('#next').onclick = () => next(false);
$('#prev').onclick = prev;
$('#shuffle').onclick = e => { shuffle = !shuffle; e.target.classList.toggle('on', shuffle); };
$('#repeat').onclick = e => {
  repeat = (repeat + 1) % 3;
  e.target.classList.toggle('on', repeat > 0);
  e.target.textContent = repeat === 2 ? '1' : '↻';
};

audio.addEventListener('play', setPlayIcon);
audio.addEventListener('pause', setPlayIcon);
audio.addEventListener('ended', () => next(true));
audio.addEventListener('loadedmetadata', () => $('#dur').textContent = fmt(audio.duration));
audio.addEventListener('timeupdate', () => {
  $('#cur').textContent = fmt(audio.currentTime);
  if (audio.duration && !seeking) $('#seek').value = (audio.currentTime / audio.duration) * 100;
});

const seek = $('#seek');
seek.addEventListener('input', () => { seeking = true; $('#cur').textContent = fmt(audio.duration * seek.value / 100); });
seek.addEventListener('change', () => { audio.currentTime = audio.duration * seek.value / 100; seeking = false; });
$('#vol').addEventListener('input', e => audio.volume = e.target.value);
audio.volume = 0.7;

/* ---------- Contrôles système + clavier ---------- */
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', play);
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('previoustrack', prev);
  navigator.mediaSession.setActionHandler('nexttrack', () => next(false));
}
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  if (e.code === 'ArrowRight') audio.currentTime += 5;
  if (e.code === 'ArrowLeft') audio.currentTime -= 5;
});

/* ---------- Visualiseur pixel ---------- */
let actx, analyser, data, started = false;
function initAudioCtx() {
  if (started) { if (actx.state === 'suspended') actx.resume(); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const src = actx.createMediaElementSource(audio);
    analyser = actx.createAnalyser();
    analyser.fftSize = 128;
    data = new Uint8Array(analyser.frequencyBinCount);
    src.connect(analyser);
    analyser.connect(actx.destination);
    started = true;
  } catch (e) { console.warn(e); }
}

const cv = $('#viz');
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
let t = 0;
function draw() {
  requestAnimationFrame(draw);
  t++;
  c.fillStyle = '#0a0618';
  c.fillRect(0, 0, 256, 48);
  const bars = 32, w = 8;
  if (analyser) analyser.getByteFrequencyData(data);
  for (let i = 0; i < bars; i++) {
    const v = analyser && !audio.paused ? data[i] / 255 : (Math.sin(t / 30 + i / 3) + 1) / 12;
    const h = Math.max(1, Math.round(v * 12));
    for (let j = 0; j < h; j++) {
      c.fillStyle = j > 9 ? '#fff29a' : j > 5 ? '#ff8fd8' : '#7ff5ff';
      c.fillRect(i * w + 1, 48 - (j + 1) * 4, w - 2, 3);
    }
  }
}
draw();

/* ---------- Spotify (lecteur intégré) ---------- */
const presets = [
  ['Top 50 Monde', 'https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF'],
  ['Lofi Beats', 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn'],
  ['Dreamy', 'https://open.spotify.com/playlist/37i9dQZF1DX6uQnrQkSAYA']
];
const frame = $('#spFrame');

function toEmbed(url) {
  url = url.trim();
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|artist|show|episode)\/([A-Za-z0-9]+)/i)
        || url.match(/^spotify:(track|album|playlist|artist|show|episode):([A-Za-z0-9]+)/i);
  if (!m) return null;
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0`;
}
function loadSpotify(url) {
  const e = toEmbed(url);
  if (!e) {
    $('#spUrl').style.borderColor = '#ff5d7a';
    $('#spUrl').value = '';
    $('#spUrl').placeholder = 'Lien Spotify invalide !';
    return;
  }
  $('#spUrl').style.borderColor = '';
  frame.src = e;
  const type = e.split('/embed/')[1].split('/')[0];
  frame.style.height = (type === 'track' || type === 'episode') ? '152px' : '352px';
  try { localStorage.setItem('vinylest_sp', url); } catch (_) {}
}

presets.forEach(([n, u]) => {
  const b = document.createElement('button');
  b.className = 'btn';
  b.textContent = n;
  b.onclick = () => { $('#spUrl').value = u; loadSpotify(u); };
  $('#presets').appendChild(b);
});
$('#spGo').onclick = () => loadSpotify($('#spUrl').value);
$('#spUrl').addEventListener('keydown', e => { if (e.key === 'Enter') loadSpotify(e.target.value); });

let saved = presets[1][1];
try { saved = localStorage.getItem('vinylest_sp') || saved; } catch (_) {}
$('#spUrl').value = saved;
loadSpotify(saved);

/* ---------- Service worker (PWA) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(console.warn);
  });
}