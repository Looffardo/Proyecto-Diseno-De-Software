const mongoose = require("mongoose");

const ItemPedidoSchema = new mongoose.Schema(
  {
    platoId: { type: mongoose.Schema.Types.ObjectId, ref: "Plato", required: true },
    nombre: { type: String, required: true },
    precioUnitario: { type: Number, required: true },
    cantidad: { type: Number, required: true },
  },
  { _id: false }
);

const PedidoSchema = new mongoose.Schema(
  {
    items: { type: [ItemPedidoSchema], required: true },
    total: { type: Number, required: true },
    usuarioId: { type: String }, // opcional: lo puedes ligar a tu sistema de auth
  },
  { timestamps: true }
);

module.exports = mongoose.model("Pedido", PedidoSchema);