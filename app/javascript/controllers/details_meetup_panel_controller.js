import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  close() {
    const frame = document.getElementById('meetup-details')
    if (frame) {
      frame.classList.remove('panel-visible')
      setTimeout(() => {
        frame.innerHTML = ''
      }, 300) // Attendre la fin de l'animation
    }
  }
}
