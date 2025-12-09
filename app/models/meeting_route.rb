class MeetingRoute < ApplicationRecord
  belongs_to :walking_meeting
  belongs_to :user

  # Validations
  validates :walking_meeting_id, :user_id, presence: true
  validates :user_id, uniqueness: { scope: :walking_meeting_id }

  # Accesseurs pour les données GeoJSON
  def segment_to_meeting_coordinates
    segment_to_meeting&.dig('coordinates')
  end

  def segment_from_meeting_coordinates
    segment_from_meeting&.dig('coordinates')
  end

  # Calcul de la durée totale du détour
  def total_detour_duration
    (segment_to_meeting_duration || 0) + (segment_from_meeting_duration || 0)
  end

  # Calcul de la distance totale du détour
  def total_detour_distance
    (segment_to_meeting_distance || 0) + (segment_from_meeting_distance || 0)
  end

  # Vérifie si les segments de route sont complets
  def route_complete?
    segment_to_meeting.present? && segment_from_meeting.present?
  end
end
