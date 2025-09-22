// controllers/authController.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { saveVerificationCode, findValidCode, markCodeUsed } = require('../models/codeModel');
const { findUserByPhone, createUserByPhone, updateUserById } = require('../models/userModel');
const { sendSms } = require('../utils/sms'); // ver utils abajo

const JWT_SECRET = process.env.JWT_SECRET || 'cambiaesto';
const CODE_TTL_MIN = Number(process.env.OTP_TTL_MIN || 5);

function genNumericCode(len = 6) {
  let s = '';
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

exports.sendCode = async (req, res) => {
  try {
    console.log(req.body);
    const { telefono } = req.body;
    if (!telefono) return res.status(400).json({ ok: false, message: 'telefono requerido' });

    const code = genNumericCode(6);
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);
    await saveVerificationCode(telefono, codeHash, expiresAt);

    // enviar SMS (stub o Twilio)
    await sendSms(telefono, `Tu código para acceder: ${code}. Expira en ${CODE_TTL_MIN} minutos.`);

    return res.json({ ok: true, message: 'Código enviado' });
  } catch (err) {
    console.error('sendCode error', err);
    return res.status(500).json({ ok: false, message: 'error' });
  }
};

exports.verifyCode = async (req, res) => {
  try {
    const { telefono, code, name, fecha_nacimiento } = req.body; // 🔹 agregar fecha_nacimiento
    if (!telefono || !code) return res.status(400).json({ ok: false, message: 'telefono y code requeridos' });

    const rec = await findValidCode(telefono);
    if (!rec) return res.status(400).json({ ok: false, message: 'No hay código válido o expirado' });
    if (rec.used) return res.status(400).json({ ok: false, message: 'Código ya usado' });

    const ok = await bcrypt.compare(String(code), rec.code_hash);
    if (!ok) return res.status(400).json({ ok: false, message: 'Código inválido' });

    await markCodeUsed(rec.id);

    let user = await findUserByPhone(telefono);
    if (!user) {
      // 🔹 Pasamos fecha_nacimiento al crear usuario
      user = await createUserByPhone(telefono, name || null, fecha_nacimiento || null);
    } else if (name || fecha_nacimiento) {
      // 🔹 actualizar si ya existía
      const { updateUserById } = require('../models/userModel');
      user = await updateUserById(user.id, { nombre: name || user.nombre, fecha_nacimiento: fecha_nacimiento || user.fecha_nacimiento });
    }

    const { signToken } = require('../utils/jwt');
    const token = signToken({ id: user.id, telefono: user.telefono }, process.env.JWT_EXPIRES || '7d');
    return res.json({ ok: true, accessToken: token, user });
  } catch (err) {
    console.error('verifyCode error', err);
    return res.status(500).json({ ok: false, message: 'error' });
  }
};

exports.editUser = async (req, res) => {
  try {
    const { id } = req.params; // viene de /user/:id
    const data = req.body;

    if (!id) {
      return res.status(400).json({ ok: false, message: 'Falta id' });
    }

    const updated = await updateUserById(id, data);
    if (!updated) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }

    return res.json(updated);
  } catch (err) {
    console.error('editUser error', err);
    return res.status(500).json({ ok: false, message: 'Error interno' });
  }
};

