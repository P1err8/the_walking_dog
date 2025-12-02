class Walking < ApplicationRecord
  has_many :circuits
  has_many :users, through: :circuits
end
