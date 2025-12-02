class CreateCircuits < ActiveRecord::Migration[7.1]
  def change
    create_table :circuits do |t|
      t.float :duration
      t.text :coordinates
      t.references :walking, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
  end
end
