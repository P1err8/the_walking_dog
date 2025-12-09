module ApplicationHelper
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

    "https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/geojson(#{encoded_geojson})/auto/600x300?padding=60&access_token=#{ENV['MAPBOX_API_KEY']}"
  end
end
