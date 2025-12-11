class Point < ApplicationRecord
  has_many :meet_ups, dependent: :destroy

  # TODO: Envisager d'ajouter des validations (lat, lng, name presence)
end
