class PagesController < ApplicationController
  before_action :authenticate_user!
  skip_before_action :authenticate_user!, only: [:isochrone]

  def home
    @points = Point.includes(meet_ups: :participations).all
    @meet_ups = MeetUp.all
    @markers = @points.map do |point|

      {
        lat: point.latitude,
        lng: point.longitude,
        marker_name: point.name,
        point_id: point.id,
        has_active_meetup: point.meet_ups.any?(&:active?),
        info_window_html: render_to_string(
          partial: "shared/bulle_meetup",
          locals: {
            point: point,
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
    @participations = Participation.includes(:meet_up).where(user_id: current_user.id)
  end

  def markers
    # Optimisation : uniquement les points avec meetups actifs pour réduire la charge
    @points = Point.includes(meet_ups: { participations: :user })
                   .joins(meet_ups: :participations)
                   .where('participations.updated_at > ?', 40.minutes.ago)
                   .distinct

    markers = @points.map do |point|
      active_meetups = point.meet_ups.select(&:active?)
      next if active_meetups.empty?

      {
        lat: point.latitude,
        lng: point.longitude,
        marker_name: point.name,
        point_id: point.id,
        has_active_meetup: true,
        info_window_html: render_to_string(
          partial: "shared/bulle_meetup",
          locals: {
            point: point,
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
    end.compact

    render json: markers
  end
end
