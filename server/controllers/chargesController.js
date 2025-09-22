// controllers/chargesController.js
require('dotenv').config();
const nodemailer = require('nodemailer');
const bookingCtrl = require('./bookingController.js'); // AJUSTA la ruta si tu archivo está en otra carpeta

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: (process.env.SMTP_SECURE === 'true'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ---------- helpers (tu código existente) ----------
const normalizeSeats = (bloqueo) => {
  const seats = [];
  if (!bloqueo) return seats;

  const pushSeat = (asientoAny, extra = {}) => {
    const UNICO =
      (asientoAny?.resp?.Record?.CODIGO) ||
      (asientoAny?.resp?.record?.CODIGO) ||
      (extra?.resp?.Record?.CODIGO) ||
      (extra?.resp?.record?.CODIGO) ||
      null;

    seats.push({
      num_asiento: asientoAny?.num_asiento ?? asientoAny?.asiento ?? asientoAny?.numero ?? null,
      tipo_asiento: asientoAny?.tipo_asiento ?? asientoAny?.tipo ?? null,
      piso: asientoAny?.piso ?? null,
      precio: (asientoAny?.precio != null ? Number(asientoAny.precio) : (extra?.precio != null ? Number(extra.precio) : null)),
      UNICO,
      asientoRaw: asientoAny,
    });
  };

  if (Array.isArray(bloqueo)) {
    for (const item of bloqueo) {
      const asientoAny = item?.asiento ?? item;
      pushSeat(asientoAny, item);
    }
    return seats;
  }

  if (Array.isArray(bloqueo?.asientos)) {
    for (const a of bloqueo.asientos) pushSeat(a);
    return seats;
  }

  if (Array.isArray(bloqueo?.resultados)) {
    for (const r of bloqueo.resultados) {
      const asientoAny = r?.asiento ?? r;
      pushSeat(asientoAny, r);
    }
    return seats;
  }

  return seats;
};

const buildReceiptHtml = ({ cliente = {}, charge = {}, bloqueo = {}, provider = 'Pago', monto, ida = null, vuelta = null, ticketsConfirmed = null }) => {
  const email = cliente?.correo || cliente?.email || '';
  const trans = charge?.id || charge?.uuid || charge?.token || (charge?.transactionId ?? '') || (charge?.paymentId ?? '');
  const amount = monto ?? (charge?.amount ?? charge?.amount_total ?? '');
  const seats = normalizeSeats(bloqueo);

  const seatsRows = seats.length ? seats.map(s => {
    const key = s.UNICO ?? s.num_asiento ?? JSON.stringify(s.asientoRaw);
    const confirmStatus = ticketsConfirmed && (ticketsConfirmed[key] || ticketsConfirmed[String(key)]) ? ticketsConfirmed[key] : null;
    const statusText = confirmStatus
      ? (confirmStatus.status ? String(confirmStatus.status) : JSON.stringify(confirmStatus))
      : '-';
    return `
      <tr>
        <td style="padding:8px;border:1px solid #eee">${s.num_asiento ?? '-'}</td>
        <td style="padding:8px;border:1px solid #eee">${s.tipo_asiento ?? '-'}</td>
        <td style="padding:8px;border:1px solid #eee">${s.piso ?? '-'}</td>
        <td style="padding:8px;border:1px solid #eee">${s.precio != null ? `S/. ${Number(s.precio).toFixed(2)}` : '-'}</td>
        <td style="padding:8px;border:1px solid #eee">${s.UNICO ?? '-'}</td>
        <td style="padding:8px;border:1px solid #eee">${statusText}</td>
      </tr>`;
  }).join('') : '';

  const seatsTable = seats.length ? `
    <div style="margin-top:12px;">
      <strong>Asientos:</strong>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;border:1px solid #eee">Nº</th>
            <th style="text-align:left;padding:8px;border:1px solid #eee">Tipo</th>
            <th style="text-align:left;padding:8px;border:1px solid #eee">Piso</th>
            <th style="text-align:left;padding:8px;border:1px solid #eee">Precio</th>
            <th style="text-align:left;padding:8px;border:1px solid #eee">UNICO / CODIGO</th>
            <th style="text-align:left;padding:8px;border:1px solid #eee">Confirmación</th>
          </tr>
        </thead>
        <tbody>
          ${seatsRows}
        </tbody>
      </table>
    </div>` : '';

  const travelSection = (label, trip) => {
    if (!trip) return '';
    return `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #eee;">
        <strong>${label}</strong>
        <p style="margin:6px 0">Origen: ${trip.origen ?? trip.origin ?? '-'}</p>
        <p style="margin:6px 0">Destino: ${trip.destino ?? trip.destination ?? '-'}</p>
        <p style="margin:6px 0">Fecha/Hora: ${trip.fecha ?? trip.datetime ?? trip.hora ?? '-'}</p>
        <p style="margin:6px 0">Vehículo: ${trip.vehiculoId ?? trip.vehiculo ?? trip.plate ?? '-'}</p>
        ${ trip.descripcion ? `<p style="margin:6px 0">Descripción: ${trip.descripcion}</p>` : '' }
      </div>`;
  };

  const documento = cliente?.numeroDoc || cliente?.documento || cliente?.dni || cliente?.numero_documento || '-';
  const telefono = cliente?.telefono || cliente?.phone || cliente?.celular || '-';

  const plainText = [
    `Pago exitoso - ${provider}`,
    `Cliente: ${cliente?.nombres || cliente?.name || ''} ${cliente?.apellidoPaterno || cliente?.apellido || ''}`,
    `Correo: ${email}`,
    `Documento: ${documento}`,
    `Teléfono: ${telefono}`,
    `Monto: ${amount ? `S/. ${Number(amount).toFixed(2)}` : '-'}`,
    `Transacción: ${trans}`,
  ].join('\n');

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111;">
    <div style="max-width:700px;margin:0 auto;padding:20px;">
      <div style="text-align:center">
        <div style="display:inline-flex;width:88px;height:88px;border-radius:44px;background:#D1FAE5;align-items:center;justify-content:center">
          <div style="font-size:48px;color:#059669;font-weight:700">✓</div>
        </div>
        <h2 style="margin:12px 0 6px;">Pago exitoso</h2>
        <p style="margin:0;color:#555;">Gracias por tu compra. A continuación los detalles.</p>
      </div>

      <div style="background:#fff;border:1px solid #eee;border-radius:8px;padding:14px;margin-top:12px;">
        <p><strong>Cliente:</strong> ${cliente?.nombres || cliente?.name || ''} ${cliente?.apellidoPaterno || cliente?.apellido || ''}</p>
        <p><strong>Correo:</strong> ${email}</p>
        <p><strong>Documento:</strong> ${documento}</p>
        <p><strong>Teléfono:</strong> ${telefono}</p>
        <p><strong>Monto:</strong> ${amount ? `S/. ${Number(amount).toFixed(2)}` : '-'}</p>
        <p><strong>Transacción:</strong> ${trans}</p>
        <p><strong>Método:</strong> ${provider}</p>

        ${travelSection('Viaje - Ida', ida)}
        ${travelSection('Viaje - Vuelta', vuelta)}

        ${seatsTable}

        <hr style="border:none;border-top:1px solid #eee;margin:12px 0" />
        <p style="font-size:12px;color:#666">Si necesitas soporte responde este correo.</p>
      </div>
    </div>
  </div>`;

  return { html, text: plainText };
};

// ---------- sendReceiptInternal (igual que antes) ----------
exports.sendReceiptInternal = async ({ cliente, charge, bloqueo, provider, monto, ida, vuelta, ticketsConfirmed } = {}) => {
  const to = cliente?.correo || cliente?.email;
  if (!to) throw new Error('Falta email del cliente');

  const { html, text } = buildReceiptHtml({
    cliente, charge, bloqueo, provider, monto, ida, vuelta, ticketsConfirmed
  });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `Recibo de compra - ${provider || 'Pago'}`,
    text,
    html,
  });

  return info;
};

// ---------- Endpoint HTTP: POST /charges/sendReceipt ----------
exports.sendReceipt = async (req, res) => {
  try {
    console.log("PAGOINFO:", req.body);
    const { cliente, charge, bloqueo, provider, monto, ida, vuelta, ticketsConfirmed } = req.body;
    if (!cliente || !(cliente.correo || cliente.email)) {
      return res.status(400).json({ ok: false, error: 'Falta email del cliente' });
    }

    // ----- NUEVO: Guardar booking_details en la DB -----
    try {
      // saveBookingFromPayloadMysql espera todo el payload tal como viene (provider, charge, cliente, ida, etc)
      const saved = await bookingCtrl.saveBookingFromPayloadMysql(req.body);
      console.log('Booking guardado OK:', saved);
      // opcional: podrías incluir saved en la respuesta
    } catch (saveErr) {
      // Decide si quieres hacer esto bloqueante o no.
      // Actualmente: fallos de guardado NO impiden el envío del correo.
      console.error('Error guardando booking_details (no bloqueante):', saveErr);
    }

    // ----- Enviar correo (como antes) -----
    const info = await exports.sendReceiptInternal({ cliente, charge, bloqueo, provider, monto, ida, vuelta, ticketsConfirmed });
    return res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('sendReceipt error', err);
    return res.status(500).json({ ok: false, error: err.message || 'Error enviando recibo' });
  }
};
