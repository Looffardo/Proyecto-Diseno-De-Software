// server/index.js
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { OAuth2Client } from 'google-auth-library';   // ← AGREGADO

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === CONFIG BÁSICA ===
const app = express();
const PORT = 4000;

// OJO: en serio en producción esto debe ir en .env
const JWT_SECRET = process.env.JWT_SECRET || 'donpolloreydelmundoblablablableblebleblublublu';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";   // ← AGREGADO

// Cliente OAuth de Google
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);       // ← AGREGADO

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Vite por defecto
  credentials: true,
}));
app.use(express.json());

// === "BASE DE DATOS" EN JSON ===
const USERS_FILE = path.join(__dirname, 'users.json');

function leerUsuarios() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]', 'utf-8');
  }
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  if (!data.trim()) return [];
  return JSON.parse(data);
}

function guardarUsuarios(usuarios) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2), 'utf-8');
}

// === HELPERS JWT ===
function generarToken(usuario) {
  const payload = {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ mensaje: 'No se envió token' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
}

// === RUTAS ===

// Registro
app.post('/api/auth/register', (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ mensaje: 'Faltan campos' });
  }

  const usuarios = leerUsuarios();
  const yaExiste = usuarios.find(u => u.email === email);
  if (yaExiste) {
    return res.status(409).json({ mensaje: 'Ese correo ya está registrado' });
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
    mensaje: 'Usuario registrado',
    token,
    usuario: {
      id: nuevoUsuario.id,
      nombre: nuevoUsuario.nombre,
      email: nuevoUsuario.email,
    },
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  const usuarios = leerUsuarios();
  const usuario = usuarios.find(u => u.email === email);

  if (!usuario) {
    return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
  }

  const ok = bcrypt.compareSync(password, usuario.passwordHash);
  if (!ok) {
    return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
  }

  const token = generarToken(usuario);

  return res.json({
    mensaje: 'Login exitoso',
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
    },
  });
});

// === GOOGLE LOGIN (SSO) ===
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ mensaje: 'Falta credential de Google' });
    }

    // Verificar token de Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const nombre = payload.name || payload.given_name || "Usuario Google";
    const googleId = payload.sub;

    if (!email) {
      return res.status(400).json({ mensaje: 'Google no entregó email válido' });
    }

    // Buscar usuario o crearlo
    const usuarios = leerUsuarios();
    let usuario = usuarios.find(u => u.email === email);

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
      mensaje: 'Login con Google exitoso',
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        viaGoogle: true,
      },
    });

  } catch (err) {
    console.error('Error en /api/auth/google:', err);
    return res.status(500).json({ mensaje: 'Error validando token con Google' });
  }
});

// Ruta protegida de ejemplo
app.get('/api/auth/profile', authMiddleware, (req, res) => {
  return res.json({
    mensaje: 'Perfil',
    usuario: req.user,
  });
});

app.listen(PORT, () => {
  console.log(`Servidor auth escuchando en http://localhost:${PORT}`);
});
