/**
 * Utilitaire pour détecter et supprimer les allers-retours des données de routes Mapbox
 */

/**
 * Calcule la distance entre deux coordonnées (en mètres)
 * Utilise la formule de Haversine
 */
function getDistance(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Extrait toutes les coordonnées d'une route Mapbox
 */
function extractCoordinatesFromRoute(route) {
  const coordinates = [];

  if (route.legs) {
    route.legs.forEach(leg => {
      if (leg.steps) {
        leg.steps.forEach(step => {
          if (step.geometry && step.geometry.coordinates) {
            coordinates.push(...step.geometry.coordinates);
          }
        });
      }
    });
  }

  return coordinates;
}

/**
 * Supprime les allers-retours d'un tableau de coordonnées
 * @param {Array} coordinates - Tableau de coordonnées [lng, lat]
 * @param {number} threshold - Distance en mètres pour détecter les allers-retours (défaut: 20)
 * @returns {Array} - Tableau de coordonnées nettoyées
 */
function removeRoundtrips(coordinates, threshold = 20) {
  if (!coordinates || coordinates.length < 3) return coordinates;

  const result = [];
  let i = 0;

  while (i < coordinates.length) {
    let foundRoundtrip = false;

    // Chercher un aller-retour à partir de ce point
    // On s'arrête avant les 10 derniers points pour éviter de supprimer un circuit fermé valide
    const searchLimit = Math.min(coordinates.length - 10, coordinates.length);

    for (let j = i + 2; j < searchLimit; j++) {
      const distance = getDistance(coordinates[i], coordinates[j]);

      if (distance < threshold) {
        // Vérifier que ce n'est pas juste le début et la fin d'un circuit fermé
        const isCircuitEnd = (i < 5) && (j > coordinates.length - 10);

        if (!isCircuitEnd) {
          // Aller-retour détecté : garder le point de départ et sauter jusqu'au retour
          result.push(coordinates[i]);
          // console.log(`🔄 Aller-retour détecté : index ${i} → ${j} (${distance.toFixed(2)}m)`);
          i = j + 1;
          foundRoundtrip = true;
          break;
        }
      }
    }

    if (!foundRoundtrip) {
      result.push(coordinates[i]);
      i++;
    }
  }

  return result;
}

/**
 * Reconstruit une route avec les coordonnées nettoyées
 */
function rebuildRouteWithCleanedCoordinates(route, cleanedCoordinates) {
  return {
    ...route,
    legs: [{
      steps: [{
        geometry: {
          type: "LineString",
          coordinates: cleanedCoordinates
        }
      }]
    }]
  };
}

/**
 * Fonction principale : nettoie les données de route complètes
 * @param {Object} mapData - Données de route Mapbox (avec routes, waypoints, etc.)
 * @param {number} threshold - Distance en mètres pour détecter les allers-retours (défaut: 20)
 * @returns {Object} - Objet contenant les données nettoyées et les statistiques
 */
export function cleanMapData(mapData, threshold = 20) {
  // console.log("🚀 Démarrage du nettoyage des allers-retours...");
  // console.log("📦 Données originales :", mapData);

  if (!mapData.routes || mapData.routes.length === 0) {
    console.warn("⚠️  Aucune route à traiter");
    return {
      original: mapData,
      cleaned: mapData,
      stats: {
        routesOriginal: 0,
        routesCleaned: 0,
        totalRoundtripsRemoved: 0
      }
    };
  }

  // console.log(`\n🔍 Analyse de ${mapData.routes.length} route(s)...`);

  const cleanedData = {
    ...mapData,
    routes: mapData.routes.map((route, index) => {
      // console.log(`\n📍 Route ${index + 1}:`);

      const originalCoords = extractCoordinatesFromRoute(route);
      // console.log(`   Points originaux : ${originalCoords.length}`);

      const cleanedCoords = removeRoundtrips(originalCoords, threshold);
      // console.log(`   Points après nettoyage : ${cleanedCoords.length}`);
      // console.log(`   Points supprimés : ${originalCoords.length - cleanedCoords.length}`);

      return rebuildRouteWithCleanedCoordinates(route, cleanedCoords);
    })
  };

  // console.log("\n✅ Données nettoyées :", cleanedData);

  const stats = {
    routesOriginal: mapData.routes.length,
    routesCleaned: cleanedData.routes.length,
    totalRoundtripsRemoved: mapData.routes.reduce((sum, route, index) => {
      const original = extractCoordinatesFromRoute(route).length;
      const cleaned = extractCoordinatesFromRoute(cleanedData.routes[index]).length;
      return sum + (original - cleaned);
    }, 0)
  };

  // console.log("\n📊 Statistiques :");
  // console.log(`   Routes traitées : ${stats.routesOriginal}`);
  // console.log(`   Points supprimés au total : ${stats.totalRoundtripsRemoved}`);

  return {
    original: mapData,
    cleaned: cleanedData,
    stats: stats
  };
}

/**
 * Fonction pour nettoyer les données via l'attribut data-map-data-value
 * À utiliser depuis le DOM ou une vue
 */
export function cleanMapDataFromElement(elementId = 'map', threshold = 20) {
  const mapElement = document.getElementById(elementId);
  if (!mapElement) {
    console.error(`❌ Élément #${elementId} non trouvé !`);
    return null;
  }

  const dataValue = mapElement.getAttribute('data-map-data-value');
  if (!dataValue) {
    console.error("❌ Aucune donnée map-data-value trouvée !");
    return null;
  }

  let mapData;
  try {
    mapData = JSON.parse(dataValue);
  } catch (e) {
    console.error("❌ Erreur de parsing JSON :", e);
    return null;
  }

  const result = cleanMapData(mapData, threshold);

  // Mettre à jour l'attribut
  const cleanedDataString = JSON.stringify(result.cleaned);
  mapElement.setAttribute('data-map-data-value', cleanedDataString);

  // console.log("\n🔄 Rafraîchissement de la carte...");

  // Déclencher le changement pour Stimulus
  const tempValue = mapElement.getAttribute('data-map-data-value');
  mapElement.removeAttribute('data-map-data-value');
  setTimeout(() => {
    mapElement.setAttribute('data-map-data-value', tempValue);
    // console.log("✅ Carte rafraîchie avec les données nettoyées !");
  }, 100);

  return result;
}
