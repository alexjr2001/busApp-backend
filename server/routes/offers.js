const express = require("express");
const router = express.Router();
const offersCtrl = require("../controllers/offersController");

router.get("/", offersCtrl.getAllOffers);
router.post("/create", offersCtrl.createOffer);
router.post("/apply", offersCtrl.applyOffer);

module.exports = router;
