const pool = require("../db/pool");

const getReservationsByUser = async (telefonoOrDni) => {
  const [rows] = await pool.execute(
    `SELECT * FROM booking_details 
     WHERE telefono = ? OR numero_doc = ?
     ORDER BY created_at DESC`,
    [telefonoOrDni, telefonoOrDni]
  );
  return rows;
};

module.exports = { getReservationsByUser };
