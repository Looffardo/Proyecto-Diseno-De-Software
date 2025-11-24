const express = require("express");
const Pedido = require("../models/Pedido");

const router = express.Router();

// POST /api/pedidos -> crear pedido
router.post("/", async (req, res) => {
  try {
    const pedido = new Pedido(req.body);
    const guardado = await pedido.save();
    res.status(201).json(guardado);
  } catch (err) {
    console.error(err);
    res.status(400).json({ mensaje: "Error al crear el pedido" });
  }
});

// (Opcional) GET /api/pedidos -> listar pedidos
router.get("/", async (req, res) => {
  try {
    const pedidos = await Pedido.find().sort({ createdAt: -1 });
    res.json(pedidos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error al obtener los pedidos" });
  }
});

module.exports = router;