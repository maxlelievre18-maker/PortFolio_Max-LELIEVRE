# Portfolio de Max Lelièvre

Site portfolio statique français / anglais, prêt pour GitHub Pages. Les pages publiques n’utilisent ni framework, ni API, ni service payant. Un gestionnaire local sans dépendance est fourni pour créer et modifier les fiches et copier leurs médias dans le projet. Node.js 18 ou plus récent est requis pour l’interface de gestion ; Microsoft Edge sert à régénérer les PDF ; les visiteurs du site n’ont besoin ni de Node.js ni d’Edge.

## Démarrer l’interface locale

1. Installe Node.js 18 ou plus récent si nécessaire. Le gestionnaire n’a pas de dépendance à installer.
2. Lance `demarrer-portfolio.bat` par double-clic, ou ouvre un terminal à la racine du dossier et exécute :

   ```powershell
   node project_manager.mjs
   ```

3. Le lanceur ouvre automatiquement l’interface de gestion et le portfolio dans ton navigateur. Sinon, va à [http://127.0.0.1:8765/admin/](http://127.0.0.1:8765/admin/).
4. Après tes changements, arrête le serveur avec `Ctrl+C`. Le gestionnaire ne fonctionne que sur cet ordinateur ; il ne publie rien sur Internet.

Le site de prévisualisation locale est servi sur [http://127.0.0.1:8765/](http://127.0.0.1:8765/). Depuis la fiche d’un projet, le bouton « Aperçu du site » ouvre directement sa page.

## Créer ou modifier un projet

Dans la colonne « Projets », sélectionne une fiche pour la modifier ou clique sur « Nouveau projet ». Renseigne les champs utiles ; aucun crédit, rôle, outil ou visuel n’est créé automatiquement.

- **Nom du projet / titre du film** : titre original affiché en français.
- **Titre anglais** : facultatif ; utilisé dans la version anglaise du site quand il est fourni.
- **Année**, **type**, **catégories**, **statut**, **rôle** : informations de contexte du projet.
- **Description courte** : une à trois phrases en français et en anglais.
- **Contribution personnelle** : tes tâches réellement effectuées, une par ligne et dans chaque langue.
- **Objectif technique** : défi ou effet recherché, dans les deux langues.
- **Logiciels** : coche les logos des logiciels réellement utilisés sur ce projet.
- **Crédits** : une ligne par personne ou organisme, sous la forme `Rôle | Nom`.
- **Projet à la une** : activé pour les grandes cartes d’accueil ; sinon le projet est classé dans « Autres projets ».
- **Présence sur le CV** : choisis « Oui » pour forcer un projet dans la sélection prioritaire, « Non » pour l’exclure, ou « Automatique » pour le laisser compléter les places libres du CV.
- **Ordre d’affichage** : le nombre le plus petit apparaît en premier dans chaque groupe du site.
- **Priorité CV** : départage les projets cochés « Présence sur le CV » ; le nombre le plus petit apparaît en premier.
- **Visible sur le site** : désactive pour garder une fiche en brouillon. Les projets masqués ne paraissent ni sur le site ni sur le CV.

Clique sur « Enregistrer le projet » avant d’ajouter des médias. Le gestionnaire maintient la fiche dans `data/portfolio.json` et régénère `js/projects.js`, utilisé par le portfolio public. Le CV prend au maximum cinq projets : les projets réglés sur « Oui » passent en premier selon leur priorité CV, puis il complète avec les projets « Automatique » visibles et documentés les plus récents si des places restent libres. « Non » exclut explicitement le projet.

## Ajouter images et vidéos

Choisis un ou plusieurs fichiers dans la section dédiée de la fiche. Le gestionnaire les copie dans `assets/images/projects/<id>/` ou `assets/videos/projects/<id>/`, ajoute les chemins aux données du projet et montre un aperçu. Les formats et dimensions affichés sont des recommandations ; l’outil accepte WebP, JPEG, PNG et AVIF pour les images, MP4, WebM ou MOV pour les vidéos. Le MP4 H.264 est le format vidéo le plus largement lisible. Une vidéo lourde rallonge le chargement GitHub Pages : privilégie des extraits courts et compressés.

| Fichier indicatif | Préparation conseillée | À quoi sert l’image / la vidéo ? | Priorité |
| --- | --- | --- | --- |
| `cover.webp` | 1920 × 1080 | Image représentative de couverture ; utilisée sur la carte et en haut de la page projet. | Essentielle |
| `still-01.webp` | 1920 × 1080 | Image fixe du film ou du projet montrant le résultat dans son contexte. | Recommandée |
| `still-02.webp` | 1920 × 1080 | Autre plan utile pour présenter la variété du projet. | Recommandée |
| `still-03.webp` | 1920 × 1080 | Image supplémentaire si elle apporte une information nouvelle. | Optionnelle |
| `before-after-01-before.webp` + `before-after-01-after.webp` | 1920 × 1080, même cadrage | Le plan original puis le résultat après intervention ; les deux images forment le comparatif interactif. | Recommandée pour VFX |
| `breakdown-01.mp4` | 1080p, 15–45 s | Démonstration d’un plan, de ses passes ou des étapes avant / après. | Recommandée pour VFX |
| `breakdown-02.mp4` | 1080p, 15–45 s | Deuxième breakdown si une autre intervention mérite d’être montrée. | Optionnelle |
| `capture-01.webp` | Capture nette, haute résolution | Capture de Nuke, Blender ou autre outil montrant le travail technique ; vérifie qu’aucune donnée privée ne soit visible. | Optionnelle |
| `workflow-01.webp` | Capture haute résolution | Schéma de nœuds, passes ou étape de fabrication qui explique la méthode. | Optionnelle |
| `bts-01.webp` | Photo nette, haute résolution | Photo de plateau ou coulisses pour donner du contexte au projet. | Optionnelle |
| `project.mp4` | 1080p, extrait court | Extrait du film ou du projet ; ne le publie que si tu en as l’autorisation. | Si disponible et autorisé |

L’interface numérote les fichiers ajoutés et conserve leur extension réelle. Pour un Before / After, sélectionne le côté « Avant » puis le côté « Après » ; le comparatif ne s’affiche sur le site que lorsque les deux fichiers sont présents. Les choix de logiciels viennent des logos dans `assets/logos/` et du tableau `SOFTWARE_CATALOG` de `data/portfolio.json` ; ajoute une entrée à ce tableau si tu ajoutes un logo.

## Profil et CV

Les informations communes du profil sont dans `data/portfolio.json`, sous `SITE` : nom, e-mail, téléphone facultatif, LinkedIn, biographie FR / EN, introduction courte du CV, formation, compétences, logiciels et portrait. Pour les modifier, arrête d’abord le gestionnaire, édite `SITE` dans ce fichier JSON, puis redémarre `node project_manager.mjs`. Au démarrage, l’outil régénère `js/projects.js` depuis les données, sans avoir besoin d’enregistrer un projet. L’adresse professionnelle, le téléphone, LinkedIn, l’URL publique du portfolio et le portrait restent à compléter dans `SITE`.

Pour le portrait, ajoute le fichier `assets/images/general/portrait.jpg` et renseigne `SITE.portrait` avec son chemin. Les compétences et logiciels vides ne sont pas inventés ni affichés.

Le CV PDF est accessible par « CV » dans la navigation et par le bouton de la page À propos. La page du lecteur affiche un aperçu du PDF dans le navigateur et un bouton de téléchargement. Le gestionnaire génère un PDF français et un PDF anglais au démarrage, puis les met à jour à chaque sauvegarde de fiche. Les fichiers sont enregistrés dans `output/pdf/` ; attends les messages « CV PDF FR généré » et « CV PDF EN généré » dans la fenêtre du serveur avant de publier. Le PDF reprend les titres, dates, rôles, contributions, images, statuts et logos de logiciels présents dans les fiches. Pour un export manuel, l’aperçu de secours `index.html#/cv` s’imprime en A4 via « Enregistrer au format PDF ».

## Publier sur GitHub Pages

Après avoir vérifié le site sur `http://127.0.0.1:8765/`, arrête le gestionnaire. Vérifie que `data/portfolio.json`, `js/projects.js`, `output/pdf/` et les nouveaux médias sont inclus dans tes changements. Fais ton commit et pousse-les sur GitHub. Dans les paramètres du dépôt, active GitHub Pages sur la branche et le dossier contenant `index.html` (souvent la racine). Les visiteurs n’ont pas besoin de Node.js : le site publié reste entièrement statique.
