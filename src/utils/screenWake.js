let wakeLock = null;
async function enableWakeLock() {
  try {
    // Check support
    if (!("wakeLock" in navigator)) {
      console.log("Wake Lock API not supported");
      return;
    }

    // Request screen wake lock
    wakeLock = await navigator.wakeLock.request("screen");

    console.log("Screen Wake Lock enabled");

    // Reacquire if user switches tabs/apps
    wakeLock.addEventListener("release", () => {
      console.log("Wake Lock released");
    });

  } catch (err) {
    console.warn("Wake Lock error:", err);
  }
}

async function disableWakeLock() {
    try{
  if (wakeLock !== null) {
    await wakeLock.release();
    wakeLock = null;
    console.log("Screen Wake Lock disabled");
  }
    } catch (err) {
        console.warn("Error releasing Wake Lock:", err);
    }

}
export { enableWakeLock, disableWakeLock };