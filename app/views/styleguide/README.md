# 🎨 Styleguide - The Walking Dog

Charte graphique complète de l'application The Walking Dog.

## 📍 Accès

Une fois le serveur Rails lancé, accédez au styleguide via :

```
http://localhost:3000/styleguide
```

## 📂 Structure des fichiers

```
the_walking_dog/
├── app/
│   ├── assets/stylesheets/styleguide/     # CSS du styleguide
│   │   ├── styleguide.css                 # Fichier principal d'import
│   │   ├── base.css                       # Variables & Reset
│   │   ├── layout.css                     # Structure de page
│   │   ├── components/
│   │   │   ├── buttons.css               # Boutons (primary, secondary, etc.)
│   │   │   ├── forms.css                 # Formulaires & Inputs
│   │   │   ├── navigation.css            # Navigation bars
│   │   │   └── typography.css            # Typographie
│   │   └── utils.css                      # Classes utilitaires
│   │
│   ├── javascript/styleguide/             # JavaScript du styleguide
│   │   ├── index.js                       # Point d'entrée
│   │   └── components/
│   │       ├── slider.js                  # Slider interactif
│   │       ├── toggle.js                  # Boutons toggle
│   │       ├── profile-form.js            # Formulaire profil
│   │       └── demo.js                    # Logs de démo
│   │
│   ├── views/
│   │   ├── layouts/
│   │   │   └── styleguide.html.erb        # Layout dédié
│   │   └── styleguide/
│   │       └── index.html.erb             # Page principale
│   │
│   └── controllers/
│       └── styleguide_controller.rb        # Controller
│
└── config/
    └── routes.rb                           # Route: GET /styleguide
```

## 🎯 Comment utiliser les composants dans votre application

Ce guide explique comment copier les composants du styleguide dans vos vraies pages Rails.

---

### 📦 COMPOSANT 1 : Boutons

#### 1️⃣ Copier le CSS (déjà fait !)
Les boutons sont dans : `app/assets/stylesheets/styleguide/components/buttons.css`

#### 2️⃣ Utiliser dans votre HTML/ERB

```erb
<!-- Bouton principal (bleu) -->
<button class="btn btn-primary">Commencer une balade</button>

<!-- Bouton secondaire (beige) -->
<button class="btn btn-secondary">Voir l'historique</button>

<!-- Bouton danger (rouge) -->
<button class="btn btn-danger">Supprimer</button>

<!-- Bouton transparent -->
<button class="btn btn-outline">Annuler</button>

<!-- Tailles différentes -->
<button class="btn btn-primary btn-sm">Petit</button>
<button class="btn btn-primary">Normal</button>
<button class="btn btn-primary btn-lg">Grand</button>

<!-- Bouton pleine largeur -->
<button class="btn btn-primary w-full">Pleine largeur</button>
```

---

### 📦 COMPOSANT 2 : Slider (curseur de durée)

#### 1️⃣ Copier le HTML

```erb
<div class="form-group">
  <label for="walk-duration">Durée de la balade</label>

  <div class="slider-container">
    <input
      type="range"
      id="walk-duration"
      class="form-slider"
      min="5"
      max="120"
      value="30"
      step="5"
    >

    <div class="slider-value">
      <span id="duration-display">30</span> minutes
    </div>
  </div>
</div>
```

#### 2️⃣ Ajouter le JavaScript

Dans votre fichier JavaScript (ex: `app/javascript/controllers/walk_controller.js`) :

```javascript
import { initSlider } from 'styleguide/components/slider';

// Initialiser le slider
initSlider('walk-duration', 'duration-display');
```

**Important** : Les IDs `walk-duration` et `duration-display` doivent correspondre !

---

### 📦 COMPOSANT 3 : Boutons Toggle (Privé/Public)

#### 1️⃣ Copier le HTML

```erb
<div class="form-group">
  <label>Type de balade</label>

  <div class="button-group">
    <button type="button" class="btn btn-toggle">
      Balade privée
    </button>

    <button type="button" class="btn btn-toggle active">
      Balade publique
    </button>
  </div>
</div>
```

#### 2️⃣ Ajouter le JavaScript

```javascript
import { initToggleButtons } from 'styleguide/components/toggle';

// Initialiser les boutons toggle
initToggleButtons();
```

Cela permet de cliquer sur un bouton et il devient actif (bleu) automatiquement.

---

### 📦 COMPOSANT 4 : Input texte

#### Copier le HTML

```erb
<div class="form-group">
  <label for="dog-name">Nom du chien</label>
  <input
    type="text"
    id="dog-name"
    class="form-input"
    placeholder="Rex, Max, Luna..."
  >
</div>
```

**Classes disponibles** :
- `.form-input` : Input de base
- `.form-group` : Pour espacer les champs

---

### 📦 COMPOSANT 5 : Formulaire complet

#### Copier le HTML

```erb
<form class="walk-form">
  <div class="form-group">
    <label for="location">Lieu de rendez-vous</label>
    <input type="text" class="form-input" id="location" placeholder="Parc, rue...">
  </div>

  <div class="form-group">
    <label for="walk-duration">Durée</label>
    <div class="slider-container">
      <input type="range" id="walk-duration" class="form-slider" min="5" max="120" value="30">
      <div class="slider-value"><span id="duration-display">30</span> min</div>
    </div>
  </div>

  <button type="submit" class="btn btn-primary w-full">
    Créer la balade
  </button>
</form>
```

**Et n'oubliez pas le JavaScript** :

```javascript
import { initSlider } from 'styleguide/components/slider';

document.addEventListener("DOMContentLoaded", () => {
  initSlider('walk-duration', 'duration-display');
});
```

---

### 🎨 Classes utilitaires disponibles

```erb
<!-- Largeur complète -->
<button class="btn btn-primary w-full">Bouton large</button>

<!-- Centrer le texte -->
<div class="text-center">Texte centré</div>

<!-- Marges -->
<div class="mt-2">Marge en haut</div>
<div class="mb-2">Marge en bas</div>
```

---

### ⚠️ Checklist avant d'utiliser un composant

✅ **CSS** : Les fichiers CSS du styleguide sont dans `app/assets/stylesheets/styleguide/`
✅ **JavaScript** : Les fichiers JS sont dans `app/javascript/styleguide/`
✅ **IDs** : Si vous utilisez JavaScript, vérifiez que les IDs correspondent !
✅ **Import** : N'oubliez pas d'importer le JavaScript dans votre contrôleur Stimulus ou fichier JS

## 🎨 Palette de couleurs

```css
--primary: #A3B5D9;        /* Bleu pervenche */
--secondary: #C9B5A0;      /* Beige rosé */
--accent-navy: #1E3A5F;    /* Bleu marine */
--danger: #DC2626;         /* Rouge */
--bg-page: #E8DDD3;        /* Beige clair */
```

## 📝 Notes importantes

- **Police** : Bitter (Google Fonts) - Graisses: 400, 600, 700
- **Border radius** : `--radius: 20px`, `--radius-pill: 999px`
- **Tous les fichiers sont commentés** : Chaque composant explique son fonctionnement
- **Responsive** : Les composants sont adaptés aux petits écrans

## 🔧 Maintenance

Pour modifier le styleguide :
1. Éditez les fichiers dans `app/assets/stylesheets/styleguide/`
2. Rechargez la page `/styleguide` pour voir les changements
3. Les modifications sont automatiquement appliquées à l'application

---

✅ **Styleguide créé et intégré avec succès !**
