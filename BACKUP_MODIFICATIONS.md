# Sauvegarde des modifications - Système de présence des chiens (40 minutes)

## Fichiers à modifier :

### 1. app/models/meet_up.rb
```ruby
class MeetUp < ApplicationRecord
  belongs_to :point
  has_many :participations, dependent: :destroy
  has_many :users, through: :participations
  has_many :dogs, through: :users

  # Scope pour récupérer les meetups avec participations récentes (utilisé comme filtre initial)
  # La vérification finale se fait avec active? qui vérifie present_dogs
  scope :with_recent_activity, -> { 
    joins(:participations)
      .where('participations.updated_at > ?', 40.minutes.ago)
      .distinct
  }

   def active?
    # Un meetup est actif s'il a des chiens présents (arrivés il y a moins de 40 min)
    present_dogs.any?
  end

  def closed?
    !active?
  end

  # Retourne les chiens des utilisateurs arrivés il y a moins de 40 minutes
  def present_dogs
    active_participations = participations.where('updated_at > ?', 40.minutes.ago)
    User.joins(:participations)
        .where(participations: { id: active_participations.pluck(:id) })
        .includes(:dogs)
        .flat_map(&:dogs)
        .uniq
  end
end
```

### 2. app/controllers/participations_controller.rb
```ruby
class ParticipationsController < ApplicationController

  def create
    @meet_up = MeetUp.find(params[:meet_up_id])
    Participation.create(
      user: current_user,
      meet_up: @meet_up
    )

    redirect_to meet_up_path(@meet_up), notice: "Rencontre créée ! Calcul de l'itinéraire en cours..."
  end

  def arrive
    @meet_up = MeetUp.find(params[:meet_up_id])
    @participation = @meet_up.participations.find_by(user: current_user)

    if @participation
      @participation.touch # Met à jour updated_at pour marquer l'arrivée
    end

    redirect_to root_path, notice: "Vous êtes arrivé au point de rencontre !"
  end
end
```

### 3. config/routes.rb
Ajouter dans les routes :
```ruby
  resources :meet_ups, only: %i[show create] do
    resources :participations, only: %i[create] do
      collection do
        post :arrive
      end
    end
  end
```

### 4. app/views/shared/_navigation_panel.html.erb
Modifier le bouton Terminer :
```erb
	<!-- Bouton Terminer -->
	<% if local_assigns[:meet_up] %>
		<%= button_to "Terminer", arrive_meet_up_participations_path(meet_up), method: :post, class: "navigation-panel__end-btn", data: { turbo: false } do %>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
				<path d="M6 6h12v12H6z"/>
			</svg>
			Terminer
		<% end %>
	<% else %>
		<%= link_to root_path, class: "navigation-panel__end-btn", data: { turbo: false, action: "click->active-walking#clearActiveWalking" } do %>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
				<path d="M6 6h12v12H6z"/>
			</svg>
			Terminer
		<% end %>
	<% end %>
```

### 5. app/views/shared/_navigation_panel_meetup.html.erb
Passer meet_up au partial :
```erb
<div class="navigation-panel-wrapper"
		 data-controller="navigation draggable-panel">

	<!-- Bouton recentrer flottant au-dessus du panel -->
	<button type="button"
					data-action="click->navigation#recenter"
					class="navigation-panel__floating-recenter-btn"
					aria-label="Me recentrer">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
			<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
		</svg>
	</button>

	<div class="navigation-panel"
			 data-action="mousedown->draggable-panel#startDrag
			              touchstart->draggable-panel#startDrag:!passive
			              mousemove@window->draggable-panel#drag
			              touchmove@window->draggable-panel#drag:!passive
			              mouseup@window->draggable-panel#endDrag
			              touchend@window->draggable-panel#endDrag">
		<%= render "shared/navigation_panel", meet_up: destination[:meet_up] if destination[:meet_up] %>
	</div>
</div>
```

### 6. app/controllers/meet_ups_controller.rb
Ajouter meet_up dans @destination :
```ruby
  def show
    @meet_up = MeetUp.find(params[:id])
    @point = @meet_up.point

    # On prépare les coordonnées de destination pour la map
    @destination = {
      lat: @point.latitude,
      lng: @point.longitude,
      meet_up: @meet_up,
      info_window_html: render_to_string(partial: "shared/bulle_meetup", locals: {
        point: @point,
        point_id: @point.id,
        name: @point.name,
        image_url: @point.url_picture,
        type: "Point de rencontre",
        location: "Lyon, France"
       })
    }
  end
```

### 7. app/views/shared/_bulle_meetup.html.erb
Utiliser present_dogs et gérer active_meetup :
```erb
    <% if point.meet_ups.any?(&:active?) %>
      <% active_meetup = point.meet_ups.with_recent_activity.find(&:active?) %>
      <% if active_meetup %>
        <% dogs = active_meetup.present_dogs %>

      <% if dogs.any? %>
        <div class="bulle-meetup__dogs">
          <div class="bulle-meetup__dogs-avatars">
            <% dogs.each do |dog| %>
              <% if dog.url_picture.present? %>
                <%= image_tag dog.url_picture, alt: dog.name, class: "bulle-meetup__dog-avatar-small" %>
              <% else %>
                <div class="bulle-meetup__dog-avatar-small placeholder">🐕</div>
              <% end %>
            <% end %>
          </div>
          <div class="bulle-meetup__dogs-races">
            <% race_counts = dogs.group_by(&:race).transform_values(&:count) %>
            <% race_counts.each_with_index do |(race, count), index| %>
              <span class="bulle-meetup__dog-race"><%= count %> <%= race %></span><%= index < race_counts.size - 1 ? ' - ' : '' %>
            <% end %>
          </div>
        </div>
      <% end %>

      <% unless controller_name == 'meet_ups' && action_name == 'show' %>
        <%= simple_form_for [active_meetup, Participation.new] do |f| %>
          <%= f.submit "Rejoindre la Rencontre", class: "btn btn-primary btn-sm" %>
        <% end %>
      <% end %>
      <% end %>
    <% else %>
      <% unless controller_name == 'meet_ups' && action_name == 'show' %>
        <%= simple_form_for MeetUp.new do |f| %>
          <%# Champ caché pour lier le meetup au point actuel %>
          <%= f.input :point_id, as: :hidden, input_html: { value: point_id } %>
          <%= f.submit "Créer une Rencontre", class: "btn btn-primary btn-sm" %>
        <% end %>
      <% end %>
    <% end %>
```

## Résumé des modifications :
1. ✅ Ajout de `present_dogs` dans MeetUp (filtre sur updated_at < 40 min)
2. ✅ Modification de `active?` pour utiliser `present_dogs.any?`
3. ✅ Ajout de l'action `arrive` dans ParticipationsController
4. ✅ Route `arrive` ajoutée
5. ✅ Bouton "Terminer" modifié pour appeler `arrive`
6. ✅ Bulle mise à jour pour afficher `present_dogs`
7. ✅ Scope `with_recent_activity` pour optimiser les requêtes

## Comportement :
- Quand user clique "Terminer" → `participation.touch` met à jour `updated_at`
- Les chiens sont visibles pendant 40 minutes
- Après 40 minutes, le chien disparaît automatiquement
- Le meetup devient inactif quand aucun chien présent
