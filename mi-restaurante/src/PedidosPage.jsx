import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {crearPedido, obtenerPlatos} from "./ApiClient";

export default function PedidosPage() {
  const [platos, setPlatos] = useState([]);
  const [pedido, setPedido] = useState([]);

  useEffect(() => {
    async function load() {
      const data = await obtenerPlatos();
      setPlatos(data);
    }
    load();
  }, []);

  const agregar = (plato) => {
    setPedido(prev => [...prev, plato]);
  };

  const total = pedido.reduce((acc, p) => acc + p.precio, 0);

  const confirmar = async () => {
    if (pedido.length === 0) return;

    const payload = {
      items: pedido.map(p => ({
        platoId: p.id || p._id,
        nombre: p.nombre,
        precioUnitario: p.precio,
        cantidad: 1,
      })),
      total,
    };

    await crearPedido(payload);
    alert("Pedido confirmado!");
    setPedido([]);
  };

  return (
    <div className="container mt-4">
      <h1>Hacer Pedido</h1>

      <Link to="/" className="btn btn-secondary mb-3">
        Volver al menú
      </Link>

      <h2 className="h5">Platos</h2>
      <div className="row row-cols-1 row-cols-md-2 g-3">
        {platos.map(pl => (
          <div className="col" key={pl.id || pl._id}>
            <div className="card p-3">
              <h3 className="h6">{pl.nombre}</h3>
              <p>${pl.precio.toLocaleString("es-CL")}</p>

              <button
                className="btn btn-primary"
                onClick={() => agregar(pl)}
              >
                Añadir
              </button>
            </div>
          </div>
        ))}
      </div>

      <hr />

      <h2 className="h5">Tu Pedido</h2>

      {pedido.length === 0 ? (
        <p>No hay platos todavía.</p>
      ) : (
        <>
          <ul>
            {pedido.map((p, i) => (
              <li key={i}>
                {p.nombre} — ${p.precio.toLocaleString("es-CL")}
              </li>
            ))}
          </ul>

          <p><strong>Total:</strong> ${total.toLocaleString("es-CL")}</p>

          <button className="btn btn-success" onClick={confirmar}>
            Confirmar pedido
          </button>
        </>
      )}
    </div>
  );
}
