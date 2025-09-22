// controllers/bookingController.js
const pool = require('../db/pool');
const { createCharge, findChargeByToken } = require('../models/chargeModel');

function extractTokenFromCharge(charge) {
  if (!charge) return null;
  return charge.uuid || charge.id || charge.token || charge.transactionId || charge.paymentId || null;
}

async function saveBookingFromPayloadMysql(payload) {
  const conn = await pool.getConnection();
  try {
    const { provider, charge, cliente, ida, vuelta, bloqueo, monto } = payload;

    const numero_doc = cliente?.numeroDoc ?? null;
    const nombres = cliente?.nombres ?? null;
    const apellido_paterno = cliente?.apellidoPaterno ?? null;
    const apellido_materno = cliente?.apellidoMaterno ?? null;
    const correo = cliente?.correo ?? cliente?.email ?? null;
    const telefono = cliente?.telefono ?? null;

    const token = extractTokenFromCharge(charge);
    let chargeId = null;

    await conn.beginTransaction();

    // 1) Buscar charge existente
    if (token) {
      const existingCharge = await findChargeByToken(token);
      if (existingCharge) chargeId = existingCharge.id;
    }

    // 2) Si no existe charge, crearlo con modelo
    if (!chargeId) {
      chargeId = await createCharge({
        token,
        amount: charge?.amount ?? monto ?? null,
        currency: charge?.currency ?? 'PEN',
        status: charge?.status ?? 'pending',
        cliente,
        bloqueo,
        provider: provider ?? 'izipay'
      });
    }

    // Helper para insertar booking_details
    const insertBooking = async (trip) => {
      if (!trip) return null;
      const [res] = await conn.query(
        `INSERT INTO booking_details
          (charge_id, token, numero_doc, nombres, apellido_paterno, apellido_materno, correo, telefono,
           cod_viaje, vehiculo_id, origen, destino, fecha, hora, descripcion, detviaje)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          chargeId,
          token,
          numero_doc,
          nombres,
          apellido_paterno,
          apellido_materno,
          correo,
          telefono,
          trip?.codViaje ?? null,
          trip?.vehiculoId ?? null,
          trip?.origen ?? null,
          trip?.destino ?? null,
          trip?.fecha ?? null,
          trip?.hora ?? null,
          trip?.descripcion ?? null,
          trip?.detviaje ?? null
        ]
      );
      return res.insertId;
    };

    // 3) Insertar ida y vuelta (si existen)
    const bookingIds = [];
    if (ida) bookingIds.push(await insertBooking(ida));
    if (vuelta) bookingIds.push(await insertBooking(vuelta));

    await conn.commit();
    return { ok: true, bookingIds, chargeId, token };
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('saveBookingFromPayloadMysql error', err);
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  saveBookingFromPayloadMysql,
  extractTokenFromCharge
};
