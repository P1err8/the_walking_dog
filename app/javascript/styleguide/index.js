/**
 * ==============================================================================
 * SCRIPT PRINCIPAL - THE WALKING DOG STYLEGUIDE
 * ==============================================================================
 * Point d'entrée JavaScript pour le styleguide.
 * Importe et initialise les composants interactifs.
 *
 * Pour utiliser ce styleguide dans Rails :
 * Ajoutez <%= javascript_include_tag "styleguide/index", type: "module" %>
 * dans votre layout ou view.
 */

// Import des composants
import { initSlider } from 'styleguide/components/slider';
import { initToggleButtons } from 'styleguide/components/toggle';
import { initDemoButtons } from 'styleguide/components/demo';
import { initProfileForm } from 'styleguide/components/profile-form';

// Fonction d'initialisation
function initStyleguide() {
  console.log("🚀 Styleguide - Application démarrée");

  // 1. Initialisation du Slider (Durée de balade)
  // Nécessite: styleguide/components/forms.css
  initSlider();

  // 2. Initialisation des Boutons Toggle (Choix type de balade)
  // Nécessite: styleguide/components/forms.css
  initToggleButtons();

  // 3. Initialisation du Formulaire Profil
  // Nécessite: styleguide/components/forms.css
  initProfileForm();

  // 4. Initialisation des logs de démo (Optionnel pour la prod)
  initDemoButtons();
}

// Initialisation au chargement du DOM (compatible avec et sans Turbo)
document.addEventListener("DOMContentLoaded", initStyleguide);
document.addEventListener("turbo:load", initStyleguide);
