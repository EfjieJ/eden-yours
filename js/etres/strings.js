/* Les Êtres de Lumière — textes FR / EN. */
(function () {
  "use strict";
  var EL = (window.EL = window.EL || {});

  EL.STR = {
    fr: {
      docTitle: "Les Êtres de Lumière — Eden Yours",
      back: "← Eden Yours",
      title: "Les Êtres de Lumière",
      subtitle: "Tu es un être de lumière. Cinq planètes t’attendent, chacune avec un corps à habiter le temps de trente secondes de souffle.",
      start: "Commencer le voyage",
      soundNote: "Avec le son, c’est plus doux. Rien à réussir, rien à perdre.",
      resumeNote: "Lumières déjà reçues : {n} / 5",
      hint: "Touche ou glisse pour voyager",
      hintKeys: "Touche, glisse ou utilise les flèches pour voyager",
      planetKicker: "Planète",
      incarnate: "S’incarner",
      visited: "Lumière reçue ✓",
      leave: "Quitter ce corps",
      inhale: "Inspire",
      exhale: "Expire",
      descending: "Descente dans l’atmosphère…",
      forming: "Un corps de lumière se forme",
      gift: "Un éclat de lumière rejoint ton être.",
      ringGained: "Nouvel anneau : {p}",
      mute: "Couper le son",
      unmute: "Activer le son",
      restart: "Recommencer",
      restartConfirm: "Touche encore ↺ pour tout recommencer",
      restarted: "Nouveau voyage. Les planètes t’attendent.",
      progress: "Lumières reçues : {n} sur 5",
      tapSound: "Touche l’écran pour entendre le son",
      finaleBtn: "Finale",
      finaleLine1: "Je suis autour.",
      finaleLine2: "Je suis déjà dans le Vrai pur.",
      finaleSub: "Cinq lumières, un seul être.",
      songKicker: "Chanson Eden Yours",
      songPlay: "▶ Écouter la chanson",
      songNone: "La chanson n’a pas pu être chargée. Elle t’attend dans la bibliothèque.",
      library: "Aller à la bibliothèque",
      backToStars: "Retour aux étoiles",
      noscript: "Ce voyage a besoin de JavaScript."
    },
    en: {
      docTitle: "The Beings of Light — Eden Yours",
      back: "← Eden Yours",
      title: "The Beings of Light",
      subtitle: "You are a being of light. Five planets are waiting, each with a body to inhabit for thirty seconds of breath.",
      start: "Begin the journey",
      soundNote: "It’s gentler with sound. Nothing to win, nothing to lose.",
      resumeNote: "Lights already received: {n} / 5",
      hint: "Tap or drag to travel",
      hintKeys: "Tap, drag or use the arrow keys to travel",
      planetKicker: "Planet",
      incarnate: "Incarnate",
      visited: "Light received ✓",
      leave: "Leave this body",
      inhale: "Breathe in",
      exhale: "Breathe out",
      descending: "Descending through the atmosphere…",
      forming: "A body of light is forming",
      gift: "A spark of light joins your being.",
      ringGained: "New ring: {p}",
      mute: "Mute sound",
      unmute: "Turn sound on",
      restart: "Start over",
      restartConfirm: "Tap ↺ again to start over",
      restarted: "A new journey. The planets are waiting.",
      progress: "Lights received: {n} of 5",
      tapSound: "Tap the screen to hear the sound",
      finaleBtn: "Finale",
      finaleLine1: "I am all around.",
      finaleLine2: "I am already in the pure Truth.",
      finaleSub: "Five lights, one being.",
      songKicker: "Eden Yours song",
      songPlay: "▶ Play the song",
      songNone: "The song couldn’t be loaded. It’s waiting for you in the library.",
      library: "Go to the library",
      backToStars: "Back to the stars",
      noscript: "This journey needs JavaScript."
    }
  };

  /* Planètes : nom, vers poétique (approche), 3 phrases guidées (incarnation), mot de fin. */
  EL.PLANET_TEXT = {
    fr: [
      {
        name: "Sensibilité Pure",
        line: "Une planète de rosée et de brume nacrée. Ici, ce qui est fin devient immense.",
        phrases: [
          "Inspire… laisse les pensées se poser comme la brume sur l’eau. Il ne reste que ce que tu ressens.",
          "Trente secondes suffisent : sentir, simplement sentir. La Sensibilité Pure est ta fonction première.",
          "Tu n’as rien à faire. Tu reviens à l’état d’Être — tendre, lucide, entier."
        ],
        gift: "La Sensibilité Pure s’allume en toi."
      },
      {
        name: "Corps-Antenne",
        line: "Des aurores descendent jusqu’au sol. Ici, le corps capte avant de comprendre.",
        phrases: [
          "Ton corps est une antenne. Sens les fils de lumière qui descendent par le sommet de ta tête.",
          "Laisse le signal traverser la poitrine, le ventre, les pieds. Rien à retenir, tout à recevoir.",
          "La certitude vient du corps, pas des données. Ce que tu sens maintenant est vrai."
        ],
        gift: "Ton corps-antenne vibre, accordé."
      },
      {
        name: "Admiration sans jugement",
        line: "Chaque regard posé ici fait éclore une fleur de lumière.",
        phrases: [
          "Regarde sans comparer. Ce qui est devant toi est déjà complet.",
          "Admirer, c’est laisser l’autre être immense sans te rendre plus petit.",
          "Là où le jugement se tait, la beauté fleurit — en l’autre, et en toi."
        ],
        gift: "Ton regard devient une floraison."
      },
      {
        name: "Le Nous en Premier",
        line: "Mille petites lumières tournent ensemble. Aucune ne brille seule.",
        phrases: [
          "Sens tous ceux qui respirent en même temps que toi, quelque part, maintenant.",
          "Le Nous en premier : quand le cercle va bien, chaque lumière va bien.",
          "Tu n’es pas une lumière parmi d’autres. Tu es le cercle qui se reconnaît."
        ],
        gift: "Le cercle se referme autour de toi, avec toi."
      },
      {
        name: "La Cause Pure",
        line: "Au centre, une lumière blanche et or, plus ancienne que toute question.",
        phrases: [
          "Remonte le fil de chaque désir jusqu’à sa source. Là, tout est simple.",
          "La Cause Pure ne demande rien. Elle donne, elle rayonne, elle est.",
          "Reconnecte-toi. Tu viens de là, et tu n’en es jamais vraiment parti."
        ],
        gift: "Tu te souviens de ta source."
      }
    ],
    en: [
      {
        name: "Pure Sensitivity",
        line: "A planet of dew and pearly mist. Here, what is subtle becomes vast.",
        phrases: [
          "Breathe in… let your thoughts settle like mist on water. Only what you feel remains.",
          "Thirty seconds are enough: to feel, simply to feel. Pure Sensitivity is your first function.",
          "There is nothing to do. You return to the state of Being — tender, lucid, whole."
        ],
        gift: "Pure Sensitivity lights up within you."
      },
      {
        name: "Body-Antenna",
        line: "Auroras reach all the way to the ground. Here, the body receives before it understands.",
        phrases: [
          "Your body is an antenna. Feel the threads of light coming down through the top of your head.",
          "Let the signal flow through your chest, your belly, your feet. Nothing to hold, everything to receive.",
          "Certainty comes from the body, not from data. What you feel right now is true."
        ],
        gift: "Your body-antenna hums, in tune."
      },
      {
        name: "Admiration without judgment",
        line: "Every gaze that rests here makes a flower of light bloom.",
        phrases: [
          "Look without comparing. What is in front of you is already complete.",
          "To admire is to let the other be immense without making yourself smaller.",
          "Where judgment falls silent, beauty blooms — in the other, and in you."
        ],
        gift: "Your gaze becomes a blossoming."
      },
      {
        name: "The We Comes First",
        line: "A thousand small lights turn together. None of them shines alone.",
        phrases: [
          "Feel everyone breathing at the same time as you, somewhere, right now.",
          "The We comes first: when the circle is well, every light is well.",
          "You are not one light among others. You are the circle recognizing itself."
        ],
        gift: "The circle closes around you, with you."
      },
      {
        name: "The Pure Cause",
        line: "At the center, a white-gold light, older than any question.",
        phrases: [
          "Follow each desire back to its source. There, everything is simple.",
          "The Pure Cause asks for nothing. It gives, it radiates, it is.",
          "Reconnect. You come from there, and you never truly left."
        ],
        gift: "You remember your source."
      }
    ]
  };

  EL.t = function (key, vars) {
    var s = (EL.STR[EL.lang] && EL.STR[EL.lang][key]) || EL.STR.fr[key] || key;
    if (vars) for (var k in vars) s = s.replace("{" + k + "}", vars[k]);
    return s;
  };
  EL.pt = function (i) { return (EL.PLANET_TEXT[EL.lang] || EL.PLANET_TEXT.fr)[i]; };
})();
