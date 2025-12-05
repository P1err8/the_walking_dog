class WalkingsController < ApplicationController
  def index
    @walkings = Walking.all
    @circuits = Circuit.find(@walkings)
  end

  def new
    return redirect_to new_dog_path if current_user.dogs.empty?
    @walking = Walking.new
  end

  def create
    @walking = Walking.new(walking_params)
    #here can be found the longitude and latitude from the form in the params
    if @walking.save
      # Get coordinates from the hidden field if available, otherwise fallback to default
      coordinates = if params[:circuit_coordinates].present?
                      JSON.parse(params[:circuit_coordinates])
                    else
                      # Array of arrays [lng, lat] - Perfect for Mapbox
                      [
                        [4.834887,45.769481],
                        [4.832574,45.768988],
                        [4.833372,45.770550],
                        [4.834836,45.771505],
                        [4.835833,45.770623],
                        [4.834887,45.769481]
                      ]
                    end
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
    params.require(:walking).permit(:wanted_duration, :sociable, :address, :latitude, :longitude, :circuit_coordinates)
  end
end
