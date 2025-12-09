class AddGeolocationEnabledToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :geolocation_enabled, :boolean, default: true
  end
end
