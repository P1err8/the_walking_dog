class WalkingsController < ApplicationController
  def index
    @walkings = Walking.all
    @circuits = Circuit.find(@walkings)
  end

  def new
  end

  def show
  end
end
