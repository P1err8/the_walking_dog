import { Controller } from "@hotwired/stimulus"
import mapboxgl from 'mapbox-gl'
import * as turf from '@turf/turf'

export default class extends Controller {
  static targets = ["map", "button", "display"]
  static values = {
    apiKey: String,
    path: Array // This now receives the FULL DETAILED PATH from DB
  }

  connect() {
    this.currentIndex = 0
    this.isRunning = false
    this.fullPath = this.hasPathValue ? this.pathValue : []

    if (this.fullPath.length === 0) return

    mapboxgl.accessToken = this.apiKeyValue
    this.map = new mapboxgl.Map({
      container: this.mapTarget,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: this.fullPath[0],
      zoom: 15
    })

    this.map.on('load', () => {
      // No API call needed! Just draw what we have.
      this.drawRoute()
      this.addWalkerMarker()
      this.fitMapToRoute()
    })
  }

  drawRoute() {
    this.map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: this.fullPath // Use the detailed path directly
        }
      }
    })

    this.map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#3498db', 'line-width': 5 }
    })
  }

  addWalkerMarker() {
    const el = document.createElement('div')
    el.className = 'walker-marker'
    el.style.backgroundColor = '#FF0000'
    el.style.width = '20px'
    el.style.height = '20px'
    el.style.borderRadius = '50%'
    el.style.border = '2px solid white'
    el.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)'

    this.walkerMarker = new mapboxgl.Marker(el)
      .setLngLat(this.fullPath[0])
      .addTo(this.map)
  }

  fitMapToRoute() {
    const bounds = new mapboxgl.LngLatBounds()
    this.fullPath.forEach(coord => bounds.extend(coord))
    this.map.fitBounds(bounds, { padding: 50 })
  }

  toggle() {
    if (this.isRunning) {
      this.stop()
    } else {
      this.start()
    }
  }

  start() {
    if (!this.fullPath || this.fullPath.length === 0) return

    this.isRunning = true
    this.buttonTarget.innerText = "Pause"
    this.buttonTarget.classList.add("active")

    const line = turf.lineString(this.fullPath)
    const totalDistance = turf.length(line, { units: 'kilometers' })

    // this is the time it will take to complete the walk in milliseconds
    const duration = 30000

    let startTimestamp = null

    const animate = (timestamp) => {
      if (!this.isRunning) return

      if (!startTimestamp) startTimestamp = timestamp - (this.currentProgress || 0) * duration

      const elapsed = timestamp - startTimestamp
      this.currentProgress = elapsed / duration

      if (this.currentProgress >= 1) {
        this.currentProgress = 1
        this.updateWalkerPosition(line, totalDistance)
        this.stop()
        alert("Balade terminée !")
        // tis mark the end
        this.currentProgress = 0
        return
      }

      this.updateWalkerPosition(line, totalDistance)
      requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }

  updateWalkerPosition(line, totalDistance) {
    const currentDistance = this.currentProgress * totalDistance
    const point = turf.along(line, currentDistance, { units: 'kilometers' })
    const coords = point.geometry.coordinates

    this.walkerMarker.setLngLat(coords)
    this.map.panTo(coords)

    if (this.hasDisplayTarget) {
      this.displayTarget.innerText = `Lat: ${coords[1].toFixed(5)}\nLng: ${coords[0].toFixed(5)}`
    }
  }

  stop() {
    this.isRunning = false
    this.buttonTarget.innerText = "Reprendre"
    this.buttonTarget.classList.remove("active")
  }

  disconnect() {
    this.isRunning = false
    if (this.map) this.map.remove()
  }
}
