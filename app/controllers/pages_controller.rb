class PagesController < ApplicationController
  before_action :authenticate_user!
  skip_before_action :authenticate_user!, only: [:home, :stepcounter]
  def home
  end

  def stepcounter
  end
end
