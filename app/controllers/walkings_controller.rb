class WalkingsController < ApplicationController
  def index
  end

  def new
    @walking = Walking.new
  end

  def create
    @walking = Walking.new(walking_params)
    
    # need to generate les coordinates here
    coordinates = [
      "4.832319,45.756727",
      "4.830339,45.759858",
      "4.832083,45.763224",
      "4.835149,45.762943",
      "4.835395,45.757722",
      "4.832319,45.756727"
    ] # placeholder for actual coordinates generation logic

    @circuit = Circuit.new(duration: @walking.wanted_duration, coordinates: coordinates, user: current_user)
    raise
    if @walking.save
      redirect_to walkings_path(@walkings), notice: 'Walking was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def show
  end

  private

  def walking_params
    params.require(:walking).permit(:wanted_duration, :sociable)
  end
end
