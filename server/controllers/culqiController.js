// server/controllers/culqiController.js
const { chargeWithCulqi } = require('../services/culqiService');
const chargeModel = require('../models/chargeModel');

async function postCharge(req, res) {
  try {
    const { token, amount, currency = 'PEN', cliente = {}, bloqueo = {} } = req.body;
    if (!token || !amount) return res.status(400).json({ success: false, message: 'token and amount required' });

    const recordId = await chargeModel.createCharge({ token: String(token), amount: Number(amount), currency, status: 'pending', cliente, bloqueo, provider: 'culqi' });

    try {
      const payload = {
        amount: Number(amount),
        currency,
        email: cliente?.correo || cliente?.email || 'noemail@test.com',
        source_id: token,
      };

      const apiResp = await chargeWithCulqi(payload);

      await chargeModel.updateChargeById(recordId, { status: 'success', response: apiResp });

      return res.json({ success: true, data: apiResp, recordId });
    } catch (apiErr) {
      const message = apiErr.response?.data || apiErr.message || String(apiErr);
      await chargeModel.updateChargeById(recordId, { status: 'failed', response: apiErr.response?.data || {}, error_message: String(message) });
      return res.status(apiErr.response?.status || 500).json({ success: false, error: message });
    }
  } catch (err) {
    console.error('Culqi /charge server error', err);
    return res.status(500).json({ success: false, message: String(err) });
  }
}

async function webhookHandler(req, res) {
  try {
    const event = req.body;
    console.log('Webhook Culqi recibido:', event);

    // Sólo consideramos charge.succeeded / charge.failed
    if (!['charge.succeeded', 'charge.failed'].includes(event.type)) {
      return res.json({ ok: true });
    }

    const chargeId = event?.data?.id;
    const status = event.type === 'charge.succeeded' ? 'success' : 'failed';

    if (chargeId) {
      await chargeModel.updateChargeByToken(chargeId, { status, response: event });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Culqi webhook handler error', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
}

module.exports = {
  postCharge,
  webhookHandler,
};
