// Ejecuta el componente en el navegador (necesario para hooks y localStorage)
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FichaConvenioPage() {
    // Captura el ID de la URL (/convenios/[id]) y permite navegar atrás
    const params = useParams();
    const router = useRouter();
    const id = params?.id;

    // Estados principales de la vista
    const [convenio, setConvenio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

    /* ================= INICIO CÓDIGO REAL DE LA API (DESCOMENTAR AL CONECTAR LARAVEL) =================
    useEffect(() => {
      if (!id) return;
  
      const fetchConvenio = async () => {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('auth_token');
  
        try {
          const response = await fetch(`${apiUrl}/convenios/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
  
          if (!response.ok) {
            throw new Error('No se pudo cargar la información del convenio.');
          }
  
          const data = await response.json();
          setConvenio(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
  
      fetchConvenio();
    }, [apiUrl, id]);
    ================= FIN CÓDIGO REAL DE LA API ================= */

    // ================= DATOS ESTÁTICOS DE PRUEBA (BORRAR AL CONECTAR LARAVEL) =================
    useEffect(() => {
        const mocksPorId = {
            '1': {
                id: 1,
                codigo: 'CONV-2025-001',
                titulo: 'Marco de colaboración · Universidad Ejemplo',
                estado: 'firmado',
                fecha_creacion: '2025-06-30',
                fecha_vencimiento: '2028-06-30',
                firma_gestor: true,
                firma_decano: true,
                tipo_instrumento: { id: 1, nombre: 'Marco de colaboración' },
                representantes: [
                    { id: 1, nombre: 'UNLPam · Facultad de Ingeniería', cargo: 'Decano/a (dato ficticio)' },
                    { id: 2, nombre: 'Universidad Ejemplo', cargo: 'Rector/a (dato ficticio)' },
                ],
                documentos: [
                    { id: 10, nombre_archivo: 'Convenio_marco_2025.pdf', tipo: 'Principal', peso: '1,4 MB', hash: 'a3f9...c21b', url: '#' },
                ],
                padre: null,
                adendas: [
                    {
                        id: 2,
                        codigo: 'CONV-2025-007',
                        titulo: 'Práctica profesional supervisada',
                        fecha_vencimiento: '2026-12-31',
                        tipo_instrumento: { nombre: 'Específico de pasantía' },
                    },
                    {
                        id: 4,
                        codigo: 'CONV-2026-010',
                        titulo: 'Renovación del marco de colaboración',
                        fecha_vencimiento: '2031-06-30',
                        tipo_instrumento: { nombre: 'Renovación' },
                    },
                ],
                historial_estados: [
                    { id: 1, estado_nuevo: 'borrador', fundamento: 'Borrador creado', fecha_cambio: '2025-06-01', usuario: 'Ana Ejemplo' },
                    { id: 2, estado_nuevo: 'revision', fundamento: 'Enviado a revisión académica', fecha_cambio: '2025-06-15', usuario: 'Ana Ejemplo' },
                    { id: 3, estado_nuevo: 'firmado', fundamento: 'Convenio firmado por ambas partes', fecha_cambio: '2025-06-30', usuario: 'Marta Ejemplo' },
                ],
                detalle_pasantia: null,
            },
            '2': {
                id: 2,
                codigo: 'CONV-2025-007',
                titulo: 'Práctica profesional supervisada',
                estado: 'firmado',
                fecha_creacion: '2025-12-31',
                fecha_vencimiento: '2026-12-31',
                firma_gestor: true,
                firma_decano: true,
                tipo_instrumento: { id: 2, nombre: 'Específico de pasantía' },
                representantes: [
                    { id: 1, nombre: 'UNLPam · Facultad de Ingeniería', cargo: 'Decano/a' },
                    { id: 3, nombre: 'Empresa Tecnológica Pampeana', cargo: 'Apoderado Legal' },
                ],
                documentos: [
                    { id: 11, nombre_archivo: 'Convenio_pasantia_007.pdf', tipo: 'Principal', peso: '1,1 MB', hash: '8d12...f40e', url: '#' },
                    { id: 12, nombre_archivo: 'Plan_trabajo_alumno.pdf', tipo: 'Anexo', peso: '0,4 MB', hash: '7be1...09d4', url: '#' },
                ],
                padre: {
                    id: 1,
                    codigo: 'CONV-2025-001',
                    titulo: 'Marco de colaboración · Universidad Ejemplo',
                    fecha_vencimiento: '2028-06-30',
                },
                adendas: [
                    {
                        id: 3,
                        codigo: 'CONV-2026-003',
                        titulo: 'Amplía la carga horaria',
                        fecha_vencimiento: null,
                        tipo_instrumento: { nombre: 'Adenda' },
                    },
                ],
                historial_estados: [
                    { id: 4, estado_nuevo: 'borrador', fundamento: 'Borrador creado', fecha_cambio: '2025-12-10', usuario: 'Ana Ejemplo' },
                    { id: 5, estado_nuevo: 'firmado', fundamento: 'Aprobado y firmado', fecha_cambio: '2025-12-31', usuario: 'Marta Ejemplo' },
                ],
                detalle_pasantia: {
                    fecha_inicio_pasantia: '2026-02-01',
                    fecha_fin_pasantia: '2026-12-31',
                    carga_horaria: '20 hs semanales',
                    asignacion_estimulo: '$ 250.000',
                },
            },
        };

        // Si entran a cualquier otro ID de la tabla de prueba, armamos uno genérico válido
        const encontrado = mocksPorId[String(id)] || {
            id,
            codigo: `CONV-2025-00${id}`,
            titulo: 'Convenio Institucional · Entidad Asociada',
            estado: 'firmado',
            fecha_creacion: '2025-08-15',
            fecha_vencimiento: '2027-08-15',
            firma_gestor: true,
            firma_decano: true,
            tipo_instrumento: { nombre: 'Marco de colaboración' },
            representantes: [
                { id: 1, nombre: 'UNLPam · Facultad de Ingeniería', cargo: 'Decano/a' },
                { id: 2, nombre: 'Entidad Asociada', cargo: 'Representante Legal' },
            ],
            documentos: [
                { id: 20, nombre_archivo: `Convenio_${id}.pdf`, tipo: 'Principal', peso: '1,2 MB', hash: '9c4a...11b0', url: '#' },
            ],
            padre: null,
            adendas: [],
            historial_estados: [
                { id: 1, estado_nuevo: 'borrador', fundamento: 'Borrador creado', fecha_cambio: '2025-08-01', usuario: 'Ana Ejemplo' },
                { id: 2, estado_nuevo: 'firmado', fundamento: 'Convenio firmado', fecha_cambio: '2025-08-15', usuario: 'Marta Ejemplo' },
            ],
            detalle_pasantia: null,
        };

        setConvenio(encontrado);
        setLoading(false);
    }, [id]);

    // ================= FIN DATOS ESTÁTICOS DE PRUEBA (BORRAR AL CONECTAR LARAVEL) =================

    // Formateo de fechas YYYY-MM-DD -> DD/MM/YYYY
    const formatearFecha = (fechaStr) => {
        if (!fechaStr) return 'Sin registrar';
        const soloFecha = String(fechaStr).split('T')[0].split(' ')[0];
        const partes = soloFecha.split('-');
        if (partes.length !== 3) return fechaStr;
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    // Devuelve el badge de color correspondiente al estado del convenio
    const obtenerBadgeEstado = (estado) => {
        const est = (estado || '').toLowerCase();
        const mapa = {
            firmado: { texto: 'Firmado', bg: '#dcfce7', color: '#166534' },
            revision: { texto: 'En revisión', bg: '#fef3c7', color: '#92400e' },
            aprobado: { texto: 'Aprobado', bg: '#dbeafe', color: '#1e40af' },
            borrador: { texto: 'Borrador', bg: '#f3f4f6', color: '#374151' },
            rescindido: { texto: 'Rescindido', bg: '#fee2e2', color: '#991b1b' },
            archivado: { texto: 'Archivado', bg: '#e5e7eb', color: '#4b5563' },
        };
        const info = mapa[est] || { texto: estado || 'Desconocido', bg: '#f3f4f6', color: '#374151' };
        return (
            <span
                className="badge rounded-pill fw-semibold px-3 py-1"
                style={{ backgroundColor: info.bg, color: info.color, fontSize: '0.78rem' }}
            >
                {info.texto}
            </span>
        );
    };

    // Clasifica el vínculo del convenio hijo según su tipo de instrumento
    const obtenerEtiquetaHijo = (hijo) => {
        const tipo = (hijo.tipo_instrumento?.nombre || '').toLowerCase();
        if (tipo.includes('específico') || tipo.includes('especifico')) return 'Específico de';
        if (tipo.includes('adenda')) return 'Adenda de';
        if (tipo.includes('renovación') || tipo.includes('renovacion')) return 'Renovación de';
        return 'Relacionado';
    };

    // Vistas tempranas mientras carga o si ocurre un error
    if (loading) {
        return <div className="text-muted py-4">Cargando ficha del convenio...</div>;
    }

    if (error || !convenio) {
        return (
            <div>
                <div className="alert alert-danger">{error || 'Convenio no encontrado.'}</div>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => router.back()}>
                    ← Volver
                </button>
            </div>
        );
    }

    // Documento principal para el botón superior "Descargar PDF"
    const docPrincipal = convenio.documentos?.[0];
    const fechaVencimiento = convenio.fecha_vencimiento || convenio.detalle_pasantia?.fecha_fin_pasantia;

    // Abre o descarga un documento PDF protegido con Sanctum desde Laravel
    const handleDescargarDocumento = async (doc, abrirEnPestana = false) => {
        const token = localStorage.getItem('auth_token');
        const nombreArchivo = doc.archivo || doc.nombre_archivo || doc.nombre || `convenio_${convenio.codigo}.pdf`;

        try {
            const response = await fetch(`${apiUrl}/documentos/${doc.id}/download`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('No se pudo obtener el documento PDF desde el servidor.');
            }

            // Convierte la respuesta binaria a un Blob PDF navegable
            const rawBlob = await response.blob();
            // Forzamos tipo application/pdf para que el botón "Ver" lo abra en el visor del navegador
            const pdfBlob = new Blob([rawBlob], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(pdfBlob);

            if (abrirEnPestana) {
                window.open(blobUrl, '_blank', 'noopener,noreferrer');
            } else {
                const link = document.createElement('a');
                link.href = blobUrl;
                link.setAttribute('download', nombreArchivo);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div>
            {/* Breadcrumb superior */}
            <div className="mb-1" style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                <Link href="/inicio" className="text-decoration-none text-muted">
                    Convenios
                </Link>{' '}
                <span>›</span> <span>{convenio.codigo}</span>
            </div>

            {/* Cabecera: Código, Título, Estado y Botones de acción generales */}
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                <div>
                    <div className="text-muted fw-semibold" style={{ fontSize: '0.8rem' }}>
                        {convenio.codigo}
                    </div>
                    <h1 className="page-title mb-2">{convenio.titulo}</h1>
                    <div className="d-flex align-items-center gap-2">
                        {obtenerBadgeEstado(convenio.estado)}
                    </div>
                </div>

                {/* Botones transversales (sin acciones de edición ni revisión) */}
                <div className="d-flex align-items-center gap-2">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="btn btn-sm bg-white border fw-semibold px-3 py-2"
                        style={{ color: '#374151', borderRadius: '8px', fontSize: '0.82rem' }}
                    >
                        Volver
                    </button>

                    {docPrincipal && (
                        <button
                            type="button"
                            onClick={() => handleDescargarDocumento(docPrincipal, false)}
                            className="btn btn-sm bg-white fw-semibold px-3 py-2"
                            style={{
                                color: 'var(--unlpam-blue-btn)',
                                border: '1.5px solid var(--unlpam-blue-btn)',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                            }}
                        >
                            Descargar PDF
                        </button>
                    )}
                </div>
            </div>

            {/* Grilla de 2 columnas igual a Figma */}
            <div className="row g-3">
                {/* COLUMNA IZQUIERDA (7 de 12): Datos generales + Detalle pasantía + Partes */}
                <div className="col-12 col-lg-7 d-flex flex-column gap-3">
                    {/* Tarjeta 1: Datos generales */}
                    <div className="filter-card p-3 p-md-4 shadow-sm">
                        <h2 className="h6 fw-bold text-dark mb-3">Datos generales</h2>

                        <div className="row g-3" style={{ fontSize: '0.85rem' }}>
                            <div className="col-6">
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Tipo</div>
                                <div className="fw-semibold text-dark">
                                    {convenio.tipo_instrumento?.nombre || 'Sin especificar'}
                                </div>
                            </div>

                            <div className="col-6">
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Unidad responsable</div>
                                <div className="fw-semibold text-dark">Facultad de Ingeniería</div>
                            </div>

                            <div className="col-6">
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Fecha de creación / firma</div>
                                <div className="fw-semibold text-dark">{formatearFecha(convenio.fecha_creacion)}</div>
                            </div>

                            <div className="col-6">
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Vencimiento</div>
                                <div className="fw-semibold text-dark">
                                    {fechaVencimiento ? formatearFecha(fechaVencimiento) : 'Sin vencimiento registrado'}
                                </div>
                            </div>

                            <div className="col-6">
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Firma Gestor</div>
                                <div className="fw-semibold text-dark">{convenio.firma_gestor ? 'Registrada' : 'Pendiente'}</div>
                            </div>

                            <div className="col-6">
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Firma Decano</div>
                                <div className="fw-semibold text-dark">{convenio.firma_decano ? 'Registrada' : 'Pendiente'}</div>
                            </div>
                        </div>

                        {/* Si tiene detalle_pasantia cargado en la API, lo mostramos integrado */}
                        {convenio.detalle_pasantia && (
                            <div className="mt-3 pt-3 border-top">
                                <div className="fw-bold text-dark mb-2" style={{ fontSize: '0.82rem' }}>
                                    Detalles de la pasantía
                                </div>
                                <div className="row g-2" style={{ fontSize: '0.83rem' }}>
                                    <div className="col-6">
                                        <span className="text-muted">Inicio: </span>
                                        <span className="fw-semibold">{formatearFecha(convenio.detalle_pasantia.fecha_inicio_pasantia)}</span>
                                    </div>
                                    <div className="col-6">
                                        <span className="text-muted">Fin: </span>
                                        <span className="fw-semibold">{formatearFecha(convenio.detalle_pasantia.fecha_fin_pasantia)}</span>
                                    </div>
                                    {convenio.detalle_pasantia.carga_horaria && (
                                        <div className="col-6">
                                            <span className="text-muted">Carga horaria: </span>
                                            <span className="fw-semibold">{convenio.detalle_pasantia.carga_horaria}</span>
                                        </div>
                                    )}
                                    {convenio.detalle_pasantia.asignacion_estimulo && (
                                        <div className="col-6">
                                            <span className="text-muted">Asignación estímulo: </span>
                                            <span className="fw-semibold">{convenio.detalle_pasantia.asignacion_estimulo}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tarjeta 2: Partes y representantes */}
                    <div className="filter-card p-3 p-md-4 shadow-sm">
                        <h2 className="h6 fw-bold text-dark mb-3">Partes y representantes</h2>

                        {convenio.representantes && convenio.representantes.length > 0 ? (
                            <div className="d-flex flex-column">
                                {convenio.representantes.map((rep, idx) => (
                                    <div
                                        key={rep.id || idx}
                                        className={`py-2 ${idx < convenio.representantes.length - 1 ? 'border-bottom' : ''}`}
                                    >
                                        <div className="fw-semibold text-dark" style={{ fontSize: '0.86rem' }}>
                                            {rep.nombre} {rep.apellido || ''}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                                            {rep.cargo ? `Representante: ${rep.cargo}` : rep.dni ? `DNI: ${rep.dni}` : 'Parte interviniente'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted small">No hay partes registradas para este convenio.</div>
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA: Documentos, relaciones e historial */}
                <div className="col-12 col-lg-5 d-flex flex-column gap-3">
                    {/* Tarjeta 3: Documentos */}
                    <div className="filter-card p-3 p-md-4 shadow-sm">
                        <h2 className="h6 fw-bold text-dark mb-3">Documentos</h2>

                        {convenio.documentos && convenio.documentos.length > 0 ? (
                            <div className="d-flex flex-column">
                                {convenio.documentos.map((doc, idx) => (
                                    <div
                                        key={doc.id || idx}
                                        className={`d-flex justify-content-between align-items-center py-2 ${idx < convenio.documentos.length - 1 ? 'border-bottom' : ''
                                            }`}
                                    >
                                        <div>
                                            <div className="fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                                                {doc.archivo || doc.nombre_archivo || `Documento_${idx + 1}.pdf`}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                                                {idx === 0 ? 'Principal' : 'Adjunto'} · PDF
                                            </div>
                                        </div>

                                        <div className="d-flex gap-2" style={{ fontSize: '0.8rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleDescargarDocumento(doc, true)}
                                                className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                                                style={{ color: 'var(--unlpam-blue-btn)' }}
                                            >
                                                Ver
                                            </button>
                                            <span className="text-muted">·</span>
                                            <button
                                                type="button"
                                                onClick={() => handleDescargarDocumento(doc, false)}
                                                className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                                                style={{ color: 'var(--unlpam-blue-btn)' }}
                                            >
                                                Descargar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted small">Sin documentos adjuntos.</div>
                        )}
                    </div>

                    {/* Tarjeta 4: Antecedentes y relaciones */}
                    <div className="filter-card p-3 p-md-4 shadow-sm">
                        <h2 className="h6 fw-bold text-dark mb-3">Antecedentes y relaciones</h2>

                        {!convenio.padre && (!convenio.adendas || convenio.adendas.length === 0) ? (
                            <div className="text-muted small">No posee convenios antecedentes ni derivados.</div>
                        ) : (
                            <div className="d-flex flex-column gap-2">
                                {/* Si este convenio depende de un convenio padre (Antecedente) */}
                                {convenio.padre && (
                                    <div className="p-2 rounded border bg-light">
                                        <div className="d-flex align-items-center gap-2 mb-1">
                                            <span className="badge-relacion">Convenio padre</span>
                                            <Link
                                                href={`/convenios/${convenio.padre.id}`}
                                                className="fw-semibold text-decoration-none"
                                                style={{ fontSize: '0.8rem', color: 'var(--unlpam-blue-btn)' }}
                                            >
                                                {convenio.padre.codigo}
                                            </Link>
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                                            {convenio.padre.titulo}
                                            {convenio.padre.fecha_vencimiento
                                                ? ` · vence ${formatearFecha(convenio.padre.fecha_vencimiento)}`
                                                : ''}
                                        </div>
                                    </div>
                                )}

                                {/* Si este convenio tiene hijos (Específicos, Adendas, Renovaciones) */}
                                {convenio.adendas?.map((hijo) => (
                                    <div key={hijo.id} className="p-2 rounded border bg-light">
                                        <div className="d-flex align-items-center gap-2 mb-1">
                                            <span className="badge-relacion">{obtenerEtiquetaHijo(hijo)}</span>
                                            <Link
                                                href={`/convenios/${hijo.id}`}
                                                className="fw-semibold text-decoration-none"
                                                style={{ fontSize: '0.8rem', color: 'var(--unlpam-blue-btn)' }}
                                            >
                                                {hijo.codigo}
                                            </Link>
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                                            {hijo.titulo}
                                            {hijo.fecha_vencimiento
                                                ? ` · vence ${formatearFecha(hijo.fecha_vencimiento)}`
                                                : ''}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tarjeta 5: Historial del trámite */}
                    <div className="filter-card p-3 p-md-4 shadow-sm">
                        <h2 className="h6 fw-bold text-dark mb-3">Historial del trámite</h2>

                        {convenio.historial_estados && convenio.historial_estados.length > 0 ? (
                            <div className="d-flex flex-column gap-2">
                                {convenio.historial_estados.map((item, idx) => (
                                    <div
                                        key={item.id || idx}
                                        className="ps-3 py-1"
                                        style={{ borderLeft: '2px solid #d1d5db' }}
                                    >
                                        <div className="fw-semibold text-dark" style={{ fontSize: '0.84rem' }}>
                                            {item.fundamento || `Estado: ${item.estado_nuevo}`}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            {item.usuario || item.user?.name || 'Sistema'} · {formatearFecha(item.fecha_cambio)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted small">Sin movimientos registrados en el historial.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}