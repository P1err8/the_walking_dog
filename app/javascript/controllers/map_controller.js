import { Controller } from "@hotwired/stimulus"
import mapboxgl from 'mapbox-gl'

export default class extends Controller {
  static values = {
    apiKey: String,
    coordinates: Array
  }

  connect() {
    // console.log("Map controller connected")
    mapboxgl.accessToken = this.apiKeyValue

    this.map = new mapboxgl.Map({
      container: this.element,
      style: "mapbox://styles/mapbox/streets-v10",
      center: this.coordinatesValue && this.coordinatesValue.length > 0 ? this.coordinatesValue[0] : [4.8357, 45.7640],
      zoom: 12
    })

    this.map.on("load", () => {
      if (this.coordinatesValue && this.coordinatesValue.length > 0) {
        this.addRoute()
        this.fitMapToRoute()
      }
    })
  }

  async addRoute() {
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
        const routeGeometry = data.routes[0].geometry

        // 3. Add the source using the fetched geometry
        this.map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: routeGeometry
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
    } catch (error) {
      console.error("Error fetching route:", error)
    }
  }

  fitMapToRoute() {
    const bounds = new mapboxgl.LngLatBounds()
    this.coordinatesValue.forEach(coord => bounds.extend(coord))
    this.map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 0 })
  }
}
