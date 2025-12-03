/**
 * ==============================================================================
 * COMPOSANT : DÉMO BOUTONS
 * ==============================================================================
 * Uniquement pour la démonstration du Styleguide.
 * Affiche un log dans la console lors du clic sur les boutons standards.
 *
 * 🛠️ DÉPENDANCES :
 * - CSS : css/components/buttons.css
 */
export function initDemoButtons() {
  const buttons = document.querySelectorAll(".btn");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      // On ignore les boutons toggle qui ont leur propre logique
      if (!button.classList.contains('btn-toggle') && !button.closest('.button-group')) {
        console.log(`[Démo] Click sur le bouton : "${button.textContent.trim()}"`);
      }
    });
  });
}
