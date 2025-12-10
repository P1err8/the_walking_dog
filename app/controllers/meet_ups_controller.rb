class MeetUpsController < ApplicationController

  def show
    @meet_up = MeetUp.find(params[:id])
    @point = @meet_up.point

    # On prépare les coordonnées de destination pour la map
    @destination = {
      lat: @point.latitude,
      lng: @point.longitude,
      info_window_html: render_to_string(partial: "shared/bulle_meetup", locals: {
        point_id: @point.id,
        name: @point.name,
        image_url: @point.url_picture,
        type: "Point de rencontre",
        location: "Lyon, France"
       })
    }
  end

  def create
    @meet_up = MeetUp.new(meet_up_params)

    if @meet_up.save
      # Création de la participation
      Participation.create!(
        user: current_user,
        meet_up: @meet_up
      )

      # Redirection vers la show pour afficher la map et l'itinéraire
      redirect_to meet_up_path(@meet_up), notice: "Rencontre créée ! Calcul de l'itinéraire en cours..."
    else
      redirect_to root_path, alert: "Erreur lors de la création."
    end
  end

  private

  def meet_up_params
    params.require(:meet_up).permit(:point_id)
  end

end
