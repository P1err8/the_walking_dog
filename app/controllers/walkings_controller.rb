class WalkingsController < ApplicationController
  def index
    @walkings = Walking.all
  end

  def new
    return redirect_to new_dog_path if current_user.dogs.empty?
    @walking = Walking.new
  end

  def create
    @walking = Walking.new(walking_params)
    #here can be found the longitude and latitude from the form in the params
    coordinates = if params[:coordinates].present?
                  JSON.parse(params[:coordinates])
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

      @walking.coordinates = coordinates
      @walking.user = current_user
    if @walking.save
      # Get coordinates from the hidden field if available, otherwise fallback to default
      redirect_to walking_path(@walking), notice: 'Walking was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def show
    @walking = Walking.find(params[:id])
  end

  private

  def walking_params
    params.require(:walking).permit(:duration, :latitude, :longitude, :coordinates)
  end
end
