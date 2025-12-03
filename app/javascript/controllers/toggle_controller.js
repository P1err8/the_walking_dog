import { Controller } from "@hotwired/stimulus"


// this controller add the class "active" to the clicked button
// and remove it from the other buttons in the same group
export default class extends Controller {
  static targets = ["button", "input"]

  fire(event) {
    event.preventDefault()

    this.buttonTargets.forEach(button => {
      button.classList.remove("active")
    })

    event.currentTarget.classList.add("active")


    if (this.hasInputTarget) {
      this.inputTarget.value = event.currentTarget.dataset.value
    }
  }
}
