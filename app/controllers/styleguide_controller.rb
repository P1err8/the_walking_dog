# frozen_string_literal: true

# ==============================================================================
# CONTROLLER : STYLEGUIDE
# ==============================================================================
# Affiche la charte graphique de l'application The Walking Dog.
# Accessible en développement pour référence visuelle des composants.
#
# Routes :
# GET /styleguide → styleguide#index
# ==============================================================================
class StyleguideController < ApplicationController
  # Utilise un layout spécifique pour le styleguide
  layout "styleguide"

  # Désactive l'authentification pour le styleguide (si vous en avez une)
  # skip_before_action :authenticate_user!, only: [:index]

  def index
    # Rien à faire, la vue affiche le styleguide statique
  end

  def map
    # Affiche la carte interactive avec Mapbox
    # Récupérer le nom du premier chien de l'utilisateur connecté
    if user_signed_in?
      @default_dog_name = current_user.dogs.first&.name || current_user.email.split('@').first
    end
  end
end
