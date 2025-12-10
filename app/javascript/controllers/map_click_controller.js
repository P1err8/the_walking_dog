import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  hidePanel(event) {
    // Ignorer si le clic est sur le panel lui-même ou ses enfants
    const panel = document.querySelector('.walking-form-card')
    if (panel && panel.contains(event.target)) return

    // Ignorer si le clic est sur un élément interactif de la map (marker, popup, etc.)
    if (event.target.closest('.mapboxgl-marker') ||
        event.target.closest('.mapboxgl-popup') ||
        event.target.closest('.mapboxgl-ctrl')) return

    // Trouver le controller draggable-panel et appeler hidePanel
    const draggablePanelElement = document.querySelector('[data-controller*="draggable-panel"]')
    if (draggablePanelElement) {
      const draggablePanelController = this.application.getControllerForElementAndIdentifier(
        draggablePanelElement,
        'draggable-panel'
      )
      if (draggablePanelController) {
        draggablePanelController.hidePanel()
      }
    }
  }
}
