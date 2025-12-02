//= link_tree ../images

// ==============================================================================
// MODIFIÉ PAR JULIEN : link_directory → link_tree
// ==============================================================================
// AVANT : //= link_directory ../stylesheets .css
// APRÈS  : //= link_tree ../stylesheets .css
//
// POURQUOI ? link_directory ne charge QUE les fichiers à la racine
//            link_tree charge TOUS les fichiers, même dans les sous-dossiers
//            Nécessaire pour charger : app/assets/stylesheets/styleguide/**/*.css
// ⚠️ NE PAS REMETTRE link_directory sinon le styleguide ne marchera plus !
//= link_tree ../stylesheets .css

//= link_tree ../../javascript .js
//= link_tree ../../../vendor/javascript .js
