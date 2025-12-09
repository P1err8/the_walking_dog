class CreateMeetingRoutes < ActiveRecord::Migration[7.1]
  def change
    create_table :meeting_routes do |t|
      t.references :walking_meeting, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true

      # Segment 1: Position actuelle → Point de rencontre
      t.jsonb :segment_to_meeting # GeoJSON LineString
      t.float :segment_to_meeting_distance # mètres
      t.float :segment_to_meeting_duration # secondes

      # Segment 2: Point de rencontre → Reprise itinéraire initial
      t.jsonb :segment_from_meeting # GeoJSON LineString
      t.float :segment_from_meeting_distance # mètres
      t.float :segment_from_meeting_duration # secondes

      # Point de reprise sur l'itinéraire initial
      t.integer :resume_point_index # Index sur la polyline originale
      t.decimal :resume_latitude, precision: 10, scale: 6
      t.decimal :resume_longitude, precision: 10, scale: 6

      t.timestamps
    end

    # Index pour les requêtes
    add_index :meeting_routes, [:walking_meeting_id, :user_id], unique: true
  end
end
