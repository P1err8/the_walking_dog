class MeetingRouteCalculatorService
  MAPBOX_API_KEY = ENV['MAPBOX_API_KEY']

  def initialize(walking_meeting, meeting_point)
    @walking_meeting = walking_meeting
    @meeting_point = meeting_point
  end

  def self.call(walking_meeting, meeting_point)
    new(walking_meeting, meeting_point).call
  end

  def call
    position_a = UserPosition.find_by(user: @walking_meeting.user_a, walking: @walking_meeting.walking_a)
    position_b = UserPosition.find_by(user: @walking_meeting.user_b, walking: @walking_meeting.walking_b)

    return { error: "Positions introuvables" } unless position_a && position_b

    # Calcule les routes pour chaque utilisateur
    route_a = calculate_user_route(position_a, @walking_meeting.walking_a)
    route_b = calculate_user_route(position_b, @walking_meeting.walking_b)

    # Sauvegarde les routes dans la base
    MeetingRoute.create!(
      walking_meeting: @walking_meeting,
      user: @walking_meeting.user_a,
      segment_to_meeting: route_a[:to_meeting],
      segment_to_meeting_distance: route_a[:to_meeting_distance],
      segment_to_meeting_duration: route_a[:to_meeting_duration],
      segment_from_meeting: route_a[:from_meeting],
      segment_from_meeting_distance: route_a[:from_meeting_distance],
      segment_from_meeting_duration: route_a[:from_meeting_duration],
      resume_point_index: route_a[:resume_index],
      resume_latitude: route_a[:resume_point][:lat],
      resume_longitude: route_a[:resume_point][:lng]
    )

    MeetingRoute.create!(
      walking_meeting: @walking_meeting,
      user: @walking_meeting.user_b,
      segment_to_meeting: route_b[:to_meeting],
      segment_to_meeting_distance: route_b[:to_meeting_distance],
      segment_to_meeting_duration: route_b[:to_meeting_duration],
      segment_from_meeting: route_b[:from_meeting],
      segment_from_meeting_distance: route_b[:from_meeting_distance],
      segment_from_meeting_duration: route_b[:from_meeting_duration],
      resume_point_index: route_b[:resume_index],
      resume_latitude: route_b[:resume_point][:lat],
      resume_longitude: route_b[:resume_point][:lng]
    )

    { success: true, route_a: route_a, route_b: route_b }
  end

  private

  def calculate_user_route(position, walking)
    # 1. Route: Position actuelle → Point de rencontre
    to_meeting = calculate_directions(
      from: { lng: position.longitude, lat: position.latitude },
      to: { lng: @meeting_point[:longitude], lat: @meeting_point[:latitude] }
    )

    # 2. Trouve le meilleur point de reprise sur l'itinéraire original
    original_route = walking.polyline_coordinates # Suppose que Walking a cette méthode
    resume_point = find_best_resume_point(original_route, position, @meeting_point)

    # 3. Route: Point de rencontre → Point de reprise
    from_meeting = calculate_directions(
      from: { lng: @meeting_point[:longitude], lat: @meeting_point[:latitude] },
      to: { lng: resume_point[:coords][:lng], lat: resume_point[:coords][:lat] }
    )

    {
      to_meeting: to_meeting[:geometry],
      to_meeting_distance: to_meeting[:distance],
      to_meeting_duration: to_meeting[:duration],
      from_meeting: from_meeting[:geometry],
      from_meeting_distance: from_meeting[:distance],
      from_meeting_duration: from_meeting[:duration],
      resume_index: resume_point[:index],
      resume_point: resume_point[:coords]
    }
  end

  def calculate_directions(from:, to:)
    coordinates = "#{from[:lng]},#{from[:lat]};#{to[:lng]},#{to[:lat]}"

    uri = URI("https://api.mapbox.com/directions/v5/mapbox/walking/#{coordinates}")
    params = {
      access_token: MAPBOX_API_KEY,
      geometries: 'geojson',
      overview: 'full',
      steps: true
    }
    uri.query = URI.encode_www_form(params)

    response = Net::HTTP.get_response(uri)

    unless response.is_a?(Net::HTTPSuccess)
      Rails.logger.error "Erreur Mapbox Directions: #{response.body}"
      return { geometry: nil, distance: 0, duration: 0 }
    end

    data = JSON.parse(response.body)
    route = data['routes']&.first

    return { geometry: nil, distance: 0, duration: 0 } unless route

    {
      geometry: {
        type: 'LineString',
        coordinates: route['geometry']['coordinates']
      },
      distance: route['distance'],
      duration: route['duration']
    }
  rescue StandardError => e
    Rails.logger.error "Erreur calcul direction: #{e.message}"
    { geometry: nil, distance: 0, duration: 0 }
  end

  def find_best_resume_point(original_route, current_position, meeting_point)
    # Parse les coordonnées de la polyline originale
    coordinates = parse_polyline_coordinates(original_route)

    # Trouve l'index actuel de l'utilisateur
    current_index = current_position.route_progress_index || 0

    # Cherche le meilleur point de reprise après le meeting point
    # On veut un point qui est "en avant" sur l'itinéraire original
    best_index = current_index
    min_detour = Float::INFINITY

    # Regarde les points à partir de la position actuelle
    (current_index...coordinates.length).each do |i|
      coord = coordinates[i]

      # Distance du meeting point à ce point de reprise
      distance = haversine_distance(
        @meeting_point[:latitude], @meeting_point[:longitude],
        coord[:lat], coord[:lng]
      )

      # Choisit le point avec le moins de détour
      if distance < min_detour
        min_detour = distance
        best_index = i
      end

      # Arrête si on s'éloigne trop
      break if i > current_index + 50 # Limite à 50 points en avant
    end

    {
      index: best_index,
      coords: coordinates[best_index]
    }
  end

  def parse_polyline_coordinates(polyline_data)
    # Si c'est déjà un array de coordonnées
    return polyline_data.map { |c| { lng: c[0], lat: c[1] } } if polyline_data.is_a?(Array)

    # Si c'est un JSON string
    if polyline_data.is_a?(String)
      parsed = JSON.parse(polyline_data)
      return parsed['coordinates'].map { |c| { lng: c[0], lat: c[1] } }
    end

    # Si c'est un Hash avec coordinates
    if polyline_data.is_a?(Hash) && polyline_data['coordinates']
      return polyline_data['coordinates'].map { |c| { lng: c[0], lat: c[1] } }
    end

    []
  rescue StandardError => e
    Rails.logger.error "Erreur parsing polyline: #{e.message}"
    []
  end

  def haversine_distance(lat1, lon1, lat2, lon2)
    lat1_rad = lat1.to_f * Math::PI / 180
    lat2_rad = lat2.to_f * Math::PI / 180
    lon1_rad = lon1.to_f * Math::PI / 180
    lon2_rad = lon2.to_f * Math::PI / 180

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = Math.sin(dlat / 2)**2 + Math.cos(lat1_rad) * Math.cos(lat2_rad) * Math.sin(dlon / 2)**2
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    6371000 * c # Retourne en mètres
  end
end
