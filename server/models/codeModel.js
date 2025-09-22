// models/codeModel.js
const pool = require('../db/pool');

async function saveVerificationCode(telefono, codeHash, expiresAt) {
  const [res] = await pool.query(
    'INSERT INTO verification_codes (telefono, code_hash, expires_at, created_at) VALUES (?, ?, ?, NOW())',
    [telefono, codeHash, expiresAt]
  );
  return res.insertId;
}

async function findValidCode(telefono) {
  const [rows] = await pool.query(
    'SELECT id, code_hash, expires_at, used FROM verification_codes WHERE telefono = ? AND expires_at >= NOW() ORDER BY id DESC LIMIT 1',
    [telefono]
  );
  return rows[0] || null;
}

async function markCodeUsed(id) {
  await pool.query('UPDATE verification_codes SET used = 1 WHERE id = ?', [id]);
}

module.exports = { saveVerificationCode, findValidCode, markCodeUsed };
