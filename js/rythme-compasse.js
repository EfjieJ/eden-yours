/**
 * Rythme-Compasse — Step 1: L'illusion de fixité
 *                 — Step 2: Les deux faces
 * Standalone prototype for Eden Yours.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'eden-rythme-compasse';
  const AUDIO_URL = 'assets/audio/b0eb0f76-f2d8-4e16-85a9-037fc3f32b01.mp3';

  const STEP1_END = 33;
  const STEP2_START = 33;
  const STEP2_END = 66;

  const BPM = 90;
  const BEAT_MS = 60000 / BPM;
  const TERNARY = 3;
  const HIT_WINDOW_MS = 165;
  const REFLEX_PASS_RATIO = 0.7;

  const STEP1_REFLEX_MS = 20000;
  const STEP1_COMPASS_MS = 2000;

  const STEP2_BURST_MS = 2000;
  const STEP2_COMPASS_MS = 2200;
  const STEP2_BURSTS_PER_CYCLE = 3;
  const STEP2_CYCLES = 4;
  const STEP2_PASS_RATIO = 0.7;
  const TRANSITION_MS = 2200;

  const VEIL_LOWPASS = 750;
  const VEIL_DETUNE_CENTS = 30;

  const canvas = document.getElementById('rc-canvas');
  const ctx = canvas.getContext('2d');
  const badge1 = document.getElementById('rc-badge-1');
  const badge2 = document.getElementById('rc-badge-2');
  const screens = {
    intro: document.getElementById('screen-intro'),
    transition: document.getElementById('screen-transition'),
    reflex: document.getElementById('screen-reflex'),
    compass: document.getElementById('screen-compass'),
    outcome: document.getElementById('screen-outcome'),
  };
  const btnStart = document.getElementById('btn-start');
  const btnStep2 = document.getElementById('btn-step2');
  const introSubtitle = document.getElementById('intro-subtitle');
  const introHint = document.getElementById('intro-hint');
  const introListen = document.getElementById('intro-listen');
  const reflexPhaseLabel = document.getElementById('reflex-phase-label');
  const reflexHint = document.getElementById('reflex-hint');
  const reflexScoreEl = document.getElementById('reflex-score');
  const reflexTimerEl = document.getElementById('reflex-timer');
  const compassPhaseLabel = document.getElementById('compass-phase-label');
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
  const btnContinueStep2 = document.getElementById('btn-continue-step2');

  let audioCtx = null;
  let audioBuffer = null;
  let currentSource = null;
  let veilFilter = null;
  let gainNode = null;
  let detuneOsc = null;
  let detuneGain = null;

  let phase = 'intro';
  let currentStep = 1;
  let unlock = { step1: false, step2: false };
  let outcomeVeiled = false;
  let listenRange = { start: 0, end: STEP1_END };

  // Step 1 reflex
  let reflexFailed = false;
  let hits = 0;
  let autoMisses = 0;
  let expectedBeats = [];
  let hitFlags = [];
  let scoredMiss = [];
  let reflexStart = 0;
  let reflexDuration = STEP1_REFLEX_MS;
  let lastAccentIdx = -1;
  let compassDeadline = 0;
  let compassWindowMs = STEP1_COMPASS_MS;
  let compassChoiceCorrect = false;
  let compassResolved = false;
  let threadProgress = 0;
  let pulses = [];
  let tears = [];
  let threadMax = 0.55;

  // Step 2 state
  let s2BurstInCycle = 0;
  let s2Cycle = 0;
  let s2Correct = 0;
  let s2Total = 0;
  let s2OuiSealed = 0;
  let s2PlayVeil = false;
  let pendingTransition = null;

  const OPT_POOL_STEP1 = [
    { t: 'Je subis la structure', ok: false },
    { t: 'Je suis la cause', ok: true },
    { t: "J'attends la vie", ok: false },
  ];

  const OPT_POOL_STEP2 = [
    { t: 'Analyser', ok: true, face: 'analyser' },
    { t: 'Réagir', ok: false, face: 'reagir' },
  ];

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function renderCompassOpts(pool, faces) {
    const texts = shuffleInPlace(pool.slice());
    compassOpts.innerHTML = '';
    compassOpts.classList.toggle('faces', !!faces);
    texts.forEach(function (o) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rc-opt' + (o.face ? ' face-' + o.face : '');
      b.dataset.correct = o.ok ? '1' : '0';
      if (o.face) b.dataset.face = o.face;
      b.textContent = o.t;
      compassOpts.appendChild(b);
    });
  }

  function loadStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && data.step1 === true) unlock.step1 = true;
      if (data && data.step2 === true) unlock.step2 = true;
    } catch (_) {}
  }

  function persistUnlock() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          step1: unlock.step1,
          step2: unlock.step2,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (_) {}
    updateBadges();
  }

  function updateBadges() {
    badge1.classList.toggle('visible', unlock.step1);
    badge2.classList.toggle('visible', unlock.step2);
    badge2.classList.add('step2');
  }

  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle('active', k === name);
    });
    phase = name;
  }

  function setBodyVeil(on) {
    document.body.classList.toggle('rc-veiled', !!on);
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

  function playSegment(startSec, endSec, veiled) {
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

    const start = Math.max(0, startSec || 0);
    const end = Math.min(endSec || audioBuffer.duration, audioBuffer.duration);
    const dur = Math.max(0.05, end - start);
    src.start(0, start, dur);
    src.onended = function () {
      if (currentSource === src) {
        currentSource = null;
        btnStop.hidden = true;
      }
    };
    btnStop.hidden = false;
  }

  function buildBeatSchedule(startPerf, durationMs) {
    expectedBeats = [];
    hitFlags = [];
    scoredMiss = [];
    const accentInterval = BEAT_MS * TERNARY;
    let t = startPerf + Math.min(420, durationMs * 0.35);
    const end = startPerf + durationMs;
    while (t < end - 80) {
      expectedBeats.push(t);
      hitFlags.push(false);
      scoredMiss.push(false);
      t += accentInterval;
    }
    if (!expectedBeats.length) {
      expectedBeats.push(startPerf + durationMs * 0.5);
      hitFlags.push(false);
      scoredMiss.push(false);
    }
  }

  function accentAccuracy() {
    const n = expectedBeats.length;
    if (!n) return 0;
    return hits / n;
  }

  function updateReflexHUD(now) {
    if (currentStep === 2) {
      const pct = s2Total ? Math.round((s2Correct / s2Total) * 100) : 0;
      reflexScoreEl.textContent =
        'Gestes ' +
        s2Correct +
        '/' +
        s2Total +
        ' · ' +
        pct +
        '% · cycle ' +
        (s2Cycle + 1) +
        '/' +
        STEP2_CYCLES +
        ' · burst ' +
        (s2BurstInCycle + 1) +
        '/' +
        STEP2_BURSTS_PER_CYCLE;
    } else {
      const pct = Math.round(accentAccuracy() * 100);
      reflexScoreEl.textContent =
        hits + ' bonnes / ' + expectedBeats.length + ' · ' + pct + '%';
    }
    const left = Math.max(0, reflexDuration - (now - reflexStart));
    reflexTimerEl.textContent = (left / 1000).toFixed(1) + ' s';
    const localProg = Math.min(1, (now - reflexStart) / reflexDuration);
    if (currentStep === 1) {
      threadProgress = 0.12 + 0.43 * localProg;
      threadMax = 0.55;
    } else {
      const overall =
        (s2Cycle * (STEP2_BURSTS_PER_CYCLE + 1) + s2BurstInCycle + localProg) /
        (STEP2_CYCLES * (STEP2_BURSTS_PER_CYCLE + 1));
      // Extend past step1 (~0.55) toward ~0.92
      threadProgress = 0.55 + 0.37 * Math.min(1, Math.max(0, overall));
      threadMax = 0.92;
    }
  }

  function spawnRipple(good) {
    pulses.push({ born: performance.now(), life: 450, good: good, r0: 8 });
  }

  function spawnTear() {
    const now = performance.now();
    tears.push({ born: now, life: 1400, x: 0.35 + Math.random() * 0.35 });
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
      if (currentStep === 2) {
        s2Correct++;
        s2Total++;
      }
    } else {
      spawnRipple(false);
      if (currentStep === 2) {
        s2Total++;
      }
    }
    updateReflexHUD(now);
  }

  function markPassedMisses(now) {
    for (let i = 0; i < expectedBeats.length; i++) {
      if (!hitFlags[i] && !scoredMiss[i] && now - expectedBeats[i] > HIT_WINDOW_MS) {
        scoredMiss[i] = true;
        autoMisses++;
        if (currentStep === 2) s2Total++;
      }
    }
  }

  function endReflex() {
    markPassedMisses(performance.now());
    if (currentStep === 1) {
      reflexFailed = accentAccuracy() < REFLEX_PASS_RATIO;
      updateReflexHUD(performance.now());
      startCompassStep1();
      return;
    }
    // Step 2: after each burst, either next burst or compass
    s2BurstInCycle++;
    if (s2BurstInCycle < STEP2_BURSTS_PER_CYCLE) {
      startStep2Burst();
    } else {
      startCompassStep2();
    }
  }

  function startCompassStep1() {
    showScreen('compass');
    renderCompassOpts(OPT_POOL_STEP1, false);
    compassPhaseLabel.textContent = 'Phase COMPAS';
    compassChoiceCorrect = false;
    compassResolved = false;
    compassWindowMs = STEP1_COMPASS_MS;
    btnOui.disabled = true;
    ouiWrap.classList.remove('visible');
    compassOpts.classList.add('visible');
    compassHint.textContent = reflexFailed
      ? 'Réflexe fragile — choisis quand même la cause'
      : 'Choisis avant la fin de la mesure';
    compassDeadline = performance.now() + compassWindowMs;
  }

  function startCompassStep2() {
    showScreen('compass');
    renderCompassOpts(OPT_POOL_STEP2, true);
    compassPhaseLabel.textContent = 'COMPAS — Les deux faces';
    compassChoiceCorrect = false;
    compassResolved = false;
    compassWindowMs = STEP2_COMPASS_MS;
    btnOui.disabled = true;
    ouiWrap.classList.remove('visible');
    compassOpts.classList.add('visible');
    compassHint.textContent = 'Analyser (compas) ou Réagir (piège)';
    compassDeadline = performance.now() + compassWindowMs;
    const overall =
      (s2Cycle * (STEP2_BURSTS_PER_CYCLE + 1) + STEP2_BURSTS_PER_CYCLE) /
      (STEP2_CYCLES * (STEP2_BURSTS_PER_CYCLE + 1));
    threadProgress = 0.55 + 0.37 * Math.min(1, Math.max(0, overall));
  }

  function onCompassPick(btn) {
    if (compassResolved || phase !== 'compass') return;
    const ok = btn.dataset.correct === '1';
    const face = btn.dataset.face || '';

    Array.from(compassOpts.querySelectorAll('.rc-opt')).forEach(function (b) {
      b.disabled = true;
      if (b === btn) b.classList.add(ok ? 'selected' : 'wrong');
    });

    if (currentStep === 1) {
      if (!ok) {
        compassResolved = true;
        failOutcomeStep1('Mauvais choix — tu as subi la structure.');
        return;
      }
      compassChoiceCorrect = true;
      compassHint.textContent = 'Scelle par Oui — avant la fin de la fenêtre';
      ouiWrap.classList.add('visible');
      btnOui.disabled = false;
      const remain = compassDeadline - performance.now();
      if (remain < 900) compassDeadline = performance.now() + 900;
      return;
    }

    // Step 2
    if (face === 'reagir' || !ok) {
      // Trap: blur + tear, count as bad gesture, continue cycle
      compassResolved = true;
      s2Total++;
      s2PlayVeil = true;
      setBodyVeil(true);
      spawnTear();
      spawnRipple(false);
      compassHint.textContent = 'Réagir sans pause — le Fil se déchire…';
      setTimeout(function () {
        setBodyVeil(false);
        afterStep2CompassCycle(false);
      }, 700);
      return;
    }

    // Analyser chosen
    compassChoiceCorrect = true;
    compassHint.textContent = 'Calme — scelle par Oui au centre';
    ouiWrap.classList.add('visible');
    btnOui.disabled = false;
    const remain = compassDeadline - performance.now();
    if (remain < 1000) compassDeadline = performance.now() + 1000;
  }

  function onOui() {
    if (phase !== 'compass' || compassResolved) return;
    if (!compassChoiceCorrect) {
      compassResolved = true;
      if (currentStep === 1) {
        failOutcomeStep1('Oui sans cause — le cadre ne tient pas.');
      } else {
        s2Total++;
        afterStep2CompassCycle(false);
      }
      return;
    }
    if (performance.now() > compassDeadline) {
      compassResolved = true;
      if (currentStep === 1) {
        failOutcomeStep1('Trop tard — la mesure est passée.');
      } else {
        s2Total++;
        afterStep2CompassCycle(false);
      }
      return;
    }
    compassResolved = true;
    if (currentStep === 1) {
      successOutcomeStep1();
    } else {
      s2Correct++;
      s2Total++;
      s2OuiSealed++;
      spawnRipple(true);
      afterStep2CompassCycle(true);
    }
  }

  function afterStep2CompassCycle(ok) {
    void ok;
    s2Cycle++;
    s2BurstInCycle = 0;
    if (s2Cycle >= STEP2_CYCLES) {
      finishStep2();
      return;
    }
    // Brief calm then next bursts
    setTimeout(startStep2Burst, 450);
  }

  function finishStep2() {
    const ratio = s2Total ? s2Correct / s2Total : 0;
    const pass = ratio >= STEP2_PASS_RATIO && s2OuiSealed >= 1;
    if (pass) successOutcomeStep2(ratio);
    else failOutcomeStep2(ratio);
  }

  function successOutcomeStep1() {
    unlock.step1 = true;
    persistUnlock();
    outcomeVeiled = false;
    listenRange = { start: 0, end: STEP1_END };
    showScreen('outcome');
    outcomeBox.className = 'rc-outcome success';
    outcomeTitle.textContent = 'Cadre 1 posé';
    outcomeMsg.textContent =
      'Segment 0:00–0:33 dévoilé. Passage vers Les deux faces…';
    listenBar.classList.add('visible');
    btnRetry.hidden = true;
    btnContinueStep2.hidden = false;
    btnListen.textContent = 'Écouter 0:00–0:33';
    playSegment(0, STEP1_END, false);
    // Auto-chain into step 2 after short listen cue
    clearTimeout(pendingTransition);
    pendingTransition = setTimeout(function () {
      stopPlayback();
      beginTransitionToStep2();
    }, 2800);
  }

  function failOutcomeStep1(reason) {
    outcomeVeiled = true;
    listenRange = { start: 0, end: STEP1_END };
    showScreen('outcome');
    outcomeBox.className = 'rc-outcome fail';
    outcomeTitle.textContent = 'Voile encore là';
    outcomeMsg.textContent =
      (reason || "Le cadre n'est pas posé.") +
      ' Écoute voilée (filtre + désaccord). Repose le cadre.';
    listenBar.classList.add('visible');
    btnRetry.hidden = false;
    btnContinueStep2.hidden = true;
    btnListen.textContent = 'Écouter voilé 0:00–0:33';
    btnRetry.textContent = 'Reposer le cadre';
    playSegment(0, STEP1_END, true);
  }

  function successOutcomeStep2(ratio) {
    unlock.step2 = true;
    unlock.step1 = true;
    persistUnlock();
    outcomeVeiled = false;
    s2PlayVeil = false;
    setBodyVeil(false);
    listenRange = { start: STEP2_START, end: STEP2_END };
    showScreen('outcome');
    outcomeBox.className = 'rc-outcome success';
    outcomeTitle.textContent = 'Cadre 2 — Les deux faces';
    outcomeMsg.textContent =
      'Segment 0:33–1:06 dévoilé (' +
      Math.round(ratio * 100) +
      '% gestes, ' +
      s2OuiSealed +
      ' Oui). Tu as analysé avant d\'agir.';
    listenBar.classList.add('visible');
    btnRetry.hidden = true;
    btnContinueStep2.hidden = true;
    btnListen.textContent = 'Écouter 0:33–1:06';
    refreshIntroListen();
    playSegment(STEP2_START, STEP2_END, false);
  }

  function failOutcomeStep2(ratio) {
    outcomeVeiled = true;
    s2PlayVeil = true;
    setBodyVeil(true);
    listenRange = { start: STEP2_START, end: STEP2_END };
    showScreen('outcome');
    outcomeBox.className = 'rc-outcome fail';
    outcomeTitle.textContent = 'Voile sur 0:33–1:06';
    const pct = Math.round(ratio * 100);
    outcomeMsg.textContent =
      'Gestes ' +
      pct +
      '% (besoin ≥70%) · Oui scellés : ' +
      s2OuiSealed +
      '. Le segment reste voilé. Repose le cadre 2.';
    listenBar.classList.add('visible');
    btnRetry.hidden = false;
    btnContinueStep2.hidden = true;
    btnRetry.textContent = 'Reposer le cadre';
    btnListen.textContent = 'Écouter voilé 0:33–1:06';
    playSegment(STEP2_START, STEP2_END, true);
  }

  function refreshIntroListen() {
    introListen.innerHTML = '';
    introListen.classList.remove('visible');
    if (!unlock.step1 && !unlock.step2) return;
    introListen.classList.add('visible');
    if (unlock.step1) {
      const b1 = document.createElement('button');
      b1.type = 'button';
      b1.className = 'rc-btn ghost interactive';
      b1.textContent = 'Écouter 0:00–0:33';
      b1.addEventListener('click', async function () {
        try {
          await initAudio();
          playSegment(0, STEP1_END, false);
        } catch (err) {
          console.error(err);
        }
      });
      introListen.appendChild(b1);
    }
    if (unlock.step2) {
      const b2 = document.createElement('button');
      b2.type = 'button';
      b2.className = 'rc-btn ghost interactive';
      b2.textContent = 'Écouter 0:33–1:06';
      b2.addEventListener('click', async function () {
        try {
          await initAudio();
          playSegment(STEP2_START, STEP2_END, false);
        } catch (err) {
          console.error(err);
        }
      });
      introListen.appendChild(b2);
    }
    if (unlock.step1 && unlock.step2) {
      const ball = document.createElement('button');
      ball.type = 'button';
      ball.className = 'rc-btn ghost interactive';
      ball.textContent = 'Écouter 0:00–1:06';
      ball.addEventListener('click', async function () {
        try {
          await initAudio();
          playSegment(0, STEP2_END, false);
        } catch (err) {
          console.error(err);
        }
      });
      introListen.appendChild(ball);
    }
  }

  function showUnlockedIntro() {
    updateBadges();
    refreshIntroListen();
    if (unlock.step1 && unlock.step2) {
      introSubtitle.textContent = 'Cadres 1 & 2 posés';
      introHint.textContent =
        'Les deux segments sont clairs. Réécoute ou rejoue une étape.';
      btnStart.textContent = 'Rejouer étape 1';
      btnStep2.hidden = false;
      btnStep2.textContent = 'Rejouer étape 2';
    } else if (unlock.step1) {
      introSubtitle.textContent = 'Cadre 1 posé · Étape 2 disponible';
      introHint.textContent =
        'Continue vers Les deux faces, ou réécoute 0:00–0:33.';
      btnStart.textContent = 'Rejouer étape 1';
      btnStep2.hidden = false;
      btnStep2.textContent = 'Continuer étape 2';
    }
  }

  function beginTransitionToStep2() {
    clearTimeout(pendingTransition);
    pendingTransition = null;
    btnContinueStep2.hidden = true;
    stopPlayback();
    setBodyVeil(false);
    showScreen('transition');
    setTimeout(function () {
      startStep2();
    }, TRANSITION_MS);
  }

  function startStep2Burst() {
    currentStep = 2;
    hits = 0;
    autoMisses = 0;
    lastAccentIdx = -1;
    pulses = [];
    reflexDuration = STEP2_BURST_MS;
    reflexPhaseLabel.textContent =
      'RÉFLEXE · burst ' +
      (s2BurstInCycle + 1) +
      '/' +
      STEP2_BURSTS_PER_CYCLE;
    reflexHint.textContent = 'Pulse rapide — tape sur le Fil';
    reflexStart = performance.now();
    buildBeatSchedule(reflexStart, reflexDuration);
    showScreen('reflex');
    updateReflexHUD(reflexStart);
  }

  function resetStep2State() {
    s2BurstInCycle = 0;
    s2Cycle = 0;
    s2Correct = 0;
    s2Total = 0;
    s2OuiSealed = 0;
    s2PlayVeil = false;
    tears = [];
    threadProgress = 0.55;
    threadMax = 0.92;
    setBodyVeil(false);
  }

  async function startStep2() {
    clearTimeout(pendingTransition);
    btnStart.disabled = true;
    try {
      await initAudio();
    } catch (err) {
      console.error(err);
      btnStart.disabled = false;
      introHint.textContent = "Impossible de charger l'audio. Réessaie.";
      showScreen('intro');
      return;
    }
    btnStart.disabled = false;
    stopPlayback();
    listenBar.classList.remove('visible');
    btnRetry.hidden = true;
    btnContinueStep2.hidden = true;
    resetStep2State();
    currentStep = 2;
    // If step1 clear, briefly show extended thread base
    if (unlock.step1) threadProgress = 0.55;
    startStep2Burst();
  }

  async function startGameStep1() {
    clearTimeout(pendingTransition);
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
    btnStart.textContent = unlock.step1 ? 'Rejouer étape 1' : 'Commencer';

    currentStep = 1;
    hits = 0;
    autoMisses = 0;
    reflexFailed = false;
    lastAccentIdx = -1;
    pulses = [];
    tears = [];
    threadProgress = 0;
    threadMax = 0.55;
    outcomeVeiled = false;
    s2PlayVeil = false;
    setBodyVeil(false);
    stopPlayback();
    listenBar.classList.remove('visible');
    btnContinueStep2.hidden = true;
    btnRetry.hidden = true;

    reflexDuration = STEP1_REFLEX_MS;
    reflexPhaseLabel.textContent = 'Phase RÉFLEXE';
    reflexHint.textContent = 'Tape au rythme des pulsations sur le Fil';
    reflexStart = performance.now();
    buildBeatSchedule(reflexStart, reflexDuration);
    showScreen('reflex');
  }

  function draw(now) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    const y = h * 0.58;
    const x0 = w * 0.08;
    const x1 = w * 0.92;
    let progress;
    if (phase === 'intro') {
      progress = unlock.step2 ? 0.92 : unlock.step1 ? 0.55 : 0.15;
    } else if (phase === 'transition') {
      progress = 0.55 + 0.12 * Math.min(1, ((now / 1000) % 2));
    } else if (phase === 'reflex' || phase === 'compass') {
      progress = Math.min(1, Math.max(0.12, threadProgress));
    } else {
      progress = unlock.step2 || (currentStep === 2 && !outcomeVeiled) ? 0.92 : unlock.step1 ? 0.55 : 0.35;
    }
    const xEnd = x0 + (x1 - x0) * Math.max(0.12, Math.min(1, progress));

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

    // Draw with tears (gaps) if any active
    const activeTears = tears.filter(function (t) {
      return now - t.born < t.life;
    });
    if (activeTears.length && (phase === 'compass' || phase === 'reflex' || phase === 'outcome')) {
      let cursor = x0;
      const segments = activeTears
        .slice()
        .sort(function (a, b) {
          return a.x - b.x;
        });
      segments.forEach(function (tear) {
        const tx = x0 + (x1 - x0) * tear.x;
        const gap = 14 + 10 * (1 - (now - tear.born) / tear.life);
        if (tx - gap > cursor) {
          ctx.lineTo(tx - gap, y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(tx + gap, y);
        }
        cursor = tx + gap;
        // Tear sparks
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.fillStyle =
          'rgba(248,113,113,' + (1 - (now - tear.born) / tear.life) + ')';
        ctx.beginPath();
        ctx.arc(tx, y + Math.sin((now - tear.born) * 0.02) * 8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(103,232,249,0.55)';
        ctx.shadowBlur = 18;
      });
      if (cursor < xEnd) {
        ctx.lineTo(xEnd, y);
        ctx.stroke();
      }
    } else {
      ctx.lineTo(xEnd, y);
      ctx.stroke();
    }

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
          const u = (et - reflexStart) / reflexDuration;
          const px = x0 + (xEnd - x0) * Math.min(1, Math.max(0, u));
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

    tears = tears.filter(function (t) {
      return now - t.born < t.life;
    });

    if (phase === 'compass') {
      const cx = w * 0.5;
      const cy = h * 0.34;
      const R = Math.min(w, h) * (currentStep === 2 ? 0.16 : 0.14);
      const remain = Math.max(0, compassDeadline - now);
      const frac = remain / compassWindowMs;

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

      if (currentStep === 2) {
        ctx.fillStyle = 'rgba(168,155,196,0.55)';
        ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
        ctx.textAlign = 'center';
        ctx.fillText('compas', cx, cy + R + 22);
      }
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
      if (now - reflexStart >= reflexDuration) endReflex();
    }

    if (phase === 'compass' && !compassResolved) {
      const left = Math.max(0, compassDeadline - now);
      compassTimerEl.textContent = (left / 1000).toFixed(1) + ' s';
      if (left <= 0) {
        compassResolved = true;
        if (currentStep === 1) {
          if (compassChoiceCorrect) {
            failOutcomeStep1('Oui non scellé à temps.');
          } else {
            failOutcomeStep1('Temps écoulé — la mesure est passée.');
          }
        } else {
          if (compassChoiceCorrect) {
            // Analysed but no Oui
            s2Total++;
            afterStep2CompassCycle(false);
          } else {
            // No choice at all
            s2Total++;
            spawnTear();
            afterStep2CompassCycle(false);
          }
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

  btnStart.addEventListener('click', startGameStep1);
  btnStep2.addEventListener('click', async function () {
    btnStep2.disabled = true;
    try {
      await initAudio();
    } catch (err) {
      console.error(err);
      btnStep2.disabled = false;
      return;
    }
    btnStep2.disabled = false;
    beginTransitionToStep2();
  });
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
    const veiled = outcomeVeiled;
    // Prefer clear if already unlocked for this range
    if (currentStep === 2) {
      const clear = unlock.step2 && !outcomeVeiled;
      playSegment(STEP2_START, STEP2_END, !clear && veiled);
    } else {
      const clear = unlock.step1 && !outcomeVeiled;
      playSegment(0, STEP1_END, !clear && veiled);
    }
  });

  btnStop.addEventListener('click', stopPlayback);

  btnRetry.addEventListener('click', function () {
    stopPlayback();
    setBodyVeil(false);
    clearTimeout(pendingTransition);
    if (currentStep === 2 || (unlock.step1 && outcomeVeiled && listenRange.start >= STEP2_START)) {
      beginTransitionToStep2();
    } else {
      startGameStep1();
    }
  });

  btnContinueStep2.addEventListener('click', function () {
    clearTimeout(pendingTransition);
    stopPlayback();
    beginTransitionToStep2();
  });

  window.addEventListener('resize', resize);
  resize();
  loadStorage();
  updateBadges();
  if (unlock.step1 || unlock.step2) showUnlockedIntro();
  requestAnimationFrame(loop);
})();
