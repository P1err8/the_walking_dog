# =============================================================================
# TODO: Ce fichier peut être supprimé - Fonctionnalité non utilisée
# Modèle pour les rencontres automatiques entre promeneurs (non activé)
# Aucune route ne pointe vers ce modèle. Fait partie du système de rencontres automatiques.
# =============================================================================
class WalkingMeeting < ApplicationRecord
  belongs_to :user_a, class_name: 'User'
  belongs_to :user_b, class_name: 'User'
  belongs_to :walking_a, class_name: 'Walking'
  belongs_to :walking_b, class_name: 'Walking'

  has_many :meeting_routes, dependent: :destroy

  # Enum pour le statut de la rencontre
  enum status: {
    proposed: 0,
    accepted: 1,
    in_progress: 2,
    completed: 3,
    cancelled: 4
  }

  # Validations
  validates :match_id, presence: true, uniqueness: true
  validates :user_a_id, :user_b_id, :walking_a_id, :walking_b_id, presence: true
  validates :status, presence: true
  validate :users_must_be_different
  validate :walkings_must_be_different

  # Callbacks
  before_validation :generate_match_id, on: :create
  before_create :set_proposed_at

  # Scopes
  scope :active, -> { where(status: [:proposed, :accepted, :in_progress]) }
  scope :pending, -> { where(status: :proposed) }
  scope :for_user, ->(user_id) { where("user_a_id = ? OR user_b_id = ?", user_id, user_id) }

  # Méthodes d'action sur le statut
  def accept!
    update!(status: :accepted, accepted_at: Time.current)
  end

  def start!
    update!(status: :in_progress, meeting_started_at: Time.current)
  end

  def complete!
    update!(status: :completed, meeting_ended_at: Time.current)
  end

  def cancel!
    update!(status: :cancelled)
  end

  # Vérifie si un utilisateur fait partie de cette rencontre
  def includes_user?(user_id)
    user_a_id == user_id || user_b_id == user_id
  end

  # Retourne l'autre utilisateur de la rencontre
  def other_user(user_id)
    user_a_id == user_id ? user_b : user_a
  end

  # Retourne l'autre walking de la rencontre
  def other_walking(user_id)
    user_a_id == user_id ? walking_b : walking_a
  end

  private

  def generate_match_id
    self.match_id ||= SecureRandom.uuid
  end

  def set_proposed_at
    self.proposed_at ||= Time.current
  end

  def users_must_be_different
    errors.add(:user_b_id, "doit être différent de user_a") if user_a_id == user_b_id
  end

  def walkings_must_be_different
    errors.add(:walking_b_id, "doit être différent de walking_a") if walking_a_id == walking_b_id
  end
end
