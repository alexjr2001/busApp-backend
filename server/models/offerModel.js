const pool = require("../db/pool");

const OfferModel = {
  async create({ codigo, descripcion, descuento, tipo_descuento, fecha_inicio, fecha_fin }) {
    const [result] = await pool.query(
      `INSERT INTO offers (codigo, descripcion, descuento, tipo_descuento, fecha_inicio, fecha_fin)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [codigo, descripcion, descuento, tipo_descuento, fecha_inicio, fecha_fin]
    );

    // En MySQL el insert devuelve insertId
    return { id: result.insertId, codigo, descripcion, descuento, tipo_descuento, fecha_inicio, fecha_fin };
  },

  async findByCode(codigo) {
    const [rows] = await pool.query(
      `SELECT * FROM offers WHERE codigo = ?`,
      [codigo]
    );
    return rows[0];
  },

  async deactivate(id) {
    await pool.query(
      `UPDATE offers 
       SET activo = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );

    // Como MySQL no devuelve el registro actualizado, lo buscamos de nuevo
    const [rows] = await pool.query(
      `SELECT * FROM offers WHERE id = ?`,
      [id]
    );

    return rows[0];
  },
  async findAll() {
    const [rows] = await pool.query(`SELECT * FROM offers ORDER BY id DESC`);
    return rows;
  }
};

module.exports = OfferModel;
