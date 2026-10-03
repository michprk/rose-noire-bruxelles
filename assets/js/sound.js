/* ==========================================================================
   Rose Noire — ambiance sonore
   Tout est synthétisé en direct avec la Web Audio API : aucun fichier audio à
   télécharger, aucun droit d’auteur. Une nappe douce (accords de fa majeur),
   des carillons de verre au hasard, un souffle et une fleur de notes à chaque
   chapitre du héros, un léger « tic » au survol des boutons.
   Coupé par défaut ; le navigateur n’autorise le son qu’après un geste du
   visiteur. Choix et volume mémorisés (rnb_sound).
   API pour app.js : window.__rnSound.transition(dir), .release(), .tick(), .click()
   ========================================================================== */
(() => {
  'use strict';
  const AC = window.AudioContext || window.webkitAudioContext;
  const noop = () => {};
  window.__rnSound = { transition: noop, release: noop, tick: noop, click: noop };
  if (!AC) return; // contrôles laissés masqués

  const d = document.documentElement;
  const KEY = 'rnb_sound';
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  let prefs = { on: false, vol: 60 };
  try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* navigation privée */ }
  prefs.vol = Math.max(0, Math.min(100, Number(prefs.vol) || 0));

  let ctx = null, master, music, fx, verb, noise;
  let chord = 0, padTimer = 0, chimeTimer = 0, offTimer = 0, lastTick = 0;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ on: prefs.on, vol: prefs.vol })); } catch (e) { /* rien */ } };
  const level = () => Math.pow(prefs.vol / 100, 1.4) * 1.6; // courbe proche de l’oreille

  /* ---------- Construction du graphe audio (au premier geste) ---------- */
  function impulse(seconds, decay) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  function build() {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.4;
    master.connect(comp).connect(ctx.destination);
    verb = ctx.createConvolver();
    verb.buffer = impulse(3.6, 2.4);
    const wet = ctx.createGain(); wet.gain.value = 0.5;
    verb.connect(wet).connect(master);
    music = ctx.createGain(); music.gain.value = 0.62;
    const musicTone = ctx.createBiquadFilter(); musicTone.type = 'lowpass'; musicTone.frequency.value = 2600; musicTone.Q.value = 0.2;
    music.connect(musicTone);
    musicTone.connect(master);
    const musicSend = ctx.createGain(); musicSend.gain.value = 0.7; musicTone.connect(musicSend).connect(verb);
    fx = ctx.createGain(); fx.gain.value = 0.8;
    fx.connect(master);
    const fxSend = ctx.createGain(); fxSend.gain.value = 0.45; fx.connect(fxSend).connect(verb);
    // 2 s de bruit blanc pour les souffles
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const n = noise.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
  }

  /* ---------- Nappe : accords tenus, filtre qui respire ---------- */
  const CHORDS = [
    [87.31, 174.61, 220.0, 261.63, 329.63, 392.0],  // Fa maj9
    [73.42, 146.83, 220.0, 261.63, 329.63, 349.23], // Ré m9
    [58.27, 116.54, 174.61, 220.0, 293.66, 329.63], // Si♭ maj7(9)
    [65.41, 130.81, 196.0, 220.0, 293.66, 329.63]   // Do 6/9
  ];
  const CHORD_LEN = 9.5;
  function playChord(freqs, t) {
    const dur = CHORD_LEN + 3;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.Q.value = 0.5;
    filter.frequency.setValueAtTime(520, t);
    filter.frequency.linearRampToValueAtTime(1250, t + dur * 0.45);
    filter.frequency.linearRampToValueAtTime(640, t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(1, t + 3.2);
    env.gain.setValueAtTime(1, t + dur - 3.6);
    env.gain.linearRampToValueAtTime(0.0001, t + dur);
    filter.connect(env).connect(music);
    freqs.forEach((f, i) => {
      const voices = i === 0 ? [['sine', 0]] : [['sine', -6], ['triangle', 6]];
      voices.forEach(([type, cents]) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.detune.value = cents + (Math.random() * 6 - 3);
        const g = ctx.createGain();
        g.gain.value = i === 0 ? 0.055 : (type === 'sine' ? 0.026 : 0.012);
        o.connect(g).connect(filter);
        o.start(t);
        o.stop(t + dur + 0.1);
      });
    });
  }
  function padLoop() {
    if (!ctx || !prefs.on) return;
    playChord(CHORDS[chord % CHORDS.length], ctx.currentTime + 0.05);
    chord++;
    padTimer = setTimeout(padLoop, CHORD_LEN * 1000);
  }

  /* ---------- Carillons de verre (cloche en synthèse FM, spatialisée) ---------- */
  const PENTA = [698.46, 783.99, 880.0, 1046.5, 1174.66, 1396.91, 1567.98];
  function bell(f, t, vol, len, bus, pan) {
    const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = f;
    const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = f * 3.507;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(f * 1.4, t);
    depth.gain.exponentialRampToValueAtTime(1, t + len * 0.7);
    mod.connect(depth).connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    car.connect(g);
    let out = g;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan == null ? Math.random() * 1.2 - 0.6 : pan; g.connect(p); out = p; }
    out.connect(bus);
    car.start(t); mod.start(t);
    car.stop(t + len + 0.05); mod.stop(t + len + 0.05);
  }
  function chimeLoop() {
    if (!ctx || !prefs.on) return;
    const t = ctx.currentTime + 0.05;
    const count = Math.random() < 0.35 ? 2 + Math.floor(Math.random() * 2) : 1;
    let k = Math.floor(Math.random() * PENTA.length);
    for (let i = 0; i < count; i++) {
      bell(PENTA[k], t + i * (0.11 + Math.random() * 0.08), 0.034 + Math.random() * 0.016, 2.6 + Math.random(), music);
      k = (k + (Math.random() < 0.5 ? 1 : 2)) % PENTA.length;
    }
    chimeTimer = setTimeout(chimeLoop, 2600 + Math.random() * 4800);
  }

  /* ---------- Effets ---------- */
  function whoosh(t, dur, peak, from, mid, to, panFrom, panTo) {
    const src = ctx.createBufferSource(); src.buffer = noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(from, t);
    bp.frequency.exponentialRampToValueAtTime(mid, t + dur * 0.45);
    bp.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.42);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g);
    let out = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.setValueAtTime(panFrom, t);
      p.pan.linearRampToValueAtTime(panTo, t + dur);
      g.connect(p); out = p;
    }
    out.connect(fx);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }
  function transition(dir) {
    if (!ready()) return;
    const t = ctx.currentTime + 0.02;
    whoosh(t, 1.35, 0.3, dir > 0 ? 260 : 1800, dir > 0 ? 2400 : 900, dir > 0 ? 700 : 300, dir > 0 ? -0.5 : 0.5, dir > 0 ? 0.5 : -0.5);
    // une fleur de trois notes de l’accord en cours, montante ou descendante
    const c = CHORDS[(chord + CHORDS.length - 1) % CHORDS.length];
    const notes = [c[2] * 2, c[3] * 2, c[4] * 2];
    if (dir < 0) notes.reverse();
    notes.forEach((f, i) => bell(f, t + 0.42 + i * 0.13, 0.06, 2.4, fx, -0.3 + i * 0.3));
  }
  function release() {
    if (!ready()) return;
    const t = ctx.currentTime + 0.02;
    whoosh(t, 1.1, 0.22, 900, 300, 160, 0.3, -0.3);
  }
  function tick() {
    if (!ready()) return;
    const now = performance.now();
    if (now - lastTick < 70) return;
    lastTick = now;
    const t = ctx.currentTime + 0.005;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(1100, t + 0.04);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.018, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(fx); o.start(t); o.stop(t + 0.08);
  }
  function click() {
    if (!ready()) return;
    const t = ctx.currentTime + 0.01;
    bell(880, t, 0.035, 1.6, fx, -0.15);
    bell(1318.51, t + 0.09, 0.03, 1.9, fx, 0.15);
  }
  const ready = () => !!(ctx && prefs.on && ctx.state === 'running');
  window.__rnSound = { transition, release, tick, click };

  /* ---------- Marche / arrêt, volume ---------- */
  function start() {
    clearTimeout(offTimer);
    if (!ctx) build();
    const go = () => {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(level(), ctx.currentTime + 1.6);
      clearTimeout(padTimer); clearTimeout(chimeTimer);
      padLoop();
      chimeTimer = setTimeout(chimeLoop, 1800);
    };
    if (ctx.state === 'suspended') ctx.resume().then(go).catch(noop); else go();
  }
  function stop() {
    clearTimeout(padTimer); clearTimeout(chimeTimer);
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    offTimer = setTimeout(() => { if (!prefs.on && ctx) ctx.suspend().catch(noop); }, 700);
  }
  function setOn(on, fromUser) {
    prefs.on = !!on;
    if (prefs.on && prefs.vol === 0) prefs.vol = 40;
    save();
    render();
    if (prefs.on) { if (fromUser || ctx) start(); else armFirstGesture(); }
    else stop();
  }
  function setVolume(v) {
    prefs.vol = Math.max(0, Math.min(100, Math.round(v)));
    save();
    if (prefs.vol === 0 && prefs.on) { setOn(false, true); return; }
    if (prefs.vol > 0 && !prefs.on) { setOn(true, true); return; }
    if (ctx && prefs.on) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(level(), ctx.currentTime, 0.08);
    }
    render();
  }
  // Son mémorisé « activé » : il reprend au premier clic ou à la première touche (règle des navigateurs)
  function armFirstGesture() {
    const once = () => {
      ['pointerdown', 'keydown', 'touchend'].forEach((t) => window.removeEventListener(t, once, true));
      if (prefs.on) start();
    };
    ['pointerdown', 'keydown', 'touchend'].forEach((t) => window.addEventListener(t, once, true));
  }

  /* ---------- Interface ---------- */
  function render() {
    d.classList.toggle('sound-on', prefs.on);
    $$('[data-sound-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(prefs.on));
      b.setAttribute('aria-label', prefs.on ? 'Ambiance sonore : activée. Couper le son' : 'Ambiance sonore : coupée. Activer le son');
    });
    $$('[data-sound-state]').forEach((s) => { s.textContent = prefs.on ? 'On' : 'Off'; });
    $$('[data-sound-volume]').forEach((r) => {
      if (Number(r.value) !== prefs.vol) r.value = String(prefs.vol);
      r.style.setProperty('--v', prefs.vol + '%');
      r.setAttribute('aria-valuetext', prefs.vol + ' %');
    });
  }
  function init() {
    $$('[data-sound]').forEach((el) => { el.hidden = false; });
    $$('[data-sound-toggle]').forEach((b) => b.addEventListener('click', () => {
      setOn(!prefs.on, true);
      const hint = document.querySelector('.snd.is-hint');
      if (hint) hint.classList.remove('is-hint');
    }));
    $$('[data-sound-volume]').forEach((r) => r.addEventListener('input', () => setVolume(Number(r.value))));
    render();
    if (prefs.on) armFirstGesture();
    // Petite bulle « Ambiance sonore » une fois par visite, sur ordinateur
    try {
      const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      const box = document.querySelector('.hdr .snd');
      if (box && fine && !prefs.on && !sessionStorage.getItem('rnb_sound_hint')) {
        sessionStorage.setItem('rnb_sound_hint', '1');
        setTimeout(() => box.classList.add('is-hint'), d.classList.contains('intro') ? 3400 : 1800);
        setTimeout(() => box.classList.remove('is-hint'), d.classList.contains('intro') ? 8400 : 6800);
      }
    } catch (e) { /* rien */ }
    // pause quand l’onglet est caché
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) { clearTimeout(padTimer); clearTimeout(chimeTimer); ctx.suspend().catch(noop); }
      else if (prefs.on) start();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
