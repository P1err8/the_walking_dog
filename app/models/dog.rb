class Dog < ApplicationRecord
  belongs_to :user
  has_many :dogs_tags, dependent: :destroy
  has_many :tags, through: :dogs_tags


  BREEDS = [
    "Labrador",
    "Berger Allemand",
    "Border Collie",
    "Golden Retriever",
    "Cairn Terrier",
    "Cocker Spaniel",
    "Bouledogue Français",
    "Chihuahua",
    "Shih Tzu",
    "Dalmatien",
    "Rottweiler",
    "Siberian Husky",
    "Yorkshire",
    "Teckel",
    "Bulldog",
    "Beagle",
    "Caniche",
    "Setter",
    "Boxer",
    "Autre"
  ].freeze
end
