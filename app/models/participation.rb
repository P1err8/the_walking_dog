class Participation < ApplicationRecord
  belongs_to :user
  belongs_to :meet_up

  validates :user_id, uniqueness: { scope: :meet_up_id, message: "a déjà rejoint cette rencontre" }
end
