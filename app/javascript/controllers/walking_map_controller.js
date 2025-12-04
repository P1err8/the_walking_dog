import { Controller } from "@hotwired/stimulus"
import mapboxgl from 'mapbox-gl'

// Controller Stimulus pour afficher et naviguer sur un itinéraire de balade
// Fonctionnalités :
// - Affichage de la carte avec itinéraire
// - Marqueurs pour points de départ, waypoints, et arrivée
// - Navigation GPS turn-by-turn en temps réel
// - Suivi de position utilisateur
export default class extends Controller {
  static values = {
    apiKey: String,
    coordinates: Object
  }

  static targets = ["startNavButton", "navigationPanel"]

  connect() {
    console.log('🗺️ Walking Map Controller connected')
    console.log('📍 Coordinates:', this.coordinatesValue)

    mapboxgl.accessToken = this.apiKeyValue
    this.initMap()
  }

  disconnect() {
    if (this.map) {
      this.map.remove()
    }
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId)
    }
  }

  // ============================================================================
  // INITIALISATION DE LA CARTE
  // ============================================================================

  initMap() {
    // Extraire le point de départ
    const startFeature = this.coordinatesValue.features.find(
      f => f.properties.type === 'start'
    )

    if (!startFeature) {
      console.error('❌ Pas de point de départ trouvé')
      return
    }

    const startCoords = startFeature.geometry.coordinates

    // Créer la carte
    this.map = new mapboxgl.Map({
      container: this.element,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: startCoords,
      zoom: 13
    })

    this.map.on('load', () => {
      console.log('✅ Carte chargée')

      // Ajouter les contrôles de navigation
      this.map.addControl(new mapboxgl.NavigationControl())

      // Ajouter le contrôle de géolocalisation
      this.geolocateControl = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true,
        showAccuracyCircle: true
      })
      this.map.addControl(this.geolocateControl)

      // Dessiner l'itinéraire une fois la carte chargée
      this.drawRoute()
    })
  }

  // ============================================================================
  // AFFICHAGE DE L'ITINÉRAIRE
  // ============================================================================

  async drawRoute() {
    // Extraire les coordonnées simples pour Mapbox Directions
    const coords = this.extractSimpleCoordinates()

    console.log('🛣️ Tracé de l\'itinéraire avec', coords.length, 'points')

    if (coords.length < 2) {
      console.error('❌ Pas assez de coordonnées pour tracer un itinéraire')
      return
    }

    // Construire l'URL pour Mapbox Directions API
    const coordinatesString = coords.map(c => c.join(',')).join(';')
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinatesString}?geometries=geojson&overview=full&steps=true&banner_instructions=true&access_token=${mapboxgl.accessToken}`

    try {
      const response = await fetch(url)
      const data = await response.json()

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0]

        // Stocker les instructions de navigation
        this.navigationInstructions = route.legs.flatMap(leg => leg.steps)
        this.routeDistance = route.distance
        this.routeDuration = route.duration

        console.log('✅ Itinéraire récupéré:', {
          distance: `${(route.distance / 1000).toFixed(2)} km`,
          duration: `${Math.round(route.duration / 60)} min`,
          steps: this.navigationInstructions.length
        })

        // Afficher l'itinéraire sur la carte
        this.displayRouteOnMap(route.geometry)

        // Ajouter les marqueurs
        this.addMarkers()

        // Ajuster la vue pour montrer tout l'itinéraire
        this.fitMapToBounds()
      } else {
        console.error('❌ Aucun itinéraire trouvé')
      }
    } catch (error) {
      console.error('❌ Erreur lors du tracé de l\'itinéraire:', error)
    }
  }

  // Extrait les coordonnées simples [lng, lat] depuis le GeoJSON
  extractSimpleCoordinates() {
    const coords = []

    // Point de départ
    const startFeature = this.coordinatesValue.features.find(
      f => f.properties.type === 'start'
    )
    if (startFeature) {
      coords.push(startFeature.geometry.coordinates)
    }

    // Waypoints triés par ordre
    const waypoints = this.coordinatesValue.features
      .filter(f => f.properties.type === 'waypoint')
      .sort((a, b) => a.properties.order - b.properties.order)

    waypoints.forEach(wp => {
      coords.push(wp.geometry.coordinates)
    })

    // Point d'arrivée
    const endFeature = this.coordinatesValue.features.find(
      f => f.properties.type === 'end'
    )
    if (endFeature) {
      coords.push(endFeature.geometry.coordinates)
    }

    return coords
  }

  // Affiche l'itinéraire sur la carte
  displayRouteOnMap(geometry) {
    // Supprimer l'ancienne route si elle existe
    if (this.map.getSource('route')) {
      this.map.removeLayer('route')
      this.map.removeSource('route')
    }

    // Ajouter la nouvelle route
    this.map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: geometry
      }
    })

    this.map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#1E3A5F', // Navy de la charte
        'line-width': 5,
        'line-opacity': 0.9
      }
    })
  }

  // Ajoute les marqueurs (départ, waypoints, arrivée)
  addMarkers() {
    // Marqueur de départ (vert)
    const startFeature = this.coordinatesValue.features.find(
      f => f.properties.type === 'start'
    )
    if (startFeature) {
      new mapboxgl.Marker({ color: '#22c55e' })
        .setLngLat(startFeature.geometry.coordinates)
        .setPopup(new mapboxgl.Popup({ offset: 25 })
          .setHTML('<h3>🏁 Point de départ</h3>'))
        .addTo(this.map)
    }

    // Marqueurs des waypoints (bleu)
    const waypoints = this.coordinatesValue.features
      .filter(f => f.properties.type === 'waypoint')
      .sort((a, b) => a.properties.order - b.properties.order)

    waypoints.forEach(wp => {
      new mapboxgl.Marker({ color: '#A3B5D9' })
        .setLngLat(wp.geometry.coordinates)
        .setPopup(new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <h3>📍 Point ${wp.properties.order}</h3>
            <p>${wp.properties.poi_name || wp.properties.description}</p>
            ${wp.properties.address ? `<p style="font-size: 0.8rem; color: #64748B;">${wp.properties.address}</p>` : ''}
          `))
        .addTo(this.map)
    })

    // Marqueur d'arrivée (rouge)
    const endFeature = this.coordinatesValue.features.find(
      f => f.properties.type === 'end'
    )
    if (endFeature) {
      new mapboxgl.Marker({ color: '#DC2626' })
        .setLngLat(endFeature.geometry.coordinates)
        .setPopup(new mapboxgl.Popup({ offset: 25 })
          .setHTML('<h3>🏁 Arrivée</h3>'))
        .addTo(this.map)
    }
  }

  // Ajuste la vue pour montrer tout l'itinéraire
  fitMapToBounds() {
    const coords = this.extractSimpleCoordinates()

    if (coords.length === 0) return

    const bounds = new mapboxgl.LngLatBounds()
    coords.forEach(coord => bounds.extend(coord))

    this.map.fitBounds(bounds, {
      padding: 80,
      maxZoom: 15
    })
  }

  // ============================================================================
  // NAVIGATION GPS
  // ============================================================================

  startNavigation() {
    console.log('🧭 Démarrage de la navigation GPS')

    if (!this.navigationInstructions || this.navigationInstructions.length === 0) {
      alert('❌ Aucun itinéraire disponible pour la navigation')
      return
    }

    if (!navigator.geolocation) {
      alert('❌ La géolocalisation n\'est pas supportée par votre navigateur')
      return
    }

    // Afficher le panel de navigation
    if (this.hasNavigationPanelTarget) {
      this.navigationPanelTarget.classList.add('active')
    }

    // Masquer le bouton de démarrage
    if (this.hasStartNavButtonTarget) {
      this.startNavButtonTarget.style.display = 'none'
    }

    // Initialiser l'état de navigation
    this.currentStep = 0
    this.isNavigating = true

    // Mettre à jour les infos
    document.getElementById('nav-distance-total').textContent =
      `${(this.routeDistance / 1000).toFixed(1)} km`
    document.getElementById('nav-duration').textContent =
      `${Math.round(this.routeDuration / 60)} min`
    document.getElementById('nav-step').textContent =
      `1/${this.navigationInstructions.length}`

    // Afficher la première instruction
    this.updateNavigationInstruction(this.navigationInstructions[0])

    // Démarrer le suivi GPS
    this.startGPSTracking()
  }

  stopNavigation() {
    console.log('🛑 Arrêt de la navigation')

    this.isNavigating = false

    // Arrêter le suivi GPS
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }

    // Supprimer le marqueur utilisateur
    if (this.userMarker) {
      this.userMarker.remove()
      this.userMarker = null
    }

    // Masquer le panel
    if (this.hasNavigationPanelTarget) {
      this.navigationPanelTarget.classList.remove('active')
    }

    // Réafficher le bouton
    if (this.hasStartNavButtonTarget) {
      this.startNavButtonTarget.style.display = 'flex'
    }
  }

  startGPSTracking() {
    // Créer le marqueur utilisateur
    if (!this.userMarker) {
      this.userMarker = new mapboxgl.Marker({
        color: '#3b82f6',
        scale: 1.2
      })
      .setLngLat([0, 0])
      .addTo(this.map)
    }

    // Suivre la position en temps réel
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handlePositionError(error),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    )
  }

  handlePositionUpdate(position) {
    const userLng = position.coords.longitude
    const userLat = position.coords.latitude

    // Mettre à jour le marqueur
    this.userMarker.setLngLat([userLng, userLat])

    // Vérifier si on a atteint l'instruction suivante
    if (this.isNavigating && this.currentStep < this.navigationInstructions.length) {
      const currentInstruction = this.navigationInstructions[this.currentStep]
      const nextPoint = currentInstruction.maneuver.location
      const distance = this.calculateDistance(userLat, userLng, nextPoint[1], nextPoint[0])

      // Si on est à moins de 20m, passer à l'instruction suivante
      if (distance < 0.02) { // 20 mètres
        this.currentStep++

        if (this.currentStep < this.navigationInstructions.length) {
          this.updateNavigationInstruction(this.navigationInstructions[this.currentStep])
          document.getElementById('nav-step').textContent =
            `${this.currentStep + 1}/${this.navigationInstructions.length}`
        } else {
          // Navigation terminée !
          this.finishNavigation()
        }
      }
    }

    // Centrer la carte sur l'utilisateur
    this.map.easeTo({
      center: [userLng, userLat],
      zoom: 17,
      duration: 1000
    })
  }

  handlePositionError(error) {
    console.error('❌ Erreur GPS:', error)
    alert('❌ Impossible de suivre votre position GPS.\n\nVérifiez que la géolocalisation est activée.')
  }

  updateNavigationInstruction(instruction) {
    const icon = this.getInstructionIcon(instruction.maneuver.type)
    const text = instruction.maneuver.instruction
    const distance = instruction.distance < 1000
      ? `Dans ${Math.round(instruction.distance)} m`
      : `Dans ${(instruction.distance / 1000).toFixed(1)} km`

    document.getElementById('nav-icon').textContent = icon
    document.getElementById('nav-instruction').textContent = text
    document.getElementById('nav-distance').textContent = distance
  }

  getInstructionIcon(type) {
    const icons = {
      'turn': '↪️',
      'new name': '➡️',
      'depart': '🚶',
      'arrive': '🏁',
      'merge': '🔀',
      'fork': '🔱',
      'end of road': '🛑',
      'continue': '⬆️',
      'roundabout': '🔄',
      'notification': '⚠️'
    }
    return icons[type] || '➡️'
  }

  finishNavigation() {
    this.isNavigating = false

    document.getElementById('nav-icon').textContent = '🎉'
    document.getElementById('nav-instruction').textContent = 'Balade terminée !'
    document.getElementById('nav-distance').textContent = 'Vous êtes arrivé'

    setTimeout(() => {
      if (confirm('🎉 Balade terminée !\n\nVoulez-vous arrêter la navigation ?')) {
        this.stopNavigation()
      }
    }, 2000)
  }

  centerOnUser() {
    if (this.userMarker) {
      const pos = this.userMarker.getLngLat()
      this.map.flyTo({
        center: [pos.lng, pos.lat],
        zoom: 17,
        essential: true
      })
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  // Calcule la distance entre deux points (formule Haversine simplifiée)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371 // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
}
