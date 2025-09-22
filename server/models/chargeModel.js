// server/models/chargeModel.js
const pool = require('../db/pool');

async function createCharge({ token = null, amount, currency = 'PEN', status = 'pending', cliente = {}, bloqueo = {}, provider = null }) {
  const conn = await pool.getConnection();
  try {
    const [res] = await conn.execute(
      'INSERT INTO charges (token, amount, currency, status, cliente, bloqueo, provider) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [token, Number(amount/100), currency, status, JSON.stringify(cliente || {}), JSON.stringify(bloqueo || {}), provider]
    );
    return res.insertId;
  } finally {
    conn.release();
  }
}

async function updateChargeById(id, { token, status, response, error_message }) {
  const conn = await pool.getConnection();
  try {
    await conn.execute(
      'UPDATE charges SET token = COALESCE(?, token), status = COALESCE(?, status), response = COALESCE(?, response), error_message = COALESCE(?, error_message) WHERE id = ?',
      [token ? String(token) : null, status || null, response ? JSON.stringify(response) : null, error_message || null, id]
    );
  } finally {
    conn.release();
  }
}

async function updateChargeByToken(token, { status, response }) {
  const conn = await pool.getConnection();
  try {
    await conn.execute(
      'UPDATE charges SET status = COALESCE(?, status), response = COALESCE(?, response) WHERE token = ? OR id = ?',
      [status || null, response ? JSON.stringify(response) : null, token, token]
    );
  } finally {
    conn.release();
  }
}

async function findChargeByToken(token) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute('SELECT * FROM charges WHERE token = ? OR id = ? LIMIT 1', [token, token]);
    return rows[0];
  } finally {
    conn.release();
  }
}

module.exports = {
  createCharge,
  updateChargeById,
  updateChargeByToken,
  findChargeByToken,
};
