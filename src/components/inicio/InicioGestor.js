'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SearchFilters from '@/components/common/SearchFilters';
import ConvenioActionCard from '@/components/common/ConvenioActionCard';
import ModalRenovacion from '@/components/common/ModalRenovacion';
import Pagination from '@/components/common/Pagination';

export default function InicioGestor({
  mostrarEncabezado = true,
  modoAdministrador = false,
} = {}) {
  const [convenios, setConvenios] = useState([]);
  const [conveniosBorrador, setConveniosBorrador] = useState([]);
  const [conveniosProximosVencer, setConveniosProximosVencer] = useState([]);
  const [ultimosVistos, setUltimosVistos] = useState([]);
  const [tiposInstrumento, setTiposInstrumento] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [paginacion, setPaginacion] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    from: 0,
    to: 0,
  });
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

  // Estados para el Modal de Asignar Revisor
  const [modalConvenio, setModalConvenio] = useState(null);
  const [revisores, setRevisores] = useState([]);
  const [revisorSeleccionado, setRevisorSeleccionado] = useState('');
  const [observacionAsignacion, setObservacionAsignacion] = useState('');
  const [enviandoAsignacion, setEnviandoAsignacion] = useState(false);
  const [errorModal, setErrorModal] = useState('');
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
        if (modoAdministrador) params.append('page', String(pagina));
        if (q.trim()) params.append('q', q.trim());
        if (tipoId) params.append('tipo_instrumento_id', tipoId);
        if (modoAdministrador && estado) params.append('estado', estado);
        if (unidadId) params.append('unidad_id', unidadId);
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
        const lista = Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : [];

        setConvenios(lista);
        if (modoAdministrador) {
          setPaginacion({
            current_page: result.current_page || pagina,
            last_page: result.last_page || 1,
            total: result.total ?? lista.length,
            from: lista.length === 0 ? 0 : result.from || 1,
            to: lista.length === 0 ? 0 : result.to || lista.length,
          });
        }
        const sinRevision = lista.filter((c) => (c.estado || '').toLowerCase() !== 'revision');
        const borradores = sinRevision.filter((c) => (c.estado || '').toLowerCase() === 'borrador');
        const proximosVencer = sinRevision.filter((c) => {
          const fechaVenc = c.fecha_vencimiento || c.detalle_pasantia?.fecha_fin_pasantia;
          if (!fechaVenc) return false;
          const dias = Math.ceil((new Date(fechaVenc) - new Date()) / (1000 * 60 * 60 * 24));
          return dias >= 0 && dias <= 45;
        });

        setConveniosBorrador(borradores);
        setConveniosProximosVencer(proximosVencer);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDatosInicio();
  }, [apiUrl, modoAdministrador, pagina, q, tipoId, estado, unidadId, fechaDesde, fechaHasta]);

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
      setConvenios((prev) =>
        prev.map((conv) =>
          conv.id === modalConvenio.id ? { ...conv, estado: 'revision' } : conv
        )
      );
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
    setEstado('');
    setUnidadId('');
    setFechaDesde('');
    setFechaHasta('');
    setPagina(1);
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

  const obtenerConfigOperacion = (conv) => {
    const est = (conv.estado || '').toLowerCase();
    const historial = conv.historial_estados || [];
    const fueDevuelto = historial.some(
      (item) =>
        (item.estado_anterior || '').toLowerCase() === 'revision' &&
        (item.estado_nuevo || '').toLowerCase() === 'borrador'
    );

    if (est === 'borrador') {
      return fueDevuelto
        ? {
            bordeColor: '#b91c1c',
            badgeTexto: '▲ Devuelto con observaciones',
            badgeBg: '#fee2e2',
            badgeColor: '#991b1b',
            accionPrimariaTexto: 'Corregir',
            accionPrimariaHref: `/convenios/${conv.id}/editar`,
          }
        : {
            bordeColor: '#d1d5db',
            accionPrimariaTexto: 'Asignar revisor',
            accion: 'asignar',
          };
    }

    if (est === 'aprobado') {
      return {
        bordeColor: '#eab308',
        badgeTexto: '• Pendiente de firma',
        badgeBg: '#fef3c7',
        badgeColor: '#92400e',
        accionPrimariaTexto: 'Registrar firma',
        accionPrimariaHref: `/convenios/${conv.id}`,
      };
    }

    if (est === 'firmado') {
      const config = obtenerConfigTarjetaVencimiento(conv);
      if (config.badgeTexto) {
        return {
          ...config,
          accionPrimariaTexto: 'Iniciar renovación',
          accion: 'renovar',
        };
      }
    }

    return { bordeColor: '#d1d5db' };
  };

  const renderTarjetaOperacion = (conv) => {
    const config = obtenerConfigOperacion(conv);
    return (
      <ConvenioActionCard
        key={conv.id}
        convenio={conv}
        bordeColor={config.bordeColor}
        badgeTexto={config.badgeTexto}
        badgeBg={config.badgeBg}
        badgeColor={config.badgeColor}
        accionPrimariaTexto={config.accionPrimariaTexto}
        accionPrimariaHref={config.accionPrimariaHref}
        onVerClick={registrarUltimoVisto}
        onAccionClick={() => {
          if (config.accion === 'asignar') abrirModalAsignar(conv);
          if (config.accion === 'renovar') setModalRenovacion(conv);
        }}
      />
    );
  };

  const filtrosActivos = Boolean(
    q.trim() || tipoId || estado || unidadId || fechaDesde || fechaHasta
  );
  const conveniosAdminBorrador = convenios.filter(
    (conv) => (conv.estado || '').toLowerCase() === 'borrador'
  );
  const conveniosAdminFirma = convenios.filter(
    (conv) => (conv.estado || '').toLowerCase() === 'aprobado'
  );
  const conveniosAdminRenovacion = convenios.filter(
    (conv) =>
      (conv.estado || '').toLowerCase() !== 'revision' &&
      obtenerConfigTarjetaVencimiento(conv).badgeTexto
  );

  const renderTarjetaRenovacion = (conv) => {
    const config = obtenerConfigTarjetaVencimiento(conv);
    return (
      <ConvenioActionCard
        key={conv.id}
        convenio={conv}
        bordeColor={config.bordeColor}
        badgeTexto={config.badgeTexto}
        badgeBg={config.badgeBg}
        badgeColor={config.badgeColor}
        accionPrimariaTexto="Iniciar renovación"
        onVerClick={registrarUltimoVisto}
        onAccionClick={() => setModalRenovacion(conv)}
      />
    );
  };

  const renderGrupoAdmin = (titulo, lista, mensajeVacio, renderTarjeta = renderTarjetaOperacion) => (
    <section className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="h6 fw-bold text-dark mb-0">{titulo}</h2>
        <span className="text-muted" style={{ fontSize: '0.8rem' }}>
          {lista.length} {lista.length === 1 ? 'convenio' : 'convenios'}
        </span>
      </div>
      {lista.length === 0 ? (
        <div className="filter-card p-3 text-center text-muted small">{mensajeVacio}</div>
      ) : (
        <div className="d-flex flex-column gap-2">{lista.map(renderTarjeta)}</div>
      )}
    </section>
  );

  return (
    <div>
      {(mostrarEncabezado || modoAdministrador) && (
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h1 className="page-title mb-1">
              {modoAdministrador ? 'Panel de Administración' : 'Gestión de Convenios'}
            </h1>
            {modoAdministrador && (
              <p className="text-muted small mb-0">
                Convenios agrupados según la operación que requieren.
              </p>
            )}
          </div>
          {!modoAdministrador && (
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
      )}

      <SearchFilters
        rol={modoAdministrador ? 'admin' : 'gestion'}
        q={q}
        setQ={setQ}
        tipoId={tipoId}
        setTipoId={setTipoId}
        estado={modoAdministrador ? estado : ''}
        setEstado={modoAdministrador ? setEstado : () => {}}
        unidadId={unidadId}
        setUnidadId={setUnidadId}
        fechaDesde={fechaDesde}
        setFechaDesde={setFechaDesde}
        fechaHasta={fechaHasta}
        setFechaHasta={setFechaHasta}
        tiposInstrumento={tiposInstrumento}
        unidades={unidades}
        onLimpiar={handleLimpiarFiltros}
        onResetPagina={modoAdministrador ? () => setPagina(1) : undefined}
      />

      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {exitoMsg && (
        <div className="alert alert-success alert-dismissible fade show py-2 small" role="alert">
          {exitoMsg}
          <button
            type="button"
            className="btn-close py-2"
            onClick={() => setExitoMsg('')}
            aria-label="Cerrar"
          ></button>
        </div>
      )}

      {loading ? (
        <div className="text-muted py-4 small">Cargando panel de gestión...</div>
      ) : modoAdministrador ? (
        <>
          {filtrosActivos ? (
            renderGrupoAdmin(
              'Resultados de búsqueda',
              convenios,
              'No se encontraron convenios con los filtros seleccionados.'
            )
          ) : (
            <>
              <div className="filter-card p-3 mb-3 shadow-sm d-flex align-items-center gap-3">
                <div
                  className="fw-bold"
                  style={{ color: 'var(--unlpam-blue-btn)', fontSize: '1.6rem', lineHeight: 1 }}
                >
                  {paginacion.total}
                </div>
                <div>
                  <div className="fw-semibold text-dark">Convenios encontrados</div>
                  <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                    Agrupados según la operación pendiente.
                  </div>
                </div>
              </div>
              {renderGrupoAdmin(
                'Borradores: asignar revisor',
                conveniosAdminBorrador,
                'No hay borradores pendientes de asignación.'
              )}
              {renderGrupoAdmin(
                'Aprobados: registrar firma',
                conveniosAdminFirma,
                'No hay convenios aprobados pendientes de firma.'
              )}
              {renderGrupoAdmin(
                'Próximos a vencer: iniciar renovación',
                conveniosAdminRenovacion,
                'No hay convenios próximos a vencer.',
                renderTarjetaRenovacion
              )}

              <section className="mb-3">
                <h2 className="h6 fw-bold text-dark mb-2">Últimos convenios accedidos</h2>
                {ultimosVistos.length === 0 ? (
                  <div className="filter-card p-3 text-center text-muted small">
                    Aún no has consultado ningún convenio recientemente.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {ultimosVistos.map((conv) => (
                      <ConvenioActionCard
                        key={`reciente-${conv.id}`}
                        convenio={conv}
                        bordeColor="#0d5296"
                        onVerClick={registrarUltimoVisto}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
          {modoAdministrador && (
            <Pagination paginacion={paginacion} pagina={pagina} setPagina={setPagina} />
          )}
        </>
      ) : (
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
            <div className="d-flex flex-column gap-2 mb-3">
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
                        onClick={() => setModalRenovacion(conv)}
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

          {/* SECCIÓN 3: Últimos accedidos */}
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
                    bordeColor="#0d5296"
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* MODAL: Asignar Revisor */}
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

      {modalRenovacion && (
        <ModalRenovacion
          convenio={modalRenovacion}
          onClose={() => setModalRenovacion(null)}
          onRenovado={(respuesta) => {
            const convenioActualizado = respuesta?.data || respuesta;
            setConvenios((prev) =>
              prev.map((conv) =>
                conv.id === convenioActualizado.id ? { ...conv, ...convenioActualizado } : conv
              )
            );
            setConveniosProximosVencer((prev) =>
              prev.filter((conv) => conv.id !== convenioActualizado.id)
            );
            setExitoMsg(`El convenio ${convenioActualizado.codigo} fue renovado con éxito.`);
            setModalRenovacion(null);
          }}
        />
      )}

    </div>
  );
}