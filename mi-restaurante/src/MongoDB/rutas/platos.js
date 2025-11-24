const express = require("express");
const Plato = require("../models/Plato");

const router = express.Router();

// GET /api/platos -> listar platos
router.get("/", async (req, res) => {
  try {
    const platos = await Plato.find().sort({ nombre: 1 });
    res.json(platos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: "Error al obtener los platos" });
  }
});

// POST /api/platos -> crear plato
router.post("/", async (req, res) => {
  try {
    const plato = new Plato(req.body);
    const guardado = await plato.save();
    res.status(201).json(guardado);
  } catch (err) {
    console.error(err);
    res.status(400).json({ mensaje: "Error al crear el plato" });
  }
});

// PUT /api/platos/:id -> actualizar plato
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const actualizado = await Plato.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!actualizado) {
      return res.status(404).json({ mensaje: "Plato no encontrado" });
    }

    res.json(actualizado);
  } catch (err) {
    console.error(err);
    res.status(400).json({ mensaje: "Error al actualizar el plato" });
  }
});

// DELETE /api/platos/:id -> eliminar plato
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await Plato.findByIdAndDelete(id);

    if (!eliminado) {
      return res.status(404).json({ mensaje: "Plato no encontrado" });
    }

    res.json({ mensaje: "Plato eliminado" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ mensaje: "Error al eliminar el plato" });
  }
});

module.exports = router;