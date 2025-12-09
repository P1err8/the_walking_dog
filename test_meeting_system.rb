# Test du système de rencontre

puts '🧪 Test du système de rencontre'
puts '=' * 50

# 1. Création de deux utilisateurs de test
puts "\n📝 Création des utilisateurs..."
user1 = User.find_or_create_by!(email: 'test1@example.com') do |u|
  u.password = 'password123'
  u.password_confirmation = 'password123'
end
puts "✅ User 1: #{user1.email} (ID: #{user1.id})"

user2 = User.find_or_create_by!(email: 'test2@example.com') do |u|
  u.password = 'password123'
  u.password_confirmation = 'password123'
end
puts "✅ User 2: #{user2.email} (ID: #{user2.id})"

# 2. Création de balades PUBLIQUES (sociable = true)
puts "\n🚶 Création des balades publiques..."
walking1 = Walking.create!(
  sociable: true,
  wanted_duration: 30
)
puts "✅ Walking 1: ID #{walking1.id}, sociable=#{walking1.sociable}"

walking2 = Walking.create!(
  sociable: true,
  wanted_duration: 30
)
puts "✅ Walking 2: ID #{walking2.id}, sociable=#{walking2.sociable}"

# Création des circuits pour lier users et walkings
# Format GeoJSON FeatureCollection valide
valid_geojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [2.294351, 48.858844]
      },
      properties: {
        type: 'start',
        name: 'Départ'
      }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [2.294851, 48.859194]
      },
      properties: {
        type: 'end',
        name: 'Arrivée'
      }
    }
  ],
  route_metadata: {
    total_distance_km: 0.05,
    duration_minutes: 1
  }
}

Circuit.create!(
  user: user1,
  walking: walking1,
  duration: 30,
  coordinates: valid_geojson
)
Circuit.create!(
  user: user2,
  walking: walking2,
  duration: 30,
  coordinates: valid_geojson
)
puts '✅ Circuits créés'

# 3. Création de positions GPS à proximité (< 100m)
puts "\n📍 Création des positions GPS (à 50m de distance)..."

# Position 1: Paris, près de la Tour Eiffel
lat1 = 48.858844
lng1 = 2.294351

# Position 2: À environ 50m de distance
lat2 = 48.859194  # +0.00035 ≈ 39m
lng2 = 2.294851   # +0.0005 ≈ 35m

pos1 = UserPosition.create!(
  user: user1,
  walking: walking1,
  latitude: lat1,
  longitude: lng1,
  heading: 90,
  is_active: true,
  last_update_at: Time.current
)
puts "✅ Position 1: #{lat1}, #{lng1}"

pos2 = UserPosition.create!(
  user: user2,
  walking: walking2,
  latitude: lat2,
  longitude: lng2,
  heading: 180,
  is_active: true,
  last_update_at: Time.current
)
puts "✅ Position 2: #{lat2}, #{lng2}"

# Calcul de la distance
distance = pos1.distance_to(pos2)
puts "📏 Distance entre les deux: #{distance.round(1)}m"

# 4. Test de détection
puts "\n🔍 Lancement de la détection..."
detected = MeetingDetectorService.call

if detected.any?
  puts "✅ SUCCÈS! #{detected.size} rencontre(s) détectée(s)"
  detected.each do |pair|
    meeting = pair[:meeting]
    puts ""
    puts "🤝 Rencontre créée:"
    puts "   - Match ID: #{meeting.match_id}"
    puts "   - User A: #{meeting.user_a.email}"
    puts "   - User B: #{meeting.user_b.email}"
    puts "   - Distance: #{pair[:distance].round(1)}m"
    puts "   - Status: #{meeting.status}"
  end
else
  puts '❌ ÉCHEC: Aucune rencontre détectée'

  # Debug
  puts "\n🔍 Debug:"
  puts "   - Positions actives: #{UserPosition.active.count}"
  puts "   - Positions récentes: #{UserPosition.recent(5).count}"
  puts "   - Positions pour balades publiques: #{UserPosition.for_public_walkings.count}"
  puts "   - Walking 1 sociable: #{walking1.sociable}"
  puts "   - Walking 2 sociable: #{walking2.sociable}"
end

puts "\n" + '=' * 50
puts '✅ Test terminé'
