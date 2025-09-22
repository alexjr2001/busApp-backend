// utils/sms.js
require('dotenv').config();
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendSms = async (to, message) => {
  try {
    const res = await client.messages.create({
      body: message,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      //to: process.env.TWILIO_PHONE, // tu número de Twilio verificado
      to: to, // tu número de Twilio verificado
    });
    console.log("SMS enviado:", res.sid);
    return res;
  } catch (err) {
    console.error("Error enviando SMS", err);
    throw err;
  }
};
