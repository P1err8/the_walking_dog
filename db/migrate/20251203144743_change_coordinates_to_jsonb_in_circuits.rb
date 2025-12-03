class ChangeCoordinatesToJsonbInCircuits < ActiveRecord::Migration[7.1]
  def change
    change_column :circuits, :coordinates, :jsonb, using: 'coordinates::jsonb'
  end
end
