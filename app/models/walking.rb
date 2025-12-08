class Walking < ApplicationRecord
  attr_accessor :address, :latitude, :longitude

  # has_many :users
  #  has_many :circuits

  belongs_to :user
end
