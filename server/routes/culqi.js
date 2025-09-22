// server/routes/culqi.js
const express = require('express');
const router = express.Router();
const culqiController = require('../controllers/culqiController');

router.post('/charge', culqiController.postCharge);
router.post('/webhook', culqiController.webhookHandler);

module.exports = router;
