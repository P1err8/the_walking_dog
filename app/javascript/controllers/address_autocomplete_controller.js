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

  geolocate(event) {
    event.preventDefault()
    const button = event.currentTarget
    const originalHTML = button.innerHTML
    button.innerHTML = '<span class="geolocate-spinner"></span>'
    button.disabled = true

    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur")
      button.innerHTML = originalHTML
      button.disabled = false
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        // Reverse geocoding to get address
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${this.apiKeyValue}&types=address`
          const response = await fetch(url)
          const data = await response.json()

          if (data.features && data.features.length > 0) {
            this.addressTarget.value = data.features[0].place_name
          } else {
            this.addressTarget.value = "Ma position actuelle"
          }

          this.latitudeTarget.value = lat
          this.longitudeTarget.value = lng
          this.resultsTarget.innerHTML = ""
        } catch (error) {
          console.error("Error reverse geocoding:", error)
          this.addressTarget.value = "Ma position actuelle"
          this.latitudeTarget.value = lat
          this.longitudeTarget.value = lng
        }

        button.innerHTML = originalHTML
        button.disabled = false
      },
      (error) => {
        console.error("Geolocation error:", error)
        alert("Impossible d'obtenir votre position. Vérifiez les permissions.")
        button.innerHTML = originalHTML
        button.disabled = false
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }
}
