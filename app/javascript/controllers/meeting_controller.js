import { Controller } from "@hotwired/stimulus"
import { createConsumer } from "@rails/actioncable"

export default class extends Controller {
  static targets = ["meetingNotification", "meetingInfo"]
  static values = {
    walkingId: Number,
    userId: Number
  }

  connect() {
    // console.log("Meeting controller connected")
    this.currentMeeting = null
    this.meetingRoute = null
    this.subscription = null

    // Subscribe to MeetingChannel
    this.subscribeMeetingChannel()
  }

  disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }

  subscribeMeetingChannel() {
    const consumer = createConsumer()

    this.subscription = consumer.subscriptions.create(
      { channel: "MeetingChannel" },
      {
        received: (data) => {
          // console.log("Meeting message received:", data)
          this.handleMeetingMessage(data)
        },

        connected: () => {
          // console.log("Connected to MeetingChannel")
        },

        disconnected: () => {
          // console.log("Disconnected from MeetingChannel")
        }
      }
    )
  }

  handleMeetingMessage(data) {
    switch(data.type) {
      case 'meeting_proposed':
        this.showMeetingProposal(data)
        break
      case 'meeting_accepted':
        this.handleMeetingAccepted(data)
        break
      case 'meeting_declined':
        this.handleMeetingDeclined(data)
        break
      case 'meeting_started':
        this.handleMeetingStarted(data)
        break
      case 'meeting_completed':
        this.handleMeetingCompleted(data)
        break
    }
  }

  // Met à jour la position GPS
  updatePosition(latitude, longitude, heading, progressIndex, progressPercent) {
    if (!this.subscription) return

    this.subscription.perform('update_position', {
      walking_id: this.walkingIdValue,
      latitude: latitude,
      longitude: longitude,
      heading: heading,
      route_progress_index: progressIndex,
      route_progress_percent: progressPercent
    })
  }

  // Affiche la proposition de rencontre
  showMeetingProposal(data) {
    this.currentMeeting = data

    const notification = `
      <div class="meeting-proposal" data-match-id="${data.match_id}">
        <h4>Rencontre proposée 🐕</h4>
        <p><strong>${data.other_user.name}</strong> et <strong>${data.other_user.dog_name}</strong> sont à <strong>${data.distance_meters}m</strong></p>
        <div class="meeting-actions">
          <button class="btn btn-success" data-action="click->meeting#acceptMeeting">
            Accepter
          </button>
          <button class="btn btn-secondary" data-action="click->meeting#declineMeeting">
            Refuser
          </button>
        </div>
      </div>
    `

    if (this.hasMeetingNotificationTarget) {
      this.meetingNotificationTarget.innerHTML = notification
      this.meetingNotificationTarget.style.display = 'block'
    }

    // Notification sonore ou visuelle
    this.playNotificationSound()
  }

  // Accepte la rencontre
  acceptMeeting(event) {
    event.preventDefault()

    if (!this.currentMeeting) return

    this.subscription.perform('accept_meeting', {
      match_id: this.currentMeeting.match_id
    })

    this.hideMeetingNotification()
    this.showLoading("Calcul de l'itinéraire de rencontre...")
  }

  // Refuse la rencontre
  declineMeeting(event) {
    event.preventDefault()

    if (!this.currentMeeting) return

    this.subscription.perform('decline_meeting', {
      match_id: this.currentMeeting.match_id
    })

    this.currentMeeting = null
    this.hideMeetingNotification()
  }

  // Gère l'acceptation de la rencontre
  handleMeetingAccepted(data) {
    this.currentMeeting = data
    this.meetingRoute = data.route

    // console.log("Meeting accepted, route:", data.route)

    // Met à jour la carte avec le nouvel itinéraire
    this.updateMapWithMeetingRoute(data)

    // Affiche les infos de rencontre
    this.showMeetingInfo(data)

    this.hideLoading()
  }

  // Gère le refus de la rencontre
  handleMeetingDeclined(data) {
    if (this.currentMeeting?.match_id === data.match_id) {
      this.showMessage("La rencontre a été refusée", "info")
      this.currentMeeting = null
      this.hideMeetingNotification()
    }
  }

  // Gère le début de la rencontre
  handleMeetingStarted(data) {
    // console.log("Meeting started:", data)
    this.showMessage("Rencontre commencée! 🎉", "success")
  }

  // Gère la fin de la rencontre
  handleMeetingCompleted(data) {
    // console.log("Meeting completed:", data)
    this.showMessage("Rencontre terminée! Reprise de l'itinéraire original", "success")

    // Reprend l'itinéraire original
    this.resumeOriginalRoute()

    this.currentMeeting = null
    this.meetingRoute = null
  }

  // Met à jour la carte avec l'itinéraire de rencontre
  updateMapWithMeetingRoute(data) {
    // Récupère le walking_map_controller
    const mapController = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller~="walking-map"]'),
      'walking-map'
    )

    if (!mapController) {
      console.error("Walking map controller not found")
      return
    }

    // Ajoute le marqueur du point de rencontre
    const meetingPoint = data.meeting_point
    mapController.addMeetingMarker(meetingPoint.latitude, meetingPoint.longitude, meetingPoint.poi_name)

    // Affiche l'itinéraire vers le point de rencontre
    const toMeetingCoordinates = data.route.to_meeting.coordinates
    mapController.displayMeetingRoute(toMeetingCoordinates, 'to-meeting')

    // Centre la carte sur le point de rencontre
    mapController.flyToPoint(meetingPoint.latitude, meetingPoint.longitude, 15)
  }

  // Reprend l'itinéraire original après la rencontre
  resumeOriginalRoute() {
    const mapController = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller~="walking-map"]'),
      'walking-map'
    )

    if (!mapController) return

    // Utilise le segment from_meeting pour rejoindre l'itinéraire original
    if (this.meetingRoute?.from_meeting) {
      const fromMeetingCoordinates = this.meetingRoute.from_meeting.coordinates
      mapController.displayMeetingRoute(fromMeetingCoordinates, 'from-meeting')
    }

    // Supprime le marqueur de rencontre
    mapController.removeMeetingMarker()
  }

  // Marque la rencontre comme commencée (quand on arrive au point)
  startMeeting() {
    if (!this.currentMeeting) return

    this.subscription.perform('start_meeting', {
      match_id: this.currentMeeting.match_id
    })
  }

  // Marque la rencontre comme terminée
  completeMeeting() {
    if (!this.currentMeeting) return

    this.subscription.perform('complete_meeting', {
      match_id: this.currentMeeting.match_id
    })
  }

  // Affiche les infos de la rencontre
  showMeetingInfo(data) {
    if (!this.hasMeetingInfoTarget) return

    const distance = (data.route.to_meeting_distance / 1000).toFixed(2)
    const duration = Math.round(data.route.to_meeting_duration / 60)

    const infoHtml = `
      <div class="meeting-info-card">
        <h4>Rencontre avec ${data.other_user.name}</h4>
        <p class="meeting-distance">📍 ${distance} km (${duration} min)</p>
        <p class="meeting-location">${data.meeting_point.poi_name || 'Point de rencontre'}</p>
        <button class="btn btn-primary" data-action="click->meeting#startMeeting">
          J'arrive au point de rencontre
        </button>
        <button class="btn btn-danger" data-action="click->meeting#completeMeeting">
          Terminer la rencontre
        </button>
      </div>
    `

    this.meetingInfoTarget.innerHTML = infoHtml
    this.meetingInfoTarget.style.display = 'block'
  }

  // Utilitaires
  hideMeetingNotification() {
    if (this.hasMeetingNotificationTarget) {
      this.meetingNotificationTarget.style.display = 'none'
      this.meetingNotificationTarget.innerHTML = ''
    }
  }

  showLoading(message) {
    if (this.hasMeetingInfoTarget) {
      this.meetingInfoTarget.innerHTML = `<div class="loading">${message}</div>`
      this.meetingInfoTarget.style.display = 'block'
    }
  }

  hideLoading() {
    // Le loading sera remplacé par showMeetingInfo
  }

  showMessage(message, type = 'info') {
    // Affiche un message toast
    // console.log(`[${type}] ${message}`)

    // Peut être amélioré avec une librairie de notifications
    const alert = document.createElement('div')
    alert.className = `alert alert-${type} meeting-toast`
    alert.textContent = message
    document.body.appendChild(alert)

    setTimeout(() => {
      alert.remove()
    }, 3000)
  }

  playNotificationSound() {
    // Joue un son de notification (optionnel)
    try {
      const audio = new Audio('/sounds/notification.mp3')
      audio.play()
    } catch (e) {
      // console.log("Cannot play notification sound:", e)
    }
  }
}
