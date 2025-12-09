import { Controller } from "@hotwired/stimulus"
import mapboxgl from "mapbox-gl"

export default class extends Controller {
  static targets = ["map"]
  static values = {
    apiKey: String,
    coordinates: Array,
    markers: Array
  }

  connect() {
    // console.log("Map controller connected")
    mapboxgl.accessToken = this.apiKeyValue

    // Get map container - prefer target if present
    const mapContainer = this.hasMapTarget ? this.mapTarget : this.element

    // Clear the container to prevent Mapbox GL warnings about non-empty containers
    mapContainer.innerHTML = ''

    this.map = new mapboxgl.Map({
      container: mapContainer,
      style: "mapbox://styles/mapbox/streets-v10",
      center: this.coordinatesValue && this.coordinatesValue.length > 0 ? this.coordinatesValue[0] : [4.8357, 45.7640],
      zoom: 12
    })

    // Geolocate user whenever the map is active
    this.userLocation = null
    this.geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
      showAccuracyCircle: false
    })
    this.map.addControl(this.geolocateControl, 'top-left')

    // Store user location when geolocate is successful
    this.geolocateControl.on('geolocate', (e) => {
      this.userLocation = [e.coords.longitude, e.coords.latitude]
    })

    // Ensure the map matches the container size immediately
    this.map.resize()

    // Resize on window events to keep full-screen layout consistent
    this.handleResize = () => {
      if (this.map) this.map.resize()
    }
    window.addEventListener("resize", this.handleResize)

    this.map.on("load", () => {
      this.map.resize()
      if (this.geolocateControl) {
        this.geolocateControl.trigger()
      }
      if (this.coordinatesValue && this.coordinatesValue.length > 0) {
        this.addRoute()
        this.fitMapToRoute()
      }
    })

     this.map.on("load", () => {
      this.addMarkersToMap() // Appel de la fonction
      this.fitMapToMarkers() // Optionnel : centrer sur les points
    })

  }

  addMarkersToMap() {
    if (!this.hasMarkersValue) return

    this.markersValue.forEach((marker) => {
      // Créer un élément HTML custom si tu as passé marker_html, sinon marker par défaut
      const popup = new mapboxgl.Popup().setHTML(marker.info_window_html)

      // Si tu as un partial custom pour le marker (marker_html)
      const customMarker = document.createElement("div")
      customMarker.innerHTML = marker.marker_html

      new mapboxgl.Marker(marker.marker_html ? customMarker : undefined)
        .setLngLat([marker.lng, marker.lat])
        .setPopup(popup)
        .addTo(this.map)
    })
  }

  fitMapToMarkers() {
    if (!this.hasMarkersValue || this.markersValue.length === 0) return

    const bounds = new mapboxgl.LngLatBounds()
    this.markersValue.forEach(marker => bounds.extend([marker.lng, marker.lat]))
    this.map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 0 })
  }

  disconnect() {
    window.removeEventListener("resize", this.handleResize)
    if (this.map) this.map.remove()
  }

  async addRoute() {
    // Check if we have a full geometry (many points) or just waypoints
    // Mapbox Directions API limit is 25 waypoints. If we have more, it's likely a full path.
    if (this.coordinatesValue.length > 25) {
      this.drawRoute({
        type: 'LineString',
        coordinates: this.coordinatesValue
      })
    } else {
      // 1. Format coordinates for the API: "lng,lat;lng,lat;..."
      const coordinatesString = this.coordinatesValue
        .map(coord => coord.join(","))
        .join(";")

      // this call mapbo api to get the route geometry in walking mode
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinatesString}?geometries=geojson&access_token=${this.apiKeyValue}`

      try {
        const response = await fetch(url)
        const data = await response.json()

        if (data.routes && data.routes.length > 0) {
          this.drawRoute(data.routes[0].geometry)
        }
      } catch (error) {
        console.error("Error fetching route:", error)
      }
    }
  }

  drawRoute(geometry) {
    // 3. Add the source using the fetched geometry
    this.map.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: geometry
      }
    })

    this.map.addLayer({
      id: "route",
      type: "line",
      source: "route",
      layout: {
        "line-join": "round",
        "line-cap": "round"
      },
      paint: {
        "line-color": "#1E3A5F",
        "line-width": 5
      }
    })

    // Start Marker (Green)
    new mapboxgl.Marker({ color: "#10B981" })
      .setLngLat(this.coordinatesValue[0])
      .addTo(this.map)

    // End Marker (Red)
    new mapboxgl.Marker({ color: "#EF4444" })
      .setLngLat(this.coordinatesValue[this.coordinatesValue.length - 1])
      .addTo(this.map)
  }

  fitMapToRoute() {
    const bounds = new mapboxgl.LngLatBounds()
    this.coordinatesValue.forEach(coord => bounds.extend(coord))

    // Calculer la hauteur du panel blanc pour l'ajouter au padding
    const panelElement = document.querySelector('.walking-form-card')
    let panelHeight = 0
    if (panelElement) {
      panelHeight = panelElement.offsetHeight
    }

    // Padding asymétrique en tenant compte du panel
    const paddingTop = 70
    const paddingSide = 70
    const paddingBottom = Math.max(70, panelHeight + 30)

    this.map.fitBounds(bounds, {
      padding: {
        top: paddingTop,
        bottom: paddingBottom,
        left: paddingSide,
        right: paddingSide
      },
      maxZoom: 15,
      duration: 0
    })
  }

  // Public methods for external controllers
  clearAll() {
    // Remove all markers
    if (this.markers) {
      this.markers.forEach(marker => marker.remove())
    }
    this.markers = []

    // Remove all isochrone layers
    if (this.isochroneLayers) {
      this.isochroneLayers.forEach(id => {
        if (this.map.getLayer(id)) { this.map.removeLayer(id) }
        if (this.map.getSource(id)) { this.map.removeSource(id) }
      })
    }
    this.isochroneLayers = []

    // Remove route
    if (this.map.getLayer('route-layer')) { this.map.removeLayer('route-layer') }
    if (this.map.getSource('route-source')) { this.map.removeSource('route-source') }
  }

  addIsochrone(data, stepNumber, color) {
    const layerId = `isochrone-${stepNumber}`
    const sourceId = `isochrone-source-${stepNumber}`

    if (this.map.getSource(sourceId)) return

    this.map.addSource(sourceId, {
      type: 'geojson',
      data: data
    })

    this.map.addLayer({
      id: layerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': color,
        'fill-opacity': 0.3
      }
    })

    if (!this.isochroneLayers) this.isochroneLayers = []
    this.isochroneLayers.push(layerId)
    this.isochroneLayers.push(sourceId)
  }

  addMarker(coords, color, popup) {
    if (!this.markers) this.markers = []
    const marker = new mapboxgl.Marker({ color })
      .setLngLat(coords)

    if (popup) {
      marker.setPopup(new mapboxgl.Popup().setText(popup))
    }

    marker.addTo(this.map)
    this.markers.push(marker)
  }

  addRouteGeometry(routeGeoJSON) {
    if (this.map.getLayer('route-layer')) { this.map.removeLayer('route-layer') }
    if (this.map.getSource('route-source')) { this.map.removeSource('route-source') }

    this.map.addSource('route-source', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: routeGeoJSON
      }
    })

    this.map.addLayer({
      id: 'route-layer',
      type: 'line',
      source: 'route-source',
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
  }

  flyTo(coords, zoom = 12) {
    this.map.flyTo({
      center: coords,
      zoom: zoom,
      duration: 1000
    })
  }
}
