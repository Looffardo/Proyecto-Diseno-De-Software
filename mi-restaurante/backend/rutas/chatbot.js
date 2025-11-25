const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Plato = require("../modelos/Plato");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/", async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) {
      return res.status(400).json({ error: "Falta campo 'message'" });
    }

    // Obtener platos desde MongoDB
    const platos = await Plato.find().lean();

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
Eres un asistente experto en restaurantes.
Tu tarea: recomendar platos del menú según lo que pida el usuario.

MENÚ DISPONIBLE:
${platos.map(p =>
      `• ${p.nombre}: ${p.descripcion}. Tipo: ${p.tipo}. Precio: ${p.precio} CLP.`
    ).join("\n")}

REGLAS:
- Recomienda entre 1 y 3 platos.
- Explica brevemente por qué.
- Responde SOLO en texto plano.
- No inventes platos que no estén en la lista.
- Si no encuentras coincidencias, sugiere alternativas parecidas.

Mensaje del usuario:
"${userMessage}"
`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    return res.json({ reply });

  } catch (err) {
    console.error("ERROR CHATBOT:", err);
    return res.status(500).json({ error: "Error generando respuesta del chatbot" });
  }
});

module.exports = router;
