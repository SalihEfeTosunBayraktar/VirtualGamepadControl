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

// ── Button name mapping (our protocol → vigemclient) ─────────────────────────
const BUTTON_MAP = {
  A:          'A',
  B:          'B',
  X:          'X',
  Y:          'Y',
  LB:         'leftShoulder',
  RB:         'rightShoulder',
  LS:         'leftThumb',
  RS:         'rightThumb',
  START:      'start',
  SELECT:     'back',
  GUIDE:      'guide',
  DPAD_UP:    'dpadUp',
  DPAD_DOWN:  'dpadDown',
  DPAD_LEFT:  'dpadLeft',
  DPAD_RIGHT: 'dpadRight'
};

// ── Axis name mapping ─────────────────────────────────────────────────────────
const AXIS_MAP = {
  LX: 'leftX',
  LY: 'leftY',
  RX: 'rightX',
  RY: 'rightY'
};

// ── Trigger name mapping ──────────────────────────────────────────────────────
const TRIGGER_MAP = {
  LT: 'left',
  RT: 'right'
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
        for (const [key, vigemKey] of Object.entries(BUTTON_MAP)) {
          if (key in buttons) ctrl.button[vigemKey].setValue(!!buttons[key]);
        }
      }

      if (axes) {
        for (const [key, vigemKey] of Object.entries(AXIS_MAP)) {
          if (key in axes) ctrl.axis[vigemKey].setValue(clamp(axes[key], -1, 1));
        }
      }

      if (triggers) {
        for (const [key, vigemKey] of Object.entries(TRIGGER_MAP)) {
          if (key in triggers) ctrl.trigger[vigemKey].setValue(clamp(triggers[key], 0, 1));
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
