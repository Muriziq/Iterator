// utils/colorPicker.js
let activePickrs = [];

export function destroyPickrs() {
  activePickrs.forEach(p => {
    try {
      // destroyAndRemove() ensures the popup DOM nodes appended to body are also cleaned up
      p.destroyAndRemove();
    } catch (e) {
      // already removed/detached, ignore
    }
  });
  activePickrs = [];
}

export function initPickrs(container) {
  container.querySelectorAll('.pickr-wrap').forEach(wrap => {
    const hiddenInput = wrap.querySelector('input[type="color"]');
    const triggerBtn = wrap.querySelector('.pickr-trigger');
    
    if (!hiddenInput || !triggerBtn) return;

    // Read the fresh value directly from the DOM at initialization time
    const currentValue = hiddenInput.value;

    const pickr = Pickr.create({
      el: triggerBtn, // Bind to the dedicated button, NOT the wrapper
      theme: 'classic',
      default: currentValue,
      components: {
        preview: true,
        opacity: false,
        hue: true,
        interaction: { hex: true, rgba: true, input: true, save: true }
      }
    });

    pickr.on('change', (color) => {
      const hex = color.toHEXA().toString();
      if (hiddenInput.value !== hex) {
        hiddenInput.value = hex;
        console.log('Pickr change fired. New value:', hex);
        console.log('Is hidden input attached?', document.body.contains(hiddenInput));
        // Use a CustomEvent to tag that this came from Pickr
        hiddenInput.dispatchEvent(new CustomEvent('input', { bubbles: true, detail: { fromPickr: true } }));
      }
    });

    pickr.on('changestop', () => {
      hiddenInput.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { fromPickr: true } }));
    });

    // Listen to external programmatic changes on the hidden input to sync Pickr's UI
    hiddenInput.addEventListener('input', (e) => {
      if (e.detail && e.detail.fromPickr) return; // Prevent infinite loop
      pickr.setColor(hiddenInput.value, true);
    });

    activePickrs.push(pickr);
  });
}