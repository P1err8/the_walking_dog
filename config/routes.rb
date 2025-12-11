Rails.application.routes.draw do
  devise_for :users
  root to: "pages#home"
  resources :walkings, only: %i[index show new create destroy]
  resources :meet_ups, only: %i[show create destroy] do
    resources :participations, only: %i[create] do
      collection do
        post :arrive
      end
    end
  end
  resources :dogs, only: %i[index show new create edit update] # TODO: index non utilisé, peut être supprimé

  get "my_activities", to: "pages#activities", as: "my_activities"
  get "api/markers", to: "pages#markers", as: "api_markers"

  # ==============================================================================
  # STYLEGUIDE - Charte graphique (ajouté par Julien)
  # ==============================================================================
  # Route pour accéder au styleguide à : http://localhost:3000/styleguide
  # ⚠️ NE PAS SUPPRIMER - Utilisé par toute l'équipe pour voir les composants CSS/JS
  get "styleguide", to: "styleguide#index"
  get "styleguide/map", to: "styleguide#map"

  get '/isochrone', to: 'pages#isochrone'
end
