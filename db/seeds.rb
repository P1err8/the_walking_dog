
puts "Cleaning database..."
puts ""
User.destroy_all
puts "Done."
puts ""

puts "Creating seed user..."
puts ""
puts ""


user1 = User.create!(
  email: "user1@demo.com",
  password: "demodemo"
)

user2 = User.create!(
  email: "user2@demo.com",
  password: "demodemo"
)

puts "the user with the #{user1.email} has been created!"
puts " "
puts " "

puts "the user with the #{user2.email} has been created!"
puts " "
puts " "

dogs_tags = ["friendly", "calm", "playful", "energetic", "protective", "shy"]

puts "Creating tags..."
tags = dogs_tags.map do |tag_name|
  Tag.create!(name: tag_name)
end

puts "All tags have been created!"
puts " "
puts " "

croket = Dog.create!(
  name: "Croket",
  size: "small",
  age: 3,
  race: "chihuahua",
  url_picture: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.trupanion.com%2Fen-ca%2Fpet-blog%2Farticle%2Fchihuahua&psig=AOvVaw3NMGD_uY9DEXh2-JH0PJGA&ust=1764776956061000&source=images&cd=vfe&opi=89978449&ved=0CBUQjRxqFwoTCMDF7tCgn5EDFQAAAAAdAAAAABAE",
  user: user1
)

puts "#{croket.name} has been created!"
puts " "
puts " "

rex = Dog.create!(
  name: "Rex",
  size: "large",
  age: 3,
  race: "saint-bernard",
  url_picture: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.diconimoz.com%2Fanimaux-fiches%2Fchiens%2Fsaint-bernard%2F&psig=AOvVaw1u4hDWwjDpO9yUIZRnh5q_&ust=1764777363233000&source=images&cd=vfe&opi=89978449&ved=0CBUQjRxqFwoTCJDXxZKin5EDFQAAAAAdAAAAABAE",
  user: user2
)

puts "#{rex.name} has been created!"
puts " "
puts " "
puts "Associating tags to dogs..."

croket.tags << tags[0]  # friendly
croket.tags << tags[2]  # playful
rex.tags << tags[1]     # calm
rex.tags << tags[3]     # energetic

puts "Tags have been associated!"
puts " "
puts " "

puts "Creating walkings..."

user1walking = Walking.create!(
  sociable: true,
  meetup_coordinates: "[48.8566, 2.3522]",
  meetup_duration: 60,
  wanted_duration: 45
)

user2walking = Walking.create!(
  sociable: true,
  meetup_coordinates: "[48.8566, 2.3522]",
  meetup_duration: 60,
  wanted_duration: 15
)

puts "Creating circuits..."
user1circuit = Circuit.create!(
  duration: 45,
  coordinates: [[48.8566, 2.3522], [48.8570, 2.3530], [48.8580, 2.3540]],
  walking: user1walking,
  user: user1
)
user2circuit = Circuit.create!(
  duration: 15,
  coordinates: [[48.8566, 2.3522], [48.8575, 2.3535], [48.8585, 2.3545]],
  walking: user2walking,
  user: user2
)

puts "Walkings and circuits have been created!"
puts " "
puts " "


puts "All done! #{User.all.count} users have been created."
puts "#{Dog.all.count} dogs have been created."
