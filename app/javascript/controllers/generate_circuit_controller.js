import { Controller } from "@hotwired/stimulus"
import mapboxgl from 'mapbox-gl'
import * as turf from '@turf/turf'

export default class extends Controller {
  static targets = ["latitude", "longitude", "duration", "circuitCoordinates", "submitButton"]
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

    const MAX_ATTEMPTS = 15

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {

      let currentBearing = bearing
      let currentPoiCoords

      if (attempt > 0) {
        currentBearing += (Math.random() * 40 - 20)
      }

      const theoreticalPoint = turf.destination(centerPoint, maxDistance * 1.5, currentBearing, { units: 'kilometers' })

      const line = turf.polygonToLine(isochronePolygon)
      const nearestPoint = turf.nearestPointOnLine(line, theoreticalPoint)
      currentPoiCoords = nearestPoint.geometry.coordinates

      if (await this.verifyPoiLocation(currentPoiCoords)) {
        return currentPoiCoords
      }
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

  initializeWalk() {
    console.log("Initializing walk...")
    const lat = parseFloat(this.latitudeTarget.value)
    const lon = parseFloat(this.longitudeTarget.value)
    const walkDurationInput = this.durationTarget.value
    const walkDuration = parseInt(walkDurationInput)

    console.log("Inputs:", { lat, lon, walkDuration })

    if (isNaN(lon) || isNaN(lat)) {
      alert('Veuillez entrer une adresse valide pour obtenir les coordonnées.')
      return
    }
    if (isNaN(walkDuration) || walkDuration <= 0) {
      alert('Veuillez entrer une durée totale de promenade valide (> 0).')
      return
    }

    const poiTarget = this.calculatePoiCountByDuration(walkDuration)

    this.maxPoiCount = poiTarget
    this.currentPoiCount = 0

    if (this.maxPoiCount < 3) {
      alert('Le nombre de POI calculé est trop faible pour une boucle guidée.')
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
        this.generatePoi()
      })
      .catch(error => {
        console.error('Erreur:', error)
      })
  }

  async generatePoi() {
    if (!this.lastIsochrone || this.lastIsochrone.features.length === 0) {
      return
    }

    if (this.currentPoiCount > 0) {
      this.currentBearing = (this.currentBearing + this.rotationAngle) % 360
    }

    const poiCoords = await this.findValidPoiOnBoundary(this.currentBearing)

    if (!poiCoords) {
      alert("Impossible de trouver un chemin valide sur la terre ferme. Veuillez changer le point de départ ou la durée.")
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
}
