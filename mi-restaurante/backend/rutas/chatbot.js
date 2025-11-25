// backend/rutas/chatbot.js
const express = require("express");
const router = express.Router();

// Si tu versión de Node no tuviera fetch (Node >= 18 sí tiene),
// puedes descomentar esto. En Render usas Node 20, así que no es necesario.
// const fetch = global.fetch || ((...args) =>
//   import("node-fetch").then(({ default: fetch }) => fetch(...args))
// );

// POST /api/chatbot
router.post("/", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Falta GEMINI_API_KEY en el backend");
      return res.status(500).json({ mensaje: "Falta GEMINI_API_KEY" });
    }

    const { message, restricciones, hora } = req.body || {};

    const textoUsuario = message || "";
    const textoRestricciones = restricciones || "";
    const textoHora = hora || "";

    const systemPrompt = `
Eres el asistente virtual de un restaurante inteligente.

Objetivo:
- Recomendar platos del menú en base a lo que pida el usuario.
- El menú real lo maneja el frontend, pero asume que hay entradas, fondos, postres y bebidas,
  con opciones veganas, de mariscos, carnes, pastas y sándwiches.

Instrucciones:
- Responde SIEMPRE en español.
- Responde en 1 a 3 frases cortas y claras.
- Si el usuario menciona "vegano", "mariscos", "carne", "postre", "pasta" o "sándwich",
  recomienda 2 o 3 opciones de ese tipo.
- Si menciona una hora (ej: almuerzo, cena, tarde) puedes adaptar el tono de la recomendación.
- NO inventes precios específicos.
- NO hables de calorías ni nutrición.
- NO menciones que estás usando IA ni Gemini.
- No hagas listas demasiado largas, máximo 3 platos sugeridos.

Contexto adicional (texto plano):
- Restricciones o preferencias: "${textoRestricciones}"
- Hora aproximada o contexto temporal: "${textoHora}"

Mensaje del usuario:
"${textoUsuario}"
`;

    // Llamada HTTP al endpoint oficial de Gemini
    const model = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: systemPrompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Error desde Gemini:", response.status, text);
      return res
        .status(500)
        .json({ mensaje: "Error al generar respuesta con Gemini" });
    }

    const data = await response.json();

    const textoRespuesta =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Lo siento, no pude generar una recomendación en este momento.";

    return res.json({ respuesta: textoRespuesta });
  } catch (err) {
    console.error("Error en /api/chatbot:", err);
    return res.status(500).json({ mensaje: "Error interno en el chatbot" });
  }
});

module.exports = router;
