'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SearchFilters from '@/components/common/SearchFilters';
import StatusBadge from '@/components/common/StatusBadge';
import Pagination from '@/components/common/Pagination';

export default function InicioRevisor() {
  const [convenios, setConvenios] = useState([]);
  const [ultimosVistos, setUltimosVistos] = useState([]);
  const [tiposInstrumento, setTiposInstrumento] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [paginacion, setPaginacion] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros de búsqueda (estado fijo en 'revision' para el rol Revisor)
  const [q, setQ] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [unidadId, setUnidadId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [pagina, setPagina] = useState(1);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

  // Carga los últimos convenios visitados desde localStorage
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

  /* ================= INICIO CÓDIGO REAL DE LA API (DESCOMENTAR AL CONECTAR LARAVEL) =================
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };

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

  useEffect(() => {
    const fetchConvenios = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('auth_token');

      try {
        // Parámetros exactos aceptados por ConvenioController@index y scopeFiltrar
        const params = new URLSearchParams();
        params.append('estado', 'revision');
        params.append('page', pagina);
        params.append('por_pagina', 5);
        params.append('orden', 'fecha_creacion');
        params.append('direccion', 'asc');
        if (q.trim()) params.append('q', q.trim());
        if (tipoId) params.append('tipo_instrumento_id', tipoId);
        if (fechaDesde) params.append('fecha_desde', fechaDesde);
        if (fechaHasta) params.append('fecha_hasta', fechaHasta);

        const response = await fetch(`${apiUrl}/convenios?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        });

        if (!response.ok) throw new Error('No se pudieron cargar los convenios para revisar.');

        const result = await response.json();
        setConvenios(result.data || []);
        setPaginacion({
          current_page: result.current_page || 1,
          last_page: result.last_page || 1,
          total: result.total || 0,
          from: result.from || 0,
          to: result.to || 0,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConvenios();
  }, [apiUrl, q, tipoId, unidadId, fechaDesde, fechaHasta, pagina]);
  ================= FIN CÓDIGO REAL DE LA API ================= */

  // ================= DATOS ESTÁTICOS DE PRUEBA (BORRAR AL CONECTAR LARAVEL) =================
  useEffect(() => {
    setTiposInstrumento([
      { id: 1, nombre: 'Marco de colaboración' },
      { id: 2, nombre: 'Específico de pasantía' },
      { id: 3, nombre: 'Adenda' },
      { id: 4, nombre: 'Renovación' },
    ]);
    setUnidades([{ id: 1, nombre: 'Ingeniería' }]);

    // Estructura idéntica a la tabla 'convenios' + relaciones 'tipo_instrumento' y 'historial_estados'
    const datosPrueba = [
      {
        id: 10,
        codigo: 'CONV-2026-010',
        titulo: 'Renovación del marco · Universidad Ejemplo',
        estado: 'revision',
        fecha_creacion: '2026-10-20',
        firma_gestor: false,
        firma_decano: false,
        convenio_padre_id: 1,
        tipo_instrumento_id: 4,
        tipo_instrumento: { id: 4, nombre: 'Renovación' },
        historial_estados: [
          { estado_anterior: 'borrador', estado_nuevo: 'revision', fecha_cambio: '2026-10-21' },
        ],
      },
      {
        id: 21,
        codigo: 'CONV-2026-021',
        titulo: 'Específico de colaboración · Municipio',
        estado: 'revision',
        fecha_creacion: '2026-11-01',
        firma_gestor: false,
        firma_decano: false,
        convenio_padre_id: null,
        tipo_instrumento_id: 2,
        tipo_instrumento: { id: 2, nombre: 'Específico de pasantía' },
        historial_estados: [
          { estado_anterior: 'borrador', estado_nuevo: 'revision', fecha_cambio: '2026-11-02' },
          { estado_anterior: 'revision', estado_nuevo: 'borrador', fecha_cambio: '2026-11-04' },
          { estado_anterior: 'borrador', estado_nuevo: 'revision', fecha_cambio: '2026-11-06' },
        ],
      },
      {
        id: 15,
        codigo: 'CONV-2026-015',
        titulo: 'Marco de pasantías · Empresa Demo',
        estado: 'revision',
        fecha_creacion: '2026-11-08',
        firma_gestor: false,
        firma_decano: false,
        convenio_padre_id: null,
        tipo_instrumento_id: 1,
        tipo_instrumento: { id: 1, nombre: 'Marco de colaboración' },
        historial_estados: [
          { estado_anterior: 'borrador', estado_nuevo: 'revision', fecha_cambio: '2026-11-08' },
        ],
      },
      {
        id: 18,
        codigo: 'CONV-2026-018',
        titulo: 'Adenda al convenio · Instituto Demo',
        estado: 'revision',
        fecha_creacion: '2026-11-12',
        firma_gestor: false,
        firma_decano: false,
        convenio_padre_id: 15,
        tipo_instrumento_id: 3,
        tipo_instrumento: { id: 3, nombre: 'Adenda' },
        historial_estados: [
          { estado_anterior: 'borrador', estado_nuevo: 'revision', fecha_cambio: '2026-11-12' },
        ],
      },
    ];

    const filtrados = datosPrueba.filter((item) => {
      const coincideTexto =
        !q ||
        item.titulo.toLowerCase().includes(q.toLowerCase()) ||
        item.codigo.toLowerCase().includes(q.toLowerCase());
      const coincideTipo = !tipoId || String(item.tipo_instrumento_id) === String(tipoId);
      const coincideDesde = !fechaDesde || item.fecha_creacion >= fechaDesde;
      const coincideHasta = !fechaHasta || item.fecha_creacion <= fechaHasta;
      return coincideTexto && coincideTipo && coincideDesde && coincideHasta;
    });

    setConvenios(filtrados);

    const porPagina = 5;
    const total = filtrados.length;
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
    const paginaSegura = Math.min(pagina, totalPaginas);

    setPaginacion({
      current_page: paginaSegura,
      last_page: totalPaginas,
      total,
      from: total === 0 ? 0 : (paginaSegura - 1) * porPagina + 1,
      to: Math.min(paginaSegura * porPagina, total),
    });
    setLoading(false);
  }, [q, tipoId, unidadId, fechaDesde, fechaHasta, pagina]);
  // ================= FIN DATOS ESTÁTICOS DE PRUEBA =================

  const handleLimpiarFiltros = () => {
    setQ('');
    setTipoId('');
    setUnidadId('');
    setFechaDesde('');
    setFechaHasta('');
    setPagina(1);
  };

  // Calcula borde izquierdo y badge usando únicamente campos reales (historial_estados y fecha_creacion)
  const obtenerEstiloUrgencia = (conv) => {
    const historial = conv.historial_estados || [];
    const vecesEnRevision = historial.filter((h) => h.estado_nuevo === 'revision').length;

    // 1. Si pasó más de una vez a 'revision', fue reenviado tras corrección (amarillo)
    if (vecesEnRevision > 1) {
      return {
        borderColor: '#eab308',
        badgeBg: '#fef3c7',
        badgeColor: '#92400e',
        texto: '• Reenviado tras corrección',
      };
    }

    // 2. Calcula días en revisión desde el último cambio a 'revision' o desde fecha_creacion
    const ultimoPasoRevision = [...historial].reverse().find((h) => h.estado_nuevo === 'revision');
    const fechaBase = ultimoPasoRevision?.fecha_cambio || conv.fecha_creacion;
    const dias = fechaBase
      ? Math.max(0, Math.floor((new Date() - new Date(fechaBase)) / (1000 * 60 * 60 * 24)))
      : 0;

    // Si lleva 15 días o más en revisión sin resolverse -> urgente (rojo)
    if (dias >= 15) {
      return {
        borderColor: '#b91c1c',
        badgeBg: '#fee2e2',
        badgeColor: '#991b1b',
        texto: `▲ En revisión hace ${dias} días`,
      };
    }

    // 3. Caso normal (gris)
    return {
      borderColor: '#d1d5db',
      badgeBg: '#e5e7eb',
      badgeColor: '#374151',
      texto: dias === 0 ? '• Ingresado hoy' : `• Ingresado hace ${dias} ${dias === 1 ? 'día' : 'días'}`,
    };
  };

  // Guarda en localStorage los últimos convenios abiertos para mostrarlos en "Últimos que viste"
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
      {/* Título principal de la vista */}
      <h1 className="page-title mb-3">Convenios Pendientes de Revisión</h1>

      {/* Barra de Filtros */}
      <SearchFilters
        rol="revisor"
        q={q}
        setQ={setQ}
        tipoId={tipoId}
        setTipoId={setTipoId}
        estado="revision"
        setEstado={() => {}}
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

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {/* Sección: Para revisar */}
      <div className="d-flex justify-content-between align-items-center mb-2 mt-2">
        <h2 className="h6 fw-bold text-dark mb-0">Para revisar</h2>
        <span className="text-muted" style={{ fontSize: '0.8rem' }}>
          {paginacion.total} {paginacion.total === 1 ? 'convenio pendiente' : 'convenios pendientes'}
        </span>
      </div>

      {loading ? (
        <div className="text-muted py-4 small">Cargando convenios pendientes de revisión...</div>
      ) : convenios.length === 0 ? (
        <div className="filter-card p-4 text-center text-muted small mb-3">
          No hay convenios pendientes de revisión con los filtros seleccionados.
        </div>
      ) : (
        <div className="d-flex flex-column gap-2 mb-3">
          {convenios.slice((pagina - 1) * 5, pagina * 5).map((conv) => {
            const estilo = obtenerEstiloUrgencia(conv);

            return (
              <div
                key={conv.id}
                className="bg-white rounded-3 shadow-sm px-3 py-3 d-flex flex-wrap justify-content-between align-items-center gap-3"
                style={{
                  border: '1px solid #e5e7eb',
                  borderLeft: `4px solid ${estilo.borderColor}`,
                }}
              >
                {/* Datos e insignias a la izquierda */}
                <div>
                  <div className="text-muted fw-semibold" style={{ fontSize: '0.73rem' }}>
                    {conv.codigo}
                  </div>
                  <div className="fw-bold text-dark mb-1" style={{ fontSize: '0.92rem' }}>
                    {conv.titulo}
                  </div>
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <StatusBadge estado={conv.estado} />
                    <span
                      className="badge rounded-pill fw-semibold"
                      style={{
                        backgroundColor: estilo.badgeBg,
                        color: estilo.badgeColor,
                        fontSize: '0.72rem',
                        padding: '0.32em 0.65em',
                      }}
                    >
                      {estilo.texto}
                    </span>
                  </div>
                </div>

                {/* Botones a la derecha */}
                <div className="d-flex align-items-center gap-2">
                  <Link
                    href={`/convenios/${conv.id}`}
                    onClick={() => registrarVisto(conv)}
                    className="btn btn-sm bg-white border fw-semibold px-3 py-1"
                    style={{ color: '#374151', borderRadius: '6px', fontSize: '0.8rem' }}
                  >
                    Ver convenio
                  </Link>
                  <Link
                    href={`/convenios/${conv.id}/revisar`}
                    onClick={() => registrarVisto(conv)}
                    className="btn btn-sm text-white fw-semibold px-3 py-1"
                    style={{
                      backgroundColor: 'var(--unlpam-blue-btn)',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                    }}
                  >
                    Revisar
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación de la lista Para revisar */}
      <div className="mb-4">
        <Pagination paginacion={paginacion} pagina={pagina} setPagina={setPagina} />
      </div>

      {/* Sección inferior: Últimos que viste */}
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