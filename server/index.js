'use strict';

const https   = require('https');
const http    = require('http');
const express = require('express');
const WS      = require('ws');
const path    = require('path');

const { generateCert }    = require('./cert');
const { getLocalIP, generateQR } = require('./qr');
const GamepadManager      = require('./gamepad');

const HTTP_PORT  = parseInt(process.env.PORT        || '3000');
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT  || '3443');
const CLIENT_DIR = path.join(__dirname, '..', 'client');

// ── Express (serves client/) ──────────────────────────────────────────────────
const app = express();
app.use(express.static(CLIENT_DIR));

// ── REST: status endpoint (used by tester.html) ───────────────────────────────
app.get('/api/status', (_req, res) => {
  res.json({
    vigemAvailable: gamepadManager.isAvailable(),
    players:        getPlayerList(),
    uptime:         Math.floor(process.uptime()),
    version:        '1.0.0'
  });
});

// ── HTTP → HTTPS redirect ─────────────────────────────────────────────────────
const httpRedirect = express();
httpRedirect.get('*', (req, res) =>
  res.redirect(301, `https://${req.hostname}:${HTTPS_PORT}${req.url}`)
);
http.createServer(httpRedirect).listen(HTTP_PORT, '0.0.0.0');

// ── HTTPS server ──────────────────────────────────────────────────────────────
const cert        = generateCert();
const httpsServer = https.createServer(cert, app);
const wss         = new WS.Server({ server: httpsServer });
const gamepadManager = new GamepadManager();

/**
 * @typedef {{
 *   id:          number,
 *   name:        string,
 *   device:      string,
 *   connectedAt: Date,
 *   ws:          import('ws')
 * }} PlayerSession
 */

/** @type {Map<import('ws'), PlayerSession>} */
const playerSessions = new Map();

/** @type {Set<import('ws')>} — PC dashboard observers */
const observers = new Set();

// ── WebSocket ─────────────────────────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  const ua = req.headers['user-agent'] || '';

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {

      /* ── Mobile device registers as a gamepad player ── */
      case 'register': {
        const playerId = gamepadManager.addPlayer();
        if (playerId === null) {
          safeSend(ws, { type: 'error', message: 'Sunucu dolu — maks. 4 oyuncu!' });
          ws.close();
          return;
        }

        const name   = sanitize(msg.name)   || `Oyuncu ${playerId}`;
        const device = sanitize(msg.device) || detectDevice(ua);

        const session = { id: playerId, name, device, connectedAt: new Date(), ws };
        playerSessions.set(ws, session);

        console.log(`  ✅ P${playerId} bağlandı  → ${name}  (${device})`);
        safeSend(ws, { type: 'connected', playerId, maxPlayers: 4 });

        // Rumble / haptic feedback: game → mobile
        gamepadManager.setVibrationCallback(playerId, (large, small) => {
          safeSend(ws, {
            type:       'vibration',
            largeMotor: large / 255,
            smallMotor: small / 255
          });
        });

        broadcastPlayerList();
        break;
      }

      /* ── Mobile device sends input snapshot ── */
      case 'input': {
        const s = playerSessions.get(ws);
        if (s) gamepadManager.updateInput(s.id, msg);
        break;
      }

      /* ── PC dashboard subscribes as observer ── */
      case 'observe': {
        observers.add(ws);
        safeSend(ws, { type: 'playerList', players: getPlayerList(), vigemAvailable: gamepadManager.isAvailable() });
        break;
      }

      /* ── Ping / pong (latency heartbeat) ── */
      case 'ping': {
        safeSend(ws, { type: 'pong', ts: msg.ts });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (observers.delete(ws)) return;   // observer left — nothing to do

    const session = playerSessions.get(ws);
    if (session) {
      gamepadManager.removePlayer(session.id);
      playerSessions.delete(ws);
      console.log(`  ❌ P${session.id} ayrıldı  → ${session.name}`);
      broadcastPlayerList();
    }
  });

  ws.on('error', () => {});   // handled by close
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeSend(ws, data) {
  if (ws.readyState === WS.OPEN) ws.send(JSON.stringify(data));
}

function getPlayerList() {
  return [...playerSessions.values()].map(s => ({
    id:          s.id,
    name:        s.name,
    device:      s.device,
    connectedAt: s.connectedAt.toISOString()
  }));
}

function broadcastPlayerList() {
  const msg = JSON.stringify({
    type:           'playerList',
    players:        getPlayerList(),
    vigemAvailable: gamepadManager.isAvailable()
  });

  for (const ws of observers)       if (ws.readyState === WS.OPEN) ws.send(msg);
  for (const ws of playerSessions.keys())
    if (ws.readyState === WS.OPEN)
      ws.send(JSON.stringify({ type: 'status', playerCount: playerSessions.size, maxPlayers: 4 }));
}

function sanitize(s) {
  return typeof s === 'string' ? s.replace(/[<>"'&]/g, '').trim().slice(0, 24) : '';
}

function detectDevice(ua) {
  if (/iPhone/.test(ua)) {
    const m = ua.match(/iPhone OS ([\d_]+)/);
    return m ? `iPhone iOS ${m[1].replace(/_/g, '.')}` : 'iPhone';
  }
  if (/iPad/.test(ua))    return 'iPad';
  if (/SM-([A-Z0-9]+)/i.test(ua)) return `Samsung ${ua.match(/SM-([A-Z0-9]+)/i)[1]}`;
  if (/Samsung/i.test(ua)) return 'Samsung';
  if (/Android/.test(ua)) {
    const m = ua.match(/Android ([\d.]+)/);
    return m ? `Android ${m[1]}` : 'Android';
  }
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Mac/.test(ua))     return 'Mac';
  return 'Bilinmeyen';
}

// ── Start ─────────────────────────────────────────────────────────────────────
httpsServer.listen(HTTPS_PORT, '0.0.0.0', async () => {
  const ip  = getLocalIP();
  const url = `https://${ip}:${HTTPS_PORT}`;

  console.log('\n');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║        🎮  VirtualGamepadControl         ║');
  console.log('  ║         Xbox Gamepad over Browser        ║');
  console.log('  ╚══════════════════════════════════════════╝\n');
  console.log(`  📱 Mobil    → ${url}`);
  console.log(`  📺 Dashboard → ${url}/tester.html`);
  console.log(`  ⚠️  Sertifika uyarısı → "Gelişmiş › Devam et" seç\n`);
  console.log('  ── QR Kodu Telefonla Tara ───────────────────\n');
  await generateQR(url);
  console.log('  ─────────────────────────────────────────────');
  console.log('  Durdurmak için Ctrl+C\n');
});

process.on('SIGINT', () => {
  console.log('\n  🛑 Sunucu kapatılıyor...');
  gamepadManager.disconnectAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n  🛑 SIGTERM alındı, kapatılıyor...');
  gamepadManager.disconnectAll();
  process.exit(0);
});

// Ensure ViGEm controllers are freed even on crash
process.on('uncaughtException', (err) => {
  console.error('  ❌ İşlenmemiş hata:', err.message);
  gamepadManager.disconnectAll();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('  ❌ İşlenmemiş promise red:', reason);
  gamepadManager.disconnectAll();
  process.exit(1);
});

// Synchronous exit handler (runs even after process.exit())
process.on('exit', () => {
  try { gamepadManager.disconnectAll(); } catch (_) {}
});
