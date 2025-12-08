class CreateWalkings < ActiveRecord::Migration[7.1]
  def change
    create_table :walkings do |t|
      t.jsonb :coordinates
      t.float :distance
      t.float :duration
      t.references :user, null: false, foreign_key: true
      t.timestamps
    end
  end
end
