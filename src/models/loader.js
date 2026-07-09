export default class LoaderManager {
  constructor(maxItems = 10, message = "Loading...") {
    this.maxItems = maxItems;
    this.message = message;
    this.currentIndex = 0;
    this.loaderContainer = null;
  }

  // Create the loader UI container
  createLoader(containerId = "loader-container") {
    // Prevent duplicate loaders
    let existing = document.getElementById(containerId);
    if (existing) {
      existing.remove();
    }

    // Inject dynamic keyframes if they don't exist
    if (!document.getElementById("loader-animation-styles")) {
      const style = document.createElement("style");
      style.id = "loader-animation-styles";
      style.textContent = `
        @keyframes loader-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
        @keyframes loader-spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    let container = document.createElement("div");
    container.id = containerId;
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(container);
    this.loaderContainer = container;
    this.showProgress();

    // Fade in
    requestAnimationFrame(() => {
      if (this.loaderContainer) {
        this.loaderContainer.style.opacity = "1";
      }
    });
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

  // Update the display
  showProgress() {
    if (!this.loaderContainer) return;

    const percentage = this.maxItems > 0 ? (this.currentIndex / this.maxItems) * 100 : 0;

    this.loaderContainer.innerHTML = `
      <div style="
        background: #1e1e1e;
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 2.25rem 2rem;
        border-radius: 1.25rem;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        width: 90%;
        max-width: 380px;
        color: #e4e4e4;
        box-sizing: border-box;
      ">
        <div style="
          font-size: 1.15rem;
          font-weight: 600;
          margin-bottom: 1.25rem;
          letter-spacing: 0.03em;
          text-align: center;
          color: #ffffff;
          animation: loader-pulse 2s infinite ease-in-out;
        ">${this.message}</div>
        <div style="
          background: #2a2a2a;
          border-radius: 99px;
          height: 8px;
          overflow: hidden;
          position: relative;
        ">
          <div style="
            width: ${percentage}%;
            background: linear-gradient(90deg, #6366f1, #a855f7);
            height: 100%;
            border-radius: 99px;
            transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
          "></div>
        </div>
        <div style="
          margin-top: 0.75rem;
          font-size: 0.85rem;
          color: #a0aec0;
          text-align: center;
          font-variant-numeric: tabular-nums;
        ">
          ${this.currentIndex} / ${this.maxItems}
        </div>
      </div>
    `;
  }

  reset() {
    this.currentIndex = 0;
    if (this.loaderContainer) {
      this.loaderContainer.style.opacity = "0";
      setTimeout(() => {
        if (this.loaderContainer && this.loaderContainer.parentNode) {
          this.loaderContainer.parentNode.removeChild(this.loaderContainer);
        }
        this.loaderContainer = null;
      }, 300);
    }
  }
}

