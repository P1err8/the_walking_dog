class Walking < ApplicationRecord
  attr_accessor :address, :latitude, :longitude

  # has_many :users
  #  has_many :circuits

  belongs_to :user

  # TODO: Envisager d'ajouter des validations (coordinates presence, minimum 2 points)

  # Calcule la distance totale à partir des coordonnées (en km)
  def calculated_distance
    return distance if distance.present?
    return nil unless coordinates.present? && coordinates.length > 1

    total = 0.0
    coords = coordinates
    (0...coords.length - 1).each do |i|
      total += haversine_distance(coords[i], coords[i + 1])
    end
    total.round(2)
  end

  # Calcule la durée estimée à partir de la distance (vitesse moyenne: 5 km/h)
  def calculated_duration
    return duration if duration.present?

    dist = calculated_distance
    return nil unless dist.present?

    # Vitesse moyenne de marche: 5 km/h => distance / 5 * 60 = minutes
    (dist / 5.0 * 60).round
  end

  private

  # Formule de Haversine pour calculer la distance entre deux points GPS
  def haversine_distance(coord1, coord2)
    lat1, lon1 = coord1[1], coord1[0]  # [lng, lat] format
    lat2, lon2 = coord2[1], coord2[0]

    r = 6371 # Rayon de la Terre en km

    dlat = to_rad(lat2 - lat1)
    dlon = to_rad(lon2 - lon1)

    a = Math.sin(dlat / 2)**2 +
        Math.cos(to_rad(lat1)) * Math.cos(to_rad(lat2)) * Math.sin(dlon / 2)**2
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    r * c
  end

  def to_rad(deg)
    deg * Math::PI / 180
  end
end
