class MeetUp < ApplicationRecord
  belongs_to :point
  has_many :participations, dependent: :destroy

  # TODO: Envisager d'ajouter une validation explicite pour point (validates :point, presence: true)
  has_many :users, through: :participations
  has_many :dogs, through: :users

  # Scope pour récupérer les meetups avec participations récentes (utilisé comme filtre initial)
  # La vérification finale se fait avec active? qui vérifie present_dogs
  scope :with_recent_activity, -> {
    joins(:participations)
      .where('participations.updated_at > ?', 40.minutes.ago)
      .distinct
  }

   def active?
    # Un meetup est actif s'il a des chiens présents (arrivés il y a moins de 40 min)
    present_dogs.any?
  end

  def closed?
    !active?
  end

  # Retourne les chiens des utilisateurs arrivés il y a moins de 40 minutes
  def present_dogs
    active_participations = participations.where('updated_at > ?', 40.minutes.ago)
    User.joins(:participations)
        .where(participations: { id: active_participations.pluck(:id) })
        .includes(:dogs)
        .flat_map(&:dogs)
        .uniq
  end
end
