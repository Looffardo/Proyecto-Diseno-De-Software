// src/Auth.jsx
import { useState } from 'react';
import { apiRequest, setToken } from './ApiClient';
import { GoogleLogin } from '@react-oauth/google';
import { useI18n } from './i18n/I18nProvider';

// === VALIDADORES ===
// Devuelven "códigos" que luego se traducen con t()
function validarPassword(password) {
  const tieneMayuscula = /[A-Z]/.test(password);
  const tieneNumero = /[0-9]/.test(password);
  const tieneEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const tieneLargo = password.length >= 8;

  if (!tieneLargo) return 'passwordTooShort';
  if (!tieneMayuscula) return 'passwordUpper';
  if (!tieneNumero) return 'passwordNumber';
  if (!tieneEspecial) return 'passwordSpecial';
  return null;
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function Auth({ onAuth }) {
  const { t } = useI18n();

  const [modo, setModo] = useState('login'); // 'login' | 'register'
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError(null);
      setCargando(true);

      const data = await apiRequest('/api/auth/google', {
        method: 'POST',
        body: { credential: credentialResponse.credential },
      });

      setToken(data.token);
      onAuth(data.usuario);
    } catch (err) {
      console.error(err);
      setError(t('auth.googleError') || 'Error al iniciar con Google');
    } finally {
      setCargando(false);
    }
  };

  const handleGoogleError = () => {
    setError(t('auth.googleError') || 'Error al iniciar con Google');
  };

  // === LOGIN / REGISTRO NORMAL ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    // Validación email
    if (!validarEmail(email)) {
      setError(t('auth.invalidEmail'));
      setCargando(false);
      return;
    }

    // Validación password solo en registro
    if (modo === 'register') {
      const codigoError = validarPassword(password);
      if (codigoError) {
        setError(t(`auth.${codigoError}`));
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
      console.error(err);
      setError(err.message || 'Error al autenticar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>
        {modo === 'login'
          ? t('auth.titleLogin')
          : t('auth.titleRegister')}
      </h2>

      <form onSubmit={handleSubmit} className="auth-form">
        {modo === 'register' && (
          <label>
            {t('auth.nameLabel')}
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </label>
        )}

        <label>
          {t('auth.emailLabel')}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          {t('auth.passwordLabel')}
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
              ? t('auth.loginButton')
              : t('auth.registerButton')}
        </button>

        <button
          className="btn secundario"
          type="button"
          onClick={() => {
            setModo(modo === 'login' ? 'register' : 'login');
            setNombre('');
            setPassword('');
            setError(null);
          }}
        >
          {modo === 'login'
            ? t('auth.noAccount')
            : t('auth.haveAccount')}
        </button>
      </form>

      {/* SECCIÓN GOOGLE */}
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <p>{t('auth.orContinueWithGoogle')}</p>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        />
      </div>
    </div>
  );
}

export default Auth;
