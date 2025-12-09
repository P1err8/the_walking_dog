import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["handle"]

  connect() {
    this.isDragging = false
    this.startY = 0
    this.startHeight = 0
    // === AVANT ===
    // this.minHeight = 150 // Hauteur minimale (juste le titre visible)
    // this.maxHeight = window.innerHeight * 0.85 // 85% de la hauteur de l'écran
    // this.defaultHeight = window.innerHeight * 0.65 // 65% par défaut
    // === APRÈS ===
    this.minHeight = 150 // Hauteur minimale (juste le titre visible)
    this.maxHeight = window.innerHeight * 0.60 // 60% de la hauteur de l'écran (avant: 85%)
    this.defaultHeight = window.innerHeight * 0.40 // 40% par défaut (avant: 65%)

    // Pour la détection de swipe rapide
    this.dragStartTime = 0
    this.dragStartHeight = 0

    // Définir la hauteur initiale
    this.element.style.height = `${this.defaultHeight}px`

    // === AVANT ===
    // // Assurer que le scroll fonctionne
    // this.element.style.overflowY = 'auto'
    // this.element.style.overflowX = 'hidden'
    // === APRÈS ===
    // Désactiver le scroll dans le panel
    this.element.style.overflow = 'hidden'

    // Créer la poignée de drag si elle n'existe pas
    if (!this.hasHandleTarget) {
      this.createHandle()
    }
  }

  createHandle() {
    const handle = document.createElement('div')
    handle.className = 'drag-handle'
    handle.innerHTML = '<div class="drag-indicator"></div>'
    handle.dataset.draggablePanelTarget = "handle"
    this.element.insertBefore(handle, this.element.firstChild)
  }

  startDrag(event) {
    // Ne démarrer le drag que si on clique sur la poignée
    const isHandle = event.target.closest('.drag-handle')
    if (!isHandle) return

    this.isDragging = true
    this.startY = event.type.includes('touch') ? event.touches[0].clientY : event.clientY
    this.startHeight = this.element.offsetHeight

    // === APRÈS === Enregistrer le temps et la hauteur pour détecter le swipe rapide
    this.dragStartTime = Date.now()
    this.dragStartHeight = this.element.offsetHeight

    document.body.style.userSelect = 'none'
    this.element.style.transition = 'none'
  }

  drag(event) {
    if (!this.isDragging) return

    event.preventDefault()

    const currentY = event.type.includes('touch') ? event.touches[0].clientY : event.clientY
    const deltaY = this.startY - currentY // Inversé : drag vers le haut = augmente la hauteur
    const newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.startHeight + deltaY))

    this.element.style.height = `${newHeight}px`
  }

  endDrag() {
    if (!this.isDragging) return

    this.isDragging = false
    document.body.style.userSelect = ''
    this.element.style.transition = 'height 0.3s ease'

    // === APRÈS === Détecter le swipe rapide vers le bas pour fermer
    const dragDuration = Date.now() - this.dragStartTime
    const currentHeight = this.element.offsetHeight
    const dragDistance = this.dragStartHeight - currentHeight // positif = swipe vers le bas

    // Si swipe rapide vers le bas (moins de 300ms et distance > 100px), fermer le modal
    if (dragDuration < 300 && dragDistance > 100) {
      this.dismiss()
      return
    }
    // === FIN APRÈS ===

    // Snap à des positions prédéfinies
    // === AVANT ===
    // const snapPositions = [
    //   this.minHeight,
    //   this.defaultHeight,
    //   this.maxHeight
    // ]
    // === APRÈS === (seulement 2 positions maintenant)
    const snapPositions = [
      this.minHeight,
      this.defaultHeight
    ]

    // Trouver la position la plus proche
    const closestPosition = snapPositions.reduce((prev, curr) => {
      return Math.abs(curr - currentHeight) < Math.abs(prev - currentHeight) ? curr : prev
    })

    this.element.style.height = `${closestPosition}px`
  }

  // Actions pour contrôler le panel programmatiquement
  minimize() {
    this.element.style.transition = 'height 0.3s ease'
    this.element.style.height = `${this.minHeight}px`
  }

  maximize() {
    this.element.style.transition = 'height 0.3s ease'
    this.element.style.height = `${this.maxHeight}px`
  }

  reset() {
    this.element.style.transition = 'height 0.3s ease'
    this.element.style.height = `${this.defaultHeight}px`
  }

  // === APRÈS === Nouvelle méthode pour fermer le modal avec animation
  dismiss() {
    this.element.style.transition = 'transform 0.3s ease, opacity 0.3s ease'
    this.element.style.transform = 'translateY(100%)'
    this.element.style.opacity = '0'

    // Après l'animation, fermer le Turbo Frame modal
    setTimeout(() => {
      // === AVANT ===
      // window.history.back() // Ceci ramenait à la page précédente (profil)
      // === APRÈS ===
      // Trouver et vider le Turbo Frame modal pour revenir à la homepage
      const modalFrame = document.querySelector('turbo-frame#modal')
      if (modalFrame) {
        modalFrame.innerHTML = ''
        // Aussi nettoyer l'URL si nécessaire
        window.history.pushState({}, '', '/')
      }
    }, 300)
  }
}
