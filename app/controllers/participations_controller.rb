class ParticipationsController < ApplicationController

  def create
    @meet_up = MeetUp.find(params[:meet_up_id])
    Participation.create(
      user: current_user,
      meet_up: @meet_up
    )

    redirect_to meet_up_path(@meet_up), notice: "Rencontre créée ! Calcul de l'itinéraire en cours..."
  end
end
