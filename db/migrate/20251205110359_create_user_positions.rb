class CreateUserPositions < ActiveRecord::Migration[7.1]
  def change
    create_table :user_positions do |t|
      t.references :user, null: false, foreign_key: true
      t.references :walking, null: false, foreign_key: true

      # Position GPS actuelle
      t.decimal :latitude, precision: 10, scale: 6, null: false
      t.decimal :longitude, precision: 10, scale: 6, null: false
      t.float :heading # Direction en degrés (0-360)

      # Statut de disponibilité pour rencontre
      t.integer :dog_mode, default: 0, null: false # 0: solo, 1: ok_rencontre

      # Progrès sur l'itinéraire
      t.integer :route_progress_index # Index du point actuel sur la polyline
      t.float :route_progress_percent # Pourcentage de complétion (0.0-1.0)

      # Métadonnées
      t.datetime :last_update_at, null: false
      t.boolean :is_active, default: true, null: false

      t.timestamps
    end

    # Index pour les requêtes de proximité
    add_index :user_positions, [:latitude, :longitude]
    add_index :user_positions, [:dog_mode, :is_active]
    add_index :user_positions, :last_update_at
  end
end
