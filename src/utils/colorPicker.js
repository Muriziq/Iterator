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

    if (window.EyeDropper) {
      let eyedropperBtn = wrap.querySelector('.eyedropper-btn');
      if (!eyedropperBtn) {
        eyedropperBtn = document.createElement('button');
        eyedropperBtn.type = 'button';
        eyedropperBtn.className = 'eyedropper-btn';
        eyedropperBtn.title = 'Eye Dropper (Pick color from screen)';
        eyedropperBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="m2 22 1-1c.6-.6.6-1.5 0-2.1L12.5 9.4c.6-.6 1.5-.6 2.1 0l2 2c.6.6.6 1.5 0 2.1L7.1 23c-.6.6-1.5.6-2.1 0L4 22Z"/>
            <path d="m14 5 5 5"/>
            <path d="m16 3 5 5"/>
            <path d="m17 2 5 5"/>
          </svg>
        `;
        wrap.appendChild(eyedropperBtn);

        eyedropperBtn.addEventListener('click', async () => {
          try {
            const eyeDropper = new window.EyeDropper();
            const result = await eyeDropper.open();
            const hex = result.sRGBHex;
            pickr.setColor(hex, false); // Triggers pickr 'change' event to update hidden input & redraw
            // Dispatch stop event to save state
            hiddenInput.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { fromPickr: true } }));
          } catch (e) {
            console.warn('EyeDropper failed or cancelled:', e);
          }
        });
      }
    }

    activePickrs.push(pickr);
  });
}