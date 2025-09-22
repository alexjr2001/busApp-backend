// controllers/izipayController.js
const izipayService = require("../services/izipayService");
const axios = require("axios");
const chargeModel = require('../models/chargeModel');

exports.createPayment = async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const data = await izipayService.createPaymentToken({ amount, currency });

    if (!data || !data.formToken) {
      return res.status(500).json({ error: "No se recibió formToken desde Izipay" });
    }

    res.json({ formToken: data.formToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creando el pago con Izipay" });
  }
};

// Página de checkout
exports.checkoutPage = (req, res) => {
  const { formToken } = req.query;
  if (!formToken) return res.status(400).send("Falta formToken");

  const publicKey = process.env.IZIPAY_PUBLIC_KEY; // desde tu .env
  // BACKEND URL absoluto para que Izipay haga POST hacia aquí (IMPORTANTE)
  const backendUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  const html = `
  <!doctype html>
  <html lang="es">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Izipay Checkout</title>
    <script 
      src="https://api.micuentaweb.pe/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js"
      kr-public-key="${publicKey}"
      kr-post-url-success="${backendUrl}/izipay/verifyResult"
      kr-language="es-ES">
    </script>
    <link rel="stylesheet" href="https://api.micuentaweb.pe/static/js/krypton-client/V4.0/ext/classic-reset.css">
    <link rel="stylesheet" href="https://api.micuentaweb.pe/static/js/krypton-client/V4.0/ext/classic.css">
    <style>
      body {
        margin: 0;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f3f4f6;
      }
      .checkout-container {
        background: #fff;
        padding: 30px;
        border-radius: 16px;
        box-shadow: 0px 8px 20px rgba(0,0,0,0.1);
        max-width: 400px;
        width: 100%;
      }
      .kr-payment-button {
        background-color: #2563eb !important;
        border-radius: 8px !important;
        font-size: 16px !important;
        padding: 12px 20px !important;
        color: #fff !important;
      }
    </style>
  </head>
  <body>
    <div class="checkout-container">
      <div class="kr-embedded" kr-form-token="${formToken}"></div>
    </div>
  </body>
  </html>`;
  res.send(html);
};

exports.verifyResult = async (req, res) => {
  try {
    // Izipay envía la info en kr-answer como string JSON
    const krAnswerRaw = req.body['kr-answer'] || req.body.kr_answer || req.body.kranswer;
    if (!krAnswerRaw) return res.status(400).json({ error: 'Falta kr-answer en request' });

    const krAnswer = JSON.parse(krAnswerRaw);
    const transaction = Array.isArray(krAnswer.transactions) ? krAnswer.transactions[0] : krAnswer.transactions;

    if (!transaction || !transaction.uuid) {
      return res.status(400).json({ error: 'Falta transaction.uuid' });
    }

    const statusMap = {
      'AUTHORISED': 'paid',
      'PAID': 'paid',
      'CANCELLED': 'rejected',
      'REJECTED': 'rejected',
      'DECLINED': 'rejected',
      'PENDING': 'pending'
    };
    const status = statusMap[transaction.detailedStatus] || statusMap[transaction.status] || 'pending';

    // Guardar o actualizar charge en DB (adaptalo a tu modelo)
    try {
      const existing = await chargeModel.findChargeByToken(transaction.uuid);
      if (!existing) {
        const id = await chargeModel.createCharge({
          token: transaction.uuid,
          amount: transaction.amount,
          currency: transaction.currency,
          status,
          cliente: krAnswer.customer,
          bloqueo: {},
          provider: 'izipay',
          raw: krAnswer
        });
        await chargeModel.updateChargeById(id, {
          response: transaction,
          status,
          error_message: transaction.detailedErrorMessage || transaction.errorMessage || null
        });
      } else {
        await chargeModel.updateChargeById(existing.id, {
          response: transaction,
          status,
          error_message: transaction.detailedErrorMessage || transaction.errorMessage || null
        });
      }
    } catch (dbErr) {
      console.error('DB save error verifyResult:', dbErr);
      // continue even if DB fails
    }

    // Payload que queremos enviar a la app
    const resultJson = {
      success: status === 'paid',
      transactionId: transaction.uuid,
      status,
      amount: (transaction.amount || 0) / 100, // normaliza a unidades
      card: transaction.paymentMethod?.maskedPan || null,
      payment: transaction,
      raw: krAnswer
    };

    // Si la petición acepta JSON -> devolver JSON (compatibilidad SDK)
    const accept = (req.headers['accept'] || '').toLowerCase();
    const contentType = (req.headers['content-type'] || '').toLowerCase();
    const wantsJson = accept.includes('application/json') || contentType.includes('application/json');

    if (wantsJson) {
      return res.json(resultJson);
    }

    // Si no, respondemos con HTML que envia postMessage al WebView y muestra UI amigable
    const html = `<!doctype html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; background:#f6f7fb;">
  <div style="max-width:560px; width:100%; text-align:center; padding:24px; background:#fff; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.08);">
    <h1 style="margin:0 0 8px 0; font-size:20px;">Pago ${resultJson.success ? 'exitoso' : 'no procesado'}</h1>
    <p style="color:#666; margin:0 0 16px 0;">Estado: ${resultJson.status} · Monto: ${resultJson.amount}</p>
    <pre style="text-align:left; max-height:240px; overflow:auto; background:#f3f4f6; padding:12px; border-radius:8px;">${JSON.stringify(resultJson, null, 2)}</pre>
    <p style="margin-top:16px; color:#0a2540; font-weight:600;">Cierra esta ventana para volver a la app.</p>
  </div>

  <script>
    (function(){
      var payload = ${JSON.stringify(resultJson)};
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'izipay_result', data: payload }));
        } else {
          // si no hay RN WebView, intentar postMessage clásico (para navegadores)
          try { window.parent.postMessage(payload, '*'); } catch(e) {}
        }
      } catch(e) { /* ignore */ }
    })();
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);

  } catch (err) {
    console.error('Error verifyResult:', err);
    if ((req.headers['accept'] || '').includes('application/json')) {
      return res.status(500).json({ error: 'Error verificando pago Izipay' });
    } else {
      return res.status(500).send('<h1>Error verificando pago Izipay</h1>');
    }
  }
};
