// routes/auth.js
const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');

router.post('/send-code', authCtrl.sendCode);
router.post('/verify-code', authCtrl.verifyCode);

router.put('/user/:id', authCtrl.editUser);

module.exports = router;
