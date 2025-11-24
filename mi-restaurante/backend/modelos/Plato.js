const mongoose = require("mongoose");

const PlatoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    descripcion: { type: String, default: "" },
    precio: { type: Number, required: true },
    tipo: {
      type: String,
      enum: ["entrada", "fondo", "postre", "bebida"],
      required: true,
    },

    esFrio: { type: Boolean, default: false },
    esVegano: { type: Boolean, default: false },
    esPasta: { type: Boolean, default: false },
    esMarisco: { type: Boolean, default: false },
    esAlcohol: { type: Boolean, default: false },
    esCarne: { type: Boolean, default: false },
    esSandwitch: { type: Boolean, default: false },

    ingredientes: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plato", PlatoSchema);