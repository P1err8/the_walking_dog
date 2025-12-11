# =============================================================================
# TODO: Ce fichier peut être supprimé - Fonctionnalité non utilisée
# Système de détection automatique de rencontres entre promeneurs (non activé)
# Aucune route ne pointe vers ce service. Nécessite aussi la colonne 'sociable' sur walkings.
# =============================================================================
class MeetingDetectorService
  PROXIMITY_THRESHOLD_METERS = 100
  POSITION_FRESHNESS_MINUTES = 5

  def self.call
    new.call
  end

  def call
    detected_pairs = []

    # Récupère toutes les positions actives pour les balades PUBLIQUES uniquement
    available_positions = UserPosition
      .active
      .recent(POSITION_FRESHNESS_MINUTES)
      .joins(:walking)
      .where(walkings: { sociable: true })
      .includes(:user, :walking)

    # Compare chaque paire d'utilisateurs
    available_positions.each_with_index do |pos_a, i|
      available_positions[(i + 1)..-1].each do |pos_b|
        next if pos_a.user_id == pos_b.user_id # Même utilisateur
        next if already_has_active_meeting?(pos_a.user_id, pos_b.user_id) # Déjà une rencontre active

        distance = pos_a.distance_to(pos_b)

        if distance <= PROXIMITY_THRESHOLD_METERS
          detected_pairs << create_meeting_proposal(pos_a, pos_b, distance)
        end
      end
    end

    detected_pairs
  end

  private

  def already_has_active_meeting?(user_a_id, user_b_id)
    WalkingMeeting.active.where(
      "(user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)",
      user_a_id, user_b_id, user_b_id, user_a_id
    ).exists?
  end

  def create_meeting_proposal(pos_a, pos_b, distance)
    # Assure que user_a_id < user_b_id pour cohérence
    user_a, user_b = [pos_a, pos_b].sort_by { |p| p.user_id }

    meeting = WalkingMeeting.create!(
      user_a: user_a.user,
      user_b: user_b.user,
      walking_a: user_a.walking,
      walking_b: user_b.walking,
      initial_distance_meters: distance,
      status: :proposed
    )

    {
      meeting: meeting,
      position_a: user_a,
      position_b: user_b,
      distance: distance
    }
  end
end
