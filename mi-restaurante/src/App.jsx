import { useState, useMemo } from "react";
import "./styles.css";

const PLATOS_INICIALES = [
  {
    id: "1",
    nombre: "Ensalada César",
    descripcion: "Ensalada fresca con pollo y aderezo césar.",
    precio: 6500,
    tipo: "entrada",
    esFrio: true,
    esVegano: false,
    ingredientes: ["Lechuga", "Pollo", "Crutones", "Queso parmesano", "Aderezo césar"],
  },
  {
    id: "2",
    nombre: "Lasaña de verduras",
    descripcion: "Lasaña horneada con verduras de temporada.",
    precio: 8900,
    tipo: "fondo",
    esFrio: false,
    esVegano: true,
    ingredientes: ["Láminas de pasta", "Zanahoria", "Zapallo italiano", "Tomate", "Salsa de tomate"],
  },
  {
    id: "3",
    nombre: "Tiramisú",
    descripcion: "Postre frío clásico italiano.",
    precio: 5500,
    tipo: "postre",
    esFrio: true,
    esVegano: false,
    ingredientes: ["Bizcotelas", "Café", "Queso mascarpone", "Cacao en polvo"],
  },
];


function App() {
const [platos, setPlatos] = useState(PLATOS_INICIALES);

const [busqueda, setBusqueda] = useState("");
const [tipo, setTipo] = useState("todos");
const [soloFríos, setSoloFríos] = useState(false);
const [soloVeganos, setSoloVeganos] = useState(false);

const [editando, setEditando] = useState(null);
const [form, setForm] = useState({
  nombre: "",
  descripcion: "",
  precio: "",
  tipo: "entrada",
  esFrio: false,
  esVegano: false,
  ingredientesTexto: "",   // <- nuevo campo para ingresar ingredientes
});


const [platoActivoId, setPlatoActivoId] = useState(null); // <- nuevo
const [pedido, setPedido] = useState([]);
  const agregarAlPedido = (plato) => {
    setPedido((prev) => [...prev, plato]);
  };

  const totalPedido = useMemo(
    () => pedido.reduce((acc, p) => acc + p.precio, 0),
    [pedido]
  );

  const platosFiltrados = useMemo(() => {
    return platos.filter((plato) => {
      const texto = (plato.nombre + " " + plato.descripcion).toLowerCase();
      const q = busqueda.toLowerCase();

      if (q && !texto.includes(q)) return false;
      if (tipo !== "todos" && plato.tipo !== tipo) return false;
      if (soloFríos && !plato.esFrio) return false;
      if (soloVeganos && !plato.esVegano) return false;

      return true;
    });
  }, [platos, busqueda, tipo, soloFríos, soloVeganos]);

  const handleChangeForm = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const limpiarFormulario = () => {
    setEditando(null);
    setForm({
      nombre: "",
      descripcion: "",
      precio: "",
      tipo: "entrada",
      esFrio: false,
      esVegano: false,
    });
  };

const handleSubmit = (e) => {
  e.preventDefault();

  const precioNum = Number(form.precio);
  if (Number.isNaN(precioNum) || precioNum <= 0) {
    alert("El precio debe ser un número mayor a 0");
    return;
  }

  const ingredientesArray = form.ingredientesTexto
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (editando) {
    setPlatos((prev) =>
      prev.map((p) =>
        p.id === editando
          ? { ...p, ...form, precio: precioNum, ingredientes: ingredientesArray }
          : p
      )
    );
  } else {
    const nuevo = {
      ...form,
      id: crypto.randomUUID(),
      precio: precioNum,
      ingredientes: ingredientesArray,
    };
    setPlatos((prev) => [...prev, nuevo]);
  }
    limpiarFormulario();
};

const handleEditar = (plato) => {
  setEditando(plato.id);
  setForm({
    nombre: plato.nombre,
    descripcion: plato.descripcion,
    precio: String(plato.precio),
    tipo: plato.tipo,
    esFrio: plato.esFrio,
    esVegano: plato.esVegano,
    ingredientesTexto: plato.ingredientes?.join(", ") || "",
  });
};

  const handleEliminar = (id) => {
    if (!confirm("¿Seguro que deseas eliminar este plato?")) return;
    setPlatos((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Restaurante "Nombre Restaurante"</h1>
      </header>

      <main className="layout">
        
        {/* Menú + filtros */}
        <section className="col principal">
          <div className="card filtros">
            <h2>Buscar y filtrar</h2>
            <input
              type="text"
              placeholder="Buscar plato..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            <div className="filtros-linea">
              <label>
                Tipo:
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="entrada">Entrada</option>
                  <option value="fondo">Plato de fondo</option>
                  <option value="postre">Postre</option>
                  <option value="bebida">Bebida</option>
                </select>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={soloFríos}
                  onChange={(e) => setSoloFríos(e.target.checked)}
                />
                Solo fríos
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={soloVeganos}
                  onChange={(e) => setSoloVeganos(e.target.checked)}
                />
                Solo veganos
              </label>
            </div>
          </div>

          <div className="card">
            <h2>Menú</h2>

            {platosFiltrados.length === 0 && (
              <p>No se encontraron platos con esos filtros.</p>
            )}

            <div className="lista-platos">
              {platosFiltrados.map((plato) => {
                const abierto = platoActivoId === plato.id;

                return (
                  <article
                    key={plato.id}
                    className={`plato ${abierto ? "plato-abierto" : ""}`}
                    onClick={() =>
                      setPlatoActivoId((prev) => (prev === plato.id ? null : plato.id))
                    }
                  >
                    <div className="plato-contenido">
                      <div className="plato-header">
                        <h3>{plato.nombre}</h3>
                        <p className="precio">
                          ${plato.precio.toLocaleString("es-CL")}
                        </p>
                      </div>

                      <p className="descripcion">{plato.descripcion}</p>

                      {abierto && plato.ingredientes && plato.ingredientes.length > 0 && (
                        <ul className="ingredientes">
                          {plato.ingredientes.map((ing, i) => (
                            <li key={i}>{ing}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Botones: evitamos que el click colapse/abra al usar stopPropagation */}
                    <div
                      className="acciones-plato"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button className="btn" onClick={() => agregarAlPedido(plato)}>
                        Añadir al pedido
                      </button>

                      <button
                        className="btn secundario"
                        onClick={() => handleEditar(plato)}
                      >
                        Editar
                      </button>

                      <button
                        className="btn peligro"
                        onClick={() => handleEliminar(plato.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

          </div>
        </section>

        {/* Formulario + Pedido */}
        <section className="col lateral">
          <div className="card">
            <h2>{editando ? "Editar plato" : "Nuevo plato"}</h2>

            <form onSubmit={handleSubmit} className="form-plato">
              <label>
                Nombre
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChangeForm}
                  required
                />
              </label>

              <label>
                Descripción
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChangeForm}
                />
              </label>

              <label>
                Ingredientes (separados por coma)
                <textarea
                  name="ingredientesTexto"
                  value={form.ingredientesTexto}
                  onChange={handleChangeForm}
                  placeholder="Ej: Tomate, Queso, Albahaca"
                />
              </label>

              <label>
                Precio
                <input
                  name="precio"
                  type="number"
                  min="0"
                  value={form.precio}
                  onChange={handleChangeForm}
                  required
                />
              </label>

              <label>
                Tipo
                <select
                  name="tipo"
                  value={form.tipo}
                  onChange={handleChangeForm}
                >
                  <option value="entrada">Entrada</option>
                  <option value="fondo">Plato de fondo</option>
                  <option value="postre">Postre</option>
                  <option value="bebida">Bebida</option>
                </select>
              </label>

              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    name="esFrio"
                    checked={form.esFrio}
                    onChange={handleChangeForm}
                  />
                  Plato frío
                </label>

                <label>
                  <input
                    type="checkbox"
                    name="esVegano"
                    checked={form.esVegano}
                    onChange={handleChangeForm}
                  />
                  Vegano
                </label>
              </div>

              <div className="form-acciones">
                <button className="btn" type="submit">
                  {editando ? "Guardar cambios" : "Crear plato"}
                </button>

                {editando && (
                  <button
                    className="btn secundario"
                    type="button"
                    onClick={limpiarFormulario}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="card">
            <h2>Pedido</h2>

            {pedido.length === 0 ? (
              <p>No has agregado nada al pedido.</p>
            ) : (
              <>
                <ul className="lista-pedido">
                  {pedido.map((p, i) => (
                    <li key={i}>
                      {p.nombre} — ${p.precio.toLocaleString("es-CL")}
                    </li>
                  ))}
                </ul>

                <p className="total">
                  Total: ${totalPedido.toLocaleString("es-CL")}
                </p>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;