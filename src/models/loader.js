export default class LoaderManager {
  constructor(maxItems = 10, message = "Loading...") {
    this.maxItems = maxItems;
    this.message = message;
    this.currentIndex = 0;
    this.initElements();
  }

  initElements() {
    this.container = document.getElementById("global-loader");
    this.msgEl = document.getElementById("global-loader-message");
    this.barEl = document.getElementById("global-loader-bar-progress");
    this.statsEl = document.getElementById("global-loader-stats");
  }

  // Create/Show the loader UI
  createLoader() {
    this.initElements();
    this.currentIndex = 0;
    this.showProgress();

    if (this.container) {
      this.container.style.display = "flex";
      // Allow display change to register, then transition opacity
      requestAnimationFrame(() => {
        this.container.classList.add("active");
      });
    }
  }

  // Increment and show progress
  incrementOriginalState() {
    this.currentIndex++;
    this.showProgress();

    // Auto-hide when complete
    if (this.currentIndex >= this.maxItems) {
      setTimeout(() => this.reset(), 500);
    }
  }

  // Update the message dynamically
  updateMessage(newMessage) {
    this.message = newMessage;
    this.showProgress();
  }

  // Update the display properties directly (no HTML parsing overhead)
  showProgress() {
    if (!this.container) return;

    const percentage = this.maxItems > 0 ? (this.currentIndex / this.maxItems) * 100 : 0;

    if (this.msgEl) this.msgEl.textContent = this.message;
    if (this.barEl) this.barEl.style.width = `${percentage}%`;
    if (this.statsEl) this.statsEl.textContent = `${this.currentIndex} / ${this.maxItems}`;
  }

  reset() {
    this.currentIndex = 0;
    if (this.container) {
      this.container.classList.remove("active");
      // Wait for transition before hiding container display
      setTimeout(() => {
        this.container.style.display = "none";
      }, 250);
    }
  }
}

