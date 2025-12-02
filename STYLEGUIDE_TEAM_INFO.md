# 👥 Info Équipe : Styleguide ajouté par Julien

## 🎯 Résumé

J'ai créé un **styleguide** pour notre projet The Walking Dog.
C'est une page qui montre tous les composants CSS/JS réutilisables (boutons, formulaires, slider, etc.).

**Pour y accéder :** http://localhost:3000/styleguide

---

## ⚠️ FICHIERS À RISQUE DE CONFLIT

Ces 3 fichiers sont **partagés par toute l'équipe**. Je les ai modifiés pour le styleguide.
**Attention** : Si vous les modifiez aussi, on risque d'avoir des conflits Git !

### 1️⃣ `config/routes.rb`

**Ce que j'ai ajouté :**
```ruby
# Ligne 10-14
get "styleguide", to: "styleguide#index"
```

**Pourquoi ?**
Pour créer la route `/styleguide` qui affiche le styleguide.

**⚠️ Ce que l'équipe doit savoir :**
- Si vous ajoutez une route, faites-le **AVANT** ou **APRÈS** cette section
- Ne supprimez pas cette ligne sinon le styleguide ne marchera plus
- Si conflit : gardez TOUTES les routes (les vôtres + la mienne)

---

### 2️⃣ `config/importmap.rb`

**Ce que j'ai ajouté :**
```ruby
# Lignes 10-21 : Styleguide modules
pin "styleguide/index", to: "styleguide/index.js"
pin "styleguide/components/slider", to: "styleguide/components/slider.js"
pin "styleguide/components/toggle", to: "styleguide/components/toggle.js"
pin "styleguide/components/demo", to: "styleguide/components/demo.js"
pin "styleguide/components/profile-form", to: "styleguide/components/profile-form.js"
```

**Pourquoi ?**
Pour charger les fichiers JavaScript du styleguide (slider, boutons toggle, etc.).

**⚠️ Ce que l'équipe doit savoir :**
- Si vous ajoutez un `pin`, faites-le **AVANT** la section "STYLEGUIDE MODULES"
- Ne supprimez pas ces lignes sinon le slider et les boutons toggle ne marcheront plus
- Si conflit : gardez TOUS les pins (les vôtres + les miens)

---

### 3️⃣ `app/assets/config/manifest.js`

**Ce que j'ai modifié :**
```javascript
// AVANT (ligne 2) :
//= link_directory ../stylesheets .css

// APRÈS (ligne 13) :
//= link_tree ../stylesheets .css
```

**Pourquoi ?**
- `link_directory` charge SEULEMENT les fichiers CSS à la racine de `stylesheets/`
- `link_tree` charge TOUS les fichiers CSS, même dans les sous-dossiers
- Nécessaire pour charger `app/assets/stylesheets/styleguide/**/*.css`

**⚠️ Ce que l'équipe doit savoir :**
- **NE PAS remettre `link_directory`** sinon tout le CSS du styleguide disparaîtra !
- Si vous avez un conflit sur ce fichier, gardez `link_tree`
- Ce changement affecte toute l'application mais ne casse rien (juste plus de fichiers chargés)

---

## ✅ FICHIERS SANS RISQUE

Ces dossiers/fichiers sont **gérés par moi seul**. Vous ne devriez pas les toucher.
Si vous les modifiez, on aura un conflit, mais c'est géré facilement.

### Fichiers créés par Julien :

```
app/
├── assets/stylesheets/styleguide/         # Tout le CSS du styleguide
│   ├── base.css                           # Variables et couleurs
│   ├── components/
│   │   ├── buttons.css                    # Styles des boutons
│   │   ├── forms.css                      # Styles des formulaires
│   │   ├── navigation.css                 # Styles de la navigation
│   │   └── typography.css                 # Typographie
│   ├── layout.css                         # Structure de page
│   ├── styleguide.css                     # Fichier principal
│   └── utils.css                          # Classes utilitaires (.w-full, etc.)
│
├── javascript/styleguide/                 # Tout le JavaScript du styleguide
│   ├── index.js                           # Point d'entrée
│   └── components/
│       ├── slider.js                      # Gère le slider de durée
│       ├── toggle.js                      # Gère les boutons toggle
│       ├── demo.js                        # Logs de démo
│       └── profile-form.js                # Formulaire de profil
│
├── views/
│   ├── layouts/
│   │   └── styleguide.html.erb           # Layout dédié au styleguide
│   └── styleguide/
│       ├── index.html.erb                # Page du styleguide
│       └── README.md                     # Documentation d'utilisation
│
└── controllers/
    └── styleguide_controller.rb          # Contrôleur du styleguide
```

---

## 🎨 Comment utiliser le styleguide dans vos pages

Vous pouvez réutiliser les composants du styleguide dans vos pages !

### Exemple : Bouton

```erb
<!-- Dans votre vue ERB -->
<button class="btn btn-primary">Commencer une balade</button>
```

### Exemple : Input

```erb
<input type="text" class="form-input" placeholder="Nom du chien">
```

### Exemple : Slider

```erb
<div class="slider-container">
  <input type="range" id="duration" class="form-slider" min="5" max="120">
  <div class="slider-value"><span id="duration-display">30</span> min</div>
</div>
```

**Plus d'exemples :** Voir `app/views/styleguide/README.md`

---

## 📊 Palette de couleurs

Utilisez ces variables CSS dans vos fichiers :

```css
--primary: #A3B5D9;        /* Bleu pervenche (boutons principaux) */
--secondary: #C9B5A0;      /* Beige rosé (boutons secondaires) */
--accent-navy: #1E3A5F;    /* Bleu marine (texte) */
--danger: #DC2626;         /* Rouge (boutons de suppression) */
--bg-page: #E8DDD3;        /* Beige clair (fond de page) */
```

---

## 🚨 En cas de conflit Git

Si vous avez un conflit sur un des 3 fichiers à risque :

### 1. `config/routes.rb`
```ruby
# Gardez TOUTES les routes :
<<<<<<< HEAD
get "votre_route", to: "votre_controller#action"
=======
get "styleguide", to: "styleguide#index"
>>>>>>> julien_front

# Résultat final :
get "votre_route", to: "votre_controller#action"
get "styleguide", to: "styleguide#index"
```

### 2. `config/importmap.rb`
```ruby
# Gardez TOUS les pins :
<<<<<<< HEAD
pin "votre_module", to: "votre_fichier.js"
=======
pin "styleguide/index", to: "styleguide/index.js"
>>>>>>> julien_front

# Résultat final :
pin "votre_module", to: "votre_fichier.js"
pin "styleguide/index", to: "styleguide/index.js"
```

### 3. `app/assets/config/manifest.js`
```javascript
// Gardez link_tree (PAS link_directory) :
<<<<<<< HEAD
//= link_directory ../stylesheets .css
=======
//= link_tree ../stylesheets .css
>>>>>>> julien_front

// Résultat final :
//= link_tree ../stylesheets .css
```

---

## 📞 Questions ?

Si vous avez des questions sur le styleguide, demandez à **Julien** !

---

✅ **Document créé le :** 2 décembre 2025
👤 **Créé par :** Julien
🎯 **But :** Éviter les conflits Git dans le projet de groupe
