/**
 * ==============================================================================
 * COMPOSANT : FORMULAIRE PROFIL
 * ==============================================================================
 * Gère les interactions spécifiques au formulaire de création de profil :
 * - Prévisualisation de l'image de profil
 * - Autocomplétion de la race (simulée)
 * - Sélection des tags (checkboxes stylisées)
 *
 * 🛠️ DÉPENDANCES :
 * - CSS : css/components/forms.css
 */

export function initProfileForm() {
  initImagePreview();
  initBreedAutocomplete();
  initTagsSelection();
}

/**
 * Gestion de la prévisualisation de l'image de profil
 *
 * FONCTIONNEMENT :
 * 1. L'utilisateur sélectionne une image via <input type="file">
 * 2. On utilise FileReader pour lire le fichier en Data URL (base64)
 * 3. On affiche l'aperçu dans une balise <img>
 * 4. On cache le placeholder (icône caméra + texte)
 */
function initImagePreview() {
  const input = document.getElementById('profile-upload');
  const preview = document.getElementById('profile-preview');
  const placeholder = document.querySelector('.profile-upload-placeholder');

  if (input && preview) {
    input.addEventListener('change', function(e) {
      const file = e.target.files[0];  // Récupère le fichier sélectionné

      if (file) {
        // FileReader : API navigateur pour lire les fichiers locaux
        const reader = new FileReader();

        // Callback quand la lecture est terminée
        reader.onload = function(e) {
          preview.src = e.target.result;  // Data URL (image en base64)
          preview.style.display = 'block'; // Affiche l'aperçu
          if (placeholder) placeholder.style.display = 'none'; // Cache le placeholder
        }

        // Lance la lecture du fichier en Data URL
        reader.readAsDataURL(file);
      }
    });
  }
}

/**
 * Gestion de l'autocomplétion pour la race de chien
 * (Simulation d'appel API)
 *
 * FONCTIONNEMENT :
 * 1. L'utilisateur tape dans l'input
 * 2. On filtre la liste des races en temps réel
 * 3. On affiche les suggestions dans un dropdown
 * 4. On cache le dropdown si on clique ailleurs
 *
 * NOTE : Dans une vraie app, remplacer ce tableau par un appel API
 * Exemple : fetch('/api/breeds?query=' + value)
 */
function initBreedAutocomplete() {
  const input = document.getElementById('dog-breed');
  const resultsContainer = document.getElementById('breed-results');

  // Liste simulée de races (à remplacer par une API plus tard)
  const breeds = [
    "Labrador Retriever", "Golden Retriever", "Berger Allemand",
    "Bulldog Français", "Beagle", "Caniche", "Rottweiler",
    "Yorkshire Terrier", "Boxer", "Dachshund", "Siberian Husky",
    "Great Dane", "Doberman Pinscher", "Australian Shepherd",
    "Cavalier King Charles", "Shih Tzu", "Boston Terrier",
    "Pomeranian", "Havanese", "Shetland Sheepdog", "Bernese Mountain Dog",
    "Brittany", "English Springer Spaniel", "Mastiff", "Vizsla",
    "Pug", "Chihuahua", "Maltese", "Weimaraner", "Newfoundland"
  ];

  if (input && resultsContainer) {
    // Événement 'input' : Se déclenche à chaque frappe
    input.addEventListener('input', function() {
      const value = this.value.toLowerCase();
      resultsContainer.innerHTML = ''; // Vide les résultats précédents

      // N'affiche rien si moins de 2 caractères (évite trop de résultats)
      if (value.length < 2) {
        resultsContainer.style.display = 'none';
        return;
      }

      // Filtre les races
      // POURQUOI startsWith ET PAS includes ?
      // - startsWith("lab") → "Labrador" ✅ mais pas "Australian Labradoodle" ❌
      // - C'est le comportement standard des autocompletions (Google, etc.)
      // - Plus pertinent : les résultats commencent par ce que l'utilisateur tape
      const filteredBreeds = breeds.filter(breed =>
        breed.toLowerCase().startsWith(value)
      );

      // Si on a des résultats, on les affiche
      if (filteredBreeds.length > 0) {
        filteredBreeds.forEach(breed => {
          const div = document.createElement('div');
          div.className = 'autocomplete-item';
          div.textContent = breed;

          // Au clic sur une suggestion : remplir l'input et fermer le dropdown
          div.addEventListener('click', function() {
            input.value = breed;
            resultsContainer.style.display = 'none';
          });

          resultsContainer.appendChild(div);
        });
        resultsContainer.style.display = 'block';
      } else {
        resultsContainer.style.display = 'none';
      }
    });

    // Fermeture du dropdown si on clique ailleurs sur la page
    // POURQUOI SUR document ET PAS JUSTE SUR input ?
    // - On veut détecter les clics PARTOUT sur la page
    // - Si l'utilisateur clique sur un bouton, un autre input, etc.
    //   → Le dropdown doit se fermer automatiquement
    document.addEventListener('click', function(e) {
      // On ne ferme PAS si on clique sur l'input lui-même ou le dropdown
      if (e.target !== input && e.target !== resultsContainer) {
        resultsContainer.style.display = 'none';
      }
    });
  }
}

/**
 * Gestion de la sélection des tags (comportement toggle)
 *
 * FONCTIONNEMENT :
 * Les checkboxes sont cachées visuellement (opacity: 0)
 * mais restent fonctionnelles.
 *
 * Quand l'utilisateur clique sur un <label>, la checkbox associée
 * change d'état (checked/unchecked). On écoute cet événement 'change'
 * pour ajouter/retirer la classe 'active' sur le label.
 *
 * POURQUOI AJOUTER LA CLASSE JS + CSS ?
 * - Le CSS utilise déjà :checked + .tag-label pour styler
 * - MAIS certains navigateurs ont des bugs avec :checked
 * - Donc on ajoute AUSSI la classe .active en JS pour garantir
 *   que le style fonctionne partout (double sécurité)
 */
function initTagsSelection() {
  const tags = document.querySelectorAll('.tag-checkbox');

  tags.forEach(tag => {
    // Événement 'change' : Se déclenche quand la checkbox change d'état
    tag.addEventListener('change', function() {
      // nextElementSibling = l'élément HTML juste après (le <label>)
      const label = this.nextElementSibling;

      // Toggle de la classe 'active' selon l'état de la checkbox
      if (this.checked) {
        label.classList.add('active');      // Checkbox cochée → Label bleu
      } else {
        label.classList.remove('active');   // Checkbox décochée → Label gris
      }
    });
  });
}
