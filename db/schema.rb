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

ActiveRecord::Schema[7.1].define(version: 2025_12_08_103019) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

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

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
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

  add_foreign_key "dogs", "users"
  add_foreign_key "dogs_tags", "dogs"
  add_foreign_key "dogs_tags", "tags"
  add_foreign_key "meet_ups", "points"
  add_foreign_key "participations", "meet_ups"
  add_foreign_key "participations", "users"
  add_foreign_key "walkings", "users"
end
