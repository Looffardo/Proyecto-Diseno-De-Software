//Importamos Link de react-router-dom para navegar entre paginas
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {crearPedido, obtenerPlatos} from "./ApiClient";


//Pagina para hacer pedidos
export default function PedidosPage() {

  //Estados para almacenar los platos disponibles y el pedido actual
  const [platos, setPlatos] = useState([]);
  const [pedido, setPedido] = useState([]);

  //Cargar platos disponibles
  useEffect(() => {
    async function load() {
      const data = await obtenerPlatos();
      setPlatos(data);
    }
    load();
  }, []);

  //Funcion para agregar un plato al pedido
  const agregar = (plato) => {
    setPedido(prev => [...prev, plato]);
  };

  //Sumar total del pedido
  const total = pedido.reduce((acc, p) => acc + p.precio, 0);

  //Confirmar pedido (enviar al backend)
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

    //Arma lo que el backend espera
    await crearPedido(payload);
    alert("Pedido confirmado!");
    setPedido([]);
  };

  //Renderizado de la pagina
  return (
    <div className="container mt-4">
      <h1>Hacer Pedido</h1>

      {/* Link para volver al menu principal */}
      <Link to="/" className="btn btn-secondary mb-3">
        Volver al menú
      </Link>
      
      <h2 className="h5">Platos</h2>
      <div className="row row-cols-1 row-cols-md-2 g-3">
        
        {/* Mapeado de los platos dispnibles, con boton para añadir al pedido */}
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

      {/* Seccion que muestra el pedido actual */}
      <h2 className="h5">Tu Pedido</h2>

      {/* Mostrar mensaje si no hay platos en el pedido */}
      {pedido.length === 0 ? (
        <p>No hay platos todavía.</p>
      ) : (
        <>

          {/* Listado de platos en el pedido */}
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