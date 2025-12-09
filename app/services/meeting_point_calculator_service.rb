class MeetingPointCalculatorService
  MAPBOX_API_KEY = ENV['MAPBOX_API_KEY']
  POI_SEARCH_RADIUS_METERS = 200

  def initialize(position_a, position_b)
    @position_a = position_a
    @position_b = position_b
  end

  def self.call(position_a, position_b)
    new(position_a, position_b).call
  end

  def call
    # 1. Calcul du point milieu géométrique
    midpoint = calculate_midpoint

    # 2. Recherche d'un POI dog-friendly à proximité (optionnel)
    poi = search_dog_friendly_poi(midpoint)

    # 3. Si POI trouvé, utilise ses coordonnées, sinon utilise le midpoint
    meeting_point = poi ? poi[:coordinates] : midpoint

    # 4. Snap le point sur la route la plus proche
    snapped_point = snap_to_road(meeting_point)

    {
      latitude: snapped_point[:lat],
      longitude: snapped_point[:lng],
      poi_name: poi&.dig(:name),
      is_poi: poi.present?
    }
  end

  private

  def calculate_midpoint
    lat1 = @position_a.latitude.to_f
    lng1 = @position_a.longitude.to_f
    lat2 = @position_b.latitude.to_f
    lng2 = @position_b.longitude.to_f

    # Conversion en radians
    lat1_rad = lat1 * Math::PI / 180
    lat2_rad = lat2 * Math::PI / 180
    lng_diff = (lng2 - lng1) * Math::PI / 180

    # Calcul du midpoint avec formule sphérique
    bx = Math.cos(lat2_rad) * Math.cos(lng_diff)
    by = Math.cos(lat2_rad) * Math.sin(lng_diff)

    mid_lat = Math.atan2(
      Math.sin(lat1_rad) + Math.sin(lat2_rad),
      Math.sqrt((Math.cos(lat1_rad) + bx)**2 + by**2)
    )

    mid_lng = lng1 * Math::PI / 180 + Math.atan2(by, Math.cos(lat1_rad) + bx)

    {
      lat: mid_lat * 180 / Math::PI,
      lng: mid_lng * 180 / Math::PI
    }
  end

  def search_dog_friendly_poi(midpoint)
    # Appel à l'API Mapbox Geocoding pour rechercher des POIs dog-friendly
    uri = URI("https://api.mapbox.com/geocoding/v5/mapbox.places/dog%20park.json")
    params = {
      access_token: MAPBOX_API_KEY,
      proximity: "#{midpoint[:lng]},#{midpoint[:lat]}",
      limit: 5,
      types: 'poi',
      radius: POI_SEARCH_RADIUS_METERS
    }
    uri.query = URI.encode_www_form(params)

    response = Net::HTTP.get_response(uri)
    return nil unless response.is_a?(Net::HTTPSuccess)

    data = JSON.parse(response.body)
    features = data['features']

    return nil if features.empty?

    # Prend le POI le plus proche
    best_poi = features.first
    coordinates = best_poi['geometry']['coordinates']

    {
      name: best_poi['text'],
      coordinates: { lng: coordinates[0], lat: coordinates[1] }
    }
  rescue StandardError => e
    Rails.logger.error "Erreur recherche POI: #{e.message}"
    nil
  end

  def snap_to_road(point)
    # Utilise Mapbox Map Matching API pour snapper le point sur la route
    coordinates = "#{point[:lng]},#{point[:lat]}"

    uri = URI("https://api.mapbox.com/matching/v5/mapbox/walking/#{coordinates}")
    params = {
      access_token: MAPBOX_API_KEY,
      geometries: 'geojson',
      radiuses: 50 # Rayon de snap en mètres
    }
    uri.query = URI.encode_www_form(params)

    response = Net::HTTP.get_response(uri)

    if response.is_a?(Net::HTTPSuccess)
      data = JSON.parse(response.body)

      if data['matchings']&.any?
        # Prend le premier point du matching
        matched_coords = data['matchings'].first['geometry']['coordinates'].first
        return { lng: matched_coords[0], lat: matched_coords[1] }
      end
    end

    # Si le snap échoue, retourne le point original
    point
  rescue StandardError => e
    Rails.logger.error "Erreur snap to road: #{e.message}"
    point
  end
end
