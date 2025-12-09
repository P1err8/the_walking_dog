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
      }
    end
  end

  def isochrone
  end
end
