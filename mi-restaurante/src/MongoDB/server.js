const mongoose = require("mongoose");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const platosRouter = require("./rutas/platos");
const pedidosRouter = require("./rutas/pedidos");

const app = express();

// 🔹 Conectar a MongoDB
mongoose
  .connect("mongodb://127.0.0.1:27017/restaurante")
  .then(() => {
    console.log("✅ Conectado a MongoDB");
  })
  .catch((err) => {
    console.error("❌ Error conectando a MongoDB", err);
  });