'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

/* =====================================================================
   HELPERS (funciones puras, sin React)
   ===================================================================== */

const estadoDe = (c) => (c.estado || '').toLowerCase();

// 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm...' -> Date local (evita el desfase de un día por zona horaria)
const aFecha = (valor) => {
    if (!valor) return null;
    const solo = String(valor).split('T')[0].split(' ')[0];
    const [anio, mes, dia] = solo.split('-').map(Number);
    if (!anio || !mes || !dia) return null;
    return new Date(anio, mes - 1, dia);
};


const anioDeFecha = (valor) => {
    const f = aFecha(valor);
    return f ? String(f.getFullYear()) : null;
};

// Vencimiento: el del convenio o, si es una pasantía, el fin de la pasantía.
// En la tabla detalle_pasantias la columna se llama "fecha_fin".
const fechaVencimientoDe = (c) =>
    c.fecha_vencimiento || c.detalle_pasantia?.fecha_fin || c.detalle_pasantia?.fecha_fin_pasantia || null;

// Año de firma = año en que el historial registra el paso a "firmado"
const anioFirma = (c) => {
    const paso = [...(c.historial_estados || [])].reverse().find((h) => h.estado_nuevo === 'firmado');
    return anioDeFecha(c.fecha_firma || paso?.fecha_cambio);
};

// Años en que el convenio salió de revisión (aprobado o devuelto a borrador)
const aniosDeRevision = (c) =>
    (c.historial_estados || [])
        .filter((h) => h.estado_anterior === 'revision' && h.estado_nuevo !== 'revision' && h.fecha_cambio)
        .map((h) => anioDeFecha(h.fecha_cambio))
        .filter(Boolean);

// Año en que el convenio entró a revisión por última vez
const anioIngresoRevision = (c) => {
    const paso = [...(c.historial_estados || [])].reverse().find((h) => h.estado_nuevo === 'revision');
    return anioDeFecha(paso?.fecha_cambio);
};

// Unidades de un convenio = unidades de sus representantes (sin repetir)
const obtenerUnidadesIds = (c) => [
    ...new Set(
        (c.representantes || [])
            .map((r) => r.unidad_responsable_id)
            .filter((id) => id !== null && id !== undefined)
            .map(String)
    ),
];

// Convierte {año -> cantidad} en serie ordenada, rellenando los años intermedios con 0
const serieAnual = (mapa) => {
    const anios = [...mapa.keys()].map(Number);
    if (anios.length === 0) return [];
    const min = Math.min(...anios);
    const max = Math.max(...anios);
    const serie = [];
    for (let a = min; a <= max; a += 1) {
        serie.push({ anio: String(a), cantidad: mapa.get(String(a)) || 0 });
    }
    return serie;
};

/* =====================================================================
   SUBCOMPONENTES VISUALES
   ===================================================================== */

// Tarjeta de barras horizontales
function TarjetaBarrasHorizontales({ titulo, subtitulo, items, colorBarra }) {
    const maxValor = Math.max(1, ...items.map((i) => i.cantidad));

    return (
        <div className="bg-white rounded-3 border p-4 shadow-sm h-100" style={{ borderColor: '#e5e7eb' }}>
            <h3 className="fw-bold text-dark mb-0" style={{ fontSize: '0.95rem' }}>{titulo}</h3>
            <p className="text-muted mb-3" style={{ fontSize: '0.75rem' }}>{subtitulo}</p>

            {items.length === 0 ? (
                <div className="text-muted small py-2">No hay datos para los filtros seleccionados.</div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {items.map((item, idx) => {
                        const porcentaje = item.cantidad === 0 ? 0 : Math.max(4, Math.round((item.cantidad / maxValor) * 100));
                        return (
                            <div key={`${item.nombre}-${idx}`} className="d-flex align-items-center gap-3">
                                <div className="text-dark flex-shrink-0" style={{ width: '36%', fontSize: '0.78rem', lineHeight: '1.25' }}>
                                    {item.nombre}
                                </div>
                                <div className="flex-grow-1 rounded-pill overflow-hidden" style={{ height: '10px', backgroundColor: '#eef2f6' }}>
                                    <div
                                        className="h-100 rounded-pill"
                                        style={{ width: `${porcentaje}%`, backgroundColor: colorBarra, transition: 'width 0.3s ease' }}
                                    />
                                </div>
                                <div className="fw-bold text-dark text-end flex-shrink-0" style={{ width: '32px', fontSize: '0.8rem' }}>
                                    {item.cantidad}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Tarjeta de columnas verticales por año
function TarjetaBarrasAnuales({ titulo, subtitulo, serie }) {
    const maxValor = Math.max(1, ...serie.map((s) => s.cantidad));

    return (
        <div className="bg-white rounded-3 border p-4 shadow-sm h-100" style={{ borderColor: '#e5e7eb' }}>
            <h3 className="fw-bold text-dark mb-0" style={{ fontSize: '0.95rem' }}>{titulo}</h3>
            <p className="text-muted mb-4" style={{ fontSize: '0.75rem' }}>{subtitulo}</p>

            {serie.length === 0 ? (
                <div className="text-muted small py-2">No hay datos para los filtros seleccionados.</div>
            ) : (
                <div className="d-flex align-items-end justify-content-around gap-2 pt-3 px-2" style={{ height: '170px' }}>
                    {serie.map((punto) => {
                        const alturaPx = punto.cantidad === 0 ? 4 : Math.max(14, Math.round((punto.cantidad / maxValor) * 115));
                        return (
                            <div key={punto.anio} className="d-flex flex-column align-items-center">
                                <span className="fw-bold text-dark mb-1" style={{ fontSize: '0.75rem' }}>{punto.cantidad}</span>
                                <div
                                    style={{
                                        width: '38px',
                                        height: `${alturaPx}px`,
                                        backgroundColor: '#ca8a04',
                                        borderRadius: '5px 5px 2px 2px',
                                        transition: 'height 0.3s ease',
                                    }}
                                />
                                <span className="text-muted mt-2" style={{ fontSize: '0.72rem' }}>{punto.anio}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* =====================================================================
   PÁGINA
   ===================================================================== */

export default function EstadisticasPage() {
    // Usuario autenticado y su rol ('administracion', 'gestion', 'revision', 'consulta')
    const [usuario, setUsuario] = useState(null);
    const [rol, setRol] = useState('consulta');

    // Datos de la API
    const [convenios, setConvenios] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [tiposInstrumento, setTiposInstrumento] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filtros superiores
    const [anioFiltro, setAnioFiltro] = useState('todos');
    const [unidadFiltro, setUnidadFiltro] = useState('todas');
    const [tipoFiltro, setTipoFiltro] = useState('todos');

    // Detecta usuario y rol desde localStorage al montar
    useEffect(() => {
        try {
            const rawUser = JSON.parse(localStorage.getItem('user_data') || localStorage.getItem('user') || '{}');
            const rawRol = typeof rawUser?.rol === 'string' ? rawUser.rol : rawUser?.rol?.nombre || 'consulta';
            const normalizado = rawRol.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            setUsuario(rawUser);
            if (normalizado.includes('admin')) setRol('administracion');
            else if (normalizado.includes('gest')) setRol('gestion');
            else if (normalizado.includes('revis')) setRol('revision');
            else setRol('consulta');
        } catch {
            setUsuario({});
            setRol('consulta');
        }
    }, []);

    // Carga convenios (todas las páginas), unidades y tipos de instrumento
    useEffect(() => {
        const cargarDatos = async () => {
            setLoading(true);
            setError('');
            const token = localStorage.getItem('auth_token');
            if (!token) {
                setLoading(false);
                return;
            }

            const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

            // /convenios viene paginado (máximo 50 por página): se recorren todas las páginas
            const traerTodosLosConvenios = async () => {
                const acumulado = [];
                let pagina = 1;
                let ultima = 1;
                do {
                    const res = await fetch(`${apiUrl}/convenios?por_pagina=50&page=${pagina}`, { headers });

                    if (res.status === 401) {
                        localStorage.removeItem('auth_token');
                        window.location.href = '/';
                        return [];
                    }

                    if (!res.ok) throw new Error('No se pudieron obtener los datos de estadísticas.');
                    const json = await res.json();
                    acumulado.push(...(Array.isArray(json) ? json : json.data || []));
                    ultima = Array.isArray(json) ? 1 : json.last_page || 1;
                    pagina += 1;
                } while (pagina <= ultima && pagina <= 200);
                return acumulado;
            };

            try {
                // 1. Traemos el listado paginado, unidades y tipos en paralelo
                const [listaBase, unidRes, tiposRes] = await Promise.all([
                    traerTodosLosConvenios(),
                    fetch(`${apiUrl}/unidades`, { headers }),
                    fetch(`${apiUrl}/tipos-instrumento`, { headers }),
                ]);

                if (unidRes.status === 401 || tiposRes.status === 401) {
                    localStorage.removeItem('auth_token');
                    window.location.href = '/login';
                    return;
                }

                const unidJson = unidRes.ok ? await unidRes.json() : [];
                const tiposJson = tiposRes.ok ? await tiposRes.json() : [];

                setUnidades(Array.isArray(unidJson) ? unidJson : unidJson.data || []);
                setTiposInstrumento(Array.isArray(tiposJson) ? tiposJson : tiposJson.data || []);

                // 2. Se usa la API que incluyó las relaciones en /convenios para traer 'representantes', 'historialEstados' 
                // y 'detallePasantia',
                const conveniosCompletos = await Promise.all(
                    listaBase.map(async (c) => {
                        if (Array.isArray(c.representantes) && Array.isArray(c.historial_estados)) {
                            return c;
                        }
                        try {
                            const r = await fetch(`${apiUrl}/convenios/${c.id}`, { headers });
                            return r.ok ? await r.json() : c;
                        } catch {
                            return c;
                        }
                    })
                );

                setConvenios(conveniosCompletos);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        cargarDatos();
    }, []);

    // Unidad fija del Revisor: solo si el usuario trae una (hoy la tabla users no tiene unidad)
    const unidadFijaId = useMemo(() => {
        if (rol !== 'revision') return null;
        const id = usuario?.unidad_responsable_id ?? usuario?.unidad_id ?? usuario?.unidad?.id ?? null;
        return id === null || id === undefined ? null : String(id);
    }, [rol, usuario]);

    const nombrePorUnidadId = useMemo(
        () => new Map(unidades.map((u) => [String(u.id), u.nombre])),
        [unidades]
    );

    const nombreUnidadFija = unidadFijaId ? nombrePorUnidadId.get(unidadFijaId) || `Unidad ${unidadFijaId}` : null;
    const unidadEfectiva = unidadFijaId ?? unidadFiltro;

    // Año de referencia del filtro: firma (resto de roles) o ingreso a revisión (Revisor)
    const anioReferencia = useCallback(
        (c) => (rol === 'revision' ? anioIngresoRevision(c) : anioFirma(c)),
        [rol]
    );

    // Cumple los filtros de tipo y unidad (el filtro de año se aplica aparte)
    const cumpleTipoUnidad = useCallback(
        (c) => {
            if (tipoFiltro !== 'todos' && String(c.tipo_instrumento_id) !== String(tipoFiltro)) return false;
            if (unidadEfectiva !== 'todas' && !obtenerUnidadesIds(c).includes(String(unidadEfectiva))) return false;
            return true;
        },
        [tipoFiltro, unidadEfectiva]
    );

    // 1. Alcance permitido para cada rol
    const conveniosPorAlcanceRol = useMemo(() => {
        return convenios.filter((c) => {
            const est = estadoDe(c);
            if (rol === 'consulta') return est === 'firmado';
            if (rol === 'gestion') return est !== 'revision';
            if (rol === 'revision') return est === 'revision';
            return true; // administracion ve todos
        });
    }, [convenios, rol]);

    // Años disponibles para el selector (solo los que existen en los datos)
    const aniosDisponibles = useMemo(() => {
        const anios = new Set();
        conveniosPorAlcanceRol.forEach((c) => {
            const a = anioReferencia(c);
            if (a) anios.add(a);
        });
        return [...anios].sort();
    }, [conveniosPorAlcanceRol, anioReferencia]);

    // 2. Aplica los filtros de la barra superior
    const conveniosFiltrados = useMemo(() => {
        return conveniosPorAlcanceRol.filter((c) => {
            if (!cumpleTipoUnidad(c)) return false;
            if (anioFiltro !== 'todos' && anioReferencia(c) !== anioFiltro) return false;
            return true;
        });
    }, [conveniosPorAlcanceRol, cumpleTipoUnidad, anioFiltro, anioReferencia]);

    // Todos los indicadores y series de gráficos
    const metricas = useMemo(() => {
        const hoy = new Date();
        const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const en90Dias = new Date(inicioHoy);
        en90Dias.setDate(en90Dias.getDate() + 90);
        const anioActual = String(hoy.getFullYear());

        // Conteo por estado
        const conteoEstados = { borrador: 0, revision: 0, aprobado: 0, firmado: 0, rescindido: 0, archivado: 0 };
        conveniosFiltrados.forEach((c) => {
            const est = estadoDe(c);
            if (Object.prototype.hasOwnProperty.call(conteoEstados, est)) conteoEstados[est] += 1;
        });

        // Vigencia de convenios firmados
        const firmados = conveniosFiltrados.filter((c) => estadoDe(c) === 'firmado');
        let vigentes = 0; // más de 90 días
        let porVencer90 = 0; // entre hoy y 90 días
        let vencidos = 0;
        let sinVencimiento = 0;

        firmados.forEach((c) => {
            const venc = aFecha(fechaVencimientoDe(c));
            if (!venc) sinVencimiento += 1;
            else if (venc < inicioHoy) vencidos += 1;
            else if (venc <= en90Dias) porVencer90 += 1;
            else vigentes += 1;
        });

        // Personas únicas: estudiantes y tutores vinculados (detalle_pasantia) a los convenios del alcance
        const idsPersonas = new Set();
        conveniosFiltrados.forEach((c) => {
            const d = c.detalle_pasantia;
            [d?.estudiante_id, d?.tutor_academico_id, d?.tutor_guia_id].forEach((id) => {
                if (id) idsPersonas.add(id);
            });
            (c.representantes || []).forEach((r) => {
                const pId = r.persona_id ?? r.persona?.id;
                if (pId) idsPersonas.add(pId);
            });
        });

        // Por tipo de instrumento (incluye los tipos del catálogo con 0)
        const mapaTipos = new Map();
        tiposInstrumento.forEach((t) => {
            const clave = (t.nombre || 'Otro instrumento').trim();
            if (!mapaTipos.has(clave)) mapaTipos.set(clave, { nombre: clave, cantidad: 0 });
        });
        conveniosFiltrados.forEach((c) => {
            const clave = (c.tipo_instrumento?.nombre || 'Otro instrumento').trim();
            if (!mapaTipos.has(clave)) mapaTipos.set(clave, { nombre: clave, cantidad: 0 });
            mapaTipos.get(clave).cantidad += 1;
        });
        const porTipo = Array.from(mapaTipos.values());

        // Por unidad: un convenio cuenta en cada unidad de sus representantes
        const baseUnidades = new Map(unidades.map((u) => [String(u.id), { nombre: u.nombre, cantidad: 0 }]));
        let sinUnidad = 0;
        conveniosFiltrados.forEach((c) => {
            const ids = obtenerUnidadesIds(c);
            if (ids.length === 0) {
                sinUnidad += 1;
                return;
            }
            ids.forEach((id) => {
                if (!baseUnidades.has(id)) baseUnidades.set(id, { nombre: `Unidad ${id}`, cantidad: 0 });
                baseUnidades.get(id).cantidad += 1;
            });
        });
        const porUnidad = [
            ...baseUnidades.values(),
            ...(sinUnidad > 0 ? [{ nombre: 'Sin unidad asignada', cantidad: sinUnidad }] : []),
        ]
            .filter((u) => u.cantidad > 0)
            .sort((a, b) => b.cantidad - a.cantidad);

        // Convenios del Revisor ya procesados: respetan tipo y unidad, pero no el estado ni el año
        const conveniosBase = convenios.filter(cumpleTipoUnidad);

        // Serie por año
        const mapaAnios = new Map();
        if (rol === 'revision') {
            // Convenios que salieron de revisión, por año (un convenio cuenta una vez por año)
            conveniosBase.forEach((c) => {
                new Set(aniosDeRevision(c)).forEach((a) => mapaAnios.set(a, (mapaAnios.get(a) || 0) + 1));
            });
        } else {
            const baseAnios = rol === 'consulta' ? firmados : conveniosFiltrados;
            baseAnios.forEach((c) => {
                const a = anioFirma(c);
                if (a) mapaAnios.set(a, (mapaAnios.get(a) || 0) + 1);
            });
        }
        const porAnio = serieAnual(mapaAnios);

        // Métricas de revisión
        let primeraRevision = 0;
        let reenviados = 0;
        if (rol === 'revision') {
            conveniosFiltrados.forEach((c) => {
                const pasosARevision = (c.historial_estados || []).filter((h) => h.estado_nuevo === 'revision').length;
                if (pasosARevision > 1) reenviados += 1;
                else primeraRevision += 1;
            });
        }

        const revisadosEsteAnio = conveniosBase.filter((c) => aniosDeRevision(c).includes(anioActual)).length;

        const devueltosCorreccion = conveniosBase.filter(
            (c) =>
                estadoDe(c) === 'borrador' &&
                (c.historial_estados || []).some((h) => h.estado_anterior === 'revision' && h.estado_nuevo === 'borrador')
        ).length;

        return {
            total: conveniosFiltrados.length,
            conteoEstados,
            vigentesTotal: vigentes + porVencer90,
            vigentesSinAlerta: vigentes,
            porVencer90,
            vencidos,
            sinVencimiento,
            personasUnicas: idsPersonas.size,
            porTipo,
            porUnidad,
            porAnio,
            primeraRevision,
            reenviados,
            revisadosEsteAnio,
            devueltosCorreccion,
        };
    }, [conveniosFiltrados, convenios, tiposInstrumento, unidades, cumpleTipoUnidad, rol]);

    // Encabezado según el rol
    const subtituloRol = {
        administracion: 'Vista completa del sistema. Alcance: Global.',
        gestion: 'Todos los estados excepto «En revisión». Alcance: Global.',
        revision: nombreUnidadFija
            ? `Convenios en revisión de tu unidad. Alcance: ${nombreUnidadFija}.`
            : 'Convenios en revisión. Alcance: Global.',
        consulta: 'Convenios firmados dentro de tu alcance. Alcance: Global.',
    }[rol];

    // Tarjetas KPI (4 por vista)
    const tarjetasKPI = useMemo(() => {
        if (rol === 'administracion') {
            return [
                { valor: metricas.total, etiqueta: 'Total de convenios' },
                { valor: metricas.conteoEstados.firmado, etiqueta: 'Firmados' },
                { valor: metricas.vigentesTotal, etiqueta: 'Vigentes' },
                { valor: metricas.personasUnicas, etiqueta: 'Personas únicas' },
            ];
        }
        if (rol === 'gestion') {
            return [
                { valor: metricas.conteoEstados.borrador, etiqueta: 'Borradores' },
                { valor: metricas.conteoEstados.firmado, etiqueta: 'Firmados' },
                { valor: metricas.vigentesTotal, etiqueta: 'Vigentes' },
                { valor: metricas.personasUnicas, etiqueta: 'Personas únicas' },
            ];
        }
        if (rol === 'revision') {
            return [
                { valor: metricas.total, etiqueta: 'En revisión' },
                { valor: metricas.revisadosEsteAnio, etiqueta: 'Revisados este año' },
                { valor: metricas.devueltosCorreccion, etiqueta: 'Devueltos para corrección' },
                { valor: metricas.personasUnicas, etiqueta: 'Personas únicas' },
            ];
        }
        return [
            { valor: metricas.conteoEstados.firmado, etiqueta: 'Firmados' },
            { valor: metricas.vigentesTotal, etiqueta: 'Vigentes' },
            { valor: metricas.porVencer90, etiqueta: 'Por vencer en 90 días' },
            { valor: metricas.personasUnicas, etiqueta: 'Personas únicas' },
        ];
    }, [rol, metricas]);

    // Exporta a CSV los convenios filtrados (compatible con Excel)
    const handleExportarCSV = () => {
        const sanitizar = (val) => {
            const txt = String(val ?? '').replace(/"/g, '""');
            const seguro = /^[=+\-@]/.test(txt) ? `'${txt}` : txt;
            return `"${seguro}"`;
        };

        const encabezados = ['Código', 'Título', 'Tipo de Instrumento', 'Unidades', 'Estado', 'Fecha Creación', 'Fecha Vencimiento'];
        
        const formatearFecha = (valor) => {
        const f = aFecha(valor);
        if (!f) return '';
        const dd = String(f.getDate()).padStart(2, '0');
        const mm = String(f.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${f.getFullYear()}`;
        };
        
        const filas = conveniosFiltrados.map((c) => {
            const nombresUnidades = obtenerUnidadesIds(c)
                .map((id) => nombrePorUnidadId.get(id) || `Unidad ${id}`)
                .join(' / ');
            return [
                sanitizar(c.codigo),
                sanitizar(c.titulo),
                sanitizar(c.tipo_instrumento?.nombre || 'Sin especificar'),
                sanitizar(nombresUnidades || 'Sin unidad asignada'),
                sanitizar(c.estado),
                sanitizar(formatearFecha(c.fecha_creacion)),
                sanitizar(formatearFecha(fechaVencimientoDe(c)) || 'Sin vencimiento'),
            ];
        });

        const csv = [encabezados.join(';'), ...filas.map((f) => f.join(';'))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `estadisticas_${rol}_unlpam.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Datos preparados para las tarjetas
    const itemsPorEstado = useMemo(() => {
        const todos = [
            { nombre: 'Borrador', cantidad: metricas.conteoEstados.borrador },
            { nombre: 'En revisión', cantidad: metricas.conteoEstados.revision },
            { nombre: 'Aprobado', cantidad: metricas.conteoEstados.aprobado },
            { nombre: 'Firmado', cantidad: metricas.conteoEstados.firmado },
            { nombre: 'Rescindido', cantidad: metricas.conteoEstados.rescindido },
            { nombre: 'Archivado', cantidad: metricas.conteoEstados.archivado },
        ];
        // Gestión no ve 'En revisión'
        return rol === 'gestion' ? todos.filter((i) => i.nombre !== 'En revisión') : todos;
    }, [metricas, rol]);

    const itemsVigencia = [
        { nombre: 'Vigentes', cantidad: metricas.vigentesSinAlerta },
        { nombre: 'Por vencer (90 días)', cantidad: metricas.porVencer90 },
        { nombre: 'Vencidos', cantidad: metricas.vencidos },
        { nombre: 'Sin vencimiento registrado', cantidad: metricas.sinVencimiento },
    ];

    const itemsSituacionRevision = [
        { nombre: 'Primera revisión', cantidad: metricas.primeraRevision },
        { nombre: 'Reenviado tras corrección', cantidad: metricas.reenviados },
    ];

    const estiloSelect = { width: 'auto', borderRadius: '8px', fontSize: '0.8rem', borderColor: '#d1d5db' };
    const subtituloUnidad = 'Cantidad · un convenio cuenta en cada unidad de sus representantes';

    return (
        <div>
            {/* Encabezado */}
            <h1 className="page-title mb-1">Estadísticas</h1>
            <p className="text-muted mb-3" style={{ fontSize: '0.82rem' }}>{subtituloRol}</p>

            {/* Filtros y botón Exportar CSV */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                <div className="d-flex flex-wrap align-items-center gap-2">
                    {/* Año */}
                    <select
                        value={anioFiltro}
                        onChange={(e) => setAnioFiltro(e.target.value)}
                        className="form-select form-select-sm bg-white"
                        style={estiloSelect}
                    >
                        <option value="todos">{rol === 'revision' ? 'Año de revisión' : 'Año de firma'}: Todos</option>
                        {aniosDisponibles.map((anio) => (
                            <option key={anio} value={anio}>
                                {rol === 'revision' ? 'Año de revisión' : 'Año de firma'}: {anio}
                            </option>
                        ))}
                    </select>

                    {/* Unidad (fija solo si el Revisor tiene una unidad asignada) */}
                    {unidadFijaId ? (
                        <div
                            className="px-3 py-1 border text-secondary"
                            style={{ backgroundColor: '#e5e7eb', borderColor: '#d1d5db', borderRadius: '8px', fontSize: '0.8rem' }}
                        >
                            Unidad: {nombreUnidadFija} · fija
                        </div>
                    ) : (
                        <select
                            value={unidadFiltro}
                            onChange={(e) => setUnidadFiltro(e.target.value)}
                            className="form-select form-select-sm bg-white"
                            style={estiloSelect}
                        >
                            <option value="todas">Unidad: Todas</option>
                            {unidades.map((u) => (
                                <option key={u.id} value={u.id}>Unidad: {u.nombre}</option>
                            ))}
                        </select>
                    )}

                    {/* Tipo de instrumento */}
                    <select
                        value={tipoFiltro}
                        onChange={(e) => setTipoFiltro(e.target.value)}
                        className="form-select form-select-sm bg-white"
                        style={estiloSelect}
                    >
                        <option value="todos">Tipo: Todos</option>
                        {tiposInstrumento.map((t) => (
                            <option key={t.id} value={t.id}>Tipo: {t.nombre}</option>
                        ))}
                    </select>
                </div>

                <button
                    type="button"
                    onClick={handleExportarCSV}
                    disabled={loading || conveniosFiltrados.length === 0}
                    className="btn btn-sm bg-white fw-semibold px-3 py-1"
                    style={{
                        color: 'var(--unlpam-blue-btn)',
                        border: '1.5px solid var(--unlpam-blue-btn)',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                    }}
                >
                    Exportar CSV
                </button>
            </div>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            {loading ? (
                <div className="text-muted py-4 small">Calculando estadísticas...</div>
            ) : (
                <>
                    {/* KPIs */}
                    <div className="row g-3 mb-3">
                        {tarjetasKPI.map((kpi) => (
                            <div key={kpi.etiqueta} className="col-6 col-lg-3">
                                <div className="bg-white rounded-3 border p-3 shadow-sm h-100" style={{ borderColor: '#e5e7eb' }}>
                                    <div className="fw-bold" style={{ fontSize: '1.65rem', color: '#0f4c81', lineHeight: '1.15' }}>
                                        {kpi.valor}
                                    </div>
                                    <div className="text-muted mt-1" style={{ fontSize: '0.78rem' }}>{kpi.etiqueta}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Gráficos según el rol */}
                    {rol === 'revision' ? (
                        <div className="row g-3 mb-3">
                            <div className="col-12 col-lg-6">
                                <TarjetaBarrasHorizontales
                                    titulo="En revisión por situación"
                                    subtitulo="Cantidad de convenios"
                                    items={itemsSituacionRevision}
                                    colorBarra="#0f4c81"
                                />
                            </div>
                            <div className="col-12 col-lg-6">
                                <TarjetaBarrasHorizontales
                                    titulo="Por tipo de instrumento"
                                    subtitulo="Cantidad"
                                    items={metricas.porTipo}
                                    colorBarra="#2d7a64"
                                />
                            </div>
                            <div className="col-12 col-lg-6">
                                <TarjetaBarrasHorizontales
                                    titulo="Distribución por unidad"
                                    subtitulo={unidadFijaId ? 'Cantidad · tu alcance se limita a esta unidad' : subtituloUnidad}
                                    items={metricas.porUnidad}
                                    colorBarra="#1b365d"
                                />
                            </div>
                            <div className="col-12 col-lg-6">
                                <TarjetaBarrasAnuales
                                    titulo="Revisados por año"
                                    subtitulo="Convenios que salieron de revisión"
                                    serie={metricas.porAnio}
                                />
                            </div>
                        </div>
                    ) : rol === 'consulta' ? (
                        <div className="row g-3 mb-3">
                            <div className="col-12 col-lg-6">
                                <TarjetaBarrasHorizontales
                                    titulo="Vigencia de convenios firmados"
                                    subtitulo="Calculada por fecha de vencimiento"
                                    items={itemsVigencia}
                                    colorBarra="#166534"
                                />
                            </div>
                            <div className="col-12 col-lg-6">
                                <TarjetaBarrasHorizontales
                                    titulo="Por tipo de instrumento"
                                    subtitulo="Cantidad"
                                    items={metricas.porTipo}
                                    colorBarra="#2d7a64"
                                />
                            </div>
                            <div className="col-12 col-lg-6">
                                <TarjetaBarrasHorizontales
                                    titulo="Distribución por unidad"
                                    subtitulo={subtituloUnidad}
                                    items={metricas.porUnidad}
                                    colorBarra="#1b365d"
                                />
                            </div>
                            <div className="col-12 col-lg-6">
                                <TarjetaBarrasAnuales
                                    titulo="Firmados por año de firma"
                                    subtitulo="Cantidad de convenios firmados"
                                    serie={metricas.porAnio}
                                />
                            </div>
                        </div>
                    ) : (
                        /* Administración y Gestión */
                        <div className="row g-3 mb-3">
                            <div className="col-12 col-lg-6">
                                <TarjetaBarrasHorizontales
                                    titulo="Convenios por estado"
                                    subtitulo="Cantidad de convenios"
                                    items={itemsPorEstado}
                                    colorBarra="#0f4c81"
                                />
                            </div>
                            <div className="col-12 col-lg-6">
                                <TarjetaBarrasHorizontales
                                    titulo="Vigencia de convenios firmados"
                                    subtitulo="Calculada por fecha de vencimiento"
                                    items={itemsVigencia}
                                    colorBarra="#166534"
                                />
                            </div>
                            <div className="col-12 col-lg-6">
                                <TarjetaBarrasHorizontales
                                    titulo="Por tipo de instrumento"
                                    subtitulo="Cantidad"
                                    items={metricas.porTipo}
                                    colorBarra="#2d7a64"
                                />
                            </div>
                            <div className="col-12 col-lg-6">
                                <TarjetaBarrasHorizontales
                                    titulo="Distribución por unidad"
                                    subtitulo={subtituloUnidad}
                                    items={metricas.porUnidad}
                                    colorBarra="#1b365d"
                                />
                            </div>
                            <div className="col-12 col-lg-6">
                                <TarjetaBarrasAnuales
                                    titulo="Convenios por año de firma"
                                    subtitulo="Convenios con fecha de firma"
                                    serie={metricas.porAnio}
                                />
                            </div>
                        </div>
                    )}

                    <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.74rem' }}>
                        El CSV exporta los resultados filtrados.
                    </p>
                </>
            )}
        </div>
    );
}