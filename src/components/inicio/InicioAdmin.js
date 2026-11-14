'use client';

import { Fragment, useEffect, useState } from 'react';
import SearchFilters from '@/components/common/SearchFilters';
import Link from 'next/link';

export default function InicioAdmin() {
    // Estados para los datos traídos desde la API de Laravel
    const [convenios, setConvenios] = useState([]);
    const [tiposInstrumento, setTiposInstrumento] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [paginacion, setPaginacion] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Estados de los filtros de búsqueda
    const [q, setQ] = useState('');
    const [tipoId, setTipoId] = useState('');
    const [unidadId, setUnidadId] = useState('');
    const [estado, setEstado] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [pagina, setPagina] = useState(1);

    // Estado para controlar qué filas padre están expandidas mostrando sus convenios hijos/adendas
    const [expandidos, setExpandidos] = useState({});

    // Limpia todos los filtros
    const handleLimpiarFiltros = () => {
        setQ('');
        setTipoId('');
        setUnidadId('');
        setEstado('');
        setFechaDesde('');
        setFechaHasta('');
        setPagina(1);
    };

    
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

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

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
          if (estado) params.append('estado', estado);
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
    }, [apiUrl, q, tipoId, unidadId, estado, fechaDesde, fechaHasta, pagina]);

    

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
        link.setAttribute('download', 'convenios_unlpam.csv');
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
            <div className="filter-card p-3 mb-3 shadow-sm">
                <div className="row g-2 align-items-end">
                    {/* Buscador más compacto (3 columnas en lugar de 4) */}
                    <div className="col-12 col-lg-3">
                        <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: '0.75rem' }}>
                            Buscar
                        </label>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Código, título o entidad"
                            value={q}
                            onChange={(e) => { setQ(e.target.value); setPagina(1); }}
                        />
                    </div>

                    {/* Filtro por Tipo de Instrumento */}
                    <div className="col-6 col-md-3 col-lg">
                        <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: '0.75rem' }}>
                            Tipo
                        </label>
                        <select
                            className="form-select form-select-sm"
                            value={tipoId}
                            onChange={(e) => { setTipoId(e.target.value); setPagina(1); }}
                        >
                            <option value="">Todos</option>
                            {tiposInstrumento.map((t) => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro de Estado */}
                    <div className="col-6 col-md-3 col-lg-auto" style={{ minWidth: '115px' }}>
                        <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: '0.75rem' }}>
                            Estado
                        </label>
                        <select
                            className="form-select form-select-sm"
                            value={estado}
                            onChange={(e) => { setEstado(e.target.value); setPagina(1); }}
                        >
                            <option value="">Todos</option>
                            <option value="firmado">Firmado</option>
                            <option value="revision">En revisión</option>
                            <option value="aprobado">Aprobado</option>
                            <option value="borrador">Borrador</option>
                            <option value="rescindido">Rescindido</option>
                            <option value="archivado">Archivado</option>
                        </select>
                    </div>

                    {/* Filtro por Unidad Responsable */}
                    <div className="col-6 col-md-3 col-lg">
                        <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: '0.75rem' }}>
                            Unidad
                        </label>
                        <select
                            className="form-select form-select-sm"
                            value={unidadId}
                            onChange={(e) => { setUnidadId(e.target.value); setPagina(1); }}
                        >
                            <option value="">Todas</option>
                            {unidades.map((u) => (
                                <option key={u.id} value={u.id}>{u.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro Fecha Desde (ancho suficiente para ver dd/mm/aaaa completo) */}
                    <div className="col-6 col-md-3 col-lg-auto" style={{ minWidth: '135px' }}>
                        <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: '0.75rem' }}>
                            Firma desde
                        </label>
                        <input
                            type="date"
                            className="form-control form-control-sm"
                            value={fechaDesde}
                            onChange={(e) => { setFechaDesde(e.target.value); setPagina(1); }}
                        />
                    </div>

                    {/* Filtro Fecha Hasta (ancho suficiente para ver dd/mm/aaaa completo) */}
                    <div className="col-6 col-md-3 col-lg-auto" style={{ minWidth: '135px' }}>
                        <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: '0.75rem' }}>
                            Firma hasta
                        </label>
                        <input
                            type="date"
                            className="form-control form-control-sm"
                            value={fechaHasta}
                            onChange={(e) => { setFechaHasta(e.target.value); setPagina(1); }}
                        />
                    </div>

                    {/* Botón Limpiar Filtros ajustado a su texto */}
                    <div className="col-6 col-md-3 col-lg-auto text-end">
                        <button
                            type="button"
                            onClick={handleLimpiarFiltros}
                            className="btn btn-link btn-sm text-decoration-none fw-semibold px-1 mb-1 text-nowrap"
                            style={{ color: 'var(--unlpam-blue-btn)', fontSize: '0.78rem' }}
                        >
                            Limpiar filtros
                        </button>
                    </div>
                </div>
            </div>

            {/* Sub-barra: Contador total y botón Exportar CSV */}
            <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {paginacion.total} convenios disponibles
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

            {/* Tabla Principal de Convenios */}
            <div className="table-card shadow-sm mb-3">
                <div className="table-responsive">
                    <table className="table table-hover mb-0">
                        <thead>
                            <tr>
                                <th style={{ width: '42%' }}>Convenio</th>
                                <th style={{ width: '18%' }}>Tipo</th>
                                <th style={{ width: '13%' }}>Unidad</th>
                                <th style={{ width: '11%' }}>Estado</th>
                                <th style={{ width: '11%' }}>Vigencia</th>
                                <th style={{ width: '5%' }} className="text-end"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4 text-muted">
                                        Cargando convenios...
                                    </td>
                                </tr>
                            ) : convenios.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4 text-muted">
                                        No se encontraron convenios con los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                // La API ya pagina los resultados; se muestran todos los registros de esta página.
                                (conveniosRaiz.length > 0 ? conveniosRaiz : convenios)
                                    .map((conv) => renderizarFilasConvenio(conv, 0))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pie de Paginación */}
            <div className="d-flex justify-content-between align-items-center px-1">
                <span className="text-muted" style={{ fontSize: '0.78rem' }}>
                    Mostrando {paginacion.from || 0}–{paginacion.to || 0} de {paginacion.total}
                </span>

                <nav>
                    <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${pagina <= 1 ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => setPagina(pagina - 1)}>
                                ‹
                            </button>
                        </li>
                        {Array.from({ length: paginacion.last_page }, (_, i) => i + 1).map((num) => (
                            <li key={num} className={`page-item ${pagina === num ? 'active' : ''}`}>
                                <button
                                    className="page-link"
                                    style={pagina === num ? { backgroundColor: 'var(--unlpam-blue-btn)', borderColor: 'var(--unlpam-blue-btn)' } : {}}
                                    onClick={() => setPagina(num)}
                                >
                                    {num}
                                </button>
                            </li>
                        ))}
                        <li className={`page-item ${pagina >= paginacion.last_page ? 'disabled' : ''}`}>
                            <button className="page-link" onClick={() => setPagina(pagina + 1)}>
                                ›
                            </button>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>
    );
}