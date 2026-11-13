// Componente cliente porque lee localStorage, la ruta actual y maneja el cierre de sesión
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function PanelLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  // Estado para guardar los datos del usuario logueado (nombre y rol)
  const [user, setUser] = useState({ name: 'Usuario', rol: 'consulta' });
  const [alertasCount, setAlertasCount] = useState(2); // Contador de alertas pendientes

  useEffect(() => {
    // Verificamos si existe el token de Sanctum; si no, redirigimos al login
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/');
      return;
    }

    // Cargamos los datos del usuario si fueron guardados al iniciar sesión
    const storedUser = localStorage.getItem('user_data');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error leyendo user_data', e);
      }
    }
  }, [router]);

  // Función para cerrar sesión en la API de Laravel y limpiar el navegador
  const handleLogout = async () => {
    const token = localStorage.getItem('auth_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

    try {
      await fetch(`${apiUrl}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
    } catch (err) {
      console.error('Error al cerrar sesión en el servidor:', err);
    } finally {
      // Borramos siempre el token local y volvemos al login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      router.push('/');
    }
  };

  // Normalizamos el rol en minúscula para comparar sin errores
  const rolActual = (user.rol || 'consulta').toLowerCase();

  // Definimos qué enlaces ve cada rol en el menú lateral
  const menuItems = [
    { label: 'Inicio', href: '/inicio', visible: true },
    // Para el rol 'consulta', Inicio ya muestra los convenios firmados, por eso ocultamos 'Convenios' y 'Estadísticas'
    { label: 'Convenios', href: '/convenios', visible: rolActual !== 'consulta' },
    { label: 'Estadísticas', href: '/estadisticas', visible: rolActual !== 'consulta' },
    { label: 'Alertas', href: '/alertas', badge: alertasCount, visible: true },
  ];

  // Formateamos el nombre del rol con mayúscula inicial para mostrar arriba a la derecha
  const rolFormateado = rolActual.charAt(0).toUpperCase() + rolActual.slice(1);

  return (
    <div className="d-flex vh-100 overflow-hidden">
      {/* Barra Lateral Izquierda (Sidebar) */}
      <aside className="sidebar-panel d-flex flex-column justify-content-between p-3 text-white">
        <div>
          {/* Encabezado con Logo y Título del Sistema */}
          <div className="d-flex align-items-center gap-2 px-1 py-2 mb-4">
            <div className="sidebar-logo-box d-flex align-items-center justify-content-center flex-shrink-0">
              LOGO
            </div>
            <div style={{ lineHeight: '1.2', fontSize: '0.85rem' }} className="fw-bold">
              Gestión de<br />Convenios
            </div>
          </div>

          {/* Navegación filtrada según el rol */}
          <nav className="d-flex flex-column gap-1">
            {menuItems
              .filter((item) => item.visible)
              .map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    <span>{item.label}</span>
                    {item.badge > 0 && (
                      <span className="badge rounded-pill bg-danger" style={{ fontSize: '0.7rem' }}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
          </nav>
        </div>

        {/* Botón inferior para Cerrar Sesión */}
        <div className="pt-3 border-top border-secondary border-opacity-25">
          <button
            onClick={handleLogout}
            className="btn btn-outline-light btn-sm w-100 text-start d-flex align-items-center justify-content-between px-3 py-2"
            style={{ fontSize: '0.84rem', borderColor: 'rgba(255,255,255,0.2)' }}
          >
            <span>Cerrar sesión</span>
            <span>↪</span>
          </button>
        </div>
      </aside>

      {/* Contenedor Derecho: Barra superior de usuario + Contenido de cada pantalla */}
      <div className="flex-grow-1 d-flex flex-column overflow-auto" style={{ backgroundColor: 'var(--unlpam-cream)' }}>
        {/* Barra Superior con datos del usuario logueado */}
        <header className="py-2 px-4 border-bottom d-flex justify-content-end align-items-center" style={{ borderColor: '#e6e3dc' }}>
          <div className="text-end" style={{ lineHeight: '1.25' }}>
            <div className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>
              {user.name}
            </div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
              {rolFormateado} · Facultad de Ingeniería
            </div>
          </div>
        </header>

        {/* Contenido dinámico de la página */}
        <main className="py-3 px-4 flex-grow-1">
          {children}
        </main>
      </div>
    </div>
  );
}