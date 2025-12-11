class MeetUp < ApplicationRecord
  belongs_to :point
  has_many :participations, dependent: :destroy

  # TODO: Envisager d'ajouter une validation explicite pour point (validates :point, presence: true)
  has_many :users, through: :participations
  has_many :dogs, through: :users

  scope :active, -> { joins(:participations).where('participations.created_at > ?', 1.hours.ago).distinct }

   def active?
    # Get the time of the last participation, or the meetup creation time if no one joined yet
    last_activity_time = participations.maximum(:created_at) || created_at

    # The meetup is active if the last activity was less than 2 hours ago
    last_activity_time > 1.hours.ago
  end

  def closed?
    !active?
  end
end
