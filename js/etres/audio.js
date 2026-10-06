/* Les Êtres de Lumière — moteur sonore Web Audio (synthèse uniquement, aucun fichier).
   Une nappe de fond + 5 couches de planètes (mode, timbre et rythme propres),
   fondu enchaîné selon la distance, réverbération par ConvolverNode à impulsion générée. */
(function () {
  "use strict";
  var EL = window.EL, U = EL.util;
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  var A = (EL.Audio = { started: false, muted: EL.store.muted(), ctx: null });
  var ctx, master, verb, noiseBuf, drone, air, chimeBus, layers = [], timer = null;
  var focusIdx = -1, presence = [0, 0, 0, 0, 0], droneLevel = -1, fadedOut = false;
  var rnd = U.rng(7);
  var MASTER = 0.8;
  var VOL = [1.0, 0.9, 0.85, 0.9, 1.0];     // équilibre des couches
  var SENDS = [0.75, 0.55, 0.45, 0.6, 0.65]; // départ réverbération

  /* ---------- briques ---------- */
  function gain(v) { var g = ctx.createGain(); g.gain.value = v; return g; }
  function osc(type, f) { var o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); return o; }
  function biquad(type, f, q) { var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
  function lfo(rate, depth, param) { var o = osc("sine", rate), g = gain(depth); o.connect(g); g.connect(param); return o; }
  function route(node, send) {
    node.connect(master);
    if (send > 0) { var s = gain(send); node.connect(s); s.connect(verb); }
  }
  function impulse(seconds, decay) {
    var rate = ctx.sampleRate, len = Math.floor(rate * seconds), buf = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch), r = U.rng(11 + ch * 97), pre = Math.floor(rate * 0.025);
      for (var i = 0; i < len; i++) {
        if (i < pre) { d[i] = 0; continue; }
        var k = (i - pre) / (len - pre);
        // bruit décroissant, légèrement assombri au fil du temps
        d[i] = (r() * 2 - 1) * Math.pow(1 - k, decay) * (i % 2 ? 1 : 1 - k * 0.5);
      }
    }
    return buf;
  }
  function makeNoise() {
    var len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0), r = U.rng(3);
    for (var i = 0; i < len; i++) d[i] = r() * 2 - 1;
    return b;
  }
  function noiseSrc() {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(); return s;
  }
  function env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  /* cloche de verre : partiels inharmoniques */
  function bell(dest, f, t, vel, partials) {
    partials = partials || [[1, 1, 3.4], [2.756, 0.42, 2.1], [5.404, 0.2, 1.2], [8.933, 0.09, 0.65]];
    for (var i = 0; i < partials.length; i++) {
      var p = partials[i], o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f * p[0];
      env(g, t, 0.07 * vel * p[1], 0.006, p[2]);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + p[2] + 0.1);
    }
  }
  /* kalimba : lame pincée (fondamental + harmonique de lame) */
  function pluck(dest, f, t, vel) {
    var parts = [[1, "sine", 0.1, 1.5], [5.95, "sine", 0.03, 0.16], [2, "triangle", 0.018, 0.35]];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], o = ctx.createOscillator(), g = ctx.createGain();
      o.type = p[1]; o.frequency.value = f * p[0];
      env(g, t, p[2] * vel, 0.003, p[3]);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + p[3] + 0.1);
    }
  }

  /* ---------- voix des planètes ---------- */
  var VOICES = [
    /* 0 · Sensibilité Pure — ré lydien, cloches de verre, nappe de sinus nacrée, rythme libre et clairsemé */
    function (L) {
      var pad = gain(1); pad.connect(L.input);
      [62, 69, 76, 81].forEach(function (m, k) {
        var o = osc("sine", mtof(m)), g = gain(0.012 - k * 0.002);
        lfo(0.07 + k * 0.03, 0.006, g.gain);
        o.connect(g); g.connect(pad);
      });
      var scale = [74, 76, 78, 80, 81, 83, 85, 86, 88, 90];
      var next = 0;
      return {
        tick: function (now) {
          if (next < now - 1) next = now + 0.15;
          while (next < now + 0.3) {
            var t = Math.max(next, now + 0.02), k = (rnd() * scale.length) | 0;
            bell(L.input, mtof(scale[k]), t, 0.55 + rnd() * 0.45);
            if (rnd() < 0.35) bell(L.input, mtof(scale[Math.min(scale.length - 1, k + 2)]), t + 0.22 + rnd() * 0.2, 0.35);
            next = t + 1.3 + rnd() * 1.9;
          }
        }
      };
    },
    /* 1 · Corps-Antenne — mi dorien, chœur chaud (scies désaccordées + filtre), accords lents en glissando */
    function (L) {
      var chords = [[52, 59, 62, 66, 67], [50, 57, 61, 64, 66], [55, 59, 62, 66, 69], [45, 52, 57, 61, 64]];
      var filt = biquad("lowpass", 950, 1.4), vowel = biquad("peaking", 760, 1.2);
      vowel.gain.value = 7;
      filt.connect(vowel); vowel.connect(L.input);
      lfo(0.05, 380, filt.frequency);
      var vib = osc("sine", 4.7), vibG = gain(7); vib.connect(vibG);
      var oscs = [];
      chords[0].forEach(function (m) {
        var vg = gain(0.0125);
        [-9, 9].forEach(function (d) {
          var o = osc("sawtooth", mtof(m)); o.detune.value = d; vibG.connect(o.detune);
          o.connect(vg); oscs.push({ o: o, k: oscs.length >> 1 });
        });
        vg.connect(filt);
      });
      var ci = 0, next = 0;
      return {
        tick: function (now) {
          if (next < now - 1) next = now + 9;
          if (now >= next) {
            ci = (ci + 1) % chords.length;
            oscs.forEach(function (v) { v.o.frequency.setTargetAtTime(mtof(chords[ci][v.k]), now, 0.9); });
            next = now + 9;
          }
        }
      };
    },
    /* 2 · Admiration — fa majeur, arpège de kalimba pincé, pulsation régulière et chantante */
    function (L) {
      var chords = [[65, 69, 72, 77], [62, 65, 69, 74], [58, 65, 70, 74], [60, 64, 67, 72]];
      var pattern = [0, 1, 2, 3, 2, 1, 3, 2], step = 0.27, next = 0, s = 0, ci = 0;
      var bus = biquad("lowpass", 5200, 0.4); bus.connect(L.input);
      return {
        tick: function (now) {
          if (next < now - 1) { next = now + 0.1; s = 0; }
          while (next < now + 0.3) {
            var t = Math.max(next, now + 0.02), ch = chords[ci];
            var m = ch[pattern[s % 8]] + (s % 16 >= 12 ? 12 : 0);
            if (rnd() > 0.12) pluck(bus, mtof(m), t, 0.55 + rnd() * 0.45);
            if (s % 8 === 0) pluck(bus, mtof(ch[0] - 24), t, 0.85);
            s++;
            if (s % 16 === 0) ci = (ci + 1) % chords.length;
            next = t + step * (1 + (rnd() - 0.5) * 0.05);
          }
        }
      };
    },
    /* 3 · Le Nous — sol mixolydien, chœur de nombreuses voix qui gonflent ensemble + petites lumières tintantes */
    function (L) {
      var A1 = [43, 55, 59, 62, 65, 67, 69, 71, 74, 77, 79, 83];
      var B1 = [48, 55, 60, 64, 65, 67, 72, 71, 76, 77, 79, 84];
      var filt = biquad("lowpass", 2300, 0.6), sw = gain(0.5);
      filt.connect(sw); sw.connect(L.input);
      var vs = A1.map(function (m, k) {
        var o = osc(k % 3 ? "triangle" : "sine", mtof(m)), g = gain(0.011);
        o.detune.value = (rnd() - 0.5) * 22;
        lfo(4 + rnd() * 1.6, 5, o.detune);
        lfo(0.04 + rnd() * 0.08, 0.009, g.gain);
        o.connect(g); g.connect(filt);
        return o;
      });
      var nextSwell = 0, nextChord = 0, nextPing = 0, alt = false;
      return {
        tick: function (now) {
          if (nextSwell < now - 1) { nextSwell = now + 0.1; nextChord = now + 16; nextPing = now + 0.5; }
          if (now >= nextSwell) {
            sw.gain.setTargetAtTime(1.05, now, 1.4);
            sw.gain.setTargetAtTime(0.42, now + 4, 1.6);
            nextSwell = now + 8;
          }
          if (now >= nextChord) {
            alt = !alt;
            vs.forEach(function (o, k) { o.frequency.setTargetAtTime(mtof((alt ? B1 : A1)[k]), now, 1.2); });
            nextChord = now + 16;
          }
          while (nextPing < now + 0.3) {
            var t = Math.max(nextPing, now + 0.02), pool = alt ? [79, 84, 88, 91] : [79, 83, 86, 91];
            bell(L.input, mtof(pool[(rnd() * 4) | 0]), t, 0.18 + rnd() * 0.12, [[1, 1, 0.9], [2.01, 0.3, 0.4]]);
            nextPing = t + 0.35 + rnd() * 0.7;
          }
        }
      };
    },
    /* 4 · La Cause Pure — do, bourdon profond résonant + série d'harmoniques qui chantent, pulsation lente */
    function (L) {
      var f0 = mtof(36);
      var sub = osc("sine", f0), subG = gain(0.06); sub.connect(subG); subG.connect(L.input);
      var saw = osc("sawtooth", f0 * 1.001), res = biquad("lowpass", 320, 9), sawG = gain(0.022);
      lfo(0.023, 240, res.frequency);
      saw.connect(res); res.connect(sawG); sawG.connect(L.input);
      var ot = gain(0.7); ot.connect(L.input);
      for (var h = 2; h <= 11; h++) {
        var o = osc("sine", f0 * h), g = gain(0.011 / Math.sqrt(h));
        lfo(0.015 + rnd() * 0.06, 0.011 / Math.sqrt(h), g.gain);
        o.connect(g); g.connect(ot);
      }
      var nextPulse = 0, nextBowl = 0;
      return {
        tick: function (now) {
          if (nextPulse < now - 1) { nextPulse = now + 0.1; nextBowl = now + 1.5; }
          if (now >= nextPulse) {
            ot.gain.setTargetAtTime(1.25, now, 1.2);
            ot.gain.setTargetAtTime(0.6, now + 3, 1.5);
            nextPulse = now + 6;
          }
          if (now >= nextBowl) {
            bell(L.input, mtof(48), now + 0.05, 0.9, [[1, 1, 7], [2.71, 0.35, 4.5], [5.12, 0.12, 2.2], [1.003, 0.6, 7]]);
            nextBowl = now + 12;
          }
        }
      };
    }
  ];

  function buildLayer(i) {
    var L = { i: i, level: 0 };
    L.input = gain(1);
    L.filt = biquad("lowpass", 12000, 0.5);
    L.swell = gain(1);
    L.out = gain(0);
    L.input.connect(L.filt); L.filt.connect(L.swell); L.swell.connect(L.out);
    route(L.out, SENDS[i]);
    L.voice = VOICES[i](L);
    return L;
  }

  function buildDrone() {
    drone = gain(0);
    var lp = biquad("lowpass", 430, 0.7);
    lfo(0.045, 160, lp.frequency);
    [[38, 0.034], [45, 0.024], [50, 0.012], [57, 0.006]].forEach(function (d, k) {
      var o = osc(k === 3 ? "sine" : "triangle", mtof(d[0])), g = gain(d[1]);
      o.detune.value = (k - 1.5) * 3;
      lfo(0.03 + k * 0.017, d[1] * 0.4, g.gain);
      o.connect(g); g.connect(lp);
    });
    lp.connect(drone);
    var wind = noiseSrc(), bp = biquad("bandpass", 520, 0.9), wg = gain(0.012);
    lfo(0.028, 320, bp.frequency);
    wind.connect(bp); bp.connect(wg); wg.connect(drone);
    route(drone, 0.55);
  }

  function buildAir() {
    var n = noiseSrc(), f = biquad("bandpass", 380, 1.1), g = gain(0);
    n.connect(f); f.connect(g);
    route(g, 0.5);
    air = { f: f, g: g };
    chimeBus = gain(1);
    route(chimeBus, 0.9);
  }

  function applyMix() {
    if (!A.started) return;
    var now = ctx.currentTime, maxP = 0;
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i], target = focusIdx >= 0 ? (i === focusIdx ? 1 : 0) : presence[i];
      maxP = Math.max(maxP, presence[i]);
      if (Math.abs(target - L.level) > 0.004) {
        L.out.gain.setTargetAtTime(target * VOL[i], now, focusIdx >= 0 ? 1.2 : 0.45);
        L.level = target;
      }
    }
    var d = focusIdx >= 0 ? 0.3 : 1 - 0.6 * maxP;
    if (Math.abs(d - droneLevel) > 0.01) { drone.gain.setTargetAtTime(d, now, 0.8); droneLevel = d; }
  }

  function tick() {
    if (!A.started || ctx.state !== "running") return;
    applyMix();
    var now = ctx.currentTime;
    for (var i = 0; i < layers.length; i++) {
      if (layers[i].level > 0.012) layers[i].voice.tick(now);
    }
  }

  /* ---------- API ---------- */
  A.start = function () {
    if (A.started) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    A.ctx = ctx; A.started = true;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.5;
    master = gain(0.0001);
    master.connect(comp); comp.connect(ctx.destination);
    verb = ctx.createConvolver();
    verb.buffer = impulse(4.6, 2.4);
    var wet = gain(0.62); verb.connect(wet); wet.connect(master);
    noiseBuf = makeNoise();
    buildDrone(); buildAir();
    for (var i = 0; i < 5; i++) layers[i] = buildLayer(i);
    if (ctx.state === "suspended") ctx.resume();
    master.gain.setTargetAtTime(A.muted ? 0 : MASTER, ctx.currentTime + 0.05, 1.4);
    timer = setInterval(tick, 80);
  };

  A.setPresence = function (arr) { for (var i = 0; i < 5; i++) presence[i] = arr[i]; };
  A.focus = function (i) { focusIdx = i; applyMix(); };
  A.unfocus = function () { focusIdx = -1; A.breathEnd(); applyMix(); };

  A.setMuted = function (m) {
    A.muted = !!m;
    EL.store.setMuted(A.muted);
    if (A.started && !fadedOut) master.gain.setTargetAtTime(A.muted ? 0 : MASTER, ctx.currentTime, 0.25);
  };

  A.suspend = function () { if (A.started && ctx.state === "running") ctx.suspend(); };
  A.resume = function () { if (A.started && ctx.state === "suspended" && !fadedOut) ctx.resume(); };

  /* souffle : inspire = filtre qui s'ouvre + volume qui monte, expire = l'inverse */
  A.breathe = function (inhale, dur) {
    if (!A.started) return;
    var now = ctx.currentTime, L = layers[focusIdx];
    function ramp(param, to, exp) {
      param.cancelScheduledValues(now);
      param.setValueAtTime(Math.max(0.0001, param.value), now);
      if (exp) param.exponentialRampToValueAtTime(to, now + dur);
      else param.linearRampToValueAtTime(to, now + dur);
    }
    if (L) {
      ramp(L.filt.frequency, inhale ? 9000 : 650, true);
      ramp(L.swell.gain, inhale ? 1.15 : 0.5, false);
    }
    ramp(air.g.gain, inhale ? 0.06 : 0.012, false);
    ramp(air.f.frequency, inhale ? 1500 : 280, true);
  };
  A.breathEnd = function () {
    if (!A.started) return;
    var now = ctx.currentTime;
    layers.forEach(function (L) {
      L.filt.frequency.cancelScheduledValues(now); L.filt.frequency.setTargetAtTime(12000, now, 0.8);
      L.swell.gain.cancelScheduledValues(now); L.swell.gain.setTargetAtTime(1, now, 0.8);
    });
    air.g.gain.cancelScheduledValues(now); air.g.gain.setTargetAtTime(0, now, 0.6);
  };

  /* souffle de descente / montée dans l'atmosphère */
  A.whoosh = function (up, dur) {
    if (!A.started) return;
    var now = ctx.currentTime, n = noiseSrc(), f = biquad("bandpass", up ? 220 : 2600, 1.4), g = gain(0.0001);
    n.connect(f); f.connect(g); g.connect(chimeBus);
    f.frequency.exponentialRampToValueAtTime(up ? 2600 : 220, now + dur);
    g.gain.exponentialRampToValueAtTime(0.09, now + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    n.stop(now + dur + 0.1);
  };

  /* carillon : l'éclat de lumière rejoint l'être */
  A.chime = function () {
    if (!A.started) return;
    var now = ctx.currentTime;
    [74, 78, 81, 86, 90, 93].forEach(function (m, k) {
      bell(chimeBus, mtof(m), now + 0.03 + k * 0.11, 1 - k * 0.09);
    });
    bell(chimeBus, mtof(62), now + 0.03, 0.7, [[1, 1, 5], [2.0, 0.3, 3]]);
  };
  /* petit tintement doux (interface) */
  A.ping = function (m) {
    if (!A.started) return;
    bell(chimeBus, mtof(m || 86), ctx.currentTime + 0.02, 0.35, [[1, 1, 1.4], [2.756, 0.3, 0.7]]);
  };

  /* finale : la synthèse s'efface pour laisser place à la chanson */
  A.fadeOutAll = function (sec) {
    if (!A.started) return;
    fadedOut = true;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, sec / 4);
  };
  A.fadeBackIn = function () {
    if (!A.started) return;
    fadedOut = false;
    if (ctx.state === "suspended") ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(A.muted ? 0 : MASTER, ctx.currentTime, 1.2);
  };
})();
