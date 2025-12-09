class RemoveDogModeFromUserPositions < ActiveRecord::Migration[7.1]
  def change
    remove_column :user_positions, :dog_mode, :integer
  end
end
