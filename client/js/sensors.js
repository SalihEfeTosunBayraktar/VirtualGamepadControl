/**
 * sensors.js — Gyroscope / Accelerometer integration
 *
 * iOS 13+ requires a user-gesture permission request for DeviceMotionEvent.
 * Android Chrome grants access automatically.
 *
 * Exports (window.VGC.Sensors):
 *   requestPermission() → Promise<'granted'|'denied'|'unavailable'>
 *   start(onData)       — begin streaming sensor data
 *   stop()              — stop streaming
 *   isActive()          — boolean
 */

window.VGC = window.VGC || {};

window.VGC.Sensors = (() => {

  let active       = false;
  let callback     = null;
  let lastAlpha    = 0;
  let lastBeta     = 0;
  let lastGamma    = 0;

  // ── Permission (iOS 13+ gate) ──────────────────────────────────────────────
  async function requestPermission() {
    // Not supported at all
    if (typeof DeviceOrientationEvent === 'undefined') return 'unavailable';

    // iOS 13+ requires explicit permission
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        return result;   // 'granted' | 'denied'
      } catch {
        return 'denied';
      }
    }

    // Android / desktop — always available
    return 'granted';
  }

  // ── Start streaming ────────────────────────────────────────────────────────
  /**
   * @param {(data: { alpha, beta, gamma, ax, ay, az }) => void} onData
   */
  function start(onData) {
    if (active) return;
    callback = onData;
    active   = true;

    window.addEventListener('deviceorientation', _handleOrientation, { passive: true });
    window.addEventListener('devicemotion',      _handleMotion,      { passive: true });

    console.log('[VGC] Sensors started');
  }

  function stop() {
    active   = false;
    callback = null;
    window.removeEventListener('deviceorientation', _handleOrientation);
    window.removeEventListener('devicemotion',      _handleMotion);
    console.log('[VGC] Sensors stopped');
  }

  function isActive() { return active; }

  // ── Event handlers ─────────────────────────────────────────────────────────
  let _ax = 0, _ay = 0, _az = 0;

  function _handleOrientation(e) {
    // alpha = rotation around Z-axis (compass heading) 0–360
    // beta  = front-back tilt         -180 to 180
    // gamma = left-right tilt          -90 to 90
    lastAlpha = e.alpha ?? 0;
    lastBeta  = e.beta  ?? 0;
    lastGamma = e.gamma ?? 0;

    if (callback && active) {
      callback({
        alpha: lastAlpha,
        beta:  lastBeta,
        gamma: lastGamma,
        ax: _ax, ay: _ay, az: _az
      });
    }
  }

  function _handleMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (a) { _ax = a.x ?? 0; _ay = a.y ?? 0; _az = a.z ?? 0; }
  }

  // ── Utility: map gamma to gamepad axis (-1 to 1) ──────────────────────────
  /**
   * Maps device tilt (gamma, -90°…+90°) to a normalised axis value.
   * `maxDeg` = tilt angle that corresponds to ±1.0 (default 45°)
   * @param {number} gamma
   * @param {number} [maxDeg=45]
   * @returns {number}
   */
  function gammaToAxis(gamma, maxDeg = 45) {
    return Math.min(1, Math.max(-1, gamma / maxDeg));
  }

  return { requestPermission, start, stop, isActive, gammaToAxis };
})();
