import { useState, useMemo, useEffect } from "react";
import "./styles.css";
import Auth from "./Auth";
import {
  getToken,
  setToken,
  apiRequest,
  obtenerMacros,
  obtenerPlatos,
  crearPlato,
  actualizarPlato,
  eliminarPlato,
  crearPedido,
} from "./ApiClient";






const PLATOS_INICIALES = [
  {
    id: "1",
    nombre: "Ensalada César",
    descripcion: "Ensalada fresca con pollo y aderezo césar.",
    precio: 6990,
    tipo: "entrada",
    esFrio: true,
    esVegano: false,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: true,
    esSandwitch: false,
    ingredientes: ["Lechuga", "Pollo", "Crutones", "Queso parmesano", "Aderezo césar"],
  },
  {
    id: "2",
    nombre: "Ensalada Caprese",
    descripcion: "Ensalada italiana con tomate, mozzarella y albahaca.",
    precio: 7990,
    tipo: "entrada",
    esFrio: true,
    esVegano: false,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: false,
    esSandwitch: false,
    ingredientes: ["Tomate", "Mozzarella", "Albahaca"],
  },
  {
    id: "3",
    nombre: "Ensalada mixta de tofu",
    descripcion: "Ensalada fresca con variedad de vegetales, tofu y aderezo de limón.",
    precio: 6990,
    tipo: "entrada",
    esFrio: true,
    esVegano: true,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: false,
    esSandwitch: false,
    ingredientes: ["Lechuga", "Tomate", "Pepino", "Zanahoria", "Tofu","Aderezo de limón"],
  },
  {
    id: "4",
    nombre: "Ostiones a la parmesana",
    descripcion: "8 Ostiones gratinados con queso parmesano y cilantro.",
    precio: 12900,
    tipo: "entrada",
    esFrio: false,
    esVegano: false,
    esPasta: false,
    esMarisco: true,
    esAlcohol: false,
    esCarne: false,
    esSandwitch: false,
    ingredientes: ["Ostiones", "Queso parmesano", "Cilantro", "Mantequilla" ],
  },
  {
    id: "5",
    nombre: "Camarones apanados",
    descripcion: "Camarones apanados y fritos, servidos con salsa agridulce.",
    precio: 8990,
    tipo: "entrada",
    esFrio: false,
    esVegano: false,
    esPasta: false,
    esMarisco: true,
    esAlcohol: false,
    esCarne: false,
    esSandwitch: false,
    ingredientes: ["Camarones", "Harina", "Huevo", "Pan rallado", "Salsa agridulce"],
  },
  {
    id: "6",
    nombre: "Gyosas",
    descripcion: "5 unidades de empanadillas asiaticas rellenas de cerdo y verduras.",
    precio: 6990,
    tipo: "entrada",
    esFrio: false,
    esVegano: false,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: true,
    esSandwitch: false,
    ingredientes: ["Cerdo", "Repollo", "Sesamo","Soya", "Harina", "Aceite"],
  },
  {
    id: "7",
    nombre: "Locos",
    descripcion: "Locos con mayonesa y limón.",
    precio: 11990,
    tipo: "entrada",
    esFrio: true,
    esVegano: false,
    esPasta: false,
    esMarisco: true,
    esAlcohol: false,
    esCarne: false,
    esSandwitch: false,
    ingredientes: ["Locos", "Mayonesa", "Limón","Lechuga"],
  },
  {
    id: "8",
    nombre: "Falafel",
    descripcion: "Croquetas fritas de garbanzos y especias, servidas con salsa de yogur.",
    precio: 5990,
    tipo: "entrada",
    esFrio: false,
    esVegano: true,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: false,
    esSandwitch: false,
    ingredientes: ["Garbanzos","Mix de especias", "Perejil", "Cebollín","Harina", "Aceite", "Salsa de yogur"],
  },
  {
    id: "9",
    nombre: "Empanadas de queso",
    descripcion: "Empanadas rellenas de queso derretido.",
    precio: 6990,
    tipo: "entrada",
    esFrio: false,
    esVegano: false,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: false,
    esSandwitch: false,
    ingredientes: ["Queso", "Harina", "Aceite", "Huevo"],
  },
  {
    id: "10",
    nombre: "Crema de zapallo",
    descripcion: "Sopa cremosa de zapallo con un toque de crema y especias.",
    precio: 6990,
    tipo: "entrada",
    esFrio: false,
    esVegano: false,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: false,
    esSandwitch: false,
    ingredientes: ["Zapallo", "Cebolla", "Crema", "Caldo de verduras", "Mix de especias"],
  },
  {
    id: "11",
    nombre: "Nan con humus",
    descripcion: "Nan servido con humus de cilantro casero.",
    precio: 8990,
    tipo: "entrada",
    esFrio: true,
    esVegano: false,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: false,
    esSandwitch: false,
    ingredientes: ["Harina", "Yogur","Garbanzos","Tahini","Cilantro", "Limón" ],
  },
  {
    id: "12",
    nombre: "Fetuccini alfredo",
    descripcion: "Pasta fetuccini en salsa cremosa de queso parmesano y crema.",
    precio: 10990,
    tipo: "fondo",
    esFrio: false,
    esVegano: false,
    esPasta: true,
    esMarisco: false,
    esAlcohol: false,
    esCarne: true,
    esSandwitch: false,
    ingredientes: ["Fetuccini", "Queso parmesano", "Crema", "Jamon", "Nuez moscada"],
  },
  {
    id: "13",
    nombre: "Fettuccini al pesto",
    descripcion: "Pasta fetuccini con salsa pesto de albahaca, nueces y queso parmesano.",
    precio: 11990,
    tipo: "fondo",
    esFrio: false,
    esVegano: false,
    esPasta: true,
    esMarisco: false,
    esAlcohol: false,
    esCarne: false,
    esSandwitch: false,
    ingredientes: ["Fetuccini", "Albahaca", "Nueces", "Queso parmesano"],
  },
  {
    id: "14",
    nombre: "Fetuccini bolonesa",
    descripcion: "Pasta fetuccini con salsa bolonesa de carne y tomate.",
    precio: 10990,
    tipo: "fondo",
    esFrio: false,
    esVegano: false,
    esPasta: true,
    esMarisco: false,
    esAlcohol: false,
    esCarne: true,
    esSandwitch: false,
    ingredientes: ["Fetuccini", "Carne", "Tomate", "Cebolla", "Ajo", "Zanahoria"],
  },
  {
    id: "15",
    nombre: "Ravioles de carne a la bolognesa",
    descripcion: "Ravioles rellenos de carne servidos con salsa bolognesa casera.",
    precio: 12990,
    tipo: "fondo",
    esFrio: false,
    esVegano: false,
    esPasta: true,
    esMarisco: false,
    esAlcohol: false,
    esCarne: true,
    esSandwitch: false,
    ingredientes: ["Ravioles","Carne","Tomate","Cebolla","Ajo","Zanahoria"],
  },
  {
    id: "16",
    nombre: "Penne con salsa pomodoro",
    descripcion: "Pasta penne con salsa de tomate y albahaca.",
    precio: 10990,
    tipo: "fondo",
    esFrio: false,
    esVegano: true,
    esPasta: true,
    esMarisco: false,
    esAlcohol: false,
    esCarne: false,
    esSandwitch: false,
    ingredientes: ["Penne","Tomate","Albahaca","Ajo"],
  },
  {
    id: "17",
    nombre: "Hamburguesa clásica",
    descripcion: "Hamburguesa de carne con lechuga, tomate, queso y salsa especial, acompañada de una porcion de papas fritas.",
    precio: 9990,
    tipo: "fondo",
    esFrio: false,
    esVegano: false,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: true,
    esSandwitch: true,
    ingredientes: ["Pan brioche","Carne", "Lechuga", "Tomate", "Queso", "Salsa especial", "Papas fritas"],
  },
  {
    id: "18",
    nombre: "Barros Luco",
    descripcion: "Sándwich de carne con queso derretido.",
    precio: 8990,
    tipo: "fondo",
    esFrio: false,
    esVegano: false,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: true,
    esSandwitch: true,
    ingredientes: ["Carne", "Queso", "Marraqueta"],
  },
  {
    id: "19",
    nombre: "La Ranchera",
    descripcion: "Hamburguesa con tocino, huevo frito y queso cheddar, acompañada de papas fritas.",
    precio: 10990,
    tipo: "fondo",
    esFrio: false,
    esVegano: false,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: true,
    esSandwitch: true,
    ingredientes: ["Pan brioche","250g Carne", "Tocino", "Huevo frito", "Queso cheddar", "cebolla caramelizada", "salsa BBQ", "salsa especial", "Papas fritas"],
  },
  {
    id: "20",
    nombre: "Entraña a la parrilla",
    descripcion: "Entraña jugosa a la parrilla, servida con papas rústicas y ensalada chilena.",
    precio: 15990,
    tipo: "fondo",
    esFrio: false,
    esVegano: false,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: true,
    esSandwitch: false,
    ingredientes: ["Entraña", "Papas rústicas", "Ensalada chilena"],
  },
  {
    id: "21",
    nombre: "Bagel de salmón ahumado",
    descripcion: "Bagel relleno de salmón ahumado, queso crema, lechuga y mostaza.",
    precio: 6990,
    tipo: "fondo",
    esFrio: false,
    esVegano: false,
    esPasta: false,
    esMarisco: true,
    esAlcohol: false,
    esCarne: false,
    esSandwitch: true,
    ingredientes: ["Bagel","Salmón ahumado", "Queso crema", "Lechuga", "Pepinillos", "Mostaza"],
  },
  {
    id: "22",
    nombre: "Sandwitch vegano",
    descripcion: "Sandwitch con vegetales asados, hummus y pan integral.",
    precio: 6990,
    tipo: "fondo",
    esFrio: false,
    esVegano: true,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: false,
    esSandwitch: true,
    ingredientes: ["Pan integral","Berenjena asada", "Zucchini asado", "Pimiento asado", "Hummus", "Lechuga"],
  },
  {
    id: "23",
    nombre: "Bistec a lo pobre",
    descripcion: "Bistec de carne servido con papas fritas, cebolla caramelizada y huevo frito.",
    precio: 12990,
    tipo: "fondo",
    esFrio: false,
    esVegano: false,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: true,
    esSandwitch: false,
    ingredientes: ["Bistec", "Papas fritas", "Cebolla caramelizada", "Huevo frito"],
  },
  {
    id: "24",
    nombre: "Milanesa de pollo napolitana",
    descripcion: "Milanesa de pollo napolitana, servida con papas fritas.",
    precio: 11990,
    tipo: "fondo",
    esFrio: false,
    esVegano: false,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: true,
    esSandwitch: false,
    ingredientes: ["Milanesa de pollo", "Tomate", "Queso", "Jamón", "Papas fritas"],
  },
  {
    id: "25",
    nombre: "Tiramisú",
    descripcion: "Postre frío clásico italiano.",
    precio: 5500,
    tipo: "postre",
    esFrio: true,
    esVegano: false,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: false,
    esSandwitch: false,
    ingredientes: ["Bizcotelas", "Café", "Queso mascarpone", "Cacao en polvo"],
  },
  {
    id: "26",
    nombre: "Cheesecake de frutos rojos",
    descripcion: "Porcion de cheesecake con base de galleta y cobertura de frutos rojos.",
    precio: 5500,
    tipo: "postre",
    esFrio: true,
    esVegano: false,
    esPasta: false,
    esMarisco: false,
    esAlcohol: false,
    esCarne: false,
    esSandwitch: false,
    ingredientes: ["Queso crema", "Galletas", "Mantequilla", "Frutos rojos", "Leche condensada"],
  },

];



function App() {
const [platos, setPlatos] = useState([]);
const [cargandoPlatos, setCargandoPlatos] = useState(true);
const [errorPlatos, setErrorPlatos] = useState(null);

useEffect(() => {
  async function fetchPlatos() {
    try {
      const data = await obtenerPlatos();
      setPlatos(data);
    } catch (err) {
      console.error(err);
      setErrorPlatos("No se pudieron cargar los platos.");
    } finally {
      setCargandoPlatos(false);
    }
  }

  fetchPlatos();
}, []);


const [busqueda, setBusqueda] = useState("");
const [tipo, setTipo] = useState("todos");
const [soloFríos, setSoloFríos] = useState(false);
const [soloVeganos, setSoloVeganos] = useState(false);
const [soloPastas, setSoloPastas] = useState(false);
const [soloMariscos, setSoloMariscos] = useState(false);
const [soloAlcohol, setSoloAlcohol] = useState(false);
const [soloCarnes, setSoloCarnes] = useState(false);
const [soloSandwitches, setSoloSandwitches] = useState(false);

const [editando, setEditando] = useState(null);
const [form, setForm] = useState({
  nombre: "",
  descripcion: "",
  precio: "",
  tipo: "entrada",
  esFrio: false,
  esVegano: false,
  esPasta: false,
  esMarisco: false,
  esAlcohol: false,
  esCarne: false,
  esSandwitch: false,
  ingredientesTexto: "",
});


const [platoActivoId, setPlatoActivoId] = useState(null);
const [pedido, setPedido] = useState([]);
  const agregarAlPedido = (plato) => {
    setPedido((prev) => [...prev, plato]);
  };

  const totalPedido = useMemo(
    () => pedido.reduce((acc, p) => acc + p.precio, 0),
    [pedido]
  );

  const confirmarPedido = async () => {
  if (pedido.length === 0) {
    alert("No hay platos en el pedido.");
    return;
  }

  const items = pedido.map((p) => ({
    platoId: p.id || p._id,
    nombre: p.nombre,
    precioUnitario: p.precio,
    cantidad: 1, // si más adelante manejas cantidades, cámbialo
  }));

  const payload = {
    items,
    total: totalPedido,
    // opcional: usuarioId: usuario?.id || usuario?._id,
  };

  try {
    await crearPedido(payload);
    alert("Pedido guardado en la base de datos.");
    setPedido([]);
  } catch (err) {
    console.error(err);
    alert("Error al guardar el pedido.");
  }
};


  const platosFiltrados = useMemo(() => {
    return platos.filter((plato) => {
      const texto = (plato.nombre + " " + plato.descripcion).toLowerCase();
      const q = busqueda.toLowerCase();

      if (q && !texto.includes(q)) return false;
      if (tipo !== "todos" && plato.tipo !== tipo) return false;
      if (soloFríos && !plato.esFrio) return false;
      if (soloVeganos && !plato.esVegano) return false;
      if (soloPastas && !plato.esPasta) return false;
      if (soloMariscos && !plato.esMarisco) return false;
      if (soloAlcohol && !plato.esAlcohol) return false;
      if (soloCarnes && !plato.esCarne) return false;
      if (soloSandwitches && !plato.esSandwitch) return false;

      return true;
    });
  }, [platos, busqueda, tipo, soloFríos, soloVeganos, soloPastas, soloMariscos, soloAlcohol, soloCarnes, soloSandwitches]);
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
      esPasta: false,
      esMarisco: false,
      esAlcohol: false,
      esCarne: false,
      esSandwitch: false,
      ingredientesTexto: "",
    });
  };

const handleSubmit = async (e) => {
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

  const payload = {
    nombre: form.nombre,
    descripcion: form.descripcion,
    precio: precioNum,
    tipo: form.tipo,
    esFrio: form.esFrio,
    esVegano: form.esVegano,
    esPasta: form.esPasta,
    esMarisco: form.esMarisco,
    esAlcohol: form.esAlcohol,
    esCarne: form.esCarne,
    esSandwitch: form.esSandwitch,
    ingredientes: ingredientesArray,
  };

  try {
    if (editando) {
      // EDITAR
      const actualizado = await actualizarPlato(editando, payload);

      setPlatos((prev) =>
        prev.map((p) => (p.id === editando || p._id === editando ? actualizado : p))
      );
    } else {
      // CREAR
      const creado = await crearPlato(payload);
      setPlatos((prev) => [...prev, creado]);
    }

    limpiarFormulario();
  } catch (err) {
    console.error(err);
    alert("Error al guardar el plato");
  }
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
    esPasta: plato.esPasta,
    esMarisco: plato.esMarisco,
    esAlcohol: plato.esAlcohol,
    esCarne: plato.esCarne,
    esSandwitch: plato.esSandwitch,
    ingredientesTexto: plato.ingredientes?.join(", ") || "",
  });
};

const handleEliminar = async (id) => {
  if (!confirm("¿Seguro que deseas eliminar este plato?")) return;

  try {
    await eliminarPlato(id);
    setPlatos((prev) => prev.filter((p) => p.id !== id && p._id !== id));
  } catch (err) {
    console.error(err);
    alert("Error al eliminar el plato");
  }
};

const verMacros = async (plato) => {
  try {
    const data = await obtenerMacros(plato.nombre);

    if (!data.items || data.items.length === 0) {
      alert("No se encontraron datos nutricionales para este plato.");
      return;
    }

    const n = data.items[0];

    alert(
      `Información nutricional aproximada:\n\n` +
      `Calorías: ${n.calories}\n` +
      `Proteína: ${n.protein_g} g\n` +
      `Grasas totales: ${n.fat_total_g} g\n` +
      `Carbohidratos: ${n.carbohydrates_total_g} g\n`
    );
  } catch (err) {
    console.error(err);
    alert("Error al consultar la información nutricional.");
  }
};

// === AUTH ===
const [usuario, setUsuario] = useState(null);
const handleLogout = () => {
  setToken(null);
  setUsuario(null);
};

// Cargar usuario al montar si ya hay token guardado
useEffect(() => {
  const token = getToken();
  if (!token || usuario) return; // si no hay token o ya tengo usuario, no hago nada

  (async () => {
    try {
      const data = await apiRequest("/api/auth/profile");
      setUsuario(data.usuario);
    } catch (err) {
      console.error("No se pudo cargar el perfil, limpiando token", err);
      setToken(null);
      setUsuario(null);
    }
  })();
}, [usuario]);
  // Si no hay usuario logueado, mostrar pantalla de login
  if (!usuario && !getToken()) {
    return <Auth onAuth={setUsuario} />;
  }
  return (
    <div className="app">
      <header className="header">
        <h1>Restaurante "Nombre Restaurante"</h1>
        {usuario && (
          <div>
            <span style={{ marginRight: "1rem" }}>
              Hola, {usuario.nombre || usuario.email}
            </span>
            <button className="btn secundario" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        )}
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
                Preparaciones frias
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={soloVeganos}
                  onChange={(e) => setSoloVeganos(e.target.checked)}
                />
                Apto para veganos
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={soloPastas}
                  onChange={(e) => setSoloPastas(e.target.checked)}
                />
                Pastas
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={soloMariscos}
                  onChange={(e) => setSoloMariscos(e.target.checked)}
                />
                Mariscos
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={soloAlcohol}
                  onChange={(e) => setSoloAlcohol(e.target.checked)}
                />
                Bebidas alcohólicas
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={soloCarnes}
                  onChange={(e) => setSoloCarnes(e.target.checked)}
                />
                Carnes
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={soloSandwitches}
                  onChange={(e) => setSoloSandwitches(e.target.checked)}
                />
                Sandwitches y/o Hamburguesas
              </label>
            </div>
          </div>

          <div className="card">
            <h2>Menú</h2>

            {cargandoPlatos && <p>Cargando platos...</p>}
            {errorPlatos && <p style={{ color: "red" }}>{errorPlatos}</p>}

            {!cargandoPlatos && platosFiltrados.length === 0 && (
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
                      <button
                         className="btn secundario"
                         onClick={() => verMacros(plato)}
                         style={{ marginTop: "0.3rem" }}
                      >
                        Ver macros
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
                  Preparaciones frias
                </label>

                <label>
                  <input
                    type="checkbox"
                    name="esVegano"
                    checked={form.esVegano}
                    onChange={handleChangeForm}
                  />
                  Apto para veganos
                </label>

                <label>
                  <input
                    type="checkbox"
                    name="esPasta"
                    checked={form.esPasta}
                    onChange={handleChangeForm}
                  />
                  Pastas
                </label>

                <label>
                  <input
                    type="checkbox"
                    name="esMarisco"
                    checked={form.esMarisco}
                    onChange={handleChangeForm}
                  />
                  Mariscos
                </label>

                <label>
                  <input
                    type="checkbox"
                    name="esAlcohol"
                    checked={form.esAlcohol}
                    onChange={handleChangeForm}
                  />
                  Bebidas alcohólicas
                </label>

                <label>
                  <input
                    type="checkbox"
                    name="esCarne"
                    checked={form.esCarne}
                    onChange={handleChangeForm}
                  />
                  Carnes
                </label>

                <label>
                  <input
                    type="checkbox"
                    name="esSandwitch"
                    checked={form.esSandwitch}
                    onChange={handleChangeForm}
                  />
                  Sandwitches y/o Hamburguesas
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

                <button className="btn" type="button" onClick={confirmarPedido}>
                  Confirmar pedido
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;