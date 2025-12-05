class Tag < ApplicationRecord
  has_many :dogs, through: :dogs_tags
  has_many :dogs_tags, dependent: :destroy

  validates :name, presence: true, uniqueness: true
end
