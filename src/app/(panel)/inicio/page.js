// Indica a Next.js que este componente se ejecuta en el navegador (Client Component),
// lo cual es obligatorio para poder usar hooks (useState, useEffect) y leer localStorage.
'use client';

import { useEffect, useState } from 'react';

// Importamos las 5 pantallas de inicio posibles (una por cada rol del sistema).
// El alias '@/' apunta directamente a la carpeta 'src/'.
import InicioConsulta from '@/components/inicio/InicioConsulta';
import InicioGestor from '@/components/inicio/InicioGestor';
import InicioRevisor from '@/components/inicio/InicioRevisor';
//import InicioDecano from '@/components/inicio/InicioDecano';
import InicioAdmin from '@/components/inicio/InicioAdmin';

export default function InicioPage() {
  // Estado donde guardamos el rol del usuario autenticado.
  // Arranca en 'null' porque en el primer instante aún no leímos el navegador.
  const [rol, setRol] = useState(null);

  // useEffect se ejecuta una sola vez apenas la página termina de montarse en el navegador.
  useEffect(() => {
    // Leemos los datos del usuario guardados durante el login en localStorage.
    // Si por algún motivo no existen, usamos '{}' para evitar que JSON.parse falle.
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');

    // Extraemos la propiedad 'rol', la pasamos a minúsculas para evitar problemas de mayúsculas
    // (ej. "Consulta" vs "consulta"), y si no tiene rol asignado asumimos 'consulta' por defecto.
    const rawRol = typeof userData.rol === 'string' ? userData.rol : userData.rol?.nombre || 'consulta';
    setRol(rawRol.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  }, []);

  // Mientras 'rol' sea null (durante la milésima de segundo inicial antes de leer localStorage),
  // no dibujamos nada para evitar que parpadee la pantalla de un rol equivocado.
  if (!rol) return null;

  // Según el rol detectado, renderizamos el componente de inicio que le corresponde al usuario:
  switch (rol) {
    case 'gestion':
      return <InicioGestor />;

    case 'revision':
      return <InicioRevisor />;

    //case 'decano':
      //return <InicioDecano />;

    // Aceptamos las distintas etiquetas que puede devolver la API para Administración.
    case 'administracion':
    case 'administrador':
    case 'admin':
      return <InicioAdmin />;

    // Si es 'consulta' (o cualquier otro valor no contemplado), mostramos la grilla de solo lectura.
    case 'consulta':
    default:
      return <InicioConsulta />;
  }
}