import { Controller } from "@hotwired/stimulus"
import mapboxgl from "mapbox-gl"

export default class extends Controller {
	static targets = ["instruction", "distance", "duration"]
	static values = {
		coordinates: Array
	}

	connect() {
		this.currentIndex = 0
		this.totalDistance = this.calculateTotalDistance(this.coordinatesValue || [])
		this.mapController = this.findMapController()
		this.updatePanel()
	}

	// Recenter the map to the route bounds
	recenter() {
		if (!this.mapController || !this.mapController.map || !this.coordinatesValue?.length) return
		const bounds = new mapboxgl.LngLatBounds()
		this.coordinatesValue.forEach(c => bounds.extend(c))
		this.mapController.map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 800 })
	}

	// --- UI update ---
	updatePanel() {
		const coords = this.coordinatesValue || []
		if (!coords.length) return

		// Instruction
		const instruction = this.nextInstruction(coords, this.currentIndex)
		if (this.hasInstructionTarget) this.instructionTarget.textContent = instruction

		// Distance restante (approx: total - parcouru)
		const traveled = this.calculateTotalDistance(coords.slice(0, this.currentIndex + 1))
		const remaining = Math.max(this.totalDistance - traveled, 0)
		if (this.hasDistanceTarget) this.distanceTarget.textContent = `${(remaining / 1000).toFixed(2)} km`

		// Durée estimée (vitesse 1.4 m/s)
		const etaMinutes = Math.max(Math.round(remaining / 1.4 / 60), 1)
		if (this.hasDurationTarget) this.durationTarget.textContent = `${etaMinutes} min`
	}

	// --- Helpers ---
	findMapController() {
		const mapEl = document.querySelector('[data-controller*="map"]')
		if (!mapEl) return null
		return this.application.getControllerForElementAndIdentifier(mapEl, 'map')
	}

	calculateTotalDistance(coordinates) {
		let total = 0
		for (let i = 1; i < coordinates.length; i++) {
			total += this.haversine(coordinates[i - 1], coordinates[i])
		}
		return total
	}

	haversine(a, b) {
		const [lon1, lat1] = a
		const [lon2, lat2] = b
		const R = 6371e3
		const φ1 = lat1 * Math.PI / 180
		const φ2 = lat2 * Math.PI / 180
		const Δφ = (lat2 - lat1) * Math.PI / 180
		const Δλ = (lon2 - lon1) * Math.PI / 180

		const h = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
		const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
		return R * c
	}

	bearing(a, b) {
		const [lon1, lat1] = a.map(v => v * Math.PI / 180)
		const [lon2, lat2] = b.map(v => v * Math.PI / 180)
		const dLon = lon2 - lon1
		const y = Math.sin(dLon) * Math.cos(lat2)
		const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
		const brng = (Math.atan2(y, x) * 180) / Math.PI
		return (brng + 360) % 360
	}

	directionName(bearing) {
		const dirs = ["Nord", "Nord-Est", "Est", "Sud-Est", "Sud", "Sud-Ouest", "Ouest", "Nord-Ouest"]
		const idx = Math.round(bearing / 45) % 8
		return dirs[idx]
	}

	nextInstruction(coords, index) {
		const curr = coords[index]
		const nxt = coords[index + 1]
		if (!nxt) return "Vous êtes arrivé à destination"

		const dist = this.haversine(curr, nxt)
		const dir = this.directionName(this.bearing(curr, nxt))
		const distText = dist > 1000 ? `${(dist / 1000).toFixed(2)} km` : `${Math.round(dist)} m`
		return `Continuez ${dir} pendant ${distText}`
	}
}
