'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import SearchFilters from '@/components/common/SearchFilters';
import StatusBadge from '@/components/common/StatusBadge';
import Pagination from '@/components/common/Pagination';

export default function InicioConsulta() {
    // Estados para los datos traídos desde la API de Laravel
    const [convenios, setConvenios] = useState([]);
    const [tiposInstrumento, setTiposInstrumento] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [paginacion, setPaginacion] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Estados de los filtros de búsqueda (para Consulta, 'estado' siempre es 'firmado')
    const [q, setQ] = useState('');
    const [tipoId, setTipoId] = useState('');
    const [unidadId, setUnidadId] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [pagina, setPagina] = useState(1);

    // Estado para controlar qué filas padre están expandidas mostrando sus convenios hijos/adendas
    const [expandidos, setExpandidos] = useState({});

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

    /* ================= INICIO CÓDIGO REAL DE LA API (DESCOMENTAR AL CONECTAR LARAVEL) =================
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
  
    // Cargar convenios firmados cada vez que cambian los filtros o la página
    useEffect(() => {
      const fetchConvenios = async () => {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('auth_token');
  
        try {
          // Armamos los parámetros de consulta que acepta ConvenioController@index
          const params = new URLSearchParams();
          params.append('estado', 'firmado'); // Regla de negocio: Consulta solo ve convenios firmados
          params.append('page', pagina);
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
            throw new Error('No se pudieron cargar los convenios firmados.');
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
  
    ================= FIN CÓDIGO REAL DE LA API ================= */

    // ================= DATOS ESTÁTICOS DE PRUEBA (BORRAR AL CONECTAR LARAVEL) =================
    useEffect(() => {
        setTiposInstrumento([
            { id: 1, nombre: 'Marco de colaboración' },
            { id: 2, nombre: 'Específico de pasantía' },
            { id: 3, nombre: 'Adenda' },
            { id: 4, nombre: 'Renovación' },
        ]);

        setUnidades([
            { id: 1, nombre: 'Ingeniería' },
        ]);

        const datosPrueba = [
            // --- CONVENIO PADRE 1 (con hijo y nieto) ---
            {
                id: 1,
                codigo: 'CONV-2025-001',
                titulo: 'Marco de colaboración · Universidad Ejemplo',
                estado: 'firmado',
                fecha_creacion: '2025-06-30',
                fecha_vencimiento: '2028-06-30',
                convenio_padre_id: null,
                tipo_instrumento: { id: 1, nombre: 'Marco de colaboración' },
            },
            {
                id: 2,
                codigo: 'CONV-2025-007',
                titulo: 'Práctica profesional supervisada',
                estado: 'firmado',
                fecha_creacion: '2025-12-31',
                fecha_vencimiento: '2026-12-31',
                convenio_padre_id: 1, // Hijo de 1 (Nivel 1) -> Mostrará "Específico de"
                tipo_instrumento: { id: 2, nombre: 'Específico de pasantía' },
            },
            {
                id: 3,
                codigo: 'CONV-2026-003',
                titulo: 'Amplía la carga horaria',
                estado: 'firmado',
                fecha_creacion: '2026-03-10',
                fecha_vencimiento: null,
                convenio_padre_id: 2, // Hijo de 2 / Nieto de 1 (Nivel 2) -> Mostrará "Adenda de"
                tipo_instrumento: { id: 3, nombre: 'Adenda' },
            },
            {
                id: 4,
                codigo: 'CONV-2026-010',
                titulo: 'Renovación del marco de colaboración',
                estado: 'firmado',
                fecha_creacion: '2026-04-01',
                fecha_vencimiento: null,
                convenio_padre_id: 1, // Otro hijo directo de 1 -> Mostrará "Renovación de"
                tipo_instrumento: { id: 4, nombre: 'Renovación' },
            },

            // --- MÁS CONVENIOS RAÍZ PARA PROBAR LA PAGINACIÓN ---
            {
                id: 5,
                codigo: 'CONV-2024-005',
                titulo: 'Marco de pasantías · Cooperativa Ejemplo',
                estado: 'firmado',
                fecha_creacion: '2025-03-15',
                fecha_vencimiento: '2027-03-15',
                convenio_padre_id: null,
                tipo_instrumento: { id: 1, nombre: 'Marco de colaboración' },
            },
            {
                id: 6,
                codigo: 'CONV-2024-012',
                titulo: 'Específico de asistencia técnica · Cooperativa',
                estado: 'firmado',
                fecha_creacion: '2025-04-20',
                fecha_vencimiento: '2026-11-30',
                convenio_padre_id: 5, // Hijo de 5
                tipo_instrumento: { id: 2, nombre: 'Específico de pasantía' },
            },
            {
                id: 7,
                codigo: 'CONV-2025-012',
                titulo: 'Específico de colaboración · Municipio Ejemplo',
                estado: 'firmado',
                fecha_creacion: '2025-09-01',
                fecha_vencimiento: '2027-09-01',
                convenio_padre_id: null,
                tipo_instrumento: { id: 2, nombre: 'Específico de pasantía' },
            },
            {
                id: 8,
                codigo: 'CONV-2025-018',
                titulo: 'Marco de investigación · INTA Anguil',
                estado: 'firmado',
                fecha_creacion: '2025-05-10',
                fecha_vencimiento: '2029-05-10',
                convenio_padre_id: null,
                tipo_instrumento: { id: 1, nombre: 'Marco de colaboración' },
            },
            {
                id: 9,
                codigo: 'CONV-2025-021',
                titulo: 'Pasantía sistemas · Empresa Tech Pico',
                estado: 'firmado',
                fecha_creacion: '2025-08-15',
                fecha_vencimiento: '2026-08-15',
                convenio_padre_id: null,
                tipo_instrumento: { id: 2, nombre: 'Específico de pasantía' },
            },
            {
                id: 10,
                codigo: 'CONV-2025-025',
                titulo: 'Marco de extensión · Colegio de Ingenieros',
                estado: 'firmado',
                fecha_creacion: '2025-10-01',
                fecha_vencimiento: '2028-10-01',
                convenio_padre_id: null,
                tipo_instrumento: { id: 1, nombre: 'Marco de colaboración' },
            },
            {
                id: 11,
                codigo: 'CONV-2026-002',
                titulo: 'Pasantía electromecánica · Metalúrgica Pampeana',
                estado: 'firmado',
                fecha_creacion: '2026-02-01',
                fecha_vencimiento: '2027-02-01',
                convenio_padre_id: null,
                tipo_instrumento: { id: 2, nombre: 'Específico de pasantía' },
            },
            {
                id: 12,
                codigo: 'CONV-2026-008',
                titulo: 'Marco de capacitación · Cámara de Comercio',
                estado: 'firmado',
                fecha_creacion: '2026-03-15',
                fecha_vencimiento: '2028-03-15',
                convenio_padre_id: null,
                tipo_instrumento: { id: 1, nombre: 'Marco de colaboración' },
            },
            {
                id: 13,
                codigo: 'CONV-2026-014',
                titulo: 'Específico desarrollo software · Banco de La Pampa',
                estado: 'firmado',
                fecha_creacion: '2026-05-01',
                fecha_vencimiento: '2027-12-31',
                convenio_padre_id: null,
                tipo_instrumento: { id: 2, nombre: 'Específico de pasantía' },
            },
        ];

        // Filtramos por texto y tipo
        const filtrados = datosPrueba.filter((item) => {
            const coincideTexto =
                !q ||
                item.titulo.toLowerCase().includes(q.toLowerCase()) ||
                item.codigo.toLowerCase().includes(q.toLowerCase());
            const coincideTipo = !tipoId || String(item.tipo_instrumento.id) === String(tipoId);
            return coincideTexto && coincideTipo;
        });

        // Guardamos todos los filtrados para mantener el árbol padre-hijo intacto y paginamos sobre los raíz
        setConvenios(filtrados);

        const raices = filtrados.filter((c) => !c.convenio_padre_id);
        const porPagina = 5; // Mostramos 5 convenios padre por página para que veas páginas 1, 2 y 3
        const totalRaices = raices.length;
        const totalPaginas = Math.max(1, Math.ceil(totalRaices / porPagina));
        const paginaSegura = Math.min(pagina, totalPaginas);
        const desde = totalRaices === 0 ? 0 : (paginaSegura - 1) * porPagina + 1;
        const hasta = Math.min(paginaSegura * porPagina, totalRaices);

        setPaginacion({
            current_page: paginaSegura,
            last_page: totalPaginas,
            total: totalRaices,
            from: desde,
            to: hasta,
        });
        setLoading(false);
    }, [q, tipoId, unidadId, fechaDesde, fechaHasta, pagina]);

    // ================= FIN DATOS ESTÁTICOS DE PRUEBA (BORRAR AL CONECTAR LARAVEL) =================


    // Limpia todos los filtros manteniendo la restricción de estado 'firmado'
    const handleLimpiarFiltros = () => {
        setQ('');
        setTipoId('');
        setUnidadId('');
        setFechaDesde('');
        setFechaHasta('');
        setPagina(1);
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

    // Genera y descarga un archivo CSV compatible con Excel en español (UTF-8 con BOM y separado por ;) (neutralizando fórmulas)
    const handleExportarCSV = () => {
        const sanitizarCelda = (val) => {
        const texto = String(val ?? '').replace(/"/g, '""');
        const seguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
        return `"${seguro}"`;
        };

        const encabezados = ['Código', 'Título', 'Tipo de Instrumento', 'Unidad', 'Estado', 'Vigencia'];
        const filas = convenios.map((c) => [
            sanitizarCelda(c.codigo),
            sanitizarCelda(c.titulo),
            sanitizarCelda(c.tipo_instrumento?.nombre || 'Sin especificar'),
            sanitizarCelda('Ingeniería'),
            sanitizarCelda('Firmado'),
            sanitizarCelda(formatearVigencia(c)),
        ]);

        // Agregamos '\uFEFF' (BOM UTF-8) al inicio para que Excel reconozca los acentos y la "ñ"
        const contenidoCSV = [encabezados.join(';'), ...filas.map((f) => f.join(';'))].join('\n');
        const blob = new Blob(['\uFEFF' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'convenios_firmados_unlpam.csv');
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
                    <td className="text-secondary">Ingeniería</td>
                    <td>
                        <StatusBadge estado={conv.estado} />
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
            <h1 className="page-title mb-3">Convenios Firmados</h1>

            {/* Barra de Filtros */}
            <SearchFilters
                rol="consulta"
                q={q}
                setQ={setQ}
                tipoId={tipoId}
                setTipoId={setTipoId}
                estado="firmado"
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
                    {paginacion.total} convenios firmados disponibles
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
                                        Cargando convenios firmados...
                                    </td>
                                </tr>
                            ) : convenios.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4 text-muted">
                                        No se encontraron convenios firmados con los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                // Paginamos sobre los convenios raíz (de a 5 en modo prueba) y cada uno despliega sus hijos/nietos
                                (conveniosRaiz.length > 0 ? conveniosRaiz : convenios)
                                    // ================= DATOS ESTÁTICOS DE PRUEBA (BORRAR AL CONECTAR LARAVEL) =================
                                    .slice((pagina - 1) * 5, pagina * 5)
                                    // ================= FIN DATOS ESTÁTICOS DE PRUEBA (BORRAR AL CONECTAR LARAVEL) =================
                                    .map((conv) => renderizarFilasConvenio(conv, 0))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pie de Paginación */}
            <Pagination paginacion={paginacion} pagina={pagina} setPagina={setPagina} />
        </div>
    );
}