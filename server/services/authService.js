// services/authService.js
import axios from "axios";

const API_URL = "http://localhost:3000";

export const sendVerificationCode = async (telefono) => {
  try {
    const response = await axios.post(`${API_URL}/auth/send-code`, {
      telefono, // ✅ igual que el backend
    });
    return response.data;
  } catch (error) {
    console.error(
      "Error enviando código:",
      error.response?.data || error.message
    );
    throw error;
  }
};
