'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SearchFilters from '@/components/common/SearchFilters';
import StatusBadge from '@/components/common/StatusBadge';
import Pagination from '@/components/common/Pagination';

export default function InicioRevisor() {
    // Estados para los datos traídos desde la API de Laravel
    const [convenios, setConvenios] = useState([]);
    const [tiposInstrumento, setTiposInstrumento] = useState([]);
    const [ultimosVistos, setUltimosVistos] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [paginacion, setPaginacion] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Estados de los filtros de búsqueda
    const [q, setQ] = useState('');
    const [tipoId, setTipoId] = useState('');
    const [unidadId, setUnidadId] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [pagina, setPagina] = useState(1);

    // Estado para controlar qué filas padre están expandidas mostrando sus convenios hijos/adendas
    const [expandidos, setExpandidos] = useState({});

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

    // Cargar catálogos de filtros (Tipos de Instrumento y Unidades) al montar la pantalla
    useEffect(() => {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
  
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };
  
      Promise.all([
        fetch(`${apiUrl}/tipos-instrumento`, { headers }).then((r) => r.ok ? r.json() : []),
        fetch(`${apiUrl}/unidades`, { headers }).then((r) => r.ok ? r.json() : []),
      ])
        .then(([tiposData, unidadesData]) => {
          setTiposInstrumento(Array.isArray(tiposData) ? tiposData : tiposData.data || []);
          setUnidades(Array.isArray(unidadesData) ? unidadesData : unidadesData.data || []);
        })
        .catch((err) => console.error('Error cargando catálogos:', err));
    }, [apiUrl]);
  
    // Cargar convenios cada vez que cambian los filtros o la página
    useEffect(() => {
      const fetchConvenios = async () => {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('auth_token');
  
        try {
          // Armamos los parámetros de consulta que acepta ConvenioController@index
          const params = new URLSearchParams();
          params.append('page', pagina);
          params.append('estado', 'revision');
          if (q.trim()) params.append('q', q.trim());
          if (tipoId) params.append('tipo_instrumento_id', tipoId);
          if (fechaDesde) params.append('fecha_desde', fechaDesde);
          if (fechaHasta) params.append('fecha_hasta', fechaHasta);
  
          const response = await fetch(`${apiUrl}/convenios?${params.toString()}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
  
          if (!response.ok) {
            throw new Error('No se pudieron cargar los convenios.');
          }
  
          const result = await response.json();
  
          // Laravel paginate() devuelve los registros en result.data y metadatos en la raíz
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

    // Limpia todos los filtros
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

    // Alterna el desplegable de convenios relacionados (hijos)
    const toggleExpandir = (id) => {
        setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    // Devuelve la etiqueta exacta según el tipo de instrumento del convenio hijo (como en Figma)
    const obtenerEtiquetaRelacion = (hijo) => {
        const tipo = (hijo.tipo_instrumento?.nombre || '').toLowerCase();
        if (tipo.includes('específico') || tipo.includes('especifico')) return 'Específico de';
        if (tipo.includes('adenda')) return 'Adenda de';
        if (tipo.includes('renovación') || tipo.includes('renovacion')) return 'Renovación de';
        return 'Relacionado de';
    };

    // Formatea la vigencia del convenio (o indica si no tiene vencimiento registrado)
    const formatearVigencia = (conv) => {
        const fechaVenc = conv.fecha_vencimiento || conv.detalle_pasantia?.fecha_fin_pasantia;
        if (!fechaVenc) return 'Sin vencimiento registrado';

        // Convierte YYYY-MM-DD a DD/MM/YYYY
        const [anio, mes, dia] = fechaVenc.split('-');
        return `Vence ${dia}/${mes}/${anio}`;
    };

    const obtenerBadgeEstado = (estadoConvenio) => {
        const estadoNormalizado = (estadoConvenio || '').toLowerCase();
        const mapa = {
            firmado: { texto: 'Firmado', bg: '#dcfce7', color: '#166534' },
            revision: { texto: 'En revisión', bg: '#fef3c7', color: '#92400e' },
            aprobado: { texto: 'Aprobado', bg: '#dbeafe', color: '#1e40af' },
            borrador: { texto: 'Borrador', bg: '#f3f4f6', color: '#374151' },
            rescindido: { texto: 'Rescindido', bg: '#fee2e2', color: '#991b1b' },
            archivado: { texto: 'Archivado', bg: '#e5e7eb', color: '#4b5563' },
        };
        const info = mapa[estadoNormalizado] || {
            texto: estadoConvenio || 'Desconocido',
            bg: '#f3f4f6',
            color: '#374151',
        };

        return (
            <span
                className="badge rounded-pill fw-semibold px-3 py-1"
                style={{ backgroundColor: info.bg, color: info.color, fontSize: '0.78rem' }}
            >
                {info.texto}
            </span>
        );
    };

    // Genera y descarga un archivo CSV compatible con Excel en español (UTF-8 con BOM y separado por ;)
    const handleExportarCSV = () => {
        const encabezados = ['Código', 'Título', 'Tipo de Instrumento', 'Unidad', 'Estado', 'Vigencia'];
        const filas = convenios.map((c) => [
            `"${c.codigo}"`,
            `"${(c.titulo || '').replace(/"/g, '""')}"`,
            `"${c.tipo_instrumento?.nombre || 'Sin especificar'}"`,
            `"Ingeniería"`,
            `"${c.estado || 'Desconocido'}"`,
            `"${formatearVigencia(c)}"`,
        ]);

        // Usamos punto y coma (;) para que Excel en español separe cada dato en su columna
        const contenidoCSV = [
            encabezados.join(';'),
            ...filas.map((f) => f.join(';')),
        ].join('\n');

        // Agregamos '\uFEFF' (BOM UTF-8) al inicio para que Excel reconozca los acentos y la "ñ"
        const blob = new Blob(['\uFEFF' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'convenios_revision_unlpam.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Agrupamos convenios hijos bajo su convenio_padre_id si vienen en la misma lista
    const conveniosRaiz = convenios.filter((c) => !c.convenio_padre_id);
    const obtenerHijos = (padreId) => convenios.filter((c) => c.convenio_padre_id === padreId);

    // Renderiza recursivamente un convenio y todos sus niveles de hijos/nietos desplegables
    const renderizarFilasConvenio = (conv, nivel = 0) => {
        const hijos = obtenerHijos(conv.id);
        const estaExpandido = !!expandidos[conv.id];
        const esHijo = nivel > 0;

        return (
            <Fragment key={conv.id}>
                <tr style={esHijo ? { backgroundColor: nivel === 1 ? '#faf9f6' : '#f4f2ec' } : {}}>
                    <td>
                        <div
                            className="d-flex align-items-start gap-2"
                            style={{ paddingLeft: `${nivel * 24}px` }} // Sangría progresiva por nivel (0px, 24px, 48px...)
                        >
                            {/* Flecha desplegable si este convenio tiene hijos (incluso si él mismo ya es hijo) */}
                            {hijos.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => toggleExpandir(conv.id)}
                                    className="btn btn-sm p-0 border-0 text-primary"
                                    style={{ fontSize: '0.75rem', marginTop: '2px' }}
                                >
                                    {estaExpandido ? '▼' : '▶'}
                                </button>
                            ) : (
                                <span style={{ width: '12px' }}></span>
                            )}

                            <div>
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    {esHijo && (
                                        <span className="badge-relacion">{obtenerEtiquetaRelacion(conv)}</span>
                                    )}
                                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                        {conv.codigo}
                                    </span>
                                </div>
                                <div className="fw-bold text-dark">
                                    {conv.titulo}
                                </div>
                                {hijos.length > 0 && (
                                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                        {hijos.length} {hijos.length === 1 ? 'relacionado' : 'relacionados'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </td>
                    <td className="text-secondary">
                        {conv.tipo_instrumento?.nombre || 'Sin especificar'}
                    </td>
                    <td className="text-secondary">
                        Ingeniería
                    </td>
                    <td>
                        {obtenerBadgeEstado(conv.estado)}
                    </td>
                    <td className="text-secondary" style={{ fontSize: '0.8rem' }}>
                        {formatearVigencia(conv)}
                    </td>
                    <td className="text-end">
                        <Link
                            href={`/convenios/${conv.id}`}
                            className="text-decoration-none fw-semibold"
                            style={{ color: 'var(--unlpam-blue-btn)', fontSize: '0.82rem' }}
                        >
                            Ver
                        </Link>
                    </td>
                </tr>

                {/* Llamada recursiva: si está expandido, dibuja sus hijos (y si esos hijos tienen hijos, también) */}
                {estaExpandido && hijos.map((hijo) => renderizarFilasConvenio(hijo, nivel + 1))}
            </Fragment>
        );
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
           

            {/* Sub-barra: Contador total y botón Exportar CSV */}
            <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {paginacion.total} convenios en revisión disponibles
                </span>
                <button
                    type="button"
                    onClick={handleExportarCSV}
                    className="btn btn-link btn-sm text-muted text-decoration-none p-0"
                    style={{ fontSize: '0.8rem' }}
                    disabled={convenios.length === 0}
                >
                    Exportar CSV
                </button>
            </div>

            {/* Mensaje de error si falla la API */}
            {error && (
                <div className="alert alert-danger py-2 small">{error}</div>
            )}
            
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