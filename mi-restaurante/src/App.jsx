import { useState, useMemo, useEffect } from "react";
import "./styles.css";
import Auth from "./Auth";
import {
  getToken,
  setToken,
  apiRequest,
  obtenerIANutricion,
  obtenerPlatos,
  crearPlato,
  actualizarPlato,
  eliminarPlato,
} from "./ApiClient";
import { useI18n } from "./i18n/I18nProvider";
import { Link } from "react-router-dom";


// Lógica central de la app
function App() {

  const [platos, setPlatos] = useState([]);
  const [cargandoPlatos, setCargandoPlatos] = useState(true);
  const [errorPlatos, setErrorPlatos] = useState(false);
  const { lang, setLang, t } = useI18n();

  useEffect(() => {
    async function fetchPlatos() {
      try {
        const data = await obtenerPlatos();
        setPlatos(data);
      } catch (err) {
        console.error(err);
        setErrorPlatos(true);
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

  const [modalAbierto, setModalAbierto] = useState(false);
  const [macroData, setMacroData] = useState(null);
  const [cargandoMacros, setCargandoMacros] = useState(false);

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
  }, [
    platos,
    busqueda,
    tipo,
    soloFríos,
    soloVeganos,
    soloPastas,
    soloMariscos,
    soloAlcohol,
    soloCarnes,
    soloSandwitches,
  ]);

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
      alert(t("app.priceMustBePositive"));
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
        const actualizado = await actualizarPlato(editando, payload);

        setPlatos((prev) =>
          prev.map((p) =>
            p.id === editando || p._id === editando ? actualizado : p
          )
        );
      } else {
        const creado = await crearPlato(payload);
        setPlatos((prev) => [...prev, creado]);
      }

      limpiarFormulario();
    } catch (err) {
      console.error(err);
      alert(t("app.dishSaveError"));
    }
  };

  const handleEditar = (plato) => {
    const platoId = plato.id || plato._id;
    setEditando(platoId);
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
    if (!confirm(t("app.confirmDeleteDish"))) return;

    try {
      await eliminarPlato(id);
      setPlatos((prev) => prev.filter((p) => p.id !== id && p._id !== id));
    } catch (err) {
      console.error(err);
      alert(t("app.dishDeleteError"));
    }
  };

  const verMacros = async (plato) => {
    try {
      setCargandoMacros(true);
      setMacroData(null);

      const data = await obtenerIANutricion(plato.nombre);
      setMacroData(data);
      setModalAbierto(true);
    } catch (err) {
      console.error(err);
      alert(t("app.macroError"));
    } finally {
      setCargandoMacros(false);
    }
  };

  // === AUTH ===
  const [usuario, setUsuario] = useState(null);

  const handleLogout = () => {
    setToken(null);
    setUsuario(null);
  };

  useEffect(() => {
    const token = getToken();
    if (!token || usuario) return;

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

  // === INTERFAZ PRINCIPAL ===
  return (
    <div className="container app mt-4">
      <header className="header mb-4">
        <h1 className="mb-0">{t("layout.appTitle")}</h1>

        <div
          className="header-controls"
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            marginLeft: "auto",
          }}
        >
          <label className="selector-idioma mb-0">
            {t("layout.languageLabel")}{" "}
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="form-select d-inline-block w-auto"
            >
              <option value="es">{t("layout.spanish")}</option>
              <option value="en">{t("layout.english")}</option>
            </select>
          </label>

          {usuario && (
              <div className="header-user-centered">
                <div className="usuario-conectado">
                  {t("layout.connectedAs")}{" "}
                  <strong>{usuario.nombre || usuario.email}</strong>
                </div>

                <button
                  className="btn-custom btn-small mt-1"
                  onClick={handleLogout}
                >
                  {t("app.logout")}
                </button>
              </div>
            )}
        </div>
      </header>

      <main className="container mt-4">
  <div className="row g-4">

    {/* =========================
        COLUMNA IZQUIERDA
        ========================= */}
    <section className="col-12 col-lg-6">

      {/* --- FILTROS --- */}
      <div className="card p-3 mb-4">
        <h2 className="h5 mb-3">{t("app.filtersTitle")}</h2>

        <input
          type="text"
          className="form-control mb-3"
          placeholder={t("app.searchPlaceholder")}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div className="row gy-2">

          {/* Tipo */}
          <div className="col-12 col-md-6 col-lg-4">
            <label className="w-100">
              {t("app.filterTypeLabel")}
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="form-select mt-1"
              >
                <option value="todos">{t("app.typeAll")}</option>
                <option value="entrada">{t("app.typeStarter")}</option>
                <option value="fondo">{t("app.typeMain")}</option>
                <option value="postre">{t("app.typeDessert")}</option>
                <option value="bebida">{t("app.typeDrink")}</option>
              </select>
            </label>
          </div>

          {/* Checkboxes */}
          <div className="col-6 col-md-4 col-lg-3">
            <label className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={soloFríos}
                onChange={(e) => setSoloFríos(e.target.checked)}
              />
              <span className="form-check-label">{t("app.filterCold")}</span>
            </label>
          </div>

          <div className="col-6 col-md-4 col-lg-3">
            <label className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={soloVeganos}
                onChange={(e) => setSoloVeganos(e.target.checked)}
              />
              <span className="form-check-label">{t("app.filterVegan")}</span>
            </label>
          </div>

          <div className="col-6 col-md-4 col-lg-3">
            <label className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={soloPastas}
                onChange={(e) => setSoloPastas(e.target.checked)}
              />
              <span className="form-check-label">{t("app.filterPasta")}</span>
            </label>
          </div>

          <div className="col-6 col-md-4 col-lg-3">
            <label className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={soloMariscos}
                onChange={(e) => setSoloMariscos(e.target.checked)}
              />
              <span className="form-check-label">{t("app.filterSeafood")}</span>
            </label>
          </div>

          <div className="col-6 col-md-4 col-lg-3">
            <label className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={soloAlcohol}
                onChange={(e) => setSoloAlcohol(e.target.checked)}
              />
              <span className="form-check-label">
                {t("app.filterAlcohol")}
              </span>
            </label>
          </div>

          <div className="col-6 col-md-4 col-lg-3">
            <label className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={soloCarnes}
                onChange={(e) => setSoloCarnes(e.target.checked)}
              />
              <span className="form-check-label">{t("app.filterMeat")}</span>
            </label>
          </div>

          <div className="col-6 col-md-4 col-lg-3">
            <label className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={soloSandwitches}
                onChange={(e) => setSoloSandwitches(e.target.checked)}
              />
              <span className="form-check-label">
                {t("app.filterSandwiches")}
              </span>
            </label>
          </div>

        </div>
      </div>

      {/* --- MENÚ --- */}
      <div className="card p-3">
        <h2 className="h5 mb-3">{t("app.menuTitle")}</h2>

        {cargandoPlatos && <p>{t("app.loadingDishes")}</p>}
        {errorPlatos && (
          <p className="text-danger">{t("app.errorLoadDishes")}</p>
        )}
        {!cargandoPlatos && platosFiltrados.length === 0 && (
          <p>{t("app.noDishesFound")}</p>
        )}

        <div className="row row-cols-1 g-4 lista-platos mt-2">
          {platosFiltrados.map((plato) => {
            const platoId = plato.id || plato._id;
            const abierto = platoActivoId === platoId;

            return (
              <div className="col" key={platoId}>
                <article
                  className={`plato ${abierto ? "plato-abierto" : ""} h-100`}
                  onClick={() =>
                    setPlatoActivoId((prev) =>
                      prev === platoId ? null : platoId
                    )
                  }
                >
                  <div className="plato-contenido d-flex flex-column h-100">
                    <div className="d-flex justify-content-between">
                      <h3 className="h6 mb-1">{plato.nombre}</h3>
                      <p className="precio mb-0">
                        ${plato.precio.toLocaleString("es-CL")}
                      </p>
                    </div>

                    <p className="descripcion mb-2">{plato.descripcion}</p>

                    {abierto &&
                      plato.ingredientes &&
                      plato.ingredientes.length > 0 && (
                        <ul className="ingredientes mb-2">
                          {plato.ingredientes.map((ing, i) => (
                            <li key={i}>{ing}</li>
                          ))}
                        </ul>
                      )}

                    <div
                      className="acciones-plato d-flex flex-column gap-2 mt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        to="/pedidos"
                        className="btn btn-primary btn-sm"
                      >
                        Ir a pedidos
                      </Link>

                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => handleEditar(plato)}
                      >
                        {t("app.edit")}
                      </button>

                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleEliminar(platoId)}
                      >
                        {t("app.delete")}
                      </button>

                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => verMacros(plato)}
                        disabled={cargandoMacros}
                      >
                        {cargandoMacros
                          ? t("app.loading")
                          : t("app.viewMacros")}
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>

    </section>

    {/* =========================
        COLUMNA DERECHA
        ========================= */}
    <section className="col-12 col-lg-6">

      <div className="card p-3">
  <h2 className="h5 mb-3">
    {editando ? t("app.editDishTitle") : t("app.newDishTitle")}
  </h2>

  <form onSubmit={handleSubmit} className="form-plato">

    {/* Nombre */}
    <div className="mb-3">
      <label className="form-label">{t("app.fieldName")}</label>
      <input
        name="nombre"
        value={form.nombre}
        onChange={handleChangeForm}
        required
        className="form-control"
      />
    </div>

    {/* Descripción */}
    <div className="mb-3">
      <label className="form-label">{t("app.fieldDescription")}</label>
      <textarea
        name="descripcion"
        value={form.descripcion}
        onChange={handleChangeForm}
        className="form-control"
      />
    </div>

    {/* Ingredientes & Precio en la misma fila */}
    <div className="row g-3">

      <div className="col-12 col-md-8">
        <label className="form-label">
          {t("app.fieldIngredients")}
        </label>
        <textarea
          name="ingredientesTexto"
          value={form.ingredientesTexto}
          onChange={handleChangeForm}
          placeholder={t("app.ingredientsPlaceholder")}
          className="form-control"
        />
      </div>

      <div className="col-12 col-md-4">
        <label className="form-label">{t("app.fieldPrice")}</label>
        <input
          name="precio"
          type="number"
          min="0"
          value={form.precio}
          onChange={handleChangeForm}
          required
          className="form-control"
        />
      </div>

    </div>

    {/* Tipo */}
    <div className="mt-3 mb-2">
      <label className="form-label">{t("app.fieldType")}</label>
      <select
        name="tipo"
        value={form.tipo}
        onChange={handleChangeForm}
        className="form-select"
      >
        <option value="entrada">{t("app.typeStarter")}</option>
        <option value="fondo">{t("app.typeMain")}</option>
        <option value="postre">{t("app.typeDessert")}</option>
        <option value="bebida">{t("app.typeDrink")}</option>
      </select>
    </div>

    {/* Checkboxes (grid natural de Bootstrap) */}
    <div className="row mt-2 gy-2">

      <div className="col-6">
        <label className="form-check">
          <input
            type="checkbox"
            name="esFrio"
            checked={form.esFrio}
            onChange={handleChangeForm}
            className="form-check-input"
          />
          <span className="form-check-label">{t("app.filterCold")}</span>
        </label>
      </div>

      <div className="col-6">
        <label className="form-check">
          <input
            type="checkbox"
            name="esVegano"
            checked={form.esVegano}
            onChange={handleChangeForm}
            className="form-check-input"
          />
          <span className="form-check-label">{t("app.filterVegan")}</span>
        </label>
      </div>

      <div className="col-6">
        <label className="form-check">
          <input
            type="checkbox"
            name="esPasta"
            checked={form.esPasta}
            onChange={handleChangeForm}
            className="form-check-input"
          />
          <span className="form-check-label">{t("app.filterPasta")}</span>
        </label>
      </div>

      <div className="col-6">
        <label className="form-check">
          <input
            type="checkbox"
            name="esMarisco"
            checked={form.esMarisco}
            onChange={handleChangeForm}
            className="form-check-input"
          />
          <span className="form-check-label">{t("app.filterSeafood")}</span>
        </label>
      </div>

      <div className="col-6">
        <label className="form-check">
          <input
            type="checkbox"
            name="esAlcohol"
            checked={form.esAlcohol}
            onChange={handleChangeForm}
            className="form-check-input"
          />
          <span className="form-check-label">{t("app.filterAlcohol")}</span>
        </label>
      </div>

      <div className="col-6">
        <label className="form-check">
          <input
            type="checkbox"
            name="esCarne"
            checked={form.esCarne}
            onChange={handleChangeForm}
            className="form-check-input"
          />
          <span className="form-check-label">{t("app.filterMeat")}</span>
        </label>
      </div>

      <div className="col-12">
        <label className="form-check">
          <input
            type="checkbox"
            name="esSandwitch"
            checked={form.esSandwitch}
            onChange={handleChangeForm}
            className="form-check-input"
          />
          <span className="form-check-label">
            {t("app.filterSandwiches")}
          </span>
        </label>
      </div>

    </div>

    {/* Botones */}
    <div className="d-flex gap-2 mt-4">
      <button className="btn btn-primary" type="submit">
        {editando ? t("app.formSave") : t("app.formCreate")}
      </button>

      {editando && (
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={limpiarFormulario}
        >
          {t("app.formCancel")}
        </button>
      )}
    </div>

  </form>
</div>

    </section>

  </div>
</main>


      {modalAbierto && macroData && (
        <div
          className="modal-fondo"
          onClick={() => setModalAbierto(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{t("macro.title")}</h2>

            <p>
              <strong>{t("macro.dishLabel")} </strong>
              {macroData.nombre_original}
            </p>
            <p>
              <strong>{t("macro.translationLabel")} </strong>
              {macroData.traduccion}
            </p>

            <h3>{t("macro.totalsTitle")}</h3>
            <div className="macro-totales">
              <p>
                <strong>Calorías:</strong>{" "}
                {macroData.total.calories} kcal
              </p>
              <p>
                <strong>Proteína:</strong>{" "}
                {macroData.total.protein_g} g
              </p>
              <p>
                <strong>Grasas:</strong>{" "}
                {macroData.total.fat_g} g
              </p>
              <p>
                <strong>Carbohidratos:</strong>{" "}
                {macroData.total.carbs_g} g
              </p>
            </div>

            <h3>{t("macro.ingredientsTitle")}</h3>
            <ul className="ingredientes-macro">
              {macroData.ingredientes.map((i, idx) => (
                <li key={idx}>
                  <strong>{i.name}</strong> — {i.weight_g}g
                  <br />
                  {i.calories.toFixed(0)} kcal ·{" "}
                  {i.protein_g.toFixed(1)}g prot ·{" "}
                  {i.fat_g.toFixed(1)}g grasa ·{" "}
                  {i.carbs_g.toFixed(1)}g carb
                </li>
              ))}
            </ul>

            <button
              className="btn btn-secondary cerrar-modal"
              onClick={() => setModalAbierto(false)}
            >
              {t("macro.closeButton")}
            </button>
          </div>
        </div>
      )}

      {cargandoMacros && !modalAbierto && (
        <div className="modal-fondo">
          <div
            className="modal modal-loading"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="spinner" />
            <p>{t("macro.loadingText")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
