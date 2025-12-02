class CreateDogs < ActiveRecord::Migration[7.1]
  def change
    create_table :dogs do |t|
      t.string :name
      t.string :size
      t.integer :age
      t.string :race
      t.text :url_picture
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
  end
end
