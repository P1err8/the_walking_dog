class PagesController < ApplicationController
  before_action :authenticate_user!
  skip_before_action :authenticate_user!, only: [:isochrone]

  def home
    @meetups = MeetUp.all

    @markers = @meetups.map do |meetup|
      latitude = Point.find(meetup.point_id).latitude
      longitude = Point.find(meetup.point_id).longitude
      {
        lat: latitude,
        lng: longitude,
        # Optionnel : info window
        #info_window_html: render_to_string(partial: "info_window", locals: { meetup: meetup }),
        # Optionnel : image custom
        #marker_html: render_to_string(partial: "marker", locals: { meetup: meetup })
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
