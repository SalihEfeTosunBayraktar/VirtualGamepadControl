/**
 * controls.js — Touch input controllers for VirtualGamepadControl
 *
 * Exports (via window.VGC.Controls):
 *   Joystick — circular analog stick with multi-touch tracking
 *   Button   — single tap button with press/release events
 *   DPad     — 4-direction cross pad (touch area approach)
 *   Trigger  — vertical swipe for analog LT/RT
 *   getState()  — returns current snapshot of all inputs
 *   reset()     — zero all axes
 */

window.VGC = window.VGC || {};

window.VGC.Controls = (() => {

  // ── Global input state (sent every frame) ─────────────────────────────────
  const state = {
    buttons: {
      A: false, B: false, X: false, Y: false,
      LB: false, RB: false, LS: false, RS: false,
      START: false, SELECT: false, GUIDE: false,
      DPAD_UP: false, DPAD_DOWN: false, DPAD_LEFT: false, DPAD_RIGHT: false
    },
    axes: { LX: 0, LY: 0, RX: 0, RY: 0 },
    triggers: { LT: 0, RT: 0 }
  };

  function getState() {
    return {
      buttons:  { ...state.buttons },
      axes:     { ...state.axes },
      triggers: { ...state.triggers }
    };
  }

  function reset() {
    for (const k in state.buttons)  state.buttons[k]  = false;
    for (const k in state.axes)     state.axes[k]     = 0;
    for (const k in state.triggers) state.triggers[k] = 0;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function addRipple(el) {
    const r = document.createElement('div');
    r.className = 'ripple-effect';
    // NOTE: do NOT set el.style.position here — face buttons are position:absolute
    // and overriding with 'relative' causes layout shifts.
    el.appendChild(r);
    r.addEventListener('animationend', () => r.remove());
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Joystick
  // ═════════════════════════════════════════════════════════════════════════
  class Joystick {
    /**
     * @param {HTMLElement} zone  — the circular touch zone
     * @param {HTMLElement} thumb — the draggable inner circle
     * @param {'L' | 'R'} side   — maps to LX/LY or RX/RY
     * @param {string} [clickBtn] — button key for stick-click (LS or RS)
     */
    constructor(zone, thumb, side, clickBtn) {
      this.zone     = zone;
      this.thumb    = thumb;
      this.side     = side;
      this.clickBtn = clickBtn || null;

      this.touchId  = null;
      this.ox = 0; this.oy = 0;   // origin (center of zone)
      this.maxR = 0;

      this._bind();
    }

    _bind() {
      this.zone.addEventListener('touchstart',  this._start.bind(this),  { passive: false });
      this.zone.addEventListener('touchmove',   this._move.bind(this),   { passive: false });
      this.zone.addEventListener('touchend',    this._end.bind(this),    { passive: false });
      this.zone.addEventListener('touchcancel', this._end.bind(this),    { passive: false });
    }

    _start(e) {
      e.preventDefault();
      if (this.touchId !== null) return;

      const t   = e.changedTouches[0];
      this.touchId = t.identifier;

      const rect = this.zone.getBoundingClientRect();
      this.ox    = rect.left + rect.width  / 2;
      this.oy    = rect.top  + rect.height / 2;
      this.maxR  = rect.width / 2 - this.thumb.offsetWidth / 2;

      this.zone.classList.add('active');
      this._update(t);
    }

    _move(e) {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === this.touchId) { this._update(t); break; }
      }
    }

    _end(e) {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === this.touchId) {
          this.touchId = null;
          this.zone.classList.remove('active');
          this.thumb.style.transform = 'translate(-50%, -50%)';
          state.axes[`${this.side}X`] = 0;
          state.axes[`${this.side}Y`] = 0;
          break;
        }
      }
    }

    _update(t) {
      let dx = t.clientX - this.ox;
      let dy = t.clientY - this.oy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > this.maxR) {
        dx = (dx / dist) * this.maxR;
        dy = (dy / dist) * this.maxR;
      }

      const nx = dx / this.maxR;
      const ny = dy / this.maxR;

      state.axes[`${this.side}X`] = nx;
      state.axes[`${this.side}Y`] = ny;

      this.thumb.style.transform =
        `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Button
  // ═════════════════════════════════════════════════════════════════════════
  class Button {
    /**
     * @param {HTMLElement} el
     * @param {string} key — key in state.buttons
     */
    constructor(el, key) {
      this.el  = el;
      this.key = key;
      this._bind();
    }

    _bind() {
      this.el.addEventListener('touchstart',  this._press.bind(this),   { passive: false });
      this.el.addEventListener('touchend',    this._release.bind(this), { passive: false });
      this.el.addEventListener('touchcancel', this._release.bind(this), { passive: false });
    }

    _press(e) {
      e.preventDefault();
      state.buttons[this.key] = true;
      this.el.classList.add('pressed');
      addRipple(this.el);
    }

    _release(e) {
      e.preventDefault();
      state.buttons[this.key] = false;
      this.el.classList.remove('pressed');
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // DPad (touch-area approach — all 4 directions on one container)
  // ═════════════════════════════════════════════════════════════════════════
  class DPad {
    /**
     * @param {Object} elements — { up, down, left, right } HTMLElements
     */
    constructor(elements) {
      this.els = elements;
      for (const [dir, el] of Object.entries(elements)) {
        const key = `DPAD_${dir.toUpperCase()}`;
        new Button(el, key);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Trigger (vertical swipe zone — 0.0 to 1.0)
  // ═════════════════════════════════════════════════════════════════════════
  class Trigger {
    /**
     * @param {HTMLElement} zone
     * @param {HTMLElement} fill   — the visual fill bar
     * @param {'LT' | 'RT'} key
     */
    constructor(zone, fill, key) {
      this.zone    = zone;
      this.fill    = fill;
      this.key     = key;
      this.touchId = null;
      this.topY    = 0;
      this.height  = 0;

      this._bind();
    }

    _bind() {
      this.zone.addEventListener('touchstart',  this._start.bind(this),  { passive: false });
      this.zone.addEventListener('touchmove',   this._move.bind(this),   { passive: false });
      this.zone.addEventListener('touchend',    this._end.bind(this),    { passive: false });
      this.zone.addEventListener('touchcancel', this._end.bind(this),    { passive: false });
    }

    _start(e) {
      e.preventDefault();
      if (this.touchId !== null) return;
      const t = e.changedTouches[0];
      this.touchId = t.identifier;
      const rect = this.zone.getBoundingClientRect();
      this.topY   = rect.top;
      this.height = rect.height;
      this.zone.classList.add('active');
      this._update(t);
    }

    _move(e) {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === this.touchId) { this._update(t); break; }
      }
    }

    _end(e) {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === this.touchId) {
          this.touchId = null;
          this.zone.classList.remove('active');
          state.triggers[this.key] = 0;
          this.fill.style.height = '0%';
          break;
        }
      }
    }

    _update(t) {
      // Top of zone = full press (1.0), bottom = no press (0.0)
      const raw = 1 - clamp((t.clientY - this.topY) / this.height, 0, 1);
      state.triggers[this.key] = raw;
      this.fill.style.height   = `${Math.round(raw * 100)}%`;
    }
  }

  function setAxis(key, value) {
    if (key in state.axes)    state.axes[key]    = value;
  }

  function setButton(key, value) {
    if (key in state.buttons) state.buttons[key] = !!value;
  }

  function setTrigger(key, value) {
    if (key in state.triggers) state.triggers[key] = Math.min(1, Math.max(0, value));
  }

  // ── Public API ────────────────────────────────────────────────────────
  return { Joystick, Button, DPad, Trigger, getState, setAxis, setButton, setTrigger, reset };

})();
