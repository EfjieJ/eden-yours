/**
 * Rythme-Compasse — structured 8-cadre game for Eden Yours.
 *
 * Audio segments: equal eighths of each track's duration so every song
 * (including short ones like La Mécanique ~152s) always has 8 playable slices.
 * Poetic step titles below are labels only; timing is startFrac/endFrac of duration.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'eden-rythme-compasse';
  const DEFAULT_SONG_ID = 'b0eb0f76-f2d8-4e16-85a9-037fc3f32b01';
  const STEP_COUNT = 8;
  const PASS_RATIO = 0.7;
  const BPM = 90;
  const BEAT_MS = 60000 / BPM;
  const TERNARY = 3;
  const HIT_WINDOW_MS = 165;
  const TRANSITION_MS = 2000;
  const VEIL_LOWPASS = 750;
  const VEIL_DETUNE_CENTS = 30;

  const SONGS = [
    { id: 'b0eb0f76-f2d8-4e16-85a9-037fc3f32b01', title: 'The slight future', duration: 269.16, lang: 'en' },
    { id: 'f5bf8830-85bb-4a9b-9545-081800be485f', title: 'La Sensibilité est la Fonction', duration: 187.2, lang: 'fr' },
    { id: 'dead13bb-42bc-492e-83a1-87609f224734', title: 'Particule Pure', duration: 244.24, lang: 'fr' },
    { id: 'a0b2b33d-66f6-4c6a-b933-cdb5977d920e', title: 'Le Léger Futur', duration: 226.4, lang: 'fr' },
    { id: '5535b9e6-78f1-4a96-bfed-f0c5666a75c3', title: 'La Mécanique du Jeu', duration: 151.6, lang: 'fr' },
  ];

  const STEPS = [
    {
      id: 1,
      title: "L'illusion de fixité",
      mode: 'illusion',
      hint: 'Touche le rythme. Choisis la cause. Scelle par Oui.',
      startFrac: 0 / 8,
      endFrac: 1 / 8,
      reflexMs: 20000,
      compassMs: 2000,
      options: [
        { t: 'Je subis la structure', ok: false },
        { t: 'Je suis la cause', ok: true },
        { t: "J'attends la vie", ok: false },
      ],
    },
    {
      id: 2,
      title: 'Les deux faces',
      mode: 'faces',
      hint: 'Analyser ou réagir. Trois pulses, un choix. Scelle par Oui.',
      startFrac: 1 / 8,
      endFrac: 2 / 8,
      burstMs: 2000,
      compassMs: 2200,
      burstsPerCycle: 3,
      cycles: 4,
      options: [
        { t: 'Analyser', ok: true, face: 'analyser' },
        { t: 'Réagir', ok: false, face: 'reagir' },
      ],
    },
    {
      id: 3,
      title: "L'identification",
      mode: 'identification',
      hint: 'Écarte corps, nom, rôle — puis scelle par Oui au centre.',
      startFrac: 2 / 8,
      endFrac: 3 / 8,
      durationMs: 18000,
      labels: ['corps', 'nom', 'rôle'],
    },
    {
      id: 4,
      title: 'Le futur léger',
      mode: 'futur',
      hint: "Pose l'intention d'abord. Puis un bref réflexe. Scelle par Oui.",
      startFrac: 3 / 8,
      endFrac: 4 / 8,
      compassMs: 3500,
      reflexMs: 6000,
      ouiMs: 2500,
      options: [
        { t: 'Attendre la vie', ok: false },
        { t: 'Poster le prochain cadre', ok: true },
        { t: 'Subir le cadre', ok: false },
      ],
    },
    {
      id: 5,
      title: 'Admiration',
      mode: 'admiration',
      hint: 'Admire : laisse passer les « erreur ». Tape seulement Oui.',
      startFrac: 4 / 8,
      endFrac: 5 / 8,
      durationMs: 16000,
      erreurCount: 7,
      ouiWindows: 2,
      ouiOpenMs: 1400,
    },
    {
      id: 6,
      title: 'Fonction avant structure',
      mode: 'fonction',
      hint: "Choisis Marcher (fonction) avant que Jambe (structure) s'allume.",
      startFrac: 5 / 8,
      endFrac: 6 / 8,
      cycles: 3,
      trapDelayMs: 1600,
      compassMs: 3200,
      ouiMs: 2000,
      options: [
        { t: 'Marcher', ok: true, role: 'function' },
        { t: 'Jambe', ok: false, role: 'structure' },
      ],
    },
    {
      id: 7,
      title: 'Le triptyque',
      mode: 'triptyque',
      hint: "Trois gestes calmes, dans l'ordre. Puis Oui.",
      startFrac: 6 / 8,
      endFrac: 7 / 8,
      sequence: ['Ne pas juger', 'Ne pas évaluer', 'Ne pas invalider'],
      timeoutMs: 20000,
      ouiMs: 2500,
    },
    {
      id: 8,
      title: 'Oui pur / zéro pur',
      mode: 'silence',
      hint: "Presque immobile. N'agite pas le Fil. Un seul Oui au pulse.",
      startFrac: 7 / 8,
      endFrac: 8 / 8,
      stillMs: 14000,
      ouiOpenMs: 1800,
    },
  ];


  // ——— DOM ———
  const canvas = document.getElementById('rc-canvas');
  const ctx = canvas.getContext('2d');
  const badgesEl = document.getElementById('rc-badges');
  const screens = {
    intro: document.getElementById('screen-intro'),
    transition: document.getElementById('screen-transition'),
    reflex: document.getElementById('screen-reflex'),
    compass: document.getElementById('screen-compass'),
    identify: document.getElementById('screen-identify'),
    admiration: document.getElementById('screen-admiration'),
    sequence: document.getElementById('screen-sequence'),
    silence: document.getElementById('screen-silence'),
    outcome: document.getElementById('screen-outcome'),
    finale: document.getElementById('screen-finale'),
  };

  const btnStart = document.getElementById('btn-start');
  const introSubtitle = document.getElementById('intro-subtitle');
  const introHint = document.getElementById('intro-hint');
  const introListen = document.getElementById('intro-listen');
  const songPicker = document.getElementById('song-picker');
  const cadreMap = document.getElementById('cadre-map');
  const transTitle = document.getElementById('trans-title');
  const transHint = document.getElementById('trans-hint');

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

  const identifyHint = document.getElementById('identify-hint');
  const identifyScore = document.getElementById('identify-score');
  const identifyTimer = document.getElementById('identify-timer');
  const floatLabels = document.getElementById('float-labels');
  const identifyOuiWrap = document.getElementById('identify-oui-wrap');
  const btnIdentifyOui = document.getElementById('btn-identify-oui');

  const admirationHint = document.getElementById('admiration-hint');
  const admirationScore = document.getElementById('admiration-score');
  const admirationTimer = document.getElementById('admiration-timer');
  const driftLayer = document.getElementById('drift-layer');
  const admirationOuiWrap = document.getElementById('admiration-oui-wrap');
  const btnAdmirationOui = document.getElementById('btn-admiration-oui');

  const sequenceHint = document.getElementById('sequence-hint');
  const sequenceScore = document.getElementById('sequence-score');
  const seqOpts = document.getElementById('seq-opts');
  const sequenceOuiWrap = document.getElementById('sequence-oui-wrap');
  const btnSequenceOui = document.getElementById('btn-sequence-oui');

  const silenceHint = document.getElementById('silence-hint');
  const silenceScore = document.getElementById('silence-score');
  const silenceTimer = document.getElementById('silence-timer');
  const silenceOuiWrap = document.getElementById('silence-oui-wrap');
  const btnSilenceOui = document.getElementById('btn-silence-oui');

  const outcomeBox = document.getElementById('outcome-box');
  const outcomeTitle = document.getElementById('outcome-title');
  const outcomeMsg = document.getElementById('outcome-msg');
  const listenBar = document.getElementById('listen-bar');
  const btnListen = document.getElementById('btn-listen');
  const btnStop = document.getElementById('btn-stop');
  const btnRetry = document.getElementById('btn-retry');
  const btnNext = document.getElementById('btn-next');
  const btnFinaleListen = document.getElementById('btn-finale-listen');
  const btnFinaleHome = document.getElementById('btn-finale-home');
  const finaleHint = document.getElementById('finale-hint');

  // ——— State ———
  let selectedId = DEFAULT_SONG_ID;
  let loadedSongId = null;
  let songProgress = {};

  let audioCtx = null;
  let audioBuffer = null;
  let currentSource = null;
  let veilFilter = null;
  let gainNode = null;
  let detuneOsc = null;
  let detuneGain = null;

  let phase = 'intro';
  let currentStep = 1;
  let outcomeVeiled = false;
  let listenRange = { start: 0, end: 33 };
  let pendingTransition = null;
  let timers = [];

  let scoredCorrect = 0;
  let scoredTotal = 0;
  let ouiSealed = 0;

  let hits = 0;
  let autoMisses = 0;
  let expectedBeats = [];
  let hitFlags = [];
  let scoredMiss = [];
  let reflexStart = 0;
  let reflexDuration = 20000;
  let lastAccentIdx = -1;
  let compassDeadline = 0;
  let compassWindowMs = 2000;
  let compassChoiceCorrect = false;
  let compassResolved = false;
  let afterCompassOui = null;
  let onCompassTimeout = null;
  let onCompassWrong = null;

  let facesBurst = 0;
  let facesCycle = 0;
  let futurStage = 'compass';
  let fonctionCycle = 0;
  let trapLit = false;

  let idLabelsLeft = 0;
  let idDeadline = 0;
  let idResolved = false;

  let admStart = 0;
  let admDuration = 16000;
  let admOuiOpen = false;
  let admOuiHits = 0;
  let admResolved = false;
  let admWindows = [];

  let seqIndex = 0;
  let seqResolved = false;
  let seqDeadline = 0;
  let seqLastTap = 0;

  let silenceStart = 0;
  let silenceDuration = 14000;
  let silenceTapMisses = 0;
  let silenceOuiOpen = false;
  let silenceResolved = false;
  let silencePulseAt = 0;

  let threadProgress = 0.12;
  let pulses = [];
  let tears = [];
  let driftObjs = [];


  // ——— Utils ———
  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function clearTimers() {
    timers.forEach(function (t) { clearTimeout(t); });
    timers = [];
    clearTimeout(pendingTransition);
    pendingTransition = null;
  }

  function later(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function formatDuration(sec) {
    const s = Math.max(0, Math.round(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + String(r).padStart(2, '0');
  }

  function formatRange(start, end) {
    return formatDuration(start) + '–' + formatDuration(end);
  }

  function songAudioUrl(id) {
    return 'assets/audio/' + id + '.mp3';
  }

  function siteLang() {
    const l = window.EdenI18n && window.EdenI18n.getLang && window.EdenI18n.getLang();
    if (l === 'fr' || l === 'en') return l;
    try {
      const stored = localStorage.getItem('eden-lang');
      if (stored === 'fr' || stored === 'en') return stored;
    } catch (_) {}
    const nav = String((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase();
    return nav.indexOf('fr') === 0 ? 'fr' : 'en';
  }

  function visibleSongs() {
    const lang = siteLang();
    return SONGS.filter(function (song) { return song.lang === lang; });
  }

  function songById(id) {
    for (let i = 0; i < SONGS.length; i++) {
      if (SONGS[i].id === id) return SONGS[i];
    }
    return null;
  }

  function findSong(id) {
    const song = songById(id);
    if (!song || song.lang !== siteLang()) return null;
    return song;
  }

  function alignSelection() {
    const list = visibleSongs();
    if (!list.length) {
      selectedId = null;
      return;
    }
    if (!list.some(function (song) { return song.id === selectedId; })) {
      const preferred = list.find(function (song) { return song.id === DEFAULT_SONG_ID; });
      selectedId = (preferred || list[0]).id;
    }
  }

  function stepById(n) {
    return STEPS[n - 1] || STEPS[0];
  }

  function emptySteps() {
    const s = {};
    for (let i = 1; i <= STEP_COUNT; i++) s[i] = false;
    return s;
  }

  function ensureSongProgress(id) {
    if (!songProgress[id]) songProgress[id] = { steps: emptySteps() };
    if (!songProgress[id].steps) songProgress[id].steps = emptySteps();
    for (let i = 1; i <= STEP_COUNT; i++) {
      if (songProgress[id].steps[i] !== true) songProgress[id].steps[i] = false;
    }
    return songProgress[id];
  }

  function isStepDone(n) {
    return !!ensureSongProgress(selectedId).steps[n];
  }

  function maxUnlocked() {
    let m = 0;
    for (let i = 1; i <= STEP_COUNT; i++) {
      if (isStepDone(i)) m = i;
    }
    return m;
  }

  function firstIncomplete() {
    for (let i = 1; i <= STEP_COUNT; i++) {
      if (!isStepDone(i)) return i;
    }
    return STEP_COUNT;
  }

  function allDone() {
    for (let i = 1; i <= STEP_COUNT; i++) {
      if (!isStepDone(i)) return false;
    }
    return true;
  }

  function getSegment(stepNum) {
    const song = findSong(selectedId);
    const dur = song
      ? (audioBuffer && loadedSongId === selectedId
        ? audioBuffer.duration
        : song.duration)
      : 1;
    const step = stepById(stepNum);
    const start = Math.max(0, step.startFrac * dur);
    const end = Math.min(dur, step.endFrac * dur);
    return { start: start, end: Math.max(start + 0.05, end), duration: dur };
  }

  function migrateLegacySteps(sp) {
    const steps = emptySteps();
    if (!sp || typeof sp !== 'object') return steps;
    if (sp.steps && typeof sp.steps === 'object') {
      for (let i = 1; i <= STEP_COUNT; i++) {
        steps[i] = sp.steps[i] === true || sp.steps[String(i)] === true;
      }
      return steps;
    }
    if (sp.step1 === true) steps[1] = true;
    if (sp.step2 === true) steps[2] = true;
    return steps;
  }

  function loadStorage() {
    songProgress = {};
    selectedId = DEFAULT_SONG_ID;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          if (!data.songs && ('step1' in data || 'step2' in data)) {
            songProgress[DEFAULT_SONG_ID] = { steps: migrateLegacySteps(data) };
            selectedId = DEFAULT_SONG_ID;
          } else {
            if (data.songs && typeof data.songs === 'object') {
              Object.keys(data.songs).forEach(function (id) {
                songProgress[id] = { steps: migrateLegacySteps(data.songs[id]) };
              });
            }
            if (data.selectedId && songById(data.selectedId)) {
              selectedId = data.selectedId;
            }
          }
        }
      }
    } catch (_) {}
    alignSelection();
  }

  function persist(silent) {
    if (selectedId) ensureSongProgress(selectedId);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          selectedId: selectedId,
          songs: songProgress,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (_) {}
    if (!silent) {
      updateBadges();
      renderSongPicker();
      renderCadreMap();
      refreshIntro();
    }
  }

  function markStepDone(n) {
    ensureSongProgress(selectedId).steps[n] = true;
    persist();
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

  function updateBadges() {
    badgesEl.innerHTML = '';
    const cur = phase === 'intro' || phase === 'finale' ? firstIncomplete() : currentStep;
    for (let i = 1; i <= STEP_COUNT; i++) {
      const d = document.createElement('span');
      d.className = 'rc-badge-dot';
      if (isStepDone(i)) d.classList.add('done');
      else if (i === cur && !allDone()) d.classList.add('current');
      d.title = 'Cadre ' + i + ' — ' + stepById(i).title;
      badgesEl.appendChild(d);
    }
    const lab = document.createElement('span');
    lab.className = 'rc-badge-label';
    lab.textContent = allDone() ? '8/8' : maxUnlocked() + '/8';
    badgesEl.appendChild(lab);
  }

  function threadTargetFromProgress() {
    const m = maxUnlocked();
    return 0.12 + 0.88 * (m / STEP_COUNT);
  }


  function renderSongPicker() {
    songPicker.innerHTML = '';
    const list = visibleSongs();
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'rc-hint';
      empty.textContent = siteLang() === 'fr'
        ? 'Aucune chanson française pour le moment.'
        : 'No English songs for now.';
      songPicker.appendChild(empty);
      if (btnStart) btnStart.disabled = true;
      return;
    }
    if (btnStart) btnStart.disabled = false;
    list.forEach(function (song) {
      const prog = ensureSongProgress(song.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'rc-song-card interactive' + (song.id === selectedId ? ' selected' : '');
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', song.id === selectedId ? 'true' : 'false');
      btn.dataset.songId = song.id;

      const title = document.createElement('span');
      title.className = 'rc-song-title';
      title.textContent = song.title;

      const meta = document.createElement('span');
      meta.className = 'rc-song-meta';

      const dur = document.createElement('span');
      dur.className = 'rc-song-dur';
      dur.textContent = formatDuration(song.duration);

      const dots = document.createElement('span');
      dots.className = 'rc-song-progress';
      dots.setAttribute('aria-hidden', 'true');
      for (let i = 1; i <= STEP_COUNT; i++) {
        const d = document.createElement('span');
        d.className = 'rc-song-dot' + (prog.steps[i] ? ' on' : '');
        dots.appendChild(d);
      }

      meta.appendChild(dur);
      meta.appendChild(dots);
      btn.appendChild(title);
      btn.appendChild(meta);
      btn.addEventListener('click', function () {
        selectSong(song.id);
      });
      songPicker.appendChild(btn);
    });
  }

  function renderCadreMap() {
    cadreMap.innerHTML = '';
    const next = firstIncomplete();
    STEPS.forEach(function (step) {
      const done = isStepDone(step.id);
      const isCurrent = !allDone() && step.id === next;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rc-map-item';
      if (done) btn.classList.add('unlocked');
      if (isCurrent) btn.classList.add('current');
      if (!done && !isCurrent) btn.classList.add('locked');
      btn.setAttribute('role', 'listitem');

      const dot = document.createElement('span');
      dot.className = 'rc-map-dot';
      const num = document.createElement('span');
      num.className = 'rc-map-num';
      num.textContent = String(step.id);
      const t = document.createElement('span');
      t.className = 'rc-map-title';
      t.textContent = step.title;

      btn.appendChild(dot);
      btn.appendChild(num);
      btn.appendChild(t);

      if (done) {
        btn.title = 'Réécouter le cadre ' + step.id;
        btn.addEventListener('click', function () {
          listenUnlockedStep(step.id);
        });
      } else if (isCurrent) {
        btn.title = 'Cadre actuel';
      } else {
        btn.disabled = true;
        btn.title = 'Verrouillé';
      }
      cadreMap.appendChild(btn);
    });
  }

  async function listenUnlockedStep(n) {
    try {
      await initAudio();
      const seg = getSegment(n);
      playSegment(seg.start, seg.end, false);
    } catch (err) {
      console.error(err);
    }
  }

  function refreshIntro() {
    updateBadges();
    renderCadreMap();
    introListen.innerHTML = '';
    introListen.classList.remove('visible');

    const next = firstIncomplete();
    const done = allDone();
    const step = stepById(next);

    if (done) {
      introSubtitle.textContent = 'Les 8 cadres sont posés';
      introHint.textContent = 'Réécoute depuis la carte, ou rejoue un cadre.';
      btnStart.textContent = 'Rejouer le Fil';
    } else if (maxUnlocked() > 0) {
      introSubtitle.textContent =
        'Cadre ' + next + ' — ' + step.title + ' · ' + maxUnlocked() + '/8';
      introHint.textContent = step.hint;
      btnStart.textContent = 'Continuer';
    } else {
      introSubtitle.textContent = 'Huit cadres · Pose le Fil';
      introHint.textContent = step.hint;
      btnStart.textContent = 'Commencer';
    }

    const unlocked = [];
    for (let i = 1; i <= STEP_COUNT; i++) {
      if (isStepDone(i)) unlocked.push(i);
    }
    if (unlocked.length) {
      introListen.classList.add('visible');
      const bAll = document.createElement('button');
      bAll.type = 'button';
      bAll.className = 'rc-btn ghost interactive';
      bAll.textContent =
        unlocked.length === STEP_COUNT
          ? 'Écouter le Fil complet'
          : 'Écouter cadres 1–' + unlocked[unlocked.length - 1];
      bAll.addEventListener('click', async function () {
        try {
          await initAudio();
          const first = getSegment(unlocked[0]);
          const last = getSegment(unlocked[unlocked.length - 1]);
          playSegment(first.start, last.end, false);
        } catch (err) {
          console.error(err);
        }
      });
      introListen.appendChild(bAll);
    }

    threadProgress = threadTargetFromProgress();
  }

  function selectSong(id) {
    if (!findSong(id)) return;
    if (id === selectedId) return;
    stopPlayback();
    selectedId = id;
    if (loadedSongId !== selectedId) {
      audioBuffer = null;
      loadedSongId = null;
    }
    persist();
  }

  function renderCompassOpts(pool, layoutClass) {
    const texts = shuffleInPlace(pool.slice());
    compassOpts.innerHTML = '';
    compassOpts.classList.remove('faces', 'row');
    if (layoutClass) compassOpts.classList.add(layoutClass);
    texts.forEach(function (o) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rc-opt';
      if (o.face) b.classList.add('face-' + o.face);
      if (o.role === 'structure') b.classList.add('trap-pending');
      b.dataset.correct = o.ok ? '1' : '0';
      if (o.face) b.dataset.face = o.face;
      if (o.role) b.dataset.role = o.role;
      b.textContent = o.t;
      compassOpts.appendChild(b);
    });
  }

  async function initAudio() {
    if (!findSong(selectedId)) throw new Error('No song for this language');
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    if (audioBuffer && loadedSongId === selectedId) return;
    const url = songAudioUrl(selectedId);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Audio fetch failed: ' + res.status);
    const arr = await res.arrayBuffer();
    audioBuffer = await audioCtx.decodeAudioData(arr);
    loadedSongId = selectedId;
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

  function resetScore() {
    scoredCorrect = 0;
    scoredTotal = 0;
    ouiSealed = 0;
  }

  function scoreHit(ok) {
    scoredTotal++;
    if (ok) scoredCorrect++;
  }

  function passCheck() {
    const ratio = scoredTotal ? scoredCorrect / scoredTotal : 0;
    return ratio >= PASS_RATIO && ouiSealed >= 1;
  }

  function scoreRatio() {
    return scoredTotal ? scoredCorrect / scoredTotal : 0;
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

  function spawnRipple(good) {
    pulses.push({ born: performance.now(), life: 450, good: good, r0: 8 });
  }

  function spawnTear() {
    tears.push({
      born: performance.now(),
      life: 1400,
      x: 0.35 + Math.random() * 0.35,
    });
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
      scoreHit(true);
    } else {
      spawnRipple(false);
      scoreHit(false);
    }
    updateReflexHUD(now);
  }

  function markPassedMisses(now) {
    for (let i = 0; i < expectedBeats.length; i++) {
      if (!hitFlags[i] && !scoredMiss[i] && now - expectedBeats[i] > HIT_WINDOW_MS) {
        scoredMiss[i] = true;
        autoMisses++;
        const step = stepById(currentStep);
        if (step.mode === 'faces' || step.mode === 'futur') {
          scoreHit(false);
        }
      }
    }
  }

  function updateReflexHUD(now) {
    const pct = scoredTotal
      ? Math.round((scoredCorrect / scoredTotal) * 100)
      : Math.round(accentAccuracy() * 100);
    const step = stepById(currentStep);
    if (step.mode === 'faces') {
      reflexScoreEl.textContent =
        'Gestes ' +
        scoredCorrect +
        '/' +
        scoredTotal +
        ' · ' +
        pct +
        '% · cycle ' +
        (facesCycle + 1) +
        '/' +
        step.cycles +
        ' · burst ' +
        (facesBurst + 1) +
        '/' +
        step.burstsPerCycle;
    } else {
      reflexScoreEl.textContent =
        hits +
        ' bonnes / ' +
        expectedBeats.length +
        ' · ' +
        Math.round(accentAccuracy() * 100) +
        '%';
    }
    const left = Math.max(0, reflexDuration - (now - reflexStart));
    reflexTimerEl.textContent = (left / 1000).toFixed(1) + ' s';

    const base = (currentStep - 1) / STEP_COUNT;
    const local = Math.min(1, (now - reflexStart) / Math.max(1, reflexDuration));
    threadProgress = 0.12 + 0.88 * (base + local / STEP_COUNT);
  }

  function startReflexPhase(opts) {
    hits = 0;
    autoMisses = 0;
    lastAccentIdx = -1;
    pulses = [];
    reflexDuration = opts.durationMs;
    reflexPhaseLabel.textContent = opts.label || 'Phase RÉFLEXE';
    reflexHint.textContent = opts.hint || 'Tape au rythme des pulsations sur le Fil';
    reflexStart = performance.now();
    buildBeatSchedule(reflexStart, reflexDuration);
    showScreen('reflex');
    updateReflexHUD(reflexStart);
  }

  function openCompass(opts) {
    showScreen('compass');
    renderCompassOpts(opts.options, opts.layout || null);
    compassPhaseLabel.textContent = opts.label || 'Phase COMPAS';
    compassHint.textContent = opts.hint || 'Choisis avant la fin de la mesure';
    compassChoiceCorrect = false;
    compassResolved = false;
    compassWindowMs = opts.windowMs || 2000;
    afterCompassOui = opts.onOui || null;
    onCompassTimeout = opts.onTimeout || null;
    onCompassWrong = opts.onWrong || null;
    btnOui.disabled = true;
    ouiWrap.classList.remove('visible');
    compassOpts.classList.add('visible');
    compassDeadline = performance.now() + compassWindowMs;

    if (opts.lightTrapAfter) {
      trapLit = false;
      later(function () {
        if (compassResolved || phase !== 'compass') return;
        trapLit = true;
        Array.from(compassOpts.querySelectorAll('.rc-opt')).forEach(function (b) {
          if (b.dataset.role === 'structure') {
            b.classList.remove('trap-pending');
            b.classList.add('trap-lit');
          }
        });
        compassHint.textContent = "Jambe s'allume — reste sur Marcher";
      }, opts.lightTrapAfter);
    }
  }

  function enableOui(extendMs) {
    ouiWrap.classList.add('visible');
    btnOui.disabled = false;
    const remain = compassDeadline - performance.now();
    if (remain < (extendMs || 900)) {
      compassDeadline = performance.now() + (extendMs || 900);
    }
  }

  function onCompassPick(btn) {
    if (compassResolved || phase !== 'compass') return;
    const ok = btn.dataset.correct === '1';
    const face = btn.dataset.face || '';
    const role = btn.dataset.role || '';
    const step = stepById(currentStep);

    if (step.mode === 'fonction' && role === 'structure') {
      if (!trapLit) return;
      compassResolved = true;
      Array.from(compassOpts.querySelectorAll('.rc-opt')).forEach(function (b) {
        b.disabled = true;
        if (b === btn) b.classList.add('wrong');
      });
      scoreHit(false);
      spawnTear();
      setBodyVeil(true);
      if (onCompassWrong) onCompassWrong('structure');
      return;
    }

    Array.from(compassOpts.querySelectorAll('.rc-opt')).forEach(function (b) {
      b.disabled = true;
      if (b === btn) b.classList.add(ok ? 'selected' : 'wrong');
    });

    if (step.mode === 'faces' && (face === 'reagir' || !ok)) {
      compassResolved = true;
      scoreHit(false);
      setBodyVeil(true);
      spawnTear();
      spawnRipple(false);
      compassHint.textContent = 'Réagir sans pause — le Fil se déchire…';
      later(function () {
        setBodyVeil(false);
        if (onCompassWrong) onCompassWrong('reagir');
      }, 700);
      return;
    }

    if (!ok) {
      compassResolved = true;
      scoreHit(false);
      if (onCompassWrong) onCompassWrong('wrong');
      else failOutcome('Mauvais choix — le cadre ne tient pas.');
      return;
    }

    compassChoiceCorrect = true;
    scoreHit(true);

    // Futur léger: intention only — skip intermediate Oui, go straight to reflex
    if (step.mode === 'futur') {
      compassResolved = true;
      compassHint.textContent = 'Intention posée…';
      later(function () {
        if (afterCompassOui) afterCompassOui();
      }, 350);
      return;
    }

    compassHint.textContent = 'Scelle par Oui — avant la fin de la fenêtre';
    enableOui(step.mode === 'faces' ? 1000 : 900);
  }

  function onOui() {
    if (phase !== 'compass' || compassResolved) return;
    if (!compassChoiceCorrect) {
      compassResolved = true;
      scoreHit(false);
      if (onCompassWrong) onCompassWrong('oui-early');
      else failOutcome('Oui sans cause — le cadre ne tient pas.');
      return;
    }
    if (performance.now() > compassDeadline) {
      compassResolved = true;
      scoreHit(false);
      if (onCompassTimeout) onCompassTimeout();
      else failOutcome('Trop tard — la mesure est passée.');
      return;
    }
    compassResolved = true;
    ouiSealed++;
    scoreHit(true);
    spawnRipple(true);
    if (afterCompassOui) afterCompassOui();
    else finishStepAttempt();
  }


  function beginTransitionTo(stepNum) {
    clearTimers();
    stopPlayback();
    setBodyVeil(false);
    const step = stepById(stepNum);
    currentStep = stepNum;
    transTitle.textContent = 'Étape ' + step.id + ' — ' + step.title;
    transHint.textContent = step.hint;
    showScreen('transition');
    later(function () {
      startStep(stepNum);
    }, TRANSITION_MS);
  }

  async function startStep(stepNum) {
    clearTimers();
    currentStep = stepNum;
    resetScore();
    tears = [];
    pulses = [];
    driftObjs = [];
    setBodyVeil(false);
    stopPlayback();
    listenBar.classList.remove('visible');
    btnRetry.hidden = true;
    btnNext.hidden = true;
    outcomeVeiled = false;
    updateBadges();

    try {
      await initAudio();
    } catch (err) {
      console.error(err);
      introHint.textContent = "Impossible de charger l'audio. Réessaie.";
      showScreen('intro');
      refreshIntro();
      return;
    }

    const step = stepById(stepNum);
    threadProgress = 0.12 + 0.88 * ((stepNum - 1) / STEP_COUNT);

    switch (step.mode) {
      case 'illusion':
        startIllusion(step);
        break;
      case 'faces':
        startFaces(step);
        break;
      case 'identification':
        startIdentification(step);
        break;
      case 'futur':
        startFutur(step);
        break;
      case 'admiration':
        startAdmiration(step);
        break;
      case 'fonction':
        startFonction(step);
        break;
      case 'triptyque':
        startTriptyque(step);
        break;
      case 'silence':
        startSilence(step);
        break;
      default:
        failOutcome('Mode inconnu.');
    }
  }

  function startIllusion(step) {
    startReflexPhase({
      durationMs: step.reflexMs,
      label: 'Phase RÉFLEXE',
      hint: 'Tape au rythme des pulsations sur le Fil',
    });
  }

  function endIllusionReflex() {
    const okRatio = accentAccuracy();
    scoredCorrect = hits;
    scoredTotal = Math.max(1, expectedBeats.length);
    openCompass({
      options: stepById(1).options,
      windowMs: stepById(1).compassMs,
      label: 'Phase COMPAS',
      hint:
        okRatio < PASS_RATIO
          ? 'Réflexe fragile — choisis quand même la cause'
          : 'Choisis avant la fin de la mesure',
      onOui: function () {
        finishStepAttempt();
      },
      onWrong: function () {
        failOutcome('Mauvais choix — tu as subi la structure.');
      },
      onTimeout: function () {
        failOutcome(
          compassChoiceCorrect
            ? 'Oui non scellé à temps.'
            : 'Temps écoulé — la mesure est passée.'
        );
      },
    });
  }

  function startFaces(step) {
    facesBurst = 0;
    facesCycle = 0;
    startFacesBurst(step);
  }

  function startFacesBurst(step) {
    startReflexPhase({
      durationMs: step.burstMs,
      label:
        'RÉFLEXE · burst ' +
        (facesBurst + 1) +
        '/' +
        step.burstsPerCycle,
      hint: 'Pulse rapide — tape sur le Fil',
    });
  }

  function endFacesBurst() {
    const step = stepById(2);
    facesBurst++;
    if (facesBurst < step.burstsPerCycle) {
      startFacesBurst(step);
    } else {
      openCompass({
        options: step.options,
        layout: 'faces',
        windowMs: step.compassMs,
        label: 'COMPAS — Les deux faces',
        hint: 'Analyser (compas) ou Réagir (piège)',
        onOui: function () {
          afterFacesCycle(true);
        },
        onWrong: function () {
          afterFacesCycle(false);
        },
        onTimeout: function () {
          scoreHit(false);
          afterFacesCycle(false);
        },
      });
    }
  }

  function afterFacesCycle(ok) {
    void ok;
    facesCycle++;
    facesBurst = 0;
    const step = stepById(2);
    if (facesCycle >= step.cycles) {
      finishStepAttempt();
      return;
    }
    later(function () {
      startFacesBurst(step);
    }, 450);
  }

  function startIdentification(step) {
    idResolved = false;
    idLabelsLeft = step.labels.length;
    idDeadline = performance.now() + step.durationMs;
    identifyHint.textContent = step.hint;
    identifyScore.textContent = '0 / ' + step.labels.length;
    identifyOuiWrap.classList.remove('visible');
    btnIdentifyOui.disabled = true;
    floatLabels.innerHTML = '';

    const positions = [
      { left: '8%', top: '15%' },
      { left: '55%', top: '35%' },
      { left: '22%', top: '62%' },
    ];
    shuffleInPlace(step.labels.slice()).forEach(function (text, i) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rc-float-label';
      b.textContent = text;
      const pos = positions[i % positions.length];
      b.style.left = pos.left;
      b.style.top = pos.top;
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        dismissIdentityLabel(b);
      });
      let sx = 0;
      b.addEventListener('pointerdown', function (e) {
        sx = e.clientX;
      });
      b.addEventListener('pointerup', function (e) {
        if (Math.abs(e.clientX - sx) > 40) dismissIdentityLabel(b);
      });
      floatLabels.appendChild(b);
    });

    showScreen('identify');
  }

  function dismissIdentityLabel(btn) {
    if (idResolved || phase !== 'identify') return;
    if (btn.classList.contains('dismissed')) return;
    btn.classList.add('dismissed');
    idLabelsLeft--;
    const step = stepById(3);
    const gone = step.labels.length - idLabelsLeft;
    identifyScore.textContent = gone + ' / ' + step.labels.length;
    scoreHit(true);
    spawnRipple(true);
    if (idLabelsLeft <= 0) {
      identifyHint.textContent = 'Calme — scelle par Oui au centre';
      identifyOuiWrap.classList.add('visible');
      btnIdentifyOui.disabled = false;
    }
  }

  function onIdentifyOui() {
    if (idResolved || phase !== 'identify') return;
    if (idLabelsLeft > 0) {
      idResolved = true;
      scoreHit(false);
      spawnTear();
      failOutcome('Oui trop tôt — une étiquette reste active.');
      return;
    }
    idResolved = true;
    ouiSealed++;
    scoreHit(true);
    spawnRipple(true);
    finishStepAttempt();
  }

  function startFutur(step) {
    futurStage = 'compass';
    openCompass({
      options: step.options,
      windowMs: step.compassMs,
      label: 'COMPAS — Intention',
      hint: "Choisis l'intention avant le réflexe",
      onOui: function () {
        futurStage = 'reflex';
        startReflexPhase({
          durationMs: step.reflexMs,
          label: 'RÉFLEXE — Cadre posé',
          hint: 'Bref pulse sur le Fil de cette intention',
        });
      },
      onWrong: function () {
        failOutcome('Intention piégée — le futur reste lourd.');
      },
      onTimeout: function () {
        failOutcome('Temps écoulé — aucune intention posée.');
      },
    });
  }

  function endFuturReflex() {
    futurStage = 'oui';
    showScreen('compass');
    compassOpts.innerHTML = '';
    compassOpts.classList.remove('visible', 'faces', 'row');
    compassPhaseLabel.textContent = 'Scelle';
    compassHint.textContent = 'Scelle par Oui — le cadre est prêt';
    compassChoiceCorrect = true;
    compassResolved = false;
    compassWindowMs = stepById(4).ouiMs;
    compassDeadline = performance.now() + compassWindowMs;
    afterCompassOui = function () {
      finishStepAttempt();
    };
    onCompassTimeout = function () {
      failOutcome('Oui non scellé à temps.');
    };
    onCompassWrong = null;
    ouiWrap.classList.add('visible');
    btnOui.disabled = false;
  }


  function startAdmiration(step) {
    admResolved = false;
    admOuiOpen = false;
    admOuiHits = 0;
    admDuration = step.durationMs;
    admStart = performance.now();
    driftLayer.innerHTML = '';
    driftObjs = [];
    admirationHint.textContent = step.hint;
    admirationScore.textContent = '0 Oui · 0 erreurs touchées';
    admirationOuiWrap.classList.add('visible');
    btnAdmirationOui.disabled = true;
    btnAdmirationOui.classList.remove('open');
    btnAdmirationOui.classList.add('rc-oui-rare');

    admWindows = [];
    for (let i = 0; i < step.ouiWindows; i++) {
      const at =
        admStart +
        admDuration * (0.35 + (0.5 * (i + 1)) / (step.ouiWindows + 1));
      admWindows.push({ at: at, openMs: step.ouiOpenMs, used: false, hit: false });
    }

    for (let i = 0; i < step.erreurCount; i++) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'rc-drift-obj';
      el.textContent = 'erreur';
      const obj = {
        el: el,
        born: admStart + i * 900,
        life: 5000 + Math.random() * 3000,
        x: Math.random() * 70 + 5,
        y: Math.random() * 60 + 10,
        vx: (Math.random() - 0.5) * 0.035,
        vy: (Math.random() - 0.5) * 0.02,
        hit: false,
        active: false,
        passed: false,
      };
      el.style.left = obj.x + '%';
      el.style.top = obj.y + '%';
      el.style.opacity = '0';
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        onErreurTap(obj);
      });
      driftLayer.appendChild(el);
      driftObjs.push(obj);
    }

    showScreen('admiration');
  }

  function onErreurTap(obj) {
    if (admResolved || phase !== 'admiration') return;
    if (obj.hit || !obj.active) return;
    obj.hit = true;
    obj.el.classList.add('hit');
    scoreHit(false);
    spawnTear();
    setBodyVeil(true);
    later(function () {
      setBodyVeil(false);
    }, 500);
    updateAdmirationScore();
  }

  function updateAdmirationScore() {
    const errHits = driftObjs.filter(function (o) {
      return o.hit;
    }).length;
    admirationScore.textContent =
      admOuiHits + ' Oui · ' + errHits + ' erreurs touchées';
  }

  function onAdmirationOui() {
    if (admResolved || phase !== 'admiration') return;
    if (!admOuiOpen || btnAdmirationOui.disabled) {
      scoreHit(false);
      spawnTear();
      return;
    }
    admOuiHits++;
    ouiSealed++;
    scoreHit(true);
    spawnRipple(true);
    admOuiOpen = false;
    btnAdmirationOui.disabled = true;
    btnAdmirationOui.classList.remove('open');
    admWindows.forEach(function (w) {
      if (!w.used && performance.now() >= w.at && performance.now() < w.at + w.openMs) {
        w.hit = true;
      }
    });
    updateAdmirationScore();
  }

  function tickAdmiration(now) {
    if (phase !== 'admiration' || admResolved) return;
    const left = Math.max(0, admDuration - (now - admStart));
    admirationTimer.textContent = (left / 1000).toFixed(1) + ' s';

    driftObjs.forEach(function (o) {
      if (now < o.born) {
        o.el.style.opacity = '0';
        o.active = false;
        return;
      }
      const age = now - o.born;
      if (age > o.life || o.hit) {
        o.el.style.opacity = o.hit ? '0.3' : '0';
        if (age > o.life && !o.hit && !o.passed) {
          o.passed = true;
          scoreHit(true);
        }
        o.active = false;
        return;
      }
      o.active = true;
      o.x += o.vx * 16;
      o.y += o.vy * 16;
      if (o.x < 2 || o.x > 85) o.vx *= -1;
      if (o.y < 2 || o.y > 75) o.vy *= -1;
      o.el.style.left = o.x + '%';
      o.el.style.top = o.y + '%';
      o.el.style.opacity = String(Math.min(1, age / 300));
    });

    let anyOpen = false;
    admWindows.forEach(function (w) {
      if (w.used) return;
      if (now >= w.at && now < w.at + w.openMs) {
        anyOpen = true;
      } else if (now >= w.at + w.openMs) {
        w.used = true;
        if (!w.hit) scoreHit(false);
      }
    });
    if (anyOpen && !admOuiOpen) {
      admOuiOpen = true;
      btnAdmirationOui.disabled = false;
      btnAdmirationOui.classList.add('open');
      admirationHint.textContent = 'Oui — maintenant';
    } else if (!anyOpen && admOuiOpen) {
      admOuiOpen = false;
      btnAdmirationOui.disabled = true;
      btnAdmirationOui.classList.remove('open');
      admirationHint.textContent = stepById(5).hint;
    }

    const base = (currentStep - 1) / STEP_COUNT;
    threadProgress =
      0.12 + 0.88 * (base + Math.min(1, (now - admStart) / admDuration) / STEP_COUNT);

    if (now - admStart >= admDuration) {
      admResolved = true;
      finishStepAttempt();
    }
  }

  function startFonction(step) {
    fonctionCycle = 0;
    runFonctionCycle(step);
  }

  function runFonctionCycle(step) {
    trapLit = false;
    openCompass({
      options: step.options,
      layout: 'row',
      windowMs: step.compassMs,
      label: 'COMPAS — Fonction',
      hint: "Marcher avant que Jambe s'allume",
      lightTrapAfter: step.trapDelayMs,
      onOui: function () {
        fonctionCycle++;
        if (fonctionCycle >= step.cycles) {
          finishStepAttempt();
        } else {
          later(function () {
            runFonctionCycle(step);
          }, 500);
        }
      },
      onWrong: function () {
        later(function () {
          setBodyVeil(false);
          fonctionCycle++;
          if (fonctionCycle >= step.cycles) {
            finishStepAttempt();
          } else {
            runFonctionCycle(step);
          }
        }, 600);
      },
      onTimeout: function () {
        scoreHit(false);
        fonctionCycle++;
        if (fonctionCycle >= step.cycles) finishStepAttempt();
        else
          later(function () {
            runFonctionCycle(step);
          }, 400);
      },
    });
  }

  function startTriptyque(step) {
    seqIndex = 0;
    seqResolved = false;
    seqDeadline = performance.now() + step.timeoutMs;
    seqLastTap = 0;
    sequenceHint.textContent = step.hint;
    sequenceScore.textContent = '0 / ' + step.sequence.length;
    sequenceOuiWrap.classList.remove('visible');
    btnSequenceOui.disabled = true;
    seqOpts.innerHTML = '';

    const order = shuffleInPlace(
      step.sequence.map(function (t, i) {
        return { t: t, i: i };
      })
    );
    order.forEach(function (o) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rc-opt';
      b.textContent = o.t;
      b.dataset.seq = String(o.i);
      b.addEventListener('click', function () {
        onSeqTap(b, step);
      });
      seqOpts.appendChild(b);
    });
    showScreen('sequence');
  }

  function onSeqTap(btn, step) {
    if (seqResolved || phase !== 'sequence') return;
    const now = performance.now();
    if (now - seqLastTap < 280) {
      seqResolved = true;
      scoreHit(false);
      spawnTear();
      failOutcome('Trop rapide — le triptyque demande le calme.');
      return;
    }
    seqLastTap = now;
    const expect = seqIndex;
    const got = Number(btn.dataset.seq);
    if (got !== expect) {
      seqResolved = true;
      scoreHit(false);
      btn.classList.add('wrong');
      spawnTear();
      failOutcome('Mauvais ordre — repose le triptyque.');
      return;
    }
    btn.classList.add('done-seq', 'selected');
    btn.disabled = true;
    seqIndex++;
    scoreHit(true);
    spawnRipple(true);
    sequenceScore.textContent = seqIndex + ' / ' + step.sequence.length;
    if (seqIndex >= step.sequence.length) {
      sequenceHint.textContent = 'Scelle par Oui';
      sequenceOuiWrap.classList.add('visible');
      btnSequenceOui.disabled = false;
      seqDeadline = performance.now() + step.ouiMs;
    }
  }

  function onSequenceOui() {
    if (seqResolved || phase !== 'sequence') return;
    if (seqIndex < stepById(7).sequence.length) {
      scoreHit(false);
      return;
    }
    if (performance.now() > seqDeadline) {
      seqResolved = true;
      failOutcome('Oui trop tard.');
      return;
    }
    seqResolved = true;
    ouiSealed++;
    scoreHit(true);
    spawnRipple(true);
    finishStepAttempt();
  }

  function startSilence(step) {
    silenceResolved = false;
    silenceTapMisses = 0;
    silenceOuiOpen = false;
    silenceDuration = step.stillMs;
    silenceStart = performance.now();
    silencePulseAt = silenceStart + silenceDuration * 0.72;
    silenceHint.textContent = step.hint;
    silenceScore.textContent = 'calme';
    silenceOuiWrap.classList.add('visible');
    btnSilenceOui.disabled = true;
    btnSilenceOui.classList.remove('open');
    btnSilenceOui.classList.add('rc-oui-rare');
    showScreen('silence');
  }

  function onSilenceTap() {
    if (silenceResolved || phase !== 'silence') return;
    if (silenceOuiOpen) return;
    silenceTapMisses++;
    scoreHit(false);
    spawnTear();
    spawnRipple(false);
    setBodyVeil(true);
    later(function () {
      setBodyVeil(false);
    }, 400);
    silenceScore.textContent = 'agitation · ' + silenceTapMisses;
  }

  function onSilenceOui() {
    if (silenceResolved || phase !== 'silence') return;
    if (!silenceOuiOpen || btnSilenceOui.disabled) {
      scoreHit(false);
      spawnTear();
      return;
    }
    silenceResolved = true;
    ouiSealed++;
    scoreHit(true);
    const calmBonus = Math.max(0, 3 - silenceTapMisses);
    for (let i = 0; i < calmBonus; i++) scoreHit(true);
    spawnRipple(true);
    finishStepAttempt();
  }

  function tickSilence(now) {
    if (phase !== 'silence' || silenceResolved) return;
    const left = Math.max(0, silenceDuration - (now - silenceStart));
    silenceTimer.textContent = (left / 1000).toFixed(1) + ' s';

    const openMs = stepById(8).ouiOpenMs;
    if (
      now >= silencePulseAt &&
      now < silencePulseAt + openMs &&
      !silenceOuiOpen
    ) {
      silenceOuiOpen = true;
      btnSilenceOui.disabled = false;
      btnSilenceOui.classList.add('open');
      silenceHint.textContent = 'Oui — le pulse';
    } else if (now >= silencePulseAt + openMs && silenceOuiOpen) {
      silenceOuiOpen = false;
      btnSilenceOui.disabled = true;
      btnSilenceOui.classList.remove('open');
      if (!silenceResolved) {
        silenceResolved = true;
        scoreHit(false);
        failOutcome('Le pulse est passé — sans Oui pur.');
      }
    }

    const base = (currentStep - 1) / STEP_COUNT;
    threadProgress =
      0.12 +
      0.88 *
        (base +
          Math.min(1, (now - silenceStart) / silenceDuration) / STEP_COUNT);

    if (now - silenceStart >= silenceDuration && !silenceResolved) {
      silenceResolved = true;
      if (ouiSealed < 1) failOutcome('Aucun Oui pur scellé.');
      else finishStepAttempt();
    }
  }

  function tickIdentify(now) {
    if (phase !== 'identify' || idResolved) return;
    const left = Math.max(0, idDeadline - now);
    identifyTimer.textContent = (left / 1000).toFixed(1) + ' s';
    if (left <= 0) {
      idResolved = true;
      failOutcome('Temps écoulé — des étiquettes restent.');
    }
  }

  function tickSequence(now) {
    if (phase !== 'sequence' || seqResolved) return;
    if (now > seqDeadline && seqIndex < stepById(7).sequence.length) {
      seqResolved = true;
      failOutcome('Temps écoulé — le triptyque est incomplet.');
    } else if (
      seqIndex >= stepById(7).sequence.length &&
      now > seqDeadline &&
      !btnSequenceOui.disabled
    ) {
      seqResolved = true;
      failOutcome('Oui non scellé à temps.');
    }
  }


  function finishStepAttempt() {
    clearTimers();
    if (passCheck()) successOutcome();
    else failOutcome(null);
  }

  function successOutcome() {
    markStepDone(currentStep);
    outcomeVeiled = false;
    setBodyVeil(false);
    const seg = getSegment(currentStep);
    listenRange = { start: seg.start, end: seg.end };
    const step = stepById(currentStep);
    const pct = Math.round(scoreRatio() * 100);

    showScreen('outcome');
    outcomeBox.className = 'rc-outcome success';
    outcomeTitle.textContent = 'Cadre ' + currentStep + ' posé';
    outcomeMsg.textContent =
      '« ' +
      step.title +
      ' » — segment ' +
      formatRange(seg.start, seg.end) +
      ' dévoilé (' +
      pct +
      '% gestes, ' +
      ouiSealed +
      ' Oui).';
    listenBar.classList.add('visible');
    btnRetry.hidden = true;
    btnListen.textContent = 'Écouter ' + formatRange(seg.start, seg.end);
    playSegment(seg.start, seg.end, false);
    updateBadges();

    if (currentStep >= STEP_COUNT) {
      btnNext.hidden = true;
      pendingTransition = setTimeout(function () {
        stopPlayback();
        showFinale();
      }, 3200);
    } else {
      btnNext.hidden = false;
      btnNext.textContent = 'Cadre ' + (currentStep + 1);
      pendingTransition = setTimeout(function () {
        stopPlayback();
        beginTransitionTo(currentStep + 1);
      }, 2800);
    }
  }

  function failOutcome(reason) {
    clearTimers();
    outcomeVeiled = true;
    setBodyVeil(true);
    const seg = getSegment(currentStep);
    listenRange = { start: seg.start, end: seg.end };
    const step = stepById(currentStep);
    const pct = Math.round(scoreRatio() * 100);

    showScreen('outcome');
    outcomeBox.className = 'rc-outcome fail';
    outcomeTitle.textContent = 'Voile sur le cadre ' + currentStep;
    outcomeMsg.textContent =
      (reason ||
        'Gestes ' +
          pct +
          '% (besoin ≥70%) · Oui scellés : ' +
          ouiSealed +
          '.') +
      ' Segment ' +
      formatRange(seg.start, seg.end) +
      ' voilé. Repose « ' +
      step.title +
      ' ».';
    listenBar.classList.add('visible');
    btnRetry.hidden = false;
    btnRetry.textContent = 'Reposer le cadre';
    btnNext.hidden = true;
    btnListen.textContent = 'Écouter voilé ' + formatRange(seg.start, seg.end);
    playSegment(seg.start, seg.end, true);
  }

  function showFinale() {
    setBodyVeil(false);
    threadProgress = 1;
    updateBadges();
    finaleHint.textContent =
      'Les huit cadres sont posés sur « ' +
      (findSong(selectedId) ? findSong(selectedId).title : '') +
      ' ». Le Fil est clair.';
    showScreen('finale');
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

  function draw(now) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    const y = h * 0.58;
    const x0 = w * 0.08;
    const x1 = w * 0.92;

    let progress;
    if (phase === 'intro' || phase === 'finale') {
      progress = threadTargetFromProgress();
    } else if (phase === 'transition') {
      progress =
        0.12 +
        0.88 * ((currentStep - 1) / STEP_COUNT) +
        0.04 * Math.sin(now / 400);
    } else if (
      phase === 'reflex' ||
      phase === 'compass' ||
      phase === 'identify' ||
      phase === 'admiration' ||
      phase === 'sequence' ||
      phase === 'silence'
    ) {
      progress = Math.min(1, Math.max(0.12, threadProgress));
    } else {
      progress = outcomeVeiled
        ? 0.12 + 0.88 * ((currentStep - 1) / STEP_COUNT)
        : 0.12 + 0.88 * (currentStep / STEP_COUNT);
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

    const activeTears = tears.filter(function (t) {
      return now - t.born < t.life;
    });
    if (activeTears.length) {
      let cursor = x0;
      const segments = activeTears.slice().sort(function (a, b) {
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
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.fillStyle =
          'rgba(248,113,113,' + (1 - (now - tear.born) / tear.life) + ')';
        ctx.beginPath();
        ctx.arc(
          tx,
          y + Math.sin((now - tear.born) * 0.02) * 8,
          3,
          0,
          Math.PI * 2
        );
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

    if (phase === 'silence' && silenceOuiOpen) {
      const cx = w * 0.5;
      const cy = y;
      const u = ((now - silencePulseAt) / stepById(8).ouiOpenMs) % 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 20 + u * 40, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(192,132,252,' + (1 - u) + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
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

    if (phase === 'compass' && !compassResolved) {
      const cx = w * 0.5;
      const cy = h * 0.32;
      const R = Math.min(w, h) * 0.14;
      const remain = Math.max(0, compassDeadline - now);
      const frac = remain / Math.max(1, compassWindowMs);

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


  function endReflex() {
    markPassedMisses(performance.now());
    const step = stepById(currentStep);
    if (step.mode === 'illusion') {
      endIllusionReflex();
    } else if (step.mode === 'faces') {
      endFacesBurst();
    } else if (step.mode === 'futur') {
      endFuturReflex();
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
        if (onCompassTimeout) onCompassTimeout();
        else if (compassChoiceCorrect) {
          failOutcome('Oui non scellé à temps.');
        } else {
          failOutcome('Temps écoulé — la mesure est passée.');
        }
      }
    }

    tickIdentify(now);
    tickAdmiration(now);
    tickSequence(now);
    tickSilence(now);

    requestAnimationFrame(loop);
  }

  function onPointer(e) {
    if (phase === 'reflex') {
      e.preventDefault();
      registerTap(performance.now());
    } else if (phase === 'silence') {
      if (e.target === btnSilenceOui) return;
      e.preventDefault();
      onSilenceTap();
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
      } else if (phase === 'silence') {
        e.preventDefault();
        if (silenceOuiOpen && !btnSilenceOui.disabled) onSilenceOui();
        else onSilenceTap();
      } else if (
        phase === 'identify' &&
        idLabelsLeft <= 0 &&
        !btnIdentifyOui.disabled
      ) {
        e.preventDefault();
        onIdentifyOui();
      } else if (phase === 'sequence' && !btnSequenceOui.disabled) {
        e.preventDefault();
        onSequenceOui();
      } else if (
        phase === 'admiration' &&
        admOuiOpen &&
        !btnAdmirationOui.disabled
      ) {
        e.preventDefault();
        onAdmirationOui();
      }
    }
  }

  btnStart.addEventListener('click', async function () {
    if (!findSong(selectedId)) return;
    btnStart.disabled = true;
    btnStart.textContent = 'Chargement…';
    try {
      await initAudio();
    } catch (err) {
      console.error(err);
      btnStart.disabled = false;
      refreshIntro();
      introHint.textContent = "Impossible de charger l'audio. Réessaie.";
      return;
    }
    btnStart.disabled = false;
    const startAt = allDone() ? 1 : firstIncomplete();
    beginTransitionTo(startAt);
  });

  canvas.addEventListener('pointerdown', onPointer);
  window.addEventListener('keydown', onKey);

  compassOpts.addEventListener('click', function (e) {
    const btn = e.target.closest('.rc-opt');
    if (btn) onCompassPick(btn);
  });
  btnOui.addEventListener('click', onOui);
  btnIdentifyOui.addEventListener('click', onIdentifyOui);
  btnAdmirationOui.addEventListener('click', onAdmirationOui);
  btnSequenceOui.addEventListener('click', onSequenceOui);
  btnSilenceOui.addEventListener('click', onSilenceOui);

  btnListen.addEventListener('click', async function () {
    try {
      await initAudio();
    } catch (err) {
      console.error(err);
      return;
    }
    const clear = isStepDone(currentStep) && !outcomeVeiled;
    playSegment(listenRange.start, listenRange.end, !clear && outcomeVeiled);
  });
  btnStop.addEventListener('click', stopPlayback);

  btnRetry.addEventListener('click', function () {
    stopPlayback();
    setBodyVeil(false);
    clearTimers();
    beginTransitionTo(currentStep);
  });

  btnNext.addEventListener('click', function () {
    clearTimers();
    stopPlayback();
    beginTransitionTo(currentStep + 1);
  });

  btnFinaleListen.addEventListener('click', async function () {
    try {
      await initAudio();
      playSegment(0, audioBuffer.duration, false);
    } catch (err) {
      console.error(err);
    }
  });

  btnFinaleHome.addEventListener('click', function () {
    stopPlayback();
    showScreen('intro');
    refreshIntro();
  });

  window.addEventListener('resize', resize);
  resize();
  loadStorage();
  persist(true);
  renderSongPicker();
  refreshIntro();
  if (window.EdenI18n && window.EdenI18n.onChange) {
    window.EdenI18n.onChange(function () {
      stopPlayback();
      audioBuffer = null;
      loadedSongId = null;
      alignSelection();
      if (phase !== 'intro') showScreen('intro');
      renderSongPicker();
      refreshIntro();
    });
  }
  requestAnimationFrame(loop);
})();
