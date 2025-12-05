# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin "mapbox-gl", to: "mapbox-gl.js" # @3.16.0
pin "@turf/turf", to: "https://esm.sh/@turf/turf@6.5.0"


# ==============================================================================
# STYLEGUIDE MODULES (ajouté par Julien)
# ==============================================================================
# Ces lignes permettent d'importer les fichiers JavaScript du styleguide
# Ils gèrent l'interactivité des composants (slider, toggle buttons, etc.)
# ⚠️ NE PAS SUPPRIMER - Nécessaires pour que le styleguide fonctionne
# Fichiers concernés : app/javascript/styleguide/**/*.js
pin "styleguide/index", to: "styleguide/index.js"
pin "styleguide/map", to: "styleguide/map.js"
pin "styleguide/components/slider", to: "styleguide/components/slider.js"
pin "styleguide/components/toggle", to: "styleguide/components/toggle.js"
pin "styleguide/components/demo", to: "styleguide/components/demo.js"
pin "styleguide/components/profile-form", to: "styleguide/components/profile-form.js"
