// ==============================================================================
// MAPBOX - Carte interactive pour générer des balades
// ==============================================================================
import mapboxgl from 'mapbox-gl';

// IMPORTANT : Remplacez 'VOTRE_TOKEN_MAPBOX' par votre vrai token Mapbox
// Obtenez-le gratuitement sur https://account.mapbox.com/
mapboxgl.accessToken = 'pk.eyJ1IjoiZHVrZWNhYm9vdW0iLCJhIjoiY21pcm9pdnVhMGVjMzNoc2FoNDB2ZGszYSJ9.E9cQOhfjmRHIPZGcizAwWw';

// Configuration de l'API LLM (OpenAI ou compatible)
// IMPORTANT : Remplacez par votre clé API OpenAI
const LLM_CONFIG = {
  apiKey: 'VOTRE_CLE_API_OPENAI', // Remplacez par votre clé
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini', // Modèle rapide et économique
  enabled: false // Mettre à true quand vous avez une clé API
};

let map;
let startPointMarker = null; // Marqueur du point de départ

function initMap() {
  // Créer la carte centrée sur Paris (sera mise à jour avec la géoloc)
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [2.3522, 48.8566], // Paris par défaut
    zoom: 12
  });

  // Attendre que la carte soit complètement chargée avant d'ajouter les éléments
  map.on('load', () => {
    // console.log('✅ Carte Mapbox chargée');

    // Ajouter les contrôles de navigation
    map.addControl(new mapboxgl.NavigationControl());

    // Ajouter le contrôle de géolocalisation AMÉLIORÉ
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,  // GPS précis (consomme plus de batterie)
        timeout: 10000,            // Timeout de 10 secondes
        maximumAge: 0              // Pas de cache, position fraîche
      },
      trackUserLocation: true,     // Suivre la position en continu
      showUserHeading: true,       // Afficher la direction
      showAccuracyCircle: true     // Afficher le cercle de précision
    });
    map.addControl(geolocateControl);

    // Gestion des erreurs de géolocalisation
    geolocateControl.on('error', (error) => {
      console.error('❌ Erreur géolocalisation:', error);
      let message = 'Impossible de vous localiser.';

      switch(error.code) {
        case 1: // PERMISSION_DENIED
          message = '📍 Accès à la localisation refusé.\n\nAutorisez la géolocalisation dans les paramètres de votre navigateur.';
          break;
        case 2: // POSITION_UNAVAILABLE
          message = '📍 Position indisponible.\n\nVérifiez que le GPS est activé sur votre appareil.';
          break;
        case 3: // TIMEOUT
          message = '📍 Délai dépassé.\n\nLa géolocalisation prend trop de temps. Réessayez ou placez le marqueur manuellement.';
          break;
      }

      alert(message);
    });

    // Quand l'utilisateur utilise la géolocalisation, placer le marqueur de départ
    geolocateControl.on('geolocate', (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      // console.log(`📍 Position GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)} (précision: ${accuracy.toFixed(0)}m)`);

      setStartPoint(lng, lat);

      // Afficher la précision dans le popup
      if (startPointMarker) {
        startPointMarker.setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<h3>🏁 Point de départ</h3><p>📍 GPS (précision: ~${accuracy.toFixed(0)}m)</p>`)
        );
      }
    });

    // Tentative de géolocalisation automatique au chargement
    // (si l'utilisateur a déjà autorisé)
    setTimeout(() => {
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          if (result.state === 'granted') {
            // console.log('🔓 Géolocalisation déjà autorisée, lancement auto...');
            geolocateControl.trigger();
          }
        });
      }
    }, 1000);

    // Créer un marqueur de départ DRAGGABLE (déplaçable)
    // Position par défaut : centre de Paris
    startPointMarker = new mapboxgl.Marker({
      color: '#DC2626',
      draggable: true // IMPORTANT : Le marqueur est déplaçable
    })
      .setLngLat([2.3522, 48.8566])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML('<h3>🏁 Point de départ</h3><p>Déplacez-moi ou cliquez sur la carte !</p>')
      )
      .addTo(map);

    // Mettre à jour la position quand l'utilisateur déplace le marqueur
    startPointMarker.on('dragend', () => {
      const lngLat = startPointMarker.getLngLat();
      // console.log('📍 Nouveau point de départ:', lngLat);
    });

    // CLIC SUR LA CARTE : Déplacer le point de départ
    map.on('click', (e) => {
      setStartPoint(e.lngLat.lng, e.lngLat.lat);
    });
  });
}

// Fonction pour définir/déplacer le point de départ
function setStartPoint(lng, lat) {
  if (startPointMarker) {
    startPointMarker.setLngLat([lng, lat]);
    // console.log('📍 Point de départ mis à jour:', { lat, lng });
  }
}

window.centerMap = function() {
  // Centrer sur le point de départ actuel
  const startPosition = startPointMarker.getLngLat();
  map.flyTo({
    center: [startPosition.lng, startPosition.lat],
    zoom: 14,
    essential: true
  });
}

/**
 * ALGORITHME DE GÉNÉRATION D'ITINÉRAIRE V2
 * Utilise l'API Mapbox Isochrone pour garantir le timing et éviter les aller-retours
 */

// Génère une zone isochrone (zone accessible dans un temps donné)
async function generateWaypoints(startLat, startLng, durationMinutes) {
  try {
    // ÉTAPE 1 : Récupérer la zone isochrone depuis Mapbox
    // On utilise environ 1/4 du temps pour avoir une zone plus grande
    const isochroneMinutes = Math.max(5, Math.round(durationMinutes / 4));

    const isochroneUrl = `https://api.mapbox.com/isochrone/v1/mapbox/walking/${startLng},${startLat}?contours_minutes=${isochroneMinutes}&polygons=true&access_token=${mapboxgl.accessToken}`;

    // console.log(`🔍 Récupération de la zone isochrone (${isochroneMinutes} min)...`);

    const response = await fetch(isochroneUrl);
    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error('Aucune zone isochrone trouvée');
    }

    // ÉTAPE 2 : Extraire le contour de la zone isochrone
    const isochronePolygon = data.features[0];
    const coordinates = isochronePolygon.geometry.coordinates[0]; // Premier polygone (extérieur)

    // console.log(`✅ Zone isochrone récupérée : ${coordinates.length} points sur le contour`);

    // ÉTAPE 3 : Sélectionner des waypoints sur le contour
    // Moins de waypoints = moins de risque de demi-tour
    let numPoints;
    if (durationMinutes <= 15) {
      numPoints = 4;
    } else if (durationMinutes <= 30) {
      numPoints = 5;
    } else if (durationMinutes <= 60) {
      numPoints = 6;
    } else {
      numPoints = 8;
    }

    // Types de lieux pour les descriptions
    const placeTypes = [
      'Parc municipal', 'Square', 'Place publique', 'Jardin public',
      'Promenade', 'Espace vert', 'Zone résidentielle', 'Allée arborée',
      'Aire de jeux', 'Esplanade', 'Boulevard piéton', 'Sentier'
    ];

    // ALGORITHME AMÉLIORÉ : Sélectionner des points CONSÉCUTIFS sur le contour
    // pour garantir un trajet circulaire sans croisement ni demi-tour

    // Choisir un point de départ aléatoire sur le contour
    const startIndex = Math.floor(Math.random() * coordinates.length);

    // Calculer l'espacement entre les points
    const step = Math.floor(coordinates.length / numPoints);

    const waypoints = [];

    // Parcourir le contour dans l'ordre (sens horaire ou anti-horaire)
    for (let i = 0; i < numPoints; i++) {
      const index = (startIndex + (i * step)) % coordinates.length;
      const coord = coordinates[index];

      // Placer les waypoints à 60% de la distance du contour
      // Plus proche du centre = trajet plus court et fluide
      const distanceRatio = 0.6;
      const adjustedLng = startLng + ((coord[0] - startLng) * distanceRatio);
      const adjustedLat = startLat + ((coord[1] - startLat) * distanceRatio);

      waypoints.push({
        lng: adjustedLng,
        lat: adjustedLat,
        description: placeTypes[i % placeTypes.length],
        angle: Math.atan2(adjustedLat - startLat, adjustedLng - startLng) // Pour le tri
      });
    }

    // IMPORTANT : Trier les waypoints par angle pour suivre le contour
    // Cela garantit qu'on tourne autour du point de départ sans croiser notre chemin
    waypoints.sort((a, b) => a.angle - b.angle);

    // console.log(`✅ ${waypoints.length} waypoints triés en boucle (sens horaire)`);

    // Calculer la distance estimée
    const walkingSpeedKmh = 4.5;
    const totalDistanceKm = (durationMinutes / 60) * walkingSpeedKmh;
    const radiusDegrees = (totalDistanceKm / 6.28) * 0.009; // Approximation du rayon en degrés

    // =============================================================================
    // SNAP & VALIDATION : Vérifier et corriger les waypoints problématiques
    // =============================================================================
    // console.log('🔍 Validation des waypoints (détection d\'impasses)...');

    const validatedWaypoints = await validateAndSnapWaypoints(
      waypoints,
      startLat,
      startLng,
      radiusDegrees
    );

    // console.log(`✅ ${validatedWaypoints.length} waypoints validés`);
    // console.log(`📍 ${validatedWaypoints.length} waypoints finaux`);

    return {
      estimated_distance_km: totalDistanceKm,
      action_radius_km: totalDistanceKm / 6.28, // Approximation du rayon
      num_waypoints: validatedWaypoints.length,
      waypoints: validatedWaypoints,
      isochrone_polygon: isochronePolygon // Pour affichage optionnel
    };

  } catch (error) {
    console.error('❌ Erreur lors de la génération isochrone:', error);

    // FALLBACK : Si l'API Isochrone échoue, on revient à l'ancien algorithme
    // console.log('⚠️ Fallback sur algorithme géométrique simple');
    return generateWaypointsFallback(startLat, startLng, durationMinutes);
  }
}

// Algorithme de fallback si Isochrone échoue
function generateWaypointsFallback(startLat, startLng, durationMinutes) {
  const walkingSpeedKmh = 4.5;
  const totalDistanceKm = (durationMinutes / 60) * walkingSpeedKmh;
  const actionRadius = totalDistanceKm / 8.0;
  const radiusDegrees = (actionRadius * 0.009);

  let numPoints = durationMinutes <= 15 ? 4 : durationMinutes <= 30 ? 5 : durationMinutes <= 60 ? 6 : 8;

  const waypoints = [];
  const placeTypes = [
    'Parc municipal', 'Square', 'Place publique', 'Jardin public',
    'Promenade', 'Espace vert', 'Zone résidentielle', 'Allée arborée'
  ];

  const startAngle = Math.random() * Math.PI * 2;

  for (let i = 0; i < numPoints; i++) {
    const angle = startAngle + (i * (2 * Math.PI) / numPoints);
    const lat = startLat + (Math.sin(angle) * radiusDegrees);
    const lng = startLng + (Math.cos(angle) * radiusDegrees);

    waypoints.push({
      lat: lat,
      lng: lng,
      description: placeTypes[i % placeTypes.length]
    });
  }

  return {
    estimated_distance_km: totalDistanceKm,
    action_radius_km: actionRadius,
    num_waypoints: numPoints,
    waypoints: waypoints
  };
}

// Helper pour calculer la distance entre deux points (formule Haversine)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// =============================================================================
// SNAP WAYPOINTS SUR LES INTERSECTIONS
// Évite les impasses en plaçant les waypoints sur des croisements de rues
// =============================================================================

// Trouve l'intersection de rue la plus proche d'un point donné
async function snapToNearestIntersection(lat, lng) {
  try {
    // Utiliser l'API Mapbox Map Matching pour trouver le point sur la route la plus proche
    // puis chercher des intersections à proximité

    // D'abord, on récupère les routes proches avec le reverse geocoding
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=address&limit=5&access_token=${mapboxgl.accessToken}`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      // Prendre le premier résultat (le plus proche)
      const feature = data.features[0];
      const [snappedLng, snappedLat] = feature.center;

      return {
        lat: snappedLat,
        lng: snappedLng,
        streetName: feature.text || 'Rue',
        isSnapped: true
      };
    }

    return { lat, lng, streetName: 'Point', isSnapped: false };
  } catch (error) {
    console.error('Erreur snap intersection:', error);
    return { lat, lng, streetName: 'Point', isSnapped: false };
  }
}

// Vérifie si un waypoint est sur une impasse en testant les directions possibles
async function checkIfDeadEnd(lat, lng, startLat, startLng) {
  try {
    // Tester si on peut atteindre ce point sans faire demi-tour
    // en vérifiant la géométrie de la route

    const testUrl = `https://api.mapbox.com/directions/v5/mapbox/walking/${startLng},${startLat};${lng},${lat}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

    const response = await fetch(testUrl);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coords = route.geometry.coordinates;

      // Analyser si le chemin fait un "crochet" (entre dans une rue puis ressort)
      // En comparant la direction au début et à la fin du segment
      if (coords.length >= 4) {
        // Direction au début
        const startDir = Math.atan2(
          coords[1][1] - coords[0][1],
          coords[1][0] - coords[0][0]
        );

        // Direction avant le point d'arrivée
        const endIdx = coords.length - 1;
        const preEndDir = Math.atan2(
          coords[endIdx][1] - coords[endIdx - 1][1],
          coords[endIdx][0] - coords[endIdx - 1][0]
        );

        // Si la direction change de plus de 120°, c'est probablement une impasse
        const angleDiff = Math.abs(startDir - preEndDir);
        const normalizedDiff = angleDiff > Math.PI ? 2 * Math.PI - angleDiff : angleDiff;

        return normalizedDiff > (2 * Math.PI / 3); // > 120°
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

// Génère des waypoints alternatifs si un point est sur une impasse
function generateAlternativePoint(lat, lng, startLat, startLng, angle, radiusDegrees) {
  // Décaler légèrement le point le long du contour
  const offsetAngle = angle + (Math.PI / 8); // Décaler de 22.5°
  const newLat = startLat + (Math.sin(offsetAngle) * radiusDegrees * 0.8);
  const newLng = startLng + (Math.cos(offsetAngle) * radiusDegrees * 0.8);

  return { lat: newLat, lng: newLng };
}

// =============================================================================
// VALIDATION COMPLÈTE DES WAYPOINTS
// Teste chaque séquence de 3 points pour détecter les impasses
// =============================================================================
async function validateAndSnapWaypoints(waypoints, startLat, startLng, radiusDegrees) {
  // console.log('🔍 Validation des waypoints par test de routing...');

  const validatedWaypoints = [];

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const prevPoint = i === 0
      ? { lng: startLng, lat: startLat }
      : validatedWaypoints[validatedWaypoints.length - 1] || { lng: startLng, lat: startLat };
    const nextPoint = i === waypoints.length - 1
      ? { lng: startLng, lat: startLat }
      : waypoints[i + 1];

    // Tester si le passage par ce waypoint crée une impasse
    const isDeadEnd = await testWaypointCausesDeadEnd(
      prevPoint.lng, prevPoint.lat,
      wp.lng, wp.lat,
      nextPoint.lng, nextPoint.lat
    );

    if (isDeadEnd) {
      // console.log(`⚠️ Waypoint ${i + 1} détecté comme impasse, recherche d'alternative...`);

      // Essayer de trouver un point alternatif
      const alternative = await findAlternativeWaypoint(
        wp, prevPoint, nextPoint, startLat, startLng, radiusDegrees
      );

      if (alternative) {
        // console.log(`✅ Alternative trouvée pour waypoint ${i + 1}`);
        validatedWaypoints.push(alternative);
      } else {
        // Si pas d'alternative, on saute ce waypoint
        // console.log(`❌ Pas d'alternative, waypoint ${i + 1} ignoré`);
      }
    } else {
      validatedWaypoints.push(wp);
    }

    // Petite pause pour l'API
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // S'assurer qu'on a au moins 3 waypoints
  if (validatedWaypoints.length < 3) {
    // console.log('⚠️ Pas assez de waypoints valides, on garde les originaux');
    return waypoints;
  }

  // Re-trier par angle
  validatedWaypoints.sort((a, b) => {
    const angleA = Math.atan2(a.lat - startLat, a.lng - startLng);
    const angleB = Math.atan2(b.lat - startLat, b.lng - startLng);
    return angleA - angleB;
  });

  return validatedWaypoints;
}

// Teste si un waypoint crée une impasse en vérifiant le routing prev -> wp -> next
async function testWaypointCausesDeadEnd(prevLng, prevLat, wpLng, wpLat, nextLng, nextLat) {
  try {
    // Obtenir la route prev -> wp -> next
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${prevLng},${prevLat};${wpLng},${wpLat};${nextLng},${nextLat}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coords = route.geometry.coordinates;

      // Analyser la géométrie pour détecter un demi-tour
      // On cherche si on repasse par des points déjà visités
      const gridSize = 0.0002; // ~20m de précision
      const visited = new Map();
      let backtrackCount = 0;

      for (let i = 0; i < coords.length; i++) {
        const gridKey = `${Math.floor(coords[i][0] / gridSize)},${Math.floor(coords[i][1] / gridSize)}`;

        if (visited.has(gridKey)) {
          backtrackCount++;
        } else {
          visited.set(gridKey, i);
        }
      }

      // Si plus de 20% de la route est en backtrack, c'est une impasse
      const backtrackRatio = backtrackCount / coords.length;

      if (backtrackRatio > 0.2) {
        // console.log(`  📊 Waypoint: backtrack ratio = ${(backtrackRatio * 100).toFixed(1)}%`);
        return true;
      }

      // Vérifier aussi la distance : si la route est 2x plus longue que le vol d'oiseau
      const directDistance = getDistance(prevLat, prevLng, nextLat, nextLng);
      const routeDistance = route.distance / 1000; // km

      if (routeDistance > directDistance * 2.5 && directDistance > 0.05) {
        // console.log(`  📊 Waypoint: route ${routeDistance.toFixed(2)}km vs direct ${directDistance.toFixed(2)}km`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Erreur test impasse:', error);
    return false;
  }
}

// Trouve un waypoint alternatif qui n'est pas une impasse
async function findAlternativeWaypoint(wp, prevPoint, nextPoint, startLat, startLng, radiusDegrees) {
  const currentAngle = Math.atan2(wp.lat - startLat, wp.lng - startLng);

  // Essayer plusieurs décalages
  const offsets = [0.15, -0.15, 0.3, -0.3, 0.5, -0.5]; // En radians

  for (const offset of offsets) {
    const newAngle = currentAngle + offset;
    const newLat = startLat + (Math.sin(newAngle) * radiusDegrees * 0.6);
    const newLng = startLng + (Math.cos(newAngle) * radiusDegrees * 0.6);

    // Tester ce point alternatif
    const isDeadEnd = await testWaypointCausesDeadEnd(
      prevPoint.lng, prevPoint.lat,
      newLng, newLat,
      nextPoint.lng, nextPoint.lat
    );

    if (!isDeadEnd) {
      return {
        lng: newLng,
        lat: newLat,
        description: wp.description + ' (optimisé)',
        angle: newAngle
      };
    }
  }

  return null; // Pas d'alternative trouvée
}

// Enrichir les waypoints avec des vrais noms de lieux via Mapbox Geocoding API
async function enrichWaypointsWithRealPOI(waypoints) {
  // console.log('🔍 Enrichissement des POI avec vrais noms de lieux...');

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];

    try {
      // Appel à l'API Mapbox Geocoding (reverse geocoding)
      // Types de lieux à privilégier : poi (points d'intérêt), address (adresses), neighborhood (quartiers)
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${wp.lng},${wp.lat}.json?types=poi,address,neighborhood&limit=1&access_token=${mapboxgl.accessToken}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];

        // Extraire le nom du lieu
        let placeName = feature.text || feature.place_name;

        // Si c'est un POI, on garde le nom
        if (feature.place_type.includes('poi')) {
          placeName = feature.text; // Ex: "Parc de la Tête d'Or", "Starbucks", etc.
        }
        // Si c'est une adresse, on extrait la rue
        else if (feature.place_type.includes('address')) {
          placeName = feature.text; // Ex: "Rue de la République"
        }
        // Si c'est un quartier
        else if (feature.place_type.includes('neighborhood')) {
          placeName = `Quartier ${feature.text}`;
        }

        // Mettre à jour la description du waypoint
        wp.description = placeName;

        // console.log(`✅ Point ${i + 1}: ${placeName}`);
      } else {
        // Pas de résultat, on garde la description générique
        // console.log(`⚠️ Point ${i + 1}: Aucun lieu trouvé, garde "${wp.description}"`);
      }

      // Petite pause pour respecter les limites de l'API (600 req/min)
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`❌ Erreur lors de la récupération du POI pour le point ${i + 1}:`, error);
      // En cas d'erreur, on garde la description générique
    }
  }

  // console.log('✅ Enrichissement des POI terminé');
}

/**
 * =============================================================================
 * SYSTÈME LLM - Vérification et optimisation de l'itinéraire
 * =============================================================================
 * Utilise un LLM pour détecter les aller-retours et REPOSITIONNER les waypoints
 */

// Optimise l'itinéraire avec le LLM - repositionne les waypoints problématiques
async function optimizeRouteWithLLM(startLat, startLng, waypoints, routeGeometry, streetNames) {
  if (!LLM_CONFIG.enabled || LLM_CONFIG.apiKey === 'VOTRE_CLE_API_OPENAI') {
    // console.log('⚠️ LLM désactivé - Utilisation de l\'optimisation locale');
    return optimizeRouteLocally(startLat, startLng, waypoints, routeGeometry);
  }

  // console.log('🤖 Optimisation de l\'itinéraire par LLM...');

  const prompt = `Tu es un expert en optimisation d'itinéraires de promenade.

PROBLÈME : L'itinéraire actuel contient des "impasses" où on entre dans une rue puis on ressort par le même chemin (forme de peigne/dents).

OBJECTIF : Repositionner les waypoints pour créer un itinéraire en BOUCLE FLUIDE sans jamais repasser au même endroit.

DONNÉES ACTUELLES :
- Point de départ : [${startLng.toFixed(6)}, ${startLat.toFixed(6)}]
- Waypoints actuels :
${waypoints.map((wp, i) => `  ${i + 1}. [${wp.lng.toFixed(6)}, ${wp.lat.toFixed(6)}] - ${wp.description}`).join('\n')}

- Rues traversées (dans l'ordre) : ${streetNames.join(' → ')}

RÈGLES D'OPTIMISATION :
1. Les waypoints doivent former une boucle autour du point de départ
2. Chaque waypoint doit être sur une rue DIFFÉRENTE (pas d'impasse)
3. L'ordre des waypoints doit suivre un sens horaire ou anti-horaire
4. Déplacer légèrement les waypoints vers des INTERSECTIONS de rues (pas au milieu d'une rue)
5. Garder approximativement la même distance totale

RÉPONDS EN JSON STRICT :
{
  "optimized": true,
  "reason": "explication des changements",
  "newWaypoints": [
    {"lng": 2.xxxxx, "lat": 48.xxxxx, "description": "Intersection Rue X / Rue Y"},
    {"lng": 2.xxxxx, "lat": 48.xxxxx, "description": "Intersection Rue A / Rue B"}
  ],
  "removedPoints": [0, 2],
  "confidence": 0.85
}

Si l'itinéraire est déjà optimal, réponds :
{
  "optimized": false,
  "reason": "L'itinéraire est déjà optimal",
  "confidence": 1.0
}`;

  try {
    const response = await fetch(LLM_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: LLM_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en cartographie et optimisation d\'itinéraires. Tu connais bien la géographie urbaine. Réponds UNIQUEMENT en JSON valide sans markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      let content = data.choices[0].message.content;
      // Nettoyer le contenu (enlever les backticks markdown si présents)
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      try {
        const optimization = JSON.parse(content);
        // console.log('🤖 Optimisation LLM:', optimization);

        if (optimization.optimized && optimization.newWaypoints && optimization.newWaypoints.length > 0) {
          // console.log(`✅ LLM propose ${optimization.newWaypoints.length} nouveaux waypoints`);
          return {
            success: true,
            waypoints: optimization.newWaypoints,
            reason: optimization.reason,
            confidence: optimization.confidence || 0.8
          };
        } else {
          // console.log('✅ LLM: Itinéraire déjà optimal');
          return { success: false, reason: optimization.reason };
        }
      } catch (parseError) {
        console.error('❌ Erreur parsing JSON LLM:', parseError);
        // console.log('Contenu reçu:', content);
      }
    }

    console.warn('⚠️ Réponse LLM invalide, utilisation de l\'optimisation locale');
    return optimizeRouteLocally(startLat, startLng, waypoints, routeGeometry);

  } catch (error) {
    console.error('❌ Erreur LLM:', error);
    return optimizeRouteLocally(startLat, startLng, waypoints, routeGeometry);
  }
}

// Optimisation locale (sans LLM) - Algorithme de lissage
function optimizeRouteLocally(startLat, startLng, waypoints, routeGeometry) {
  // console.log('🔧 Optimisation locale de l\'itinéraire...');

  // Analyser la géométrie pour détecter les "dents" (aller-retours)
  if (!routeGeometry || !routeGeometry.coordinates) {
    return { success: false, reason: 'Pas de géométrie disponible' };
  }

  const coords = routeGeometry.coordinates;
  const problems = detectBacktrackSegments(coords);

  if (problems.length === 0) {
    // console.log('✅ Aucun problème détecté localement');
    return { success: false, reason: 'Itinéraire OK' };
  }

  // console.log(`⚠️ ${problems.length} segments problématiques détectés`);

  // Stratégie : Réorganiser les waypoints pour éviter les impasses
  // On garde seulement les waypoints qui sont sur des "vraies" intersections
  const optimizedWaypoints = waypoints.filter((wp, index) => {
    // Garder les points aux extrémités et ceux qui ne causent pas d'impasse
    return !problems.some(p => p.waypointIndex === index);
  });

  if (optimizedWaypoints.length < 3) {
    // Pas assez de points, on régénère avec un rayon plus petit
    // console.log('⚠️ Trop de points supprimés, génération de nouveaux waypoints');
    return {
      success: true,
      regenerate: true,
      reason: 'Trop d\'impasses détectées, régénération nécessaire'
    };
  }

  return {
    success: true,
    waypoints: optimizedWaypoints,
    reason: `${waypoints.length - optimizedWaypoints.length} waypoints problématiques supprimés`
  };
}

// Détecte les segments qui forment des "dents" (aller-retour)
function detectBacktrackSegments(coordinates) {
  const problems = [];
  const visited = new Map();

  // Grille pour détecter les passages multiples
  const gridSize = 0.0005; // ~50m

  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i];
    const gridKey = `${Math.floor(coord[0] / gridSize)},${Math.floor(coord[1] / gridSize)}`;

    if (visited.has(gridKey)) {
      const firstVisit = visited.get(gridKey);
      // Si on repasse au même endroit après plus de 5 points, c'est un aller-retour
      if (i - firstVisit > 5) {
        problems.push({
          type: 'backtrack',
          startIndex: firstVisit,
          endIndex: i,
          coordinate: coord
        });
      }
    } else {
      visited.set(gridKey, i);
    }
  }

  return problems;
}

// Analyse l'itinéraire (ancienne fonction, maintenant wrapper)
async function analyzeRouteWithLLM(routeGeometry, waypoints, streetNames) {
  // Analyse simple pour affichage
  const problems = [];
  const streetCount = {};

  streetNames.forEach(street => {
    if (street && street.trim()) {
      const normalized = street.toLowerCase().trim();
      streetCount[normalized] = (streetCount[normalized] || 0) + 1;
    }
  });

  for (const [street, count] of Object.entries(streetCount)) {
    if (count > 1) {
      problems.push(`"${street}" traversée ${count}x`);
    }
  }

  const backtrackSegments = detectBacktrackSegments(routeGeometry.coordinates);

  return {
    hasBacktrack: problems.length > 0 || backtrackSegments.length > 0,
    problems: problems,
    backtrackCount: backtrackSegments.length,
    severity: problems.length === 0 ? 'none' : problems.length <= 2 ? 'minor' : 'major',
    suggestions: problems.length > 0 ? ['Cliquez sur "Optimiser avec IA" pour améliorer'] : []
  };
}

// Détecte les croisements dans un itinéraire
function detectRouteCrossings(coordinates) {
  let crossings = 0;

  // Vérifier si deux segments non adjacents se croisent
  for (let i = 0; i < coordinates.length - 3; i++) {
    const seg1Start = coordinates[i];
    const seg1End = coordinates[i + 1];

    for (let j = i + 2; j < coordinates.length - 1; j++) {
      const seg2Start = coordinates[j];
      const seg2End = coordinates[j + 1];

      if (segmentsIntersect(seg1Start, seg1End, seg2Start, seg2End)) {
        crossings++;
      }
    }
  }

  return crossings;
}

// Vérifie si deux segments se croisent
function segmentsIntersect(p1, p2, p3, p4) {
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

function direction(p1, p2, p3) {
  return (p3[0] - p1[0]) * (p2[1] - p1[1]) - (p2[0] - p1[0]) * (p3[1] - p1[1]);
}

// Récupère les noms de rues le long de l'itinéraire
async function getStreetNamesAlongRoute(routeGeometry) {
  const streetNames = [];
  const coordinates = routeGeometry.coordinates;

  // Échantillonner quelques points le long de l'itinéraire
  const sampleCount = Math.min(10, Math.floor(coordinates.length / 5));
  const step = Math.floor(coordinates.length / sampleCount);

  for (let i = 0; i < coordinates.length; i += step) {
    const coord = coordinates[i];
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coord[0]},${coord[1]}.json?types=address&limit=1&access_token=${mapboxgl.accessToken}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features[0]) {
        const streetName = data.features[0].text;
        // Éviter les doublons consécutifs
        if (streetNames.length === 0 || streetNames[streetNames.length - 1] !== streetName) {
          streetNames.push(streetName);
        }
      }

      // Pause pour respecter les limites de l'API
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.warn('Erreur lors de la récupération du nom de rue:', error);
    }
  }

  // console.log('🛣️ Rues traversées:', streetNames);
  return streetNames;
}

// Affiche le résultat de l'analyse à l'utilisateur
function displayRouteAnalysis(analysis) {
  if (analysis.severity === 'none') {
    // console.log('✅ Itinéraire optimal - Aucun aller-retour détecté !');
    return;
  }

  let message = '⚠️ ANALYSE DE L\'ITINÉRAIRE\n\n';

  if (analysis.hasBacktrack) {
    message += '🔄 Des aller-retours ont été détectés :\n';
    analysis.problems.forEach(problem => {
      message += `  • ${problem}\n`;
    });
    message += '\n';
  }

  if (analysis.suggestions.length > 0) {
    message += '💡 Suggestions :\n';
    analysis.suggestions.forEach(suggestion => {
      message += `  • ${suggestion}\n`;
    });
  }

  // Afficher dans la console avec style
  if (analysis.severity === 'major') {
    console.warn(message);
  } else {
    // console.log(message);
  }

  // Optionnel : Afficher une alerte pour les problèmes majeurs
  if (analysis.severity === 'major') {
    const userChoice = confirm(
      `${message}\n\nVoulez-vous régénérer l'itinéraire ?`
    );
    return userChoice; // true = régénérer
  }

  return false;
}

// =============================================================================

// Trace l'itinéraire sur la carte avec Mapbox Directions API
async function drawRoute(startLat, startLng, waypoints) {
  const start = [startLng, startLat];

  // Limiter le nombre de waypoints (Mapbox limite à 25 coordonnées max)
  // On garde le départ + max 23 waypoints pour rester sous la limite
  let limitedWaypoints = waypoints;
  if (waypoints.length > 20) {
    // Échantillonner les waypoints pour en garder moins
    const step = Math.ceil(waypoints.length / 20);
    limitedWaypoints = waypoints.filter((_, index) => index % step === 0);
    // console.log(`⚠️ Waypoints réduits de ${waypoints.length} à ${limitedWaypoints.length}`);
  }

  // Construire la liste des coordonnées : Départ -> Points -> Retour au départ
  const coordinates = [
    start, // Le point de départ
    ...limitedWaypoints.map(wp => [wp.lng, wp.lat]), // Les points de passage
    start // Retour au point de départ (boucle fermée)
  ];

  // console.log(`📍 Coordonnées pour l'API: ${coordinates.length} points`);

  // Construction de l'URL pour l'API Mapbox Directions
  // IMPORTANT : Utiliser le profil "walking" pour éviter les autoroutes
  // On ajoute le point de départ à la fin pour créer une boucle
  const coordinatesString = coordinates.map(coord => coord.join(',')).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinatesString}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

  // console.log('🛣️ Appel Mapbox Directions API...');
  // console.log('URL:', url);

  try {
    const response = await fetch(url);
    const data = await response.json();

    // console.log('📦 Réponse Directions API:', data);

    // Gérer les erreurs de l'API
    if (data.code && data.code !== 'Ok') {
      console.error('❌ Erreur API Mapbox:', data.code, data.message);
      return null;
    }

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];

      // console.log('✅ Route trouvée:', {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry ? 'OK' : 'MANQUANTE'
      });

      // Vérifier que la géométrie existe
      if (!route.geometry || !route.geometry.coordinates || route.geometry.coordinates.length === 0) {
        console.error('❌ Géométrie de route invalide');
        return null;
      }

      // Supprimer l'ancienne route si elle existe AVANT d'ajouter la nouvelle
      if (map.getLayer('route')) {
        map.removeLayer('route');
      }
      if (map.getSource('route')) {
        map.removeSource('route');
      }

      // Ajouter le nouvel itinéraire à la carte
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry
        }
      });

      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#1E3A5F', // Couleur Marine de la charte
          'line-width': 5,
          'line-opacity': 0.9
        }
      });

      // console.log('✅ Route ajoutée à la carte');

      // ANALYSE LLM : Vérifier les aller-retours
      // console.log('🤖 Lancement de l\'analyse de l\'itinéraire...');
      const streetNames = await getStreetNamesAlongRoute(route.geometry);
      const analysis = await analyzeRouteWithLLM(route.geometry, limitedWaypoints, streetNames);

      // Stocker l'analyse pour usage ultérieur
      const routeResult = {
        distance: (route.distance / 1000).toFixed(2), // en km
        duration: Math.round(route.duration / 60), // en minutes
        geometry: route.geometry,
        analysis: analysis
      };

      // Afficher l'analyse
      displayRouteAnalysis(analysis);

      // Retourner les infos de la route
      return routeResult;
    } else {
      console.error('❌ Aucune route trouvée dans la réponse:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur lors du tracé de l\'itinéraire:', error);
    return null;
  }
}

// Gestionnaire de soumission du formulaire
async function handleFormSubmit(event) {
  event.preventDefault();

  const dogName = document.getElementById('dog-name').value;
  const duration = parseInt(document.getElementById('walk-duration').value);
  const walkType = document.querySelector('.btn-toggle.active').textContent.trim();

  if (!dogName) {
    alert('Veuillez entrer le nom de votre chien');
    return;
  }

  // Vérifier que la carte et le marqueur sont prêts
  if (!map || !startPointMarker) {
    alert('La carte n\'est pas encore chargée. Veuillez patienter quelques secondes.');
    return;
  }

  // Vérifier que le style de la carte est chargé
  if (!map.isStyleLoaded()) {
    alert('La carte est en cours de chargement. Veuillez patienter quelques secondes.');
    return;
  }

  // console.log('🚀 Génération de la balade...');

  // Point de départ : utiliser la position du marqueur rouge
  const startPosition = startPointMarker.getLngLat();
  const startLat = startPosition.lat;
  const startLng = startPosition.lng;

  // console.log('📍 Point de départ:', { lat: startLat, lng: startLng });

  // NETTOYAGE COMPLET : Supprimer TOUS les anciens éléments SAUF le point de départ
  // console.log('🧹 Nettoyage des anciens éléments...');

  // 1. Supprimer l'ancienne route si elle existe
  if (map.getLayer('route')) {
    map.removeLayer('route');
    // console.log('  - Layer route supprimé');
  }
  if (map.getSource('route')) {
    map.removeSource('route');
    // console.log('  - Source route supprimée');
  }

  // 2. Supprimer l'ancienne zone isochrone si elle existe
  if (map.getLayer('isochrone-fill')) {
    map.removeLayer('isochrone-fill');
  }
  if (map.getLayer('isochrone-outline')) {
    map.removeLayer('isochrone-outline');
  }
  if (map.getSource('isochrone')) {
    map.removeSource('isochrone');
    // console.log('  - Source isochrone supprimée');
  }

  // 3. Supprimer tous les marqueurs de waypoints (pas le marqueur de départ)
  // On stocke une référence aux marqueurs de waypoints pour les supprimer
  if (window.waypointMarkers) {
    window.waypointMarkers.forEach(marker => marker.remove());
    // console.log(`  - ${window.waypointMarkers.length} marqueurs waypoints supprimés`);
  }
  window.waypointMarkers = [];

  // GÉNÉRATION DE L'ITINÉRAIRE avec API Isochrone
  const routeData = await generateWaypoints(startLat, startLng, duration);

  // console.log('📍 Itinéraire généré:', {
    chien: dogName,
    duree_demandee: duration + ' min',
    distance_estimee: routeData.estimated_distance_km.toFixed(2) + ' km',
    rayon_action: routeData.action_radius_km.toFixed(2) + ' km',
    nombre_waypoints: routeData.num_waypoints,
    type: walkType,
    waypoints: routeData.waypoints
  });

  // Mettre à jour le popup du marqueur de départ
  startPointMarker.setPopup(
    new mapboxgl.Popup({ offset: 25 })
      .setHTML(`<h3>🏁 Départ</h3><p>Balade de ${dogName}</p>`)
  );

  // Afficher la zone isochrone si disponible (zone accessible)
  if (routeData.isochrone_polygon) {
    map.addSource('isochrone', {
      type: 'geojson',
      data: routeData.isochrone_polygon
    });

    // Remplissage de la zone (semi-transparent)
    map.addLayer({
      id: 'isochrone-fill',
      type: 'fill',
      source: 'isochrone',
      paint: {
        'fill-color': '#A3B5D9', // Couleur primaire de la charte
        'fill-opacity': 0.15
      }
    });

    // Contour de la zone
    map.addLayer({
      id: 'isochrone-outline',
      type: 'line',
      source: 'isochrone',
      paint: {
        'line-color': '#A3B5D9',
        'line-width': 2,
        'line-opacity': 0.5,
        'line-dasharray': [2, 2] // Ligne pointillée
      }
    });

    // console.log('✅ Zone isochrone affichée sur la carte');
  }

  // Récupérer les vrais noms de lieux avec Mapbox Geocoding API
  await enrichWaypointsWithRealPOI(routeData.waypoints);

  // Ajouter des marqueurs pour chaque waypoint (DRAGGABLES pour modification manuelle)
  routeData.waypoints.forEach((wp, index) => {
    const marker = new mapboxgl.Marker({
      color: '#A3B5D9',
      draggable: true // IMPORTANT : Rendre le marqueur déplaçable
    })
      .setLngLat([wp.lng, wp.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(`<h3>📍 Point ${index + 1} (modifiable)</h3><p>${wp.description}</p><p style="font-size: 0.8rem; color: #64748B; margin-top: 0.5rem;">💡 Déplacez-moi pour ajuster l'itinéraire</p>`)
      )
      .addTo(map);

    // Stocker l'index du waypoint avec le marqueur
    marker._waypointIndex = index;

    // Mettre à jour l'itinéraire quand le waypoint est déplacé
    marker.on('dragend', async () => {
      const newLngLat = marker.getLngLat();
      // console.log(`📍 Waypoint ${index + 1} déplacé vers:`, newLngLat);

      // Mettre à jour les coordonnées du waypoint
      routeData.waypoints[index].lng = newLngLat.lng;
      routeData.waypoints[index].lat = newLngLat.lat;

      // Régénérer l'itinéraire avec les nouvelles positions
      // console.log('🔄 Mise à jour de l\'itinéraire...');
      const startPosition = startPointMarker.getLngLat();
      await drawRoute(startPosition.lat, startPosition.lng, routeData.waypoints);

      // Mettre à jour le popup avec la nouvelle adresse
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${newLngLat.lng},${newLngLat.lat}.json?types=poi,address&limit=1&access_token=${mapboxgl.accessToken}`;
      try {
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        if (data.features && data.features[0]) {
          const newDescription = data.features[0].text || 'Point modifié';
          routeData.waypoints[index].description = newDescription;
          marker.setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`<h3>📍 Point ${index + 1} (modifié)</h3><p>${newDescription}</p><p style="font-size: 0.8rem; color: #64748B; margin-top: 0.5rem;">💡 Déplacez-moi pour ajuster</p>`)
          );
        }
      } catch (error) {
        console.warn('Erreur lors de la récupération du nom du lieu:', error);
      }
    });

    // Stocker la référence pour pouvoir le supprimer plus tard
    window.waypointMarkers.push(marker);
  });

  // console.log(`✅ ${routeData.waypoints.length} marqueurs de waypoints ajoutés`);

  // Stocker les données pour l'optimisation
  window.currentRouteData = routeData;
  window.currentStreetNames = routeData.waypoints.map(wp => wp.description);

  // Tracer l'itinéraire avec Mapbox Directions API
  // console.log('🗺️ Traçage de l\'itinéraire...');
  const routeInfo = await drawRoute(startLat, startLng, routeData.waypoints);

  if (routeInfo) {
    // Stocker aussi la géométrie pour l'optimisation
    window.currentRouteData.geometry = routeInfo.geometry;

    // Vérifier si le timing est respecté
    const durationDiff = Math.abs(routeInfo.duration - duration);
    const durationDiffPercent = (durationDiff / duration) * 100;

    // Log pour debug
    // console.log('⏱️ Analyse du timing:', {
      duree_demandee: duration + ' min',
      duree_reelle: routeInfo.duration + ' min',
      difference: durationDiff + ' min',
      ecart_pourcent: durationDiffPercent.toFixed(1) + '%',
      distance_reelle: routeInfo.distance + ' km'
    });

    // Message avec indication de précision
    let timingMessage = '';
    if (durationDiffPercent < 10) {
      timingMessage = '🎯 Timing parfait !';
    } else if (durationDiffPercent < 20) {
      timingMessage = '✅ Timing respecté';
    } else {
      timingMessage = `⚠️ Écart de ${durationDiff} min`;
    }

    alert(`✅ Balade générée pour ${dogName} !\n\n` +
          `📏 Distance réelle : ${routeInfo.distance} km\n` +
          `⏱️ Durée réelle : ${routeInfo.duration} min (demandé: ${duration} min)\n` +
          `${timingMessage}\n` +
          `🎯 Type : ${walkType}\n` +
          `📍 Points de passage : ${routeData.num_waypoints} waypoints\n` +
          `🔄 Rayon d'action : ${routeData.action_radius_km.toFixed(2)} km\n\n` +
          `💡 Cliquez sur les marqueurs pour plus d'infos !`);
  } else {
    alert(`⚠️ Itinéraire généré pour ${dogName} !\n` +
          `📏 Distance estimée : ${routeData.estimated_distance_km.toFixed(2)} km\n` +
          `⏱️ Durée : ${duration} min\n` +
          `🎯 Type : ${walkType}\n` +
          `📍 Points de passage : ${routeData.num_waypoints} waypoints`);
  }

  // Masquer le formulaire et afficher les options de navigation
  const walkForm = document.querySelector('.walk-form');
  if (walkForm) {
    walkForm.style.display = 'none';
  }

  // Afficher le bouton de navigation
  const navigationSection = document.getElementById('navigation-section');
  if (navigationSection) {
    navigationSection.style.display = 'block';
  }

  // Afficher le bouton flottant de navigation sur la carte
  const startNavButton = document.getElementById('start-nav-button');
  if (startNavButton) {
    startNavButton.classList.add('visible');
  }

  // Afficher le bouton d'optimisation si des problèmes sont détectés
  if (routeInfo && routeInfo.analysis && routeInfo.analysis.hasBacktrack) {
    const optimizeSection = document.getElementById('optimize-section');
    const optimizeDetails = document.getElementById('optimize-details');

    optimizeSection.style.display = 'block';
    optimizeDetails.textContent = routeInfo.analysis.problems.join(', ') ||
      `${routeInfo.analysis.backtrackCount || 'Plusieurs'} segments en aller-retour détectés`;
  } else {
    document.getElementById('optimize-section').style.display = 'none';
  }

  // Ajuster la vue pour montrer tout l'itinéraire
  const bounds = new mapboxgl.LngLatBounds();
  bounds.extend([startLng, startLat]);
  routeData.waypoints.forEach(wp => bounds.extend([wp.lng, wp.lat]));

  map.fitBounds(bounds, {
    padding: 80,
    maxZoom: 15
  });
}

// Stocker les données actuelles pour l'optimisation
window.currentRouteData = null;
window.currentStreetNames = null;

// Fonction pour optimiser l'itinéraire actuel avec l'IA
window.optimizeCurrentRoute = async function() {
  if (!window.currentRouteData || !startPointMarker) {
    alert('Veuillez d\'abord générer un itinéraire');
    return;
  }

  if (!LLM_CONFIG.enabled) {
    alert('⚠️ L\'IA n\'est pas activée.\n\nVeuillez entrer votre clé API OpenAI dans la section "Configuration IA" ci-dessus.');
    return;
  }

  const startPosition = startPointMarker.getLngLat();
  const startLat = startPosition.lat;
  const startLng = startPosition.lng;

  // console.log('🤖 Lancement de l\'optimisation IA...');

  // Afficher un loader
  const optimizeSection = document.getElementById('optimize-section');
  optimizeSection.innerHTML = '<p style="color: #92400e;">🔄 Optimisation en cours...</p>';

  try {
    const optimization = await optimizeRouteWithLLM(
      startLat,
      startLng,
      window.currentRouteData.waypoints,
      window.currentRouteData.geometry,
      window.currentStreetNames || []
    );

    if (optimization.success && optimization.waypoints) {
      // console.log('✅ Nouveaux waypoints reçus de l\'IA:', optimization.waypoints);

      // Nettoyer les anciens marqueurs et route
      if (window.waypointMarkers) {
        window.waypointMarkers.forEach(marker => marker.remove());
      }
      window.waypointMarkers = [];

      if (map.getLayer('route')) map.removeLayer('route');
      if (map.getSource('route')) map.removeSource('route');

      // Ajouter les nouveaux waypoints
      const newWaypoints = optimization.waypoints.map(wp => ({
        lng: wp.lng,
        lat: wp.lat,
        description: wp.description || 'Point optimisé'
      }));

      // Ajouter les marqueurs
      newWaypoints.forEach((wp, index) => {
        const marker = new mapboxgl.Marker({ color: '#22c55e' }) // Vert pour optimisé
          .setLngLat([wp.lng, wp.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`<h3>📍 Point ${index + 1} (optimisé)</h3><p>${wp.description}</p>`)
          )
          .addTo(map);
        window.waypointMarkers.push(marker);
      });

      // Tracer le nouvel itinéraire
      const routeInfo = await drawRoute(startLat, startLng, newWaypoints);

      if (routeInfo) {
        // Masquer le bandeau d'optimisation
        document.getElementById('optimize-section').style.display = 'none';

        alert(`✅ Itinéraire optimisé !\n\n` +
              `${optimization.reason}\n\n` +
              `📏 Nouvelle distance : ${routeInfo.distance} km\n` +
              `⏱️ Nouvelle durée : ${routeInfo.duration} min`);
      }
    } else if (optimization.regenerate) {
      // Régénérer complètement
      regenerateRoute();
    } else {
      optimizeSection.innerHTML = `
        <p style="color: #22c55e; margin: 0;">✅ ${optimization.reason || 'L\'itinéraire est déjà optimal'}</p>
      `;
    }
  } catch (error) {
    console.error('❌ Erreur optimisation:', error);
    optimizeSection.innerHTML = `
      <p style="color: #dc2626; margin: 0;">❌ Erreur lors de l'optimisation</p>
      <button type="button" class="btn btn-secondary btn-sm" onclick="regenerateRoute()" style="margin-top: 0.5rem;">
        🔄 Régénérer à la place
      </button>
    `;
  }
}

// Fonction pour régénérer l'itinéraire
window.regenerateRoute = function() {
  document.getElementById('optimize-section').style.display = 'none';
  document.querySelector('.walk-form').dispatchEvent(new Event('submit'));
}

// =============================================================================
// SYSTÈME DE NAVIGATION GPS AVEC MAPBOX
// Navigation turn-by-turn intégrée avec suivi GPS en temps réel
// =============================================================================

let navigationState = {
  active: false,
  instructions: [],
  currentStep: 0,
  userMarker: null,
  watchId: null,
  voiceEnabled: false,
  totalDistance: 0,
  totalDuration: 0
};

// Récupère les instructions de navigation depuis Mapbox Directions API
async function getNavigationInstructions(startLng, startLat, waypoints) {
  try {
    // Construire l'URL avec tous les waypoints
    const coordinates = [
      [startLng, startLat],
      ...waypoints.map(wp => [wp.lng, wp.lat]),
      [startLng, startLat] // Retour au point de départ
    ];

    const coordinatesString = coordinates.map(coord => coord.join(',')).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinatesString}?steps=true&banner_instructions=true&voice_instructions=true&geometries=geojson&access_token=${mapboxgl.accessToken}`;

    // console.log('🧭 Récupération des instructions de navigation...');

    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      // console.log('✅ Instructions récupérées:', route.legs);

      return {
        instructions: route.legs.flatMap(leg => leg.steps),
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry
      };
    }

    throw new Error('Aucun itinéraire trouvé');
  } catch (error) {
    console.error('❌ Erreur récupération instructions:', error);
    throw error;
  }
}

// Démarre la navigation GPS
window.startNavigation = async function() {
  if (!window.currentRouteData || !startPointMarker) {
    alert('❌ Aucun itinéraire disponible.\n\nVeuillez d\'abord générer un itinéraire.');
    return;
  }

  // Cacher le bouton de navigation flottant
  const startNavButton = document.getElementById('start-nav-button');
  if (startNavButton) {
    startNavButton.classList.remove('visible');
  }

  const dogName = document.getElementById('dog-name').value || 'votre chien';
  const confirmMessage = `🧭 Démarrer la navigation GPS ?\n\n` +
    `🐕 Balade de ${dogName}\n` +
    `📏 Distance : ${window.currentRouteData.estimated_distance_km?.toFixed(2)} km\n` +
    `📍 Itinéraire avec ${window.currentRouteData.waypoints.length} points\n\n` +
    `La navigation utilisera votre GPS pour vous guider.`;

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    // Demander l'autorisation de géolocalisation
    if (!navigator.geolocation) {
      alert('❌ La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }

    // Afficher le panneau de navigation
    const panel = document.getElementById('navigation-panel');
    panel.classList.add('active');

    document.getElementById('nav-dog-name').textContent = `Balade de ${dogName}`;
    document.getElementById('nav-instruction').textContent = 'Récupération de votre position...';

    // Récupérer les instructions de navigation
    const startPosition = startPointMarker.getLngLat();
    const navData = await getNavigationInstructions(
      startPosition.lng,
      startPosition.lat,
      window.currentRouteData.waypoints
    );

    navigationState.instructions = navData.instructions;
    navigationState.totalDistance = (navData.distance / 1000).toFixed(2);
    navigationState.totalDuration = Math.round(navData.duration / 60);
    navigationState.currentStep = 0;
    navigationState.active = true;

    // Mettre à jour l'interface
    document.getElementById('nav-distance-total').textContent = `${navigationState.totalDistance} km`;
    document.getElementById('nav-duration').textContent = `${navigationState.totalDuration} min`;
    document.getElementById('nav-step').textContent = `1/${navigationState.instructions.length}`;
    document.getElementById('nav-route-info').textContent = `${navigationState.totalDistance} km • ${navigationState.totalDuration} min`;

    // Afficher la première instruction
    updateNavigationInstruction(navigationState.instructions[0]);

    // Démarrer le suivi GPS
    startGPSTracking();

    // console.log('🧭 Navigation démarrée avec', navigationState.instructions.length, 'instructions');

  } catch (error) {
    console.error('❌ Erreur démarrage navigation:', error);
    alert('❌ Impossible de démarrer la navigation.\n\nVérifiez votre connexion et réessayez.');
  }
}

// Met à jour l'instruction de navigation affichée
function updateNavigationInstruction(instruction) {
  const icon = getInstructionIcon(instruction.maneuver.type);
  const text = instruction.maneuver.instruction;
  const distance = instruction.distance < 1000
    ? `Dans ${Math.round(instruction.distance)} m`
    : `Dans ${(instruction.distance / 1000).toFixed(1)} km`;

  document.getElementById('nav-icon').textContent = icon;
  document.getElementById('nav-instruction').textContent = text;
  document.getElementById('nav-distance').textContent = distance;

  // Annoncer vocalement si activé
  if (navigationState.voiceEnabled) {
    speak(text);
  }
}

// Retourne l'icône correspondant au type de manœuvre
function getInstructionIcon(type) {
  const icons = {
    'turn': '↪️',
    'new name': '➡️',
    'depart': '🚶',
    'arrive': '🏁',
    'merge': '🔀',
    'on ramp': '⬆️',
    'off ramp': '⬇️',
    'fork': '🔱',
    'end of road': '🛑',
    'continue': '⬆️',
    'roundabout': '🔄',
    'rotary': '🔄',
    'roundabout turn': '🔄',
    'notification': '⚠️',
    'exit roundabout': '↗️',
    'exit rotary': '↗️'
  };

  return icons[type] || '➡️';
}

// Démarre le suivi GPS en temps réel
function startGPSTracking() {
  if (!navigator.geolocation) {
    return;
  }

  // Créer un marqueur pour la position de l'utilisateur
  if (!navigationState.userMarker) {
    navigationState.userMarker = new mapboxgl.Marker({
      color: '#22c55e',
      scale: 1.2
    }).setLngLat([0, 0]).addTo(map);
  }

  // Suivre la position en temps réel
  navigationState.watchId = navigator.geolocation.watchPosition(
    (position) => {
      const userLng = position.coords.longitude;
      const userLat = position.coords.latitude;

      // Mettre à jour la position sur la carte
      navigationState.userMarker.setLngLat([userLng, userLat]);

      // Vérifier si on a atteint l'instruction suivante
      if (navigationState.active && navigationState.currentStep < navigationState.instructions.length) {
        const currentInstruction = navigationState.instructions[navigationState.currentStep];
        const nextPoint = currentInstruction.maneuver.location;
        const distance = getDistance(userLat, userLng, nextPoint[1], nextPoint[0]);

        // Si on est à moins de 20m de la prochaine instruction, passer à la suivante
        if (distance < 0.02) { // 20 mètres
          navigationState.currentStep++;

          if (navigationState.currentStep < navigationState.instructions.length) {
            updateNavigationInstruction(navigationState.instructions[navigationState.currentStep]);
            document.getElementById('nav-step').textContent =
              `${navigationState.currentStep + 1}/${navigationState.instructions.length}`;
          } else {
            // Navigation terminée !
            finishNavigation();
          }
        }
      }

      // Centrer la carte sur l'utilisateur
      map.easeTo({
        center: [userLng, userLat],
        zoom: 17,
        duration: 1000
      });
    },
    (error) => {
      console.error('❌ Erreur GPS:', error);
      alert('❌ Impossible de suivre votre position GPS.\n\nVérifiez que la géolocalisation est activée.');
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000
    }
  );
}

// Termine la navigation
function finishNavigation() {
  navigationState.active = false;

  document.getElementById('nav-icon').textContent = '🎉';
  document.getElementById('nav-instruction').textContent = 'Balade terminée !';
  document.getElementById('nav-distance').textContent = 'Vous êtes arrivé';

  if (navigationState.voiceEnabled) {
    speak('Balade terminée ! Bravo !');
  }

  setTimeout(() => {
    if (confirm('🎉 Balade terminée !\n\nVoulez-vous arrêter la navigation ?')) {
      stopNavigation();
    }
  }, 2000);
}

// Arrête la navigation
window.stopNavigation = function() {
  if (navigationState.watchId) {
    navigator.geolocation.clearWatch(navigationState.watchId);
  }

  if (navigationState.userMarker) {
    navigationState.userMarker.remove();
    navigationState.userMarker = null;
  }

  navigationState.active = false;
  navigationState.currentStep = 0;

  const panel = document.getElementById('navigation-panel');
  panel.classList.remove('active');

  // console.log('🛑 Navigation arrêtée');
}

// Active/désactive les instructions vocales
window.toggleVoiceGuidance = function() {
  navigationState.voiceEnabled = !navigationState.voiceEnabled;
  const icon = document.getElementById('voice-icon');
  icon.textContent = navigationState.voiceEnabled ? '🔊' : '🔇';

  if (navigationState.voiceEnabled) {
    speak('Instructions vocales activées');
  }
}

// Centre la carte sur l'utilisateur
window.centerOnUser = function() {
  if (navigationState.userMarker) {
    const pos = navigationState.userMarker.getLngLat();
    map.flyTo({
      center: [pos.lng, pos.lat],
      zoom: 17,
      essential: true
    });
  }
}

// Synthèse vocale (Web Speech API)
function speak(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

// Fonction pour activer le LLM avec la clé API
window.enableLLM = function() {
  const keyInput = document.getElementById('openai-key');
  const statusSpan = document.getElementById('llm-status');

  if (keyInput && keyInput.value.startsWith('sk-')) {
    LLM_CONFIG.apiKey = keyInput.value;
    LLM_CONFIG.enabled = true;
    statusSpan.textContent = '✅ Activé';
    statusSpan.style.color = '#22c55e';
    // console.log('✅ Analyse LLM activée');
    alert('✅ Analyse IA activée !\n\nL\'itinéraire sera analysé et pourra être optimisé automatiquement.');
  } else {
    alert('❌ Clé API invalide.\n\nLa clé doit commencer par "sk-".\nObtenez-en une sur https://platform.openai.com/api-keys');
  }
}

// =============================================================================
// GESTION DU MODAL DE FORMULAIRE
// =============================================================================

// Ouvre le modal du formulaire
window.openWalkModal = function() {
  const modal = document.getElementById('walk-modal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden'; // Empêcher le scroll du body

  // S'assurer que le formulaire est visible et la section navigation cachée
  const walkForm = document.querySelector('.walk-form');
  if (walkForm) {
    walkForm.style.display = 'block';
  }
  const navigationSection = document.getElementById('navigation-section');
  if (navigationSection) {
    navigationSection.style.display = 'none';
  }

  // Cacher le bouton flottant de navigation
  const startNavButton = document.getElementById('start-nav-button');
  if (startNavButton) {
    startNavButton.classList.remove('visible');
  }
}

// Ferme le modal du formulaire
window.closeWalkModal = function(event) {
  // Si on clique sur l'overlay (pas sur le contenu), fermer
  if (!event || event.target.id === 'walk-modal' || event.type === 'click') {
    const modal = document.getElementById('walk-modal');
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Réactiver le scroll
  }
}

// Démarre la navigation et ferme le modal
window.startNavigationAndCloseModal = function() {
  closeWalkModal();
  // Cacher le bouton de navigation flottant
  const startNavButton = document.getElementById('start-nav-button');
  if (startNavButton) {
    startNavButton.classList.remove('visible');
  }
  // Petite attente pour l'animation de fermeture
  setTimeout(() => {
    startNavigation();
  }, 300);
}

// Ferme le modal pour permettre la modification des points sur la carte
window.editWaypoints = function() {
  closeWalkModal();
  // Réinitialiser le formulaire pour la prochaine fois
  setTimeout(() => {
    const walkForm = document.querySelector('.walk-form');
    if (walkForm) {
      walkForm.style.display = 'block';
    }
    const navigationSection = document.getElementById('navigation-section');
    if (navigationSection) {
      navigationSection.style.display = 'none';
    }
    // S'assurer que le bouton de navigation reste visible sur la carte
    const startNavButton = document.getElementById('start-nav-button');
    if (startNavButton) {
      startNavButton.classList.add('visible');
    }
  }, 300);
}

// Initialiser la carte au chargement de la page
// Note: En production, vérifiez d'abord que le token est valide
if (mapboxgl.accessToken !== 'VOTRE_TOKEN_MAPBOX') {
  initMap();

  // Attacher le gestionnaire au formulaire
  document.querySelector('.walk-form').addEventListener('submit', handleFormSubmit);

  // Initialiser le slider (durée de balade)
  const slider = document.getElementById('walk-duration');
  const display = document.getElementById('duration-display');
  if (slider && display) {
    slider.addEventListener('input', function() {
      display.textContent = this.value;
    });
  }

  // Initialiser les toggle buttons
  const toggleButtons = document.querySelectorAll('.btn-toggle');
  toggleButtons.forEach(button => {
    button.addEventListener('click', function() {
      toggleButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
    });
  });

} else {
  document.getElementById('map').innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; padding: 2rem; text-align: center;">
      <div>
        <h3 style="color: #1E3A5F; margin-bottom: 1rem;">Configuration requise</h3>
        <p style="color: #64748B;">Veuillez ajouter votre token Mapbox dans le code JavaScript</p>
        <a href="https://account.mapbox.com/" target="_blank" style="color: #A3B5D9; text-decoration: underline;">Obtenir un token gratuit</a>
      </div>
    </div>
  `;
}
