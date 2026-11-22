/* ============================================================
   DONNÉES DU SITE ET DES PROJETS
   ------------------------------------------------------------
   C'est LE fichier à modifier pour ajouter un projet, changer
   une description ou activer un lien de contact.
   La documentation complète se trouve dans README.md.

   RÈGLES SIMPLES
   - L'ordre des projets dans ce fichier = l'ordre d'affichage.
   - featured: true  -> « Projets à la une » (grandes cartes)
   - featured: false -> « Autres projets » (petites cartes)
   - visible: false  -> le projet est masqué du site
   - Les champs vides ou null ne sont pas affichés.
   - Les chemins d'images sont relatifs : "assets/images/..."
   ============================================================ */

/* ------------------------------------------------------------
   1. PARAMÈTRES GÉNÉRAUX
   ------------------------------------------------------------ */
window.SITE = {
  name: "Max Lelièvre",
  location: "Nantes, France",

  /* Coordonnées : laissez "" tant que l'information n'est pas prête.
     Exemple : email: "prenom.nom@email.com" */
  email: "",
  linkedin: "",
  vimeo: "",
  youtube: "",

  /* CV : déposez le PDF dans assets/ et indiquez son chemin ici.
     Exemple : cv: "assets/general/cv-max-lelievre.pdf" */
  cv: "",

  /* Visuel d'accueil : facultatif. Laissez "" pour utiliser
     l'emplacement visuel dessiné par le site.
     Exemple : heroImage: "assets/images/general/hero.jpg" */
  heroImage: "",
  heroImageAlt: { fr: "", en: "" },

  /* Showreel : remplissez "embed" (YouTube / Vimeo) OU "file" (MP4).
     Laissez les deux vides pour afficher l'emplacement vidéo. */
  showreel: {
    embed: "",
    file: "",
    poster: "",
    year: "",
    breakdown: []
    /* Un élément de breakdown :
       { title: { fr: "...", en: "..." },
         text:  { fr: "...", en: "..." },
         image: "assets/images/projects/showreel/plan-01.jpg" } */
  }
};

/* ------------------------------------------------------------
   2. PROJETS
   ------------------------------------------------------------ */
window.PROJECTS = [

  /* ==========================================================
     PROJET 01 — ALMD — THE LAST OF US
     ========================================================== */
  {
    id: "almd",
    code: "01",
    title: "ALMD — The Last of Us",
    year: null,

    categories: ["postproduction", "title-design"],
    type: null,
    status: "completed",

    featured: true,
    visible: true,

    role: {
      fr: "Directeur de postproduction",
      en: "Director of Postproduction"
    },
    roleDescription: {
      fr: "Direction de la postproduction et conception des cartons-titres.",
      en: "Postproduction direction and title card design."
    },

    shortDescription: {
      fr: "Projet audiovisuel dans lequel j'ai occupé le poste de directeur de postproduction. J'ai notamment réalisé les cartons-titres du projet.",
      en: "Audiovisual project in which I worked as postproduction director. My contribution included the creation and design of the film's title cards."
    },

    description: {
      fr: "Projet audiovisuel dans lequel j'ai occupé le poste de directeur de postproduction. J'ai notamment réalisé les cartons-titres du projet.",
      en: "Audiovisual project in which I worked as postproduction director. My contribution included the creation and design of the film's title cards."
    },

    contributions: [
      {
        fr: "Direction de la postproduction",
        en: "Postproduction direction"
      },
      {
        fr: "Création et conception des cartons-titres",
        en: "Creation and design of the title cards"
      }
    ],

    note: {
      fr: "Les images des cartons-titres, le générique animé et les crédits de production seront ajoutés prochainement.",
      en: "Title card stills, the animated title sequence and production credits will be added soon."
    },

    credits: [],
    software: [],

    thumbnail: "",
    thumbnailAlt: { fr: "", en: "" },
    hero: "",
    heroAlt: { fr: "", en: "" },

    gallery: [],
    videos: [],
    breakdown: [],
    comparisons: [],
    technicalNotes: null
  },

  /* ==========================================================
     PROJET 02 — OLT — ESMA
     ========================================================== */
  {
    id: "olt",
    code: "02",
    title: "OLT — ESMA",
    year: null,

    categories: ["vfx", "cleaning", "postproduction"],
    type: null,
    status: "in-development",

    featured: true,
    visible: true,

    role: {
      fr: "Directeur de postproduction / VFX",
      en: "Director of Postproduction / VFX"
    },
    roleDescription: {
      fr: "Direction de la postproduction et interventions VFX, notamment du cleaning.",
      en: "Postproduction direction and VFX work, including cleaning."
    },

    shortDescription: {
      fr: "Projet en développement avec l'ESMA, sur lequel j'interviens en direction de la postproduction et sur des travaux de VFX, notamment de cleaning.",
      en: "Project in development with ESMA, where I work in postproduction direction and VFX, including cleaning work."
    },

    description: {
      fr: "Projet en développement avec l'ESMA, sur lequel j'interviens en direction de la postproduction et sur des travaux de VFX, notamment de cleaning.",
      en: "Project in development with ESMA, where I work in postproduction direction and VFX, including cleaning work."
    },

    contributions: [
      {
        fr: "Direction de la postproduction",
        en: "Postproduction direction"
      },
      {
        fr: "Interventions VFX",
        en: "VFX work"
      },
      {
        fr: "Cleaning",
        en: "Cleaning"
      }
    ],

    note: {
      fr: "Le détail des plans et des interventions VFX sera précisé au fur et à mesure de l'avancement du projet.",
      en: "The shot breakdown and VFX work will be detailed as the project progresses."
    },

    credits: [],
    software: [],

    thumbnail: "",
    thumbnailAlt: { fr: "", en: "" },
    hero: "",
    heroAlt: { fr: "", en: "" },

    gallery: [],
    videos: [],
    breakdown: [],
    comparisons: [],
    technicalNotes: null
  },

  /* ==========================================================
     PROJET 03 — EURYDICE
     ========================================================== */
  {
    id: "eurydice",
    code: "03",
    title: "EURYDICE",
    year: null,

    categories: ["vfx"],
    type: null,
    status: "preproduction",

    featured: true,
    visible: true,

    role: {
      fr: "VFX Artist",
      en: "VFX Artist"
    },
    roleDescription: { fr: "", en: "" },

    shortDescription: {
      fr: "Projet en préproduction, sur lequel j'interviens comme VFX artist.",
      en: "Project in preproduction, where I work as a VFX artist."
    },

    description: {
      fr: "Projet en préproduction, sur lequel j'interviens comme VFX artist. Les détails de la contribution et les éléments visuels seront ajoutés lorsque le projet avancera.",
      en: "Project in preproduction, where I work as a VFX artist. Details of the contribution and visual material will be added as the project progresses."
    },

    contributions: [],

    note: {
      fr: "Projet en développement : les recherches, tests techniques et breakdowns seront publiés lorsque les images seront validées.",
      en: "Project in development: research, technical tests and breakdowns will be published once the visuals are approved."
    },

    credits: [],
    software: [],

    thumbnail: "",
    thumbnailAlt: { fr: "", en: "" },
    hero: "",
    heroAlt: { fr: "", en: "" },

    gallery: [],
    videos: [],
    breakdown: [],
    comparisons: [],
    technicalNotes: null
  },

  /* ==========================================================
     PROJET 04 — FFDE
     ----------------------------------------------------------
     Projet volontairement masqué : aucune information vérifiée
     n'est encore disponible. Passez visible à true et complétez
     les champs lorsque les détails seront prêts.
     ========================================================== */
  {
    id: "ffde",
    code: "04",
    title: "FFDE",
    year: null,
    categories: [],
    type: null,
    status: "draft",
    featured: false,
    visible: false,

    role: { fr: "", en: "" },
    shortDescription: { fr: "", en: "" },
    description: { fr: "", en: "" },
    contributions: [],
    credits: [],
    software: [],

    thumbnail: "",
    hero: "",
    gallery: [],
    videos: [],
    breakdown: [],
    comparisons: [],
    technicalNotes: null
  }

  /* ==========================================================
     POUR AJOUTER UN PROJET
     ----------------------------------------------------------
     Copiez le modèle ci-dessous, collez-le avant le crochet
     fermant, puis remplacez les valeurs. Les champs facultatifs
     peuvent être supprimés ou laissés vides.

     {
       id: "mon-projet",              // unique, sans espaces ni accents
       code: "05",                    // numéro affiché
       title: "MON PROJET",
       year: "2026",                  // ou null
       categories: ["vfx", "compositing"],
       type: "personal",              // student | collaboration | short-film | personal | experiment | professional
       status: "in-development",      // completed | in-development | preproduction | draft
       featured: false,               // true = grandes cartes, false = autres projets
       visible: true,

       role: { fr: "VFX Artist", en: "VFX Artist" },
       roleDescription: { fr: "...", en: "..." },
       shortDescription: { fr: "...", en: "..." },
       description: { fr: "...", en: "..." },
       contributions: [
         { fr: "...", en: "..." }
       ],

       note: { fr: "...", en: "..." },          // facultatif
       credits: [
         { role: { fr: "Réalisation", en: "Directing" }, name: "Nom" }
       ],
       software: ["Nuke"],

       thumbnail: "assets/images/projects/mon-projet/thumb.jpg",
       thumbnailAlt: { fr: "...", en: "..." },
       hero: "assets/images/projects/mon-projet/hero.jpg",
       heroAlt: { fr: "...", en: "..." },

       gallery: [
         { src: "assets/images/projects/mon-projet/01.jpg",
           alt: { fr: "...", en: "..." },
           caption: { fr: "...", en: "..." } }
       ],

       videos: [
         { type: "embed", src: "https://www.youtube-nocookie.com/embed/ID", title: { fr: "...", en: "..." } },
         { type: "file", src: "assets/videos/mon-projet.mp4", poster: "assets/images/projects/mon-projet/poster.jpg" }
       ],

       breakdown: [
         { title: { fr: "Plan 01", en: "Shot 01" },
           text: { fr: "...", en: "..." },
           image: "assets/images/projects/mon-projet/breakdown-01.jpg",
           before: "assets/images/projects/mon-projet/before.jpg",
           after: "assets/images/projects/mon-projet/after.jpg" }
       ],

       comparisons: [
         { before: "assets/images/projects/mon-projet/before.jpg",
           after: "assets/images/projects/mon-projet/after.jpg",
           label: { fr: "Intégration", en: "Integration" } }
       ],

       technicalNotes: { fr: "...", en: "..." }
     }
     ========================================================== */
];
