// server/services/culqiService.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');


const CULQI_SECRET_KEY = process.env.CULQI_SECRET_KEY;
const CULQI_API_URL = process.env.CULQI_API_URL || 'https://api.culqi.com/v2/charges';
const RSA_ID = process.env.CULQI_RSA_ID;
const RSA_PUB_PATH = process.env.CULQI_RSA_PUB_PATH || path.join(process.cwd(), 'rsa_public.pem');

if (!CULQI_SECRET_KEY || !RSA_ID) {
  console.warn('Warning: CULQI_SECRET_KEY or CULQI_RSA_ID is not set in .env (required for production Culqi calls)');
}

function loadRsaPub() {
  if (!fs.existsSync(RSA_PUB_PATH)) throw new Error(`RSA public key file not found at ${RSA_PUB_PATH}`);
  return fs.readFileSync(RSA_PUB_PATH, 'utf8');
}

/**
 * Realiza el cargo en Culqi usando encrypted_data RSA
 * payload: { amount, currency, email, source_id }
 */
async function chargeWithCulqi(payload) {
  const rsaPub = loadRsaPub();

  const encrypted = crypto.publicEncrypt(
    { key: rsaPub, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(JSON.stringify(payload))
  );

  const base64 = encrypted.toString('base64');

  const resp = await axios.post(
    CULQI_API_URL,
    { encrypted_data: base64 },
    {
      headers: {
        Authorization: `Bearer ${CULQI_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'x-culqi-rsaid': RSA_ID,
      },
      timeout: 20000,
    }
  );

  return resp.data;
}

module.exports = {
  chargeWithCulqi,
};
