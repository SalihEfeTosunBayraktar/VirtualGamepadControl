'use strict';

const os     = require('os');
const qrcode = require('qrcode');

/**
 * Returns the primary non-internal IPv4 address of this machine.
 * Prefers Wi-Fi / Ethernet adapters.
 * @returns {string}
 */
function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

/**
 * Print an ASCII QR code for the given URL to stdout.
 * @param {string} url
 */
async function generateQR(url) {
  try {
    const str = await qrcode.toString(url, { type: 'terminal', small: true, errorCorrectionLevel: 'M' });
    console.log(str);
    console.log(`  📱 ${url}\n`);
  } catch {
    console.log(`  📱 ${url}\n`);
  }
}

module.exports = { getLocalIP, generateQR };
