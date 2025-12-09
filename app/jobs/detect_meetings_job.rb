class DetectMeetingsJob < ApplicationJob
  queue_as :default

  # Lance la détection de rencontres potentielles
  def perform
    detected_pairs = MeetingDetectorService.call

    detected_pairs.each do |pair|
      broadcast_meeting_proposal(pair)
    end

    Rails.logger.info "DetectMeetingsJob: #{detected_pairs.size} rencontres détectées"
  end

  private

  def broadcast_meeting_proposal(pair)
    meeting = pair[:meeting]
    position_a = pair[:position_a]
    position_b = pair[:position_b]
    distance = pair[:distance]

    # Broadcast à user_a
    MeetingChannel.broadcast_to(position_a.user, {
      type: 'meeting_proposed',
      match_id: meeting.match_id,
      other_user: {
        id: position_b.user.id,
        name: position_b.user.name,
        dog_name: position_b.user.dogs.first&.name
      },
      distance_meters: distance.round(1),
      proposed_at: meeting.proposed_at
    })

    # Broadcast à user_b
    MeetingChannel.broadcast_to(position_b.user, {
      type: 'meeting_proposed',
      match_id: meeting.match_id,
      other_user: {
        id: position_a.user.id,
        name: position_a.user.name,
        dog_name: position_a.user.dogs.first&.name
      },
      distance_meters: distance.round(1),
      proposed_at: meeting.proposed_at
    })
  end
end
