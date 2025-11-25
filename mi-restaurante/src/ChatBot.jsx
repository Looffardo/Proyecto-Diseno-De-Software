// src/ChatBot.jsx
import { useState } from "react";
import { apiRequest } from "./ApiClient";

export default function ChatBot({ platos = [] }) {
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mensajes, setMensajes] = useState([
    {
      autor: "bot",
      texto:
        "Hola, soy el asistente del restaurante. Dime qué te gustaría comer (vegano, carne, mariscos, postre, etc.) y te recomiendo platos de la carta.",
    },
  ]);
  const [cargando, setCargando] = useState(false);

  const handleEnviar = async (e) => {
    e.preventDefault();
    const trim = mensaje.trim();
    if (!trim || cargando) return;

    // Añadimos el mensaje del usuario al chat
    setMensajes((prev) => [...prev, { autor: "user", texto: trim }]);
    setMensaje("");
    setCargando(true);

    try {
      const data = await apiRequest("/api/chat-recomendador", {
        method: "POST",
        body: {
          mensaje: trim,
          platos, // le mandamos los platos al backend como contexto
        },
      });

      const respuesta = data.respuesta || "No pude generar una respuesta ahora.";
      setMensajes((prev) => [...prev, { autor: "bot", texto: respuesta }]);
    } catch (err) {
      console.error(err);
      setMensajes((prev) => [
        ...prev,
        {
          autor: "bot",
          texto:
            "Lo siento, hubo un problema al generar la recomendación. Intenta nuevamente en unos segundos.",
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  // === ESTILOS INLINE (para asegurarnos que el botón sea realmente flotante) ===
  const fabStyle = {
    position: "fixed",
    right: "1.5rem",
    bottom: "1.5rem",
    width: "56px",
    height: "56px",
    borderRadius: "999px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "1.5rem",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  };

  const windowStyle = {
    position: "fixed",
    right: "1.5rem",
    bottom: "5.5rem",
    width: "320px",
    maxHeight: "420px",
    background: "#ffffff",
    borderRadius: "1rem",
    boxShadow: "0 18px 36px rgba(15, 23, 42, 0.35)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 9998,
  };

  const headerStyle = {
    padding: "0.6rem 0.9rem",
    background: "#1a365d",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "0.9rem",
  };

  const closeBtnStyle = {
    background: "transparent",
    border: "none",
    color: "#e2e8f0",
    fontSize: "1.2rem",
    cursor: "pointer",
  };

  const messagesStyle = {
    flex: 1,
    padding: "0.6rem 0.7rem",
    overflowY: "auto",
    background: "#f8fafc",
    fontSize: "0.85rem",
  };

  const msgCommon = {
    padding: "0.45rem 0.6rem",
    borderRadius: "0.6rem",
    marginBottom: "0.35rem",
    maxWidth: "90%",
  };

  const msgBot = {
    ...msgCommon,
    background: "#e2e8f0",
    alignSelf: "flex-start",
  };

  const msgUser = {
    ...msgCommon,
    background: "#2563eb",
    color: "#ffffff",
    marginLeft: "auto",
  };

  const inputRowStyle = {
    display: "flex",
    borderTop: "1px solid #e2e8f0",
  };

  const inputStyle = {
    flex: 1,
    border: "none",
    padding: "0.5rem 0.6rem",
    fontSize: "0.85rem",
  };

  const sendBtnStyle = {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "0.5rem 0.8rem",
    fontSize: "0.85rem",
    cursor: "pointer",
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        type="button"
        style={fabStyle}
        onClick={() => setAbierto((v) => !v)}
      >
        💬
      </button>

      {/* Ventana del chat */}
      {abierto && (
        <div style={windowStyle}>
          <header style={headerStyle}>
            <strong>Asistente de platos</strong>
            <button
              type="button"
              style={closeBtnStyle}
              onClick={() => setAbierto(false)}
            >
              ×
            </button>
          </header>

          <div style={messagesStyle}>
            {mensajes.map((m, i) => (
              <div
                key={i}
                style={m.autor === "bot" ? msgBot : msgUser}
              >
                {m.texto}
              </div>
            ))}
            {cargando && (
              <div style={msgBot}>Pensando una recomendación...</div>
            )}
          </div>

          <form style={inputRowStyle} onSubmit={handleEnviar}>
            <input
              type="text"
              placeholder="Escribe tu mensaje..."
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              style={inputStyle}
              disabled={cargando}
            />
            <button type="submit" style={sendBtnStyle} disabled={cargando}>
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}
