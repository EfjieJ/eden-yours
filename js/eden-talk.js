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
    { id: "harm", k: ["suicide", "me tuer", "mourir", "kill myself", "end my life", "me faire du mal", "hurt myself", "self harm", "plus envie de vivre", "want to die"] },
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
    { id: "purpose", k: ["sens", "but", "mission", "pourquoi", "purpose", "meaning", "why", "destin", "chemin", "path", "perdu", "lost"] },
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
      sad: ["Je t'entends{,n}. La tristesse, c'est souvent de la sensibilité qui cherche un passage. Tu n'as pas à la chasser : laisse-la respirer un peu ici. Qu'est-ce qui pèse le plus ?", "Merci de me le confier. Ici, on ne juge pas, on réchauffe. Veux-tu essayer trente secondes de Sensibilité Pure : juste sentir, sans rien changer ?"],
      fear: ["La peur dit souvent que quelque chose compte pour toi. Pose une main sur ton cœur, respire lentement, et sens le sol sous toi. Ton corps est une antenne : qu'est-ce qu'il te dit, là, maintenant ?", "Je suis là. On peut ralentir ensemble. Nomme une chose que tu vois, une que tu entends, une que tu sens. Qu'est-ce qui te fait peur exactement ?"],
      anger: ["La colère, c'est une énergie forte : elle montre une limite ou une valeur. Qu'est-ce qu'elle protège chez toi ?", "Laisse-la brûler ici, dans {s}, sans rien abîmer. Quand elle sera plus calme, qu'est-ce que tu aimerais vraiment ?"],
      tired: ["Le repos fait partie du rythme : commencer, continuer, finir… et recommencer après. As-tu le droit de te poser un peu ce soir ?", "Tu as beaucoup donné, on dirait. {S} te propose de t'asseoir et de ne rien faire pendant trente secondes. Juste être."],
      joy: ["Ça me réjouit{,n} ! La joie partagée se multiplie. Qu'est-ce qui l'a allumée ?", "Magnifique ! {S} danse avec toi. Savoure-la : qu'est-ce que tu ressens dans ton corps quand tu es joyeux comme ça ?"],
      love: ["L'amour, c'est peut-être l'admiration sans jugement qui déborde. Qui ou quoi fait chanter ton cœur en ce moment ?", "Le cœur sait des choses que la tête ignore. Raconte-moi : cet amour, il te remplit ou il te manque ?"],
      purpose: ["Le sens arrive souvent en marchant, pas en attendant. La fonction avant la structure : qu'est-ce que tu aimes faire, même sans récompense ?", "Tu n'es pas perdu{,n}, tu es en chemin. Quelle petite chose te ferait sentir vivant demain ?"],
      nature: ["La nature n'essaie pas, elle est. Les arbres grandissent sans se presser. Quel endroit de la nature te ressource le plus ?", "{S} et la Terre sont de la même famille. As-tu pu mettre les pieds dehors aujourd'hui ?"],
      sensi: ["La technique des trente secondes de Sensibilité Pure : tu t'arrêtes, et pendant trente secondes tu ressens simplement, sans analyser ni corriger. On essaie maintenant ? Dis-moi ce que tu as senti."],
      antenne: ["Le Corps-Antenne : ton corps capte avant que le mental comprenne. Une tension, une chaleur, un frisson, ce sont des messages. Que capte ton antenne en ce moment ?"],
      admire: ["L'admiration sans jugement, c'est regarder quelqu'un, ou toi-même, comme on regarde un coucher de soleil : sans rien vouloir corriger. Qui pourrais-tu admirer ainsi aujourd'hui ?"],
      nous: ["Le Nous en Premier : quand on pense au « nous », la peur diminue et la créativité grandit. Avec qui aimerais-tu créer quelque chose ?"],
      fonction: ["La Fonction avant la Structure : d'abord ce qui doit vivre, ensuite la forme qui l'accueille. Qu'est-ce qui veut vivre à travers toi ?"],
      cause: ["La Cause Pure, c'est revenir à toi comme source : tu n'es pas l'effet de tout, tu peux être cause. De quoi aimerais-tu être la cause aujourd'hui ?"],
      rythme: ["Commencer, Continuer, Finir, Recommencer : c'est le rythme de tout ce qui vit, comme les saisons. Où en es-tu dans ce rythme, toi ?"],
      spirit: ["Nous sommes des êtres spirituels qui vivent une expérience humaine. Ce que tu es dépasse ton corps et ton mental. Quand te sens-tu le plus toi-même ?", "{S} te rappelle que la lumière est déjà en toi, pas ailleurs. Qu'est-ce qui t'aide à t'en souvenir ?"],
      yes: ["Merveilleux. Alors respire, et dis-moi ce qui vient.", "D'accord{,n}. Je t'écoute."],
      no: ["C'est correct, rien n'oblige. De quoi as-tu envie de parler alors ?", "Pas de souci. Qu'est-ce qui te ferait du bien maintenant ?"],
      question: ["Bonne question. Je crois que la réponse se trouve déjà un peu en toi. Qu'est-ce que tu ressens quand tu te la poses ?", "Je n'ai pas toutes les réponses, mais je peux marcher avec toi dans la question. Qu'est-ce qui l'a fait naître ?"],
      fallback: ["Je t'écoute{,n}. Dis-m'en un peu plus ?", "{S} reçoit tes mots. Qu'est-ce que tu ressens en les disant ?", "Hmm, je sens que c'est important pour toi. Qu'est-ce qui se cache derrière ?", "Merci de partager ça. Et si on y mettait une chanson ? Dis « chanson » et je t'en offre une."]
    },
    en: {
      harm: ["What you carry matters, and you deserve support from a real person right now. In Canada and the US, call or text 988. Elsewhere, reach a crisis line or emergency services. I'll stay right here by the fire while you do."],
      medical: ["For health or money questions I'm not the right voice: a professional can truly help. What I can offer is a calm moment. Shall we breathe together for thirty seconds?"],
      who: ["I'm {N}, {role}. I'm just a small voice of light on this site: I answer with what I feel from your words. And you, what's your name?"],
      hello: ["Hello{,n}! {S} lights up to see you. How are you, really?", "Hi{,n}. Make yourself comfortable. What's alive in you right now?"],
      bye: ["Go in peace{,n}. {S} keeps a place for you. Come back anytime.", "Safe travels{,n}. Take a spark with you."],
      thanks: ["Thank you{,n}. Gratitude makes everything it touches bigger. What else are you grateful for today?", "Thank you too. {S} glows a little brighter when we talk like this."],
      song: ["I have an Eden Yours song for you: “{song}”. Tap the button to hear it in full.", "Listen to “{song}”. I think it will speak to you."],
      sad: ["I hear you{,n}. Sadness is often sensitivity looking for a way through. You don't have to chase it away: let it breathe here a moment. What feels heaviest?", "Thank you for telling me. Here, nothing judges, everything warms. Would you try thirty seconds of Pure Sensitivity: just feel, without changing anything?"],
      fear: ["Fear often means something matters to you. Put a hand on your heart, breathe slowly, feel the ground beneath you. Your body is an antenna: what is it telling you right now?", "I'm here. We can slow down together. Name one thing you see, one you hear, one you feel. What exactly frightens you?"],
      anger: ["Anger is strong energy: it shows a boundary or a value. What is it protecting in you?", "Let it burn here, in {s}, without harming anything. When it settles, what would you truly like?"],
      tired: ["Rest is part of the rhythm: start, continue, finish… and begin again afterwards. Are you allowed to rest a little tonight?", "It sounds like you've given a lot. {S} invites you to sit and do nothing for thirty seconds. Just be."],
      joy: ["That makes me happy{,n}! Shared joy multiplies. What lit it up?", "Wonderful! {S} dances with you. Savour it: what do you feel in your body when you're this joyful?"],
      love: ["Maybe love is admiration without judgment, overflowing. Who or what makes your heart sing right now?", "The heart knows things the head doesn't. Tell me: does this love fill you, or do you miss it?"],
      purpose: ["Meaning often arrives while walking, not while waiting. Function before structure: what do you love doing, even without reward?", "You're not lost{,n}, you're on the way. What small thing would make you feel alive tomorrow?"],
      nature: ["Nature doesn't try, it simply is. Trees grow without hurrying. Which place in nature restores you most?", "{S} and the Earth are family. Did you get to step outside today?"],
      sensi: ["The thirty-second Pure Sensitivity technique: you stop, and for thirty seconds you simply feel, without analysing or fixing. Shall we try now? Tell me what you felt."],
      antenne: ["The Body-Antenna: your body senses before your mind understands. A tension, a warmth, a shiver are messages. What is your antenna picking up right now?"],
      admire: ["Admiration without judgment means looking at someone, or yourself, the way you watch a sunset: wanting to fix nothing. Who could you admire like that today?"],
      nous: ["We First: when we think “we”, fear shrinks and creativity grows. Who would you like to create something with?"],
      fonction: ["Function before Structure: first what needs to live, then the form that holds it. What wants to live through you?"],
      cause: ["Pure Cause means coming back to yourself as the source: you're not just the effect of everything, you can be cause. What would you like to be the cause of today?"],
      rythme: ["Start, Continue, Finish, Begin Again: the rhythm of everything alive, like the seasons. Where are you in that rhythm?"],
      spirit: ["We are spiritual beings living a human experience. What you are goes beyond your body and mind. When do you feel most yourself?", "{S} reminds you that the light is already in you, not elsewhere. What helps you remember?"],
      yes: ["Wonderful. Then breathe, and tell me what comes.", "Alright{,n}. I'm listening."],
      no: ["That's okay, nothing is required. What would you like to talk about then?", "No problem. What would feel good right now?"],
      question: ["Good question. I believe part of the answer is already in you. What do you feel when you ask it?", "I don't have every answer, but I can walk with you inside the question. What made it arise?"],
      fallback: ["I'm listening{,n}. Tell me a little more?", "{S} receives your words. What do you feel as you say them?", "Hmm, I sense this matters to you. What's underneath it?", "Thank you for sharing that. Shall we add a song? Say “song” and I'll offer you one."]
    }
  };
  var PRIORITY = ["harm", "medical", "name", "who", "song", "sad", "fear", "anger", "tired", "sensi", "antenne", "admire", "nous", "fonction", "cause", "rythme", "love", "purpose", "nature", "spirit", "thanks", "bye", "joy", "hello", "yes", "no", "question"];

  /* ——— Chansons ——— */
  var tracksP = null;
  function tracks() {
    if (!tracksP) tracksP = fetch("tracks.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) { return d.tracks || d || []; }).catch(function () { return []; });
    return tracksP;
  }
  function pickSong(lang) {
    return tracks().then(function (all) {
      var list = all.filter(function (s) { return s.lang === lang && (s.audio_url || s.audio_url_aac || s.embed_url); });
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
    if (!PREV_LAST || (!MEM.name && !MEM.recent.length)) return null;
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
          return pickSong(lang).then(function (s) {
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
