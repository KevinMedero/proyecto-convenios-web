'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar({ user, alertasCount = 0, onLogout }) {
  const pathname = usePathname();

  // Normalizamos el rol en minúscula y sin tildes para comparar sin errores
  const rolActual = (user?.rol || 'consulta')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const puedeVerConvenios = ['revision', 'gestion', 'administracion'].includes(rolActual);
  const puedeCrearConvenio = ['gestion', 'administracion'].includes(rolActual);

  // Orden del menú lateral: Inicio -> Convenios -> Nuevo convenio -> Estadísticas -> Alertas
  // Consulta: Inicio, Estadísticas, Alertas
  // Revisor: Inicio, Convenios, Estadísticas, Alertas
  // Gestor y Administrador: Inicio, Convenios, Nuevo convenio, Estadísticas, Alertas  
  const menuItems = [
    { label: 'Inicio', href: '/inicio', visible: true },
    { label: 'Convenios', href: '/convenios', visible: puedeVerConvenios },
    { label: 'Nuevo convenio', href: '/convenios/nuevo', visible: puedeCrearConvenio },
    { label: 'Estadísticas', href: '/estadisticas', visible: true },
    { label: 'Alertas', href: '/alertas', badge: alertasCount, visible: true },
  ];

  // Marca activo el enlace correspondiente evitando colisiones entre /inicio, /convenios y /convenios/nuevo
  const esActivo = (href) => {
    if (href === '/inicio') {
      if (puedeVerConvenios) {
        return pathname === '/inicio';
      }
      // Para Consulta (que no ve el ítem "Convenios"), la ficha /convenios/[id] sigue resaltando Inicio
      return pathname === '/inicio' || pathname.startsWith('/convenios/');
    }

    if (href === '/convenios') {
      return (
        pathname === '/convenios' ||
        (pathname.startsWith('/convenios/') && pathname !== '/convenios/nuevo')
      );
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
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
              const isActive = esActivo(item.href);
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
          type="button"
          onClick={onLogout}
          className="btn btn-outline-light btn-sm w-100 text-start d-flex align-items-center justify-content-between px-3 py-2"
          style={{ fontSize: '0.84rem', borderColor: 'rgba(255,255,255,0.2)' }}
        >
          <span>Cerrar sesión</span>
          <span>↪</span>
        </button>
      </div>
    </aside>
  );
}