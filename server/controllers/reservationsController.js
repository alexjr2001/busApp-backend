const { getReservationsByUser } = require("../models/reservationModel");

const getUserReservations = async (req, res) => {
  try {
    const { telefonoOrDni } = req.params;

    if (!telefonoOrDni) {
      return res.status(400).json({ ok: false, error: "Falta parámetro" });
    }

    const rows = await getReservationsByUser(telefonoOrDni);

    res.json({ ok: true, rows });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
};

module.exports = { getUserReservations };
