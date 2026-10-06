# Eden Yours Platform

Site statique (zéro dépendance) pour **Eden Yours** — plateforme vibratoire, pas seulement un lecteur musical. Interface en français canadien (`fr-CA`).

**Promesse musicale :** *Écoute en continu. Ça régénère.*  
**Manifeste :** le retour à l'état d'Être, la reconnexion à la Cause Pure.

Visiteurs : lire le manifeste, pratiquer la Sensibilité Pure, écouter en continu, soutenir via PayPal (quand configuré), partager une invitation.  
Propriétaire : ajouter des chansons dans `tracks.json`, brancher PayPal et déployer.

---

## Aperçu local

À la racine du site :

```bash
cd /workspace/eden-music-platform
python3 -m http.server 8080
```

Ouvrez [http://127.0.0.1:8080/](http://127.0.0.1:8080/).

> Important : servez toujours via HTTP (pas `file://`) pour que `fetch('tracks.json')` fonctionne.

---

## Structure

```
eden-music-platform/
├── index.html              # Manifeste d'accueil + piliers + teaser musique
├── bibliotheque.html       # Lecteur + catalogue (3 titres)
├── pratique.html           # Sensibilité Pure / 30 s / respiration
├── soutenir.html           # Soutien au mouvement (PayPal)
├── invitations.html        # Modèle courriel + mailto
├── config.js               # Nom, URL, PayPal, courriel
├── tracks.json             # Catalogue des titres
├── css/styles.css
├── js/app.js               # Lecteur audio + UI
├── js/ambiance.js          # Ciel aurore + particules, lumière et carillon d'accueil, portails
├── assets/
│   ├── audio/              # Fichiers .m4a locaux
│   └── covers/             # Pochettes
└── README.md
```

**Navigation :** Accueil · Bibliothèque · Pratique · Soutenir · Invitations

**Ambiance immersive (`js/ambiance.js` + fin de `css/styles.css`) :** fond violet → or avec aurores
qui respirent (CSS, transform/opacity), canvas de ~40–60 points lumineux et deux ondes lentes
(pointer-events:none, 30–40 i/s, pause onglet caché, image fixe si mouvement réduit), lumière
d'accueil + carillon Web Audio doux une seule fois par visite (`sessionStorage` « eden-welcome »),
jeux présentés en portails lumineux avec transition « traverser ». Chargé en fin de `<body>`
sur toutes les pages qui utilisent `css/styles.css`.

---

## Configuration (`config.js`)

```js
window.EDEN_CONFIG = {
  siteName: "Eden Yours",
  artistName: "Eden Yours",
  tagline: "Écoute en continu. Ça régénère.",
  siteUrl: "https://votresite.example.com",
  paypalUrl: "",                     // ex. "https://paypal.me/votreNom"
  contactEmail: "",
  sunoArtist: "efjie8008"
};
```

| Champ | Effet |
|--------|--------|
| `siteName` / `artistName` | Marque affichée partout |
| `tagline` | Slogan musical (eyebrow, pied de page, invitation) |
| `siteUrl` | Inséré dans le modèle d'invitation |
| `paypalUrl` | Si non vide → bouton don actif. Si vide → « PayPal bientôt branché » |
| `contactEmail` | Destinataire du `mailto:` (peut rester vide) |

---

## Ajouter un titre (`tracks.json`)

1. Placez l'audio dans `assets/audio/` (ex. `mon-uuid.m4a`).
2. Placez la pochette dans `assets/covers/` (ex. `mon-uuid.jpeg`).
3. Ajoutez une entrée :

```json
{
  "id": "mon-uuid",
  "title": "Titre de la chanson",
  "artist": "Eden Yours",
  "sunoArtist": "efjie8008",
  "audio_url": "assets/audio/mon-uuid.m4a",
  "cover_url": "assets/covers/mon-uuid.jpeg",
  "suno_share": "https://suno.com/s/XXXX",
  "duration": null,
  "featured": false
}
```

- `audio_url` : chemin **local relatif** (préféré).
- `suno_share` : lien secondaire « Écouter sur Suno ».
- `featured: true` : titre mis en avant sur l'accueil (un seul recommandé).
- `lang` : `"fr"` ou `"en"` — seule la langue choisie sur le site est affichée.

### Titre sans MP3 : lecteur Suno intégré

Pour une chanson sans fichier audio local, mettez `"audio_url": null` et ajoutez
`"embed_url": "https://suno.com/embed/<uuid-du-clip>"`. Le lecteur, la bibliothèque et
le casse-tête affichent alors l'iframe Suno (pas de limite de 30 s : c'est Suno qui gère
la lecture). Ces titres ne sont pas proposés dans Rythme-Compasse / Création-Demain
(qui ont besoin de segments audio locaux). Pour le casse-tête, ajoutez aussi l'entrée
dans `SONGS` de `js/casse-tete.js` avec `embed:` au lieu de `audio:`.
Gardez `sunoTitle` (titre affiché par le lecteur Suno) : le blind test s'en sert pour
cacher le titre. Pour passer plus tard à un MP3, gardez le même `id` (UUID du clip),
remplissez `audio_url` / `audio_url_aac` et retirez `embed_url` (et `embed:` dans le casse-tête).

---

## PayPal

1. Créez un lien [PayPal.Me](https://www.paypal.com/paypalme/) ou un bouton hébergé.
2. Collez l'URL dans `config.js` → `paypalUrl`.
3. Rechargez : le statut passe à « PayPal prêt » et le bouton ouvre l'URL.

Sans lien, le site **ne prétend pas** que les dons sont actifs. Aucune URL PayPal fictive n'est fournie.

---

## Déploiement (statique)

Tout le dossier se déploie tel quel (HTML/CSS/JS + `assets/`).

### Netlify
- Glisser-déposer le dossier, ou lier un dépôt Git.
- Publish directory = racine du site.

### GitHub Pages
- Poussez le contenu sur `main` (ou `gh-pages`).
- Settings → Pages → racine `/` (ou `/docs`).

### Vercel
- Framework Preset **Other**. Aucune commande de build.

Après déploiement, mettez à jour `siteUrl` dans `config.js`.

---

## Contenu actuel (graine)

| Titre | UUID (audio / cover) | Suno |
|--------|----------------------|------|
| La Sensibilité est la Fonction (vedette) | `f5bf8830-85bb-4a9b-9545-081800be485f` | [lien](https://suno.com/s/zcIyAJuM0oB4E6sm) |
| Particule Pure | `dead13bb-42bc-492e-83a1-87609f224734` | [lien](https://suno.com/s/Z4eMjeQMXP7Wp613) |
| Tout ce que je demande l'univers me le donne | `2c8a36c9-4207-41b9-80e9-bf78313c2099` | [lien](https://suno.com/s/xEWZPaMo5HSbXeMp) |

Créateur Suno : **efjie8008**.

---

## Notes

- Langage spirituel / vibratoire : poétique, sans protocole médical inventé.
- Contenu audio et pochettes : propriété de l'artiste.
- Site sans framework ni `npm install`.
