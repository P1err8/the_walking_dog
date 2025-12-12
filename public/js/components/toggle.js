/**
 * ==============================================================================
 * COMPOSANT : TOGGLE BUTTONS (SÉLECTEUR)
 * ==============================================================================
 * Gère l'état 'active' pour un groupe de boutons mutuellement exclusifs.
 *
 * 🛠️ DÉPENDANCES :
 * - CSS : css/components/forms.css (Classes .button-group, .btn-toggle)
 * - HTML :
 *    <div class="button-group">
 *      <button class="btn btn-toggle">Option 1</button>
 *      <button class="btn btn-toggle active">Option 2</button>
 *    </div>
 *
 * @param {string} selector - Sélecteur CSS des boutons (défaut: '.btn-toggle')
 */
export function initToggleButtons(selector = '.btn-toggle') {
  const toggleButtons = document.querySelectorAll(selector);

  if (toggleButtons.length === 0) return;

  toggleButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      // Empêcher le submit si le bouton est dans un formulaire
      if (this.type !== 'submit') {
        e.preventDefault();
      }

      // 1. Trouver le groupe parent
      const buttonGroup = this.closest('.button-group');

      if (buttonGroup) {
        // 2. Désactiver tous les boutons du même groupe
        buttonGroup.querySelectorAll(selector).forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        });

        // 3. Activer le bouton cliqué
        this.classList.add('active');
        this.setAttribute('aria-pressed', 'true');

        console.log(`[Composant: Toggle] Option sélectionnée : "${this.textContent.trim()}"`);
      }
    });
  });

  console.log(`[Composant: Toggle] ${toggleButtons.length} boutons initialisés.`);
}
