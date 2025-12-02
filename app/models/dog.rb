class Dog < ApplicationRecord
  belongs_to :user
  has_many :tags, through: :dogs_tags
end
