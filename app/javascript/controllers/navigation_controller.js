import { Controller } from "@hotwired/stimulus"
import mapboxgl from "mapbox-gl"

export default class extends Controller {
	static targets = ["instruction", "distance", "duration"]
	static values = { coordinates: Array }

	connect() {
		this.currentIndex = 0
		this.currentStepIndex = 0
		this.userPosition = null

		const coords = this.coordinatesValue || []
		this.totalDistance = this.calculateTotalDistance(coords)
		this.steps = this.buildTurnByTurn(coords)
		this.mapController = this.findMapController()
		this.updatePanel()
	}

	disconnect() {
		// Cleanup if needed
		if (this.watchId) {
			navigator.geolocation.clearWatch(this.watchId)
		}
	}

	// Recenter the map to the user's location
	recenter() {
		if (!this.mapController || !this.mapController.map) return

		// Use stored location from geolocateControl
		if (this.mapController.userLocation) {
			this.mapController.map.flyTo({
				center: this.mapController.userLocation,
				zoom: 17,
				speed: 1.2,
				curve: 1.4
			})
		} else {
			// Fallback: trigger geolocation if position not yet available
			if (this.mapController.geolocateControl) {
				this.mapController.geolocateControl.trigger()
			}
		}
	}

	// --- UI update ---
	updatePanel() {
		const coords = this.coordinatesValue || []
		if (!coords.length) return

		// Instruction turn-by-turn style
		const instruction = this.nextInstruction()
		if (this.hasInstructionTarget) this.instructionTarget.textContent = instruction

		// Distance restante (approx: total - parcouru ou proximité de la position)
		let remaining
		if (this.userPosition && this.cumulativeDistances?.length === coords.length) {
			const nearestIdx = this.findNearestCoordinateIndex(this.userPosition, coords)
			const traveled = this.cumulativeDistances[nearestIdx] || 0
			remaining = Math.max(this.totalDistance - traveled, 0)
		} else {
			const traveled = this.calculateTotalDistance(coords.slice(0, this.currentIndex + 1))
			remaining = Math.max(this.totalDistance - traveled, 0)
		}
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

	formatDistance(meters) {
		if (!meters || meters <= 0) return "quelques mètres"
		return meters > 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
	}

	turnAction(delta) {
		if (Math.abs(delta) > 135) return "faites demi-tour"
		if (delta > 20) return "tournez à droite"
		if (delta < -20) return "tournez à gauche"
		return "continuez tout droit"
	}

	buildTurnByTurn(coords) {
		if (!coords || coords.length < 2) return []

		this.cumulativeDistances = [0]
		for (let i = 1; i < coords.length; i++) {
			this.cumulativeDistances[i] = this.cumulativeDistances[i - 1] + this.haversine(coords[i - 1], coords[i])
		}

		const steps = []
		let lastTurnIdx = 0
		for (let i = 1; i < coords.length - 1; i++) {
			const prev = coords[i - 1]
			const curr = coords[i]
			const next = coords[i + 1]

			const bearingIn = this.bearing(prev, curr)
			const bearingOut = this.bearing(curr, next)
			let delta = bearingOut - bearingIn
			delta = ((delta + 540) % 360) - 180 // Normalize to [-180, 180]

			if (Math.abs(delta) < 25) continue // Ignore slight bends

			const action = this.turnAction(delta)
			const distanceFromLastTurn = this.cumulativeDistances[i] - this.cumulativeDistances[lastTurnIdx]
			steps.push({ index: i, action, distance: distanceFromLastTurn })
			lastTurnIdx = i
		}

		// Arrival step
		const remainingToEnd = this.cumulativeDistances[this.cumulativeDistances.length - 1] - this.cumulativeDistances[lastTurnIdx]
		steps.push({ index: coords.length - 1, action: "Vous êtes arrivé à destination", distance: remainingToEnd })

		return steps
	}

	findNearestCoordinateIndex(position, coords) {
		let bestIdx = 0
		let bestDist = Infinity
		coords.forEach((c, idx) => {
			const d = this.haversine(position, c)
			if (d < bestDist) {
				bestDist = d
				bestIdx = idx
			}
		})
		return bestIdx
	}

	advanceStepIfNeeded() {
		if (!this.userPosition || !this.steps || this.steps.length === 0) return
		const step = this.steps[this.currentStepIndex]
		if (!step) return
		const targetCoord = this.coordinatesValue?.[step.index]
		if (!targetCoord) return

		const distToTarget = this.haversine(this.userPosition, targetCoord)
		const threshold = 10 // meters

		if (distToTarget <= threshold && this.currentStepIndex < this.steps.length - 1) {
			this.currentStepIndex += 1
		}
	}

	nextInstruction() {
		if (!this.steps || this.steps.length === 0) return "Navigation prête"
		const step = this.steps[this.currentStepIndex] || this.steps[this.steps.length - 1]
		const targetCoord = this.coordinatesValue?.[step.index]
		let distance = step.distance

		if (this.userPosition && targetCoord) {
			distance = this.haversine(this.userPosition, targetCoord)
		}

		if (step.action === "Vous êtes arrivé à destination") return step.action
		const distanceText = this.formatDistance(distance)
		return `Dans ${distanceText}, ${step.action}`
	}
}
