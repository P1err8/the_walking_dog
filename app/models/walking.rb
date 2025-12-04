class Walking < ApplicationRecord
  attr_accessor :address, :latitude, :longitude

  # has_many :users
  #  has_many :circuits

  has_one :circuit, dependent: :destroy
  has_one :user, through: :circuit
end
