class Dog < ApplicationRecord
  belongs_to :user
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
