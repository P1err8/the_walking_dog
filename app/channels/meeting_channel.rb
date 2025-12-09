class MeetingChannel < ApplicationCable::Channel
  def subscribed
    # S'abonne au stream personnel de l'utilisateur
    stream_for current_user
  end

  def unsubscribed
    # Cleanup when channel is disconnected
  end

  # Met à jour la position GPS de l'utilisateur
  def update_position(data)
    walking = Walking.find_by(id: data['walking_id'])
    return unless walking && walking.user_id == current_user.id

    position = UserPosition.find_or_initialize_by(
      user: current_user,
      walking: walking
    )

    position.update_position!(
      lat: data['latitude'],
      lng: data['longitude'],
      heading: data['heading'],
      progress_index: data['route_progress_index'],
      progress_percent: data['route_progress_percent']
    )
  end

  # Accepte une proposition de rencontre
  def accept_meeting(data)
    meeting = WalkingMeeting.find_by(match_id: data['match_id'])
    return unless meeting&.includes_user?(current_user.id)
    return unless meeting.proposed?

    meeting.accept!

    # Calcule le point de rencontre et les routes
    position_a = UserPosition.find_by(user: meeting.user_a, walking: meeting.walking_a)
    position_b = UserPosition.find_by(user: meeting.user_b, walking: meeting.walking_b)

    meeting_point = MeetingPointCalculatorService.call(position_a, position_b)

    # Met à jour les coordonnées du meeting
    meeting.update!(
      meeting_latitude: meeting_point[:latitude],
      meeting_longitude: meeting_point[:longitude],
      meeting_poi_name: meeting_point[:poi_name]
    )

    # Calcule les routes pour les deux utilisateurs
    routes_result = MeetingRouteCalculatorService.call(meeting, meeting_point)

    # Broadcast aux deux utilisateurs
    broadcast_meeting_accepted(meeting, routes_result)
  end

  # Refuse une proposition de rencontre
  def decline_meeting(data)
    meeting = WalkingMeeting.find_by(match_id: data['match_id'])
    return unless meeting&.includes_user?(current_user.id)
    return unless meeting.proposed?

    meeting.cancel!

    # Notifie l'autre utilisateur
    other_user = meeting.other_user(current_user.id)
    MeetingChannel.broadcast_to(other_user, {
      type: 'meeting_declined',
      match_id: meeting.match_id
    })
  end

  # Marque la rencontre comme commencée
  def start_meeting(data)
    meeting = WalkingMeeting.find_by(match_id: data['match_id'])
    return unless meeting&.includes_user?(current_user.id)
    return unless meeting.accepted?

    meeting.start!

    # Broadcast aux deux utilisateurs
    MeetingChannel.broadcast_to(meeting.user_a, {
      type: 'meeting_started',
      match_id: meeting.match_id,
      timestamp: meeting.meeting_started_at
    })

    MeetingChannel.broadcast_to(meeting.user_b, {
      type: 'meeting_started',
      match_id: meeting.match_id,
      timestamp: meeting.meeting_started_at
    })
  end

  # Marque la rencontre comme terminée
  def complete_meeting(data)
    meeting = WalkingMeeting.find_by(match_id: data['match_id'])
    return unless meeting&.includes_user?(current_user.id)
    return unless meeting.in_progress?

    meeting.complete!

    # Broadcast aux deux utilisateurs
    MeetingChannel.broadcast_to(meeting.user_a, {
      type: 'meeting_completed',
      match_id: meeting.match_id,
      timestamp: meeting.meeting_ended_at
    })

    MeetingChannel.broadcast_to(meeting.user_b, {
      type: 'meeting_completed',
      match_id: meeting.match_id,
      timestamp: meeting.meeting_ended_at
    })
  end

  private

  def broadcast_meeting_accepted(meeting, routes_result)
    # Envoie les routes à user_a
    route_a = meeting.meeting_routes.find_by(user: meeting.user_a)
    MeetingChannel.broadcast_to(meeting.user_a, {
      type: 'meeting_accepted',
      match_id: meeting.match_id,
      meeting_point: {
        latitude: meeting.meeting_latitude,
        longitude: meeting.meeting_longitude,
        poi_name: meeting.meeting_poi_name
      },
      route: {
        to_meeting: route_a.segment_to_meeting,
        from_meeting: route_a.segment_from_meeting,
        to_meeting_distance: route_a.segment_to_meeting_distance,
        to_meeting_duration: route_a.segment_to_meeting_duration,
        from_meeting_distance: route_a.segment_from_meeting_distance,
        from_meeting_duration: route_a.segment_from_meeting_duration
      },
      other_user: {
        id: meeting.user_b.id,
        name: meeting.user_b.name
      }
    })

    # Envoie les routes à user_b
    route_b = meeting.meeting_routes.find_by(user: meeting.user_b)
    MeetingChannel.broadcast_to(meeting.user_b, {
      type: 'meeting_accepted',
      match_id: meeting.match_id,
      meeting_point: {
        latitude: meeting.meeting_latitude,
        longitude: meeting.meeting_longitude,
        poi_name: meeting.meeting_poi_name
      },
      route: {
        to_meeting: route_b.segment_to_meeting,
        from_meeting: route_b.segment_from_meeting,
        to_meeting_distance: route_b.segment_to_meeting_distance,
        to_meeting_duration: route_b.segment_to_meeting_duration,
        from_meeting_distance: route_b.segment_from_meeting_distance,
        from_meeting_duration: route_b.segment_from_meeting_duration
      },
      other_user: {
        id: meeting.user_a.id,
        name: meeting.user_a.name
      }
    })
  end
end
