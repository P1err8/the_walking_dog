class CreateWalkings < ActiveRecord::Migration[7.1]
  def change
    create_table :walkings do |t|
      t.boolean :sociable
      t.text :meetup_coordinates
      t.float :meetup_duration
      t.float :wanted_duration

      t.timestamps
    end
  end
end
