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
async function usarGeminiComoJSON(prompt) {
  // Si tu SDK soporta getGenerativeModel:
  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);

  // En muchos SDKs viene como result.response.text()
  const rawText = result.response?.text
    ? result.response.text()
    : (typeof result.text === "function" ? result.text() : String(result.text || ""));

  let text = String(rawText).trim();

  // Limpiar bloques ```json ... ```
  if (text.startsWith("```")) {
    text = text
      .replace(/^```json/i, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Error parseando JSON de Gemini:", text);
    throw new Error("La IA no devolvió JSON válido");
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
// =========================== NUTRICIÓN ============================
// ================================================================

// /api/nutricion
app.get("/api/nutricion", async (req, res) => {
  try {
    const query = req.query.q?.toLowerCase();
    if (!query)
      return res.status(400).json({ mensaje: "Falta parámetro q" });

    const traducciones = {
      "camarones apanados": "breaded shrimp",
      "ostiones a la parmesana": "scallops parmesan",
      "ensalada césar": "caesar salad",
      "ensalada caprese": "caprese salad",
      "crema de zapallo": "pumpkin soup",
      locos: "abalone",
      falafel: "falafel",
      gyosas: "dumplings",
      "hamburguesa clásica": "beef burger",
      "barros luco": "beef cheese sandwich",
      "bistec a lo pobre": "steak with fries",
      "milanesa de pollo napolitana": "chicken milanesa napolitana",
      "bagel de salmón ahumado": "smoked salmon bagel",
    };

    const textoEn = traducciones[query] || query;

    if (cacheMacrosPlato[textoEn]) {
      console.log("CACHE PLATO HIT:", textoEn);
      return res.json(cacheMacrosPlato[textoEn]);
    }

    console.log("API CALL PLATO:", textoEn);

    const response = await fetch(
      `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(
        textoEn
      )}`,
      {
        headers: { "X-Api-Key": CALORIE_NINJAS_KEY },
      }
    );

    const data = await response.json();

    cacheMacrosPlato[textoEn] = data;

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ mensaje: "Error Nutrición" });
  }
});

// ================================================================
// =========================== IA NUTRICIÓN =========================
// ================================================================
app.get("/api/ia-nutricion", async (req, res) => {
  try {
    const plato = req.query.q;
    if (!plato)
      return res.status(400).json({ mensaje: "Falta parámetro q" });

    if (cacheIA[plato]) {
      console.log("CACHE IA HIT:", plato);
      return res.json(cacheIA[plato]);
    }

    console.log("IA CALL:", plato);

    const prompt = `
Eres un experto en nutrición culinaria.
Devuelve SOLO JSON válido con:

{
  "english_name": "",
  "estimated_total_weight_g": 0,
  "ingredients": [
    { "name_en": "", "estimated_weight_g": 0 }
  ]
}

Plato: "${plato}"
`;

    // 📌 LOG ANTES DE LLAMAR A GEMINI
    console.log("Llamando a Gemini con prompt...");

    const ia = await usarGeminiComoJSON(prompt);

    // 📌 LOG DE RESPUESTA
    console.log("Respuesta IA (primeros 300 chars):", JSON.stringify(ia).slice(0, 300));

    if (!ia || typeof ia !== "object") {
      return res.status(500).json({ mensaje: "La IA no entregó un objeto válido" });
    }

    if (!Array.isArray(ia.ingredients) || ia.ingredients.length === 0) {
      return res.status(500).json({
        mensaje: "La IA no entregó ingredientes válidos",
        detalle: ia,
      });
    }

    const resultados = [];
    const total = { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 };

    for (const ing of ia.ingredients) {
      if (!ing || !ing.name_en || !ing.estimated_weight_g) {
        continue;
      }

      const nombreIng = ing.name_en.toLowerCase();
      const peso = ing.estimated_weight_g;

      // 📌 LOG ANTES DE LLAMAR A NINJAS
      console.log("Buscando macros en CalorieNinjas para:", nombreIng);

      // Cache ingrediente
      if (!cacheMacrosIng[nombreIng]) {
        const resp = await fetch(
          `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(
            nombreIng
          )}`,
          {
            headers: { "X-Api-Key": CALORIE_NINJAS_KEY },
          }
        );

        // 📌 LOG STATUS DE RESPUESTA
        console.log("CalorieNinjas status:", resp.status);

        const data = await resp.json();

        // 📌 LOG RESPUESTA PARCIAL
        console.log("Respuesta CalorieNinjas:", JSON.stringify(data).slice(0, 200));

        if (!data.items || data.items.length === 0) {
          cacheMacrosIng[nombreIng] = null;
        } else {
          const base = data.items[0];
          cacheMacrosIng[nombreIng] = {
            calories: base.calories || 0,
            protein_g: base.protein_g || 0,
            fat_g: base.fat_total_g || 0,
            carbs_g: base.carbohydrates_total_g || 0,
          };
        }
      }

      const base = cacheMacrosIng[nombreIng];
      if (!base) {
        resultados.push({
          name: ing.name_en,
          weight_g: peso,
          calories: 0,
          protein_g: 0,
          fat_g: 0,
          carbs_g: 0,
        });
        continue;
      }

      const factor = peso / 100;

      resultados.push({
        name: ing.name_en,
        weight_g: peso,
        calories: base.calories * factor,
        protein_g: base.protein_g * factor,
        fat_g: base.fat_g * factor,
        carbs_g: base.carbs_g * factor,
      });

      total.calories += base.calories * factor;
      total.protein_g += base.protein_g * factor;
      total.fat_g += base.fat_g * factor;
      total.carbs_g += base.carbs_g * factor;
    }

    const final = {
      nombre_original: plato,
      traduccion: ia.english_name,
      ingredientes: resultados,
      total: {
        calories: Math.round(total.calories),
        protein_g: Number(total.protein_g.toFixed(1)),
        fat_g: Number(total.fat_g.toFixed(1)),
        carbs_g: Number(total.carbs_g.toFixed(1)),
      },
    };

    cacheIA[plato] = final;
    return res.json(final);

  } catch (err) {
    console.error("🔥 ERROR EN IA NUTRICIÓN >>>");
    console.error("Mensaje:", err?.message);
    console.error("Stack:", err?.stack);
    console.error("Detalles respuesta API:", err?.response?.data);

    return res.status(500).json({
      mensaje: "Error en IA Nutrición",
      detalle: err?.message,
      apiResponse: err?.response?.data || null,
    });
  }
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