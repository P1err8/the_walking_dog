/**
 * ==============================================================================
 * COMPOSANT : SLIDER (DURÉE)
 * ==============================================================================
 * Gère la mise à jour dynamique de la valeur affichée à côté d'un input range.
 *
 * 🛠️ DÉPENDANCES :
 * - CSS : css/components/forms.css (Classes .form-slider, .slider-container)
 * - HTML :
 *    <div class="slider-container">
 *      <input type="range" id="walk-duration" ...>
 *      <div class="slider-value"><span id="duration-display">30</span> min</div>
 *    </div>
 *
 * @param {string} sliderId - L'ID de l'input range (défaut: 'walk-duration')
 * @param {string} displayId - L'ID du span où afficher la valeur (défaut: 'duration-display')
 */
export function initSlider(sliderId = 'walk-duration', displayId = 'duration-display') {
  const slider = document.getElementById(sliderId);
  const display = document.getElementById(displayId);

  if (slider && display) {
    // Mise à jour à l'événement 'input' (pendant le glissement)
    slider.addEventListener('input', function() {
      display.textContent = this.value;
    });

    // Initialisation au chargement de la page
    display.textContent = slider.value;
    console.log(`[Composant: Slider] Initialisé sur #${sliderId}`);
  } else {
    // Ce log n'est pas une erreur, juste une info si le composant n'est pas présent sur la page
    // console.log(`[Composant: Slider] Éléments #${sliderId} ou #${displayId} introuvables.`);
  }
}
