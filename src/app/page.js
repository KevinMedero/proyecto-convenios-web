// Indica a Next.js que este componente se ejecuta en el navegador (permite usar estados y eventos)
'use client';

// Importamos useState para guardar los datos del formulario y useRouter para cambiar de pantalla
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  // Inicializamos el enrutador para redirigir al usuario cuando inicie sesión
  const router = useRouter();

  // Estados reactivos para controlar los campos de texto, mensajes de error y estado de carga
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Función que se dispara al enviar el formulario (botón "Ingresar")
  const handleSubmit = async (e) => {
    // Evita que el navegador recargue toda la página al enviar el formulario
    e.preventDefault();
    
    // Limpiamos errores previos y activamos el estado de carga para bloquear doble clic
    setError('');
    setLoading(true);

    try {
      // Obtenemos la URL base de la API de Laravel desde las variables de entorno (o localhost por defecto)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

      // Hacemos la petición HTTP POST al endpoint /login de Laravel
      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Indicamos que enviamos datos en formato JSON
          'Accept': 'application/json',       // Pedimos que Laravel responda siempre en JSON (no HTML)
        },
        // Convertimos el estado de email y password a texto JSON
        body: JSON.stringify({
          email,
          password,
        }),
      });

      // Convertimos la respuesta recibida de Laravel en un objeto JavaScript
      const data = await response.json();

      // Si el código HTTP no es exitoso (ej. 422 por credenciales inválidas o 500)
      if (!response.ok) {
        // Extraemos el mensaje de validación de Laravel (errors.email[0]) o usamos uno genérico
        const errorMsg =
          data.errors?.email?.[0] ||
          data.message ||
          'Credenciales incorrectas.';
        // Lanzamos el error para capturarlo en el bloque catch
        throw new Error(errorMsg);
      }

      // Si el login fue exitoso, guardamos el token de Laravel Sanctum en el almacenamiento local del navegador
      localStorage.setItem('auth_token', data.token);
      
      // Si el backend también envía los datos del usuario (como rol o nombre), los guardamos como texto JSON
      if (data.user) {
        localStorage.setItem('user_data', JSON.stringify(data.user));
      }

      // Redirigimos al usuario hacia la pantalla principal del sistema
      router.push('/inicio');
    } catch (err) {
      // Mostramos el mensaje de error en pantalla si falló la conexión o las credenciales
      setError(err.message);
    } finally {
      // Pase lo que pase, desactivamos el estado de carga para volver a habilitar el botón
      setLoading(false);
    }
  };

  return (
    // Contenedor principal de Bootstrap que ocupa el 100% del alto de la pantalla (min-vh-100)
    <main className="container-fluid p-0 min-vh-100 d-flex">
      {/* Fila de Bootstrap sin márgenes laterales (g-0) dividida en dos columnas */}
      <div className="row g-0 flex-grow-1 w-100">
        
        {/* Columna Izquierda (50% en pantallas medianas/grandes): Panel institucional azul oscuro */}
        <section className="col-12 col-md-6 login-left-panel d-flex flex-column justify-content-center px-4 px-md-5 py-5 text-white">
          <div className="ms-md-4" style={{ maxWidth: '440px' }}>
            {/* Recuadro blanco para el logotipo institucional */}
            <div className="login-logo-box d-flex align-items-center justify-content-center mb-4 shadow-sm">
              LOGO
            </div>

            {/* Título principal del sistema */}
            <h1 className="fw-bold mb-3" style={{ fontSize: '2.15rem', lineHeight: '1.2' }}>
              Sistema de Gestión de Convenios
            </h1>

            {/* Subtítulo con la pertenencia académica */}
            <p className="mb-0" style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: '1.5' }}>
              Universidad Nacional de La Pampa · Facultad de Ingeniería
            </p>
          </div>
        </section>

        {/* Columna Derecha (50% en pantallas medianas/grandes): Fondo crema con tarjeta centrada */}
        <section className="col-12 col-md-6 login-right-panel d-flex align-items-center justify-content-center p-4">
          {/* Tarjeta blanca del formulario con sombra suave */}
          <div className="login-card shadow-sm">
            <h2 className="login-title mb-1">Iniciar sesión</h2>
            <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>
              Ingresá con tu cuenta institucional.
            </p>

            {/* Renderizado condicional: solo muestra la alerta roja si existe un mensaje en el estado 'error' */}
            {error && (
              <div className="alert alert-danger py-2 px-3 small" role="alert">
                {error}
              </div>
            )}

            {/* Formulario controlado por React mediante la función handleSubmit */}
            <form onSubmit={handleSubmit}>
              {/* Campo de correo electrónico */}
              <div className="mb-3">
                <label htmlFor="email" className="form-label fw-semibold text-dark" style={{ fontSize: '0.82rem' }}>
                  Usuario o correo
                </label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  placeholder="nombre@unlpam.edu.ar"
                  value={email}                                // Vincula el valor del input al estado 'email'
                  onChange={(e) => setEmail(e.target.value)}   // Actualiza el estado cada vez que el usuario escribe
                  required                                     // Valida que no esté vacío antes de enviar
                  disabled={loading}                           // Bloquea el campo mientras se procesa la petición
                />
              </div>

              {/* Campo de contraseña */}
              <div className="mb-4">
                <label htmlFor="password" className="form-label fw-semibold text-dark" style={{ fontSize: '0.82rem' }}>
                  Contraseña
                </label>
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  placeholder="Tu contraseña"
                  value={password}                                // Vincula el valor del input al estado 'password'
                  onChange={(e) => setPassword(e.target.value)}   // Actualiza el estado al escribir
                  required
                  disabled={loading}
                />
              </div>

              {/* Botón de envío que cambia su texto dinámicamente según el estado 'loading' */}
              <button
                type="submit"
                className="btn btn-unlpam w-100 mb-3"
                disabled={loading}
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>

            {/* Pie informativo de la tarjeta */}
            <div className="text-center">
              <p className="text-muted mb-3" style={{ fontSize: '0.78rem' }}>
                ¿Olvidaste tu contraseña? Contactá al administrador.
              </p>
              <hr className="my-2 text-muted opacity-25" />
              <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.75rem' }}>
                Acceso restringido a personal autorizado.
              </p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}