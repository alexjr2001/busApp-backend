const express = require("express");
const { getUserReservations } = require("../controllers/reservationsController");

const router = express.Router();

router.get("/:telefonoOrDni", getUserReservations);

module.exports = router;
