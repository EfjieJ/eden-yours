/* Eden Yours Platform — configuration
   Modifiez ces valeurs selon vos besoins. */
window.EDEN_CONFIG = {
  siteName: "Eden Yours",
  artistName: "Eden Yours",
  tagline: "Écoute en continu. Ça régénère.",
  siteUrl: "https://EfjieJ.github.io/eden-yours/",
  paypalUrl: "https://paypal.me/Francjul",
  unlockPaypalUrl: "https://paypal.me/Francjul/1USD",
  /* Extrait gratuit, en secondes. 0 = chansons entières pour tout le monde (par défaut).
     Pour un futur abonnement, mettre p. ex. 30 : la limite et la fenêtre de déblocage reviennent. */
  FREE_PREVIEW_SECONDS: 0,
  previewSeconds: 0,
  unlockStorageKey: "eden-yours-unlocked",
  contactEmail: "efjie8008@gmail.com",
  sunoArtist: "efjie8008",

  /* Offre « Une piste parlée sur mesure » — 25 $ CAD
     testMode: true  → bouton sandbox (aucun argent réel)
     testMode: false → vrai bouton paypal.me/Francjul/25CAD
     Remplir sandboxBusinessEmail (compte Business sandbox) pour activer le lien de test.
     Voir PAYPAL-SANDBOX-TEST.md */
  spokenOffer: {
    testMode: false,
    amount: "25.00",
    currency: "CAD",
    itemName: "Eden Yours — Une piste parlée sur mesure",
    liveUrl: "https://paypal.me/Francjul/25CAD",
    /* Compte marchand sandbox (developer.paypal.com → Sandbox → Accounts → Business) */
    sandboxBusinessEmail: "",
    /* Ou collez ici l'URL complète d'un bouton hébergé sandbox (prioritaire si rempli) */
    sandboxButtonUrl: ""
  }
};
