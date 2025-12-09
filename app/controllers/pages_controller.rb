class PagesController < ApplicationController
  before_action :authenticate_user!
  skip_before_action :authenticate_user!, only: [:isochrone]

  def home
    @points = Point.all

    @markers = @points.map do |point|

      {
        lat: point.latitude,
        lng: point.longitude,
        marker_name: point.name,
        point_id: point.id,
        info_window_html: render_to_string(
          partial: "shared/bulle_meetup",
          locals: {
            name: point.name,
            type: "Point de rencontre",
            location: "Lyon, France",
            rating: "4.8",
            reviews_count: "12",
            distance: "Calcul...",
            duration: "Calcul...",
            price: "Gratuit",
            nights: "",
            dates: "",
            marker_id: "#{point.latitude}-#{point.longitude}",
            image_url: point.url_picture,
            point_id: point.id
          }
        )
      }
    end
  end

  def isochrone
  end

  def activities
    @walkings = Walking.where(user_id: current_user.id)
    @participations = Participation.where(user_id: current_user.id)
  end
end
