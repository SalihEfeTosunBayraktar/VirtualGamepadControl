/**
 * connection.js — WebSocket client for VirtualGamepadControl
 *
 * Responsibilities:
 *  - Open / maintain WebSocket connection to the server
 *  - Auto-reconnect with exponential back-off
 *  - Send the registration handshake (name + device)
 *  - Expose a typed send() helper
 *  - Emit events: onConnected, onDisconnected, onVibration, onStatus, onError
 */

'use strict';   // parsed as a module script — no actual strict-mode header needed

window.VGC = window.VGC || {};

window.VGC.Connection = (() => {
  let ws           = null;
  let playerId     = null;
  let retries      = 0;
  let retryTimer   = null;
  let intentional  = false;   // true when we called disconnect() ourselves

  const MAX_RETRIES   = 10;
  const BASE_DELAY_MS = 1000;

  // ── Callbacks (set by consumer) ─────────────────────────────────────────────
  const cb = {
    onConnected:    (pid) => {},
    onDisconnected: ()    => {},
    onVibration:    (large, small) => {},
    onStatus:       (count, max)   => {},
    onError:        (msg) => {}
  };

  // ── State ─────────────────────────────────────────────────────────────────
  function getPlayerId() { return playerId; }

  // ── Connect ───────────────────────────────────────────────────────────────
  /**
   * @param {{ name: string, device: string }} profile
   * @param {string} [serverUrl] — defaults to wss://current-host
   */
  function connect(profile, serverUrl) {
    intentional = false;
    const url = serverUrl || buildWssUrl();
    _openSocket(url, profile);
  }

  function buildWssUrl() {
    const { hostname, port } = window.location;
    const proto = 'wss:';
    const p = port ? `:${port}` : '';
    return `${proto}//${hostname}${p}`;
  }

  function _openSocket(url, profile) {
    if (ws) { ws.onclose = null; ws.close(); }

    ws = new WebSocket(url);

    ws.onopen = () => {
      retries = 0;
      // Send registration handshake
      _send({ type: 'register', name: profile.name, device: profile.device });
      console.log('[VGC] WS connected, registering…');
    };

    ws.onmessage = (evt) => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch { return; }

      switch (msg.type) {
        case 'connected':
          playerId = msg.playerId;
          cb.onConnected(playerId);
          console.log(`[VGC] Joined as Player ${playerId}`);
          break;

        case 'vibration':
          cb.onVibration(msg.largeMotor, msg.smallMotor);
          break;

        case 'status':
          cb.onStatus(msg.playerCount, msg.maxPlayers);
          break;

        case 'error':
          cb.onError(msg.message);
          console.warn('[VGC] Server error:', msg.message);
          break;
      }
    };

    ws.onclose = () => {
      playerId = null;
      cb.onDisconnected();

      if (!intentional && retries < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY_MS * Math.pow(1.6, retries), 20000);
        retries++;
        console.log(`[VGC] WS closed — retry ${retries} in ${Math.round(delay)}ms`);
        retryTimer = setTimeout(() => _openSocket(url, profile), delay);
      }
    };

    ws.onerror = (e) => {
      console.error('[VGC] WS error', e);
    };
  }

  // ── Disconnect ────────────────────────────────────────────────────────────
  function disconnect() {
    intentional = true;
    clearTimeout(retryTimer);
    if (ws) ws.close();
    ws = null;
  }

  // ── Send input snapshot ───────────────────────────────────────────────────
  /**
   * Send a complete input snapshot to the server.
   * @param {{ buttons: object, axes: object, triggers: object, gyro?: object }} input
   */
  function sendInput(input) {
    _send({ type: 'input', ...input });
  }

  function _send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    connect,
    disconnect,
    sendInput,
    getPlayerId,

    // Callback setters
    onConnected:    (fn) => { cb.onConnected    = fn; },
    onDisconnected: (fn) => { cb.onDisconnected = fn; },
    onVibration:    (fn) => { cb.onVibration    = fn; },
    onStatus:       (fn) => { cb.onStatus       = fn; },
    onError:        (fn) => { cb.onError        = fn; }
  };
})();
