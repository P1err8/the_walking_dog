// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"
import { cleanMapData, cleanMapDataFromElement } from "./utils/removeRoundtrips"

// Exposer les fonctions sur window pour pouvoir les appeler depuis le DOM
window.cleanMapData = cleanMapData
window.cleanMapDataFromElement = cleanMapDataFromElement
