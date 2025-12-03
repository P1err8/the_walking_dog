class WalkingsController < ApplicationController
  def index
  end

  def new
    @walking = Walking.new
  end

  def create
    @walking = Walking.new(walking_params)

    if @walking.save
      # Array of arrays [lng, lat] - Perfect for Mapbox
      coordinates = [
        [4.834887,45.769481],
        [4.832574,45.768988],
        [4.833372,45.770550],
        [4.834836,45.771505],
        [4.835833,45.770623],
        [4.834887,45.769481]
      ]

      @circuit = Circuit.new(duration: @walking.wanted_duration, coordinates: coordinates, user: current_user, walking: @walking)

      if @circuit.save
        redirect_to walking_path(@walking), notice: 'Walking was successfully created.'
      else
        @walking.destroy # Rollback walking creation if circuit fails
        render :new, status: :unprocessable_entity
      end
    else
      render :new, status: :unprocessable_entity
    end
  end

  def show
    @walking = Walking.find(params[:id])
  end

  private

  def walking_params
    params.require(:walking).permit(:wanted_duration, :sociable)
  end
end
