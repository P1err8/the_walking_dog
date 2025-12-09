import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { walkingId: Number, walkingPath: String }

  connect() {
    // Si on est sur une page de walking, sauvegarder l'ID
    if (this.hasWalkingIdValue && this.walkingIdValue) {
      this.setActiveWalking(this.walkingIdValue, this.walkingPathValue)
    }
  }

  // Sauvegarder la balade active
  setActiveWalking(id, path) {
    localStorage.setItem('activeWalkingId', id)
    localStorage.setItem('activeWalkingPath', path)
  }

  // Récupérer la balade active
  static getActiveWalking() {
    const id = localStorage.getItem('activeWalkingId')
    const path = localStorage.getItem('activeWalkingPath')
    return id ? { id, path } : null
  }

  // Effacer la balade active
  clearActiveWalking(event) {
    localStorage.removeItem('activeWalkingId')
    localStorage.removeItem('activeWalkingPath')
    // Le lien continue normalement vers root_path
  }

  // Vérifier avant de créer une nouvelle balade
  checkBeforeNew(event) {
    const activeWalking = localStorage.getItem('activeWalkingPath')
    if (activeWalking) {
      event.preventDefault()
      if (confirm("Vous avez une balade en cours. Voulez-vous y retourner ?")) {
        window.location.href = activeWalking
      }
    }
  }

  // Rediriger vers la balade active si elle existe (pour le lien Carte)
  goToActiveWalking(event) {
    const activeWalking = localStorage.getItem('activeWalkingPath')
    if (activeWalking) {
      event.preventDefault()
      window.location.href = activeWalking
    }
    // Sinon, le lien continue normalement vers root_path
  }
}
