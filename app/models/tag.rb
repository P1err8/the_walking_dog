class Tag < ApplicationRecord
  has_many :dogs, through: :dogs_tags
end
