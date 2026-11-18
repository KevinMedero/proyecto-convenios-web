'use client';

import InicioGestor from '@/components/inicio/InicioGestor';

// Es la misma interfaz de Gestor pero agregando la funcionalidad de hacer Nuevos Convenios y
// en el filtro de busqueda se puede buscar convenios por todos los estados (incluido En Revision)
export default function InicioAdmin() {
  return <InicioGestor modoAdministrador />;
}