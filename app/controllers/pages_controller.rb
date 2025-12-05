class PagesController < ApplicationController
  before_action :authenticate_user!
  skip_before_action :authenticate_user!, only: [:home, :isochrone]
  def home
  end

  def isochrone
  end
end
