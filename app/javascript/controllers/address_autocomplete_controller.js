import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["address", "latitude", "longitude", "results"]
  static values = { apiKey: String }

  connect() {
    this.addressTarget.addEventListener("input", this.search.bind(this))
    // Close results when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.element.contains(e.target)) {
        this.resultsTarget.innerHTML = ""
      }
    })
  }

  async search() {
    const query = this.addressTarget.value
    if (query.length < 3) {
      this.resultsTarget.innerHTML = ""
      return
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${this.apiKeyValue}&autocomplete=true&types=address`

    try {
      const response = await fetch(url)
      const data = await response.json()
      this.showResults(data.features)
    } catch (error) {
      console.error("Error fetching address:", error)
    }
  }

  showResults(features) {
    this.resultsTarget.innerHTML = ""

    features.forEach(feature => {
      const div = document.createElement("div")
      div.classList.add("autocomplete-item")
      div.innerText = feature.place_name
      // Basic inline styles for the dropdown items
      div.style.cursor = "pointer"
      div.style.padding = "10px"
      div.style.borderBottom = "1px solid #eee"
      div.style.backgroundColor = "white"

      div.addEventListener("mouseenter", () => {
        div.style.backgroundColor = "#f0f0f0"
      })
      div.addEventListener("mouseleave", () => {
        div.style.backgroundColor = "white"
      })

      div.addEventListener("click", () => {
        this.selectAddress(feature)
      })

      this.resultsTarget.appendChild(div)
    })
  }

  selectAddress(feature) {
    this.addressTarget.value = feature.place_name
    this.latitudeTarget.value = feature.center[1] // Mapbox returns [lng, lat]
    this.longitudeTarget.value = feature.center[0]
    this.resultsTarget.innerHTML = "" // Clear results
  }

  async geolocate() {
    const statusDiv = document.getElementById('geolocation-status')

    if (!navigator.geolocation) {
      statusDiv.textContent = '❌ Geolocalisation non supportee'
      statusDiv.style.color = '#dc2626'
      return
    }

    statusDiv.textContent = '📍 Recuperation de votre position...'
    statusDiv.style.color = '#3b82f6'

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        // Reverse geocoding to get address
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${this.apiKeyValue}&types=address&limit=1`

        try {
          const response = await fetch(url)
          const data = await response.json()

          if (data.features && data.features.length > 0) {
            const feature = data.features[0]
            this.addressTarget.value = feature.place_name
            this.latitudeTarget.value = lat
            this.longitudeTarget.value = lng

            statusDiv.textContent = `✅ Position trouvee : ${feature.place_name}`
            statusDiv.style.color = '#22c55e'
          } else {
            this.latitudeTarget.value = lat
            this.longitudeTarget.value = lng
            this.addressTarget.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`

            statusDiv.textContent = '✅ Position trouvee (coordonnees GPS)'
            statusDiv.style.color = '#22c55e'
          }
        } catch (error) {
          console.error('Geocoding error:', error)
          // Still set coordinates even if reverse geocoding fails
          this.latitudeTarget.value = lat
          this.longitudeTarget.value = lng
          this.addressTarget.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`

          statusDiv.textContent = '⚠️ Position trouvee (impossible de recuperer l\'adresse)'
          statusDiv.style.color = '#f59e0b'
        }
      },
      (error) => {
        let message = '❌ Impossible de vous geolocaliser'
        if (error.code === 1) message = '❌ Acces a la localisation refuse'
        if (error.code === 2) message = '❌ Position indisponible'
        if (error.code === 3) message = '❌ Delai depasse'

        console.error('Geolocation error:', error)
        statusDiv.textContent = message
        statusDiv.style.color = '#dc2626'
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }
}
