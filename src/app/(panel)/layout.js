'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/common/Sidebar';
import Header from '@/components/common/Header';

export default function PanelLayout({ children }) {
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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore browser state after hydration.
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

  return (
    <div className="d-flex vh-100 overflow-hidden">
      {/* Barra Lateral Izquierda (Sidebar) */}
      <Sidebar
        user={user}
        alertasCount={alertasCount}
        onLogout={handleLogout}
      />

      {/* Contenedor Derecho: Barra superior de usuario + Contenido de cada pantalla */}
      <div
        className="flex-grow-1 d-flex flex-column overflow-auto"
        style={{ backgroundColor: 'var(--unlpam-cream)' }}
      >
        <Header user={user} />

        {/* Contenido dinámico de la página */}
        <main className="py-3 px-4 flex-grow-1">
          {children}
        </main>
      </div>
    </div>
  );
}