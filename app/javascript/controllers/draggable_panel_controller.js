import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["handle"]

  connect() {
    this.isDragging = false
    this.startY = 0
    this.startHeight = 0
    this.minHeight = 150 // Hauteur minimale (juste le titre visible)
    this.maxHeight = window.innerHeight * 0.85 // 85% de la hauteur de l'écran
    this.defaultHeight = window.innerHeight * 0.65 // 65% par défaut

    // Définir la hauteur initiale
    this.element.style.height = `${this.defaultHeight}px`

    // Assurer que le scroll fonctionne
    this.element.style.overflowY = 'auto'
    this.element.style.overflowX = 'hidden'

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

    // Snap à des positions prédéfinies
    const currentHeight = this.element.offsetHeight
    const snapPositions = [
      this.minHeight,
      this.defaultHeight,
      this.maxHeight
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
}
