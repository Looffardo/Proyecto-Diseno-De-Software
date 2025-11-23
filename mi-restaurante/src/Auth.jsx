// src/Auth.jsx
import { useState } from 'react';
import { apiRequest, setToken } from './ApiClient';

export default function Auth({ onAuth }) {
  const [modo, setModo] = useState('login'); // 'login' | 'register'
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const path = modo === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        modo === 'login'
          ? { email, password }
          : { nombre, email, password };

      const data = await apiRequest(path, {
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

  return (
    <div className="card" style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>

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
    </div>
  );
}
