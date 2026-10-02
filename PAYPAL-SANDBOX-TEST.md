# Test PayPal Sandbox — « Une piste parlée sur mesure » (25 $ CAD)

**Important :** [paypal.me/Francjul](https://paypal.me/Francjul) n’a **pas** de mode sandbox.
Le vrai paiement reste `https://paypal.me/Francjul/25CAD`.
Le test utilise le **PayPal Developer Sandbox** (comptes fictifs, aucun argent réel).

## Ce qui est déjà sur le site

- Page [Demander](https://efjiej.github.io/eden-yours/demander.html) → carte **Une piste parlée sur mesure**
- `config.js` → `spokenOffer.testMode: true` affiche le bandeau **MODE TEST**
- Le bouton de test se construit à partir de `spokenOffer.sandboxBusinessEmail` ou `sandboxButtonUrl`

## Étapes pour créer le bouton de test (une fois)

1. Va sur [developer.paypal.com](https://developer.paypal.com/) et connecte-toi avec le **même compte** que Francjul (celui derrière paypal.me/Francjul).
2. Ouvre **Testing Tools → Sandbox → Accounts**.
3. Crée (ou note) un compte **Business** sandbox → copie son e-mail (ex. `sb-xxxxx@business.example.com`).
4. Crée aussi un compte **Personal** sandbox (acheteur fictif) → note e-mail + mot de passe affichés.
5. Dans le dépôt, ouvre `config.js` et remplis :
   ```js
   spokenOffer: {
     testMode: true,
     sandboxBusinessEmail: "COLLER_ICI_EMAIL_BUSINESS_SANDBOX",
     // optionnel : si tu crées un bouton hébergé sandbox, colle son URL ici (prioritaire)
     sandboxButtonUrl: ""
   }
   ```
6. Commit / push, puis recharge Demander.

## Comment le client (ou toi) teste sans payer

1. Ouvre https://efjiej.github.io/eden-yours/demander.html
2. Vérifie le bandeau jaune **MODE TEST**.
3. Clique **Tester 25 $ CAD (PayPal Sandbox)**.
4. Sur `sandbox.paypal.com`, connecte-toi avec le compte **Personal** sandbox (pas ton PayPal réel).
5. Confirme le paiement de 25 CAD — **aucun débit réel**.
6. Après le « paiement », envoie le thème à efjie8008@gmail.com comme d’habitude (processus métier inchangé).

## Où brancher le vrai bouton (après validation du test)

Dans `config.js` :

```js
spokenOffer: {
  testMode: false,   // ← passe à false
  liveUrl: "https://paypal.me/Francjul/25CAD"  // déjà en place
}
```

Puis push. Le bandeau TEST disparaît et le bouton redevient le vrai [paypal.me/Francjul/25CAD](https://paypal.me/Francjul/25CAD).

Fichier concerné côté page : `demander.html` (`#spoken-paypal-btn`) + `js/spoken-offer.js`.
