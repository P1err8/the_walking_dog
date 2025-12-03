import { Controller } from "@hotwired/stimulus"

// this controller updates the output text when the slider input changes
export default class extends Controller {
  static targets = ["input", "output"]

  connect() {
    this.update()
  }

  update() {
    this.outputTarget.textContent = this.inputTarget.value
  }
}
