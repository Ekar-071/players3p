'use strict';
const $ = s => document.querySelector(s);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('p3p:' + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('p3p:' + k, JSON.stringify(v)); } catch { /* stockage indisponible */ } }
};
const fmt = s => isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const setFill = el => el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%');

// ---------- Synthétiseur : un morceau est rendu en WAV avec OfflineAudioContext ----------
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = n => { const m = /^([A-G])([#b]?)(\d)$/.exec(n); return m ? 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) : 0; };
const seq = s => s.trim().split(/\s+/).map(midi);
const hz = m => 440 * 2 ** ((m - 69) / 12);

const SONGS = [
  { id: 'neon', title: 'Neon Drive', artist: 'Players3P Synth', bpm: 110, loops: 4, wave: 'sawtooth', bassWave: 'sawtooth',
    lead: seq('A4 . C5 . E5 . C5 . D5 . F5 . A5 . F5 . G4 . B4 . D5 . B4 . E5 . G5 . E5 . D5 .'),
    bass: seq('A2 . A2 A2 . A2 . A2 F2 . F2 F2 . F2 . F2 G2 . G2 G2 . G2 . G2 E2 . E2 E2 . E2 . E2'),
    drums: 'k.h.s.h.k.hks.h.' },
  { id: 'cafe', title: 'Café du matin', artist: 'Players3P Synth', bpm: 78, loops: 3, wave: 'triangle', bassWave: 'sine',
    lead: seq('D5 . F5 . A5 . . . C5 . E5 . G5 . . . Bb4 . D5 . F5 . . . A4 . C5 . E5 . . .'),
    bass: seq('D2 . . . . . D2 . C2 . . . . . C2 . Bb1 . . . . . Bb1 . A1 . . . . . A1 .'),
    drums: 'k...s...k.k.s...' },
  { id: 'orbit', title: 'Orbit', artist: 'Players3P Synth', bpm: 124, loops: 4, wave: 'square', bassWave: 'sawtooth',
    lead: seq('E4 G4 B4 E5 B4 G4 B4 E5 D4 F4 A4 D5 A4 F4 A4 D5 C4 E4 G4 C5 G4 E4 G4 C5 B3 D4 F#4 B4 F#4 D4 F#4 B4'),
    bass: seq('E2 . E2 . E2 . E2 . D2 . D2 . D2 . D2 . C2 . C2 . C2 . C2 . B1 . B1 . B1 . B1 .'),
    drums: 'k.h.s.h.k.h.s.hh' }
];
SONGS.forEach(s => { s.kind = 'synth'; s.dur = s.lead.length * s.loops * 30 / s.bpm + 1.5; });

async function renderSong(s) {
  const sr = 44100, step = 30 / s.bpm, steps = s.lead.length * s.loops, len = steps * step + 1.5;
  const c = new OfflineAudioContext(2, Math.ceil(sr * len), sr);
  const out = c.createGain();
  out.gain.setValueAtTime(.6, 0); out.gain.setValueAtTime(.6, len - 1.4); out.gain.linearRampToValueAtTime(0, len - .05);
  out.connect(c.destination);
  const dly = c.createDelay(), fb = c.createGain(), wet = c.createGain();
  dly.delayTime.value = step * 3; fb.gain.value = .3; wet.gain.value = .25;
  dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(out);
  const noise = c.createBuffer(1, sr, sr), nd = noise.getChannelData(0);
  for (let i = 0; i < sr; i++) nd[i] = Math.random() * 2 - 1;

  const tone = (t, m, d, type, vol, send) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(out); if (send) g.connect(dly);
    o.start(t); o.stop(t + d + .02);
  };
  const drum = (t, k) => {
    const g = c.createGain();
    if (k === 'k') {
      const o = c.createOscillator();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + .12);
      g.gain.setValueAtTime(.9, t); g.gain.exponentialRampToValueAtTime(.001, t + .25);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + .3);
    } else {
      const n = c.createBufferSource(), f = c.createBiquadFilter(), d = k === 's' ? .15 : .04;
      n.buffer = noise; f.type = 'highpass'; f.frequency.value = k === 's' ? 1500 : 7000;
      g.gain.setValueAtTime(k === 's' ? .5 : .2, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
      n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + d + .02);
    }
  };
  for (let i = 0; i < steps; i++) {
    const t = i * step + .05, li = i % s.lead.length, d = s.drums[i % s.drums.length];
    if (s.lead[li]) tone(t, s.lead[li], step * 1.8, s.wave, .16, true);
    if (s.bass[li]) tone(t, s.bass[li], step * 1.6, s.bassWave, .3, false);
    if (d !== '.') drum(t, d);
  }
  return toWav(await c.startRendering());
}

function toWav(buf) {
  const n = buf.length, ch = buf.numberOfChannels, v = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => [...s].forEach((x, i) => v.setUint8(o + i, x.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * ch * 2, true);
  v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * ch * 2, true);
  const data = Array.from({ length: ch }, (_, i) => buf.getChannelData(i));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { v.setInt16(o, Math.max(-1, Math.min(1, data[c][i])) * 32767, true); o += 2; }
  return new Blob([v.buffer], { type: 'audio/wav' });
}

// ---------- Lecteur ----------
const audio = new Audio();
let list = SONGS.slice(), cur = -1, filter = '', onlyFav = false;
let shuffle = store.get('shuffle', false), repeat = store.get('repeat', 0);
const favs = new Set(store.get('favs', []));
const eqVals = store.get('eq', [0, 0, 0]);
let actx, analyser, bands;

function graph() { // créé au premier clic (politique d'autoplay des navigateurs)
  if (actx) return;
  actx = new AudioContext();
  const src = actx.createMediaElementSource(audio);
  bands = [['lowshelf', 120], ['peaking', 1000], ['highshelf', 6000]].map(([type, f], i) => {
    const b = actx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.gain.value = eqVals[i]; return b;
  });
  analyser = actx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = .8;
  [src, ...bands, analyser, actx.destination].reduce((a, b) => (a.connect(b), b));
}

const status = t => { $('#status').textContent = t; };
function media(t) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist });
  [['play', toggle], ['pause', toggle], ['previoustrack', prev], ['nexttrack', () => load(nextIndex())]]
    .forEach(([a, f]) => { try { navigator.mediaSession.setActionHandler(a, f); } catch { /* non supporté */ } });
}

async function load(i, autoplay = true) {
  const t = list[i]; if (!t) return;
  cur = i; renderList();
  $('#title').textContent = t.title; $('#artist').textContent = t.artist; media(t);
  if (!t.url) {
    status('Génération du morceau…');
    try { t.url = URL.createObjectURL(await renderSong(t)); }
    catch { status('Génération impossible dans ce navigateur.'); return; }
    status('');
  }
  if (cur !== i) return; // un autre morceau a été choisi entre-temps
  audio.src = t.url;
  if (autoplay) await play();
}
async function play() { graph(); await actx.resume(); try { await audio.play(); } catch { /* interrompu */ } }
function toggle() { if (cur < 0) return load(0); audio.paused ? play() : audio.pause(); }
function nextIndex(dir = 1) {
  if (shuffle && list.length > 1) { let n; do n = Math.floor(Math.random() * list.length); while (n === cur); return n; }
  return (cur + dir + list.length) % list.length;
}
function prev() { audio.currentTime > 3 ? (audio.currentTime = 0) : load(nextIndex(-1)); }

audio.onplay = audio.onpause = () => {
  const p = !audio.paused;
  $('#pp').textContent = p ? '⏸' : '▶'; $('#pp').setAttribute('aria-label', p ? 'Pause' : 'Lecture');
  document.title = (p && list[cur] ? '▶ ' + list[cur].title + ' · ' : '') + 'Players3P';
};
audio.onloadedmetadata = () => { if (list[cur]) { list[cur].dur = audio.duration; renderList(); } $('#t2').textContent = fmt(audio.duration); };
audio.ontimeupdate = () => {
  const s = $('#seek'); s.value = audio.duration ? audio.currentTime / audio.duration * 1000 : 0; setFill(s);
  $('#t1').textContent = fmt(audio.currentTime);
};
audio.onended = () => {
  if (repeat === 2) { audio.currentTime = 0; audio.play(); return; }
  if (repeat === 0 && !shuffle && cur === list.length - 1) return;
  load(nextIndex());
};

// ---------- Bibliothèque ----------
function renderList() {
  const q = filter.toLowerCase();
  $('#list').innerHTML = list.map((t, i) => ({ t, i }))
    .filter(({ t }) => (!onlyFav || favs.has(t.id)) && (t.title + t.artist).toLowerCase().includes(q))
    .map(({ t, i }) => `<li class="trk${i === cur ? ' cur' : ''}"><button class="pick" data-i="${i}"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small><time>${t.dur ? fmt(t.dur) : ''}</time></button><button class="fav${favs.has(t.id) ? ' on' : ''}" data-id="${esc(t.id)}" aria-label="Favori" aria-pressed="${favs.has(t.id)}">♥</button></li>`)
    .join('') || '<li class="empty">Aucun morceau ne correspond.</li>';
}
$('#list').onclick = e => {
  const pick = e.target.closest('.pick'), fav = e.target.closest('.fav');
  if (pick) load(+pick.dataset.i);
  if (fav) { const id = fav.dataset.id; favs.has(id) ? favs.delete(id) : favs.add(id); store.set('favs', [...favs]); renderList(); }
};
$('#q').oninput = e => { filter = e.target.value; renderList(); };
$('#favOnly').onclick = e => { onlyFav = !onlyFav; e.currentTarget.setAttribute('aria-pressed', onlyFav); renderList(); };

function addFiles(files) {
  const a = [...files].filter(f => f.type.startsWith('audio/')); if (!a.length) return status('Aucun fichier audio détecté.');
  const first = list.length;
  a.forEach(f => {
    const t = { id: 'f:' + f.name + f.size, title: f.name.replace(/\.[^.]+$/, ''), artist: 'Mon fichier', kind: 'file', url: URL.createObjectURL(f), dur: 0 };
    list.push(t);
  });
  load(first);
}
$('#files').onchange = e => addFiles(e.target.files);
addEventListener('dragover', e => { e.preventDefault(); document.body.classList.add('drag'); });
addEventListener('dragleave', () => document.body.classList.remove('drag'));
addEventListener('drop', e => { e.preventDefault(); document.body.classList.remove('drag'); addFiles(e.dataTransfer.files); });

// ---------- Commandes ----------
function syncModes() {
  $('#shuf').setAttribute('aria-pressed', shuffle);
  const r = $('#rep'); r.textContent = repeat === 2 ? '↻¹' : '↻'; r.classList.toggle('on', repeat > 0);
  r.setAttribute('aria-label', ['Répétition désactivée', 'Répéter la liste', 'Répéter le morceau'][repeat]);
}
const toggleShuffle = () => { shuffle = !shuffle; store.set('shuffle', shuffle); syncModes(); };
const cycleRepeat = () => { repeat = (repeat + 1) % 3; store.set('repeat', repeat); syncModes(); };
function setVolume(v) { v = Math.max(0, Math.min(100, v)); audio.volume = v / 100; $('#vol').value = v; setFill($('#vol')); store.set('vol', v); }
let lastVol = 70;
const mute = () => { if (audio.volume) { lastVol = audio.volume * 100; setVolume(0); } else setVolume(lastVol || 70); };

$('#pp').onclick = toggle; $('#next').onclick = () => load(nextIndex()); $('#prev').onclick = prev;
$('#shuf').onclick = toggleShuffle; $('#rep').onclick = cycleRepeat;
$('#seek').oninput = e => { if (audio.duration) audio.currentTime = e.target.value / 1000 * audio.duration; setFill(e.target); };
$('#vol').oninput = e => setVolume(+e.target.value);
document.querySelectorAll('[data-eq]').forEach(el => {
  const i = +el.dataset.eq; el.value = eqVals[i]; setFill(el);
  el.oninput = () => { eqVals[i] = +el.value; store.set('eq', eqVals); if (bands) bands[i].gain.value = eqVals[i]; setFill(el); };
});
addEventListener('keydown', e => {
  const tag = e.target.tagName, k = e.key.toLowerCase();
  if (tag === 'INPUT' && e.target.type !== 'range' || e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === ' ' && tag !== 'BUTTON') { e.preventDefault(); toggle(); }
  else if (e.key === 'ArrowRight' && tag !== 'INPUT') audio.currentTime += 5;
  else if (e.key === 'ArrowLeft' && tag !== 'INPUT') audio.currentTime -= 5;
  else if (e.key === 'ArrowUp' && tag !== 'INPUT') { e.preventDefault(); setVolume(audio.volume * 100 + 5); }
  else if (e.key === 'ArrowDown' && tag !== 'INPUT') { e.preventDefault(); setVolume(audio.volume * 100 - 5); }
  else if (k === 'n') load(nextIndex()); else if (k === 'p') prev();
  else if (k === 's') toggleShuffle(); else if (k === 'r') cycleRepeat(); else if (k === 'm') mute();
});

// ---------- Spectre en direct (AnalyserNode) ----------
const cv = $('#viz'), g2 = cv.getContext('2d');
let bins;
(function draw() {
  requestAnimationFrame(draw);
  const dpr = devicePixelRatio || 1, w = cv.width = cv.clientWidth * dpr, h = cv.height = cv.clientHeight * dpr;
  if (!analyser || audio.paused) return;
  bins = bins || new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(bins);
  const n = 40, bw = w / n;
  g2.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ac');
  for (let i = 0; i < n; i++) {
    const bh = Math.max(3 * dpr, bins[Math.floor(i * bins.length * .7 / n)] / 255 * h);
    g2.fillRect(i * bw + bw * .15, h - bh, bw * .7, bh);
  }
})();

// ---------- Démarrage ----------
setVolume(store.get('vol', 70)); syncModes(); renderList(); load(0, false);
