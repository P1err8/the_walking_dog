class Dog < ApplicationRecord
  belongs_to :user
  has_many :dogs_tags, dependent: :destroy
  has_many :tags, through: :dogs_tags


  BREEDS = [
    "Labrador",
    "Berger Allemand",
    "Bulldog",
    "Beagle",
    "Caniche",
    "Setter",
    "Boxer",
    "Autre"
  ].freeze
end
