Rails.application.routes.draw do
  devise_for :users
  root to: "pages#home"
  resources :walkings, only: %i[index show new create]

  resources :dogs, only: %i[index show new create]

  # ==============================================================================
  # STYLEGUIDE - Charte graphique (ajouté par Julien)
  # ==============================================================================
  # Route pour accéder au styleguide à : http://localhost:3000/styleguide
  # ⚠️ NE PAS SUPPRIMER - Utilisé par toute l'équipe pour voir les composants CSS/JS
  get "styleguide", to: "styleguide#index"
  get "styleguide/map", to: "styleguide#map"

end
