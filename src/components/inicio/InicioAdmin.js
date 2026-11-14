'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SearchFilters from '@/components/common/SearchFilters';

export default function InicioAdmin() {
  const [tiposInstrumento, setTiposInstrumento] = useState([]);
  const [unidades, setUnidades] = useState([]);

  // Estados de los filtros de búsqueda (el Admin puede filtrar por cualquier estado)
  const [q, setQ] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [estado, setEstado] = useState('');
  const [unidadId, setUnidadId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [pagina, setPagina] = useState(1);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

  const handleLimpiarFiltros = () => {
    setQ('');
    setTipoId('');
    setEstado('');
    setUnidadId('');
    setFechaDesde('');
    setFechaHasta('');
    setPagina(1);
  };

  return (
    <div>
      {/* Título principal de la vista */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="page-title mb-0">Panel de Administración</h1>
        <Link
          href="/convenios/nuevo"
          className="btn btn-sm text-white fw-semibold px-3 py-2"
          style={{
            backgroundColor: 'var(--unlpam-blue-btn)',
            borderRadius: '6px',
            fontSize: '0.82rem',
          }}
        >
          + Nuevo convenio
        </Link>
      </div>

      {/* Barra de Filtros */}
      <SearchFilters
        rol="admin"
        q={q}
        setQ={setQ}
        tipoId={tipoId}
        setTipoId={setTipoId}
        estado={estado}
        setEstado={setEstado}
        unidadId={unidadId}
        setUnidadId={setUnidadId}
        fechaDesde={fechaDesde}
        setFechaDesde={setFechaDesde}
        fechaHasta={fechaHasta}
        setFechaHasta={setFechaHasta}
        tiposInstrumento={tiposInstrumento}
        unidades={unidades}
        onLimpiar={handleLimpiarFiltros}
        onResetPagina={() => setPagina(1)}
      />

      {/* Espacio reservado para el contenido de mañana */}
    </div>
  );
}