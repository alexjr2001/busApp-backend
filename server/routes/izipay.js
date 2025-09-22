// routes/izipay.routes.js
const express = require('express');
const router = express.Router();
const izipayController = require('../controllers/izipayController');

router.post('/createPayment', izipayController.createPayment);
router.get('/checkout', izipayController.checkoutPage);
router.post('/verifyResult', izipayController.verifyResult);

module.exports = router;
