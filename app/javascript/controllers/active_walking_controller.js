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
      this.showActiveWalkingModal(activeWalking)
    }
  }

  // Afficher le modal de balade en cours
  showActiveWalkingModal(walkingPath) {
    // Supprimer l'ancien modal s'il existe (pour mettre à jour les URLs)
    const existingModal = document.getElementById('active-walking-modal')
    if (existingModal) {
      existingModal.remove()
    }

    // Créer le modal
    const modal = document.createElement('div')
    modal.id = 'active-walking-modal'
    modal.className = 'active-walking-modal'
    modal.innerHTML = `
      <div class="active-walking-modal__backdrop"></div>
      <div class="active-walking-modal__content">
        <div class="active-walking-modal__icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3 class="active-walking-modal__title">Balade en cours</h3>
        <p class="active-walking-modal__text">Vous avez déjà une balade en cours. Que souhaitez-vous faire ?</p>
        <div class="active-walking-modal__buttons">
          <button type="button" class="active-walking-modal__btn active-walking-modal__btn--danger" data-action="finish">Terminer</button>
          <button type="button" class="active-walking-modal__btn active-walking-modal__btn--primary" data-action="resume">Reprendre</button>
        </div>
      </div>
    `
    document.body.appendChild(modal)

    // Event listeners
    modal.querySelector('[data-action="finish"]').addEventListener('click', () => {
      // Terminer la balade en cours et retourner à l'accueil
      localStorage.removeItem('activeWalkingId')
      localStorage.removeItem('activeWalkingPath')
      window.location.href = '/'
    })
    modal.querySelector('[data-action="resume"]').addEventListener('click', () => {
      // Si on est déjà sur la page de la balade, juste fermer le modal
      if (window.location.pathname === walkingPath) {
        this.hideModal()
      } else {
        window.location.href = walkingPath
      }
    })
    modal.querySelector('.active-walking-modal__backdrop').addEventListener('click', () => this.hideModal())

    // Afficher le modal
    modal.classList.add('active-walking-modal--visible')
  }

  hideModal() {
    const modal = document.getElementById('active-walking-modal')
    if (modal) {
      modal.classList.remove('active-walking-modal--visible')
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
