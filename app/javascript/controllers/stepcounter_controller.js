import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["display", "button"]

  connect() {
    this.currentPosition = [4.834887, 45.769481]
    this.targetPosition = [4.832574, 45.768988]
    this.isRunning = false
    
    // Speed calculation for 4.5 km/h
    // 4.5 km/h = 1.25 m/s
    // Interval = 100ms = 0.1s => Distance per tick = 0.125m
    // 1 degree approx 111,111m => Speed in degrees ≈ 0.000001125
    this.speed = 0.000001125

    this.updateDisplay()
  }

  toggle() {
    if (this.isRunning) {
      this.stop()
    } else {
      this.start()
    }
  }

  start() {
    this.isRunning = true
    this.buttonTarget.innerText = "Arrêter"
    this.buttonTarget.classList.add("active")

    this.interval = setInterval(() => {
      this.moveTowardsTarget()
      this.updateDisplay()
    }, 100)
  }

  stop() {
    this.isRunning = false
    this.buttonTarget.innerText = "Commencer"
    this.buttonTarget.classList.remove("active")
    clearInterval(this.interval)
  }

  moveTowardsTarget() {
    const [currentLng, currentLat] = this.currentPosition
    const [targetLng, targetLat] = this.targetPosition

    // this calculates the direction vector
    const dx = targetLng - currentLng
    const dy = targetLat - currentLat
    const distance = Math.sqrt(dx * dx + dy * dy)

    // If we are very close, stop or snap to target
    if (distance < this.speed) {
      this.currentPosition = this.targetPosition
      // here we need to walk to the next target or stop
      this.stop()
      return
    }

    // make a step in the direction of the target baed on speed
    const moveX = (dx / distance) * this.speed
    const moveY = (dy / distance) * this.speed

    // this updates the current position
    this.currentPosition = [currentLng + moveX, currentLat + moveY]
  }

  updateDisplay() {
    const [lng, lat] = this.currentPosition
    // Display with 6 decimal places
    this.displayTarget.innerText = `Lat: ${lat.toFixed(6)}\nLng: ${lng.toFixed(6)}`
  }

  disconnect() {
    if (this.interval) clearInterval(this.interval)
  }
}
// coordinates = [
//         [4.834887,45.769481],
//         [4.832574,45.768988],
//         [4.833372,45.770550],
//         [4.834836,45.771505],
//         [4.835833,45.770623],
//         [4.834887,45.769481]
//       ]
