class CreatePoints < ActiveRecord::Migration[7.1]
  def change
    create_table :points do |t|
      t.string :name
      t.text :url_picture
      t.float :longitude
      t.float :latitude

      t.timestamps
    end
  end
end
