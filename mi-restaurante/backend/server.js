const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const platosRouter = require("./rutas/platos");
const pedidosRouter = require("./rutas/pedidos");

const app = express();
const PORT = 4000;

// Conectar a MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/restaurante")
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error conectando a MongoDB", err));

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});


// Rutas
app.use("/api/platos", platosRouter);
app.use("/api/pedidos", pedidosRouter);

// Escuchar
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));