// src/Auth.jsx
import { useState } from 'react';
import { apiRequest, setToken } from './ApiClient';
import { GoogleLogin } from '@react-oauth/google';

// === VALIDADORES ===
function validarPassword(password) {
  const tieneMayuscula = /[A-Z]/.test(password);
  const tieneNumero = /[0-9]/.test(password);
  const tieneEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const tieneLargo = password.length >= 8;

  if (!tieneLargo) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!tieneMayuscula) return 'Debe incluir al menos 1 letra mayúscula.';
  if (!tieneNumero) return 'Debe incluir al menos 1 número.';
  if (!tieneEspecial) return 'Debe incluir al menos 1 símbolo especial.';

  return null;
}

function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// ==========================
// COMPONENTE PRINCIPAL
// ==========================
export default function Auth({ onAuth }) {
  const [modo, setModo] = useState('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  // === GOOGLE LOGIN ===
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const credential = credentialResponse.credential;

      const data = await apiRequest('/api/auth/google', {
        method: 'POST',
        body: { credential },
      });

      setToken(data.token);
      onAuth(data.usuario);
    } catch (err) {
      setError('Error al iniciar con Google');
    }
  };

  const handleGoogleError = () => {
    setError('Error al iniciar con Google');
  };

  // === LOGIN / REGISTRO NORMAL ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    // Validación email
    if (!validarEmail(email)) {
      setError('Por favor ingresa un email válido (ej: usuario@dominio.com).');
      setCargando(false);
      return;
    }

    // Validación password solo en registro
    if (modo === 'register') {
      const errorPass = validarPassword(password);
      if (errorPass) {
        setError(errorPass);
        setCargando(false);
        return;
      }
    }

    try {
      const ruta = modo === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        modo === 'login'
          ? { email, password }
          : { nombre, email, password };

      const data = await apiRequest(ruta, {
        method: 'POST',
        body,
      });

      setToken(data.token);
      onAuth(data.usuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // ==========================
  // RENDER
  // ==========================
  return (
    <div className="card" style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>

      {/* BOTONES MODO */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          className="btn secundario"
          type="button"
          onClick={() => {
            setModo('login');
            setNombre('');
            setEmail('');
            setPassword('');
            setError(null);
          }}
        >
          Login
        </button>

        <button
          className="btn secundario"
          type="button"
          onClick={() => {
            setModo('register');
            setNombre('');
            setEmail('');
            setPassword('');
            setError(null);
          }}
        >
          Registrarse
        </button>
      </div>

      {/* FORMULARIO NORMAL */}
      <form onSubmit={handleSubmit} className="form-plato">
        {modo === 'register' && (
          <label>
            Nombre
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </label>
        )}

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button className="btn" type="submit" disabled={cargando}>
          {cargando
            ? 'Procesando...'
            : modo === 'login'
              ? 'Entrar'
              : 'Registrarme'}
        </button>
      </form>

      {/* SECCIÓN GOOGLE */}
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <p>O continuar con Google:</p>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        />
      </div>
    </div>
  );
}
