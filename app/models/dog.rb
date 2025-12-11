class Dog < ApplicationRecord
  belongs_to :user
  has_many :dogs_tags, dependent: :destroy
  has_many :tags, through: :dogs_tags

  has_one_attached :photo

  validates :name, presence: { message: "Obligatoire" }
  validates :age, presence: { message: "Obligatoire" },
                  numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 30, message: "" }
  validates :race, presence: { message: "Obligatoire" }
  validates :size, presence: { message: "Obligatoire" },
                   inclusion: { in: %w[Petit Moyen Grand], message: "doit être Petit, Moyen ou Grand" }

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
