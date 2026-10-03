# Rose Noire — site vitrine « cinématique »

Site de **Rose Noire**, fleuriste artisanale au Châtelain : Rue Américaine 160, 1050 Ixelles
(Fleur Concept SRL, BCE 0891.549.170). Sophie compose fleurs fraîches, fleurs d’anniversaire,
fleurs séchées et artificielles, plantes vertes, vases et décorations, fleurs de mariage, gerbes
et couronnes, et livre dans les 19 communes de Bruxelles, du mardi au dimanche (15 €).

**En ligne : https://michprk.github.io/rose-noire-bruxelles/**

Deuxième proposition pour Rose Noire (la première, avec la rose en verre 3D, reste en ligne sur
https://michprk.github.io/rose-noire.be/). Objectif : **convertir**. Une action principale répétée
partout, « Commander un bouquet », plus le devis entreprise, l’appel et WhatsApp en un clic.

## Direction artistique

- **Référence de mise en page : Seed** (grande photo lumineuse, titre court aligné à gauche, bouton
  pilule sombre, puis une bande de couleur profonde). La photo est la vraie vitrine de Rose Noire.
- **Moteur cinématique : le kit « cinematic site »** (héros scroll-scrub). Sans vidéo IA, le vol de
  caméra est fait avec trois vraies photos de la boutique : la caméra avance dans la vitrine,
  plonge dans un vase, et le plan suivant s’ouvre en iris depuis ce point, avec un halo de lumière
  chaude et un grain argentique. Quatre temps : la vitrine, l’atelier, la référence, l’appel à l’action.
- **Couleurs** (tirées des photos de la boutique) : ivoire `#fbf6f1`, lin rosé `#f5ebe4`, rose poudré
  `#f6d3d6`, abricot `#f5c9ad`, et un bordeaux presque noir `#3a0c1d` (la couleur d’une rose noire)
  pour les boutons et les bandes sombres. Un seul accent, framboise `#c23561`, pour les italiques.
- **Typographies** : titres en **Instrument Sans**, mots en italique en **Inria Serif**, texte en
  **Inria Sans**, marque « Rose Noire » en **Inknut Antiqua**. Toutes auto-hébergées (aucun appel à
  Google Fonts), licences dans `licenses/`.

## Structure

```
index.html              accueil : héros cinématique, réassurance, boutique (8 produits réels du site
                        actuel + livraison), atelier et chiffres, entreprises, avis et Maison Blanche,
                        galerie, manifeste, questions, contact (commande ou devis)
confidentialite.html    politique de confidentialité (RGPD) et cookies
cgu.html                conditions d’utilisation, mentions légales, crédits
404.html                « Cette page s’est fanée » : retrouve la bonne section depuis les anciennes
                        adresses WordPress (livraison-de-fleurs-bruxelles, cactus-bruxelles, nl/…)
partials/               blocs communs (en-tête, pied de page, cookies, icônes, <head>)
assets/css/main.css     tout le style : charte, typographie, animations, responsive
assets/js/boot.js       copié en ligne dans le <head> : HTTPS forcé, préférence d’animation, rideau
assets/js/app.js        héros cinématique, révélations, formulaire, cookies, mesure d’audience…
assets/img/             photos de la boutique en WebP, plusieurs tailles (srcset)
assets/fonts/           les 4 polices (woff2, sous-ensemble latin)
api/                    API des formulaires, hors du site : PHP (Hostinger) ou Cloudflare Workers
favicon.svg/.ico/-32.png, apple-touch-icon.png, icon-*.png, site.webmanifest, og.jpg (partage)
robots.txt, sitemap.xml, .well-known/security.txt, .htaccess, _headers
scripts/                build.sh, check-links.sh, export-hostinger.sh
```

Aucune dépendance à installer : HTML, CSS et JavaScript simples, aucune bibliothèque externe.

## Modifier le site

Les blocs communs sont écrits **une seule fois** dans `partials/` puis recopiés dans chaque page
entre `<!--#include nom-->` et `<!--/include-->`. Après toute modification :

```bash
bash scripts/build.sh        # blocs communs, empreinte CSP de boot.js, versions des fichiers (?v=)
bash scripts/check-links.sh  # aucun lien ni aucune image cassés
```

Photos : originaux du site actuel dans `GitHub/_rose-noire-src/wp/`. L’outil
`_rose-noire-src/tool-bx.html` (servi en local) recadre, agrandit avec netteté et compresse en WebP
les plans du héros, produit les favicons et l’image de partage `og.jpg`.

## Animations

- **Rideau d’ouverture** (une fois par visite) : « Rose Noire » sur fond bordeaux, qui se lève.
- **Héros** : zoom lent sur chaque plan, plongée dans le point focal, ouverture en iris du plan
  suivant, halo chaud, grain, textes qui montent et s’effacent, barre de progression des chapitres.
- **Sections** : titres qui montent ligne par ligne derrière un masque, cartes qui se soulèvent,
  chiffres qui comptent, parallaxe de l’image « Entreprises », lettre de la Maison Blanche qui se
  redresse, citation qui s’allume mot à mot, galerie qui défile et suit le sens du défilement,
  « Rose Noire » géant du pied de page dont les lettres se lèvent.
- **Mobile** : héros plus court, produits en carrousel au doigt, barre « Appeler / Commander »
  collée en bas de l’écran (cachée près du formulaire).

Toutes les animations sont actives par défaut. « Réduire les animations » (pied de page) passe en
version statique, mémorisée (`rnb_motion`). Aussi : `?motion=reduce`.

## Formulaire, anti-spam, API

- Deux onglets : **Commander un bouquet** (occasion, livraison 15 € ou retrait, budget, date,
  adresse, style) et **Entreprise & événement** (besoin, société, date ou rythme). Les cartes
  produits présélectionnent le bon onglet et le produit.
- **Validation** en français sous chaque champ (pas de livraison le lundi, date passée, adresse…),
  correction des fautes de frappe d’e-mail (« gmial.com »), erreurs annoncées aux lecteurs d’écran.
- **Anti-spam** : champ piège invisible, envoi refusé en moins de 3 secondes, une demande par minute,
  un seul lien autorisé ; côté API : contrôle d’origine, limite par adresse IP, validation serveur.
- **Envoi** : sans API, la messagerie du visiteur s’ouvre avec la demande pré-remplie vers
  rosenoire160@hotmail.com. Avec l’API (`api/`, secrets côté serveur uniquement), l’e-mail part
  directement : renseigner `data-api` sur la balise `<html>` (automatique avec l’export Hostinger).

## Cookies et mesure d’audience

Aucun cookie publicitaire. Bannière avec « Tout refuser » et « Tout accepter » au même niveau,
« Personnaliser », et « Gérer les cookies » dans le pied de page. **Google Analytics 4** ne se charge
qu’après accord : coller l’identifiant `G-XXXXXXX` dans `data-ga` de la balise `<html>` de chaque page.
Tant qu’il est vide, aucune requête ne part vers un service tiers. Événements suivis : commandes,
devis, appels, WhatsApp, e-mail, itinéraire, Instagram, produits, FAQ, erreurs de formulaire, 404.

## Sécurité, référencement, vitesse

- HTTPS forcé (`boot.js`, `.htaccess`, `_headers`), HSTS, CSP stricte sans script tiers non consenti,
  anti-iframe, cache long des fichiers versionnés.
- Titres et descriptions uniques, Open Graph + image de partage 1200 × 630, données structurées
  `Florist` et `FAQPage`, `sitemap.xml` avec images, `robots.txt`, textes alternatifs partout.
- Image du héros préchargée en priorité, autres images en WebP à la bonne taille et chargées au
  dernier moment, polices préchargées (≈ 97 Ko), aucun framework.

> La maquette est en `noindex` tant que la boutique n’a pas validé le site.
> `bash scripts/export-hostinger.sh` prépare la version finale pour rose-noire.be (sans noindex,
> adresses à la racine, formulaires reliés à `api/contact.php`).

## À confirmer avec la boutique

- Autorisation d’utiliser les photos du site actuel ; photos récentes en haute définition (les
  originaux font 1024 px de large, agrandis avec netteté pour le héros).
- Frais de livraison 15 € (11 € sur d’anciennes pages du site actuel).
- Textes de la Maison Blanche (lettre du 21 octobre 2014), d’ELLE Belgique et des avis City Plug.
- Hôtels fleuris par Rose Noire (cités par L’Éventail) : noms utilisables comme références ?
- Version néerlandaise, identifiant Google Analytics, nom de domaine.
