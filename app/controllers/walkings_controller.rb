class WalkingsController < ApplicationController
  def index
    @walkings = Walking.all
    @circuits = Circuit.find(@walkings)
  end

  def new
    @walking = Walking.new
  end

  def create
    @walking = Walking.new(walking_params)

    if @walking.save
      begin
        # Générer l'itinéraire avec le RouteGeneratorService
        # Utilise la logique fusionnée : isochrone + polygone guidé
        route_data = RouteGeneratorService.new(
          @walking.latitude,
          @walking.longitude,
          @walking.wanted_duration
        ).generate_route

        # Créer le circuit avec le GeoJSON complet
        @circuit = Circuit.new(
          duration: route_data[:route_metadata][:estimated_duration_minutes],
          coordinates: route_data, # GeoJSON FeatureCollection complet
          user: current_user,
          walking: @walking
        )

        if @circuit.save
          redirect_to walking_path(@walking), notice: '✅ Balade générée avec succès !'
        else
          @walking.destroy # Rollback si circuit fails
          flash.now[:alert] = "Erreur lors de la création du circuit : #{@circuit.errors.full_messages.join(', ')}"
          render :new, status: :unprocessable_entity
        end
      rescue StandardError => e
        @walking.destroy # Rollback en cas d'erreur
        Rails.logger.error "❌ Erreur génération itinéraire: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
        flash.now[:alert] = "Impossible de générer l'itinéraire. Veuillez réessayer avec une autre adresse."
        render :new, status: :unprocessable_entity
      end
    else
      render :new, status: :unprocessable_entity
    end
  end

  def show
    @walking = Walking.find(params[:id])
    @dog = current_user.dogs.first if current_user # Récupérer le premier chien de l'utilisateur

    respond_to do |format|
      format.html
      format.json { render json: @walking.circuit.to_geojson }
      format.gpx  { send_data @walking.circuit.to_gpx, filename: "balade_#{@walking.id}.gpx", type: 'application/gpx+xml' }
    end
  end

  private

  def walking_params
    params.require(:walking).permit(:wanted_duration, :sociable, :address, :latitude, :longitude)
  end
end
