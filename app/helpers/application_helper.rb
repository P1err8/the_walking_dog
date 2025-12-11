module ApplicationHelper
  DEFAULT_META = {
    title: "The Walking Dog - Promenez votre chien avec passion",
    description: "Découvrez The Walking Dog, l'application pour promener votre chien, suivre vos balades et rencontrer d'autres propriétaires de chiens.",
    image: "https://s10.aconvert.com/convert/p3r68-cdx67/aqakk-mkoat.jpg"
  }.freeze

  def page_title
    if content_for?(:title)
      "#{content_for(:title)} | The Walking Dog"
    else
      DEFAULT_META[:title]
    end
  end

  def page_description
    content_for?(:description) ? content_for(:description) : DEFAULT_META[:description]
  end

  def page_image
    image = content_for?(:image) ? content_for(:image) : DEFAULT_META[:image]
    return image if image.start_with?("http", "/")

    image_url(image)
  end

  def static_map_url(walking)
    return "" unless walking.coordinates.present?

    coords = walking.coordinates
    coords = JSON.parse(coords) if coords.is_a?(String)
    return "" unless coords.is_a?(Array) && coords.any?

    # if it's too big the api won't work
    if coords.length > 20
      step = (coords.length / 20).ceil
      coords = coords.select.with_index { |_, i| i % step == 0 }
    end

    # this make a closed loop if not already
    coords << coords.first if coords.first != coords.last

    # that's what we send to mapbox api
    geojson = {
      type: "Feature",
      properties: {
        stroke: "#ff4500",
        "stroke-width": 3,
        "stroke-opacity": 0.8
      },
      geometry: {
        type: "LineString",
        coordinates: coords
      }
    }

    encoded_geojson = CGI.escape(geojson.to_json)

    "https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/geojson(#{encoded_geojson})/auto/600x300?padding=60&access_token=#{ENV['MAPBOX_API_KEY']}"
  end

  def static_marker_map_url(point)
    return "" unless point.latitude.present? && point.longitude.present?

    "https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-m+ff4500(#{point.longitude},#{point.latitude})/#{point.longitude},#{point.latitude},14/600x300?access_token=#{ENV['MAPBOX_API_KEY']}"
  end
end
