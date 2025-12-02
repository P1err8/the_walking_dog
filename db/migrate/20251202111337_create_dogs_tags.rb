class CreateDogsTags < ActiveRecord::Migration[7.1]
  def change
    create_table :dogs_tags do |t|
      t.references :dog, null: false, foreign_key: true
      t.references :tag, null: false, foreign_key: true

      t.timestamps
    end
  end
end
