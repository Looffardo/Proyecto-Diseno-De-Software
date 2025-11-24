// server/index.js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import "dotenv/config";
import { OAuth2Client } from "google-auth-library";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === CONFIG BÁSICA ===
const app = express();
const PORT = 4000;

const JWT_SECRET = process.env.JWT_SECRET || "clave-secreta-unsafe";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CALORIE_NINJAS_KEY = process.env.CALORIE_NINJAS_KEY || "";

// Cliente IA (Gemini)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// === CACHÉS ===

// Cache de respuestas IA completas (traducción + ingredientes + totales) por nombre de plato
const cacheIA = {};

// Cache nutricional por PLATO COMPLETO (ruta /api/nutricion)
const cacheMacrosPlato = {};

// Cache nutricional por INGREDIENTE (ruta /api/ia-nutricion)
const cacheMacrosIng = {};

// === CLIENTE GOOGLE OAUTH ===
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// === MIDDLEWARE ===
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// === "BASE DE DATOS" JSON ===
const USERS_FILE = path.join(__dirname, "users.json");

function leerUsuarios() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]", "utf-8");
  }
  const data = fs.readFileSync(USERS_FILE, "utf-8");
  if (!data.trim()) return [];
  return JSON.parse(data);
}

function guardarUsuarios(usuarios) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2), "utf-8");
}

// === JWT HELPERS ===
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
  if (!authHeader) {
    return res.status(401).json({ mensaje: "No se envió token" });
  }

  const [, token] = authHeader.split(" ");

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
}

// ===================================================================
// ================ FUNCIÓN HELPER: GEMINI → JSON =====================
// ===================================================================

async function usarGeminiComoJSON(prompt) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  let text = response.text;
  if (typeof text === "function") {
    text = response.text();
  }
  text = String(text || "").trim();

  // Por si viene envuelto en ```json ... ```
  if (text.startsWith("```")) {
    text = text
      .replace(/^```json/i, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();
  }

  return JSON.parse(text);
}

// ===================================================================
// ============================ RUTAS AUTH ============================
// ===================================================================

// === Registro ===
app.post("/api/auth/register", (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ mensaje: "Faltan campos" });
  }

  const usuarios = leerUsuarios();
  const yaExiste = usuarios.find((u) => u.email === email);
  if (yaExiste) {
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
      nombre: nuevoUsuario.nombre,
      email: nuevoUsuario.email,
    },
  });
});

// === Login ===
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  const usuarios = leerUsuarios();
  const usuario = usuarios.find((u) => u.email === email);

  if (!usuario) {
    return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });
  }

  const ok = bcrypt.compareSync(password, usuario.passwordHash);
  if (!ok) {
    return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });
  }

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

// === Login con Google ===
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ mensaje: "Falta credential de Google" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const nombre = payload.name || "Usuario Google";
    const googleId = payload.sub;

    if (!email) {
      return res
        .status(400)
        .json({ mensaje: "Google no entregó email válido" });
    }

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
    console.error("Error en /api/auth/google:", err);
    return res.status(500).json({ mensaje: "Error validando token con Google" });
  }
});

// ===================================================================
// ======= RUTA: API SIMPLE NUTRICIÓN (TRADUCCIÓN MANUAL + NINJAS) ====
// ===================================================================

app.get("/api/nutricion", async (req, res) => {
  try {
    const query = req.query.q?.toLowerCase();

    if (!query) {
      return res.status(400).json({ mensaje: "Falta el parámetro q" });
    }

    // Traducciones manuales
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

    // Cache PLATO
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
        method: "GET",
        headers: { "X-Api-Key": CALORIE_NINJAS_KEY },
        // Node 22 tiene timeout global configurable, aqui lo dejamos simple
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res
        .status(500)
        .json({ mensaje: "Error consultando API externa" });
    }

    cacheMacrosPlato[textoEn] = data;

    return res.json(data);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ mensaje: "Timeout o error de conexión con CalorieNinjas" });
  }
});

// ===================================================================
// ==== RUTA: IA NUTRICIÓN (GEMINI + INGREDIENTES + NINJAS + CACHES) ===
// ===================================================================

app.get("/api/ia-nutricion", async (req, res) => {
  try {
    const plato = req.query.q;

    if (!plato) {
      return res.status(400).json({ mensaje: "Falta parámetro q" });
    }

    // CACHE IA por nombre de plato
    if (cacheIA[plato]) {
      console.log("CACHE IA HIT:", plato);
      return res.json(cacheIA[plato]);
    }

    console.log("IA CALL:", plato);

    const prompt = `
Eres un experto en nutrición culinaria.
Devuelve SOLO JSON válido con la estructura:

{
  "english_name": "",
  "estimated_total_weight_g": 0,
  "ingredients": [
    { "name_en": "", "estimated_weight_g": 0 }
  ]
}

Reglas estrictas:
- Traduce el plato de español → inglés correctamente.
- Divide el plato en ingredientes reales típicos de restaurante.
- Estima pesos en gramos (siempre números).
- La respuesta DEBE ser solo JSON.
Plato: "${plato}"
`;

    // 1) Usamos Gemini para obtener ingredientes + pesos estimados
    const ia = await usarGeminiComoJSON(prompt);

    const resultados = [];
    const total = { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 };

    for (const ing of ia.ingredients) {
      const nombreIng = ing.name_en.toLowerCase();
      const peso = ing.estimated_weight_g || 0;

      if (!nombreIng || peso <= 0) continue;

      // 2) Obtener macros base por ingrediente desde caché o CalorieNinjas
      if (!cacheMacrosIng[nombreIng]) {
        const resp = await fetch(
          `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(
            nombreIng
          )}`,
          {
            headers: { "X-Api-Key": CALORIE_NINJAS_KEY },
          }
        );
        const data = await resp.json();

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

      const baseMacros = cacheMacrosIng[nombreIng];
      if (!baseMacros) {
        // No encontramos info nutricional confiable para este ingrediente
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

      // 3) Escalar por el peso estimado (asumiendo base = 100g)
      const factor = peso / 100;

      const calories = baseMacros.calories * factor;
      const protein_g = baseMacros.protein_g * factor;
      const fat_g = baseMacros.fat_g * factor;
      const carbs_g = baseMacros.carbs_g * factor;

      resultados.push({
        name: ing.name_en,
        weight_g: peso,
        calories,
        protein_g,
        fat_g,
        carbs_g,
      });

      total.calories += calories;
      total.protein_g += protein_g;
      total.fat_g += fat_g;
      total.carbs_g += carbs_g;
    }

    const final = {
      nombre_original: plato,
      traduccion: ia.english_name,
      ingredientes: resultados,
      total: {
        calories: Number(total.calories.toFixed(0)),
        protein_g: Number(total.protein_g.toFixed(1)),
        fat_g: Number(total.fat_g.toFixed(1)),
        carbs_g: Number(total.carbs_g.toFixed(1)),
      },
    };

    // Guardar en cache IA
    cacheIA[plato] = final;

    return res.json(final);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ mensaje: "Error procesando IA o nutrición" });
  }
});

// ===================================================================
// ========================== RUTA: PERFIL ============================
// ===================================================================

app.get("/api/auth/profile", authMiddleware, (req, res) => {
  return res.json({
    mensaje: "Perfil",
    usuario: req.user,
  });
});

// ===================================================================
//  SERVER ON
// ===================================================================
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

