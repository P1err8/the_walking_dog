class Point < ApplicationRecord
  has_many :meet_ups, dependent: :destroy
  
end
