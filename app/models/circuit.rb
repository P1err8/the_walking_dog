class Circuit < ApplicationRecord
  belongs_to :walking
  belongs_to :user

  # Validations
  validates :coordinates, presence: true
  validate :coordinates_structure, if: :coordinates_present?

  # ============================================================================
  # ACCESSEURS GEOJSON
  # ============================================================================

  # Retourne tous les waypoints (points de passage)
  # @return [Array<Hash>] Liste des waypoints
  def waypoints
    features_by_type('waypoint')
  end

  # Retourne le point de départ
  # @return [Hash, nil] Feature du point de départ
  def start_point
    features_by_type('start').first
  end

  # Retourne le point d'arrivée
  # @return [Hash, nil] Feature du point d'arrivée
  def end_point
    features_by_type('end').first
  end

  # Retourne la géométrie du polygone isochrone
  # @return [Hash, nil] Géométrie du polygone
  def isochrone_polygon
    features_by_type('isochrone').first&.dig('geometry')
  end

  # Retourne les métadonnées de la route
  # @return [Hash] Métadonnées (distance, durée, POI count, etc.)
  def route_metadata
    coordinates['route_metadata'] || {}
  end

  # ============================================================================
  # EXTRACTION DE DONNÉES
  # ============================================================================

  # Distance totale en km
  # @return [Float] Distance en km
  def total_distance_km
    route_metadata['total_distance_km']&.to_f || 0.0
  end

  # Nombre de POI
  # @return [Integer] Nombre de points de passage
  def poi_count
    waypoints.length
  end

  # Noms des POI
  # @return [Array<String>] Liste des noms de lieux
  def poi_names
    waypoints.map { |wp| wp.dig('properties', 'poi_name') }.compact
  end

  # Algorithme utilisé pour la génération
  # @return [String] Nom de l'algorithme
  def algorithm_used
    coordinates.dig('metadata', 'algorithm') || 'unknown'
  end

  # Date de génération
  # @return [DateTime, nil] Date de génération
  def generated_at
    timestamp = coordinates.dig('metadata', 'generated_at')
    DateTime.parse(timestamp) if timestamp.present?
  rescue ArgumentError
    nil
  end

  # ============================================================================
  # EXPORT EN DIFFÉRENTS FORMATS
  # ============================================================================

  # Exporte le circuit en GeoJSON complet
  # @return [Hash] GeoJSON FeatureCollection
  def to_geojson
    coordinates # Déjà en format GeoJSON
  end

  # Exporte en format simple array pour Mapbox Directions API
  # @return [Array<Array<Float>>] [[lng, lat], [lng, lat], ...]
  def to_simple_array
    result = []

    # Point de départ
    if start_point
      result << start_point.dig('geometry', 'coordinates')
    end

    # Waypoints triés par ordre
    waypoints
      .sort_by { |wp| wp.dig('properties', 'order') || 0 }
      .each { |wp| result << wp.dig('geometry', 'coordinates') }

    # Point d'arrivée
    if end_point
      result << end_point.dig('geometry', 'coordinates')
    end

    result.compact
  end

  # Exporte en format pour Mapbox Directions API (string)
  # @return [String] "lng1,lat1;lng2,lat2;lng3,lat3"
  def to_mapbox_directions_input
    to_simple_array
      .map { |coord| coord.join(',') }
      .join(';')
  end

  # Exporte en GPX (GPS Exchange Format) pour Garmin, Strava, etc.
  # @return [String] XML GPX
  def to_gpx
    require 'builder'

    xml = Builder::XmlMarkup.new(indent: 2)
    xml.instruct!

    xml.gpx(version: '1.1', creator: 'The Walking Dog',
            xmlns: 'http://www.topografix.com/GPX/1/1') do
      xml.metadata do
        xml.name "Balade #{id}"
        xml.time created_at.iso8601
        xml.desc "Circuit généré par The Walking Dog (#{total_distance_km} km)"
      end

      xml.trk do
        xml.name "Circuit #{id}"
        xml.type "walking"

        xml.trkseg do
          to_simple_array.each do |coord|
            xml.trkpt(lat: coord[1], lon: coord[0])
          end
        end
      end
    end
  rescue LoadError
    Rails.logger.warn 'Builder gem manquante pour export GPX'
    nil
  end

  # ============================================================================
  # MÉTHODES PRIVÉES
  # ============================================================================

  private

  # Filtre les features par type
  # @param type [String] Type de feature ('start', 'waypoint', 'end', 'isochrone', 'route')
  # @return [Array<Hash>] Liste des features du type demandé
  def features_by_type(type)
    return [] unless coordinates.is_a?(Hash) && coordinates['features'].is_a?(Array)

    coordinates['features'].select do |feature|
      feature.dig('properties', 'type') == type
    end
  end

  # Vérifie si les coordinates sont présentes
  # @return [Boolean]
  def coordinates_present?
    coordinates.present?
  end

  # Valide la structure du GeoJSON
  def coordinates_structure
    unless coordinates.is_a?(Hash)
      errors.add(:coordinates, 'doit être un Hash (GeoJSON)')
      return
    end

    # Vérifier le type
    unless coordinates['type'] == 'FeatureCollection'
      errors.add(:coordinates, "doit être un FeatureCollection, pas #{coordinates['type']}")
    end

    # Vérifier la présence des features
    unless coordinates['features'].is_a?(Array) && coordinates['features'].any?
      errors.add(:coordinates, 'doit contenir au moins une feature')
    end

    # Vérifier la présence des métadonnées de route
    unless coordinates['route_metadata'].is_a?(Hash)
      errors.add(:coordinates, 'doit contenir route_metadata')
    end
  end
end
