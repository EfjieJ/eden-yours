/* Eden Yours — bilingual FR/EN i18n */
(function () {
  "use strict";

  var STORAGE_KEY = "eden-lang";

  var dict = {
    fr: {
      "common.tagline": "Écoute en continu. Ça régénère.",
      "common.menu": "Menu",
      "common.navAria": "Principal",
      "common.langAria": "Choisir la langue",
      "nav.home": "Accueil",
      "nav.library": "Bibliothèque",
      "nav.practice": "Pratique",
      "nav.request": "Demander",
      "nav.support": "Soutenir",
      "nav.invites": "Invitations",

      "home.title": "Eden Yours — Écoute en continu. Ça régénère.",
      "home.metaDesc": "Plateforme vibratoire sacrée : 15+ titres Suno pour la Sensibilité Pure. Écoute en continu. Ça régénère. Demande une chanson (10€/10$).",
      "home.eyebrow": "Plateforme vibratoire",
      "home.heroH1": "Bienvenue sur",
      "home.heroSubtitle": "Le retour à l'état d'Être, la reconnexion à la Cause Pure.",
      "home.heroLead1": "Eden Yours n'est pas un site Web ordinaire. C'est une plateforme vibratoire, un espace sacré conçu pour tous ceux qui ont réalisé qu'ils ne sont pas leur corps, mais l'être spirituel créateur qui génère la réalité.",
      "home.heroLead2": "Traverser le pont de l'admiration, décompliquer la vie et restaurer la certitude : votre Éden vous appartient déjà.",
      "home.ctaOui": "▶ Activer votre Oui Pur",
      "home.ctaPractice": "Découvrir la pratique",
      "home.ctaLibrary": "Bibliothèque",
      "home.puzzleEntryAria": "Casse-tête : chansons en français ou en anglais",
      "home.puzzleEntryLabel": "Casse-tête",
      "home.featuredAria": "Titre en vedette",
      "home.btnPlay": "▶ Lire",
      "home.btnSuno": "Écouter sur Suno",
      "home.whyTitle": "Pourquoi visiter Eden Yours ?",
      "home.whySub": "Quatre portes d'entrée vers la résonance pure.",
      "home.why1Title": "Découvrir les Axiomes de la Création",
      "home.why1Body": "Accédez à une compréhension géométrique et exacte de l'univers (les frames de l'espace, de l'énergie et du temps).",
      "home.why2Title": "Pratiquer la Sensibilité Pure",
      "home.why2Body": "Apprenez la fameuse technique des 30 secondes et la respiration consciente pour basculer en mode parasympathique et calmer le mental réactif.",
      "home.why2Link": "Ouvrir la pratique →",
      "home.why3Title": "Activer le Corps-Antenne",
      "home.why3Body": "Comprenez comment votre motricité et vos gestes conscients régénèrent vos tissus à volonté pour marcher dans la joie éternelle.",
      "home.why4Title": "Se Nourrir d'Admiration",
      "home.why4Body": "Rejoignez un petit groupe de personnes prêtes à changer les accords du monde, à éliminer le jugement (ne pas évaluer, ne pas juger, ne pas invalider) et à vivre dans la résonance pure.",
      "home.pillarsTitle": "Nos Piliers Fondamentaux",
      "home.pillarsSub": "Trois accords qui portent toute la plateforme.",
      "home.pillar1Title": "La Fonction avant la Structure",
      "home.pillar1Body": "Nous mettons l'attention sur l'intention claire qui guérit, et non sur le déclin apparent de la matière.",
      "home.pillar2Title": "Le Nous en Premier",
      "home.pillar2Body": "Inspiré par le sens originel du Notre Père, nous bâtissons une communauté connectée, sans arrachage ni possession.",
      "home.pillar3Title": "La Certitude face aux Données",
      "home.pillar3Body": "Parce que la vraie connaissance réside dans la conviction immédiate (2 + 2 = 4), sans la paresse ou le doute qui créent les mystères.",
      "home.musicTitle": "La musique comme régénération",
      "home.musicBody": "L'écoute continue n'est pas une consommation : c'est une pratique. Elle s'aligne sur la Sensibilité Pure et sur la Fonction avant la Structure — laisser le courant traverser, piste après piste, pour restaurer la certitude intérieure.",
      "home.musicPlayFeatured": "▶ Écouter le titre en vedette",
      "home.musicOpenLib": "Ouvrir la bibliothèque",
      "home.libTitle": "Bibliothèque",
      "home.libSub": "Enchaîne les titres — la régénération commence là.",
      "home.libSeeAll": "Voir tout",
      "home.quote": "« Je suis autour. Je suis déjà dans le Vrai pur. Entrez, découvrez, et ne l'oubliez plus. »",
      "home.closingCta": "Cliquez ici pour activer votre Oui Pur",
      "home.closingHint": "Écoutez. Restez. Laissez la régénération s'installer.",
      "home.footerLine": "· Plateforme vibratoire · Suno : efjie8008",
      "home.footerRequest": "Demander une chanson",
      "home.footerInvite": "Inviter un ami",

      "lib.title": "Bibliothèque — Eden Yours",
      "lib.metaDesc": "Bibliothèque Eden Yours : écoute en continu pour la régénération et la Sensibilité Pure. Plus de 15 titres Suno.",
      "lib.h1": "Bibliothèque & lecteur",
      "lib.lead": "Cette bibliothèque est faite pour être jouée d'un bout à l'autre. Enchaîne les titres : plus tu restes en écoute continue, plus l'effet de régénération s'installe — aligné sur la Sensibilité Pure et la Fonction avant la Structure.",
      "lib.playerAria": "Lecteur actuel",
      "lib.nowPlaying": "En écoute",
      "lib.nudge": "Astuce : laisse le lecteur enchaîner — le suivant démarre tout seul. C'est ainsi que la régénération se déploie.",
      "lib.playChain": "▶ Lire et enchaîner",
      "lib.allTracks": "Tous les titres",
      "lib.allTracksSub": "Clique un titre, puis enchaîne — la régénération passe par la suite.",

      "practice.title": "Pratique — Eden Yours",
      "practice.metaDesc": "Pratique Eden Yours : Sensibilité Pure, technique des 30 secondes et respiration consciente. Reviens à l'état d'Être.",
      "practice.eyebrow": "Sensibilité Pure",
      "practice.h1": "Pratique",
      "practice.lead": "Des portes d'entrée simples pour basculer hors du mental réactif, ressentir la Fonction avant la Structure, et laisser la régénération s'installer — y compris par l'écoute continue.",
      "practice.sensTitle": "La Sensibilité Pure",
      "practice.sensP1": "La Sensibilité Pure, c'est l'attention claire portée sur ce qui est, sans évaluation, sans jugement, sans invalidation. Elle ouvre l'espace où l'intention guérit plus que l'observation du déclin.",
      "practice.sensP2": "Sur Eden Yours, la musique sert de support : laisser les titres s'enchaîner (Écoute en continu. Ça régénère.) est une façon concrète de rester dans la Fonction plutôt que dans la structure du « encore une chanson ».",
      "practice.30Title": "La technique des 30 secondes",
      "practice.30P1": "Une invitation courte : pendant environ trente secondes, cessez d'alimenter le mental réactif. Posez l'attention sur la sensation présente — le souffle, le corps, le son — sans analyser.",
      "practice.30S1": "Arrêtez un instant ce que vous faisiez.",
      "practice.30S2": "Sentez plutôt que penser : chaleur, poids, vibration, silence.",
      "practice.30S3": "Laissez passer environ 30 secondes sans commenter intérieurement.",
      "practice.30S4": "Revenez doucement — éventuellement en démarrant une écoute continue.",
      "practice.30Note": "Ceci n'est pas un protocole médical. C'est une porte poétique vers le calme et la présence, telle que proposée dans l'esprit d'Eden Yours.",
      "practice.breathTitle": "Respiration consciente",
      "practice.breathP1": "La respiration consciente aide à basculer en mode parasympathique et à calmer le mental réactif. Inspirez et expirez avec attention, sans forcer — simplement en accompagnant le mouvement naturel du souffle.",
      "practice.breathS1": "Assis ou debout, détendez les épaules.",
      "practice.breathS2": "Inspirez lentement par le nez, en sentant l'air entrer.",
      "practice.breathS3": "Expirez doucement, en relâchant le ventre et la mâchoire.",
      "practice.breathS4": "Répétez quelques cycles, puis — si vous le souhaitez — lancez la bibliothèque.",
      "practice.breathNote": "Aucune promesse de guérison médicale : uniquement un rappel accessible pour retrouver un état plus calme et réceptif.",
      "practice.bodyTitle": "Le Corps-Antenne",
      "practice.bodyP1": "Votre motricité et vos gestes conscients peuvent être vécus comme une antenne : chaque mouvement intentionnel devient un accord avec la joie, plutôt qu'une réaction automatique. La Fonction (l'intention claire) précède la Structure (ce que le corps « semble » être).",
      "practice.bodyP2": "Marchez, bougez, écoutez — en conscience. Laissez la musique accompagner ce courant de régénération intérieure.",
      "practice.ctaListen": "▶ Écouter en continu",
      "practice.ctaPillars": "Voir les piliers",
      "practice.footer": "· Pratique",

      "support.title": "Soutenir — Eden Yours",
      "support.metaDesc": "Soutiens le mouvement Eden Yours — partage, admiration et contribution libre via PayPal.",
      "support.eyebrow": "Accord du partage",
      "support.h1": "Soutenez le Mouvement",
      "support.lead": "La plateforme fonctionne sur l'accord pur du partage et de l'admiration. Si notre contenu résonne en vous et élève votre état d'âme, vous pouvez contribuer librement via notre compte PayPal sécurisé.",
      "support.paypalH2": "PayPal",
      "support.paypalBody": "Chaque geste de soutien permet de propager cette lumière sans fin à travers l'Éther-Instantané.",
      "support.paypalReady": "● PayPal prêt",
      "support.paypalPending": "● PayPal bientôt branché",
      "support.paypalBtn": "Faire un don via PayPal",
      "support.paypalHint": "Les dons passent par <strong>paypal.me/Francjul</strong>. Le bouton ouvre PayPal dans un nouvel onglet.",
      "support.requestH2": "Demander une chanson",
      "support.requestBody": "Vous souhaitez proposer un titre Suno ou une intention pour la bibliothèque ? Une offrande fixe de 10 € ou 10 $ US ouvre la demande — François considère ensuite l'ajout à l'écoute continue.",
      "support.requestBtn": "Ouvrir la demande",
      "support.shareH2": "Partage et admiration",
      "support.shareBody": "Aucun montant imposé. Donnez ce qui résonne — chaque geste soutient la propagation d'Eden Yours.",
      "support.footer": "· Merci pour votre soutien",

      "invite.title": "Invitations — Eden Yours",
      "invite.metaDesc": "Invite des amis sur Eden Yours — manifeste vibratoire et écoute qui régénère. Écoute en continu.",
      "invite.h1": "Invitations",
      "invite.lead": "Partagez le manifeste : un espace sacré pour revenir à l'état d'Être, et une musique qui régénère quand on l'écoute en continu. Copiez le modèle ou ouvrez votre client courriel.",
      "invite.templateH2": "Modèle de courriel",
      "invite.templateHelp": "Le texte inclut l'URL du site — mettez à jour siteUrl dans config.js après le déploiement.",
      "invite.templateAria": "Modèle d'invitation",
      "invite.copy": "Copier le modèle",
      "invite.mailto": "Ouvrir dans mon courriel",
      "invite.tipsH2": "Conseils",
      "invite.tip1": "Pour proposer un titre à la bibliothèque : Demander une chanson (10 € / 10 $ via PayPal).",
      "invite.tip1Html": "Pour proposer un titre à la bibliothèque : <a href=\"demander.html\">Demander une chanson</a> (10&nbsp;€ / 10&nbsp;$ via PayPal).",
      "invite.tip2Html": "Remplacez <code>siteUrl</code> et éventuellement <code>contactEmail</code> dans <code>config.js</code>.",
      "invite.tip3Html": "Le bouton «&nbsp;Ouvrir dans mon courriel&nbsp;» utilise <code>mailto:</code> avec le sujet et le corps préremplis.",
      "invite.tip1Link": "Demander une chanson",
      "invite.tip2": "Remplacez siteUrl et éventuellement contactEmail dans config.js.",
      "invite.tip3": "Le bouton « Ouvrir dans mon courriel » utilise mailto: avec le sujet et le corps préremplis.",
      "invite.tip4": "Plus tard, vous pourrez brancher un envoi d'invitations côté serveur — ce modèle reste la base.",
      "invite.footer": "· Partagez la résonance",
      "invite.copied": "Modèle copié ✓",
      "invite.selectCopy": "Sélectionnez et copiez (Ctrl+C)",
      "invite.templateBody": "Hey —\n\nBienvenue sur {{site}}.\n\nLe retour à l'état d'Être, la reconnexion à la Cause Pure.\nCe n'est pas un site Web ordinaire — c'est une plateforme vibratoire, un espace sacré pour ceux qui ont réalisé qu'ils ne sont pas leur corps, mais l'être spirituel créateur qui génère la réalité.\n\nÉcoute en continu. Ça régénère.\nLaisse les titres s'enchaîner : la musique devient pratique de Sensibilité Pure et de Fonction avant Structure.\n\n→ {{siteUrl}}\n{{extra}}\n\nEntrez, découvrez, et ne l'oubliez plus.\n\n— {{artist}}",
      "invite.extraSuno": "→ « {{songTitle}} » aussi sur Suno : {{suno}}",
      "invite.extraFeatured": "→ Titre en vedette : « {{songTitle}} »",
      "invite.libraryFallback": "la bibliothèque",

      "request.title": "Demander une chanson — Eden Yours",
      "request.metaDesc": "Demande une chanson sur Eden Yours (10€ / 10$). Propose un titre Suno ou une intention pour la bibliothèque d'écoute continue.",
      "request.eyebrow": "Offrande musicale",
      "request.h1": "Demander une chanson",
      "request.leadHtml": "Vous avez un titre Suno, une intention, ou une mélodie qui résonne&nbsp;? Pour <strong>10&nbsp;€</strong> ou <strong>10&nbsp;$&nbsp;US</strong>, François considère d'ajouter votre piste (ou votre demande) à la bibliothèque d'écoute continue d'Eden Yours — un geste sacré, pas une garantie commerciale.",
      "request.spokenH2": "Une piste parlée sur mesure",
      "request.spokenBodyHtml": "Vous recevez une piste parlée Suno d&rsquo;environ <strong>deux minutes</strong>, créée sur votre thème — une voix, une intention, un moment d&rsquo;écoute. C&rsquo;est un geste simple et vivant, pas un produit de masse. Prix&nbsp;: <strong>25&nbsp;$&nbsp;CAD</strong>.",
      "request.spokenPay": "Payer 25 $ CAD via PayPal",
      "request.spokenTestBadge": "MODE TEST",
      "request.spokenTestHint": " — PayPal Sandbox, aucun argent réel. Voir PAYPAL-SANDBOX-TEST.md",
      "request.spokenTestSetupHtml": "Le bouton sandbox n&rsquo;est pas encore branché&nbsp;: ajoutez l&rsquo;e-mail marchand sandbox (ou l&rsquo;URL du bouton) dans <code>config.js</code> → <code>spokenOffer</code>.",
      "request.spokenPayTest": "Tester 25 $ CAD (PayPal Sandbox)",

      "request.spokenAfterHtml": "Après le paiement, envoyez votre thème (et votre courriel) à <a href=\"mailto:efjie8008@gmail.com\">efjie8008@gmail.com</a>.",
      "request.offerH2": "Ce que vous offrez",
      "request.offer1": "Votre nom et un courriel de contact",
      "request.offer2": "Un lien Suno et/ou une description de la demande",
      "request.offer3Html": "Une contribution fixe de <strong>10&nbsp;€</strong> ou <strong>10&nbsp;$&nbsp;US</strong> via PayPal",
      "request.offerBody": "Après le paiement, François examine la demande avec soin. Si elle s'accorde avec l'espace, le titre peut rejoindre la bibliothèque pour l'écoute en continu.",
      "request.formH2": "Votre demande",
      "request.labelName": "Votre nom",
      "request.phName": "Prénom ou nom complet",
      "request.labelEmail": "Courriel de contact",
      "request.phEmail": "vous@exemple.com",
      "request.labelSuno": "Lien Suno",
      "request.optionalSuno": "(si vous en avez un)",
      "request.labelDesc": "Description / intention",
      "request.optionalDesc": "(titre, ambiance, message)",
      "request.phDesc": "Décrivez la chanson ou l'intention que vous souhaitez offrir à la bibliothèque…",
      "request.currencyLegend": "Devise * — montant fixe : 10",
      "request.currencyAria": "Devise",
      "request.payEur": "Payer 10 € via PayPal",
      "request.payUsd": "Payer 10 $ US via PayPal",
      "request.copySummary": "Copier le résumé",
      "request.formHint": "Le bouton ouvre PayPal (paypal.me/Francjul) avec le montant choisi. Le résumé de votre demande est copié dans le presse-papiers : collez-le dans la note PayPal si possible, ou envoyez-le ensuite par courriel.",
      "request.afterH2": "Après le paiement",
      "request.afterBody": "Merci. Pour que François puisse relier le paiement à votre demande, envoyez les détails (déjà préparés) à",
      "request.summaryAria": "Résumé de la demande",
      "request.mailto": "Envoyer le résumé par courriel",
      "request.copyAgain": "Recopier le résumé",
      "request.paypalAgain": "Rouvrir PayPal",
      "request.otherH2": "Soutenir autrement",
      "request.otherBodyHtml": "Si vous préférez simplement soutenir le mouvement sans demande précise, visitez la page <a href=\"soutenir.html\">Soutenir</a>. Pour partager Eden Yours avec un ami&nbsp;: <a href=\"invitations.html\">Invitations</a>.",
      "request.footer": "· Demande musicale via PayPal",
      "request.errName": "Indiquez votre nom.",
      "request.errEmail": "Indiquez un courriel de contact valide.",
      "request.errContent": "Ajoutez un lien Suno et/ou une description de votre demande.",
      "request.errSunoProto": "Le lien Suno doit commencer par https://",
      "request.errSunoUrl": "Le lien Suno n'est pas une URL valide.",
      "request.copied": "Résumé copié ✓ — collez-le dans la note PayPal",
      "request.selectCopy": "Sélectionnez et copiez le résumé (Ctrl+C)",
      "request.summaryTitle": "Demande de chanson — Eden Yours",
      "request.summaryName": "Nom : ",
      "request.summaryEmail": "Courriel : ",
      "request.summaryCurrency": "Devise / montant : ",
      "request.summaryPaypal": "PayPal : ",
      "request.summarySuno": "Lien Suno : ",
      "request.summaryDesc": "Description / intention :",
      "request.summaryFooter": "(Résumé généré sur la page Demander une chanson)",
      "request.amountEur": "10 €",
      "request.amountUsd": "10 $ US",

      "player.pause": "Pause",
      "player.play": "Lecture",
      "player.listen": "Écouter",
      "player.prev": "Précédent",
      "player.next": "Suivant",
      "player.progress": "Progression",
      "player.volume": "Volume",
      "player.available": "Disponible",
      "player.soon": "Bientôt",
      "player.soonSub": "Nouveau titre à venir",
      "player.empty": "Aucune chanson française pour le moment.",
      "player.noFeatured": "Aucune chanson française en vedette.",
      "player.playTrack": "Lire {{title}}",
      "player.playAria": "Lire",
      "toast.noAudio": "Audio local indisponible — ouvrez Sur Suno",
      "toast.cantPlay": "Impossible de lire la musique",
      "toast.playBlocked": "Impossible de démarrer la lecture — tapez une fois pour autoriser le son",
      "toast.paypalMissing": "PayPal n'est pas encore configuré",
      "unlock.title": "L'extrait s'achève ici",
      "unlock.body": "Tu as entendu les 30 secondes en offrande libre. Pour ouvrir toute la bibliothèque — un geste sacré de 1 $ US via PayPal — puis reviens et confirme que tu as déjà payé. Une fois déverrouillée, la bibliothèque reste ouverte sur cet appareil.",
      "unlock.payCta": "Écouter la suite",
      "unlock.alreadyPaid": "J'ai déjà payé",
      "unlock.previewBadge": "Extrait 30 s"
    },

    en: {
      "common.tagline": "Listen continuously. It regenerates.",
      "common.menu": "Menu",
      "common.navAria": "Main",
      "common.langAria": "Choose language",
      "nav.home": "Home",
      "nav.library": "Library",
      "nav.practice": "Practice",
      "nav.request": "Request",
      "nav.support": "Support",
      "nav.invites": "Invites",

      "home.title": "Eden Yours — Listen continuously. It regenerates.",
      "home.metaDesc": "Sacred vibrational platform: 15+ Suno tracks for Pure Sensitivity. Listen continuously. It regenerates. Request a song (10€/10$).",
      "home.eyebrow": "Vibrational platform",
      "home.heroH1": "Welcome to",
      "home.heroSubtitle": "Return to the state of Being, reconnect to the Pure Cause.",
      "home.heroLead1": "Eden Yours is not an ordinary website. It is a vibrational platform, a sacred space designed for everyone who has realized they are not their body, but the creative spiritual being who generates reality.",
      "home.heroLead2": "Cross the bridge of admiration, simplify life and restore certainty: your Eden already belongs to you.",
      "home.ctaOui": "▶ Activate your Pure Yes",
      "home.ctaPractice": "Discover the practice",
      "home.ctaLibrary": "Library",
      "home.puzzleEntryAria": "Jigsaw: French or English songs",
      "home.puzzleEntryLabel": "Jigsaw",
      "home.featuredAria": "Featured track",
      "home.btnPlay": "▶ Play",
      "home.btnSuno": "Listen on Suno",
      "home.whyTitle": "Why visit Eden Yours?",
      "home.whySub": "Four doorways into pure resonance.",
      "home.why1Title": "Discover the Axioms of Creation",
      "home.why1Body": "Access a geometric and exact understanding of the universe (the frames of space, energy and time).",
      "home.why2Title": "Practice Pure Sensitivity",
      "home.why2Body": "Learn the famous 30-second technique and conscious breathing to shift into parasympathetic mode and calm the reactive mind.",
      "home.why2Link": "Open the practice →",
      "home.why3Title": "Activate the Body-Antenna",
      "home.why3Body": "Understand how your motility and conscious gestures regenerate your tissues at will so you can walk in eternal joy.",
      "home.why4Title": "Nourish Yourself with Admiration",
      "home.why4Body": "Join a small circle of people ready to change the world's agreements, to eliminate judgment (do not evaluate, do not judge, do not invalidate) and to live in pure resonance.",
      "home.pillarsTitle": "Our Foundational Pillars",
      "home.pillarsSub": "Three agreements that carry the whole platform.",
      "home.pillar1Title": "Function before Structure",
      "home.pillar1Body": "We place attention on the clear intention that heals, not on the apparent decline of matter.",
      "home.pillar2Title": "We First",
      "home.pillar2Body": "Inspired by the original meaning of the Our Father, we build a connected community, without grabbing or possession.",
      "home.pillar3Title": "Certainty facing Data",
      "home.pillar3Body": "Because true knowledge lives in immediate conviction (2 + 2 = 4), without the laziness or doubt that create mysteries.",
      "home.musicTitle": "Music as regeneration",
      "home.musicBody": "Continuous listening is not consumption: it is a practice. It aligns with Pure Sensitivity and Function before Structure — letting the current flow through, track after track, to restore inner certainty.",
      "home.musicPlayFeatured": "▶ Play the featured track",
      "home.musicOpenLib": "Open the library",
      "home.libTitle": "Library",
      "home.libSub": "Queue the tracks — regeneration starts there.",
      "home.libSeeAll": "See all",
      "home.quote": "“I am around. I am already in the pure True. Enter, discover, and never forget it.”",
      "home.closingCta": "Click here to activate your Pure Yes",
      "home.closingHint": "Listen. Stay. Let regeneration settle in.",
      "home.footerLine": "· Vibrational platform · Suno: efjie8008",
      "home.footerRequest": "Request a song",
      "home.footerInvite": "Invite a friend",

      "lib.title": "Library — Eden Yours",
      "lib.metaDesc": "Eden Yours library: continuous listening for regeneration and Pure Sensitivity. 15+ Suno tracks.",
      "lib.h1": "Library & player",
      "lib.lead": "This library is meant to be played end to end. Queue the tracks: the longer you stay in continuous listening, the more regeneration settles in — aligned with Pure Sensitivity and Function before Structure.",
      "lib.playerAria": "Now playing",
      "lib.nowPlaying": "Now playing",
      "lib.nudge": "Tip: let the player queue — the next track starts on its own. That is how regeneration unfolds.",
      "lib.playChain": "▶ Play and continue",
      "lib.allTracks": "All tracks",
      "lib.allTracksSub": "Click a track, then keep going — regeneration rides the sequence.",

      "practice.title": "Practice — Eden Yours",
      "practice.metaDesc": "Eden Yours practice: Pure Sensitivity, the 30-second technique and conscious breathing. Return to the state of Being.",
      "practice.eyebrow": "Pure Sensitivity",
      "practice.h1": "Practice",
      "practice.lead": "Simple doorways to shift out of the reactive mind, feel Function before Structure, and let regeneration settle in — including through continuous listening.",
      "practice.sensTitle": "Pure Sensitivity",
      "practice.sensP1": "Pure Sensitivity is clear attention on what is, without evaluation, without judgment, without invalidation. It opens the space where intention heals more than observing decline.",
      "practice.sensP2": "On Eden Yours, music is a support: letting tracks queue (Listen continuously. It regenerates.) is a concrete way to stay in Function rather than in the structure of “one more song.”",
      "practice.30Title": "The 30-second technique",
      "practice.30P1": "A short invitation: for about thirty seconds, stop feeding the reactive mind. Rest attention on present sensation — breath, body, sound — without analyzing.",
      "practice.30S1": "Pause whatever you were doing for a moment.",
      "practice.30S2": "Feel rather than think: warmth, weight, vibration, silence.",
      "practice.30S3": "Let about 30 seconds pass without inner commentary.",
      "practice.30S4": "Return gently — optionally by starting continuous listening.",
      "practice.30Note": "This is not a medical protocol. It is a poetic doorway into calm and presence, as offered in the spirit of Eden Yours.",
      "practice.breathTitle": "Conscious breathing",
      "practice.breathP1": "Conscious breathing helps shift into parasympathetic mode and calm the reactive mind. Inhale and exhale with attention, without forcing — simply accompanying the natural movement of the breath.",
      "practice.breathS1": "Sitting or standing, relax the shoulders.",
      "practice.breathS2": "Inhale slowly through the nose, feeling the air enter.",
      "practice.breathS3": "Exhale gently, releasing the belly and the jaw.",
      "practice.breathS4": "Repeat a few cycles, then — if you wish — start the library.",
      "practice.breathNote": "No promise of medical healing: only an accessible reminder to return to a calmer, more receptive state.",
      "practice.bodyTitle": "The Body-Antenna",
      "practice.bodyP1": "Your motility and conscious gestures can be lived as an antenna: each intentional movement becomes an agreement with joy, rather than an automatic reaction. Function (clear intention) precedes Structure (what the body “seems” to be).",
      "practice.bodyP2": "Walk, move, listen — consciously. Let the music accompany this current of inner regeneration.",
      "practice.ctaListen": "▶ Listen continuously",
      "practice.ctaPillars": "See the pillars",
      "practice.footer": "· Practice",

      "support.title": "Support — Eden Yours",
      "support.metaDesc": "Support the Eden Yours movement — sharing, admiration and free contribution via PayPal.",
      "support.eyebrow": "Agreement of sharing",
      "support.h1": "Support the Movement",
      "support.lead": "The platform runs on the pure agreement of sharing and admiration. If our content resonates with you and lifts your state of being, you can contribute freely through our secure PayPal account.",
      "support.paypalH2": "PayPal",
      "support.paypalBody": "Every gesture of support helps spread this endless light through the Instantaneous Ether.",
      "support.paypalReady": "● PayPal ready",
      "support.paypalPending": "● PayPal coming soon",
      "support.paypalBtn": "Donate via PayPal",
      "support.paypalHint": "Donations go through <strong>paypal.me/Francjul</strong>. The button opens PayPal in a new tab.",
      "support.requestH2": "Request a song",
      "support.requestBody": "Want to propose a Suno track or an intention for the library? A fixed offering of 10 € or 10 USD opens the request — François then considers adding it to continuous listening.",
      "support.requestBtn": "Open the request",
      "support.shareH2": "Sharing and admiration",
      "support.shareBody": "No amount required. Give what resonates — every gesture supports the spread of Eden Yours.",
      "support.footer": "· Thank you for your support",

      "invite.title": "Invites — Eden Yours",
      "invite.metaDesc": "Invite friends to Eden Yours — vibrational manifesto and listening that regenerates. Listen continuously.",
      "invite.h1": "Invites",
      "invite.lead": "Share the manifesto: a sacred space to return to the state of Being, and music that regenerates when listened to continuously. Copy the template or open your email client.",
      "invite.templateH2": "Email template",
      "invite.templateHelp": "The text includes the site URL — update siteUrl in config.js after deployment.",
      "invite.templateAria": "Invitation template",
      "invite.copy": "Copy template",
      "invite.mailto": "Open in my email",
      "invite.tipsH2": "Tips",
      "invite.tip1": "To propose a track for the library: Request a song (10 € / 10 $ via PayPal).",
      "invite.tip1Html": "To propose a track for the library: <a href=\"demander.html\">Request a song</a> (10&nbsp;€ / 10&nbsp;$ via PayPal).",
      "invite.tip2Html": "Replace <code>siteUrl</code> and optionally <code>contactEmail</code> in <code>config.js</code>.",
      "invite.tip3Html": "The “Open in my email” button uses <code>mailto:</code> with subject and body prefilled.",
      "invite.tip1Link": "Request a song",
      "invite.tip2": "Replace siteUrl and optionally contactEmail in config.js.",
      "invite.tip3": "The “Open in my email” button uses mailto: with subject and body prefilled.",
      "invite.tip4": "Later you can wire server-side invite sending — this template remains the base.",
      "invite.footer": "· Share the resonance",
      "invite.copied": "Template copied ✓",
      "invite.selectCopy": "Select and copy (Ctrl+C)",
      "invite.templateBody": "Hey —\n\nWelcome to {{site}}.\n\nReturn to the state of Being, reconnect to the Pure Cause.\nThis is not an ordinary website — it is a vibrational platform, a sacred space for those who have realized they are not their body, but the creative spiritual being who generates reality.\n\nListen continuously. It regenerates.\nLet the tracks queue: music becomes a practice of Pure Sensitivity and Function before Structure.\n\n→ {{siteUrl}}\n{{extra}}\n\nEnter, discover, and never forget it.\n\n— {{artist}}",
      "invite.extraSuno": "→ “{{songTitle}}” also on Suno: {{suno}}",
      "invite.extraFeatured": "→ Featured track: “{{songTitle}}”",
      "invite.libraryFallback": "the library",

      "request.title": "Request a song — Eden Yours",
      "request.metaDesc": "Request a song on Eden Yours (10€ / 10$). Propose a Suno track or an intention for the continuous-listening library.",
      "request.eyebrow": "Musical offering",
      "request.h1": "Request a song",
      "request.leadHtml": "Do you have a Suno track, an intention, or a melody that resonates? For <strong>10&nbsp;€</strong> or <strong>10&nbsp;USD</strong>, François considers adding your track (or your request) to the Eden Yours continuous-listening library — a sacred gesture, not a commercial guarantee.",
      "request.spokenH2": "A custom spoken-word track",
      "request.spokenBodyHtml": "You receive a spoken-word Suno track of about <strong>two minutes</strong>, made on your theme — a voice, an intention, a moment of listening. A simple, living gesture, not a mass product. Price: <strong>25&nbsp;CAD</strong>.",
      "request.spokenPay": "Pay 25 CAD via PayPal",
      "request.spokenTestBadge": "TEST MODE",
      "request.spokenTestHint": " — PayPal Sandbox, no real money. See PAYPAL-SANDBOX-TEST.md",
      "request.spokenTestSetupHtml": "Sandbox button not wired yet: add the sandbox business email (or button URL) in <code>config.js</code> → <code>spokenOffer</code>.",
      "request.spokenPayTest": "Test 25 CAD (PayPal Sandbox)",

      "request.spokenAfterHtml": "After paying, send your theme (and your email) to <a href=\"mailto:efjie8008@gmail.com\">efjie8008@gmail.com</a>.",
      "request.offerH2": "What you offer",
      "request.offer1": "Your name and a contact email",
      "request.offer2": "A Suno link and/or a description of the request",
      "request.offer3Html": "A fixed contribution of <strong>10&nbsp;€</strong> or <strong>10&nbsp;USD</strong> via PayPal",
      "request.offerBody": "After payment, François carefully reviews the request. If it fits the space, the track may join the library for continuous listening.",
      "request.formH2": "Your request",
      "request.labelName": "Your name",
      "request.phName": "First name or full name",
      "request.labelEmail": "Contact email",
      "request.phEmail": "you@example.com",
      "request.labelSuno": "Suno link",
      "request.optionalSuno": "(if you have one)",
      "request.labelDesc": "Description / intention",
      "request.optionalDesc": "(title, mood, message)",
      "request.phDesc": "Describe the song or intention you wish to offer to the library…",
      "request.currencyLegend": "Currency * — fixed amount: 10",
      "request.currencyAria": "Currency",
      "request.payEur": "Pay 10 € via PayPal",
      "request.payUsd": "Pay 10 USD via PayPal",
      "request.copySummary": "Copy summary",
      "request.formHint": "The button opens PayPal (paypal.me/Francjul) with the chosen amount. Your request summary is copied to the clipboard: paste it into the PayPal note if possible, or email it afterward.",
      "request.afterH2": "After payment",
      "request.afterBody": "Thank you. So François can link the payment to your request, send the details (already prepared) to",
      "request.summaryAria": "Request summary",
      "request.mailto": "Send summary by email",
      "request.copyAgain": "Copy summary again",
      "request.paypalAgain": "Reopen PayPal",
      "request.otherH2": "Support another way",
      "request.otherBodyHtml": "If you simply prefer to support the movement without a specific request, visit the <a href=\"soutenir.html\">Support</a> page. To share Eden Yours with a friend: <a href=\"invitations.html\">Invites</a>.",
      "request.footer": "· Song request via PayPal",
      "request.errName": "Please enter your name.",
      "request.errEmail": "Please enter a valid contact email.",
      "request.errContent": "Add a Suno link and/or a description of your request.",
      "request.errSunoProto": "The Suno link must start with https://",
      "request.errSunoUrl": "The Suno link is not a valid URL.",
      "request.copied": "Summary copied ✓ — paste it into the PayPal note",
      "request.selectCopy": "Select and copy the summary (Ctrl+C)",
      "request.summaryTitle": "Song request — Eden Yours",
      "request.summaryName": "Name: ",
      "request.summaryEmail": "Email: ",
      "request.summaryCurrency": "Currency / amount: ",
      "request.summaryPaypal": "PayPal: ",
      "request.summarySuno": "Suno link: ",
      "request.summaryDesc": "Description / intention:",
      "request.summaryFooter": "(Summary generated on the Request a song page)",
      "request.amountEur": "10 €",
      "request.amountUsd": "10 USD",

      "player.pause": "Pause",
      "player.play": "Play",
      "player.listen": "Listen",
      "player.prev": "Previous",
      "player.next": "Next",
      "player.progress": "Progress",
      "player.volume": "Volume",
      "player.available": "Available",
      "player.soon": "Coming soon",
      "player.soonSub": "New track coming soon",
      "player.empty": "No English songs for now.",
      "player.noFeatured": "No English featured track.",
      "player.playTrack": "Play {{title}}",
      "player.playAria": "Play",
      "toast.noAudio": "Local audio unavailable — open On Suno",
      "toast.cantPlay": "Unable to play the music",
      "toast.playBlocked": "Unable to start playback — tap once to allow sound",
      "toast.paypalMissing": "PayPal is not configured yet",
      "unlock.title": "The preview ends here",
      "unlock.body": "You've heard the free 30-second offering. To open the full library — a sacred gesture of $1 USD via PayPal — then return and confirm you've already paid. Once unlocked, the library stays open on this device.",
      "unlock.payCta": "Continue listening",
      "unlock.alreadyPaid": "I've already paid",
      "unlock.previewBadge": "30s preview"
    }
  };

  function detectLang() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "fr" || stored === "en") return stored;
    } catch (e) {}
    // First visit / no preference: default to English (FR available via selector)
    return "en";
  }

  var lang = detectLang();
  var listeners = [];

  function interpolate(str, vars) {
    if (!vars) return str;
    return String(str).replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return vars[k] != null ? String(vars[k]) : "";
    });
  }

  function t(key, vars) {
    var pack = dict[lang] || dict.fr;
    var val = pack[key];
    if (val == null) val = (dict.fr && dict.fr[key]) || key;
    return interpolate(val, vars);
  }

  function applyAttr(el, attr, value) {
    if (value == null) return;
    if (attr === "text") el.textContent = value;
    else if (attr === "html") el.innerHTML = value;
    else el.setAttribute(attr, value);
  }

  function apply() {
    document.documentElement.lang = lang === "en" ? "en" : "fr-CA";

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      applyAttr(el, "text", t(el.getAttribute("data-i18n")));
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      applyAttr(el, "html", t(el.getAttribute("data-i18n-html")));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-title");
      var val = t(key);
      if (el.tagName === "TITLE") {
        document.title = val;
        el.textContent = val;
      } else {
        el.setAttribute("title", val);
      }
    });
    document.querySelectorAll('meta[name="description"][data-i18n-content]').forEach(function (el) {
      el.setAttribute("content", t(el.getAttribute("data-i18n-content")));
    });
    document.querySelectorAll('meta[property="og:title"][data-i18n-content], meta[property="og:description"][data-i18n-content], meta[name="twitter:title"][data-i18n-content], meta[name="twitter:description"][data-i18n-content], meta[property="og:image:alt"][data-i18n-content]').forEach(function (el) {
      el.setAttribute("content", t(el.getAttribute("data-i18n-content")));
    });
    var ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute("content", lang === "en" ? "en_US" : "fr_CA");

    // Taglines from config override only if no data-i18n; we prefer i18n
    document.querySelectorAll("[data-tagline]").forEach(function (el) {
      if (!el.hasAttribute("data-i18n")) el.textContent = t("common.tagline");
    });

    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      var l = btn.getAttribute("data-set-lang");
      var active = l === lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    listeners.forEach(function (fn) {
      try { fn(lang); } catch (e) { console.error(e); }
    });
  }

  function setLang(next) {
    if (next !== "fr" && next !== "en") return;
    if (next === lang) {
      apply();
      return;
    }
    lang = next;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    apply();
  }

  function onChange(fn) {
    if (typeof fn === "function") listeners.push(fn);
  }

  function initSwitcher() {
    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLang(btn.getAttribute("data-set-lang"));
      });
    });
  }

  window.EdenI18n = {
    t: t,
    apply: apply,
    setLang: setLang,
    getLang: function () { return lang; },
    onChange: onChange,
    dict: dict
  };

  function boot() {
    initSwitcher();
    apply();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
