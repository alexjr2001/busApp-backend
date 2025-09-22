const OfferModel = require("../models/offerModel");

exports.createOffer = async (req, res) => {
  try {
    const { codigo, descripcion, descuento, tipo_descuento, fecha_inicio, fecha_fin } = req.body;

    if (!codigo || !descuento || !tipo_descuento || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const offer = await OfferModel.create({
      codigo,
      descripcion,
      descuento,
      tipo_descuento,
      fecha_inicio,
      fecha_fin
    });

    res.status(201).json(offer);
  } catch (err) {
    console.error("Error creating offer:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Offer code already exists" });
    }

    res.status(500).json({ error: "Error creating offer" });
  }
};

exports.applyOffer = async (req, res) => {
  try {
    const { codigo, monto_original } = req.body;

    if (!codigo || monto_original == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const offer = await OfferModel.findByCode(codigo);

    if (!offer) return res.status(404).json({ error: "Offer not found" });

    if (!offer.activo) return res.status(400).json({ error: "Offer inactive" });

    const now = new Date();
    const fechaInicio = new Date(offer.fecha_inicio);
    const fechaFin = new Date(offer.fecha_fin);

    if (fechaInicio > now || fechaFin < now) {
      return res.status(400).json({ error: "Offer expired or not yet active" });
    }

    // calcular el descuento
    let monto_final = parseFloat(monto_original);
    if (offer.tipo_descuento === "porcentaje") {
      monto_final -= monto_final * (offer.descuento / 100);
    } else if (offer.tipo_descuento === "monto") {
      monto_final = Math.max(0, monto_final - offer.descuento);
    }

    res.json({
      success: true,
      codigo: offer.codigo,
      tipo_descuento: offer.tipo_descuento,
      descuento: offer.descuento,
      monto_original: parseFloat(monto_original),
      monto_final: parseFloat(monto_final.toFixed(2))
    });
  } catch (err) {
    console.error("Error applying offer:", err);
    res.status(500).json({ error: "Error applying offer" });
  }
};

exports.getAllOffers = async (req, res) => {
  try {
    const rows = await OfferModel.findAll();
    res.json({ ok: true, rows });
  } catch (err) {
    console.error("Error fetching offers:", err);
    res.status(500).json({ ok: false, error: "Error fetching offers" });
  }
};
