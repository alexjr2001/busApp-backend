// models/userModel.js
const pool = require('../db/pool');

async function findUserByPhone(telefono) {
  const [rows] = await pool.query(
    `SELECT id, telefono, nombre, apellido, fecha_nacimiento, genero, email, dni, created_at 
     FROM users 
     WHERE telefono = ? 
     LIMIT 1`,
    [telefono]
  );
  return rows[0] || null;
}

async function createUserByPhone(telefono, nombre = null, fecha_nacimiento = null) {
  const [res] = await pool.query(
    `INSERT INTO users (telefono, nombre, fecha_nacimiento, created_at) VALUES (?, ?, ?, NOW())`,
    [telefono, nombre, fecha_nacimiento]
  );
  return { id: res.insertId, telefono, nombre, fecha_nacimiento };
}


async function updateUserById(id, data) {
  const { nombre, apellido, fecha_nacimiento, genero, email, dni } = data;
  await pool.query(
    `UPDATE users 
     SET nombre = ?, apellido = ?, fecha_nacimiento = ?, genero = ?, email = ?, dni = ? 
     WHERE id = ?`,
    [nombre || null, apellido || null, fecha_nacimiento || null, genero || null, email || null, dni || null, id]
  );
  const [rows] = await pool.query(`SELECT * FROM users WHERE id = ?`, [id]);
  return rows[0];
}

module.exports = { findUserByPhone, createUserByPhone, updateUserById };
