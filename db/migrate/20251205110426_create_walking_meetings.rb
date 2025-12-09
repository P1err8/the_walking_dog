class CreateWalkingMeetings < ActiveRecord::Migration[7.1]
  def change
    create_table :walking_meetings do |t|
      t.string :match_id, null: false # UUID unique

      # Les deux utilisateurs
      t.references :user_a, null: false, foreign_key: { to_table: :users }
      t.references :user_b, null: false, foreign_key: { to_table: :users }
      t.references :walking_a, null: false, foreign_key: { to_table: :walkings }
      t.references :walking_b, null: false, foreign_key: { to_table: :walkings }

      # Point de rencontre
      t.decimal :meeting_latitude, precision: 10, scale: 6
      t.decimal :meeting_longitude, precision: 10, scale: 6
      t.string :meeting_poi_name # Si c'est un POI dog-friendly

      # Statut de la rencontre
      # 0: proposed, 1: accepted, 2: in_progress, 3: completed, 4: cancelled
      t.integer :status, default: 0, null: false

      # Distance initiale entre les users
      t.float :initial_distance_meters

      # Timestamps
      t.datetime :proposed_at
      t.datetime :accepted_at
      t.datetime :meeting_started_at
      t.datetime :meeting_ended_at

      t.timestamps
    end

    # Index pour les requêtes
    add_index :walking_meetings, :match_id, unique: true
    add_index :walking_meetings, [:status, :created_at]
  end
end
