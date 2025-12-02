class DogsTag < ApplicationRecord
  belongs_to :dog
  belongs_to :tag
end
