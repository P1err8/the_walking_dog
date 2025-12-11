# =============================================================================
# TODO: Ce fichier peut être supprimé - Fonctionnalité non utilisée
# Contrôleur pour gérer les positions utilisateurs en temps réel (non activé)
# Aucune route ne pointe vers ce contrôleur.
# =============================================================================
class UserPositionsController < ApplicationController
  before_action :authenticate_user!

  # POST /user_positions
  def create
    walking = Walking.find(params[:walking_id])

    unless walking.user_id == current_user.id
      render json: { error: "Accès non autorisé" }, status: :forbidden
      return
    end

    @position = UserPosition.find_or_initialize_by(
      user: current_user,
      walking: walking
    )

    if @position.update(position_params)
      render json: {
        success: true,
        position: @position
      }
    else
      render json: {
        error: @position.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /user_positions/:id
  def update
    @position = UserPosition.find(params[:id])

    unless @position.user_id == current_user.id
      render json: { error: "Accès non autorisé" }, status: :forbidden
      return
    end

    if @position.update(position_params)
      render json: {
        success: true,
        position: @position
      }
    else
      render json: {
        error: @position.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  private

  def position_params
    params.require(:user_position).permit(
      :latitude,
      :longitude,
      :heading,
      :route_progress_index,
      :route_progress_percent,
      :is_active
    ).merge(last_update_at: Time.current)
  end
end
