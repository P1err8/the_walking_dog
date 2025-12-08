class MeetUp < ApplicationRecord
  belongs_to :point
  has_many :participations
  has_many :users, through: :participations
  has_many :dogs, through: :users
end
