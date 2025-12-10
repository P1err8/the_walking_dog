import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["handle"]

  connect() {
    this.isDragging = false
    this.startY = 0
    this.startHeight = 0
    this.currentTranslateY = 0 // Pour suivre le translateY pendant le drag

    // Détecter si c'est un navigation-panel-wrapper (pas de hauteur fixe)
    this.isNavigationPanel = this.element.classList.contains('navigation-panel-wrapper')

    // Si c'est un wrapper, cibler le panel interne pour les transformations
    if (this.isNavigationPanel) {
      this.panelElement = this.element.querySelector('.navigation-panel') || this.element
      this.floatingButton = this.element.querySelector('.navigation-panel__floating-recenter-btn')
    } else {
      this.panelElement = this.element
      this.floatingButton = null
    }

    this.minHeight = 150 // Hauteur minimale (juste le titre visible)
    this.maxHeight = window.innerHeight * 0.55 // 55% de la hauteur de l'écran
    this.defaultHeight = window.innerHeight * 0.44 // 44% par défaut

    // Pour la détection de swipe rapide
    this.dragStartTime = 0
    this.dragStartHeight = 0

    // Pour la détection du scroll (hide/show)
    this.lastScrollY = window.scrollY
    this.isHidden = false
    this.scrollThreshold = 10 // Seuil minimum de scroll pour déclencher

    // Ne définir la hauteur initiale que pour les panels qui ne sont pas navigation-panel
    if (!this.isNavigationPanel) {
      this.element.style.height = `${this.defaultHeight}px`
      this.element.style.overflow = 'hidden'
    }

    // Ajouter la transition pour le hide/show au scroll
    this.element.style.transition = 'transform 0.3s ease, opacity 0.3s ease, height 0.3s ease'

    // Créer la poignée de drag si elle n'existe pas
    if (!this.hasHandleTarget && !this.isNavigationPanel) {
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

    // Utiliser panelElement pour navigation-panel, sinon element
    const targetElement = this.isNavigationPanel ? this.panelElement : this.element
    targetElement.style.transform = 'translateY(100%)'
    targetElement.style.opacity = '0'

    // Cacher aussi le bouton flottant
    if (this.floatingButton) {
      this.floatingButton.style.transform = 'translateY(100%)'
      this.floatingButton.style.opacity = '0'
    }

    // Inverser le chevron (pointer vers le haut)
    this.updateChevronDirection('up')

    // Afficher la navbar et le FAB quand le panel est caché
    const navbar = document.querySelector('.navbar')
    if (navbar) {
      navbar.style.transform = 'translateY(0)'
      navbar.style.opacity = '1'
      navbar.style.pointerEvents = 'auto'
    }
    const fabButton = document.querySelector('.fab-button')
    if (fabButton) {
      fabButton.style.transform = 'translateX(-50%) translateY(0)'
      fabButton.style.opacity = '1'
      fabButton.style.pointerEvents = 'auto'
    }

    // Permettre de voir et cliquer sur la navbar quand le panel est caché
    const modalFrame = document.querySelector('turbo-frame#modal.modal-frame')
    if (modalFrame) {
      modalFrame.style.bottom = '70px' // Laisser 70px pour la navbar
      modalFrame.style.height = 'auto'
    }
  }

  showPanel() {
    this.isHidden = false

    // Utiliser panelElement pour navigation-panel, sinon element
    const targetElement = this.isNavigationPanel ? this.panelElement : this.element
    targetElement.style.transform = 'translateY(0)'
    targetElement.style.opacity = '1'

    // Afficher aussi le bouton flottant
    if (this.floatingButton) {
      this.floatingButton.style.transform = 'translateY(0)'
      this.floatingButton.style.opacity = '1'
    }

    // Inverser le chevron (pointer vers le bas)
    this.updateChevronDirection('down')

    // Cacher la navbar et le FAB quand le panel est affiché
    const navbar = document.querySelector('.navbar')
    if (navbar) {
      navbar.style.transform = 'translateY(100%)'
      navbar.style.opacity = '0'
      navbar.style.pointerEvents = 'none'
    }
    const fabButton = document.querySelector('.fab-button')
    if (fabButton) {
      fabButton.style.transform = 'translateX(-50%) translateY(100%)'
      fabButton.style.opacity = '0'
      fabButton.style.pointerEvents = 'none'
    }

    // Remettre le modal en plein écran
    const modalFrame = document.querySelector('turbo-frame#modal.modal-frame')
    if (modalFrame) {
      modalFrame.style.bottom = '0'
      modalFrame.style.height = '100vh'
    }
  }

  updateChevronDirection(direction) {
    const closeBtn = this.element.querySelector('.drag-close-btn')
    if (closeBtn) {
      const svg = closeBtn.querySelector('svg')
      if (svg) {
        // Rotation: 0deg = pointe vers le bas, 180deg = pointe vers le haut
        svg.style.transition = 'transform 0.3s ease'
        svg.style.transform = direction === 'up' ? 'rotate(180deg)' : 'rotate(0deg)'
      }
    }
  }

  // Toggle le panel (pour le bouton chevron)
  togglePanel() {
    if (this.isHidden) {
      this.showPanel()
    } else {
      this.hidePanel()
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
    // Ignorer si on clique sur le bouton fermer ou sur des éléments interactifs
    if (event.target.closest('.drag-close-btn')) return
    if (event.target.closest('input, select, button, a, textarea')) return

    // Si le panel est caché, le montrer au clic
    if (this.isHidden) {
      this.showPanel()
      return
    }

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

    // Prévenir le comportement par défaut seulement si possible (non-passive)
    if (event.cancelable) {
      event.preventDefault()
    }

    const currentY = event.type.includes('touch') ? event.touches[0].clientY : event.clientY
    const deltaY = currentY - this.startY // positif = drag vers le bas

    // Pour navigation-panel: glisser directement vers le bas avec translateY
    if (this.isNavigationPanel) {
      const translateAmount = Math.max(0, deltaY) // Ne permettre que de descendre
      this.currentTranslateY = translateAmount
      this.panelElement.style.transform = `translateY(${translateAmount}px)`
      // Réduire l'opacité progressivement
      const opacity = Math.max(0, 1 - (translateAmount / 200))
      this.panelElement.style.opacity = opacity.toString()
      // Animer aussi le bouton flottant
      if (this.floatingButton) {
        this.floatingButton.style.transform = `translateY(${translateAmount}px)`
        this.floatingButton.style.opacity = opacity.toString()
      }
      return
    }

    // Pour les autres panels: comportement original avec modification de hauteur
    const theoreticalHeight = this.startHeight - deltaY

    // Si on tire en dessous de minHeight, on commence à translater vers le bas
    if (theoreticalHeight < this.minHeight) {
      this.element.style.height = `${this.minHeight}px`
      const translateAmount = this.minHeight - theoreticalHeight
      this.currentTranslateY = translateAmount
      this.element.style.transform = `translateY(${translateAmount}px)`
      // Réduire l'opacité progressivement
      const opacity = Math.max(0, 1 - (translateAmount / 200))
      this.element.style.opacity = opacity.toString()
    } else {
      // Comportement normal : ajuster la hauteur
      const newHeight = Math.min(this.maxHeight, theoreticalHeight)
      this.element.style.height = `${newHeight}px`
      this.element.style.transform = 'translateY(0)'
      this.element.style.opacity = '1'
      this.currentTranslateY = 0
    }
  }

  endDrag() {
    if (!this.isDragging) return

    this.isDragging = false
    document.body.style.userSelect = ''

    // Utiliser panelElement pour navigation-panel, sinon element
    const targetElement = this.isNavigationPanel ? this.panelElement : this.element
    targetElement.style.transition = 'transform 0.3s ease, opacity 0.3s ease, height 0.3s ease'
    if (this.floatingButton) {
      this.floatingButton.style.transition = 'transform 0.3s ease, opacity 0.3s ease'
    }

    // Si le panel a été tiré de plus de 100px vers le bas, le cacher
    if (this.currentTranslateY > 100) {
      this.hidePanel()
      this.currentTranslateY = 0
      return
    }

    // Si légèrement tiré vers le bas, revenir à la position normale
    if (this.currentTranslateY > 0) {
      targetElement.style.transform = 'translateY(0)'
      targetElement.style.opacity = '1'
      if (this.floatingButton) {
        this.floatingButton.style.transform = 'translateY(0)'
        this.floatingButton.style.opacity = '1'
      }
      this.currentTranslateY = 0
    }

    // Pour navigation-panel, pas besoin de snap à des hauteurs
    if (this.isNavigationPanel) {
      return
    }

    // Détecter le swipe rapide vers le bas pour fermer
    const dragDuration = Date.now() - this.dragStartTime
    const currentHeight = this.element.offsetHeight
    const dragDistance = this.dragStartHeight - currentHeight // positif = swipe vers le bas

    // Si swipe rapide vers le bas (moins de 300ms et distance > 100px), fermer le modal
    if (dragDuration < 300 && dragDistance > 100) {
      this.dismiss()
      return
    }

    // Snap à des positions prédéfinies (seulement 2 positions)
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
