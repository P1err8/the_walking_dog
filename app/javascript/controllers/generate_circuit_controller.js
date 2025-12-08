import { Controller } from "@hotwired/stimulus"
import mapboxgl from 'mapbox-gl'
import * as turf from '@turf/turf'

export default class extends Controller {
  static targets = ["latitude", "longitude", "duration", "circuitCoordinates", "submitButton", "previewButton", "loadingIndicator"]
  static values = {
    apiKey: String
  }

  connect() {
    console.log("GenerateCircuitController connected")

    mapboxgl.accessToken = this.apiKeyValue

    // Récupérer le controller de la map de fond
    const mapElement = document.querySelector('[data-controller*="map"]')
    if (mapElement) {
      this.mapController = this.application.getControllerForElementAndIdentifier(mapElement, 'map')
      if (this.mapController) {
        this.map = this.mapController.map
        console.log("Map loaded from background")
      }
    }

    if (!this.map) {
      console.error("Background map not found")
      return
    }

    this.lastIsochrone = null
    this.poiMarkers = []
    this.maxPoiCount = 0
    this.currentPoiCount = 0
    this.isochroneDuration = 0
    this.initialStartCoords = null
    this.currentStartCoords = null
    this.isochroneLayers = []
    this.rotationAngle = 0
    this.currentBearing = Math.random() * 360

    this.ISOCHRONE_COLORS = [
      '#00BFFF', '#3CB371', '#FF6347', '#9370DB', '#FFD700', '#00CED1'
    ]

    this.ROUTE_SOURCE_ID = 'route-source'
    this.ROUTE_LAYER_ID = 'route-layer'
  }

  // Ensure we have start coordinates; try geolocation in parallel with timeout fallback
  async ensureStartCoordinates() {
    const lat = parseFloat(this.latitudeTarget.value)
    const lon = parseFloat(this.longitudeTarget.value)

    if (!isNaN(lat) && !isNaN(lon)) {
      return { lat, lon }
    }

    const fallbackFromMap = () => {
      if (!this.map) return null
      const center = this.map.getCenter()
      this.latitudeTarget.value = center.lat
      this.longitudeTarget.value = center.lng
      return { lat: center.lat, lon: center.lng }
    }

    if (!navigator.geolocation) {
      return fallbackFromMap()
    }

    const getPosition = (options) => new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => {
          console.warn('Geolocation error:', err)
          resolve(null)
        },
        options
      )
    })

    // Use Promise.race with aggressive timeout - don't wait long
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve(null), 2000) // 2 second timeout instead of sequential 8 seconds
    })

    const geoPromise = getPosition({ enableHighAccuracy: true, timeout: 2000, maximumAge: 300000 })
    const coords = await Promise.race([geoPromise, timeoutPromise])

    if (coords) {
      this.latitudeTarget.value = coords.latitude
      this.longitudeTarget.value = coords.longitude
      return { lat: coords.latitude, lon: coords.longitude }
    }

    return fallbackFromMap()
  }

  clearAllIsochrones() {
    this.isochroneLayers.forEach(id => {
      if (this.map.getLayer(id)) { this.map.removeLayer(id) }
      if (this.map.getSource(id)) { this.map.removeSource(id) }
    })
    this.isochroneLayers = []

    if (this.map.getLayer(this.ROUTE_LAYER_ID)) { this.map.removeLayer(this.ROUTE_LAYER_ID) }
    if (this.map.getSource(this.ROUTE_SOURCE_ID)) { this.map.removeSource(this.ROUTE_SOURCE_ID) }
  }

  async verifyPoiLocation(coords) {
    const [lon, lat] = coords
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=poi,address,place,locality&access_token=${mapboxgl.accessToken}`

    try {
      const response = await fetch(geocodeUrl)
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const isLand = data.features.some(feature =>
          feature.place_type.some(type =>
            ['address', 'poi', 'place', 'locality'].includes(type)
          )
        )
        return isLand
      }
      return false

    } catch (error) {
      console.error('Erreur de géocodage pour vérification:', error)
      return false
    }
  }

  async findValidPoiOnBoundary(bearing) {
    const isochronePolygon = this.lastIsochrone.features[0]
    const centerPoint = turf.centerOfMass(isochronePolygon)

    const isochroneBbox = turf.bbox(isochronePolygon)
    const maxDistance = turf.distance(centerPoint, turf.point([isochroneBbox[0], isochroneBbox[1]]), { units: 'kilometers' })

    const MAX_ATTEMPTS = 10 // Réduit de 15 à 10

    // Générer tous les candidats POI en parallèle sans vérification immédiate
    const poiCandidates = []
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      let currentBearing = bearing

      if (attempt > 0) {
        currentBearing += (Math.random() * 40 - 20)
      }

      const theoreticalPoint = turf.destination(centerPoint, maxDistance * 1.5, currentBearing, { units: 'kilometers' })
      const line = turf.polygonToLine(isochronePolygon)
      const nearestPoint = turf.nearestPointOnLine(line, theoreticalPoint)
      poiCandidates.push(nearestPoint.geometry.coordinates)
    }

    // Vérifier tous les candidats en parallèle au lieu de séquentiellement
    const verificationPromises = poiCandidates.map(coords =>
      this.verifyPoiLocation(coords).then(isValid => ({ coords, isValid }))
    )

    const results = await Promise.all(verificationPromises)

    // Retourner le premier candidat valide trouvé
    const validPoi = results.find(result => result.isValid)
    if (validPoi) {
      return validPoi.coords
    }

    console.warn(`Échec de la génération d'un POI valide après ${MAX_ATTEMPTS} tentatives de projection.`)
    return null
  }

  async calculateIsochrone(coords, stepNumber) {
    if (this.isochroneDuration <= 0) {
      return Promise.reject(new Error("Durée non valide."))
    }

    const [lon, lat] = coords
    const isochroneUrl = `https://api.mapbox.com/isochrone/v1/mapbox/walking/${lon},${lat}?contours_minutes=${this.isochroneDuration}&polygons=true&access_token=${mapboxgl.accessToken}`

    try {
      const response = await fetch(isochroneUrl)
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de l\'isochrone: ' + response.statusText)
      }
      const data = await response.json()
      this.lastIsochrone = data

      // Visualisation de l'isochrone supprimée pour ne garder que la logique de calcul

      if (stepNumber === 0) {
        if (this.marker) { this.marker.remove() }
        this.marker = new mapboxgl.Marker({ color: 'green' }).setLngLat(coords).setPopup(new mapboxgl.Popup().setText("Point de Départ et d'Arrivée")).addTo(this.map)
      }

      return data
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  calculatePoiCountByDuration(duration) {
    if (duration < 30) {
      return 3
    } else if (duration < 40) {
      return 4
    } else {
      return 5
    }
  }

  async initializeWalk() {
    console.log("Initializing walk...")

    // Show loading indicator
    if (this.hasPreviewButtonTarget) {
      this.previewButtonTarget.style.display = "none"
    }
    if (this.hasLoadingIndicatorTarget) {
      this.loadingIndicatorTarget.style.display = "block"
    }

    try {
      const startCoords = await this.ensureStartCoordinates()
      if (!startCoords) {
        alert('Impossible de récupérer votre position. Activez la localisation ou renseignez une adresse.')
        this.hideLoadingIndicator()
        return
      }

      const { lat, lon } = startCoords
      const walkDurationInput = this.durationTarget.value
      const walkDuration = parseInt(walkDurationInput)

      console.log("Inputs:", { lat, lon, walkDuration })

      if (isNaN(lon) || isNaN(lat)) {
        alert('Veuillez entrer une adresse valide pour obtenir les coordonnées.')
        this.hideLoadingIndicator()
        return
      }
      if (isNaN(walkDuration) || walkDuration <= 0) {
        alert('Veuillez entrer une durée totale de promenade valide (> 0).')
        this.hideLoadingIndicator()
        return
      }

      const poiTarget = this.calculatePoiCountByDuration(walkDuration)

      this.maxPoiCount = poiTarget
      this.currentPoiCount = 0

      if (this.maxPoiCount < 3) {
        alert('Le nombre de POI calculé est trop faible pour une boucle guidée.')
        this.hideLoadingIndicator()
        return
      }

      this.initialStartCoords = [lon, lat]
      this.currentStartCoords = [lon, lat]

      this.isochroneDuration = Math.max(1, Math.floor(walkDuration / (this.maxPoiCount + 1)))
      const totalSides = this.maxPoiCount + 1
      this.rotationAngle = 360 / totalSides
      this.currentBearing = Math.random() * 360

      this.poiMarkers.forEach(marker => marker.remove())
      this.poiMarkers = []
      this.clearAllIsochrones()

      this.calculateIsochrone(this.currentStartCoords, 0)
        .then(() => {
          this.hideLoadingIndicator()
          this.generatePoi()
        })
        .catch(error => {
          console.error('Erreur:', error)
          this.hideLoadingIndicator()
        })
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error)
      this.hideLoadingIndicator()
    }
  }

  hideLoadingIndicator() {
    if (this.hasPreviewButtonTarget) {
      this.previewButtonTarget.style.display = "block"
    }
    if (this.hasLoadingIndicatorTarget) {
      this.loadingIndicatorTarget.style.display = "none"
    }
  }

  updateLoadingMessage(message) {
    if (this.hasLoadingIndicatorTarget) {
      const messageElement = this.loadingIndicatorTarget.querySelector('p')
      if (messageElement) {
        messageElement.textContent = message
      }
    }
  }

  async generatePoi() {
    if (!this.lastIsochrone || this.lastIsochrone.features.length === 0) {
      return
    }

    this.updateLoadingMessage(`Génération du circuit... (${this.currentPoiCount + 1}/${this.maxPoiCount})`)

    if (this.currentPoiCount > 0) {
      this.currentBearing = (this.currentBearing + this.rotationAngle) % 360
    }

    const poiCoords = await this.findValidPoiOnBoundary(this.currentBearing)

    if (!poiCoords) {
      alert("Impossible de trouver un chemin valide sur la terre ferme. Veuillez changer le point de départ ou la durée.")
      this.hideLoadingIndicator()
      return
    }

    const newMarker = new mapboxgl.Marker({ color: '#FF4500' })
      .setLngLat(poiCoords)
      .addTo(this.map)

    this.poiMarkers.push(newMarker)

    this.currentPoiCount++
    this.currentStartCoords = poiCoords

    if (this.currentPoiCount < this.maxPoiCount) {
      await this.calculateIsochrone(this.currentStartCoords, this.currentPoiCount)
      await this.generatePoi()
    } else {
      this.updateLoadingMessage('Calcul de l\'itinéraire final...')
      this.calculateRoute()
    }
  }

  async calculateRoute() {
    if (!this.initialStartCoords || this.poiMarkers.length === 0) {
      return
    }

    const waypoints = []

    waypoints.push(this.initialStartCoords)

    this.poiMarkers.forEach(marker => {
      const coords = marker.getLngLat().toArray()
      waypoints.push(coords)
    })

    waypoints.push(this.initialStartCoords)

    if (waypoints.length < 2) {
      return
    }

    const waypointsString = waypoints.map(coords => coords.join(',')).join(';')

    if (this.map.getLayer(this.ROUTE_LAYER_ID)) { this.map.removeLayer(this.ROUTE_LAYER_ID) }
    if (this.map.getSource(this.ROUTE_SOURCE_ID)) { this.map.removeSource(this.ROUTE_SOURCE_ID) }

    const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/walking/${waypointsString}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`

    try {
      const response = await fetch(routeUrl)
      const data = await response.json()

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        const routeGeoJSON = route.geometry

        this.map.addSource(this.ROUTE_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: routeGeoJSON
          }
        })

        this.map.addLayer({
          id: this.ROUTE_LAYER_ID,
          type: 'line',
          source: this.ROUTE_SOURCE_ID,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3498db',
            'line-width': 6,
            'line-opacity': 0.8
          }
        })

        const durationMinutes = (route.duration / 60).toFixed(0)
        const distanceKm = (route.distance / 1000).toFixed(1)

        console.log(`Itinéraire en boucle calculé: ${distanceKm} km en ${durationMinutes} minutes.`)

        // Adapter le zoom pour voir tout l'itinéraire
        this.fitMapToRoute(routeGeoJSON.coordinates)

        // Store the coordinates in the hidden field
        if (this.hasCircuitCoordinatesTarget) {
          this.circuitCoordinatesTarget.value = JSON.stringify(routeGeoJSON.coordinates)
          // this.circuitCoordinatesTarget.value = JSON.stringify(waypoints)
        }

        // Show the submit button
        if (this.hasSubmitButtonTarget) {
          this.submitButtonTarget.style.display = "block"
        }

      } else {
        console.error("Impossible de calculer l'itinéraire entre les POI et le retour au point de départ.")
      }
    } catch (error) {
      console.error('Erreur lors du calcul de l\'itinéraire:', error)
    }
  }

  // Adapter le zoom de la carte pour voir tout l'itinéraire
  // En tenant compte de la position du panel blanc
  fitMapToRoute(coordinates) {
    if (!coordinates || coordinates.length === 0) return

    const bounds = new mapboxgl.LngLatBounds()
    coordinates.forEach(coord => bounds.extend(coord))

    // Calculer la hauteur du panel blanc pour l'ajouter au padding
    const panelElement = document.querySelector('.walking-form-card')
    let panelHeight = 0
    if (panelElement) {
      panelHeight = panelElement.offsetHeight
    }

    // Padding supérieur et latéral standard, padding inférieur qui prend en compte le panel
    const paddingTop = 80
    const paddingSide = 80
    const paddingBottom = Math.max(80, panelHeight + 40) // Ajouter du padding pour le panel

    // Ajuster la carte avec un padding asymétrique
    this.map.fitBounds(bounds, {
      padding: {
        top: paddingTop,
        bottom: paddingBottom,
        left: paddingSide,
        right: paddingSide
      },
      maxZoom: 15,
      duration: 1000
    })
  }
}
