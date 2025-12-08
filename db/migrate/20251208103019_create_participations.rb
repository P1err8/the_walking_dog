class CreateParticipations < ActiveRecord::Migration[7.1]
  def change
    create_table :participations do |t|
      t.references :user, null: false, foreign_key: true
      t.references :meet_up, null: false, foreign_key: true

      t.timestamps
    end
  end
end
