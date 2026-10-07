/* Rythme-Compasse — version anglaise.
   Traduit le texte rendu (statique et généré) quand la langue du site est l’anglais,
   et le rétablit en français au retour. Les titres de chansons ne sont jamais traduits. */
(function () {
  'use strict';
  var D = {
    "L'illusion de fixité": 'The illusion of fixity',
    'Les deux faces': 'The two faces',
    "L'identification": 'Identification',
    'Le futur léger': 'The light future',
    'Admiration': 'Admiration',
    'Fonction avant structure': 'Function before structure',
    'Le triptyque': 'The triptych',
    'Oui pur / zéro pur': 'Pure Yes / pure zero',
    'Touche le rythme. Choisis la cause. Scelle par Oui.': 'Tap the rhythm. Choose the cause. Seal it with Yes.',
    'Je subis la structure': 'I endure the structure',
    'Je suis la cause': 'I am the cause',
    "J'attends la vie": 'I wait for life',
    'Analyser ou réagir. Trois pulses, un choix. Scelle par Oui.': 'Analyse or react. Three pulses, one choice. Seal it with Yes.',
    'Analyser': 'Analyse',
    'Réagir': 'React',
    'Écarte corps, nom, rôle — puis scelle par Oui au centre.': 'Set aside body, name, role — then seal with Yes at the centre.',
    'corps': 'body', 'nom': 'name', 'rôle': 'role', 'erreur': 'error',
    "Pose l'intention d'abord. Puis un bref réflexe. Scelle par Oui.": 'Set the intention first. Then a brief reflex. Seal it with Yes.',
    'Attendre la vie': 'Wait for life',
    'Poster le prochain cadre': 'Set the next frame',
    'Subir le cadre': 'Endure the frame',
    'Admire : laisse passer les « erreur ». Tape seulement Oui.': 'Admire: let the “error” pass. Tap only Yes.',
    "Choisis Marcher (fonction) avant que Jambe (structure) s'allume.": 'Choose Walk (function) before Leg (structure) lights up.',
    'Marcher': 'Walk', 'Jambe': 'Leg',
    "Trois gestes calmes, dans l'ordre. Puis Oui.": 'Three calm gestures, in order. Then Yes.',
    'Ne pas juger': 'Do not judge', 'Ne pas évaluer': 'Do not evaluate', 'Ne pas invalider': 'Do not invalidate',
    "Presque immobile. N'agite pas le Fil. Un seul Oui au pulse.": 'Almost still. Do not shake the Thread. A single Yes on the pulse.',
    'Cadre actuel': 'Current frame',
    'Verrouillé': 'Locked',
    'Les 8 cadres sont posés': 'All 8 frames are set',
    'Réécoute depuis la carte, ou rejoue un cadre.': 'Listen again from the map, or replay a frame.',
    'Rejouer le Fil': 'Replay the Thread',
    'Huit cadres · Pose le Fil': 'Eight frames · Lay down the Thread',
    'Écouter le Fil complet': 'Listen to the whole Thread',
    'Phase RÉFLEXE': 'REFLEX phase',
    'Phase COMPAS': 'COMPASS phase',
    'Tape au rythme des pulsations sur le Fil': 'Tap along with the pulses on the Thread',
    'Choisis avant la fin de la mesure': 'Choose before the bar ends',
    "Jambe s'allume — reste sur Marcher": 'Leg lights up — stay with Walk',
    'Réagir sans pause — le Fil se déchire…': 'Reacting without pause — the Thread tears…',
    'Mauvais choix — le cadre ne tient pas.': 'Wrong choice — the frame does not hold.',
    'Intention posée…': 'Intention set…',
    'Scelle par Oui — avant la fin de la fenêtre': 'Seal with Yes — before the window closes',
    'Oui sans cause — le cadre ne tient pas.': 'Yes without a cause — the frame does not hold.',
    'Trop tard — la mesure est passée.': 'Too late — the bar has passed.',
    "Impossible de charger l'audio. Réessaie.": 'Could not load the audio. Try again.',
    'Réflexe fragile — choisis quand même la cause': 'Fragile reflex — choose the cause anyway',
    'Mauvais choix — tu as subi la structure.': 'Wrong choice — you endured the structure.',
    'Oui non scellé à temps.': 'Yes not sealed in time.',
    'Temps écoulé — la mesure est passée.': 'Time’s up — the bar has passed.',
    'Pulse rapide — tape sur le Fil': 'Quick pulse — tap on the Thread',
    'Analyser (compas) ou Réagir (piège)': 'Analyse (compass) or React (trap)',
    'Calme — scelle par Oui au centre': 'Calm — seal with Yes at the centre',
    'Oui trop tôt — une étiquette reste active.': 'Yes too early — a label is still active.',
    "Choisis l'intention avant le réflexe": 'Choose the intention before the reflex',
    'RÉFLEXE — Cadre posé': 'REFLEX — Frame set',
    'Bref pulse sur le Fil de cette intention': 'A brief pulse on the Thread of this intention',
    'Intention piégée — le futur reste lourd.': 'Trapped intention — the future stays heavy.',
    'Temps écoulé — aucune intention posée.': 'Time’s up — no intention set.',
    'Scelle par Oui — le cadre est prêt': 'Seal with Yes — the frame is ready',
    'Oui — maintenant': 'Yes — now',
    'Trop rapide — le triptyque demande le calme.': 'Too fast — the triptych asks for calm.',
    'Mauvais ordre — repose le triptyque.': 'Wrong order — set the triptych again.',
    'Scelle par Oui': 'Seal with Yes',
    'Oui trop tard.': 'Yes too late.',
    'Oui — le pulse': 'Yes — the pulse',
    'Le pulse est passé — sans Oui pur.': 'The pulse has passed — without a pure Yes.',
    'Aucun Oui pur scellé.': 'No pure Yes sealed.',
    'Temps écoulé — des étiquettes restent.': 'Time’s up — some labels remain.',
    'Temps écoulé — le triptyque est incomplet.': 'Time’s up — the triptych is incomplete.',
    'Reposer le cadre': 'Set the frame again',
    'Choisir une chanson': 'Choose a song',
    'Carte des 8 cadres': 'Map of the 8 frames',
    'Commencer': 'Begin',
    'Touche le rythme. Choisis. Scelle par Oui.': 'Tap the rhythm. Choose. Seal it with Yes.',
    'Passage': 'Passage',
    'Étape suivante': 'Next step',
    'IDENTIFICATION': 'IDENTIFICATION',
    'Écarte les fausses étiquettes — corps, nom, rôle': 'Set aside the false labels — body, name, role',
    'ADMIRATION': 'ADMIRATION',
    'Laisse passer les « erreur ». Tape seulement Oui.': 'Let the “error” pass. Tap only Yes.',
    'TRIPTYQUE': 'TRIPTYCH',
    "Trois gestes calmes, dans l'ordre": 'Three calm gestures, in order',
    'OUI PUR': 'PURE YES',
    "Presque immobile. N'agite pas le Fil.": 'Almost still. Do not shake the Thread.',
    'calme': 'calm',
    'Écouter': 'Listen',
    'Cadre suivant': 'Next frame',
    'Fil complet': 'The whole Thread',
    'Les huit cadres sont posés. Le segment final est clair.': 'All eight frames are set. The final segment is clear.',
    'Écouter le Fil': 'Listen to the Thread',
    'Retour à la carte': 'Back to the map',
    'Oui': 'Yes',
    'Cadres débloqués': 'Unlocked frames',
    'Options du compas': 'Compass options',
    'Séquence': 'Sequence',
    'Rythme-Compasse · Huit cadres. Pose le Fil, écoute clairement.': 'Rythme-Compasse · Eight frames. Lay down the Thread, listen clearly.',
    'Huit cadres. Touche le rythme. Pose le Fil. Scelle par Oui.': 'Eight frames. Tap the rhythm. Lay down the Thread. Seal it with Yes.',
    'Eden Yours — Écoute en continu. Ça régénère. 29 chansons · Casse-tête · Blind test': 'Eden Yours — Continuous listening. It regenerates. 29 songs · Puzzle · Blind test'
  };
  var R = {};
  Object.keys(D).forEach(function (k) { R[D[k]] = k; });
  function ft(s, map) { return Object.prototype.hasOwnProperty.call(map, s) ? map[s] : s; }
  /* Gabarits [regex FR, fonction EN, regex EN, fonction FR]; « titre de chanson » laissé tel quel. */
  var P = [
    [/^Cadre (\d+) — (.+?) · (\d+)\/8$/, function (m) { return 'Frame ' + m[1] + ' — ' + ft(m[2], D) + ' · ' + m[3] + '/8'; },
     /^Frame (\d+) — (.+?) · (\d+)\/8$/, function (m) { return 'Cadre ' + m[1] + ' — ' + ft(m[2], R) + ' · ' + m[3] + '/8'; }],
    [/^Cadre (\d+) — (.+)$/, function (m) { return 'Frame ' + m[1] + ' — ' + ft(m[2], D); },
     /^Frame (\d+) — (.+)$/, function (m) { return 'Cadre ' + m[1] + ' — ' + ft(m[2], R); }],
    [/^Étape (\d+) — (.+)$/, function (m) { return 'Step ' + m[1] + ' — ' + ft(m[2], D); },
     /^Step (\d+) — (.+)$/, function (m) { return 'Étape ' + m[1] + ' — ' + ft(m[2], R); }],
    [/^Cadre (\d+) posé$/, function (m) { return 'Frame ' + m[1] + ' set'; },
     /^Frame (\d+) set$/, function (m) { return 'Cadre ' + m[1] + ' posé'; }],
    [/^Cadre (\d+)$/, function (m) { return 'Frame ' + m[1]; }, /^Frame (\d+)$/, function (m) { return 'Cadre ' + m[1]; }],
    [/^Réécouter le cadre (\d+)$/, function (m) { return 'Listen again to frame ' + m[1]; },
     /^Listen again to frame (\d+)$/, function (m) { return 'Réécouter le cadre ' + m[1]; }],
    [/^Écouter cadres 1–(\d+)$/, function (m) { return 'Listen to frames 1–' + m[1]; },
     /^Listen to frames 1–(\d+)$/, function (m) { return 'Écouter cadres 1–' + m[1]; }],
    [/^Voile sur le cadre (\d+)$/, function (m) { return 'A veil over frame ' + m[1]; },
     /^A veil over frame (\d+)$/, function (m) { return 'Voile sur le cadre ' + m[1]; }],
    [/^Écouter voilé (.+)$/, function (m) { return 'Listen veiled ' + m[1]; }, /^Listen veiled (.+)$/, function (m) { return 'Écouter voilé ' + m[1]; }],
    [/^Écouter (\d.+)$/, function (m) { return 'Listen ' + m[1]; }, /^Listen (\d.+)$/, function (m) { return 'Écouter ' + m[1]; }],
    [/^RÉFLEXE · burst (.+)$/, function (m) { return 'REFLEX · burst ' + m[1]; }, /^REFLEX · burst (.+)$/, function (m) { return 'RÉFLEXE · burst ' + m[1]; }],
    [/^(\d+) Oui · (\d+) erreurs touchées$/, function (m) { return m[1] + ' Yes · ' + m[2] + ' errors touched'; },
     /^(\d+) Yes · (\d+) errors touched$/, function (m) { return m[1] + ' Oui · ' + m[2] + ' erreurs touchées'; }],
    [/^« (.+?) » — segment (.+?) dévoilé \((\d+)% gestes, (\d+) Oui\)\.$/,
     function (m) { return '“' + ft(m[1], D) + '” — segment ' + m[2] + ' unveiled (' + m[3] + '% gestures, ' + m[4] + ' Yes).'; },
     /^“(.+?)” — segment (.+?) unveiled \((\d+)% gestures, (\d+) Yes\)\.$/,
     function (m) { return '« ' + ft(m[1], R) + ' » — segment ' + m[2] + ' dévoilé (' + m[3] + '% gestes, ' + m[4] + ' Oui).'; }],
    [/^Gestes (\d+)% \(besoin ≥70%\) · Oui scellés : (\d+)\. Segment (.+?) voilé\. Repose « (.+) »\.$/,
     function (m) { return 'Gestures ' + m[1] + '% (needs ≥70%) · Yes sealed: ' + m[2] + '. Segment ' + m[3] + ' veiled. Set “' + ft(m[4], D) + '” again.'; },
     /^Gestures (\d+)% \(needs ≥70%\) · Yes sealed: (\d+)\. Segment (.+?) veiled\. Set “(.+)” again\.$/,
     function (m) { return 'Gestes ' + m[1] + '% (besoin ≥70%) · Oui scellés : ' + m[2] + '. Segment ' + m[3] + ' voilé. Repose « ' + ft(m[4], R) + ' ».'; }],
    [/^(.+?) Segment (.+?) voilé\. Repose « (.+) »\.$/,
     function (m) { return ft(m[1], D) + ' Segment ' + m[2] + ' veiled. Set “' + ft(m[3], D) + '” again.'; },
     /^(.+?) Segment (.+?) veiled\. Set “(.+)” again\.$/,
     function (m) { return ft(m[1], R) + ' Segment ' + m[2] + ' voilé. Repose « ' + ft(m[3], R) + ' ».'; }],
    [/^Les huit cadres sont posés sur « (.*) »\. Le Fil est clair\.$/,
     function (m) { return 'All eight frames are set on “' + m[1] + '”. The Thread is clear.'; },
     /^All eight frames are set on “(.*)”\. The Thread is clear\.$/,
     function (m) { return 'Les huit cadres sont posés sur « ' + m[1] + ' ». Le Fil est clair.'; }]
  ];
  function isEn() { return !!(window.EdenI18n && EdenI18n.getLang && EdenI18n.getLang() === 'en'); }
  function tr(s, en) {
    if (!s) return s;
    var t = s.trim(); if (!t) return s;
    var map = en ? D : R, out = null;
    if (Object.prototype.hasOwnProperty.call(map, t)) out = map[t];
    else for (var i = 0; i < P.length; i++) {
      var m = t.match(en ? P[i][0] : P[i][2]);
      if (m) { out = (en ? P[i][1] : P[i][3])(m); break; }
    }
    return out == null || out === t ? s : s.replace(t, out);
  }
  var busy = false;
  function node(n, en) {
    if (n.nodeType === 3) {
      var p = n.parentElement;
      if (p && p.closest('script,style,.rc-song-list,.lang-switch')) return;
      var v = tr(n.nodeValue, en); if (v !== n.nodeValue) n.nodeValue = v;
    } else if (n.nodeType === 1) {
      if (n.closest('.rc-song-list,.lang-switch')) return;
      ['title', 'aria-label'].forEach(function (a) {
        if (n.hasAttribute(a)) { var o = n.getAttribute(a), v = tr(o, en); if (v !== o) n.setAttribute(a, v); }
      });
      for (var c = n.firstChild; c; c = c.nextSibling) node(c, en);
    }
  }
  function all(en) {
    busy = true;
    node(document.body, en);
    document.title = tr(document.title, en);
    Array.prototype.forEach.call(document.querySelectorAll('meta[content]'), function (m) {
      var o = m.getAttribute('content'), v = tr(o, en); if (v !== o) m.setAttribute('content', v);
    });
    busy = false;
  }
  function start() {
    all(isEn());
    new MutationObserver(function (list) {
      if (busy || !isEn()) return;
      busy = true;
      list.forEach(function (r) {
        if (r.type === 'characterData') node(r.target, true);
        else if (r.type === 'attributes') node(r.target, true);
        else r.addedNodes.forEach(function (x) { node(x, true); });
        if (r.type === 'childList' && r.target.nodeType === 1) node(r.target, true);
      });
      busy = false;
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label'] });
    if (window.EdenI18n && EdenI18n.onChange) EdenI18n.onChange(function () { setTimeout(function () { all(isEn()); }, 0); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
