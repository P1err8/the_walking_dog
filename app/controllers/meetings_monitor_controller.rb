# =============================================================================
# TODO: Ce fichier peut être supprimé - Fonctionnalité non utilisée
# Contrôleur pour monitorer les rencontres automatiques (non activé)
# Aucune route ne pointe vers ce contrôleur.
# =============================================================================
class MeetingsMonitorController < ApplicationController
  skip_before_action :authenticate_user!, only: [:index, :positions, :detect]

  def index
    @active_positions = UserPosition
      .active
      .recent(5)
      .includes(:user, :walking)
      .order(last_update_at: :desc)

    @meetings = WalkingMeeting
      .includes(:user_a, :user_b, :walking_a, :walking_b)
      .order(created_at: :desc)
      .limit(20)
  end

  # API endpoint pour voir les positions actives
  def positions
    positions = UserPosition
      .active
      .recent(5)
      .includes(:user, :walking)
      .map do |pos|
        {
          id: pos.id,
          user_email: pos.user.email,
          walking_id: pos.walking_id,
          walking_sociable: pos.walking.sociable,
          latitude: pos.latitude,
          longitude: pos.longitude,
          is_active: pos.is_active,
          available_for_meeting: pos.available_for_meeting?,
          last_update: pos.last_update_at
        }
      end

    render json: {
      count: positions.size,
      positions: positions
    }
  end

  # API endpoint pour déclencher manuellement la détection
  def detect
    detected = MeetingDetectorService.call

    render json: {
      success: true,
      detected_count: detected.size,
      meetings: detected.map do |pair|
        {
          match_id: pair[:meeting].match_id,
          user_a: pair[:position_a].user.email,
          user_b: pair[:position_b].user.email,
          distance_meters: pair[:distance].round(1),
          status: pair[:meeting].status
        }
      end
    }
  end
end
