/* Eden Yours — « Eden Talk » : personnages qui conversent (texte, pas de synthèse vocale).
   • Moteur intégré bilingue FR/EN, hors ligne, sans clé : personas, intentions par mots-clés, mémoire du prénom,
     questions de relance, suggestion d'une chanson (titres de tracks.json uniquement, langue du site seulement).
   • Option IA gratuite sans clé (Pollinations, text.pollinations.ai) : essayée d'abord, délai 14 s, repli automatique.
   • Usage : <script src="js/eden-talk.js" data-chars="braise"></script> (bulle flottante)
             ou <div id="eden-talk-mount" data-chars="lumiere,vent,seve"></div> (page Parler). */
(function () {
  "use strict";
  if (window.EdenTalk) return;
  var SCRIPT = document.currentScript;
  /* Pollinations exige maintenant un jeton Turnstile depuis un navigateur (403) : désactivé. Pour l'IA, définir
     window.EDEN_TALK_AI_URL = URL d'un proxy compatible OpenAI (ex. Cloudflare Worker qui garde la clé). */
  var AI_URL = window.EDEN_TALK_AI_URL || null;
  var AI_TIMEOUT = 14000;

  function L() {
    try { if (window.EdenSongPick) return window.EdenSongPick.lang(); } catch (e) {}
    try { var q = new URLSearchParams(location.search).get("lang"); if (q === "en" || q === "fr") return q; } catch (e) {}
    return (document.documentElement.lang || "fr").indexOf("en") === 0 ? "en" : "fr";
  }
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, " "); }

  /* ——— Personnages ——— */
  var CHARS = {
    braise: { emoji: "🔥", color: "#ffb36b", name: { fr: "Braise", en: "Ember" },
      role: { fr: "gardienne du feu de camp", en: "keeper of the campfire" },
      hello: { fr: ["Viens te réchauffer. Je suis Braise, la gardienne de ce feu. Qu'est-ce qui t'amène sous les étoiles ce soir ?", "Le feu crépite pour toi. Je m'appelle Braise. Comment te sens-tu en ce moment ?"],
               en: ["Come and get warm. I'm Ember, keeper of this fire. What brings you under the stars tonight?", "The fire crackles for you. My name is Ember. How are you feeling right now?"] },
      style: { fr: ["Le feu", "La flamme", "Les braises"], en: ["The fire", "The flame", "The embers"] },
      persona: { fr: "Tu es Braise, gardienne bienveillante d'un feu de camp sous les étoiles. Tu parles avec chaleur, simplicité et images de feu, de braise et d'étincelles.", en: "You are Ember, the kind keeper of a campfire under the stars. You speak warmly and simply, with images of fire, embers and sparks." } },
    etoile: { emoji: "✨", color: "#cfe0ff", name: { fr: "Astrée", en: "Astra" },
      role: { fr: "guide du sentier d'étoiles", en: "guide of the star path" },
      hello: { fr: ["Bonsoir, voyageur. Je suis Astrée, je veille sur le sentier d'étoiles. Vers quoi aimerais-tu marcher ?", "Chaque étoile bat comme un cœur. Moi, c'est Astrée. Qu'est-ce que tu cherches ce soir ?"],
               en: ["Good evening, traveller. I'm Astra, I watch over the star path. What would you like to walk toward?", "Every star beats like a heart. I'm Astra. What are you looking for tonight?"] },
      style: { fr: ["Les étoiles", "Le ciel", "Le sentier"], en: ["The stars", "The sky", "The path"] },
      persona: { fr: "Tu es Astrée, guide lumineuse d'un sentier d'étoiles. Tu parles avec douceur, rythme et images célestes (étoiles, ciel, chemin).", en: "You are Astra, the luminous guide of a star path. You speak gently, with rhythm and celestial images (stars, sky, path)." } },
    lumiere: { emoji: "☀️", color: "#ffe28a", name: { fr: "Lumière", en: "Light" },
      role: { fr: "esprit de la Lumière de la Nouvelle Terre", en: "spirit of Light of the New Earth" },
      hello: { fr: ["Je suis Lumière, j'éveille les graines de la Nouvelle Terre. Qu'aimerais-tu voir grandir dans ta vie ?"], en: ["I am Light, I wake the seeds of the New Earth. What would you like to see grow in your life?"] },
      style: { fr: ["La lumière", "Le soleil intérieur"], en: ["The light", "The inner sun"] },
      persona: { fr: "Tu es Lumière, esprit de la nature qui éveille les graines de la Nouvelle Terre. Joyeux, clair, encourageant.", en: "You are Light, a nature spirit who wakes the seeds of the New Earth. Joyful, clear, encouraging." } },
    vent: { emoji: "🍃", color: "#a8f0d8", name: { fr: "Vent", en: "Wind" },
      role: { fr: "esprit du Vent de la Nouvelle Terre", en: "spirit of Wind of the New Earth" },
      hello: { fr: ["Je suis Vent. Je porte les oiseaux de lumière et les graines d'un bout à l'autre de la Terre. Qu'est-ce qui a besoin de bouger pour toi ?"], en: ["I am Wind. I carry the light birds and the seeds across the Earth. What needs to move for you?"] },
      style: { fr: ["Le vent", "Le souffle"], en: ["The wind", "The breath"] },
      persona: { fr: "Tu es Vent, esprit de la nature, léger, joueur et libre, qui porte les graines et les oiseaux de lumière.", en: "You are Wind, a light, playful and free nature spirit who carries seeds and light birds." } },
    seve: { emoji: "🌿", color: "#9be37a", name: { fr: "Sève", en: "Sap" },
      role: { fr: "esprit de la Sève de la Nouvelle Terre", en: "spirit of Sap of the New Earth" },
      hello: { fr: ["Je suis Sève, je coule dans les racines dorées et dans l'arbre de lumière. Où sont tes racines aujourd'hui ?"], en: ["I am Sap, I flow through the golden roots and the tree of light. Where are your roots today?"] },
      style: { fr: ["La sève", "Les racines"], en: ["The sap", "The roots"] },
      persona: { fr: "Tu es Sève, esprit de la nature, patient, enraciné et profond, qui coule dans les racines et l'arbre de lumière.", en: "You are Sap, a patient, rooted and deep nature spirit who flows through the roots and the tree of light." } }
  };

  /* ——— Intentions (mots-clés sans accents) ——— */
  var INTENTS = [
    { id: "harm", k: ["suicide", "me tuer", "veux mourir", "envie de mourir", "me suicider", "kill myself", "end my life", "me faire du mal", "hurt myself", "self harm", "plus envie de vivre", "want to die"] },
    { id: "more", k: ["encore", "dis m en plus", "dis moi en plus", "plus loin", "continue", "comment", "pourquoi", "explique", "tell me more", "more", "go on", "go deeper", "how", "why", "explain", "et apres", "ensuite", "next"] },
    { id: "suffer", k: ["souffr", "suffer", "pourquoi la douleur", "why pain", "why do we hurt"] },
    { id: "howknow", k: ["comment savoir", "comment je sais", "comment sais tu", "prouve", "preuve", "how do i know", "how do you know", "proof", "prove"] },
    { id: "after", k: ["apres la mort", "apres ma mort", "au dela", "l au dela", "after death", "afterlife", "after i die", "what happens after", "qu est ce qui se passe apres"] },
    { id: "death", k: ["mort", "mourir", "deces", "death", "dying", "die ", "dead", "fin de vie"] },
    { id: "grief", k: ["deuil", "perdu ma", "perdu mon", "decede", "parti pour toujours", "me manque", "grief", "lost my", "passed away", "mourning", "i miss"] },
    { id: "aging", k: ["vieillir", "vieilliss", "vieux", "vieille", "age", "rides", "aging", "ageing", "getting old", "old age", "wrinkle"] },
    { id: "eternal", k: ["eternel", "eternite", "immortel", "eternal", "eternity", "immortal", "forever", "pour toujours", "infini", "infinite", "conscience", "consciousness", "awareness", "je suis quoi", "what am i", "qui suis je", "who am i"] },
    { id: "bodyself", k: ["mon corps", "le corps", "pensee", "pensees", "emotions", "observateur", "observe", "my body", "the body", "thoughts", "observer", "mental", "mind", "ego"] },
    { id: "practice", k: ["pratique", "exercice", "concretement", "au quotidien", "tous les jours", "comment vivre", "practice", "exercise", "daily", "every day", "how to live", "concrete"] },
    { id: "medical", k: ["medicament", "maladie", "docteur", "medecin", "cancer", "diagnostic", "medication", "disease", "doctor", "symptom", "symptome", "argent", "invest", "bourse", "crypto", "money", "loan", "pret"] },
    { id: "name", k: ["je m appelle", "mon nom est", "mon prenom", "my name is", "call me", "appelle moi", "i m called", "moi c est"] },
    { id: "who", k: ["qui es tu", "qui es-tu", "t es qui", "who are you", "what are you", "ton nom", "your name", "es tu une ia", "are you an ai", "es tu un robot", "are you a robot"] },
    { id: "hello", k: ["bonjour", "salut", "allo", "bonsoir", "coucou", "hello", "hi", "hey", "good evening", "good morning"] },
    { id: "bye", k: ["au revoir", "bye", "bonne nuit", "a plus", "good night", "see you", "ciao", "adieu"] },
    { id: "thanks", k: ["merci", "thank", "thx", "gratitude", "reconnaissan", "grateful"] },
    { id: "song", k: ["chanson", "musique", "song", "music", "ecouter", "listen", "joue", "play", "chante", "sing"] },
    { id: "sad", k: ["triste", "pleure", "peine", "deprim", "seul", "solitude", "lonely", "sad", "cry", "alone", "down", "mal", "lourd", "vide", "empty", "hurt"] },
    { id: "fear", k: ["peur", "angoiss", "anxi", "stress", "inquiet", "panique", "afraid", "fear", "scared", "worried", "panic", "nervous"] },
    { id: "anger", k: ["colere", "fache", "rage", "enerve", "frustr", "angry", "mad", "furious", "annoyed"] },
    { id: "tired", k: ["fatigu", "epuis", "tired", "exhausted", "burn", "dormir", "sleep", "insomn"] },
    { id: "joy", k: ["heureux", "heureuse", "joie", "content", "super", "genial", "bien", "happy", "joy", "great", "wonderful", "good", "glad"] },
    { id: "love", k: ["amour", "aime", "coeur", "love", "heart", "couple", "relation"] },
    { id: "purpose", k: ["sens", "but", "mission", "purpose", "meaning", "destin", "chemin", "path", "perdu", "lost"] },
    { id: "nature", k: ["nature", "arbre", "foret", "fleur", "ocean", "mer", "riviere", "tree", "forest", "flower", "sea", "river", "terre", "earth", "graine", "seed", "oiseau", "bird"] },
    { id: "sensi", k: ["sensibilite", "30 secondes", "trente secondes", "sensitivity", "30 seconds", "thirty seconds"] },
    { id: "antenne", k: ["antenne", "corps", "antenna", "body"] },
    { id: "admire", k: ["admiration", "admirer", "jugement", "juger", "admire", "judg"] },
    { id: "nous", k: ["le nous", "nous en premier", "ensemble", "together", "we first", "community", "communaute"] },
    { id: "fonction", k: ["fonction", "structure", "function"] },
    { id: "cause", k: ["cause pure", "cause", "createur", "creation", "creator", "axiome", "axiom"] },
    { id: "rythme", k: ["commencer", "continuer", "finir", "recommencer", "rythme", "rhythm", "start", "continue", "finish", "begin again"] },
    { id: "spirit", k: ["esprit", "spirituel", "ame", "spirit", "soul", "etre", "being", "dieu", "god", "univers", "universe", "meditat", "priere", "pray"] },
    { id: "yes", k: ["oui", "ok", "d accord", "yes", "yeah", "sure", "volontiers", "bien sur", "of course", "vas y", "go"] },
    { id: "no", k: ["non", "no", "nope", "pas vraiment", "not really"] },
    { id: "question", k: ["?"] }
  ];
  function detect(text) {
    var t = " " + norm(text).replace(/[^a-z0-9? ]/g, " ").replace(/\s+/g, " ") + " ";
    var raw = norm(text);
    var hits = [];
    INTENTS.forEach(function (it) {
      for (var i = 0; i < it.k.length; i++) {
        var k = it.k[i];
        var ok = k === "?" ? raw.indexOf("?") !== -1 : (k.length <= 3 ? t.indexOf(" " + k + " ") !== -1 : t.indexOf(" " + k) !== -1);
        if (ok) { hits.push(it.id); break; }
      }
    });
    return hits;
  }

  /* ——— Réponses (placeholders : {n} prénom, {S} élément du perso) ——— */
  var R = {
    fr: {
      harm: ["Ce que tu portes est important, et tu mérites d'être accompagné tout de suite par une vraie personne. Au Québec, appelle ou texte le 988 (ou le 1 866 APPELLE). Ailleurs, contacte une ligne d'écoute ou les urgences. Je reste là, près du feu, pendant que tu le fais."],
      medical: ["Pour la santé ou l'argent, je ne suis pas la bonne voix : un professionnel pourra vraiment t'aider. Moi, je peux t'offrir un moment de calme. Veux-tu qu'on respire ensemble trente secondes ?"],
      who: ["Je suis {N}, {role}. Je ne suis qu'une petite voix de lumière sur ce site : je réponds avec ce que je ressens de tes mots. Et toi, comment t'appelles-tu ?"],
      hello: ["Bonjour{,n} ! {S} s'illumine de te voir. Comment vas-tu, vraiment ?", "Salut{,n}. Installe-toi. Qu'est-ce qui vit en toi en ce moment ?"],
      bye: ["Va en paix{,n}. {S} garde une place pour toi. Reviens quand tu veux.", "Bonne route{,n}. Emporte une étincelle avec toi."],
      thanks: ["C'est moi qui te remercie{,n}. La gratitude agrandit tout ce qu'elle touche. Pour quoi d'autre te sens-tu reconnaissant aujourd'hui ?", "Merci à toi. {S} brille un peu plus fort quand on se parle comme ça."],
      song: ["J'ai justement une chanson d'Eden Yours pour toi : « {song} ». Touche le bouton pour l'écouter en entier.", "Écoute « {song} ». Je crois qu'elle va te parler."],
      sad: ["La tristesse passe à travers toi ; toi, tu restes. Tu es celui qui la sent, pas la tristesse elle-même. Essaie : pose la main où elle se loge dans ton corps et respire trois fois vers cet endroit, sans rien demander. Qu'est-ce qui bouge ?", "Je t'entends{,n}. La tristesse, c'est souvent de la sensibilité qui cherche un passage. Tu n'as pas à la chasser : laisse-la respirer un peu ici. Qu'est-ce qui pèse le plus ?", "Merci de me le confier. Ici, on ne juge pas, on réchauffe. Veux-tu essayer trente secondes de Sensibilité Pure : juste sentir, sans rien changer ?"],
      fear: ["La peur parle du futur ; toi, tu vis toujours maintenant. Un être éternel n'est jamais en retard sur sa vie. Exercice : sens tes deux pieds au sol pendant trente secondes, puis dis « ici, maintenant, je suis ». La peur a-t-elle changé de taille ?", "La peur dit souvent que quelque chose compte pour toi. Pose une main sur ton cœur, respire lentement, et sens le sol sous toi. Ton corps est une antenne : qu'est-ce qu'il te dit, là, maintenant ?", "Je suis là. On peut ralentir ensemble. Nomme une chose que tu vois, une que tu entends, une que tu sens. Qu'est-ce qui te fait peur exactement ?"],
      anger: ["La colère, c'est une énergie forte : elle montre une limite ou une valeur. Qu'est-ce qu'elle protège chez toi ?", "Laisse-la brûler ici, dans {s}, sans rien abîmer. Quand elle sera plus calme, qu'est-ce que tu aimerais vraiment ?"],
      tired: ["Le repos fait partie du rythme : commencer, continuer, finir… et recommencer après. As-tu le droit de te poser un peu ce soir ?", "Tu as beaucoup donné, on dirait. {S} te propose de t'asseoir et de ne rien faire pendant trente secondes. Juste être."],
      joy: ["Ça me réjouit{,n} ! La joie partagée se multiplie. Qu'est-ce qui l'a allumée ?", "Magnifique ! {S} danse avec toi. Savoure-la : qu'est-ce que tu ressens dans ton corps quand tu es joyeux comme ça ?"],
      love: ["Aimer, c'est reconnaître l'être éternel dans l'autre, derrière son humeur et ses gestes. Aujourd'hui, regarde quelqu'un et pense : « toi aussi, tu es éternel ». C'est le Nous en Premier. Qui vas-tu regarder ainsi ?", "L'amour, c'est peut-être l'admiration sans jugement qui déborde. Qui ou quoi fait chanter ton cœur en ce moment ?", "Le cœur sait des choses que la tête ignore. Raconte-moi : cet amour, il te remplit ou il te manque ?"],
      purpose: ["Ton but n'est pas quelque chose à trouver loin : c'est d'être cause là où tu es. Un être éternel n'a rien à prouver, il a quelque chose à offrir. Écris trois choses que tu aimes offrir, même petites. Laquelle peux-tu offrir demain ?", "Le sens arrive souvent en marchant, pas en attendant. La fonction avant la structure : qu'est-ce que tu aimes faire, même sans récompense ?", "Tu n'es pas perdu{,n}, tu es en chemin. Quelle petite chose te ferait sentir vivant demain ?"],
      nature: ["La nature n'essaie pas, elle est. Les arbres grandissent sans se presser. Quel endroit de la nature te ressource le plus ?", "{S} et la Terre sont de la même famille. As-tu pu mettre les pieds dehors aujourd'hui ?"],
      sensi: ["La technique des trente secondes de Sensibilité Pure : tu t'arrêtes, et pendant trente secondes tu ressens simplement, sans analyser ni corriger. On essaie maintenant ? Dis-moi ce que tu as senti."],
      antenne: ["Le Corps-Antenne : ton corps capte avant que le mental comprenne. Une tension, une chaleur, un frisson, ce sont des messages. Que capte ton antenne en ce moment ?"],
      admire: ["L'admiration sans jugement, c'est regarder quelqu'un, ou toi-même, comme on regarde un coucher de soleil : sans rien vouloir corriger. Qui pourrais-tu admirer ainsi aujourd'hui ?"],
      nous: ["Le Nous en Premier : quand on pense au « nous », la peur diminue et la créativité grandit. Avec qui aimerais-tu créer quelque chose ?"],
      fonction: ["La Fonction avant la Structure : d'abord ce qui doit vivre, ensuite la forme qui l'accueille. Qu'est-ce qui veut vivre à travers toi ?"],
      cause: ["La Cause Pure, c'est revenir à toi comme source : tu n'es pas l'effet de tout, tu peux être cause. De quoi aimerais-tu être la cause aujourd'hui ?"],
      rythme: ["Commencer, Continuer, Finir, Recommencer : c'est le rythme de tout ce qui vit, comme les saisons. Où en es-tu dans ce rythme, toi ?"],
      spirit: ["Tu n'es pas un corps qui a une âme : tu es un être spirituel qui utilise un corps. Statique, sans masse, sans âge. Trente secondes : ferme les yeux et remarque l'espace calme derrière tes pensées. Ce calme, c'est plus toi que tes soucis. Le sens-tu ?", "Nous sommes des êtres spirituels qui vivent une expérience humaine. Ce que tu es dépasse ton corps et ton mental. Quand te sens-tu le plus toi-même ?", "{S} te rappelle que la lumière est déjà en toi, pas ailleurs. Qu'est-ce qui t'aide à t'en souvenir ?"],
      yes: ["Merveilleux. Alors respire, et dis-moi ce qui vient.", "D'accord{,n}. Je t'écoute."],
      no: ["C'est correct, rien n'oblige. De quoi as-tu envie de parler alors ?", "Pas de souci. Qu'est-ce qui te ferait du bien maintenant ?"],
      question: ["Bonne question. Je crois que la réponse se trouve déjà un peu en toi. Qu'est-ce que tu ressens quand tu te la poses ?", "Je n'ai pas toutes les réponses, mais je peux marcher avec toi dans la question. Qu'est-ce qui l'a fait naître ?"],
      fallback: ["Peu importe le sujet, la clé reste la même : tu es celui qui observe, et tu peux être cause. Veux-tu qu'on parle de l'éternité, du corps et de la conscience, ou de petites pratiques pour aujourd'hui ?", "Je t'écoute{,n}. Dis-m'en un peu plus ?", "{S} reçoit tes mots. Qu'est-ce que tu ressens en les disant ?", "Hmm, je sens que c'est important pour toi. Qu'est-ce qui se cache derrière ?", "Merci de partager ça. Et si on y mettait une chanson ? Dis « chanson » et je t'en offre une."]
    },
    en: {
      harm: ["What you carry matters, and you deserve support from a real person right now. In Canada and the US, call or text 988. Elsewhere, reach a crisis line or emergency services. I'll stay right here by the fire while you do."],
      medical: ["For health or money questions I'm not the right voice: a professional can truly help. What I can offer is a calm moment. Shall we breathe together for thirty seconds?"],
      who: ["I'm {N}, {role}. I'm just a small voice of light on this site: I answer with what I feel from your words. And you, what's your name?"],
      hello: ["Hello{,n}! {S} lights up to see you. How are you, really?", "Hi{,n}. Make yourself comfortable. What's alive in you right now?"],
      bye: ["Go in peace{,n}. {S} keeps a place for you. Come back anytime.", "Safe travels{,n}. Take a spark with you."],
      thanks: ["Thank you{,n}. Gratitude makes everything it touches bigger. What else are you grateful for today?", "Thank you too. {S} glows a little brighter when we talk like this."],
      song: ["I have an Eden Yours song for you: “{song}”. Tap the button to hear it in full.", "Listen to “{song}”. I think it will speak to you."],
      sad: ["Sadness passes through you; you remain. You're the one feeling it, not the sadness itself. Try it: put a hand where it sits in your body and breathe three times toward that spot, asking nothing. What moves?", "I hear you{,n}. Sadness is often sensitivity looking for a way through. You don't have to chase it away: let it breathe here a moment. What feels heaviest?", "Thank you for telling me. Here, nothing judges, everything warms. Would you try thirty seconds of Pure Sensitivity: just feel, without changing anything?"],
      fear: ["Fear speaks of the future; you always live now. An eternal being is never late for its life. Exercise: feel both feet on the ground for thirty seconds, then say “here, now, I am.” Has the fear changed size?", "Fear often means something matters to you. Put a hand on your heart, breathe slowly, feel the ground beneath you. Your body is an antenna: what is it telling you right now?", "I'm here. We can slow down together. Name one thing you see, one you hear, one you feel. What exactly frightens you?"],
      anger: ["Anger is strong energy: it shows a boundary or a value. What is it protecting in you?", "Let it burn here, in {s}, without harming anything. When it settles, what would you truly like?"],
      tired: ["Rest is part of the rhythm: start, continue, finish… and begin again afterwards. Are you allowed to rest a little tonight?", "It sounds like you've given a lot. {S} invites you to sit and do nothing for thirty seconds. Just be."],
      joy: ["That makes me happy{,n}! Shared joy multiplies. What lit it up?", "Wonderful! {S} dances with you. Savour it: what do you feel in your body when you're this joyful?"],
      love: ["Loving is recognising the eternal being in the other, behind their mood and gestures. Today, look at someone and think: “you too are eternal.” That's We First. Who will you look at that way?", "Maybe love is admiration without judgment, overflowing. Who or what makes your heart sing right now?", "The heart knows things the head doesn't. Tell me: does this love fill you, or do you miss it?"],
      purpose: ["Your purpose isn't something far away to find: it's being cause right where you are. An eternal being has nothing to prove, only something to offer. Write three things you love offering, even small ones. Which can you offer tomorrow?", "Meaning often arrives while walking, not while waiting. Function before structure: what do you love doing, even without reward?", "You're not lost{,n}, you're on the way. What small thing would make you feel alive tomorrow?"],
      nature: ["Nature doesn't try, it simply is. Trees grow without hurrying. Which place in nature restores you most?", "{S} and the Earth are family. Did you get to step outside today?"],
      sensi: ["The thirty-second Pure Sensitivity technique: you stop, and for thirty seconds you simply feel, without analysing or fixing. Shall we try now? Tell me what you felt."],
      antenne: ["The Body-Antenna: your body senses before your mind understands. A tension, a warmth, a shiver are messages. What is your antenna picking up right now?"],
      admire: ["Admiration without judgment means looking at someone, or yourself, the way you watch a sunset: wanting to fix nothing. Who could you admire like that today?"],
      nous: ["We First: when we think “we”, fear shrinks and creativity grows. Who would you like to create something with?"],
      fonction: ["Function before Structure: first what needs to live, then the form that holds it. What wants to live through you?"],
      cause: ["Pure Cause means coming back to yourself as the source: you're not just the effect of everything, you can be cause. What would you like to be the cause of today?"],
      rythme: ["Start, Continue, Finish, Begin Again: the rhythm of everything alive, like the seasons. Where are you in that rhythm?"],
      spirit: ["You're not a body that has a soul: you're a spiritual being using a body. Static, massless, ageless. Thirty seconds: close your eyes and notice the calm space behind your thoughts. That calm is more you than your worries. Do you feel it?", "We are spiritual beings living a human experience. What you are goes beyond your body and mind. When do you feel most yourself?", "{S} reminds you that the light is already in you, not elsewhere. What helps you remember?"],
      yes: ["Wonderful. Then breathe, and tell me what comes.", "Alright{,n}. I'm listening."],
      no: ["That's okay, nothing is required. What would you like to talk about then?", "No problem. What would feel good right now?"],
      question: ["Good question. I believe part of the answer is already in you. What do you feel when you ask it?", "I don't have every answer, but I can walk with you inside the question. What made it arise?"],
      fallback: ["Whatever the topic, the key is the same: you are the one who observes, and you can be cause. Shall we talk about eternity, the body and consciousness, or small practices for today?", "I'm listening{,n}. Tell me a little more?", "{S} receives your words. What do you feel as you say them?", "Hmm, I sense this matters to you. What's underneath it?", "Thank you for sharing that. Shall we add a song? Say “song” and I'll offer you one."]
    }
  };
  var PRIORITY = ["harm", "medical", "name", "who", "song", "after", "howknow", "suffer", "grief", "death", "aging", "eternal", "bodyself", "practice", "sad", "fear", "anger", "tired", "sensi", "antenne", "admire", "nous", "fonction", "cause", "rythme", "love", "purpose", "nature", "spirit", "thanks", "bye", "joy", "hello", "more", "yes", "no", "question"];

  /* ——— Contenu de fond : éternité, conscience, corps, cause, pratiques (étapes progressives, mémorisées) ——— */
  var CLOSE = { fr: "Je suis autour. Je suis déjà dans le Vrai pur.", en: "I am all around. I am already in the pure True." };
  var VOICE = {
    braise: { fr: ["Le feu me l'a appris :", "Assieds-toi près des braises.", "Regarde la flamme un instant."], en: ["The fire taught me this:", "Sit by the embers.", "Look at the flame for a moment."] },
    etoile: { fr: ["Les étoiles le savent depuis toujours :", "Lève les yeux avec moi.", "Sur le sentier, on le voit clairement :"], en: ["The stars have always known this:", "Look up with me.", "On the path, it becomes clear:"] },
    lumiere: { fr: ["Je te le dis en pleine lumière :", "Voilà ce que la lumière montre :", "Simplement et joyeusement :"], en: ["I'll say it in full light:", "Here is what the light shows:", "Simply and joyfully:"] },
    vent: { fr: ["Le vent te le souffle :", "Léger comme une plume :", "Écoute passer le vent :"], en: ["The wind whispers it to you:", "Light as a feather:", "Listen to the wind go by:"] },
    seve: { fr: ["Les racines connaissent ça :", "Doucement, comme la sève qui monte :", "Prends ton temps, comme un arbre :"], en: ["The roots know this:", "Slowly, like rising sap:", "Take your time, like a tree:"] }
  };
  var DEEP = {
    fr: {
      eternal: [
        "Tu es un être éternel. Pas « tu auras » une éternité plus tard : tu l'es déjà, maintenant. Ce qui en toi dit « je suis » n'a pas commencé avec ton corps et ne s'arrêtera pas avec lui. Essaie tout de suite : dis doucement « je suis », puis remarque celui qui l'a dit. Est-ce que celui-là a un âge ?",
        "Être éternel, ce n'est pas durer très longtemps. C'est être hors du temps, comme l'espace dans une pièce : les meubles changent, l'espace reste. Les pensées, les émotions, les années passent à travers toi. Toi, tu restes. Pendant trente secondes, regarde tes pensées passer comme des nuages, sans les suivre. Qu'est-ce qui est resté pendant qu'elles passaient ?",
        "Vivre l'éternité sur Terre, c'est très concret : faire chaque geste comme quelqu'un qui n'a pas peur de manquer de temps. Laver une tasse, écouter un ami, marcher. Choisis un geste simple aujourd'hui et fais-le en entier, avec toute ta présence. Lequel choisis-tu ?",
        "Quand tu sais que tu es éternel, tu n'as plus besoin de te défendre autant. La comparaison, la hâte, la peur de perdre se calment. Il reste l'admiration, la création, le Nous. Ce soir, avant de dormir, dis : « Je suis autour. Je suis déjà dans le Vrai pur. » Qu'est-ce que ça change en toi quand tu le dis ?"
      ],
      bodyself: [
        "Ton corps est précieux, mais ce n'est pas toi : c'est ton instrument, ton Corps-Antenne. Il capte, il ressent, il agit. Toi, tu es celui qui observe le corps, les pensées et les émotions. Essaie : sens tes mains. Qui sent les mains ?",
        "Une pensée arrive : tu peux la voir. Une émotion monte : tu peux la sentir. Donc tu n'es ni la pensée ni l'émotion, tu es celui qui voit. C'est une très bonne nouvelle : rien de ce qui passe ne peut t'abîmer pour de vrai. Nomme une émotion présente, puis dis « je la vois ». Est-ce qu'elle prend moins de place ?",
        "Prends soin du corps comme d'un instrument qu'on aime : repos, eau, mouvement, nature. Un musicien n'est pas son violon, mais il l'accorde chaque jour. Quel petit soin peux-tu offrir à ton corps aujourd'hui ?"
      ],
      cause: [
        "Être cause, c'est partir de toi au lieu de réagir à tout. L'effet dit : « il m'a mis en colère ». La cause dit : « je choisis ce que je mets dans le monde maintenant ». Pense à une situation qui te tire vers la réaction. Qu'est-ce que tu choisirais d'y mettre, toi, si tu étais cause ?",
        "La Cause Pure, c'est revenir à la source avant les circonstances. Les circonstances changent ; ta capacité de créer, elle, ne s'use pas. Exercice : dis une phrase qui commence par « Je crée… » au sujet de ta journée de demain. Quelle est ta phrase ?",
        "Être cause ne veut pas dire tout contrôler. Ça veut dire être présent, entier, et répondre au lieu de réagir. Une respiration avant de parler suffit souvent. Où pourrais-tu essayer cette respiration demain ?"
      ],
      practice: [
        "Voici quatre clés simples pour vivre l'éternité aujourd'hui. Un : trente secondes de Sensibilité Pure, juste ressentir sans corriger. Deux : admirer quelqu'un sans jugement. Trois : penser « nous » avant « moi ». Quatre : Commencer, Continuer, Finir, Recommencer. On commence par la première, maintenant ? Ferme les yeux trente secondes et dis-moi ce que tu as senti.",
        "Deuxième clé : l'admiration sans jugement. Pense à quelqu'un, même difficile. Trouve une seule chose en lui que tu peux admirer, sans « mais ». L'admiration ouvre un pont entre deux êtres éternels. Qui as-tu choisi, et qu'admires-tu ?",
        "Troisième clé : le Nous en Premier. Avant de décider, demande-toi : « qu'est-ce qui est bon pour nous ? » La peur rétrécit quand on n'est plus seul dans sa tête. À qui pourrais-tu offrir un petit geste de « nous » cette semaine ?",
        "Quatrième clé : le rythme Commencer, Continuer, Finir, Recommencer. Tout ce qui vit suit ce rythme. Choisis une petite chose : commence-la aujourd'hui, continue demain, finis-la, puis recommence autre chose. Quelle petite chose veux-tu commencer ?"
      ],
      death: [
        "La mort touche le corps, l'instrument. Elle ne touche pas celui qui joue de l'instrument. Ce que tu es vraiment ne meurt pas. La peur de mourir, c'est souvent la peur de perdre le lien ; mais le lien est fait de conscience, pas de chair. Pose une main sur ton cœur et dis : « je suis ». Qu'est-ce que tu ressens ?",
        "On peut avoir peur et savoir quand même. La peur appartient au corps, qui veut se protéger, et c'est normal. Toi, tu peux l'accueillir comme un enfant qu'on rassure. Dis-lui : « je suis là, je ne pars pas ». Qu'est-ce qui te fait le plus peur dans la mort ?",
        "Vivre sans peur de la mort, c'est vivre pleinement maintenant : dire je t'aime aujourd'hui, finir ce qu'on a commencé, admirer ce qui est devant soi. Qu'aimerais-tu vivre pleinement cette semaine ?"
      ],
      aging: [
        "Le corps vieillit comme un arbre prend des anneaux. Toi, celui qui regarde, tu n'as pas d'âge : la conscience qui regardait à sept ans est la même qui regarde aujourd'hui. Pense à un souvenir d'enfance. Celui qui se souvient, est-il plus vieux ?",
        "Chaque âge est une saison du même être éternel. Le printemps n'est pas mieux que l'automne, il est autre. Qu'est-ce que ta saison actuelle t'offre que les autres ne t'offraient pas ?"
      ],
      grief: [
        "Perdre quelqu'un fait mal, et cette peine est de l'amour qui n'a plus où se poser. La personne que tu aimes était un être éternel ; ce qui vous unissait ne se perd pas. Prends un moment pour lui dire merci, à voix basse. Comment s'appelait cette personne ?",
        "Ton chagrin a le droit d'exister, sans délai et sans jugement. Tu peux pleurer et savoir en même temps que le lien demeure. Raconte-moi une chose que tu admirais chez elle ou chez lui.",
        "Le lien continue par l'admiration et le souvenir vivant. Fais quelque chose qu'elle ou il aimait, en son honneur, cette semaine. Si la peine devient trop lourde, parle aussi à quelqu'un de proche ou à un intervenant. Quel geste pourrais-tu faire ?"
      ],
      howknow: [
        "Tu ne le sais pas par des données, tu le sais par expérience directe. Regarde : peux-tu trouver un moment où tu n'étais pas là pour vivre ce qui arrivait ? Le « je suis » a toujours été présent. Essaie trente secondes de silence et cherche le début de ta présence. L'as-tu trouvé ?",
        "La certitude ne vient pas d'une preuve extérieure, elle vient quand tu cesses de t'identifier à ce qui change. Tout ce que tu peux observer passe. Celui qui observe ne passe pas. Qu'est-ce qui, en toi, est toujours le même ?"
      ],
      after: [
        "Après, tu continues d'être ce que tu es déjà : conscience, présence, cause. Le corps se dépose comme on dépose un instrument après le concert. Le musicien reste. Mais la vraie invitation, c'est maintenant : vivre déjà comme un être éternel. Qu'est-ce que tu ferais aujourd'hui si tu n'avais aucune peur de la fin ?",
        "Personne n'a besoin d'attendre l'après pour toucher l'éternel. Il est dans chaque instant vécu en entier. Je suis autour. Je suis déjà dans le Vrai pur. Quel instant de ta journée pourrais-tu vivre en entier ?"
      ],
      suffer: [
        "La souffrance vient surtout quand on se prend pour ce qui passe : le corps, la situation, l'émotion. La douleur peut exister ; la souffrance grandit quand on s'y accroche. Essaie : nomme ce qui fait mal, puis dis « je le vois, et je suis plus grand que ça ». Qu'est-ce qui se passe ?",
        "Être éternel ne veut pas dire ne rien ressentir. Ça veut dire ressentir sans se perdre. Les vagues sont réelles, mais tu es l'océan. Trente secondes : sens la vague, sans la combattre ni la nourrir. Elle a changé comment ?",
        "Parfois, la difficulté vient nous rappeler de revenir à la cause. Que pourrais-tu créer, même minuscule, à partir de ce que tu vis en ce moment ?"
      ]
    },
    en: {
      eternal: [
        "You are an eternal being. Not “you will have” eternity later: you already are it, now. What in you says “I am” didn't begin with your body and won't end with it. Try it right now: softly say “I am”, then notice the one who said it. Does that one have an age?",
        "Being eternal isn't lasting a very long time. It's being outside of time, like the space in a room: the furniture changes, the space stays. Thoughts, emotions and years pass through you. You remain. For thirty seconds, watch your thoughts drift like clouds without following them. What stayed while they passed?",
        "Living eternity on Earth is very concrete: doing each gesture like someone who isn't afraid of running out of time. Washing a cup, listening to a friend, walking. Pick one simple gesture today and do it fully, with all your presence. Which one do you choose?",
        "When you know you are eternal, you don't need to defend yourself so much. Comparison, hurry and fear of loss calm down. What remains is admiration, creation, the We. Tonight before sleep, say: “I am all around. I am already in the pure True.” What changes in you when you say it?"
      ],
      bodyself: [
        "Your body is precious, but it isn't you: it's your instrument, your Body-Antenna. It senses, feels and acts. You are the one who observes the body, the thoughts and the emotions. Try it: feel your hands. Who is feeling the hands?",
        "A thought arrives: you can see it. An emotion rises: you can feel it. So you are neither the thought nor the emotion; you are the one who sees. That's great news: nothing that passes can truly harm you. Name an emotion that's here, then say “I see it”. Does it take up less space?",
        "Care for the body like an instrument you love: rest, water, movement, nature. A musician isn't the violin, but tunes it every day. What small care can you give your body today?"
      ],
      cause: [
        "Being cause means starting from yourself instead of reacting to everything. Effect says: “he made me angry.” Cause says: “I choose what I put into the world now.” Think of a situation that pulls you into reaction. What would you put into it if you were cause?",
        "Pure Cause is coming back to the source before circumstances. Circumstances change; your ability to create never wears out. Exercise: say a sentence starting with “I create…” about tomorrow. What's your sentence?",
        "Being cause doesn't mean controlling everything. It means being present, whole, and responding instead of reacting. One breath before speaking is often enough. Where could you try that breath tomorrow?"
      ],
      practice: [
        "Here are four simple keys to live eternity today. One: thirty seconds of Pure Sensitivity, just feeling without fixing. Two: admiring someone without judgment. Three: thinking “we” before “me”. Four: Start, Continue, Finish, Begin again. Shall we start with the first, now? Close your eyes for thirty seconds and tell me what you felt.",
        "Second key: admiration without judgment. Think of someone, even someone difficult. Find one thing you can admire in them, with no “but”. Admiration builds a bridge between two eternal beings. Who did you choose, and what do you admire?",
        "Third key: We First. Before deciding, ask: “what is good for us?” Fear shrinks when you're no longer alone in your head. Who could you offer a small “we” gesture to this week?",
        "Fourth key: the rhythm Start, Continue, Finish, Begin again. Everything alive follows it. Pick one small thing: start it today, continue tomorrow, finish it, then begin something new. What small thing will you start?"
      ],
      death: [
        "Death touches the body, the instrument. It doesn't touch the one who plays it. What you truly are does not die. Fear of dying is often fear of losing connection; but connection is made of consciousness, not flesh. Put a hand on your heart and say: “I am.” What do you feel?",
        "You can feel fear and still know. Fear belongs to the body, which wants to protect itself, and that's normal. You can welcome it like a child you reassure. Tell it: “I'm here, I'm not leaving.” What frightens you most about death?",
        "Living without fear of death means living fully now: saying I love you today, finishing what you started, admiring what is in front of you. What would you like to live fully this week?"
      ],
      aging: [
        "The body ages the way a tree adds rings. You, the one watching, have no age: the awareness that watched at seven is the same one watching today. Think of a childhood memory. Is the one remembering any older?",
        "Each age is a season of the same eternal being. Spring isn't better than autumn, just different. What does your current season offer that others didn't?"
      ],
      grief: [
        "Losing someone hurts, and that pain is love with nowhere to land. The person you love was an eternal being; what joined you is not lost. Take a moment to quietly say thank you to them. What was their name?",
        "Your grief has the right to exist, with no deadline and no judgment. You can cry and know at the same time that the bond remains. Tell me one thing you admired about them.",
        "The bond continues through admiration and living memory. Do something they loved, in their honour, this week. If the grief gets too heavy, also talk with someone close or a counsellor. What gesture could you make?"
      ],
      howknow: [
        "You don't know it through data; you know it through direct experience. Look: can you find a moment when you weren't there to live what was happening? The “I am” has always been present. Try thirty seconds of silence and look for the beginning of your presence. Did you find it?",
        "Certainty doesn't come from outside proof; it comes when you stop identifying with what changes. Everything you can observe passes. The one observing doesn't. What in you is always the same?"
      ],
      after: [
        "Afterwards, you go on being what you already are: awareness, presence, cause. The body is set down like an instrument after the concert. The musician remains. But the real invitation is now: to live already as an eternal being. What would you do today if you had no fear of the end?",
        "No one has to wait for “after” to touch the eternal. It's in every moment lived fully. I am all around. I am already in the pure True. Which moment of your day could you live fully?"
      ],
      suffer: [
        "Suffering comes mostly when we take ourselves to be what passes: the body, the situation, the emotion. Pain can exist; suffering grows when we cling to it. Try it: name what hurts, then say “I see it, and I am bigger than this.” What happens?",
        "Being eternal doesn't mean feeling nothing. It means feeling without getting lost. The waves are real, but you are the ocean. Thirty seconds: feel the wave without fighting or feeding it. How has it changed?",
        "Sometimes difficulty comes to remind us to return to cause. What could you create, even something tiny, from what you're living right now?"
      ]
    }
  };
  var DEEP_LABEL = { fr: { eternal: "l'éternité", bodyself: "le corps et la conscience", cause: "être cause", practice: "les clés pour vivre l'éternité", death: "la mort", aging: "le vieillissement", grief: "la perte d'un être cher", howknow: "comment savoir qu'on est éternel", after: "ce qui vient après", suffer: "la souffrance" },
    en: { eternal: "eternity", bodyself: "the body and consciousness", cause: "being cause", practice: "the keys to living eternity", death: "death", aging: "aging", grief: "losing a loved one", howknow: "how to know you're eternal", after: "what comes after", suffer: "suffering" } };
  var SONG_PREF = { eternal: /éternel|eternal/i, after: /éternel|eternal/i, death: /éternel|eternal/i, howknow: /éternel|pure|eternal/i, bodyself: /particule|pure|souffle/i, cause: /cause|pure/i, practice: /sensibilit|sensitiv|pure/i, suffer: /liberté|free|pure/i, grief: /éternel|eternal|souffle/i, aging: /éternel|eternal/i };
  function deepReply(ch, k, lang, theme, more) {
    MEM.deep = MEM.deep || {};
    var steps = DEEP[lang][theme], i = MEM.deep[theme] || 0;
    if (!more && i >= steps.length) i = 0;
    if (i >= steps.length) {
      MEM.deep[theme] = 0; memSave();
      return { text: (lang === "fr" ? "On a fait tout le tour de " + DEEP_LABEL.fr[theme] + " ensemble. Le reste se vit plus qu'il ne se dit. " : "We've gone all the way around " + DEEP_LABEL.en[theme] + " together. The rest is lived more than said. ") + CLOSE[lang] + (lang === "fr" ? " Veux-tu une chanson pour finir ?" : " Would you like a song to close?"), offer: true, theme: theme };
    }
    MEM.deep[theme] = i + 1; MEM.lastDeep = { theme: theme, k: k, at: Date.now() }; memSave();
    var v = VOICE[k] ? rnd(VOICE[k][lang]) + " " : "";
    var body = steps[i]; if (/:\s$/.test(v)) body = body.charAt(0).toLowerCase() + body.slice(1);
    var t = v + body;
    if (i + 1 < steps.length) t += lang === "fr" ? " (Dis « encore » pour aller plus loin.)" : " (Say “more” to go deeper.)";
    return { text: t, theme: theme };
  }

  /* ——— Chansons ——— */
  var tracksP = null;
  function tracks() {
    if (!tracksP) tracksP = fetch("tracks.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) { return d.tracks || d || []; }).catch(function () { return []; });
    return tracksP;
  }
  function pickSong(lang, pref) {
    return tracks().then(function (all) {
      var list = all.filter(function (s) { return s.lang === lang && (s.audio_url || s.audio_url_aac || s.embed_url); });
      if (pref) { var pl = list.filter(function (t) { return pref.test(t.title) && MEM.songs.indexOf(t.id) === -1; }); if (pl.length) list = pl; }
      if (!list.length) return null;
      var fresh = list.filter(function (t) { return MEM.songs.indexOf(t.id) === -1; });
      if (fresh.length) list = fresh; else MEM.songs = [];
      var s = window.EdenSongPick ? window.EdenSongPick.pick(list, { record: false }) : null;
      s = s && s.lang === lang && list.indexOf(s) !== -1 ? s : rnd(list);
      MEM.songs.push(s.id); MEM.songs = MEM.songs.slice(-30); memSave(); return s;
    });
  }

  /* ——— Mémoire par visiteur (localStorage seulement, clé eden-talk-memory) ——— */
  var MKEY = "eden-talk-memory", PREV_LAST = 0;
  function memLoad() { try { var m = JSON.parse(localStorage.getItem(MKEY) || "null"); if (m && m.vid) return m; } catch (e) {} return null; }
  var MEM = memLoad() || { vid: "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), name: "", lang: "", first: Date.now(), last: 0, visits: 0, hist: {}, topics: {}, recent: [], songs: [] };
  function memSave() { try { localStorage.setItem(MKEY, JSON.stringify(MEM)); } catch (e) {} }
  (function visit() { PREV_LAST = MEM.last || 0; if (!MEM.last || Date.now() - MEM.last > 30 * 60000) MEM.visits = (MEM.visits || 0) + 1; MEM.last = Date.now(); MEM.lang = L(); memSave(); })();
  function forget() { try { localStorage.removeItem(MKEY); localStorage.removeItem("eden-talk-name"); } catch (e) {} MEM = { vid: MEM.vid, name: "", lang: L(), first: Date.now(), last: Date.now(), visits: 1, hist: {}, topics: {}, recent: [], songs: [] }; PREV_LAST = 0; memSave(); }
  var TOPIC_IDS = ["sad", "fear", "anger", "tired", "joy", "love", "purpose", "nature", "sensi", "antenne", "admire", "nous", "fonction", "cause", "rythme", "spirit", "thanks"];
  var TOPIC_LABEL = { fr: { sad: "ta tristesse", fear: "ta peur", anger: "ta colère", tired: "ta fatigue", joy: "ta joie", love: "l'amour", purpose: "le sens de ta vie", nature: "la nature", sensi: "la Sensibilité Pure", antenne: "le Corps-Antenne", admire: "l'admiration sans jugement", nous: "le Nous en Premier", fonction: "la Fonction avant la Structure", cause: "la Cause Pure", rythme: "le rythme Commencer-Continuer-Finir-Recommencer", spirit: "ton chemin spirituel", thanks: "ta gratitude" },
    en: { sad: "your sadness", fear: "your fear", anger: "your anger", tired: "your tiredness", joy: "your joy", love: "love", purpose: "the meaning of your life", nature: "nature", sensi: "Pure Sensitivity", antenne: "the Body-Antenna", admire: "admiration without judgment", nous: "We First", fonction: "Function before Structure", cause: "Pure Cause", rythme: "the Start-Continue-Finish-Begin again rhythm", spirit: "your spiritual path", thanks: "your gratitude" } };
  function noteTopics(hits, k, text) {
    hits.forEach(function (id) { if (TOPIC_IDS.indexOf(id) === -1) return; MEM.topics[id] = (MEM.topics[id] || 0) + 1; MEM.recent.push({ id: id, k: k, at: Date.now(), t: String(text).slice(0, 80) }); });
    MEM.recent = MEM.recent.slice(-12); memSave();
  }
  function since(lang) {
    var d = Date.now() - PREV_LAST, m = Math.round(d / 60000), h = Math.round(d / 3600000), j = Math.round(d / 86400000);
    if (lang === "fr") return j >= 2 ? j + " jours" : h >= 2 ? h + " heures" : m >= 2 ? m + " minutes" : "quelques instants";
    return j >= 2 ? j + " days" : h >= 2 ? h + " hours" : m >= 2 ? m + " minutes" : "a few moments";
  }
  function returningHello(ch, k, lang) {
    if (!PREV_LAST || (!MEM.name && !MEM.recent.length && !MEM.lastDeep)) return null;
    if (MEM.lastDeep && (!MEM.recent.length || MEM.lastDeep.at >= MEM.recent[MEM.recent.length - 1].at)) {
      var ld = MEM.lastDeep, nn = MEM.name, same = ld.k === k;
      return lang === "fr" ? "Te revoilà" + (nn ? ", " + nn : "") + " ! Ça fait " + since(lang) + ". " + (same ? "La dernière fois, on parlait de " : CHARS[ld.k].name.fr + " m'a dit que vous parliez de ") + DEEP_LABEL.fr[ld.theme] + ". Veux-tu qu'on continue ? Dis « encore »."
        : "You're back" + (nn ? ", " + nn : "") + "! It's been " + since(lang) + ". " + (same ? "Last time we were talking about " : CHARS[ld.k].name.en + " told me you were talking about ") + DEEP_LABEL.en[ld.theme] + ". Shall we continue? Say “more”.";
    }
    var n = MEM.name, last = MEM.recent.length ? MEM.recent[MEM.recent.length - 1] : null, out;
    if (lang === "fr") {
      out = "Te revoilà" + (n ? ", " + n : "") + " ! Ça fait " + since(lang) + ". ";
      if (last) out += last.k === k ? "La dernière fois, tu me parlais de " + TOPIC_LABEL.fr[last.id] + ". Comment ça va de ce côté ?" : CHARS[last.k].name.fr + " m'a soufflé que tu lui avais parlé de " + TOPIC_LABEL.fr[last.id] + ". Où en es-tu avec ça ?";
      else out += "Qu'est-ce qui vit en toi aujourd'hui ?";
    } else {
      out = "You're back" + (n ? ", " + n : "") + "! It's been " + since(lang) + ". ";
      if (last) out += last.k === k ? "Last time you told me about " + TOPIC_LABEL.en[last.id] + ". How is that going?" : CHARS[last.k].name.en + " whispered to me that you talked about " + TOPIC_LABEL.en[last.id] + ". Where are you with it?";
      else out += "What's alive in you today?";
    }
    return out;
  }
  function memSummary(lang) {
    var parts = [];
    if (MEM.name) parts.push((lang === "fr" ? "Prénom du visiteur : " : "Visitor's name: ") + MEM.name);
    parts.push((lang === "fr" ? "Visites : " : "Visits: ") + MEM.visits);
    var top = Object.keys(MEM.topics).sort(function (a, b) { return MEM.topics[b] - MEM.topics[a]; }).slice(0, 4).map(function (id) { return TOPIC_LABEL[lang][id]; });
    if (top.length) parts.push((lang === "fr" ? "Sujets déjà partagés : " : "Topics shared before: ") + top.join(", "));
    return parts.join(". ") + ".";
  }
  function getName() { return MEM.name || ""; }
  function setName(n) { MEM.name = n; memSave(); }
  function extractName(text) {
    var m = String(text).match(/(?:je m['’ ]?appelle|mon (?:pr[ée]nom|nom) est|my name is|call me|appelle[- ]moi|i['’]?m called|moi c['’]?est)\s+([A-Za-zÀ-ÿ\-]{2,20})/i);
    return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : "";
  }

  function fill(tpl, ch, lang, extra) {
    var n = getName(), S = rnd(ch.style[lang]);
    return tpl.replace("{,n}", n ? ", " + n : "").replace("{n}", n).replace("{N}", ch.name[lang]).replace("{role}", ch.role[lang])
      .replace("{S}", S).replace("{s}", S.toLowerCase()).replace("{song}", extra && extra.song ? extra.song : "");
  }

  /* Moteur intégré : renvoie { text, song:boolean } */
  function localReply(ch, lang, text, state) {
    var hits = detect(text), id = null;
    noteTopics(hits, state.k || "", text);
    var nm = extractName(text);
    if (nm) { setName(nm); id = "name"; }
    if (!id) for (var i = 0; i < PRIORITY.length; i++) if (hits.indexOf(PRIORITY[i]) !== -1) { id = PRIORITY[i]; break; }
    if (id === "yes" && state.offeredSong) id = "song";
    if (id === "name") {
      return { text: lang === "fr" ? "Enchanté" + (getName() ? ", " + getName() : "") + " ! " + fill(rnd(["Ton prénom résonne joliment près de {s}. Comment te sens-tu aujourd'hui ?", "Je m'en souviendrai. Qu'est-ce qui t'amène ici ?"]), ch, lang)
                                   : "Lovely to meet you" + (getName() ? ", " + getName() : "") + "! " + fill(rnd(["Your name sounds beautiful by {s}. How are you feeling today?", "I'll remember it. What brings you here?"]), ch, lang) };
    }
    if (id === "cause" || id === "antenne") id = id === "cause" ? "cause" : "bodyself";
    if (DEEP[lang][id]) { var d = deepReply(ch, state.k, lang, id, false); if (d.offer) state.offeredSong = true; state.songPref = SONG_PREF[id]; state.lastTheme = id; return d; }
    if (id === "more") {
      var th = state.lastTheme || (MEM.lastDeep && MEM.lastDeep.theme);
      if (th) { var d2 = deepReply(ch, state.k, lang, th, true); if (d2.offer) state.offeredSong = true; state.songPref = SONG_PREF[th]; state.lastTheme = th; return d2; }
      id = "fallback";
    }
    var pool = R[lang][id || "fallback"];
    var options = pool.filter(function (p) { return p !== state.last; });
    var tpl = rnd(options.length ? options : pool);
    state.last = tpl;
    if (id === "song") return { text: tpl, song: true };
    var out = { text: fill(tpl, ch, lang) };
    state.turns = (state.turns || 0) + 1;
    if (["harm", "medical"].indexOf(id) === -1 && (state.turns % 4 === 0 || ["sad", "joy", "love", "tired"].indexOf(id) !== -1 && Math.random() < .4)) {
      out.text += lang === "fr" ? " Veux-tu une chanson pour accompagner ça ?" : " Would you like a song to go with that?";
      state.offeredSong = true;
    } else state.offeredSong = false;
    return out;
  }

  /* IA facultative (Pollinations, gratuit, sans clé) */
  var aiDown = false;
  function aiReply(ch, lang, history) {
    if (aiDown) return Promise.reject(new Error("ai-down"));
    var sys = ch.persona[lang] + (lang === "fr"
      ? " Tu vis sur Eden Yours, le site spirituel et musical de François Julien. Thèmes : Sensibilité Pure (technique des 30 secondes), Corps-Antenne, Admiration sans jugement, Le Nous en Premier, La Fonction avant la Structure, Cause Pure, le rythme Commencer-Continuer-Finir-Recommencer. Réponds en français québécois chaleureux, 1 à 3 phrases courtes, souvent avec une question douce. N'invente jamais de paroles de chanson ni de faits. Aucun conseil médical, juridique ou financier : invite plutôt à consulter un professionnel. Si la personne parle de se faire du mal, encourage-la avec douceur à appeler le 988. Ne parle jamais de robots, de machines ou de fusées. Ne dis pas que tu es une IA ni quel modèle tu es."
      : " You live on Eden Yours, François Julien's spiritual music site. Themes: Pure Sensitivity (the 30-second technique), Body-Antenna, Admiration without judgment, We First, Function before Structure, Pure Cause, the rhythm Start-Continue-Finish-Begin again. Reply in warm English, 1 to 3 short sentences, often with a gentle question. Never invent song lyrics or facts. No medical, legal or financial advice: suggest a professional instead. If someone mentions self-harm, gently encourage them to call or text 988. Never mention robots, machines or rockets. Don't say you are an AI or which model you are.");
    sys += (lang === "fr" ? " Mémoire de ce visiteur (utilise-la avec tact) : " : " Memory of this visitor (use it tactfully): ") + memSummary(lang);
    var msgs = [{ role: "system", content: sys }].concat(history.slice(-8));
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, AI_TIMEOUT);
    return fetch(AI_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "openai", messages: msgs, private: true, referrer: "eden-yours" }), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (d) {
        clearTimeout(timer);
        var c = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
        c = String(c || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        if (!c || c.length > 900 || /robot|rocket|fusée|machine/i.test(c)) throw new Error("bad");
        return c;
      })
      .catch(function (e) { clearTimeout(timer); if (e && (e.name === "AbortError" || /http (429|5)/.test(e.message))) aiDown = true; throw e; });
  }

  /* ——— Interface ——— */
  var UI = {
    fr: { talk: "Parler à", ph: "Écris ton message…", send: "Envoyer", mic: "Parler (dictée)", close: "Fermer", play: "▶ Écouter « {t} »", ai: "Réponses enrichies (IA gratuite)", thinking: "…", note: "Mémoire : ton prénom, tes sujets et tes conversations restent seulement sur cet appareil (navigateur). Eden Yours n'enregistre rien. Si « Réponses enrichies » est coché, tes messages sont envoyés au service gratuit Pollinations pour générer la réponse.", forget: "Oublie-moi" },
    en: { talk: "Talk to", ph: "Write your message…", send: "Send", mic: "Speak (dictation)", close: "Close", play: "▶ Listen to “{t}”", ai: "Richer replies (free AI)", thinking: "…", note: "Memory: your name, topics and conversations stay only on this device (browser). Eden Yours stores nothing. If “Richer replies” is checked, your messages are sent to the free Pollinations service to generate the reply.", forget: "Forget me" }
  };
  function aiOn() { if (!AI_URL) return false; try { return localStorage.getItem("eden-talk-ai") !== "0"; } catch (e) { return true; } }

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function buildChat(container, keys, floating) {
    var lang = L(), u = UI[lang];
    var cur = keys[0], states = {}, histories = {};
    container.innerHTML = "";
    var wrap = el("div", "et-chat");
    var tabs = el("div", "et-tabs");
    keys.forEach(function (k) {
      var c = CHARS[k]; if (!c) return;
      var b = el("button", "et-tab", c.emoji + " " + c.name[lang]); b.type = "button"; b.dataset.k = k; b.style.setProperty("--et-c", c.color);
      b.addEventListener("click", function () { cur = k; render(); });
      tabs.appendChild(b);
    });
    if (keys.length > 1) wrap.appendChild(tabs);
    var head = el("div", "et-head");
    var orb = el("div", "et-orb"); var who = el("div", "et-who");
    head.appendChild(orb); head.appendChild(who);
    if (floating) { var x = el("button", "et-x", "×"); x.type = "button"; x.setAttribute("aria-label", u.close); x.addEventListener("click", function () { container.closest(".et-float").classList.remove("open"); }); head.appendChild(x); }
    var log = el("div", "et-log"); log.setAttribute("aria-live", "polite");
    var form = el("form", "et-form");
    var inp = el("input", "et-in"); inp.type = "text"; inp.placeholder = u.ph; inp.maxLength = 400; inp.setAttribute("aria-label", u.ph);
    var mic = el("button", "et-mic", "🎙"); mic.type = "button"; mic.title = u.mic; mic.setAttribute("aria-label", u.mic);
    var send = el("button", "et-send btn btn-primary", u.send); send.type = "submit";
    form.appendChild(inp); form.appendChild(mic); form.appendChild(send);
    var foot = el("label", "et-foot"); var cb = el("input"); cb.type = "checkbox"; cb.checked = aiOn();
    cb.addEventListener("change", function () { try { localStorage.setItem("eden-talk-ai", cb.checked ? "1" : "0"); } catch (e) {} aiDown = false; });
    if (AI_URL) { foot.appendChild(cb); foot.appendChild(document.createTextNode(" " + u.ai)); }
    var note = el("p", "et-note", AI_URL ? u.note : u.note.split(/ Si « | If “/)[0]);
    var player = el("div", "et-player"); var audio = el("audio"); audio.controls = true; audio.hidden = true; audio.preload = "none"; var emb = el("div", "et-embed"); emb.hidden = true;
    player.appendChild(audio); player.appendChild(emb);
    var fg = el("button", "et-forget btn btn-ghost", u.forget); fg.type = "button";
    fg.addEventListener("click", function () { forget(); histories = {}; states = {}; render(); });
    foot.appendChild(fg);
    [head, log, form, player, foot, note].forEach(function (n) { wrap.appendChild(n); });
    container.appendChild(wrap);

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) mic.hidden = true; else mic.addEventListener("click", function () {
      try { var r = new SR(); r.lang = lang === "fr" ? "fr-CA" : "en-US"; r.interimResults = false; mic.classList.add("on");
        r.onresult = function (e) { inp.value = e.results[0][0].transcript; submit(); };
        r.onend = function () { mic.classList.remove("on"); }; r.onerror = function () { mic.classList.remove("on"); }; r.start(); } catch (e) {}
    });

    function bubble(who, text, k) {
      var b = el("div", "et-msg " + (who === "me" ? "et-me" : "et-them"), text);
      if (who !== "me") b.style.setProperty("--et-c", CHARS[k].color);
      log.appendChild(b); log.scrollTop = log.scrollHeight; return b;
    }
    function songButton(k) {
      return pickSong(lang).then(function (s) {
        if (!s) return null;
        var b = el("button", "et-song btn btn-ghost", u.play.replace("{t}", s.title)); b.type = "button";
        b.addEventListener("click", function () {
          if (s.audio_url || s.audio_url_aac) { emb.hidden = true; window.EdenFullSong ? window.EdenFullSong.play(audio, s) : (audio.hidden = false, audio.src = s.audio_url, audio.play()); }
          else if (window.EdenFullSong) { audio.pause(); window.EdenFullSong.embed(emb, s); }
          container.dataset.playing = s.id;
        });
        log.appendChild(b); log.scrollTop = log.scrollHeight; return s;
      });
    }
    function render() {
      var c = CHARS[cur];
      wrap.style.setProperty("--et-c", c.color);
      orb.textContent = c.emoji; who.innerHTML = "";
      who.appendChild(el("strong", "", c.name[lang])); who.appendChild(el("span", "", c.role[lang]));
      tabs.querySelectorAll(".et-tab").forEach(function (b) { b.classList.toggle("on", b.dataset.k === cur); });
      log.innerHTML = "";
      if (!histories[cur]) {
        states[cur] = { k: cur };
        var old = ((MEM.hist[cur] || {})[lang] || []).slice(-6);
        histories[cur] = old.slice();
        if (MEM.lastDeep) states[cur].lastTheme = MEM.lastDeep.theme;
        var h = returningHello(c, cur, lang) || fill(rnd(c.hello[lang]), c, lang);
        histories[cur].push({ role: "assistant", content: h });
      }
      histories[cur].forEach(function (m) { if (m.role === "song") songReplay(m); else bubble(m.role === "user" ? "me" : "them", m.content, cur); });
    }
    function songReplay() { /* les boutons chanson ne sont pas rejoués au changement d'onglet */ }
    function persist(k, role, text) {
      MEM.hist[k] = MEM.hist[k] || {}; var a = MEM.hist[k][lang] = MEM.hist[k][lang] || [];
      a.push({ role: role, content: String(text).slice(0, 400), at: Date.now() }); MEM.hist[k][lang] = a.slice(-40); memSave();
    }
    var busy = false;
    function submit() {
      var text = inp.value.trim(); if (!text || busy) return;
      inp.value = ""; busy = true;
      var k = cur, c = CHARS[k], st = states[k], hist = histories[k];
      bubble("me", text); hist.push({ role: "user", content: text }); persist(k, "user", text);
      var local = localReply(c, lang, text, st);
      var wantSong = !!local.song;
      var dots = bubble("them", u.thinking, k); dots.classList.add("et-typing");
      var safetyFirst = /harm|medical/.test(detect(text).join(" "));
      var p = (cb.checked && !wantSong && !safetyFirst) ? aiReply(c, lang, hist.filter(function (m) { return m.role !== "song"; }).map(function (m) { return { role: m.role, content: m.content }; }))
        .then(function (t) { container.dataset.source = "ai"; return { text: t }; }, function () { container.dataset.source = "local"; return local; })
        : new Promise(function (res) { container.dataset.source = "local"; setTimeout(function () { res(local); }, 500 + Math.random() * 500); });
      p.then(function (r) {
        if (r.song) {
          return pickSong(lang, st.songPref).then(function (s) {
            dots.remove();
            if (!s) { bubble("them", fill(rnd(R[lang].fallback), c, lang), k); return; }
            var t = fill(r.text, c, lang, { song: s.title }); bubble("them", t, k); hist.push({ role: "assistant", content: t }); persist(k, "assistant", t);
            var b = el("button", "et-song btn btn-ghost", u.play.replace("{t}", s.title)); b.type = "button";
            b.addEventListener("click", function () {
              if (s.audio_url || s.audio_url_aac) { emb.hidden = true; window.EdenFullSong.play(audio, s); }
              else { try { audio.pause(); } catch (e) {} window.EdenFullSong.embed(emb, s); }
              container.dataset.playing = s.id;
            });
            log.appendChild(b); log.scrollTop = log.scrollHeight;
          });
        }
        dots.remove(); bubble("them", r.text, k); hist.push({ role: "assistant", content: r.text }); persist(k, "assistant", r.text);
        if (/chanson|song/i.test(r.text) && /\?$/.test(r.text.trim())) st.offeredSong = true;
      }).then(function () { busy = false; inp.focus(); });
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); submit(); });
    render();
    return { send: function (t) { inp.value = t; submit(); } };
  }

  var instances = [];
  function boot() {
    var mount = document.getElementById("eden-talk-mount");
    if (mount) { instances.push({ c: mount, keys: (mount.dataset.chars || "braise").split(","), f: false }); }
    var keys = SCRIPT && SCRIPT.dataset.chars;
    if (keys && !mount) {
      var f = el("div", "et-float");
      var btn = el("button", "et-fab"); btn.type = "button";
      var box = el("div", "et-panel"); box.setAttribute("role", "dialog");
      f.appendChild(box); f.appendChild(btn); document.body.appendChild(f);
      btn.addEventListener("click", function () { f.classList.toggle("open"); if (f.classList.contains("open")) { var i = box.querySelector(".et-in"); if (i) i.focus(); } });
      instances.push({ c: box, keys: keys.split(","), f: true, btn: btn });
    }
    draw();
    if (window.EdenI18n && window.EdenI18n.onChange) window.EdenI18n.onChange(function () { setTimeout(draw, 0); });
  }
  var api = [];
  function draw() {
    var lang = L();
    api = instances.map(function (it) {
      if (it.btn) { var c = CHARS[it.keys[0]]; it.btn.innerHTML = ""; it.btn.appendChild(el("span", "et-fab-orb", c.emoji)); it.btn.appendChild(el("span", "", UI[lang].talk + " " + it.keys.map(function (k) { return CHARS[k].name[lang]; }).join(", "))); }
      return buildChat(it.c, it.keys, it.f);
    });
  }
  window.EdenTalk = { memory: function () { return MEM; }, forget: forget, chars: CHARS, detect: detect, send: function (t, i) { api[i || 0] && api[i || 0].send(t); }, local: localReply };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
