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
end
