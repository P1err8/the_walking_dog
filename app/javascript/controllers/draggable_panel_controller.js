import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["handle"]

  connect() {
    this.isDragging = false
    this.startY = 0
    this.startHeight = 0
    this.minHeight = 150 // Hauteur minimale (juste le titre visible)
    this.maxHeight = window.innerHeight * 0.70 // 70% de la hauteur de l'écran
    this.defaultHeight = window.innerHeight * 0.52 // 52% par défaut

    // Pour la détection de swipe rapide
    this.dragStartTime = 0
    this.dragStartHeight = 0

    // Pour la détection du scroll (hide/show)
    this.lastScrollY = window.scrollY
    this.isHidden = false
    this.scrollThreshold = 10 // Seuil minimum de scroll pour déclencher

    // Définir la hauteur initiale
    this.element.style.height = `${this.defaultHeight}px`

    // Désactiver le scroll dans le panel
    this.element.style.overflow = 'hidden'

    // Ajouter la transition pour le hide/show au scroll
    this.element.style.transition = 'transform 0.3s ease, opacity 0.3s ease, height 0.3s ease'

    // Créer la poignée de drag si elle n'existe pas
    if (!this.hasHandleTarget) {
      this.createHandle()
    }

    // Écouter les événements de scroll
    this.handleScroll = this.handleScroll.bind(this)
    window.addEventListener('scroll', this.handleScroll, { passive: true })

    // Écouter aussi le touch sur la map (pour mobile)
    this.handleTouchMove = this.handleTouchMove.bind(this)
    document.addEventListener('touchmove', this.handleTouchMove, { passive: true })
  }

  disconnect() {
    window.removeEventListener('scroll', this.handleScroll)
    document.removeEventListener('touchmove', this.handleTouchMove)
  }

  handleScroll() {
    if (this.isDragging) return

    const currentScrollY = window.scrollY
    const deltaY = currentScrollY - this.lastScrollY

    if (Math.abs(deltaY) > this.scrollThreshold) {
      if (deltaY > 0 && !this.isHidden) {
        // Scroll vers le bas → cacher la modal
        this.hidePanel()
      } else if (deltaY < 0 && this.isHidden) {
        // Scroll vers le haut → montrer la modal
        this.showPanel()
      }
      this.lastScrollY = currentScrollY
    }
  }

  handleTouchMove(event) {
    if (this.isDragging) return

    // Ignorer si le touch est sur le panel lui-même
    if (this.element.contains(event.target)) return

    // Détecter le mouvement vertical sur la map
    if (!this.touchStartY) {
      this.touchStartY = event.touches[0].clientY
      return
    }

    const currentY = event.touches[0].clientY
    const deltaY = this.touchStartY - currentY

    if (Math.abs(deltaY) > 30) {
      if (deltaY > 0 && !this.isHidden) {
        // Swipe vers le haut sur la map → cacher la modal
        this.hidePanel()
      } else if (deltaY < 0 && this.isHidden) {
        // Swipe vers le bas sur la map → montrer la modal
        this.showPanel()
      }
      this.touchStartY = currentY
    }
  }

  hidePanel() {
    this.isHidden = true
    this.element.style.transform = 'translateY(calc(100% - 60px))'
    this.element.style.opacity = '0.95'
  }

  showPanel() {
    this.isHidden = false
    this.element.style.transform = 'translateY(0)'
    this.element.style.opacity = '1'
  }

  createHandle() {
    const handle = document.createElement('div')
    handle.className = 'drag-handle'
    handle.innerHTML = '<div class="drag-indicator"></div>'
    handle.dataset.draggablePanelTarget = "handle"
    this.element.insertBefore(handle, this.element.firstChild)
  }

  startDrag(event) {
    // Si le panel est caché, le montrer au clic
    if (this.isHidden) {
      this.showPanel()
      return
    }

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
    this.element.style.transition = 'transform 0.3s ease, opacity 0.3s ease, height 0.3s ease'

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
