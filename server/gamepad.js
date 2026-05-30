'use strict';

/* ─────────────────────────────────────────────────────────────────────────────
   ViGEmClient wrapper — maps our protocol keys to vigemclient button/axis names.
   If ViGEmBus driver is not installed, the server runs in demo mode (no output).
───────────────────────────────────────────────────────────────────────────── */

let ViGEmClient;
let vigemAvailable = false;

try {
  ViGEmClient  = require('vigemclient');
  vigemAvailable = true;
} catch {
  console.warn('\n  ⚠️  vigemclient yüklenemedi → Demo mod aktif.');
  console.warn('  👉 ViGEmBus kurulu mu? setup.bat\'ı yönetici olarak çalıştırın.\n');
}

// ── Button name mapping (our protocol → vigemclient XUSB_BUTTON keys) ───────────────
const BUTTON_MAP = {
  A:      'A',
  B:      'B',
  X:      'X',
  Y:      'Y',
  LB:     'LEFT_SHOULDER',
  RB:     'RIGHT_SHOULDER',
  LS:     'LEFT_THUMB',
  RS:     'RIGHT_THUMB',
  START:  'START',
  SELECT: 'BACK',
  GUIDE:  'GUIDE',
  // DPAD is handled separately via dpadHorz/dpadVert axes
};

// ── Axis name mapping ──────────────────────────────────────────────────────
const AXIS_MAP = {
  LX: 'leftX',
  LY: 'leftY',
  RX: 'rightX',
  RY: 'rightY'
};

// Triggers live in ctrl.axis (not a separate ctrl.trigger property)
const TRIGGER_AXIS_MAP = {
  LT: 'leftTrigger',
  RT: 'rightTrigger'
};

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// ─────────────────────────────────────────────────────────────────────────────

class GamepadManager {
  constructor() {
    this.client      = null;
    /** @type {Map<number, import('vigemclient').X360Controller | null>} */
    this.controllers = new Map();
    this.freeIds     = [1, 2, 3, 4];

    if (vigemAvailable) {
      try {
        this.client    = new ViGEmClient();
        const err      = this.client.connect();
        if (err) throw new Error(err.message ?? String(err));
        console.log('  ✅ ViGEmBus bağlantısı başarılı');
      } catch (e) {
        console.error('  ❌ ViGEmBus bağlantı hatası:', e.message);
        console.error('  👉 https://github.com/nefarius/ViGEmBus/releases\n');
        this.client   = null;
        vigemAvailable = false;
      }
    }
  }

  /** Is ViGEm actually working? */
  isAvailable() { return vigemAvailable && this.client !== null; }

  /**
   * Reserve the next free player slot and create a virtual X360 controller.
   * @returns {number | null} playerId (1–4) or null when all slots are taken
   */
  addPlayer() {
    if (this.freeIds.length === 0) return null;

    const id = this.freeIds.shift();

    if (this.isAvailable()) {
      try {
        const ctrl = this.client.createX360Controller();
        const err  = ctrl.connect();
        if (err) throw new Error(err.message ?? String(err));
        this.controllers.set(id, ctrl);
        console.log(`  🎮 Sanal X360 kontrolör #${id} oluşturuldu`);
      } catch (e) {
        console.error(`  ❌ Kontrolör #${id} hatası:`, e.message);
        this.controllers.set(id, null);
      }
    } else {
      this.controllers.set(id, null);   // demo slot
    }

    return id;
  }

  /**
   * Release a player slot and disconnect their virtual controller.
   * @param {number} id
   */
  removePlayer(id) {
    const ctrl = this.controllers.get(id);
    if (ctrl) {
      try { ctrl.disconnect(); } catch { /* ignore */ }
    }
    this.controllers.delete(id);
    this.freeIds.push(id);
    this.freeIds.sort((a, b) => a - b);
  }

  /**
   * Register a callback that fires when the game sends rumble to this controller.
   * Callback receives (largeMotor: 0–255, smallMotor: 0–255).
   * @param {number} id
   * @param {(large: number, small: number) => void} cb
   */
  setVibrationCallback(id, cb) {
    const ctrl = this.controllers.get(id);
    if (ctrl) {
      try { ctrl.vibrationCallback = cb; } catch { /* ignore */ }
    }
  }

  /**
   * Apply an input snapshot from the mobile client to the virtual controller.
   *
   * Expected shape:
   * {
   *   buttons: { A, B, X, Y, LB, RB, LS, RS, START, SELECT, GUIDE,
   *              DPAD_UP, DPAD_DOWN, DPAD_LEFT, DPAD_RIGHT }  (boolean)
   *   axes:    { LX, LY, RX, RY }   (-1.0 … 1.0)
   *   triggers:{ LT, RT }           ( 0.0 … 1.0)
   * }
   *
   * @param {number} playerId
   * @param {object} input
   */
  updateInput(playerId, input) {
    const ctrl = this.controllers.get(playerId);
    if (!ctrl) return;

    try {
      const { buttons, axes, triggers } = input;

      if (buttons) {
        // Face + shoulder + system buttons
        for (const [key, vigemKey] of Object.entries(BUTTON_MAP)) {
          if (key in buttons) ctrl.button[vigemKey].setValue(!!buttons[key]);
        }

        // DPAD → dpadHorz / dpadVert axes (-1, 0, 1)
        const dpadH = buttons.DPAD_RIGHT ? 1  : buttons.DPAD_LEFT ? -1 : 0;
        const dpadV = buttons.DPAD_UP    ? 1  : buttons.DPAD_DOWN ? -1 : 0;
        ctrl.axis.dpadHorz.setValue(dpadH);
        ctrl.axis.dpadVert.setValue(dpadV);
      }

      if (axes) {
        for (const [key, vigemKey] of Object.entries(AXIS_MAP)) {
          if (key in axes) {
            let val = axes[key];
            // XInput Y axes: positive = up, but touch screen Y increases downward
            // so we must negate LY and RY to match XInput convention
            if (key === 'LY' || key === 'RY') val = -val;
            ctrl.axis[vigemKey].setValue(clamp(val, -1, 1));
          }
        }
      }

      if (triggers) {
        // Triggers are stored in ctrl.axis, not ctrl.trigger
        for (const [key, vigemKey] of Object.entries(TRIGGER_AXIS_MAP)) {
          if (key in triggers) ctrl.axis[vigemKey].setValue(clamp(triggers[key], 0, 1));
        }
      }
    } catch { /* suppress per-frame errors */ }
  }

  /** Disconnect all virtual controllers on server shutdown. */
  disconnectAll() {
    for (const ctrl of this.controllers.values()) {
      if (ctrl) try { ctrl.disconnect(); } catch { /* ignore */ }
    }
    this.controllers.clear();
  }
}

module.exports = GamepadManager;
