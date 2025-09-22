// app.js (o index.js)
require('dotenv').config();
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/', (req, res) => {
  res.send('Backend is working ✅');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
// importa rutas
const izipayRoutes = require('./routes/izipay.js');
app.use('/izipay', izipayRoutes);

// (si quieres) adicionar culqi route
const culqiRoutes = require('./routes/culqi.js'); // si lo creas
app.use('/culqi', culqiRoutes);

const chargesRoutes = require('./routes/charges');
app.use('/charges', chargesRoutes);


const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const reservationsRouter = require('./routes/reservations');
app.use("/api/reservations", reservationsRouter);


const offersRoutes = require("./routes/offers");
app.use("/api/offers", offersRoutes);

// ... resto de middlewares y escucha
