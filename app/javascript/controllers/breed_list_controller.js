import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="breed-list"
export default class extends Controller {
  static targets = [ "hiddenInput", "queryInput", "list" ]

  connect() {
    console.log("coufocuc");
  }

  filter(event) {
    console.log("apeourbveiz");

    const query = event.currentTarget.value.toLowerCase();
    this.listTarget.querySelectorAll("a").forEach((element) => {
      const breed = element.dataset.breed.toLowerCase();
      if (breed.includes(query)) {
        element.classList.remove("d-none");
      } else {
        element.classList.add("d-none");
      }
    });
  }

  select(event) {
    event.preventDefault();
    const breed = event.currentTarget.dataset.breed;
    this.hiddenInputTarget.value = breed;
    this.queryInputTarget.value = breed;

    this.listTarget.querySelectorAll("a").forEach((element) => {
      element.classList.remove("selected");
    });
    event.currentTarget.classList.add("selected");
    this.hideList();
  }

  showList() {
    this.listTarget.classList.remove("d-none");
  }

  hideList() {
    this.listTarget.classList.add("d-none");
  }

}
