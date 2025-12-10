class ParticipationsController < ApplicationController

  def create
    @meet_up = MeetUp.find(params[:meet_up_id])
    Participation.create(
      user: current_user,
      meet_up: @meet_up
    )

    redirect_to meet_up_path(@meet_up), notice: "Rencontre créée ! Calcul de l'itinéraire en cours..."
  end

  def arrive
    @meet_up = MeetUp.find(params[:meet_up_id])
    @participation = @meet_up.participations.find_by(user: current_user)

    if @participation
      @participation.touch # Met à jour updated_at pour marquer l'arrivée
    end

    redirect_to root_path, notice: "Vous êtes arrivé au point de rencontre !"
  end
end
