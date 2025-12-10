import { Controller } from "@hotwired/stimulus"
import mapboxgl from "mapbox-gl"

export default class extends Controller {
  static targets = ["map"]
  static values = {
    apiKey: String,
    coordinates: Array,
    markers: Array,
    destination: Array
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

      if (this.hasDestinationValue) {
        this.calculateRouteFromUser()
      }
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
        // this.fitMapToRoute()
      }
      if (this.hasMarkersValue && this.markersValue.length > 0) {
        this.addClustersToMap()
        // this.fitMapToMarkers()
      }
    })

    //  this.map.on("load", () => {
    //   this.addMarkersToMap() // Appel de la fonction
    //   this.fitMapToMarkers() // Optionnel : centrer sur les points
    // })

  }

  addClustersToMap() {
    // 1. Conversion de l'Array Rails en GeoJSON valide pour Mapbox
    const features = this.markersValue.map(marker => {
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [marker.lng, marker.lat]
        },
        properties: {
          // On passe le HTML de la popup dans les propriétés
          info_window: marker.info_window_html,
          lat: marker.lat,
          lng: marker.lng
        }
      }
    })

    const geojsonData = {
      type: 'FeatureCollection',
      features: features
    }

    // 2. Ajout de la source avec clustering activé
    this.map.addSource('meetups', {
      type: 'geojson',
      data: geojsonData,
      cluster: true,
      clusterMaxZoom: 14, // Zoom au-delà duquel les points ne sont plus groupés
      clusterRadius: 50   // Rayon du cluster
    });

    // 3. Layer : Les cercles de clusters (couleur selon densité)
    this.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'meetups',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step', ['get', 'point_count'],
          '#c8b59a', 10,  // Bleu si < 10
          '#deaf6e', 50,  // Jaune si < 50
          '#e5c99e'       // Rose si > 50
        ],
        'circle-radius': [
          'step', ['get', 'point_count'],
          20, 10, // Rayon 20px -> 30px -> 40px
          30, 50,
          40
        ]
      }
    });

    // 4. Layer : Le chiffre dans le cluster
    this.map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'meetups',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });

    // 5. Layer : Les points individuels (non clusterisés)
    this.map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'meetups',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#f5840d',
        'circle-radius': 8,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

    // --- Événements ---

    // Clic sur un cluster -> Zoom dessus
    this.map.on('click', 'clusters', (e) => {
      const features = this.map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const clusterId = features[0].properties.cluster_id;
      this.map.getSource('meetups').getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        this.map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom
        });
      });
    });

    // Clic sur un point individuel -> Popup
    this.map.on('click', 'unclustered-point', async (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice();
      const infoWindow = e.features[0].properties.info_window;
      const markerLat = e.features[0].properties.lat;
      const markerLng = e.features[0].properties.lng;

      // Correction pour les mondes répétés à bas niveau de zoom
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      // Centrer la carte pour que la popup soit au milieu de l'écran
      // Calculer la hauteur de la popup (environ 350px) et la décaler vers le haut
      const popupHeight = 350; // Hauteur estimée de la popup
      const mapHeight = this.map.getContainer().offsetHeight;
      const offsetY = -(popupHeight / 2); // Décalage pour centrer verticalement

      // D'abord centrer la carte, puis afficher la popup une fois l'animation terminée
      this.map.easeTo({
        center: coordinates,
        offset: [0, offsetY],
        duration: 200
      });

      // Attendre que l'animation soit terminée avant d'afficher la popup
      this.map.once('moveend', () => {
        // Créer la popup avec le HTML de base
        const popup = new mapboxgl.Popup({
          offset: 25,
          maxWidth: '300px'
        })
          .setLngLat(coordinates)
          .setHTML(infoWindow)
          .addTo(this.map);

        // Calculer et mettre à jour la distance et la durée
        this.updatePopupDistanceAndDuration(popup, [markerLng, markerLat]);
      });
    });

    // Changement de curseur (main) au survol
    this.map.on('mouseenter', 'clusters', () => { this.map.getCanvas().style.cursor = 'pointer'; });
    this.map.on('mouseleave', 'clusters', () => { this.map.getCanvas().style.cursor = ''; });
    this.map.on('mouseenter', 'unclustered-point', () => { this.map.getCanvas().style.cursor = 'pointer'; });
    this.map.on('mouseleave', 'unclustered-point', () => { this.map.getCanvas().style.cursor = ''; });
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

  async calculateRouteFromUser() {
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${this.userLocation[0]},${this.userLocation[1]};${this.destinationValue[0]},${this.destinationValue[1]}?geometries=geojson&access_token=${this.apiKeyValue}`

    try {
      const response = await fetch(url)
      const data = await response.json()

      if (data.routes && data.routes.length > 0) {
        this.coordinatesValue = [this.userLocation, this.destinationValue]
        this.drawRoute(data.routes[0].geometry)
      }
    } catch (error) {
      console.error("Error fetching route:", error)
    }
  }

  drawRoute(geometry) {
    if (this.map.getLayer("route")) { this.map.removeLayer("route") }
    if (this.map.getSource("route")) { this.map.removeSource("route") }

    if (this.routeMarkers) {
      this.routeMarkers.forEach(marker => marker.remove())
    }
    this.routeMarkers = []

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
    const startMarker = new mapboxgl.Marker({ color: "#10B981" })
      .setLngLat(this.coordinatesValue[0])
      .addTo(this.map)

    // End Marker (Red)
    const endMarker = new mapboxgl.Marker({ color: "#EF4444" })
      .setLngLat(this.coordinatesValue[this.coordinatesValue.length - 1])
      .addTo(this.map)

    this.routeMarkers.push(startMarker, endMarker)
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

  // Calculer la distance à vol d'oiseau entre deux points (en mètres)
  calculateDistance(coord1, coord2) {
    const R = 6371000; // Rayon de la Terre en mètres
    const lat1 = coord1[1] * Math.PI / 180;
    const lat2 = coord2[1] * Math.PI / 180;
    const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const deltaLng = (coord2[0] - coord1[0]) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return distance;
  }

  // Formater la distance pour l'affichage
  formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  }

  // Formater la durée pour l'affichage
  formatDuration(seconds) {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
    }
  }

  // Mettre à jour la popup avec la distance et la durée
  async updatePopupDistanceAndDuration(popup, destinationCoords) {
    // Vérifier si on a la position de l'utilisateur
    if (!this.userLocation) {
      const distanceElement = popup._content.querySelector('.distance-value');
      const durationElement = popup._content.querySelector('.duration-value');
      if (distanceElement) distanceElement.textContent = 'Position non disponible';
      if (durationElement) durationElement.textContent = 'Position non disponible';
      return;
    }

    // Afficher "Calcul..." pendant le chargement
    const distanceElement = popup._content.querySelector('.distance-value');
    const durationElement = popup._content.querySelector('.duration-value');
    if (distanceElement) distanceElement.textContent = 'Calcul...';
    if (durationElement) durationElement.textContent = 'Calcul...';

    // Appeler l'API Mapbox pour obtenir la distance et la durée réelles
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${this.userLocation[0]},${this.userLocation[1]};${destinationCoords[0]},${destinationCoords[1]}?access_token=${this.apiKeyValue}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const duration = data.routes[0].duration; // en secondes
        const realDistance = data.routes[0].distance; // en mètres

        // Mettre à jour avec la distance et la durée réelles de l'itinéraire
        if (durationElement) {
          durationElement.textContent = this.formatDuration(duration);
        }
        if (distanceElement) {
          distanceElement.textContent = this.formatDistance(realDistance);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de la durée:", error);
      if (durationElement) {
        durationElement.textContent = 'Non disponible';
      }
      if (distanceElement) {
        distanceElement.textContent = 'Non disponible';
      }
    }
  }
}
