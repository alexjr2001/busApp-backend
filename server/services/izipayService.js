// services/izipayService.js
const axios = require("axios");

exports.createPaymentToken = async ({ amount, currency = "PEN", cliente = {} }) => {
  try {
    const response = await axios.post(
      `${process.env.IZIPAY_URL}/api-payment/V4/Charge/CreatePayment`,
      {
        amount: amount * 100, // Izipay usa céntimos
        currency,
        customer: {
          email: cliente.email || "test@correo.com",
        },
      },
      {
        auth: {
          username: process.env.IZIPAY_USER,  // viene de tu .env
          password: process.env.IZIPAY_PASS,  // viene de tu .env
        },
      }
    );
    return response.data.answer;
  } catch (error) {
    console.error("Izipay error:", error.response?.data || error.message);
    throw new Error("No se pudo crear el token de pago");
  }
};
