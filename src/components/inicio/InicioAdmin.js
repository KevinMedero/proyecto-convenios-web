'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SearchFilters from '@/components/common/SearchFilters';
import Pagination from '@/components/common/Pagination';
import ConvenioActionCard from '@/components/common/ConvenioActionCard';

export default function InicioAdmin() {
    // Estados principales de datos, catálogos y paginación
    const [convenios, setConvenios] = useState([]);
    const [tiposInstrumento, setTiposInstrumento] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [paginacion, setPaginacion] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Estados de los filtros de búsqueda (el Admin visualiza todos los estados del sistema)
    const [q, setQ] = useState('');
    const [tipoId, setTipoId] = useState('');
    const [unidadId, setUnidadId] = useState('');
    const [estado, setEstado] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [pagina, setPagina] = useState(1);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

    // Carga los catálogos de tipos de instrumento y unidades al montar la pantalla
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

    // Consulta los convenios desde Laravel cada vez que cambian los filtros o la página
    useEffect(() => {
        const fetchConvenios = async () => {
            setLoading(true);
            setError('');
            const token = localStorage.getItem('auth_token');

            try {
                const params = new URLSearchParams();
                params.append('page', pagina);
                if (estado) params.append('estado', estado);
                if (q.trim()) params.append('q', q.trim());
                if (tipoId) params.append('tipo_instrumento_id', tipoId);
                if (unidadId) params.append('unidad_id', unidadId);
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

    // Restablece todos los filtros y vuelve a la página 1
    const handleLimpiarFiltros = () => {
        setQ('');
        setTipoId('');
        setUnidadId('');
        setEstado('');
        setFechaDesde('');
        setFechaHasta('');
        setPagina(1);
    };

    // Define borde izquierdo, insignia secundaria y acción primaria según el estado del convenio
    const obtenerConfigTarjetaAdmin = (conv) => {
        const est = (conv.estado || '').toLowerCase();
        const historial = conv.historial_estados || [];

        // Caso 1: Convenios en revisión (evalúa si fue reenviado o lleva 15+ días esperando)
        if (est === 'revision') {
            const vecesEnRevision = historial.filter((h) => h.estado_nuevo === 'revision').length;
            if (vecesEnRevision > 1) {
                return {
                    bordeColor: '#eab308',
                    badgeTexto: '• Reenviado tras corrección',
                    badgeBg: '#fef3c7',
                    badgeColor: '#92400e',
                    accionTexto: 'Revisar',
                    accionHref: `/convenios/${conv.id}/revisar`,
                };
            }

            const ultimoPasoRevision = [...historial].reverse().find((h) => h.estado_nuevo === 'revision');
            const fechaBase = ultimoPasoRevision?.fecha_cambio || conv.fecha_creacion;
            const dias = fechaBase
                ? Math.max(0, Math.floor((new Date() - new Date(fechaBase)) / (1000 * 60 * 60 * 24)))
                : 0;

            if (dias >= 15) {
                return {
                    bordeColor: '#b91c1c',
                    badgeTexto: `▲ En revisión hace ${dias} días`,
                    badgeBg: '#fee2e2',
                    badgeColor: '#991b1b',
                    accionTexto: 'Revisar',
                    accionHref: `/convenios/${conv.id}/revisar`,
                };
            }

            return {
                bordeColor: '#d1d5db',
                badgeTexto: dias === 0 ? '• Ingresado hoy' : `• Ingresado hace ${dias} ${dias === 1 ? 'día' : 'días'}`,
                badgeBg: '#e5e7eb',
                badgeColor: '#374151',
                accionTexto: 'Revisar',
                accionHref: `/convenios/${conv.id}/revisar`,
            };
        }

        // Caso 2: Convenios firmados (evalúa alertas de vencimiento próximo o preaviso)
        if (est === 'firmado') {
            const fechaVenc = conv.fecha_vencimiento || conv.detalle_pasantia?.fecha_fin_pasantia;
            if (fechaVenc) {
                const dias = Math.ceil((new Date(fechaVenc) - new Date()) / (1000 * 60 * 60 * 24));
                if (dias >= 0 && dias <= 15) {
                    return {
                        bordeColor: '#b91c1c',
                        badgeTexto: `▲ Vence en ${dias} días`,
                        badgeBg: '#fee2e2',
                        badgeColor: '#991b1b',
                        accionTexto: 'Iniciar renovación',
                        accionHref: `/convenios/nuevo?padre_id=${conv.id}`,
                    };
                }
                if (dias > 15 && dias <= 45) {
                    return {
                        bordeColor: '#eab308',
                        badgeTexto: `• Preaviso en ${dias - 15} días`,
                        badgeBg: '#fef3c7',
                        badgeColor: '#92400e',
                        accionTexto: 'Iniciar renovación',
                        accionHref: `/convenios/nuevo?padre_id=${conv.id}`,
                    };
                }
            }
            return {
                bordeColor: '#d1d5db',
                badgeTexto: '',
                accionTexto: 'Iniciar renovación',
                accionHref: `/convenios/nuevo?padre_id=${conv.id}`,
            };
        }

        // Caso 3: Convenios aprobados pendientes de registrar firma
        if (est === 'aprobado') {
            return {
                bordeColor: '#eab308',
                badgeTexto: '• Falta registrar la firma',
                badgeBg: '#fef3c7',
                badgeColor: '#92400e',
                accionTexto: 'Registrar firma',
                accionHref: `/convenios/${conv.id}`,
            };
        }

        // Caso 4: Borradores (distingue entre devuelto con observaciones o borrador inicial)
        if (est === 'borrador') {
            const fueDevuelto = historial.some(
                (h) => h.estado_anterior === 'revision' && h.estado_nuevo === 'borrador'
            );
            if (fueDevuelto) {
                return {
                    bordeColor: '#b91c1c',
                    badgeTexto: '▲ Devuelto con observaciones',
                    badgeBg: '#fee2e2',
                    badgeColor: '#991b1b',
                    accionTexto: 'Corregir',
                    accionHref: `/convenios/${conv.id}/editar`,
                };
            }
            return {
                bordeColor: '#d1d5db',
                badgeTexto: '',
                accionTexto: 'Asignar revisor',
                accionHref: `/convenios/${conv.id}`,
            };
        }

        // Caso por defecto (rescindido, archivado, etc.)
        return {
            bordeColor: '#d1d5db',
            badgeTexto: '',
            accionTexto: '',
            accionHref: '',
        };
    };

    return (
        <div>
            {/* Encabezado principal con acceso directo a crear un convenio */}
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

            {/* Barra de filtros con todos los estados habilitados */}
            <SearchFilters
                rol="administracion"
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

            {/* Mensaje de error si falla la petición */}
            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            {/* Título de sección y contador de resultados */}
            <div className="d-flex justify-content-between align-items-center mb-2 mt-2">
                <h2 className="h6 fw-bold text-dark mb-0">Convenios del sistema</h2>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {paginacion.total} {paginacion.total === 1 ? 'convenio disponible' : 'convenios disponibles'}
                </span>
            </div>

            {/* Listado de tarjetas de acción */}
            {loading ? (
                <div className="text-muted py-4 small">Cargando convenios...</div>
            ) : convenios.length === 0 ? (
                <div className="filter-card p-4 text-center text-muted small mb-3">
                    No se encontraron convenios con los filtros seleccionados.
                </div>
            ) : (
                <div className="d-flex flex-column gap-2 mb-3">
                    {convenios.map((conv) => {
                        const cfg = obtenerConfigTarjetaAdmin(conv);
                        return (
                            <ConvenioActionCard
                                key={conv.id}
                                convenio={conv}
                                bordeColor={cfg.bordeColor}
                                badgeTexto={cfg.badgeTexto}
                                badgeBg={cfg.badgeBg}
                                badgeColor={cfg.badgeColor}
                                accionPrimariaTexto={cfg.accionTexto}
                                accionPrimariaHref={cfg.accionHref}
                            />
                        );
                    })}
                </div>
            )}

            {/* Controles de paginación */}
            <Pagination paginacion={paginacion} pagina={pagina} setPagina={setPagina} />
        </div>
    );
}