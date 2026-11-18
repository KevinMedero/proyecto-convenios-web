'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SearchFilters from '@/components/common/SearchFilters';
import Pagination from '@/components/common/Pagination';
import ConvenioActionCard from '@/components/common/ConvenioActionCard';

export default function InicioRevisor() {
  // Estados principales de datos, catálogos y paginación
  const [convenios, setConvenios] = useState([]);
  const [tiposInstrumento, setTiposInstrumento] = useState([]);
  const [ultimosVistos, setUltimosVistos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [paginacion, setPaginacion] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados de los filtros de búsqueda (el estado está fijo en 'revision' para el rol Revisor)
  const [q, setQ] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [unidadId, setUnidadId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [pagina, setPagina] = useState(1);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

  // Carga el historial local de últimos convenios vistos desde localStorage
  useEffect(() => {
    const vistosGuardados = JSON.parse(localStorage.getItem('ultimos_convenios_vistos') || '[]');
    if (vistosGuardados.length > 0) {
      setUltimosVistos(vistosGuardados);
    } else {
      setUltimosVistos([
        { id: 1, codigo: 'CONV-2025-001', titulo: 'Marco de colaboración · Universidad Ejemplo', cuando: 'Ayer' },
        { id: 2, codigo: 'CONV-2025-007', titulo: 'Práctica profesional supervisada', cuando: 'Hace 3 días' },
      ]);
    }
  }, []);

  // Carga los catálogos de tipos de instrumento y unidades para los selectores
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };

    Promise.all([
      fetch(`${apiUrl}/tipos-instrumento`, { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${apiUrl}/unidades`, { headers }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([tiposData, unidadesData]) => {
        setTiposInstrumento(Array.isArray(tiposData) ? tiposData : tiposData.data || []);
        setUnidades(Array.isArray(unidadesData) ? unidadesData : unidadesData.data || []);
      })
      .catch((err) => console.error('Error cargando catálogos:', err));
  }, [apiUrl]);

  // Consulta los convenios en estado 'revision' aplicando los filtros activos y la paginación
  useEffect(() => {
    const fetchConvenios = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('auth_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

      try {
        const baseParams = new URLSearchParams();
        baseParams.append('estado', 'revision');
        if (q.trim()) baseParams.append('q', q.trim());
        if (tipoId) baseParams.append('tipo_instrumento_id', tipoId);
        if (fechaDesde) baseParams.append('fecha_desde', fechaDesde);
        if (fechaHasta) baseParams.append('fecha_hasta', fechaHasta);

        // CASO A: Sin filtro de unidad -> paginación directa desde la API
        if (!unidadId) {
          baseParams.append('page', pagina);
          const response = await fetch(`${apiUrl}/convenios?${baseParams.toString()}`, { headers });
          if (!response.ok) throw new Error('No se pudieron cargar los convenios.');

          const result = await response.json();
          setConvenios(result.data || []);
          setPaginacion({
            current_page: result.current_page || 1,
            last_page: result.last_page || 1,
            total: result.total || 0,
            from: result.from || 0,
            to: result.to || 0,
          });
          return;
        }

        // CASO B: Con filtro de unidad -> traemos en lotes de 50 y filtramos en el cliente
        const acumulado = [];
        let pagActual = 1;
        let ultimaPag = 1;

        do {
          const p = new URLSearchParams(baseParams);
          p.append('por_pagina', '50');
          p.append('page', pagActual);

          const res = await fetch(`${apiUrl}/convenios?${p.toString()}`, { headers });
          if (!res.ok) throw new Error('No se pudieron cargar los convenios.');

          const json = await res.json();
          acumulado.push(...(json.data || []));
          ultimaPag = json.last_page || 1;
          pagActual += 1;
        } while (pagActual <= ultimaPag && pagActual <= 50);

        const filtradosPorUnidad = acumulado.filter((c) => {
          const unidadDirecta = String(c.unidad_responsable_id ?? c.unidad?.id ?? '');
          const enRepresentantes = (c.representantes || []).some(
            (r) => String(r.unidad_responsable_id ?? '') === String(unidadId)
          );
          return unidadDirecta === String(unidadId) || enRepresentantes;
        });

        const porPagina = 10;
        const total = filtradosPorUnidad.length;
        const lastPage = Math.max(1, Math.ceil(total / porPagina));
        const currentPage = Math.min(pagina, lastPage);
        const inicio = (currentPage - 1) * porPagina;
        const slice = filtradosPorUnidad.slice(inicio, inicio + porPagina);

        setConvenios(slice);
        setPaginacion({
          current_page: currentPage,
          last_page: lastPage,
          total,
          from: total === 0 ? 0 : inicio + 1,
          to: inicio + slice.length,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConvenios();
  }, [apiUrl, q, tipoId, unidadId, fechaDesde, fechaHasta, pagina]);

  // Restablece todos los filtros y vuelve a la primera página
  const handleLimpiarFiltros = () => {
    setQ('');
    setTipoId('');
    setUnidadId('');
    setFechaDesde('');
    setFechaHasta('');
    setPagina(1);
  };

  // Calcula el color de borde y la etiqueta de urgencia según reenvíos o días en revisión
  const obtenerEstiloUrgencia = (conv) => {
    const historial = conv.historial_estados || [];
    const vecesEnRevision = historial.filter((h) => h.estado_nuevo === 'revision').length;

    // Prioridad amarilla: el convenio fue devuelto y reenviado a revisión
    if (vecesEnRevision > 1) {
      return {
        bordeColor: '#eab308',
        badgeBg: '#fef3c7',
        badgeColor: '#92400e',
        texto: '• Reenviado tras corrección',
      };
    }

    // Calcula los días transcurridos desde el último ingreso a revisión
    const ultimoPasoRevision = [...historial].reverse().find((h) => h.estado_nuevo === 'revision');
    const fechaBase = ultimoPasoRevision?.fecha_cambio || conv.fecha_creacion;
    const dias = fechaBase
      ? Math.max(0, Math.floor((new Date() - new Date(fechaBase)) / (1000 * 60 * 60 * 24)))
      : 0;

    // Prioridad roja: lleva 15 días o más esperando revisión
    if (dias >= 15) {
      return {
        bordeColor: '#b91c1c',
        badgeBg: '#fee2e2',
        badgeColor: '#991b1b',
        texto: `▲ En revisión hace ${dias} días`,
      };
    }

    // Prioridad normal (gris): ingresado recientemente
    return {
      bordeColor: '#d1d5db',
      badgeBg: '#e5e7eb',
      badgeColor: '#374151',
      texto: dias === 0 ? '• Ingresado hoy' : `• Ingresado hace ${dias} ${dias === 1 ? 'día' : 'días'}`,
    };
  };

  // Guarda el convenio seleccionado al inicio de la lista de recientes (máximo 4 ítems)
  const registrarVisto = (conv) => {
    const actuales = JSON.parse(localStorage.getItem('ultimos_convenios_vistos') || '[]');
    const filtrados = actuales.filter((item) => item.id !== conv.id);
    const actualizado = [
      { id: conv.id, codigo: conv.codigo, titulo: conv.titulo, cuando: 'Hoy' },
      ...filtrados,
    ].slice(0, 4);
    localStorage.setItem('ultimos_convenios_vistos', JSON.stringify(actualizado));
  };

  return (
    <div>
      {/* Título principal */}
      <h1 className="page-title mb-3">Convenios Pendientes de Revisión</h1>

      {/* Barra de filtros con el estado bloqueado en 'revision' */}
      <SearchFilters
        rol="revision"
        q={q}
        setQ={setQ}
        tipoId={tipoId}
        setTipoId={setTipoId}
        estado="revision"
        setEstado={() => { }}
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

      {/* Mensaje de error si falla la petición */}
      {error && <div className="alert alert-danger py-2 small">{error}</div>}

    
      {/* SECCIÓN 1: Borradores */}
          <div className="d-flex justify-content-between align-items-center mb-2 mt-3">
            <h2 className="h6 fw-bold text-dark mb-0">Convenios en Revision</h2>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
              {convenios.length} {convenios.length === 1 ? 'convenio' : 'convenios'}
            </span>
          </div>

          {convenios.length === 0 ? (
            <div className="filter-card p-3 text-center text-muted small mb-3">
              No hay convenios en estado revision pendientes.
            </div>
          ) : (
            <div className="d-flex flex-column gap-2 mb-4">
              {convenios.map((conv) => {
                return (
                  <div
                    key={conv.id}
                    className="bg-white rounded-3 shadow-sm px-3 py-3 d-flex flex-wrap justify-content-between align-items-center gap-3"
                    style={{
                      border: '1px solid #e5e7eb',
                      borderLeft: `4px solid #d1d5db`,
                    }}
                  >
                    <div>
                      <div className="text-muted fw-semibold" style={{ fontSize: '0.73rem' }}>
                        {conv.codigo}
                      </div>
                      <div className="fw-bold text-dark mb-1" style={{ fontSize: '0.92rem' }}>
                        {conv.titulo}
                      </div>
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <span
                          className="badge rounded-pill fw-semibold"
                          style={{
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: '1px solid #e5e7eb',
                            fontSize: '0.72rem',
                            padding: '0.32em 0.65em',
                          }}
                        >
                          Revision
                        </span>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <Link
                        href={`/convenios/${conv.id}`}
                        onClick={() => registrarVisto(conv)}
                        className="btn btn-sm bg-white fw-semibold px-3 py-2 text-nowrap"
                        style={{
                          color: 'var(--unlpam-blue-btn)',
                          border: '1.5px solid var(--unlpam-blue-btn)',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                        }}
                      >
                        Ver convenio
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

      {/* Controles de paginación */}
      <div className="mb-4">
        <Pagination paginacion={paginacion} pagina={pagina} setPagina={setPagina} />
      </div>

      {/* Acceso rápido a los últimos convenios consultados */}
      <h2 className="h6 fw-bold text-dark mb-2 mt-4">Últimos que viste</h2>
      <div className="d-flex flex-column gap-2">
        {ultimosVistos.map((visto) => (
          <Link
            key={visto.id}
            href={`/convenios/${visto.id}`}
            className="bg-white rounded-3 border px-3 py-2 d-flex justify-content-between align-items-center text-decoration-none shadow-sm"
            style={{ borderColor: '#e5e7eb' }}
          >
            <span className="text-dark" style={{ fontSize: '0.82rem' }}>
              <span className="fw-semibold">{visto.codigo}</span> · {visto.titulo}
            </span>
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
              {visto.cuando}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}