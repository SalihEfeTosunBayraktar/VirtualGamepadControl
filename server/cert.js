'use strict';

const fs   = require('fs');
const path = require('path');

const CERT_FILE = path.join(__dirname, '.ssl-cert.json');

/**
 * Generate or load a self-signed SSL certificate.
 * iOS Safari requires HTTPS for DeviceMotion/gyroscope access.
 * @returns {{ key: string, cert: string }}
 */
function generateCert() {
  if (fs.existsSync(CERT_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CERT_FILE, 'utf8'));
    } catch { /* fall through to regenerate */ }
  }

  console.log('  🔐 SSL sertifikası oluşturuluyor...');

  let selfsigned;
  try {
    selfsigned = require('selfsigned');
  } catch {
    console.error('  ❌ "selfsigned" paketi bulunamadı. Lütfen: npm install');
    process.exit(1);
  }

  const attrs = [
    { name: 'commonName',       value: 'VirtualGamepadControl' },
    { name: 'organizationName', value: 'Local'                 }
  ];

  const pems = selfsigned.generate(attrs, {
    days:      3650,
    algorithm: 'sha256',
    keySize:   2048
  });

  const data = { key: pems.private, cert: pems.cert };

  try {
    fs.writeFileSync(CERT_FILE, JSON.stringify(data), 'utf8');
  } catch { /* not critical */ }

  console.log('  ✅ SSL sertifikası hazır (10 yıl geçerli)\n');
  return data;
}

module.exports = { generateCert };
