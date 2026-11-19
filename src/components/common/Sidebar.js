'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function Sidebar({ user, onLogout }) {
  const pathname = usePathname();
  const [alertasCount, setAlertasCount] = useState(0);

  // Trae la cantidad de alertas sin leer del usuario logueado
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

    const cargarContador = async () => {

      const token = localStorage.getItem('auth_token');
      if (!token) return;

      try {
        // por_pagina=1 para traer lo mínimo: lo que interesa es el campo no_leidas
        const response = await fetch(`${apiUrl}/notificaciones?por_pagina=1`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        setAlertasCount(data.no_leidas ?? 0);
      } catch {
        // Sin conexión: se conserva el último valor mostrado
      }
    };

    const alActualizar = (e) => {
      if (e.detail?.reset) {
        setAlertasCount(0);
      } else if (e.detail?.restar) {
        setAlertasCount((c) => Math.max(0, c - e.detail.restar));
      } else {
        cargarContador(); // evento sin datos: se pide el valor real al servidor
      }
    };

    cargarContador(); // al montar y cada vez que se cambia de pantalla
    const intervalo = setInterval(cargarContador, 60000); // y cada minuto
    window.addEventListener('alertas:actualizadas', alActualizar);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener('alertas:actualizadas', alActualizar);
    };
  }, [pathname]);

  // Normalizamos el rol en minúscula y sin tildes para comparar sin errores
  const rawRol = typeof user?.rol === 'string' ? user.rol : user?.rol?.nombre || 'consulta';
  const rolActual = rawRol
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const esAdministrador = ['administracion', 'administrador', 'admin'].includes(rolActual);
  const puedeVerConvenios = ['revision', 'gestion'].includes(rolActual) || esAdministrador;
  const puedeCrearConvenio = esAdministrador;

  // Orden del menú lateral: Inicio -> Convenios -> Nuevo convenio -> Usuarios -> Estadísticas -> Alertas
  // Consulta: Inicio, Estadísticas, Alertas
  // Revisor: Inicio, Convenios, Estadísticas, Alertas
  // Gestor: Inicio, Convenios, Estadísticas, Alertas
  // Administración: Inicio, Convenios, Nuevo convenio, Usuarios, Estadísticas, Alertas
  const menuItems = [
    { label: 'Inicio', href: '/inicio', visible: true },
    { label: 'Convenios', href: '/convenios', visible: puedeVerConvenios },
    { label: 'Nuevo convenio', href: '/convenios/nuevo', visible: puedeCrearConvenio },
    { label: 'Usuarios', href: '/usuarios', visible: esAdministrador },
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
            <Image
              src="/logo.png"
              alt="Logo"
              width={120}
              height={60}
              style={{ objectFit: 'contain' }}
            />
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
                    <span
                      className="badge rounded-pill bg-danger"
                      style={{ fontSize: '0.7rem' }}
                      aria-label={`${item.badge} alertas sin leer`}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
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
