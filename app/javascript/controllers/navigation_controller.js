import { Controller } from "@hotwired/stimulus"
import mapboxgl from "mapbox-gl"

export default class extends Controller {
	static targets = ["instruction", "distance", "duration", "icon"]
	static values = { coordinates: Array }

	connect() {
		this.currentIndex = 0
		this.currentStepIndex = 0
		this.userPosition = null
		this.isHidden = false

		const coords = this.coordinatesValue || []

		// Vérifier si on a un tableau valide de coordonnées
		if (coords.length === 0 || !Array.isArray(coords)) {
			console.warn("Navigation controller: no valid coordinates provided")
			// Écouter l'événement route:calculated pour obtenir l'itinéraire
			this.handleRouteCalculatedBound = this.handleRouteCalculated.bind(this)
			document.addEventListener('route:calculated', this.handleRouteCalculatedBound)
			return
		}

		// Vérifier si le premier élément est bien un tableau [lng, lat]
		if (!Array.isArray(coords[0])) {
			console.warn("Navigation controller: invalid coordinate format, expected [[lng, lat], ...]")
			this.handleRouteCalculatedBound = this.handleRouteCalculated.bind(this)
			document.addEventListener('route:calculated', this.handleRouteCalculatedBound)
			return
		}

		this.initializeNavigation(coords)
	}

	handleRouteCalculated(event) {
		const { coordinates } = event.detail
		if (coordinates && Array.isArray(coordinates) && coordinates.length > 0) {
			this.coordinatesValue = coordinates
			this.initializeNavigation(coordinates)
		}
	}

	initializeNavigation(coords) {
		this.totalDistance = this.calculateTotalDistance(coords)
		this.steps = this.buildTurnByTurn(coords)
		this.mapController = this.findMapController()
		this.updatePanel()

		// Démarrer la mise à jour en temps réel si on a un map controller
		if (this.mapController) {
			this.startRealtimeUpdates()
		}
	}

	startRealtimeUpdates() {
		// Écouter les événements de géolocalisation du map controller
		if (this.mapController.geolocateControl) {
			this.handleGeolocateBound = this.handleGeolocationUpdate.bind(this)
			this.mapController.geolocateControl.on('geolocate', this.handleGeolocateBound)
		}

		// Mise à jour périodique toutes les 2 secondes (fallback si pas de geolocate)
		this.updateInterval = setInterval(() => {
			if (this.mapController && this.mapController.userLocation) {
				this.userPosition = this.mapController.userLocation
				this.advanceStepIfNeeded()
				this.updatePanel()
			}
		}, 2000)
	}

	handleGeolocationUpdate(e) {
		this.userPosition = [e.coords.longitude, e.coords.latitude]
		this.advanceStepIfNeeded()
		this.updatePanel()
	}

	disconnect() {
		// Cleanup if needed
		if (this.watchId) {
			navigator.geolocation.clearWatch(this.watchId)
		}
		if (this.handleRouteCalculatedBound) {
			document.removeEventListener('route:calculated', this.handleRouteCalculatedBound)
		}
		// Nettoyer les mises à jour en temps réel
		if (this.updateInterval) {
			clearInterval(this.updateInterval)
		}
		if (this.handleGeolocateBound && this.mapController && this.mapController.geolocateControl) {
			this.mapController.geolocateControl.off('geolocate', this.handleGeolocateBound)
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

	hidePanel() {
		this.isHidden = true
		this.element.classList.add('navigation-panel--hidden')
	}

	showPanel() {
		this.isHidden = false
		this.element.classList.remove('navigation-panel--hidden')
	}

	// Recenter the map to the user's location
	recenter() {
		if (!this.mapController || !this.mapController.map) return

		// Use stored location from geolocateControl
		if (this.mapController.userLocation) {
			// Calculer la hauteur du panel pour ajuster le centre
			const panelElement = document.querySelector('.navigation-panel')
			let panelHeight = 0
			if (panelElement) {
				panelHeight = panelElement.offsetHeight
			}

			// Calculer l'offset vertical pour centrer au-dessus du panel
			const mapHeight = this.mapController.map.getContainer().offsetHeight
			const offsetY = panelHeight / 2

			this.mapController.map.flyTo({
				center: this.mapController.userLocation,
				zoom: 17,
				speed: 1.2,
				curve: 1.4,
				offset: [0, -offsetY] // Décalage vers le haut pour tenir compte du panel
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
		if (!coords.length || !Array.isArray(coords[0])) {
			// Pas encore d'itinéraire, afficher un message par défaut
			if (this.hasInstructionTarget) this.instructionTarget.textContent = "Calcul de l'itinéraire..."
			if (this.hasDistanceTarget) this.distanceTarget.textContent = "-- km"
			if (this.hasDurationTarget) this.durationTarget.textContent = "-- min"
			return
		}

		// Instruction turn-by-turn style
		const instruction = this.nextInstruction()
		if (this.hasInstructionTarget) this.instructionTarget.textContent = instruction.text
		if (this.hasIconTarget) this.iconTarget.innerHTML = this.getIconSvg(instruction.icon)

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
		if (!coordinates || coordinates.length < 2) return 0
		let total = 0
		for (let i = 1; i < coordinates.length; i++) {
			total += this.haversine(coordinates[i - 1], coordinates[i])
		}
		return total
	}

	haversine(a, b) {
		if (!Array.isArray(a) || !Array.isArray(b)) {
			console.error("haversine: invalid coordinates", a, b)
			return 0
		}
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
		if (Math.abs(delta) > 135) return { text: "faites demi-tour", icon: "uturn" }
		if (delta > 20) return { text: "tournez à droite", icon: "right" }
		if (delta < -20) return { text: "tournez à gauche", icon: "left" }
		return { text: "continuez tout droit", icon: "straight" }
	}

	getIconSvg(iconType) {
		const icons = {
			straight: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
			left: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 20v-6a4 4 0 0 0-4-4H4"/><path d="M8 14l-4-4 4-4"/></svg>',
			right: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 20v-6a4 4 0 0 1 4-4h6"/><path d="M16 14l4-4-4-4"/></svg>',
			uturn: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a4 4 0 0 1 4 4v7"/></svg>',
			arrival: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
			ready: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M7 21l3-9-2.5-1M17 21l-3-9 2.5-1M12 11v4"/></svg>'
		}
		return icons[iconType] || icons.straight
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
			steps.push({ index: i, action: action.text, icon: action.icon, distance: distanceFromLastTurn })
			lastTurnIdx = i
		}

		// Arrival step
		const remainingToEnd = this.cumulativeDistances[this.cumulativeDistances.length - 1] - this.cumulativeDistances[lastTurnIdx]
		steps.push({ index: coords.length - 1, action: "Vous êtes arrivé à destination", icon: "arrival", distance: remainingToEnd })

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
		if (!this.steps || this.steps.length === 0) {
			return { text: "Navigation prête", icon: "ready" }
		}
		const step = this.steps[this.currentStepIndex] || this.steps[this.steps.length - 1]
		const targetCoord = this.coordinatesValue?.[step.index]
		let distance = step.distance

		if (this.userPosition && targetCoord) {
			distance = this.haversine(this.userPosition, targetCoord)
		}

		if (step.action === "Vous êtes arrivé à destination") {
			return { text: step.action, icon: "arrival" }
		}
		const distanceText = this.formatDistance(distance)
		return { text: `Dans ${distanceText}, ${step.action}`, icon: step.icon }
	}
}
