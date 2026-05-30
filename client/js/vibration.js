/**
 * vibration.js — Haptic feedback manager
 *
 * The server sends vibration payloads when a game triggers rumble on the
 * virtual Xbox controller.  We translate those values to the Web Vibration API.
 *
 * API support:
 *   Android Chrome  ✅  (navigator.vibrate)
 *   iOS Safari      ❌  (not supported — silently ignored)
 *   iOS PWA         ❌
 *
 * Exports (window.VGC.Vibration):
 *   vibrate(largeMotor, smallMotor) — largeMotor / smallMotor: 0.0 – 1.0
 *   pulse(ms)                       — simple one-shot vibration
 *   isSupported()                   — boolean
 */

window.VGC = window.VGC || {};

window.VGC.Vibration = (() => {

  const supported = typeof navigator.vibrate === 'function';

  if (!supported) {
    console.info('[VGC] Vibration API not available on this device/browser.');
  }

  /**
   * Translate motor intensities to a vibration pattern.
   * @param {number} largeMotor  0.0 – 1.0
   * @param {number} smallMotor  0.0 – 1.0
   */
  function vibrate(largeMotor, smallMotor) {
    if (!supported) return;

    const intensity = Math.max(largeMotor, smallMotor);

    if (intensity < 0.05) {
      navigator.vibrate(0);   // stop
      return;
    }

    // Map intensity to duration (10ms – 200ms)
    const duration = Math.round(10 + intensity * 190);

    // For high largeMotor values, add a secondary pulse to simulate rumble
    if (largeMotor > 0.5) {
      navigator.vibrate([duration, 30, Math.round(duration * 0.5)]);
    } else {
      navigator.vibrate(duration);
    }
  }

  /**
   * Simple one-shot vibration.
   * @param {number} [ms=50]
   */
  function pulse(ms = 50) {
    if (!supported) return;
    navigator.vibrate(ms);
  }

  function isSupported() { return supported; }

  return { vibrate, pulse, isSupported };
})();
