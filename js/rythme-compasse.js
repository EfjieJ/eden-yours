/**
 * Rythme-Compasse — Step 1: L'illusion de fixité
 * Standalone prototype for Eden Yours.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'eden-rythme-compasse';
  const AUDIO_URL = 'assets/audio/b0eb0f76-f2d8-4e16-85a9-037fc3f32b01.mp3';
  const SEGMENT_END = 33;
  const BPM = 90;
  const BEAT_MS = 60000 / BPM;
  const TERNARY = 3;
  const HIT_WINDOW_MS = 165;
  const REFLEX_DURATION_MS = 20000;
  const REFLEX_PASS_RATIO = 0.7;
  const COMPASS_WINDOW_MS = 2000;
  const VEIL_LOWPASS = 750;
  const VEIL_DETUNE_CENTS = 30;

  const canvas = document.getElementById('rc-canvas');
  const ctx = canvas.getContext('2d');
  const badge = document.getElementById('rc-badge');
  const screens = {
    intro: document.getElementById('screen-intro'),
    reflex: document.getElementById('screen-reflex'),
    compass: document.getElementById('screen-compass'),
    outcome: document.getElementById('screen-outcome'),
  };
  const btnStart = document.getElementById('btn-start');
  const reflexScoreEl = document.getElementById('reflex-score');
  const reflexTimerEl = document.getElementById('reflex-timer');
  const compassHint = document.getElementById('compass-hint');
  const compassTimerEl = document.getElementById('compass-timer');
  const compassOpts = document.getElementById('compass-opts');
  const ouiWrap = document.getElementById('oui-wrap');
  const btnOui = document.getElementById('btn-oui');
  const outcomeBox = document.getElementById('outcome-box');
  const outcomeTitle = document.getElementById('outcome-title');
  const outcomeMsg = document.getElementById('outcome-msg');
  const listenBar = document.getElementById('listen-bar');
  const btnListen = document.getElementById('btn-listen');
  const btnStop = document.getElementById('btn-stop');
  const btnRetry = document.getElementById('btn-retry');
  const introHint = document.getElementById('intro-hint');

  let audioCtx = null;
  let audioBuffer = null;
  let currentSource = null;
  let veilFilter = null;
  let gainNode = null;
  let detuneOsc = null;
  let detuneGain = null;

  let phase = 'intro';
  let unlocked = false;
  let outcomeVeiled = false;
  let reflexFailed = false;
  let hits = 0;
  let autoMisses = 0;
  let expectedBeats = [];
  let hitFlags = [];
  let scoredMiss = [];
  let reflexStart = 0;
  let lastAccentIdx = -1;
  let compassDeadline = 0;
  let compassChoiceCorrect = false;
  let compassResolved = false;
  let threadProgress = 0;
  let pulses = [];

  const OPT_POOL = [
    { t: 'Je subis la structure', ok: false },
    { t: 'Je suis la cause', ok: true },
    { t: "J'attends la vie", ok: false },
  ];

  function shuffleOpts() {
    const texts = OPT_POOL.slice();
    for (let i = texts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = texts[i];
      texts[i] = texts[j];
      texts[j] = tmp;
    }
    compassOpts.innerHTML = '';
    texts.forEach(function (o) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rc-opt';
      b.dataset.correct = o.ok ? '1' : '0';
      b.textContent = o.t;
      compassOpts.appendChild(b);
    });
  }

  function loadStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && data.step1 === true) unlocked = true;
    } catch (_) {}
  }

  function saveUnlock() {
    unlocked = true;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step1: true, updatedAt: new Date().toISOString() })
      );
    } catch (_) {}
    badge.classList.add('visible');
  }

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle('active', k === name);
    });
    phase = name;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  async function initAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    if (audioBuffer) return;
    const res = await fetch(AUDIO_URL);
    if (!res.ok) throw new Error('Audio fetch failed: ' + res.status);
    const arr = await res.arrayBuffer();
    audioBuffer = await audioCtx.decodeAudioData(arr);
  }

  function stopPlayback() {
    if (detuneOsc) {
      try { detuneOsc.stop(); } catch (_) {}
      try { detuneOsc.disconnect(); } catch (_) {}
      detuneOsc = null;
    }
    if (detuneGain) {
      try { detuneGain.disconnect(); } catch (_) {}
      detuneGain = null;
    }
    if (currentSource) {
      try { currentSource.onended = null; } catch (_) {}
      try { currentSource.stop(); } catch (_) {}
      try { currentSource.disconnect(); } catch (_) {}
      currentSource = null;
    }
    if (veilFilter) {
      try { veilFilter.disconnect(); } catch (_) {}
      veilFilter = null;
    }
    if (gainNode) {
      try { gainNode.disconnect(); } catch (_) {}
      gainNode = null;
    }
    btnStop.hidden = true;
  }

  function playSegment(veiled) {
    stopPlayback();
    if (!audioCtx || !audioBuffer) return;

    const src = audioCtx.createBufferSource();
    src.buffer = audioBuffer;
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 1;

    if (veiled) {
      veilFilter = audioCtx.createBiquadFilter();
      veilFilter.type = 'lowpass';
      veilFilter.frequency.value = VEIL_LOWPASS;
      veilFilter.Q.value = 0.7;

      if (typeof src.detune !== 'undefined') {
        detuneOsc = audioCtx.createOscillator();
        detuneGain = audioCtx.createGain();
        detuneOsc.frequency.value = 0.35;
        detuneGain.gain.value = VEIL_DETUNE_CENTS;
        detuneOsc.connect(detuneGain);
        detuneGain.connect(src.detune);
        detuneOsc.start();
      }

      src.connect(veilFilter);
      veilFilter.connect(gainNode);
    } else {
      src.connect(gainNode);
    }

    gainNode.connect(audioCtx.destination);
    currentSource = src;

    const dur = Math.min(SEGMENT_END, audioBuffer.duration);
    src.start(0, 0, dur);
    src.onended = function () {
      if (currentSource === src) {
        currentSource = null;
        btnStop.hidden = true;
      }
    };
    btnStop.hidden = false;
  }

  function buildBeatSchedule(startPerf) {
    expectedBeats = [];
    hitFlags = [];
    scoredMiss = [];
    const accentInterval = BEAT_MS * TERNARY;
    let t = startPerf + 400;
    const end = startPerf + REFLEX_DURATION_MS;
    while (t < end - 80) {
      expectedBeats.push(t);
      hitFlags.push(false);
      scoredMiss.push(false);
      t += accentInterval;
    }
  }

  function accentAccuracy() {
    const n = expectedBeats.length;
    if (!n) return 0;
    return hits / n;
  }

  function updateReflexHUD(now) {
    const pct = Math.round(accentAccuracy() * 100);
    const done = hits + autoMisses;
    reflexScoreEl.textContent = hits + ' bonnes / ' + expectedBeats.length + ' · ' + pct + '%';
    const left = Math.max(0, REFLEX_DURATION_MS - (now - reflexStart));
    reflexTimerEl.textContent = (left / 1000).toFixed(1) + ' s';
    threadProgress = Math.min(1, (now - reflexStart) / REFLEX_DURATION_MS);
    void done;
  }

  function spawnRipple(good) {
    pulses.push({ born: performance.now(), life: 450, good: good, r0: 8 });
  }

  function registerTap(now) {
    if (phase !== 'reflex') return;
    let best = -1;
    let bestDist = HIT_WINDOW_MS + 1;
    for (let i = 0; i < expectedBeats.length; i++) {
      if (hitFlags[i] || scoredMiss[i]) continue;
      const d = Math.abs(now - expectedBeats[i]);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    if (best >= 0 && bestDist <= HIT_WINDOW_MS) {
      hitFlags[best] = true;
      hits++;
      spawnRipple(true);
    } else {
      spawnRipple(false);
    }
    updateReflexHUD(now);
  }

  function markPassedMisses(now) {
    for (let i = 0; i < expectedBeats.length; i++) {
      if (!hitFlags[i] && !scoredMiss[i] && now - expectedBeats[i] > HIT_WINDOW_MS) {
        scoredMiss[i] = true;
        autoMisses++;
      }
    }
  }

  function endReflex() {
    markPassedMisses(performance.now());
    reflexFailed = accentAccuracy() < REFLEX_PASS_RATIO;
    updateReflexHUD(performance.now());
    startCompass();
  }

  function startCompass() {
    showScreen('compass');
    shuffleOpts();
    compassChoiceCorrect = false;
    compassResolved = false;
    btnOui.disabled = true;
    ouiWrap.classList.remove('visible');
    compassOpts.classList.add('visible');
    compassHint.textContent = reflexFailed
      ? 'Réflexe fragile — choisis quand même la cause'
      : 'Choisis avant la fin de la mesure';
    compassDeadline = performance.now() + COMPASS_WINDOW_MS;
  }

  function onCompassPick(btn) {
    if (compassResolved || phase !== 'compass') return;
    const ok = btn.dataset.correct === '1';
    Array.from(compassOpts.querySelectorAll('.rc-opt')).forEach(function (b) {
      b.disabled = true;
      if (b === btn) b.classList.add(ok ? 'selected' : 'wrong');
    });
    if (!ok) {
      compassResolved = true;
      failOutcome('Mauvais choix — tu as subi la structure.');
      return;
    }
    compassChoiceCorrect = true;
    compassHint.textContent = 'Scelle par Oui — avant la fin de la fenêtre';
    ouiWrap.classList.add('visible');
    btnOui.disabled = false;
    const remain = compassDeadline - performance.now();
    if (remain < 900) compassDeadline = performance.now() + 900;
  }

  function onOui() {
    if (phase !== 'compass' || compassResolved) return;
    if (!compassChoiceCorrect) {
      compassResolved = true;
      failOutcome('Oui sans cause — le cadre ne tient pas.');
      return;
    }
    if (performance.now() > compassDeadline) {
      compassResolved = true;
      failOutcome('Trop tard — la mesure est passée.');
      return;
    }
    compassResolved = true;
    successOutcome();
  }

  function successOutcome() {
    saveUnlock();
    outcomeVeiled = false;
    showScreen('outcome');
    outcomeBox.className = 'rc-outcome success';
    outcomeTitle.textContent = 'Cadre posé';
    outcomeMsg.textContent =
      'Segment 0:00–0:33 dévoilé. Tu es la cause. Écoute clairement.';
    listenBar.classList.add('visible');
    btnRetry.hidden = true;
    btnListen.textContent = 'Écouter 0:00–0:33';
    ensureUnlockedListenBtn();
    playSegment(false);
  }

  function failOutcome(reason) {
    outcomeVeiled = true;
    showScreen('outcome');
    outcomeBox.className = 'rc-outcome fail';
    outcomeTitle.textContent = 'Voile encore là';
    outcomeMsg.textContent =
      (reason || "Le cadre n'est pas posé.") +
      ' Écoute voilée (filtre + désaccord). Repose le cadre.';
    listenBar.classList.add('visible');
    btnRetry.hidden = false;
    btnListen.textContent = 'Écouter voilé 0:00–0:33';
    playSegment(true);
  }

  function ensureUnlockedListenBtn() {
    if (document.getElementById('btn-listen-unlocked')) return;
    if (!unlocked) return;
    const extra = document.createElement('button');
    extra.type = 'button';
    extra.className = 'rc-btn ghost interactive';
    extra.style.marginTop = '0.75rem';
    extra.style.display = 'block';
    extra.style.marginLeft = 'auto';
    extra.style.marginRight = 'auto';
    extra.textContent = 'Écouter clairement 0:00–0:33';
    extra.id = 'btn-listen-unlocked';
    screens.intro.appendChild(extra);
    extra.addEventListener('click', async function () {
      try {
        await initAudio();
        playSegment(false);
      } catch (err) {
        console.error(err);
      }
    });
  }

  function showUnlockedIntro() {
    badge.classList.add('visible');
    introHint.textContent =
      'Cadre 1 déjà posé — tu peux réécouter clairement ou recommencer.';
    ensureUnlockedListenBtn();
  }

  function draw(now) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    const y = h * 0.58;
    const x0 = w * 0.08;
    const x1 = w * 0.92;
    const progress =
      phase === 'reflex' ? threadProgress : phase === 'intro' ? 0.15 : 1;
    const xEnd = x0 + (x1 - x0) * Math.max(0.12, progress);

    ctx.save();
    ctx.lineCap = 'round';
    const grad = ctx.createLinearGradient(x0, y, xEnd, y);
    grad.addColorStop(0, 'rgba(192,132,252,0.15)');
    grad.addColorStop(0.5, 'rgba(192,132,252,0.85)');
    grad.addColorStop(1, 'rgba(103,232,249,0.95)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(103,232,249,0.55)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(xEnd, y);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(168,155,196,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.restore();

    if (phase === 'reflex') {
      for (let i = 0; i < expectedBeats.length; i++) {
        const et = expectedBeats[i];
        const age = now - et;
        if (age > -600 && age < 400) {
          const u = (et - reflexStart) / REFLEX_DURATION_MS;
          const px = x0 + (x1 - x0) * Math.min(1, Math.max(0, u));
          const bright = age < 0 ? 1 - Math.abs(age) / 600 : 1 - age / 400;
          const r = 6 + (age < 0 ? 14 * (1 + age / 600) : 18 * (1 - age / 400));
          ctx.beginPath();
          ctx.arc(px, y, Math.max(2, r), 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(103,232,249,' + (0.15 + 0.55 * bright) + ')';
          ctx.shadowColor = '#67e8f9';
          ctx.shadowBlur = 20 * bright;
          ctx.fill();
          ctx.shadowBlur = 0;
          if (Math.abs(age) < 50) {
            ctx.beginPath();
            ctx.arc(px, y, 22, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(240,171,252,0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
            if (i !== lastAccentIdx && age >= 0) lastAccentIdx = i;
          }
        }
      }
    }

    pulses = pulses.filter(function (p) {
      return now - p.born < p.life;
    });
    pulses.forEach(function (p) {
      const u = (now - p.born) / p.life;
      const r = p.r0 + u * 50;
      ctx.beginPath();
      ctx.arc(w * 0.5, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = p.good
        ? 'rgba(52,211,153,' + (1 - u) + ')'
        : 'rgba(248,113,113,' + (1 - u) + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    if (phase === 'compass') {
      const cx = w * 0.5;
      const cy = h * 0.36;
      const R = Math.min(w, h) * 0.14;
      const remain = Math.max(0, compassDeadline - now);
      const frac = remain / COMPASS_WINDOW_MS;

      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(192,132,252,0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, R + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.strokeStyle = compassChoiceCorrect
        ? 'rgba(52,211,153,0.9)'
        : 'rgba(103,232,249,0.85)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, 'rgba(192,132,252,0.18)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
    }

    const t = now * 0.001;
    for (let i = 0; i < 18; i++) {
      const px = (Math.sin(t * 0.3 + i * 1.7) * 0.5 + 0.5) * w;
      const py = (Math.cos(t * 0.22 + i * 2.1) * 0.5 + 0.5) * h * 0.9;
      ctx.beginPath();
      ctx.arc(px, py, 1.2, 0, Math.PI * 2);
      ctx.fillStyle =
        i % 2 ? 'rgba(192,132,252,0.25)' : 'rgba(103,232,249,0.2)';
      ctx.fill();
    }
  }

  function loop(now) {
    draw(now);

    if (phase === 'reflex') {
      markPassedMisses(now);
      updateReflexHUD(now);
      if (now - reflexStart >= REFLEX_DURATION_MS) endReflex();
    }

    if (phase === 'compass' && !compassResolved) {
      const left = Math.max(0, compassDeadline - now);
      compassTimerEl.textContent = (left / 1000).toFixed(1) + ' s';
      if (left <= 0) {
        compassResolved = true;
        if (compassChoiceCorrect) {
          failOutcome('Oui non scellé à temps.');
        } else {
          failOutcome('Temps écoulé — la mesure est passée.');
        }
      }
    }

    requestAnimationFrame(loop);
  }

  function onPointer(e) {
    if (phase === 'reflex') {
      e.preventDefault();
      registerTap(performance.now());
    }
  }

  function onKey(e) {
    if (e.code === 'Space' || e.key === ' ') {
      if (phase === 'reflex') {
        e.preventDefault();
        registerTap(performance.now());
      } else if (
        phase === 'compass' &&
        compassChoiceCorrect &&
        !btnOui.disabled
      ) {
        e.preventDefault();
        onOui();
      }
    }
  }

  async function startGame() {
    btnStart.disabled = true;
    btnStart.textContent = 'Chargement…';
    try {
      await initAudio();
    } catch (err) {
      console.error(err);
      btnStart.disabled = false;
      btnStart.textContent = 'Commencer';
      introHint.textContent = "Impossible de charger l'audio. Réessaie.";
      return;
    }
    btnStart.disabled = false;
    btnStart.textContent = 'Commencer';

    hits = 0;
    autoMisses = 0;
    reflexFailed = false;
    lastAccentIdx = -1;
    pulses = [];
    threadProgress = 0;
    outcomeVeiled = false;
    stopPlayback();
    listenBar.classList.remove('visible');

    reflexStart = performance.now();
    buildBeatSchedule(reflexStart);
    showScreen('reflex');
  }

  btnStart.addEventListener('click', startGame);
  canvas.addEventListener('pointerdown', onPointer);
  window.addEventListener('keydown', onKey);

  compassOpts.addEventListener('click', function (e) {
    const btn = e.target.closest('.rc-opt');
    if (btn) onCompassPick(btn);
  });
  btnOui.addEventListener('click', onOui);

  btnListen.addEventListener('click', async function () {
    try {
      await initAudio();
    } catch (err) {
      console.error(err);
      return;
    }
    if (unlocked && !outcomeVeiled) playSegment(false);
    else if (unlocked) playSegment(false);
    else playSegment(true);
  });

  btnStop.addEventListener('click', stopPlayback);
  btnRetry.addEventListener('click', function () {
    stopPlayback();
    startGame();
  });

  window.addEventListener('resize', resize);
  resize();
  loadStorage();
  if (unlocked) showUnlockedIntro();
  requestAnimationFrame(loop);
})();
