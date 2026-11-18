'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SearchFilters from '@/components/common/SearchFilters';
import ConvenioActionCard from '@/components/common/ConvenioActionCard';
import ModalRenovacion from '@/components/common/ModalRenovacion';

export default function InicioGestor({ modoAdministrador = false }) {
  const [conveniosFiltrados, setConveniosFiltrados] = useState([]);
  const [conveniosBorrador, setConveniosBorrador] = useState([]);
  const [conveniosFirmados, setConveniosFirmados] = useState([]);
  const [conveniosProximosVencer, setConveniosProximosVencer] = useState([]);
  const [ultimosVistos, setUltimosVistos] = useState([]);
  const [tiposInstrumento, setTiposInstrumento] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exitoMsg, setExitoMsg] = useState('');

  // Filtros
  const [q, setQ] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [estado, setEstado] = useState('');
  const [unidadId, setUnidadId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Detecta si el usuario aplicó al menos un filtro
  const hayFiltrosActivos = Boolean(
    q.trim() || tipoId || estado || unidadId || fechaDesde || fechaHasta
  );

  // Estados para el Modal de Asignar Revisor
  const [modalConvenio, setModalConvenio] = useState(null);
  const [revisores, setRevisores] = useState([]);
  const [revisorSeleccionado, setRevisorSeleccionado] = useState('');
  const [observacionAsignacion, setObservacionAsignacion] = useState('');
  const [enviandoAsignacion, setEnviandoAsignacion] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  // Estado para el Modal de Renovación rápida
  const [modalRenovacion, setModalRenovacion] = useState(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

  // Cargar catálogos y lista de revisores
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const guardados = JSON.parse(localStorage.getItem('ultimos_convenios_vistos')) || [];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore browser-persisted history after hydration.
      setUltimosVistos(guardados);
    } catch (e) {
      setUltimosVistos([]);
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };

    Promise.all([
      fetch(`${apiUrl}/tipos-instrumento`, { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${apiUrl}/unidades`, { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${apiUrl}/users`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([tiposData, unidadesData, usersData]) => {
        setTiposInstrumento(Array.isArray(tiposData) ? tiposData : tiposData.data || []);
        setUnidades(Array.isArray(unidadesData) ? unidadesData : unidadesData.data || []);

        const listaUsers = Array.isArray(usersData) ? usersData : usersData?.data || [];
        const soloRevisores = listaUsers.filter((u) => (u.rol || '').toLowerCase() === 'revision');

        if (soloRevisores.length > 0) {
          setRevisores(soloRevisores);
          setRevisorSeleccionado(String(soloRevisores[0].id));
        } else {
          const fallback = [{ id: 3, name: 'Revisor Demo', email: 'revisor@test.com', rol: 'revision' }];
          setRevisores(fallback);
          setRevisorSeleccionado('3');
        }
      })
      .catch((err) => console.error('Error cargando catálogos:', err));
  }, [apiUrl]);

  // Cargar convenios del panel de inicio
  useEffect(() => {
    const fetchDatosInicio = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('auth_token');

      try {
        const params = new URLSearchParams();
        params.append('por_pagina', '50');
        if (q.trim()) params.append('q', q.trim());
        if (tipoId) params.append('tipo_instrumento_id', tipoId);
        if (estado) params.append('estado', estado);
        if (fechaDesde) params.append('fecha_desde', fechaDesde);
        if (fechaHasta) params.append('fecha_hasta', fechaHasta);

        const response = await fetch(`${apiUrl}/convenios?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });

        if (!response.ok) throw new Error('No se pudieron cargar los convenios de inicio.');

        const result = await response.json();
        const lista = Array.isArray(result.data) ? result.data : [];

        const listaProcesada = unidadId
          ? lista.filter((c) => {
              const unidadDirecta = String(c.unidad_responsable_id ?? c.unidad?.id ?? '');
              const enRepresentantes = (c.representantes || []).some(
                (r) => String(r.unidad_responsable_id ?? '') === String(unidadId)
              );
              return unidadDirecta === String(unidadId) || enRepresentantes;
            })
          : lista;

        const sinRevision = listaProcesada.filter((c) => (c.estado || '').toLowerCase() !== 'revision');
        const borradores = sinRevision.filter((c) => (c.estado || '').toLowerCase() === 'borrador');
        const firmados = sinRevision.filter((c) => (c.estado || '').toLowerCase() === 'firmado');
        const proximosVencer = sinRevision.filter((c) => {
          const fechaVenc = c.fecha_vencimiento || c.detalle_pasantia?.fecha_fin_pasantia;
          if (!fechaVenc) return false;
          const dias = Math.ceil((new Date(fechaVenc) - new Date()) / (1000 * 60 * 60 * 24));
          return dias >= 0 && dias <= 45;
        });

        setConveniosFiltrados(listaProcesada);
        setConveniosBorrador(borradores);
        setConveniosFirmados(firmados);
        setConveniosProximosVencer(proximosVencer);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDatosInicio();
  }, [apiUrl, q, tipoId, estado, unidadId, fechaDesde, fechaHasta]);

  const registrarUltimoVisto = (conv) => {
    try {
      const actual = JSON.parse(localStorage.getItem('ultimos_convenios_vistos')) || [];
      const filtrados = actual.filter((item) => item.id !== conv.id);
      const nuevoHistorial = [conv, ...filtrados].slice(0, 4);
      localStorage.setItem('ultimos_convenios_vistos', JSON.stringify(nuevoHistorial));
      setUltimosVistos(nuevoHistorial);
    } catch (e) {
      console.error(e);
    }
  };

  const abrirModalAsignar = (conv) => {
    setErrorModal('');
    setObservacionAsignacion('');
    setModalConvenio(conv);
  };

  const cerrarModalAsignar = () => {
    if (enviandoAsignacion) return;
    setModalConvenio(null);
    setErrorModal('');
  };

  const handleConfirmarAsignacion = async (e) => {
    e.preventDefault();
    if (!modalConvenio || !revisorSeleccionado) return;

    setEnviandoAsignacion(true);
    setErrorModal('');
    const token = localStorage.getItem('auth_token');

    const revisorObj = revisores.find((r) => String(r.id) === String(revisorSeleccionado));
    const nombreRevisor = revisorObj ? revisorObj.name : 'Revisor';

    const textoBase = observacionAsignacion.trim()
      ? observacionAsignacion.trim()
      : `Asignado a ${nombreRevisor}`;
    const fundamentoFinal = textoBase.slice(0, 45);

    try {
      const response = await fetch(`${apiUrl}/convenios/${modalConvenio.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado: 'revision',
          fundamento: fundamentoFinal,
          revisor_id: Number(revisorSeleccionado),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msgValidacion = data?.errors
          ? Object.values(data.errors).flat().join(' ')
          : data?.message || 'No se pudo enviar el convenio a revisión.';
        throw new Error(msgValidacion);
      }

      setConveniosBorrador((prev) => prev.filter((c) => c.id !== modalConvenio.id));
      setExitoMsg(
        `El convenio ${modalConvenio.codigo} pasó a estado "En revisión" y se generó la notificación para ${nombreRevisor}.`
      );
      setModalConvenio(null);
    } catch (err) {
      setErrorModal(err.message);
    } finally {
      setEnviandoAsignacion(false);
    }
  };

  const handleLimpiarFiltros = () => {
    setQ('');
    setTipoId('');
    setUnidadId('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const obtenerConfigTarjetaVencimiento = (conv) => {
    const fechaVenc = conv.fecha_vencimiento || conv.detalle_pasantia?.fecha_fin_pasantia;
    if (fechaVenc) {
      const dias = Math.ceil((new Date(fechaVenc) - new Date()) / (1000 * 60 * 60 * 24));
      if (dias >= 0 && dias <= 15) {
        return {
          bordeColor: '#b91c1c',
          badgeTexto: `▲ Vence en ${dias} días`,
          badgeBg: '#fee2e2',
          badgeColor: '#991b1b',
        };
      }
      if (dias > 15 && dias <= 45) {
        return {
          bordeColor: '#eab308',
          badgeTexto: `• Preaviso en ${dias} días`,
          badgeBg: '#fef3c7',
          badgeColor: '#92400e',
        };
      }
    }
    return { bordeColor: '#d1d5db', badgeTexto: '' };
  };

  const totalConveniosVisibles = hayFiltrosActivos
    ? conveniosFiltrados.length
    : conveniosBorrador.length + conveniosFirmados.length + conveniosProximosVencer.length;

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="page-title mb-0">
            {modoAdministrador ? 'Administración de Convenios' : 'Gestión de Convenios'}
          </h1>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>
            Total en vista: <strong>{totalConveniosVisibles}</strong> convenios
          </span>
        </div>
        {modoAdministrador && (
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
        )}
      </div>

      <SearchFilters
        rol={modoAdministrador ? 'admin' : 'gestion'}
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
      />

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {/* Mensaje de éxito fijo debajo de los filtros */}
      {exitoMsg && (
        <div className="alert alert-success py-2 small mb-3" role="alert">
          {exitoMsg}
          <button
            type="button"
            className="btn-close float-end"
            style={{ fontSize: '0.65rem' }}
            onClick={() => setExitoMsg('')}
            aria-label="Cerrar"
          ></button>
        </div>
      )}

      {loading ? (
        <div className="text-muted py-4 small">Cargando panel de gestión...</div>
      ) : hayFiltrosActivos ? (
        /* VISTA UNIFICADA CUANDO HAY FILTROS ACTIVOS */
        <div className="mt-3 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h2 className="h6 fw-bold text-dark mb-0">Resultados de búsqueda</h2>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
              {conveniosFiltrados.length} {conveniosFiltrados.length === 1 ? 'convenio encontrado' : 'convenios encontrados'}
            </span>
          </div>

          {conveniosFiltrados.length === 0 ? (
            <div className="filter-card p-4 text-center text-muted small">
              No se encontraron convenios que coincidan con los filtros aplicados.
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {conveniosFiltrados.map((conv) => {
                const estadoLower = (conv.estado || '').toLowerCase();
                const cfgVenc = obtenerConfigTarjetaVencimiento(conv);
                const historial = conv.historial_estados || [];
                const fueDevuelto = historial.some(
                  (h) => h.estado_anterior === 'revision' && h.estado_nuevo === 'borrador'
                );

                return (
                  <div
                    key={`filtrado-${conv.id}`}
                    className="bg-white rounded-3 shadow-sm px-3 py-3 d-flex flex-wrap justify-content-between align-items-center gap-3"
                    style={{
                      border: '1px solid #e5e7eb',
                      borderLeft: `4px solid ${estadoLower === 'borrador' && fueDevuelto ? '#b91c1c' : cfgVenc.bordeColor || '#10b981'}`,
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
                          className="badge rounded-pill fw-semibold text-capitalize"
                          style={{
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: '1px solid #e5e7eb',
                            fontSize: '0.72rem',
                            padding: '0.32em 0.65em',
                          }}
                        >
                          {conv.estado}
                        </span>
                        {fueDevuelto && (
                          <span
                            className="badge rounded-pill fw-semibold"
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              fontSize: '0.72rem',
                              padding: '0.32em 0.65em',
                            }}
                          >
                            ▲ Devuelto con observaciones
                          </span>
                        )}
                        {cfgVenc.badgeTexto && (
                          <span
                            className="badge rounded-pill fw-semibold"
                            style={{
                              backgroundColor: cfgVenc.badgeBg,
                              color: cfgVenc.badgeColor,
                              fontSize: '0.72rem',
                              padding: '0.32em 0.65em',
                            }}
                          >
                            {cfgVenc.badgeTexto}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <Link
                        href={`/convenios/${conv.id}`}
                        onClick={() => registrarUltimoVisto(conv)}
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

                      {estadoLower === 'borrador' && (
                        fueDevuelto ? (
                          <Link
                            href={`/convenios/${conv.id}/editar`}
                            onClick={() => registrarUltimoVisto(conv)}
                            className="btn btn-sm text-white fw-semibold px-3 py-2 text-nowrap"
                            style={{
                              backgroundColor: 'var(--unlpam-blue-btn)',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                            }}
                          >
                            Corregir
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => abrirModalAsignar(conv)}
                            className="btn btn-sm text-white fw-semibold px-3 py-2 text-nowrap"
                            style={{
                              backgroundColor: 'var(--unlpam-blue-btn)',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                            }}
                          >
                            Asignar revisor
                          </button>
                        )
                      )}

                      {cfgVenc.badgeTexto && (
                        <button
                          type="button"
                          onClick={() => setModalRenovacion(conv)}
                          className="btn btn-sm text-white fw-semibold px-3 py-2 text-nowrap"
                          style={{
                            backgroundColor: 'var(--unlpam-blue-btn)',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                          }}
                        >
                          Iniciar renovación
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VISTA ORIGINAL DE 3 LISTADOS CUANDO NO HAY FILTROS */
        <>
          {/* SECCIÓN 1: Borradores */}
          <div className="d-flex justify-content-between align-items-center mb-2 mt-3">
            <h2 className="h6 fw-bold text-dark mb-0">Convenios en Borrador (Asignar Revisor)</h2>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
              {conveniosBorrador.length} {conveniosBorrador.length === 1 ? 'convenio' : 'convenios'}
            </span>
          </div>

          {conveniosBorrador.length === 0 ? (
            <div className="filter-card p-3 text-center text-muted small mb-3">
              No hay convenios en estado borrador pendientes de asignación.
            </div>
          ) : (
            <div className="d-flex flex-column gap-2 mb-4">
              {conveniosBorrador.map((conv) => {
                const historial = conv.historial_estados || [];
                const fueDevuelto = historial.some(
                  (h) => h.estado_anterior === 'revision' && h.estado_nuevo === 'borrador'
                );

                return (
                  <div
                    key={conv.id}
                    className="bg-white rounded-3 shadow-sm px-3 py-3 d-flex flex-wrap justify-content-between align-items-center gap-3"
                    style={{
                      border: '1px solid #e5e7eb',
                      borderLeft: `4px solid ${fueDevuelto ? '#b91c1c' : '#d1d5db'}`,
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
                          Borrador
                        </span>
                        {fueDevuelto && (
                          <span
                            className="badge rounded-pill fw-semibold"
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              fontSize: '0.72rem',
                              padding: '0.32em 0.65em',
                            }}
                          >
                            ▲ Devuelto con observaciones
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <Link
                        href={`/convenios/${conv.id}`}
                        onClick={() => registrarUltimoVisto(conv)}
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

                      {fueDevuelto ? (
                        <Link
                          href={`/convenios/${conv.id}/editar`}
                          onClick={() => registrarUltimoVisto(conv)}
                          className="btn btn-sm text-white fw-semibold px-3 py-2 text-nowrap"
                          style={{
                            backgroundColor: 'var(--unlpam-blue-btn)',
                            border: '1.5px solid var(--unlpam-blue-btn)',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                          }}
                        >
                          Corregir
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => abrirModalAsignar(conv)}
                          className="btn btn-sm text-white fw-semibold px-3 py-2 text-nowrap"
                          style={{
                            backgroundColor: 'var(--unlpam-blue-btn)',
                            border: '1.5px solid var(--unlpam-blue-btn)',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                          }}
                        >
                          Asignar revisor
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECCIÓN 2: Próximos a vencer */}
          <div className="d-flex justify-content-between align-items-center mb-2 mt-4">
            <h2 className="h6 fw-bold text-dark mb-0">Convenios Próximos a Vencer o en Preaviso</h2>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
              {conveniosProximosVencer.length} {conveniosProximosVencer.length === 1 ? 'convenio' : 'convenios'}
            </span>
          </div>

          {conveniosProximosVencer.length === 0 ? (
            <div className="filter-card p-3 text-center text-muted small mb-3">
              No hay convenios próximos a vencer en el período de alerta.
            </div>
          ) : (
            <div className="d-flex flex-column gap-2 mb-4">
              {conveniosProximosVencer.map((conv) => {
                const cfg = obtenerConfigTarjetaVencimiento(conv);

                return (
                  <div
                    key={conv.id}
                    className="bg-white rounded-3 shadow-sm px-3 py-3 d-flex flex-wrap justify-content-between align-items-center gap-3"
                    style={{
                      border: '1px solid #e5e7eb',
                      borderLeft: `4px solid ${cfg.bordeColor}`,
                    }}
                    onClick={() => registrarUltimoVisto(conv)}
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
                          className="badge rounded-pill fw-semibold text-capitalize"
                          style={{
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: '1px solid #e5e7eb',
                            fontSize: '0.72rem',
                            padding: '0.32em 0.65em',
                          }}
                        >
                          {conv.estado}
                        </span>
                        {cfg.badgeTexto && (
                          <span
                            className="badge rounded-pill fw-semibold"
                            style={{
                              backgroundColor: cfg.badgeBg || '#fee2e2',
                              color: cfg.badgeColor || '#991b1b',
                              fontSize: '0.72rem',
                              padding: '0.32em 0.65em',
                            }}
                          >
                            {cfg.badgeTexto}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <Link
                        href={`/convenios/${conv.id}`}
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

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalRenovacion(conv);
                        }}
                        className="btn btn-sm text-white fw-semibold px-3 py-2 text-nowrap"
                        style={{
                          backgroundColor: 'var(--unlpam-blue-btn)',
                          border: '1.5px solid var(--unlpam-blue-btn)',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                        }}
                      >
                        Iniciar renovación
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECCIÓN 3: Convenios Firmados y Vigentes */}
          <div className="d-flex justify-content-between align-items-center mb-2 mt-4">
            <h2 className="h6 fw-bold text-dark mb-0">Convenios Firmados y Vigentes</h2>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
              {conveniosFirmados.length} {conveniosFirmados.length === 1 ? 'convenio' : 'convenios'}
            </span>
          </div>

          {conveniosFirmados.length === 0 ? (
            <div className="filter-card p-3 text-center text-muted small mb-3">
              No hay convenios en estado firmado actualmente.
            </div>
          ) : (
            <div className="d-flex flex-column gap-2 mb-4">
              {conveniosFirmados.map((conv) => (
                <div
                  key={`firmado-${conv.id}`}
                  className="bg-white rounded-3 shadow-sm px-3 py-3 d-flex flex-wrap justify-content-between align-items-center gap-3"
                  style={{
                    border: '1px solid #e5e7eb',
                    borderLeft: '4px solid #10b981',
                  }}
                >
                  <div>
                    <div className="text-muted fw-semibold" style={{ fontSize: '0.73rem' }}>
                      {conv.codigo}
                    </div>
                    <div className="fw-bold text-dark mb-1" style={{ fontSize: '0.92rem' }}>
                      {conv.titulo}
                    </div>
                    <span
                      className="badge rounded-pill fw-semibold text-capitalize"
                      style={{
                        backgroundColor: '#d1fae5',
                        color: '#065f46',
                        fontSize: '0.72rem',
                        padding: '0.32em 0.65em',
                      }}
                    >
                      Firmado (Activo)
                    </span>
                  </div>

                  <div>
                    <Link
                      href={`/convenios/${conv.id}`}
                      onClick={() => registrarUltimoVisto(conv)}
                      className="btn btn-sm text-white fw-semibold px-3 py-2 text-nowrap"
                      style={{
                        backgroundColor: 'var(--unlpam-blue-btn)',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                      }}
                    >
                      Gestionar / Ver ficha
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SECCIÓN 4: Últimos accedidos */}
          <div className="d-flex justify-content-between align-items-center mb-2 mt-5">
            <h2 className="h6 fw-bold text-dark mb-0">Últimos convenios accedidos</h2>
          </div>
          {ultimosVistos.length === 0 ? (
            <div className="filter-card p-3 text-center text-muted small mb-3">
              Aún no has consultado ningún convenio recientemente.
            </div>
          ) : (
            <div className="d-flex flex-column gap-2 mb-3">
              {ultimosVistos.map((conv) => (
                <div key={`reciente-${conv.id}`}>
                  <ConvenioActionCard
                    convenio={conv}
                    bordeColor="#0f5a9c"
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* MODAL 1: Asignar Revisor */}
      {modalConvenio && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={cerrarModalAsignar}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold" style={{ fontSize: '1rem' }}>
                  Asignar revisor al convenio
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cerrarModalAsignar}
                  disabled={enviandoAsignacion}
                ></button>
              </div>

              <form onSubmit={handleConfirmarAsignacion}>
                <div className="modal-body">
                  <div className="p-2 rounded bg-light border mb-3" style={{ fontSize: '0.82rem' }}>
                    <div className="text-muted fw-semibold">{modalConvenio.codigo}</div>
                    <div className="fw-bold text-dark">{modalConvenio.titulo}</div>
                  </div>

                  {errorModal && (
                    <div className="alert alert-danger py-2 small">{errorModal}</div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">
                      Seleccionar usuario con rol de revisión
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={revisorSeleccionado}
                      onChange={(e) => setRevisorSeleccionado(e.target.value)}
                      required
                    >
                      {revisores.map((rev) => (
                        <option key={rev.id} value={rev.id}>
                          {rev.name} ({rev.email})
                        </option>
                      ))}
                    </select>
                    <div className="form-text" style={{ fontSize: '0.73rem' }}>
                      Al confirmar, el convenio pasará a estado <strong>En revisión</strong> y se enviará una notificación automática al área de revisión.
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label fw-semibold small">
                      Fundamento / Nota de pase (opcional, máx. 45 caracteres)
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      maxLength={45}
                      placeholder="Ej: Envío a revisión técnica"
                      value={observacionAsignacion}
                      onChange={(e) => setObservacionAsignacion(e.target.value)}
                    />
                    <div className="text-end text-muted" style={{ fontSize: '0.7rem' }}>
                      {observacionAsignacion.length}/45
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary fw-semibold"
                    onClick={cerrarModalAsignar}
                    disabled={enviandoAsignacion}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm text-white fw-semibold px-3"
                    style={{ backgroundColor: 'var(--unlpam-blue-btn)' }}
                    disabled={enviandoAsignacion}
                  >
                    {enviandoAsignacion ? 'Asignando...' : 'Confirmar y enviar a revisión'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Renovación */}
      {modalRenovacion && (
        <ModalRenovacion
          convenio={modalRenovacion}
          onClose={() => setModalRenovacion(null)}
          onRenovado={(convActualizado) => {
            setExitoMsg(`El convenio ${convActualizado.codigo} fue renovado con éxito.`);
            setModalRenovacion(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
