Rails.application.routes.draw do

  devise_for :users
  root to: "pages#home"
  resources :walkings, only: %i[index show new]

  resources :dogs, only: %i[index show new create]

end
