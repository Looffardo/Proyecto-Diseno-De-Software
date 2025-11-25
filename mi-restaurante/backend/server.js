// ================================================================
// =============== IMPORTS (CommonJS, necesarios) =================
// ================================================================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { GoogleGenAI } = require("@google/genai");


const fetch =
  global.fetch ||
  ((...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args)));
// ================================================================
// ===================== CONFIGURACIÓN BASE ========================
// ================================================================
const platosRouter = require("./rutas/platos");
const pedidosRouter = require("./rutas/pedidos");

const app = express();
const PORT = process.env.PORT || 4000;


// MongoDB

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error conectando a MongoDB", err));

app.use(express.json());
app.use(cors());

// Log de requests
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// ================================================================
// ===================== CONFIG GENERAL VARS =======================
// ================================================================
const JWT_SECRET = process.env.JWT_SECRET || "clave-secreta-unsafe";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CALORIE_NINJAS_KEY = process.env.CALORIE_NINJAS_KEY || "";

// Google Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Google OAuth
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Caches
const cacheIA = {};
const cacheMacrosPlato = {};
const cacheMacrosIng = {};

// Users JSON
const USERS_FILE = path.join(__dirname, "users.json");

// ================================================================
// ===================== HELPERS JWT + USERS =======================
// ================================================================
function leerUsuarios() {
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]", "utf-8");
  const data = fs.readFileSync(USERS_FILE, "utf-8");
  if (!data.trim()) return [];
  return JSON.parse(data);
}

function guardarUsuarios(arr) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(arr, null, 2), "utf-8");
}

function generarToken(usuario) {
  const payload = {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ mensaje: "No se envió token" });

  const [, token] = authHeader.split(" ");

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
}

// ================================================================
// ================== HELPER: Gemini → JSON ========================
// ================================================================
async function usarGeminiComoJSON(nombrePlato) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY no configurada en el servidor");
  }

  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
Eres un nutricionista experto. Te daré el nombre de un plato en español.
Debes estimar los ingredientes principales y un peso aproximado en gramos.

RESPONDE SOLO con un JSON VÁLIDO, sin texto adicional, sin comentarios.
Empieza exactamente con "{" y termina exactamente con "}".

Estructura obligatoria:

{
  "english_name": "nombre del plato en inglés",
  "estimated_total_weight_g": 0,
  "ingredients": [
    { "name_en": "ingredient name in english", "estimated_weight_g": 0 }
  ]
}

- "estimated_total_weight_g" es el peso total aproximado del plato (en gramos).
- Cada "estimated_weight_g" también es en gramos.
- Los pesos deben ser números (no strings).
- Los ingredientes deben ser los más representativos (3 a 8 máximo).

Plato: "${nombrePlato}"
`;

  const result = await model.generateContent(prompt);

  const rawText = result.response?.text
    ? result.response.text()
    : String(result.response || "");

  let text = String(rawText).trim();

  // Limpia posible bloque ```json ... ```
  if (text.startsWith("```")) {
    text = text
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Error parseando JSON de Gemini. Texto recibido:\n", text);
    throw new Error("IA_JSON_INVALIDO");
  }
}

// ================================================================
// ======================== RUTAS AUTENTICACIÓN ====================
// ================================================================

// Registro
app.post("/api/auth/register", (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password)
    return res.status(400).json({ mensaje: "Faltan campos" });

  const usuarios = leerUsuarios();
  if (usuarios.find((u) => u.email === email)) {
    return res.status(409).json({ mensaje: "Ese correo ya está registrado" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const nuevoUsuario = {
    id: Date.now().toString(),
    nombre,
    email,
    passwordHash,
  };

  usuarios.push(nuevoUsuario);
  guardarUsuarios(usuarios);

  const token = generarToken(nuevoUsuario);

  return res.status(201).json({
    mensaje: "Usuario registrado",
    token,
    usuario: {
      id: nuevoUsuario.id,
      nombre,
      email,
    },
  });
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  const usuarios = leerUsuarios();
  const usuario = usuarios.find((u) => u.email === email);

  if (!usuario)
    return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });

  const ok = bcrypt.compareSync(password, usuario.passwordHash);
  if (!ok)
    return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });

  const token = generarToken(usuario);

  return res.json({
    mensaje: "Login exitoso",
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
    },
  });
});

// ================================================================
// ========================= RUTA CHATBOT ==========================
// ================================================================
const chatbotRouter = require("./rutas/chatbot");
app.use("/api/chatbot", chatbotRouter);

// ================================================================
// ======================= CHATBOT GEMINI ==========================
// ================================================================
app.post("/api/chat-recomendador", authMiddleware, async (req, res) => {
  try {
    const { mensaje, platos } = req.body;

    if (!mensaje) {
      return res.status(400).json({ mensaje: "Falta el campo 'mensaje'" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ mensaje: "GEMINI_API_KEY no configurada" });
    }

    // Preparamos contexto de platos (solo lo necesario)
    const platosContexto = Array.isArray(platos)
      ? platos.map((p) => ({
          nombre: p.nombre,
          descripcion: p.descripcion,
          tipo: p.tipo,
          esVegano: p.esVegano,
          esMarisco: p.esMarisco,
          esCarne: p.esCarne,
          precio: p.precio,
        }))
      : [];

    const prompt = `
Eres el asistente de un restaurante. 

Tienes esta carta en formato JSON:
${JSON.stringify(platosContexto, null, 2)}

El usuario dirá cosas como:
- "quiero algo vegano"
- "recomiéndame un plato con carne"
- "tengo ganas de mariscos"
- "quiero un postre liviano"
- etc.

Tu tarea:
1. Entender la preferencia del usuario.
2. Elegir 1 a 3 platos de la carta que encajen bien.
3. Responder en español, en 1 a 3 frases naturales, mencionando los nombres exactos de los platos.
4. No inventes platos que no existan en la carta JSON.
5. Si no hay platos que encajen, dilo y ofrece alternativas generales.

Mensaje del usuario: "${mensaje}"
`;

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      process.env.GEMINI_API_KEY;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error("Error Gemini:", data);
      return res
        .status(500)
        .json({ mensaje: "Error al llamar a Gemini para el chatbot" });
    }

    const textoRespuesta =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("") || "Lo siento, no pude generar una recomendación ahora.";

    return res.json({ respuesta: textoRespuesta });
  } catch (err) {
    console.error("Error en /api/chat-recomendador:", err);
    return res
      .status(500)
      .json({ mensaje: "Error interno en el chatbot del restaurante" });
  }
});

// Login con Google
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential)
      return res
        .status(400)
        .json({ mensaje: "Falta credential de Google" });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const nombre = payload.name || "Usuario Google";
    const googleId = payload.sub;

    if (!email)
      return res.status(400).json({ mensaje: "Google no entregó email" });

    const usuarios = leerUsuarios();
    let usuario = usuarios.find((u) => u.email === email);

    if (!usuario) {
      usuario = {
        id: `google-${googleId}`,
        email,
        nombre,
        passwordHash: null,
        viaGoogle: true,
      };
      usuarios.push(usuario);
      guardarUsuarios(usuarios);
    }

    const token = generarToken(usuario);

    return res.json({
      mensaje: "Login con Google exitoso",
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        viaGoogle: true,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensaje: "Error validando token Google" });
  }
});

// Perfil
app.get("/api/auth/profile", authMiddleware, (req, res) => {
  return res.json({
    mensaje: "Perfil",
    usuario: req.user,
  });
});






// ================================================================
// ======================= RUTAS DE PLATOS/PEDIDOS =================
// ================================================================
app.use("/api/platos", platosRouter);
app.use("/api/pedidos", pedidosRouter);

// ================================================================
// =========================== SERVER ON ===========================
// ================================================================
app.listen(PORT, () =>
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
);