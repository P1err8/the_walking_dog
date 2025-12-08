class CreateMeetUps < ActiveRecord::Migration[7.1]
  def change
    create_table :meet_ups do |t|
      t.references :point, null: false, foreign_key: true

      t.timestamps
    end
  end
end
