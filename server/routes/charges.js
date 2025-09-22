// routes/charges.js
const express = require('express');
const router = express.Router();
const chargesController = require('../controllers/chargesController');

// Si quieres proteger el endpoint en producción puedes usar un header secreto (opcional).
// const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'dev-token';
// router.use((req, res, next) => {
//   const key = req.headers['x-internal-key'];
//   if (process.env.NODE_ENV === 'production' && key !== INTERNAL_KEY) {
//     return res.status(401).json({ ok: false, error: 'Unauthorized' });
//   }
//   next();
// });

router.post('/sendReceipt', chargesController.sendReceipt);

module.exports = router;
