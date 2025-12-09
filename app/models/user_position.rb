class UserPosition < ApplicationRecord
  belongs_to :user
  belongs_to :walking

  # Validations
  validates :latitude, :longitude, :last_update_at, presence: true
  validates :latitude, numericality: { greater_than_or_equal_to: -90, less_than_or_equal_to: 90 }
  validates :longitude, numericality: { greater_than_or_equal_to: -180, less_than_or_equal_to: 180 }
  validates :heading, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 360 }, allow_nil: true
  validates :route_progress_percent, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 1 }, allow_nil: true

  # Scopes
  scope :active, -> { where(is_active: true) }
  scope :recent, ->(minutes = 5) { where("last_update_at > ?", minutes.minutes.ago) }
  scope :for_public_walkings, -> { joins(:walking).where(walkings: { sociable: true }) }

  # Vérifie si la position est disponible pour des rencontres (balade publique)
  def available_for_meeting?
    is_active && walking&.sociable?
  end

  # Calcul de distance avec Haversine
  def distance_to(other_position)
    lat1 = latitude.to_f * Math::PI / 180
    lat2 = other_position.latitude.to_f * Math::PI / 180
    lon1 = longitude.to_f * Math::PI / 180
    lon2 = other_position.longitude.to_f * Math::PI / 180

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = Math.sin(dlat / 2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2)**2
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    6371000 * c # Retourne la distance en mètres
  end

  # Met à jour la position et le timestamp
  def update_position!(lat:, lng:, heading: nil, progress_index: nil, progress_percent: nil)
    update!(
      latitude: lat,
      longitude: lng,
      heading: heading,
      route_progress_index: progress_index,
      route_progress_percent: progress_percent,
      last_update_at: Time.current
    )
  end
end
