# frozen_string_literal: true

# Service pour générer des itinéraires de balade optimisés
# Fusionne la logique de calcul automatique de POI (polygone guidé)
# avec l'approche isochrone pour garantir des itinéraires réalistes
#
# Usage:
#   service = RouteGeneratorService.new(latitude, longitude, duration_minutes)
#   route_data = service.generate_route
#   # => Returns GeoJSON FeatureCollection with waypoints and route
class RouteGeneratorService
  require 'net/http'
  require 'json'
  require 'uri'

  attr_reader :start_lat, :start_lng, :duration_minutes, :api_key

  # Vitesse de marche moyenne en km/h
  WALKING_SPEED_KMH = 4.5

  # Rayon de la terre en km (pour calculs de distance)
  EARTH_RADIUS_KM = 6371

  def initialize(start_lat, start_lng, duration_minutes)
    @start_lat = start_lat.to_f
    @start_lng = start_lng.to_f
    @duration_minutes = duration_minutes.to_f
    @api_key = ENV['MAPBOX_API_KEY']

    raise ArgumentError, 'MAPBOX_API_KEY manquante' if @api_key.blank?
    raise ArgumentError, 'Coordonnées invalides' if @start_lat.zero? || @start_lng.zero?
    raise ArgumentError, 'Durée invalide' if @duration_minutes <= 0
  end

  # Génère l'itinéraire complet en GeoJSON
  # @return [Hash] GeoJSON FeatureCollection
  def generate_route
    Rails.logger.info "🚀 Génération d'itinéraire : #{duration_minutes}min depuis [#{start_lng}, #{start_lat}]"

    # 1. Calculer le nombre de POI (logique du collègue)
    poi_count = calculate_poi_count_by_duration

    # 2. Calculer la durée par étape et l'angle de rotation (logique du collègue)
    isochrone_duration = calculate_isochrone_duration(poi_count)
    rotation_angle = calculate_rotation_angle(poi_count)

    Rails.logger.info "📊 Configuration : #{poi_count} POI, durée/étape: #{isochrone_duration}min, angle: #{rotation_angle}°"

    # 3. Obtenir l'isochrone depuis Mapbox
    isochrone_data = fetch_isochrone(isochrone_duration)

    # 4. Générer les waypoints sur le contour avec rotation guidée
    waypoints = generate_waypoints_on_contour(isochrone_data, poi_count, rotation_angle)

    # 5. Enrichir les waypoints avec les vrais noms de lieux
    enriched_waypoints = enrich_waypoints_with_poi_names(waypoints)

    # 6. Construire le GeoJSON FeatureCollection
    build_geojson_feature_collection(enriched_waypoints, isochrone_data, poi_count, rotation_angle)
  rescue StandardError => e
    Rails.logger.error "❌ Erreur génération itinéraire: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    raise
  end

  private

  # ============================================================================
  # LOGIQUE DU COLLÈGUE : Calcul automatique du nombre de POI
  # ============================================================================

  # Détermine le nombre de POI basés sur la durée de la promenade
  # @return [Integer] 3, 4 ou 5 POI selon la durée
  def calculate_poi_count_by_duration
    case duration_minutes
    when 0...30
      3
    when 30...40
      4
    else
      5
    end
  end

  # ============================================================================
  # LOGIQUE DU COLLÈGUE : Calcul de la durée par étape
  # ============================================================================

  # Calcule la durée de chaque isochrone (durée totale divisée par nombre d'étapes)
  # @param poi_count [Integer] Nombre de POI
  # @return [Integer] Durée en minutes pour chaque étape
  def calculate_isochrone_duration(poi_count)
    total_sides = poi_count + 1 # Le nombre de côtés du polygone = POI + retour au départ
    [1, (duration_minutes / total_sides).floor].max # Minimum 1 minute
  end

  # ============================================================================
  # LOGIQUE DU COLLÈGUE : Calcul de l'angle de rotation pour polygone parfait
  # ============================================================================

  # Calcule l'angle de rotation entre chaque POI pour former un polygone régulier
  # @param poi_count [Integer] Nombre de POI
  # @return [Float] Angle en degrés
  def calculate_rotation_angle(poi_count)
    total_sides = poi_count + 1
    360.0 / total_sides
  end

  # ============================================================================
  # LOGIQUE STYLEGUIDE : Récupération de l'isochrone depuis Mapbox
  # ============================================================================

  # Récupère la zone isochrone depuis l'API Mapbox
  # @param duration [Integer] Durée en minutes
  # @return [Hash] Réponse de l'API Isochrone (GeoJSON)
  def fetch_isochrone(duration)
    url = URI("https://api.mapbox.com/isochrone/v1/mapbox/walking/#{start_lng},#{start_lat}")
    url.query = URI.encode_www_form(
      contours_minutes: duration,
      polygons: true,
      access_token: api_key
    )

    Rails.logger.info "🔍 Récupération isochrone : #{url}"

    response = Net::HTTP.get_response(url)
    raise "Erreur API Isochrone: #{response.code}" unless response.is_a?(Net::HTTPSuccess)

    data = JSON.parse(response.body)
    raise 'Aucune zone isochrone trouvée' if data['features'].blank?

    Rails.logger.info "✅ Isochrone récupéré : #{data['features'][0]['geometry']['coordinates'][0].length} points"
    data
  end

  # ============================================================================
  # FUSION : Génération des waypoints sur le contour avec rotation guidée
  # ============================================================================

  # Génère les waypoints sur le contour de l'isochrone avec rotation guidée
  # @param isochrone_data [Hash] Données de l'isochrone
  # @param poi_count [Integer] Nombre de POI
  # @param rotation_angle [Float] Angle de rotation en degrés
  # @return [Array<Hash>] Liste des waypoints
  def generate_waypoints_on_contour(isochrone_data, poi_count, rotation_angle)
    # Extraire le contour de l'isochrone
    polygon = isochrone_data['features'][0]
    coordinates = polygon['geometry']['coordinates'][0] # Premier polygone (extérieur)

    # Point de départ aléatoire sur le contour
    start_index = rand(coordinates.length)

    # Direction initiale aléatoire
    current_bearing = rand(360.0)

    # Espacement entre les points sur le contour
    step = coordinates.length / poi_count

    waypoints = []

    poi_count.times do |i|
      # Calculer l'index sur le contour
      index = (start_index + (i * step).to_i) % coordinates.length
      contour_point = coordinates[index]

      # Placer le waypoint à 60% de la distance (plus proche du centre)
      # pour un trajet plus fluide
      distance_ratio = 0.6
      adjusted_lng = start_lng + ((contour_point[0] - start_lng) * distance_ratio)
      adjusted_lat = start_lat + ((contour_point[1] - start_lat) * distance_ratio)

      # Calculer le bearing (direction) depuis le centre
      bearing = calculate_bearing(start_lat, start_lng, adjusted_lat, adjusted_lng)

      waypoints << {
        id: i + 1,
        lng: adjusted_lng,
        lat: adjusted_lat,
        order: i + 1,
        bearing: bearing,
        isochrone_step: i + 1,
        description: "Point #{i + 1}" # Sera enrichi plus tard
      }

      # Rotation pour le prochain point (logique du collègue)
      current_bearing = (current_bearing + rotation_angle) % 360
    end

    # Trier par angle pour garantir une boucle fluide
    waypoints.sort_by! { |wp| wp[:bearing] }

    # Réattribuer l'ordre après le tri
    waypoints.each_with_index do |wp, idx|
      wp[:order] = idx + 1
    end

    Rails.logger.info "📍 #{waypoints.length} waypoints générés et triés"
    waypoints
  end

  # ============================================================================
  # LOGIQUE STYLEGUIDE : Enrichissement des waypoints avec vrais noms de lieux
  # ============================================================================

  # Enrichit les waypoints avec les vrais noms de lieux via Mapbox Geocoding
  # @param waypoints [Array<Hash>] Liste des waypoints
  # @return [Array<Hash>] Waypoints enrichis
  def enrich_waypoints_with_poi_names(waypoints)
    Rails.logger.info "🔍 Enrichissement des #{waypoints.length} waypoints avec noms de lieux..."

    waypoints.each do |wp|
      begin
        place_name = fetch_place_name(wp[:lng], wp[:lat])
        wp[:poi_name] = place_name[:name]
        wp[:address] = place_name[:address]
        wp[:poi_type] = place_name[:type]
        wp[:description] = place_name[:name]

        # Pause pour respecter les limites de l'API (600 req/min)
        sleep(0.1)
      rescue StandardError => e
        Rails.logger.warn "⚠️ Impossible d'enrichir waypoint #{wp[:id]}: #{e.message}"
        wp[:poi_name] = "Point #{wp[:id]}"
        wp[:address] = "Point de passage"
        wp[:poi_type] = "waypoint"
      end
    end

    Rails.logger.info "✅ Enrichissement terminé"
    waypoints
  end

  # Récupère le nom du lieu depuis Mapbox Geocoding API
  # @param lng [Float] Longitude
  # @param lat [Float] Latitude
  # @return [Hash] Informations sur le lieu
  def fetch_place_name(lng, lat)
    url = URI("https://api.mapbox.com/geocoding/v5/mapbox.places/#{lng},#{lat}.json")
    url.query = URI.encode_www_form(
      types: 'poi,address,neighborhood',
      limit: 1,
      access_token: api_key
    )

    response = Net::HTTP.get_response(url)
    raise "Erreur API Geocoding: #{response.code}" unless response.is_a?(Net::HTTPSuccess)

    data = JSON.parse(response.body)
    feature = data['features']&.first

    return { name: 'Point de passage', address: '', type: 'waypoint' } if feature.blank?

    # Extraire le nom selon le type de lieu
    name = if feature['place_type'].include?('poi')
             feature['text'] # Ex: "Parc de la Tête d'Or"
           elsif feature['place_type'].include?('address')
             feature['text'] # Ex: "Rue de la République"
           elsif feature['place_type'].include?('neighborhood')
             "Quartier #{feature['text']}"
           else
             feature['text'] || 'Point de passage'
           end

    {
      name: name,
      address: feature['place_name'],
      type: feature['place_type'].first || 'waypoint'
    }
  end

  # ============================================================================
  # CONSTRUCTION DU GEOJSON FINAL
  # ============================================================================

  # Construit le GeoJSON FeatureCollection complet
  # @param waypoints [Array<Hash>] Waypoints enrichis
  # @param isochrone_data [Hash] Données de l'isochrone
  # @param poi_count [Integer] Nombre de POI
  # @param rotation_angle [Float] Angle de rotation
  # @return [Hash] GeoJSON FeatureCollection
  def build_geojson_feature_collection(waypoints, isochrone_data, poi_count, rotation_angle)
    total_distance_km = estimate_total_distance(waypoints)

    {
      type: 'FeatureCollection',
      metadata: {
        version: '2.0',
        algorithm: 'isochrone_guided_polygon',
        generated_at: Time.current.iso8601,
        configuration: {
          poi_count: poi_count,
          rotation_angle: rotation_angle,
          isochrone_duration_per_step: calculate_isochrone_duration(poi_count)
        }
      },
      features: build_features(waypoints, isochrone_data),
      route_metadata: {
        total_distance_km: total_distance_km,
        estimated_duration_minutes: duration_minutes,
        poi_count: poi_count,
        walking_speed_kmh: WALKING_SPEED_KMH,
        polygon_sides: poi_count + 1
      }
    }
  end

  # Construit la liste des features GeoJSON
  # @param waypoints [Array<Hash>] Waypoints enrichis
  # @param isochrone_data [Hash] Données de l'isochrone
  # @return [Array<Hash>] Liste des features
  def build_features(waypoints, isochrone_data)
    features = []

    # Feature 1 : Point de départ
    features << {
      type: 'Feature',
      id: 'start_point',
      geometry: {
        type: 'Point',
        coordinates: [start_lng, start_lat]
      },
      properties: {
        type: 'start',
        order: 0,
        address: 'Point de départ'
      }
    }

    # Features 2-N : Waypoints
    waypoints.each do |wp|
      features << {
        type: 'Feature',
        id: "waypoint_#{wp[:id]}",
        geometry: {
          type: 'Point',
          coordinates: [wp[:lng], wp[:lat]]
        },
        properties: {
          type: 'waypoint',
          order: wp[:order],
          poi_name: wp[:poi_name],
          poi_type: wp[:poi_type],
          address: wp[:address],
          description: wp[:description],
          isochrone_step: wp[:isochrone_step],
          direction_bearing: wp[:bearing].round(2)
        }
      }
    end

    # Feature N+1 : Point d'arrivée (retour au départ)
    features << {
      type: 'Feature',
      id: 'end_point',
      geometry: {
        type: 'Point',
        coordinates: [start_lng, start_lat]
      },
      properties: {
        type: 'end',
        order: waypoints.length + 1,
        address: 'Retour au point de départ'
      }
    }

    # Feature N+2 : Zone isochrone (pour visualisation)
    features << {
      type: 'Feature',
      id: 'isochrone_zone',
      geometry: isochrone_data['features'][0]['geometry'],
      properties: {
        type: 'isochrone',
        contour_minutes: calculate_isochrone_duration(waypoints.length)
      }
    }

    features
  end

  # ============================================================================
  # HELPERS MATHÉMATIQUES
  # ============================================================================

  # Calcule le bearing (direction) entre deux points
  # @param lat1 [Float] Latitude point 1
  # @param lng1 [Float] Longitude point 1
  # @param lat2 [Float] Latitude point 2
  # @param lng2 [Float] Longitude point 2
  # @return [Float] Bearing en degrés (0-360)
  def calculate_bearing(lat1, lng1, lat2, lng2)
    lat1_rad = lat1 * Math::PI / 180
    lat2_rad = lat2 * Math::PI / 180
    lng_diff = (lng2 - lng1) * Math::PI / 180

    y = Math.sin(lng_diff) * Math.cos(lat2_rad)
    x = Math.cos(lat1_rad) * Math.sin(lat2_rad) -
        Math.sin(lat1_rad) * Math.cos(lat2_rad) * Math.cos(lng_diff)

    bearing = Math.atan2(y, x) * 180 / Math::PI
    (bearing + 360) % 360 # Normaliser entre 0 et 360
  end

  # Calcule la distance entre deux points (formule Haversine)
  # @param lat1 [Float] Latitude point 1
  # @param lng1 [Float] Longitude point 1
  # @param lat2 [Float] Latitude point 2
  # @param lng2 [Float] Longitude point 2
  # @return [Float] Distance en km
  def haversine_distance(lat1, lng1, lat2, lng2)
    d_lat = (lat2 - lat1) * Math::PI / 180
    d_lng = (lng2 - lng1) * Math::PI / 180

    a = Math.sin(d_lat / 2)**2 +
        Math.cos(lat1 * Math::PI / 180) *
        Math.cos(lat2 * Math::PI / 180) *
        Math.sin(d_lng / 2)**2

    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    EARTH_RADIUS_KM * c
  end

  # Estime la distance totale du parcours
  # @param waypoints [Array<Hash>] Waypoints
  # @return [Float] Distance en km
  def estimate_total_distance(waypoints)
    return 0.0 if waypoints.empty?

    distance = 0.0

    # Distance du départ au premier waypoint
    distance += haversine_distance(start_lat, start_lng, waypoints[0][:lat], waypoints[0][:lng])

    # Distance entre chaque waypoint
    waypoints.each_cons(2) do |wp1, wp2|
      distance += haversine_distance(wp1[:lat], wp1[:lng], wp2[:lat], wp2[:lng])
    end

    # Distance du dernier waypoint au retour
    distance += haversine_distance(waypoints[-1][:lat], waypoints[-1][:lng], start_lat, start_lng)

    distance.round(2)
  end
end
