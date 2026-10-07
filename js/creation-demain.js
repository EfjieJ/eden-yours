/**
 * Création-Demain — enchaînement ordonné + réaction à l'écran.
 * Densifie une silhouette hologramme consciente (0→100%).
 * Victoire : lecture locale de « Tout ce que je demande… »
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'eden-creation-demain';
  const PASS_RATIO = 0.7;
  const HIT_WINDOW_MS = 160;
  const TRANSITION_MS = 2200;
  const VICTORY_AUDIO = 'assets/audio/2c8a36c9-4207-41b9-80e9-bf78313c2099.mp3';
  const VICTORY_AUDIO_AAC = 'assets/audio/2c8a36c9-4207-41b9-80e9-bf78313c2099.m4a';
  const VICTORY_SUNO = 'https://suno.com/s/xEWZPaMo5HSbXeMp';
  const VICTORY_TITLE = "Tout ce que je demande l'univers me le donne";

  // ——— Langue : suit le choix du site (EdenI18n / localStorage « eden-lang »). Les titres de chansons ne sont jamais traduits.
  function isEn() {
    try { if (window.EdenI18n && window.EdenI18n.getLang) return window.EdenI18n.getLang() === 'en'; } catch (_) {}
    try { return localStorage.getItem('eden-lang') === 'en'; } catch (_) { return false; }
  }
  const EN_TEXT = {
      "Courir": "Run",
      "Respirer": "Breathe",
      "Toucher l'arbre": "Touch the tree",
      "Crier": "Shout",
      "Sauter": "Jump",
      "Danser": "Dance",
      "Hésiter": "Hesitate",
      "Attendre": "Wait",
      "Douter": "Doubt",
      "Subir": "Endure",
      "Clarté": "Clarity",
      "Force": "Strength",
      "Joie": "Joy",
      "Amour": "Love",
      "Le Fil s’adoucit. Respire. Puis reprends.": "The Thread softens. Breathe. Then begin again.",
      "Marche en forêt": "Walk in the forest",
      "Je marche dans la forêt.": "I walk in the forest.",
      "Tape chaque pas lumineux dans l’ordre, au rythme.": "Tap each glowing step in order, on the beat.",
      "Mains dans la terre": "Hands in the earth",
      "Mes mains touchent la terre froide.": "My hands touch the cool earth.",
      "Maintiens, puis relâche exactement à la marque.": "Hold, then release right at the mark.",
      "Yeux au ciel": "Eyes to the sky",
      "Mes yeux montent vers le ciel.": "My eyes rise toward the sky.",
      "Suis l’étoile qui s’élève — tape au zénith.": "Follow the rising star — tap at the zenith.",
      "Course dans le champ": "Run through the field",
      "Je cours dans le champ.": "I run through the field.",
      "Tape le corridor qui s’ouvre, dans l’ordre des ouvertures.": "Tap each corridor as it opens, in the order they open.",
      "Frappe du pied": "Stamp of the foot",
      "Je frappe le sol.": "I stamp the ground.",
      "Enchaîne les frappes au tempo — pas trop tôt.": "Chain the stamps on the tempo — not too early.",
      "Respiration": "Breathing",
      "Je respire.": "I breathe.",
      "Inspire jusqu’à la marque, expire à la seconde.": "Breathe in to the mark, breathe out on the second.",
      "Saut du ruisseau": "Leap over the stream",
      "Je saute le ruisseau.": "I leap over the stream.",
      "Sauter seulement dans la fenêtre courte.": "Jump only in the short window.",
      "Cri vers le ciel": "Shout to the sky",
      "Je crie vers le ciel.": "I shout to the sky.",
      "Tape en tempo pour charger, puis scelle par Oui.": "Tap on the tempo to charge, then seal with Yes.",
      "Acte I · Présence": "Act I · Presence",
      "Chaque geste densifie la silhouette.": "Each gesture makes the silhouette denser.",
      "Passage": "Passage",
      "Présence encore légère. Reposons les gestes.": "Presence still light. Let’s lay down the gestures again.",
      "Le chemin s’estompe. Repose le pas.": "The path fades. Take the step again.",
      "Tenir": "Hold",
      "Relâcher": "Release",
      "Terre": "Earth",
      "Trop tôt ou trop tard. La terre attend le juste geste.": "Too early or too late. The earth awaits the right gesture.",
      "La pulsation est passée. Repose le geste.": "The pulse has passed. Make the gesture again.",
      "Bas": "Low",
      "Milieu": "Middle",
      "Haut": "High",
      "Zénith": "Zenith",
      "L'étoile s'éloigne. Repose le regard.": "The star drifts away. Rest your gaze and try again.",
      "Le champ se referme. Reprends la course.": "The field closes. Run again.",
      "Mauvaise voie. Le champ se referme.": "Wrong path. The field closes.",
      "Frapper": "Stamp",
      "Le tempo s’est perdu. Repose le pied.": "The tempo slipped away. Set your foot down again.",
      "Frappe au moment où le bouton pulse.": "Stamp the moment the button pulses.",
      "Inspirer": "Breathe in",
      "Expirer": "Breathe out",
      "Le souffle n’a pas trouvé la marque.": "The breath didn’t find the mark.",
      "L’expire est passé à côté. Repose.": "The out-breath missed. Rest and try again.",
      "Le ruisseau s’est refermé.": "The stream has closed.",
      "Trop tôt. Attends l’ouverture.": "Too early. Wait for the opening.",
      "Hors tempo. Le cri veut un rythme vivant.": "Off tempo. The shout wants a living rhythm.",
      "Scelle par Oui au sommet.": "Seal with Yes at the peak.",
      "Le Oui s’est éteint. Reprends le cri.": "The Yes went out. Shout again.",
      "Acte II · Choix": "Act II · Choice",
      "C’est moi qui crée, c’est moi qui choisis mon demain.": "I am the one who creates, I am the one who chooses my tomorrow.",
      "Choisis un vrai geste, dans l’ordre du Fil, puis scelle par Oui.": "Choose a true gesture, in the order of the Thread, then seal with Yes.",
      "Ce n’est pas le geste du Fil. Repose le choix.": "That isn’t the Thread’s gesture. Choose again.",
      "Le Oui s’allume — scelle maintenant.": "The Yes lights up — seal it now.",
      "Le Oui n’a pas été scellé à temps.": "The Yes wasn’t sealed in time.",
      "Le temps du choix est passé. Reprends.": "The moment to choose has passed. Begin again.",
      "Acte III · Demande & réception": "Act III · Asking & receiving",
      "Demande. Attrape ta vibration. Reçois par Oui.": "Ask. Catch your vibration. Receive with Yes.",
      "Acte III · Demande": "Act III · Asking",
      "Que demandes-tu à l’univers ?": "What are you asking of the universe?",
      "Choisis une vibration, puis attrape seulement ce qui lui répond.": "Choose a vibration, then catch only what answers it.",
      "Acte III · Réception": "Act III · Receiving",
      "Tout ce que je demande, l’univers me le donne.": "Everything I ask for, the universe gives me.",
      "Réception · 0/5": "Receiving · 0/5",
      "Immobilité… puis Oui.": "Stillness… then Yes.",
      "L’univers entier répond à mon oui.": "The whole universe answers my yes.",
      "La réception s’est dissipée. Demande à nouveau.": "The receiving faded. Ask again.",
      "Trop de fausses vibrations. Repose la demande.": "Too many false vibrations. Ask once more.",
      "Oui": "Yes"
  };
  function tx(s) { return isEn() && EN_TEXT[s] ? EN_TEXT[s] : s; }
  // En anglais : une chanson anglaise réelle (même langue que le site) au lieu de la chanson française.
  const VICTORY_EN = {
    audio: 'assets/audio/a5ba4262-22f6-4c9c-a6df-05bff2d5e713.mp3',
    aac: 'assets/audio/a5ba4262-22f6-4c9c-a6df-05bff2d5e713.m4a',
    suno: 'https://suno.com/s/1yb6CMDvvcr2hmCZ',
    title: 'The Body Is an Antenna'
  };

  const GESTES_VRAIS = [
    { id: 'courir', label: tx('Courir') },
    { id: 'respirer', label: tx('Respirer') },
    { id: 'toucher', label: tx("Toucher l'arbre") },
    { id: 'crier', label: tx('Crier') },
    { id: 'sauter', label: tx('Sauter') },
    { id: 'danser', label: tx('Danser') },
  ];
  const GESTES_PIEGES = [
    { id: 'hesiter', label: tx('Hésiter'), trap: true },
    { id: 'attendre', label: tx('Attendre'), trap: true },
    { id: 'douter', label: tx('Douter'), trap: true },
    { id: 'subir', label: tx('Subir'), trap: true },
  ];
  const DEMANDES = [
    { id: 'clarte', label: tx('Clarté'), color: '#67e8f9' },
    { id: 'force', label: tx('Force'), color: '#c084fc' },
    { id: 'joie', label: tx('Joie'), color: '#f0abfc' },
    { id: 'amour', label: tx('Amour'), color: '#34d399' },
  ];

  // ——— DOM ———
  const canvas = document.getElementById('cd-canvas');
  const ctx = canvas.getContext('2d');
  const densityFill = document.getElementById('density-fill');
  const densityPct = document.getElementById('density-pct');
  const screens = {
    intro: document.getElementById('screen-intro'),
    transition: document.getElementById('screen-transition'),
    play: document.getElementById('screen-play'),
    veil: document.getElementById('screen-veil'),
    finale: document.getElementById('screen-finale'),
  };
  const playPhase = document.getElementById('play-phase');
  const playLyric = document.getElementById('play-lyric');
  const playHint = document.getElementById('play-hint');
  const playScore = document.getElementById('play-score');
  const cueZone = document.getElementById('cue-zone');
  const seqStrip = document.getElementById('seq-strip');
  const ouiWrap = document.getElementById('oui-wrap');
  const btnOui = document.getElementById('btn-oui');
  const transPhase = document.getElementById('trans-phase');
  const transTitle = document.getElementById('trans-title');
  const transHint = document.getElementById('trans-hint');
  const veilHint = document.getElementById('veil-hint');
  const btnStart = document.getElementById('btn-start');
  const btnRetry = document.getElementById('btn-retry');
  const btnReplay = document.getElementById('btn-replay');

  // ——— State ———
  let density = 0; // 0..100
  let acte = 0; // 1,2,3
  let microIndex = 0;
  let acte1Hits = 0;
  let acte1Total = 0;
  let lastDemande = null;
  let retryCallback = null;
  let timers = [];
  let rafId = 0;
  let running = false;
  let victoryAudio = null;
  let pulseT = 0;
  let filaments = [];
  let hologramFlash = 0;
  let cueArmed = false;
  let seqProgress = 0;
  let currentSeq = [];
  let holdState = null;
  let particleState = null;

  // ——— Storage ———
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.density === 'number') density = Math.max(0, Math.min(100, data.density));
      if (data.lastDemande) lastDemande = data.lastDemande;
    } catch (_) {}
  }
  function saveProgress(extra) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          density: Math.round(density),
          acteCleared: acte,
          lastDemande: lastDemande,
          updatedAt: Date.now(),
          ...(extra || {}),
        })
      );
    } catch (_) {}
  }

  // ——— UI helpers ———
  function showScreen(name) {
    Object.keys(screens).forEach((k) => {
      screens[k].classList.toggle('active', k === name);
    });
  }
  function setVeil(on) {
    document.body.classList.toggle('cd-veiled', !!on);
  }
  function clearTimers() {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  }
  function later(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }
  function setOui(visible, enabled) {
    ouiWrap.classList.toggle('visible', !!visible);
    btnOui.disabled = !enabled;
    btnOui.classList.toggle('open', !!enabled);
  }
  function updateDensityUI() {
    const d = Math.round(Math.max(0, Math.min(100, density)));
    densityFill.style.width = d + '%';
    densityPct.textContent = d + '%';
  }
  function addDensity(amount) {
    const prev = density;
    density = Math.max(0, Math.min(100, density + amount));
    if (density > prev) hologramFlash = 1;
    updateDensityUI();
    saveProgress();
  }
  function softDim(amount) {
    density = Math.max(0, density - (amount || 3));
    updateDensityUI();
    saveProgress();
  }
  function clearPlayUI() {
    cueZone.innerHTML = '';
    cueZone.className = 'cd-cue-zone interactive';
    seqStrip.innerHTML = '';
    setOui(false, false);
    holdState = null;
    particleState = null;
    cueArmed = false;
    seqProgress = 0;
    currentSeq = [];
  }
  function renderSeqStrip(seq, progress) {
    seqStrip.innerHTML = '';
    seq.forEach((step, i) => {
      const chip = document.createElement('span');
      chip.className = 'cd-seq-chip';
      chip.textContent = step.label || step;
      if (i < progress) chip.classList.add('done');
      else if (i === progress) chip.classList.add('next');
      seqStrip.appendChild(chip);
    });
  }

  // ——— Canvas: body + luminous hologram ———
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function initFilaments() {
    filaments = [];
    for (let i = 0; i < 18; i++) {
      filaments.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.00025,
        vy: (Math.random() - 0.5) * 0.0002,
        a: 0.15 + Math.random() * 0.35,
      });
    }
  }
  function drawSilhouette(cx, cy, scale, alpha, fill, glow) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    if (glow) {
      ctx.shadowColor = glow;
      ctx.shadowBlur = 28;
    }
    ctx.beginPath();
    // Head
    ctx.arc(0, -78, 18, 0, Math.PI * 2);
    // Neck + torso
    ctx.moveTo(0, -60);
    ctx.bezierCurveTo(-8, -55, -22, -40, -28, -10);
    ctx.bezierCurveTo(-30, 20, -26, 45, -18, 70);
    ctx.lineTo(-22, 110);
    ctx.lineTo(-8, 110);
    ctx.lineTo(-4, 72);
    ctx.lineTo(4, 72);
    ctx.lineTo(8, 110);
    ctx.lineTo(22, 110);
    ctx.lineTo(18, 70);
    ctx.bezierCurveTo(26, 45, 30, 20, 28, -10);
    ctx.bezierCurveTo(22, -40, 8, -55, 0, -60);
    // Arms
    ctx.moveTo(-26, -5);
    ctx.quadraticCurveTo(-48, 10, -55, 40);
    ctx.moveTo(26, -5);
    ctx.quadraticCurveTo(48, 10, 55, 40);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.strokeStyle = fill || 'rgba(242,238,252,0.55)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();
  }
  function drawFrame(dt) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    pulseT += dt;

    // Soft filaments
    filaments.forEach((f) => {
      f.x += f.vx;
      f.y += f.vy;
      if (f.x < 0 || f.x > 1) f.vx *= -1;
      if (f.y < 0 || f.y > 1) f.vy *= -1;
      const x = f.x * w;
      const y = f.y * h;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 40);
      g.addColorStop(0, `rgba(192,132,252,${f.a * 0.35})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 40, 0, Math.PI * 2);
      ctx.fill();
    });

    const cx = w * 0.5;
    const cy = h * 0.52;
    const scale = Math.min(w, h) / 520;
    const dens = density / 100;
    const breath = 1 + Math.sin(pulseT * 0.0018) * 0.015;

    // Body (behind / opaque outline)
    drawSilhouette(cx, cy, scale * breath, 0.22 + dens * 0.12, 'rgba(110,98,136,0.45)', null);

    // Luminous hologram densifying
    const holoAlpha = 0.08 + dens * 0.78;
    const holoGlow = dens > 0.05
      ? `rgba(103,232,249,${0.2 + dens * 0.55})`
      : null;
    const holoFill = `rgba(192,132,252,${0.12 + dens * 0.55})`;
    drawSilhouette(cx, cy, scale * breath * (0.98 + dens * 0.04), holoAlpha, holoFill, holoGlow);

    // Inner light core when densifying
    if (dens > 0.15) {
      const core = ctx.createRadialGradient(cx, cy - 20 * scale, 4, cx, cy, 90 * scale);
      core.addColorStop(0, `rgba(242,238,252,${0.08 + dens * 0.35})`);
      core.addColorStop(0.4, `rgba(103,232,249,${0.06 + dens * 0.22})`);
      core.addColorStop(1, 'transparent');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy - 10 * scale, 95 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Completion aura
    if (dens >= 0.98 || hologramFlash > 0) {
      const flash = Math.max(dens >= 0.98 ? 0.35 : 0, hologramFlash);
      const aura = ctx.createRadialGradient(cx, cy, 20, cx, cy, 180 * scale);
      aura.addColorStop(0, `rgba(103,232,249,${flash * 0.45})`);
      aura.addColorStop(1, 'transparent');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, 180 * scale, 0, Math.PI * 2);
      ctx.fill();
      hologramFlash = Math.max(0, hologramFlash - dt * 0.0012);
    }

    // Hold ring fill via CSS var if present
    if (holdState && holdState.el) {
      const fill = Math.max(0, Math.min(1, holdState.fill || 0));
      holdState.el.style.setProperty('--fill', (fill * 100).toFixed(1));
    }
  }
  let lastTs = 0;
  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(48, ts - lastTs);
    lastTs = ts;
    drawFrame(dt);
    rafId = requestAnimationFrame(loop);
  }

  // ——— Soft fail ———
  function softFail(message, retryFn) {
    clearTimers();
    setVeil(true);
    softDim(3);
    retryCallback = retryFn;
    veilHint.textContent = message || tx('Le Fil s’adoucit. Respire. Puis reprends.');
    showScreen('veil');
    later(() => setVeil(false), 600);
  }

  // ——— Acte 1 micro-challenges (ordered + reaction) ———
  const ACTE1 = [
    { id: 'marche', title: tx('Marche en forêt'), lyric: tx('Je marche dans la forêt.'), hint: tx('Tape chaque pas lumineux dans l’ordre, au rythme.'), densityGain: 8 },
    { id: 'terre', title: tx('Mains dans la terre'), lyric: tx('Mes mains touchent la terre froide.'), hint: tx('Maintiens, puis relâche exactement à la marque.'), densityGain: 8 },
    { id: 'ciel', title: tx('Yeux au ciel'), lyric: tx('Mes yeux montent vers le ciel.'), hint: tx('Suis l’étoile qui s’élève — tape au zénith.'), densityGain: 8 },
    { id: 'course', title: tx('Course dans le champ'), lyric: tx('Je cours dans le champ.'), hint: tx('Tape le corridor qui s’ouvre, dans l’ordre des ouvertures.'), densityGain: 8 },
    { id: 'frappe', title: tx('Frappe du pied'), lyric: tx('Je frappe le sol.'), hint: tx('Enchaîne les frappes au tempo — pas trop tôt.'), densityGain: 8 },
    { id: 'respiration', title: tx('Respiration'), lyric: tx('Je respire.'), hint: tx('Inspire jusqu’à la marque, expire à la seconde.'), densityGain: 8 },
    { id: 'saut', title: tx('Saut du ruisseau'), lyric: tx('Je saute le ruisseau.'), hint: tx('Sauter seulement dans la fenêtre courte.'), densityGain: 8 },
    { id: 'cri', title: tx('Cri vers le ciel'), lyric: tx('Je crie vers le ciel.'), hint: tx('Tape en tempo pour charger, puis scelle par Oui.'), densityGain: 10 },
  ];

  function startActe1() {
    acte = 1;
    microIndex = 0;
    acte1Hits = 0;
    acte1Total = ACTE1.length;
    transitionTo(tx('Acte I · Présence'), tx('Chaque geste densifie la silhouette.'), () => runMicro(0));
  }

  function transitionTo(title, hint, nextFn) {
    clearTimers();
    clearPlayUI();
    transPhase.textContent = tx('Passage');
    transTitle.textContent = title;
    transHint.textContent = hint || '';
    showScreen('transition');
    later(() => {
      if (typeof nextFn === 'function') nextFn();
    }, TRANSITION_MS);
  }

  function runMicro(i) {
    microIndex = i;
    if (i >= ACTE1.length) {
      const ratio = acte1Hits / Math.max(1, acte1Total);
      if (ratio >= PASS_RATIO) {
        saveProgress({ acte1: true });
        startActe2();
      } else {
        softFail(tx('Présence encore légère. Reposons les gestes.'), () => startActe1());
      }
      return;
    }
    const m = ACTE1[i];
    clearPlayUI();
    playPhase.textContent = (isEn() ? 'Act I · ' : 'Acte I · ') + m.title;
    playLyric.textContent = m.lyric;
    playHint.textContent = m.hint;
    playScore.textContent = isEn() ? `Presence · ${acte1Hits}/${i} gestures sealed` : `Présence · ${acte1Hits}/${i} gestes scellés`;
    showScreen('play');

    const runners = {
      marche: runMarche,
      terre: runTerre,
      ciel: runCiel,
      course: runCourse,
      frappe: runFrappe,
      respiration: runRespiration,
      saut: runSaut,
      cri: runCri,
    };
    later(() => runners[m.id](m), 350);
  }

  function passMicro(m) {
    acte1Hits += 1;
    addDensity(m.densityGain);
    playScore.textContent = (isEn() ? 'Presence' : 'Présence') + ` · ${acte1Hits}/${microIndex + 1}`;
    later(() => runMicro(microIndex + 1), 700);
  }

  // Marche: ordered path pulses
  function runMarche(m) {
    const steps = 5;
    const order = [];
    for (let i = 0; i < steps; i++) order.push({ id: i, label: (isEn() ? 'Step ' : 'Pas ') + (i + 1) });
    currentSeq = order;
    seqProgress = 0;
    renderSeqStrip(order, 0);
    cueZone.innerHTML = '';
    const buttons = order.map((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cd-cue';
      b.textContent = s.label;
      b.dataset.id = String(s.id);
      cueZone.appendChild(b);
      return b;
    });
    let expected = 0;
    let windowOpen = false;
    let litBtn = null;
    let misses = 0;

    function lightNext() {
      if (expected >= steps) {
        passMicro(m);
        return;
      }
      buttons.forEach((b) => b.classList.remove('lit'));
      litBtn = buttons[expected];
      litBtn.classList.add('lit');
      windowOpen = true;
      const openAt = performance.now();
      const deadline = later(() => {
        if (windowOpen && expected < steps) {
          windowOpen = false;
          litBtn.classList.remove('lit');
          misses += 1;
          softDim(2);
          if (misses >= 2) {
            softFail(tx('Le chemin s’estompe. Repose le pas.'), () => runMicro(microIndex));
            return;
          }
          later(lightNext, 500);
        }
      }, 780);

      litBtn.onclick = () => {
        if (!windowOpen || litBtn !== buttons[expected]) {
          misses += 1;
          softDim(1);
          if (misses >= 2) {
            clearTimers();
            softFail(tx('Le chemin s’estompe. Repose le pas.'), () => runMicro(microIndex));
          }
          return;
        }
        const lag = performance.now() - openAt;
        windowOpen = false;
        clearTimeout(deadline);
        if (lag > HIT_WINDOW_MS + 420) {
          // still accept but slight dim if very late — already within open window
        }
        litBtn.classList.remove('lit');
        litBtn.classList.add('done');
        expected += 1;
        seqProgress = expected;
        renderSeqStrip(order, expected);
        later(lightNext, 380);
      };
    }
    later(lightNext, 500);
  }

  // Terre: hold then release in window
  function runTerre(m) {
    renderSeqStrip([{ label: tx('Tenir') }, { label: tx('Relâcher') }], 0);
    const ring = document.createElement('div');
    ring.className = 'cd-hold-ring';
    ring.innerHTML = '<span class="cd-hold-label">' + tx('Terre') + '</span>';
    cueZone.appendChild(ring);
    holdState = { el: ring, fill: 0, phase: 'wait' };
    let holding = false;
    let holdStart = 0;
    const TARGET = 0.72;
    const WINDOW = 0.12;

    function onDown(e) {
      e.preventDefault();
      if (holdState.phase !== 'wait' && holdState.phase !== 'hold') return;
      holding = true;
      holdStart = performance.now();
      holdState.phase = 'hold';
      ring.classList.add('active');
      ring.querySelector('.cd-hold-label').textContent = 'Maintenir…';
    }
    function onUp(e) {
      e.preventDefault();
      if (!holding) return;
      holding = false;
      const fill = holdState.fill;
      ring.classList.remove('active');
      if (Math.abs(fill - TARGET) <= WINDOW) {
        ring.classList.add('mark');
        renderSeqStrip([{ label: tx('Tenir') }, { label: tx('Relâcher') }], 2);
        passMicro(m);
      } else {
        softFail(tx('Trop tôt ou trop tard. La terre attend le juste geste.'), () => runMicro(microIndex));
      }
    }
    ring.addEventListener('pointerdown', onDown);
    ring.addEventListener('pointerup', onUp);
    ring.addEventListener('pointerleave', (e) => { if (holding) onUp(e); });

    const tick = () => {
      if (!holdState || holdState.phase === 'done') return;
      if (holding) {
        holdState.fill = Math.min(1, (performance.now() - holdStart) / 1600);
        if (Math.abs(holdState.fill - TARGET) <= WINDOW) {
          ring.classList.add('mark');
          ring.querySelector('.cd-hold-label').textContent = 'Relâche';
        } else {
          ring.classList.remove('mark');
        }
      }
      if (holding && holdState.fill >= 1) {
        holding = false;
        softFail(tx('La pulsation est passée. Repose le geste.'), () => runMicro(microIndex));
        return;
      }
      later(tick, 32);
    };
    later(tick, 32);
  }

  // Ciel: rising star — tap sequence then zenith
  function runCiel(m) {
    const levels = [tx('Bas'), tx('Milieu'), tx('Haut'), tx('Zénith')];
    currentSeq = levels.map((l) => ({ label: l }));
    seqProgress = 0;
    renderSeqStrip(currentSeq, 0);
    cueZone.innerHTML = '';
    let step = 0;
    function spawn() {
      if (step >= levels.length) {
        passMicro(m);
        return;
      }
      cueZone.innerHTML = '';
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cd-cue lit';
      b.textContent = '★ ' + levels[step];
      b.style.transform = `translateY(${(3 - step) * -8}px)`;
      cueZone.appendChild(b);
      let open = true;
      const t = later(() => {
        if (!open) return;
        open = false;
        softFail(tx("L'étoile s'éloigne. Repose le regard."), () => runMicro(microIndex));
      }, step === 3 ? 700 : 900);
      b.onclick = () => {
        if (!open) return;
        open = false;
        clearTimeout(t);
        b.classList.add('done');
        step += 1;
        renderSeqStrip(currentSeq, step);
        later(spawn, 320);
      };
    }
    later(spawn, 400);
  }

  // Course: corridors open in sequence
  function runCourse(m) {
    const n = 4;
    currentSeq = Array.from({ length: n }, (_, i) => ({ label: (isEn() ? 'Path ' : 'Voie ') + (i + 1) }));
    renderSeqStrip(currentSeq, 0);
    const row = document.createElement('div');
    row.className = 'cd-path-row';
    const slots = [0, 1, 2].map((i) => {
      const s = document.createElement('button');
      s.type = 'button';
      s.className = 'cd-path-slot';
      s.dataset.slot = String(i);
      row.appendChild(s);
      return s;
    });
    cueZone.appendChild(row);
    let round = 0;
    let openSlot = -1;
    let open = false;

    function nextRound() {
      if (round >= n) {
        passMicro(m);
        return;
      }
      slots.forEach((s) => s.classList.remove('open', 'hit'));
      openSlot = Math.floor(Math.random() * 3);
      slots[openSlot].classList.add('open');
      open = true;
      const t = later(() => {
        if (!open) return;
        open = false;
        softFail(tx('Le champ se referme. Reprends la course.'), () => runMicro(microIndex));
      }, 850);
      slots.forEach((s) => {
        s.onclick = () => {
          if (!open) return;
          if (s.dataset.slot !== String(openSlot)) {
            open = false;
            clearTimeout(t);
            softFail(tx('Mauvaise voie. Le champ se referme.'), () => runMicro(microIndex));
            return;
          }
          open = false;
          clearTimeout(t);
          s.classList.add('hit');
          round += 1;
          renderSeqStrip(currentSeq, round);
          later(nextRound, 400);
        };
      });
    }
    later(nextRound, 400);
  }

  // Frappe: tempo stomps
  function runFrappe(m) {
    const count = 5;
    const BPM = 100;
    const beat = 60000 / BPM;
    currentSeq = Array.from({ length: count }, (_, i) => ({ label: (isEn() ? 'Stamp ' : 'Frappe ') + (i + 1) }));
    renderSeqStrip(currentSeq, 0);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cd-cue';
    b.textContent = tx('Frapper');
    cueZone.appendChild(b);
    let expected = 0;
    let nextBeatAt = performance.now() + 700;
    let lit = false;

    function scheduleBeat() {
      if (expected >= count) {
        passMicro(m);
        return;
      }
      later(() => {
        lit = true;
        b.classList.add('lit');
        const opened = performance.now();
        nextBeatAt = opened + beat;
        const close = later(() => {
          if (!lit) return;
          lit = false;
          b.classList.remove('lit');
          softFail(tx('Le tempo s’est perdu. Repose le pied.'), () => runMicro(microIndex));
        }, HIT_WINDOW_MS + 140);
        b.onclick = () => {
          if (!lit) {
            softDim(1);
            return;
          }
          lit = false;
          clearTimeout(close);
          b.classList.remove('lit');
          expected += 1;
          renderSeqStrip(currentSeq, expected);
          b.onclick = null;
          later(scheduleBeat, Math.max(80, beat - HIT_WINDOW_MS - 80));
        };
      }, Math.max(0, nextBeatAt - performance.now()));
    }
    playHint.textContent = tx('Frappe au moment où le bouton pulse.');
    scheduleBeat();
  }

  // Respiration: two-phase hold
  function runRespiration(m) {
    renderSeqStrip([{ label: tx('Inspirer') }, { label: tx('Expirer') }], 0);
    const ring = document.createElement('div');
    ring.className = 'cd-hold-ring';
    ring.innerHTML = '<span class="cd-hold-label">' + tx('Inspirer') + '</span>';
    cueZone.appendChild(ring);
    holdState = { el: ring, fill: 0, phase: 'in' };
    let holding = false;
    let start = 0;
    const IN_TARGET = 0.78;
    const WINDOW = 0.14;
    let phase = 'in';

    function down(e) {
      e.preventDefault();
      if (phase !== 'in' && phase !== 'out') return;
      holding = true;
      start = performance.now();
      ring.classList.add('active');
    }
    function up(e) {
      e.preventDefault();
      if (!holding) return;
      holding = false;
      ring.classList.remove('active');
      const fill = holdState.fill;
      if (phase === 'in') {
        if (Math.abs(fill - IN_TARGET) <= WINDOW) {
          phase = 'out';
          holdState.fill = 0;
          renderSeqStrip([{ label: tx('Inspirer') }, { label: tx('Expirer') }], 1);
          ring.querySelector('.cd-hold-label').textContent = tx('Expirer');
          ring.classList.remove('mark');
        } else {
          softFail(tx('Le souffle n’a pas trouvé la marque.'), () => runMicro(microIndex));
        }
      } else if (phase === 'out') {
        if (Math.abs(fill - IN_TARGET) <= WINDOW) {
          ring.classList.add('mark');
          renderSeqStrip([{ label: tx('Inspirer') }, { label: tx('Expirer') }], 2);
          passMicro(m);
        } else {
          softFail(tx('L’expire est passé à côté. Repose.'), () => runMicro(microIndex));
        }
      }
    }
    ring.addEventListener('pointerdown', down);
    ring.addEventListener('pointerup', up);
    ring.addEventListener('pointerleave', (e) => { if (holding) up(e); });

    const tick = () => {
      if (!holdState) return;
      if (holding) {
        holdState.fill = Math.min(1, (performance.now() - start) / 1500);
        if (Math.abs(holdState.fill - IN_TARGET) <= WINDOW) ring.classList.add('mark');
        else ring.classList.remove('mark');
      }
      later(tick, 32);
    };
    later(tick, 32);
  }

  // Saut: short jump window
  function runSaut(m) {
    renderSeqStrip([{ label: tx('Attendre') }, { label: tx('Sauter') }], 0);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cd-cue';
    b.textContent = tx('Sauter');
    cueZone.appendChild(b);
    let open = false;
    later(() => {
      open = true;
      b.classList.add('lit');
      renderSeqStrip([{ label: tx('Attendre') }, { label: tx('Sauter') }], 1);
      const t = later(() => {
        if (!open) return;
        open = false;
        softFail(tx('Le ruisseau s’est refermé.'), () => runMicro(microIndex));
      }, 520);
      b.onclick = () => {
        if (!open) {
          softFail(tx('Trop tôt. Attends l’ouverture.'), () => runMicro(microIndex));
          return;
        }
        open = false;
        clearTimeout(t);
        b.classList.add('done');
        renderSeqStrip([{ label: tx('Attendre') }, { label: tx('Sauter') }], 2);
        passMicro(m);
      };
    }, 1100 + Math.random() * 600);
  }

  // Cri: tempo taps then Oui
  function runCri(m) {
    const needed = 6;
    currentSeq = Array.from({ length: needed }, (_, i) => ({ label: (isEn() ? 'Shout ' : 'Cri ') + (i + 1) })).concat([{ label: tx('Oui') }]);
    renderSeqStrip(currentSeq, 0);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cd-cue lit';
    b.textContent = tx('Crier');
    cueZone.appendChild(b);
    let count = 0;
    let lastTap = 0;
    const MIN_GAP = 220;
    const MAX_GAP = 720;
    b.onclick = () => {
      const now = performance.now();
      if (lastTap && (now - lastTap < MIN_GAP || now - lastTap > MAX_GAP)) {
        softFail(tx('Hors tempo. Le cri veut un rythme vivant.'), () => runMicro(microIndex));
        return;
      }
      lastTap = now;
      count += 1;
      renderSeqStrip(currentSeq, count);
      playScore.textContent = (isEn() ? 'Charge' : 'Charge') + ` · ${count}/${needed}`;
      if (count >= needed) {
        b.classList.add('done');
        b.onclick = null;
        setOui(true, true);
        playHint.textContent = tx('Scelle par Oui au sommet.');
        const expire = later(() => {
          softFail(tx('Le Oui s’est éteint. Reprends le cri.'), () => runMicro(microIndex));
        }, 2200);
        btnOui.onclick = () => {
          clearTimeout(expire);
          setOui(false, false);
          renderSeqStrip(currentSeq, needed + 1);
          passMicro(m);
        };
      }
    };
  }

  // ——— Acte 2 — Choix (ordered true gestes + Oui) ———
  function startActe2() {
    acte = 2;
    transitionTo(
      tx('Acte II · Choix'),
      tx('C’est moi qui crée, c’est moi qui choisis mon demain.'),
      () => runChoixRound(0)
    );
  }

  function runChoixRound(round) {
    const TOTAL = 6;
    if (round >= TOTAL) {
      saveProgress({ acte2: true });
      startActe3();
      return;
    }
    clearPlayUI();
    playPhase.textContent = tx('Acte II · Choix');
    playLyric.textContent = tx('C’est moi qui crée, c’est moi qui choisis mon demain.');
    playHint.textContent = tx('Choisis un vrai geste, dans l’ordre du Fil, puis scelle par Oui.');
    playScore.textContent = (isEn() ? 'Choice' : 'Choix') + ` · ${round + 1}/${TOTAL}`;
    showScreen('play');

    // Build a short required sequence of 2 true gestes for this round
    const shuffled = GESTES_VRAIS.slice().sort(() => Math.random() - 0.5);
    const required = shuffled.slice(0, 2);
    currentSeq = required.map((g) => ({ label: g.label, id: g.id }));
    seqProgress = 0;
    renderSeqStrip(currentSeq, 0);

    const traps = GESTES_PIEGES.slice().sort(() => Math.random() - 0.5).slice(0, 2);
    const pool = required.concat(traps).sort(() => Math.random() - 0.5);

    cueZone.innerHTML = '';
    let expecting = 0;
    let chosenOk = false;

    pool.forEach((g) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cd-cue' + (g.trap ? ' trap' : '');
      b.textContent = g.label;
      b.dataset.id = g.id;
      cueZone.appendChild(b);

      b.onclick = () => {
        if (chosenOk) return;
        const want = required[expecting];
        if (g.trap || g.id !== want.id) {
          b.classList.add('wrong');
          softFail(tx('Ce n’est pas le geste du Fil. Repose le choix.'), () => runChoixRound(round));
          return;
        }
        b.classList.add('done');
        expecting += 1;
        renderSeqStrip(currentSeq, expecting);
        if (expecting < required.length) {
          // light next expected visually
          return;
        }
        chosenOk = true;
        playHint.textContent = tx('Le Oui s’allume — scelle maintenant.');
        setOui(true, true);
        const expire = later(() => {
          softFail(tx('Le Oui n’a pas été scellé à temps.'), () => runChoixRound(round));
        }, 1800);
        btnOui.onclick = () => {
          clearTimeout(expire);
          setOui(false, false);
          addDensity(6);
          later(() => runChoixRound(round + 1), 500);
        };
      };
    });

    // Also light the currently expected true geste as reaction cue
    function pulseExpected() {
      if (chosenOk || expecting >= required.length) return;
      const wantId = required[expecting].id;
      [...cueZone.querySelectorAll('.cd-cue')].forEach((el) => {
        el.classList.toggle('lit', el.dataset.id === wantId);
      });
      later(() => {
        [...cueZone.querySelectorAll('.cd-cue')].forEach((el) => el.classList.remove('lit'));
        later(pulseExpected, 700);
      }, 650);
    }
    later(pulseExpected, 400);

    // Round timer pressure
    later(() => {
      if (!chosenOk) {
        softFail(tx('Le temps du choix est passé. Reprends.'), () => runChoixRound(round));
      }
    }, 9000);
  }

  // ——— Acte 3 — Demande & réception ———
  function startActe3() {
    acte = 3;
    transitionTo(
      tx('Acte III · Demande & réception'),
      tx('Demande. Attrape ta vibration. Reçois par Oui.'),
      () => pickDemande()
    );
  }

  function pickDemande() {
    clearPlayUI();
    playPhase.textContent = tx('Acte III · Demande');
    playLyric.textContent = tx('Que demandes-tu à l’univers ?');
    playHint.textContent = tx('Choisis une vibration, puis attrape seulement ce qui lui répond.');
    playScore.textContent = '';
    showScreen('play');

    const grid = document.createElement('div');
    grid.className = 'cd-demande-grid interactive';
    DEMANDES.forEach((d) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cd-demande ' + d.id;
      b.textContent = d.label;
      b.onclick = () => {
        lastDemande = d.id;
        saveProgress({ lastDemande: d.id });
        addDensity(4);
        later(() => runReception(d), 400);
      };
      grid.appendChild(b);
    });
    cueZone.appendChild(grid);
  }

  function runReception(demande) {
    clearPlayUI();
    playPhase.textContent = tx('Acte III · Réception');
    playLyric.textContent = tx('Tout ce que je demande, l’univers me le donne.');
    playHint.textContent = isEn() ? `Catch only “${demande.label}”. Let the rest go by.` : `Attrape seulement « ${demande.label} ». Laisse passer le reste.`;
    playScore.textContent = tx('Réception · 0/5');
    showScreen('play');

    const layer = document.createElement('div');
    layer.className = 'cd-particle-layer interactive';
    cueZone.appendChild(layer);

    let good = 0;
    let bad = 0;
    let sealed = false;
    particleState = { good, bad };

    const NEED = 5;
    const MAX_BAD = 2;

    function spawnOne() {
      if (sealed) return;
      if (good >= NEED) return;
      const isMatch = Math.random() < 0.45;
      const d = isMatch
        ? demande
        : DEMANDES.filter((x) => x.id !== demande.id)[Math.floor(Math.random() * 3)];
      const p = document.createElement('button');
      p.type = 'button';
      p.className = 'cd-particle ' + (isMatch ? 'match' : 'distractor');
      p.textContent = d.label;
      const edge = Math.floor(Math.random() * 4);
      let x = 10 + Math.random() * 80;
      let y = 10 + Math.random() * 80;
      if (edge === 0) y = -5;
      if (edge === 1) y = 105;
      if (edge === 2) x = -5;
      if (edge === 3) x = 105;
      p.style.left = x + '%';
      p.style.top = y + '%';
      layer.appendChild(p);

      const tx = 40 + Math.random() * 20;
      const ty = 40 + Math.random() * 20;
      const start = performance.now();
      const DUR = 2400 + Math.random() * 900;

      function move() {
        if (!p.isConnected || sealed) return;
        const t = Math.min(1, (performance.now() - start) / DUR);
        const cx = x + (tx - x) * t;
        const cy = y + (ty - y) * t;
        p.style.left = cx + '%';
        p.style.top = cy + '%';
        if (t >= 1) {
          p.remove();
          return;
        }
        requestAnimationFrame(move);
      }
      requestAnimationFrame(move);

      p.onclick = () => {
        if (sealed) return;
        p.classList.add('caught');
        later(() => p.remove(), 200);
        if (isMatch) {
          good += 1;
          addDensity(3);
          playScore.textContent = (isEn() ? 'Receiving' : 'Réception') + ` · ${good}/${NEED}`;
          if (good >= NEED && bad <= MAX_BAD) {
            sealed = true;
            playHint.textContent = tx('Immobilité… puis Oui.');
            later(() => {
              setOui(true, true);
              playLyric.textContent = tx('L’univers entier répond à mon oui.');
              const expire = later(() => {
                softFail(tx('La réception s’est dissipée. Demande à nouveau.'), () => pickDemande());
              }, 2800);
              btnOui.onclick = () => {
                clearTimeout(expire);
                setOui(false, false);
                addDensity(100 - density); // complete
                finishGame();
              };
            }, 900);
          }
        } else {
          bad += 1;
          softDim(2);
          if (bad > MAX_BAD) {
            sealed = true;
            softFail(tx('Trop de fausses vibrations. Repose la demande.'), () => pickDemande());
          }
        }
      };

      later(spawnOne, 480 + Math.random() * 420);
    }
    spawnOne();
  }

  // ——— Finale + victory audio ———
  function ensureVictoryAudio() {
    if (victoryAudio) return victoryAudio;
    const a = new Audio();
    a.preload = 'auto';
    a.src = isEn() ? VICTORY_EN.audio : VICTORY_AUDIO;
    a.addEventListener('error', () => {
      if (!a.getAttribute('data-tried-aac')) {
        a.setAttribute('data-tried-aac', '1');
        a.src = isEn() ? VICTORY_EN.aac : VICTORY_AUDIO_AAC;
      }
    });
    victoryAudio = a;
    return a;
  }

  function playVictorySong() {
    const a = ensureVictoryAudio();
    try { a.pause(); } catch (_) {}
    a.currentTime = 0;
    a.volume = 0;
    const playPromise = a.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(() => {
        // User-gesture already happened during play; retry once
        later(() => a.play().catch(() => {}), 200);
      });
    }
    // Fade in
    let v = 0;
    const fade = setInterval(() => {
      v = Math.min(1, v + 0.06);
      a.volume = v;
      if (v >= 1) clearInterval(fade);
    }, 80);
  }

  function stopVictorySong() {
    if (!victoryAudio) return;
    try {
      victoryAudio.pause();
      victoryAudio.currentTime = 0;
    } catch (_) {}
  }

  function finishGame() {
    clearTimers();
    density = 100;
    updateDensityUI();
    saveProgress({ complete: true, acteCleared: 3 });
    hologramFlash = 1;

    const line = document.getElementById('finale-line');
    const line2 = document.getElementById('finale-line2');
    line.textContent = tx('Tout ce que je demande, l’univers me le donne.');
    line2.textContent = tx('L’univers entier répond à mon oui.');

    // Soft attribution link if not already present
    let attr = document.getElementById('victory-attr');
    if (!attr) {
      attr = document.createElement('p');
      attr.id = 'victory-attr';
      attr.className = 'cd-hint';
      attr.style.marginTop = '0.75rem';
      attr.innerHTML = `♪ <em>${isEn() ? VICTORY_EN.title : VICTORY_TITLE}</em> · <a href="${isEn() ? VICTORY_EN.suno : VICTORY_SUNO}" target="_blank" rel="noopener" style="color:#67e8f9">Suno</a>`;
      const actions = document.querySelector('.cd-finale-actions');
      if (actions && actions.parentNode) {
        actions.parentNode.insertBefore(attr, actions);
      }
    }

    showScreen('finale');
    playVictorySong();
  }

  // ——— Boot / controls ———
  function startGame() {
    stopVictorySong();
    clearTimers();
    setVeil(false);
    density = Math.min(density, 12); // soft carry of prior presence, not full reset wipe
    if (!running) density = 0;
    density = 0;
    updateDensityUI();
    running = true;
    // Unlock audio during user gesture
    const a = ensureVictoryAudio();
    try {
      a.volume = 0;
      const p = a.play();
      if (p && p.then) p.then(() => a.pause()).catch(() => {});
    } catch (_) {}
    startActe1();
  }

  btnStart.addEventListener('click', startGame);
  btnRetry.addEventListener('click', () => {
    setVeil(false);
    showScreen('play');
    if (typeof retryCallback === 'function') retryCallback();
  });
  btnReplay.addEventListener('click', () => {
    stopVictorySong();
    density = 0;
    updateDensityUI();
    startGame();
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      if (!btnOui.disabled && ouiWrap.classList.contains('visible')) {
        e.preventDefault();
        btnOui.click();
      }
    }
  });

  window.addEventListener('resize', resizeCanvas);
  loadProgress();
  // Fresh session starts at 0 on intro; stored density shown only as prior completion marker
  density = 0;
  updateDensityUI();
  resizeCanvas();
  initFilaments();
  rafId = requestAnimationFrame(loop);
  showScreen('intro');
})();
