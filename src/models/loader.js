export default class LoaderManager {
  constructor(maxItems = 10) {
    this.maxItems = maxItems;
    this.currentIndex = 0;
    this.loaderContainer = null;
  }

  // Create the loader UI container
  createLoader(containerId = "loader-container") {
    let container = document.createElement("div");
    container.id = containerId;
    container.classList.add("loader-container");
    document.body.appendChild(container);
    this.loaderContainer = container;
    this.loaderContainer.style.display = "block";
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

  // Update the display
  showProgress() {
    if (!this.loaderContainer) return;

    const percentage = (this.currentIndex / this.maxItems) * 100;

    this.loaderContainer.style.display = "block";
    this.loaderContainer.innerHTML = `
      <div style="text-align: center;">
        <div style="margin-bottom: 10px;">Loading Images...</div>
        <div style="
          background: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
          height: 20px;
        ">
          <div style="
            width: ${percentage}%;
            background: #4caf50;
            height: 100%;
            transition: width 0.3s ease;
          "></div>
        </div>
        <div style="margin-top: 10px; font-size: 12px;">
          ${this.currentIndex} / ${this.maxItems}
        </div>
      </div>
    `;
  }

  reset() {
    this.currentIndex = 0;
    document.body.removeChild(this.loaderContainer);
  }
}

