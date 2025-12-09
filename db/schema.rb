# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2025_12_09_161759) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "dogs", force: :cascade do |t|
    t.string "name"
    t.string "size"
    t.integer "age"
    t.string "race"
    t.text "url_picture"
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_dogs_on_user_id"
  end

  create_table "dogs_tags", force: :cascade do |t|
    t.bigint "dog_id", null: false
    t.bigint "tag_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["dog_id"], name: "index_dogs_tags_on_dog_id"
    t.index ["tag_id"], name: "index_dogs_tags_on_tag_id"
  end

  create_table "meet_ups", force: :cascade do |t|
    t.bigint "point_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["point_id"], name: "index_meet_ups_on_point_id"
  end

  create_table "meeting_routes", force: :cascade do |t|
    t.bigint "walking_meeting_id", null: false
    t.bigint "user_id", null: false
    t.jsonb "segment_to_meeting"
    t.float "segment_to_meeting_distance"
    t.float "segment_to_meeting_duration"
    t.jsonb "segment_from_meeting"
    t.float "segment_from_meeting_distance"
    t.float "segment_from_meeting_duration"
    t.integer "resume_point_index"
    t.decimal "resume_latitude", precision: 10, scale: 6
    t.decimal "resume_longitude", precision: 10, scale: 6
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_meeting_routes_on_user_id"
    t.index ["walking_meeting_id", "user_id"], name: "index_meeting_routes_on_walking_meeting_id_and_user_id", unique: true
    t.index ["walking_meeting_id"], name: "index_meeting_routes_on_walking_meeting_id"
  end

  create_table "participations", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "meet_up_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["meet_up_id"], name: "index_participations_on_meet_up_id"
    t.index ["user_id"], name: "index_participations_on_user_id"
  end

  create_table "points", force: :cascade do |t|
    t.string "name"
    t.text "url_picture"
    t.float "longitude"
    t.float "latitude"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "tags", force: :cascade do |t|
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "user_positions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "walking_id", null: false
    t.decimal "latitude", precision: 10, scale: 6, null: false
    t.decimal "longitude", precision: 10, scale: 6, null: false
    t.float "heading"
    t.integer "route_progress_index"
    t.float "route_progress_percent"
    t.datetime "last_update_at", null: false
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["last_update_at"], name: "index_user_positions_on_last_update_at"
    t.index ["latitude", "longitude"], name: "index_user_positions_on_latitude_and_longitude"
    t.index ["user_id"], name: "index_user_positions_on_user_id"
    t.index ["walking_id"], name: "index_user_positions_on_walking_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "geolocation_enabled", default: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "walking_meetings", force: :cascade do |t|
    t.string "match_id", null: false
    t.bigint "user_a_id", null: false
    t.bigint "user_b_id", null: false
    t.bigint "walking_a_id", null: false
    t.bigint "walking_b_id", null: false
    t.decimal "meeting_latitude", precision: 10, scale: 6
    t.decimal "meeting_longitude", precision: 10, scale: 6
    t.string "meeting_poi_name"
    t.integer "status", default: 0, null: false
    t.float "initial_distance_meters"
    t.datetime "proposed_at"
    t.datetime "accepted_at"
    t.datetime "meeting_started_at"
    t.datetime "meeting_ended_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["match_id"], name: "index_walking_meetings_on_match_id", unique: true
    t.index ["status", "created_at"], name: "index_walking_meetings_on_status_and_created_at"
    t.index ["user_a_id"], name: "index_walking_meetings_on_user_a_id"
    t.index ["user_b_id"], name: "index_walking_meetings_on_user_b_id"
    t.index ["walking_a_id"], name: "index_walking_meetings_on_walking_a_id"
    t.index ["walking_b_id"], name: "index_walking_meetings_on_walking_b_id"
  end

  create_table "walkings", force: :cascade do |t|
    t.jsonb "coordinates"
    t.float "distance"
    t.float "duration"
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_walkings_on_user_id"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "dogs", "users"
  add_foreign_key "dogs_tags", "dogs"
  add_foreign_key "dogs_tags", "tags"
  add_foreign_key "meet_ups", "points"
  add_foreign_key "meeting_routes", "users"
  add_foreign_key "meeting_routes", "walking_meetings"
  add_foreign_key "participations", "meet_ups"
  add_foreign_key "participations", "users"
  add_foreign_key "user_positions", "users"
  add_foreign_key "user_positions", "walkings"
  add_foreign_key "walking_meetings", "users", column: "user_a_id"
  add_foreign_key "walking_meetings", "users", column: "user_b_id"
  add_foreign_key "walking_meetings", "walkings", column: "walking_a_id"
  add_foreign_key "walking_meetings", "walkings", column: "walking_b_id"
  add_foreign_key "walkings", "users"
end
