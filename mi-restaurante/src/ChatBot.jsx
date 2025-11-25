import { useState } from "react";
import { apiRequest } from "./ApiClient";
import "./chatbot.css";

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hola 👋 ¿En qué puedo ayudarte hoy?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = { from: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await apiRequest("/api/chatbot", {
        method: "POST",
        body: { message: userMessage.text },
      });

      setMessages((prev) => [...prev, { from: "bot", text: res.reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "Lo siento, hubo un error procesando tu consulta." }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Botón flotante */}
      <button className="chatbot-button" onClick={() => setOpen(!open)}>
        💬
      </button>

      {/* Ventana del chat */}
      {open && (
        <div className="chatbot-window">
          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chatbot-msg ${msg.from === "user" ? "user" : "bot"}`}
              >
                {msg.text}
              </div>
            ))}

            {loading && <div className="chatbot-msg bot">Pensando...</div>}
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              value={input}
              placeholder="Escribe tu mensaje..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Enviar</button>
          </div>
        </div>
      )}
    </>
  );
}
