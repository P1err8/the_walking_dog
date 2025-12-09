class MeetingsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_meeting, only: %i[show accept decline start complete]

  # GET /meetings
  def index
    @meetings = WalkingMeeting
      .for_user(current_user.id)
      .active
      .order(created_at: :desc)

    respond_to do |format|
      format.html
      format.json { render json: @meetings }
    end
  end

  # GET /meetings/:id
  def show
    @meeting_route = @meeting.meeting_routes.find_by(user: current_user)

    respond_to do |format|
      format.html
      format.json {
        render json: {
          meeting: @meeting,
          route: @meeting_route,
          other_user: @meeting.other_user(current_user.id)
        }
      }
    end
  end

  # POST /meetings/:id/accept
  def accept
    unless @meeting.proposed?
      render json: { error: "Cette rencontre ne peut plus être acceptée" }, status: :unprocessable_entity
      return
    end

    @meeting.accept!

    # Calcule le point de rencontre et les routes
    position_a = UserPosition.find_by(user: @meeting.user_a, walking: @meeting.walking_a)
    position_b = UserPosition.find_by(user: @meeting.user_b, walking: @meeting.walking_b)

    unless position_a && position_b
      render json: { error: "Positions introuvables" }, status: :unprocessable_entity
      return
    end

    meeting_point = MeetingPointCalculatorService.call(position_a, position_b)

    @meeting.update!(
      meeting_latitude: meeting_point[:latitude],
      meeting_longitude: meeting_point[:longitude],
      meeting_poi_name: meeting_point[:poi_name]
    )

    MeetingRouteCalculatorService.call(@meeting, meeting_point)

    render json: {
      success: true,
      meeting: @meeting,
      message: "Rencontre acceptée!"
    }
  end

  # POST /meetings/:id/decline
  def decline
    unless @meeting.proposed?
      render json: { error: "Cette rencontre ne peut plus être refusée" }, status: :unprocessable_entity
      return
    end

    @meeting.cancel!

    # Notifie l'autre utilisateur via ActionCable
    other_user = @meeting.other_user(current_user.id)
    MeetingChannel.broadcast_to(other_user, {
      type: 'meeting_declined',
      match_id: @meeting.match_id
    })

    render json: {
      success: true,
      message: "Rencontre refusée"
    }
  end

  # POST /meetings/:id/start
  def start
    unless @meeting.accepted?
      render json: { error: "Cette rencontre n'est pas encore acceptée" }, status: :unprocessable_entity
      return
    end

    @meeting.start!

    # Notifie l'autre utilisateur
    other_user = @meeting.other_user(current_user.id)
    MeetingChannel.broadcast_to(other_user, {
      type: 'meeting_started',
      match_id: @meeting.match_id,
      timestamp: @meeting.meeting_started_at
    })

    render json: {
      success: true,
      meeting: @meeting,
      message: "Rencontre commencée!"
    }
  end

  # POST /meetings/:id/complete
  def complete
    unless @meeting.in_progress?
      render json: { error: "Cette rencontre n'est pas en cours" }, status: :unprocessable_entity
      return
    end

    @meeting.complete!

    # Notifie l'autre utilisateur
    other_user = @meeting.other_user(current_user.id)
    MeetingChannel.broadcast_to(other_user, {
      type: 'meeting_completed',
      match_id: @meeting.match_id,
      timestamp: @meeting.meeting_ended_at
    })

    render json: {
      success: true,
      meeting: @meeting,
      message: "Rencontre terminée!"
    }
  end

  private

  def set_meeting
    @meeting = WalkingMeeting.find(params[:id])

    unless @meeting.includes_user?(current_user.id)
      render json: { error: "Accès non autorisé" }, status: :forbidden
    end
  end
end
