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
    if (!plato) {
      return res.status(400).json({ mensaje: "Falta parámetro q" });
    }

    // ---------- CACHE IA: si ya lo calculamos antes ----------
    if (cacheIA[plato]) {
      console.log("CACHE IA HIT:", plato);
      return res.json(cacheIA[plato]);
    }

    console.log("IA CALL:", plato);

    // ---------- 1) PEDIR A GEMINI INGREDIENTES + GRAMOS ----------
    const prompt = `
Eres nutricionista y chef. Dado el nombre de un plato en ESPAÑOL,
inventa una lista razonable de ingredientes con cantidades estimadas en gramos.

Responde SOLO con JSON válido, sin texto extra ni comentarios, con ESTE formato EXACTO:

{
  "english_name": "traducción corta del nombre del plato al inglés",
  "ingredients": [
    { "name_en": "ingredient name (en inglés)", "estimated_weight_g": 120 },
    { "name_en": "otro ingrediente", "estimated_weight_g": 50 }
  ]
}

Reglas:
- Usa entre 3 y 10 ingredientes.
- "estimated_weight_g" siempre debe ser un número entre 5 y 1000.
- No incluyas texto fuera del JSON.

Plato: "${plato}"
`;

    const ia = await usarGeminiComoJSON(prompt);

    // Si la IA falló o no devolvió bien el objeto, hacemos fallback
    if (
      !ia ||
      typeof ia !== "object" ||
      !Array.isArray(ia.ingredients) ||
      ia.ingredients.length === 0
    ) {
      console.error("IA no entregó ingredientes válidos. Objeto recibido:", ia);

      // Fallback: usamos solo el nombre traducido aproximado
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

      const key = plato.toLowerCase();
      const englishName = traducciones[key] || plato;

      // Llamamos a CalorieNinjas una sola vez para el plato completo
      const resp = await fetch(
        `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(
          englishName
        )}`,
        {
          headers: { "X-Api-Key": CALORIE_NINJAS_KEY },
        }
      );

      if (!resp.ok) {
        console.error("CalorieNinjas ERROR (fallback):", resp.status);
        return res
          .status(500)
          .json({ mensaje: "Error en IA Nutrición (fallback)" });
      }

      const data = await resp.json();
      if (!data.items || data.items.length === 0) {
        return res
          .status(500)
          .json({ mensaje: "CalorieNinjas no entregó resultados" });
      }

      const item = data.items[0];
      const weight = item.serving_size_g || 100;

      const ingrediente = {
        name: englishName,
        weight_g: weight,
        calories: item.calories || 0,
        protein_g: item.protein_g || 0,
        fat_g: item.fat_total_g || 0,
        carbs_g: item.carbohydrates_total_g || 0,
      };

      const total = {
        calories: Math.round(ingrediente.calories),
        protein_g: Number(ingrediente.protein_g.toFixed(1)),
        fat_g: Number(ingrediente.fat_g.toFixed(1)),
        carbs_g: Number(ingrediente.carbs_g.toFixed(1)),
      };

      const resultadoFallback = {
        nombre_original: plato,
        traduccion: englishName,
        ingredientes: [ingrediente],
        total,
      };

      cacheIA[plato] = resultadoFallback;
      return res.json(resultadoFallback);
    }

    // ---------- 2) TENEMOS INGREDIENTES + GRAMOS DE GEMINI ----------
    const englishName = ia.english_name || plato;
    const ingredientesGemini = ia.ingredients;

    const resultados = [];
    const total = { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 };

    for (const ing of ingredientesGemini) {
      if (!ing || !ing.name_en || !ing.estimated_weight_g) continue;

      const nombreIng = String(ing.name_en).toLowerCase();
      const peso = Number(ing.estimated_weight_g);

      if (!peso || peso <= 0) continue;

      // ---------- 2.1) Obtener macros base (por porción) de CalorieNinjas ----------
      if (!cacheMacrosIng[nombreIng]) {
        const resp = await fetch(
          `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(
            nombreIng
          )}`,
          {
            headers: { "X-Api-Key": CALORIE_NINJAS_KEY },
          }
        );

        if (!resp.ok) {
          console.error("CalorieNinjas ERROR ing:", nombreIng, resp.status);
          cacheMacrosIng[nombreIng] = null;
        } else {
          const data = await resp.json();

          if (!data.items || data.items.length === 0) {
            cacheMacrosIng[nombreIng] = null;
          } else {
            const base = data.items[0];
            cacheMacrosIng[nombreIng] = {
              serving_g: base.serving_size_g || 100,
              calories: base.calories || 0,
              protein_g: base.protein_g || 0,
              fat_g: base.fat_total_g || 0,
              carbs_g: base.carbohydrates_total_g || 0,
            };
          }
        }
      }

      const base = cacheMacrosIng[nombreIng];

      // Si no tenemos datos de macros para este ingrediente, lo agregamos con 0s
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

      // ---------- 2.2) Escalar macros según el peso estimado ----------
      const factor = peso / base.serving_g;

      const cals = base.calories * factor;
      const prot = base.protein_g * factor;
      const fat = base.fat_g * factor;
      const carbs = base.carbs_g * factor;

      resultados.push({
        name: ing.name_en,
        weight_g: peso,
        calories: cals,
        protein_g: prot,
        fat_g: fat,
        carbs_g: carbs,
      });

      total.calories += cals;
      total.protein_g += prot;
      total.fat_g += fat;
      total.carbs_g += carbs;
    }

    // Si por alguna razón no quedó ningún ingrediente, devolvemos error controlado
    if (resultados.length === 0) {
      return res
        .status(500)
        .json({ mensaje: "La IA no entregó ingredientes utilizables" });
    }

    const final = {
      nombre_original: plato,
      traduccion: englishName,
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
    console.error("Error en IA Nutrición:", err);
    return res.status(500).json({ mensaje: "Error en IA Nutrición" });
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