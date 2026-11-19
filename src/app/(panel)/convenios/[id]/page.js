'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/common/StatusBadge';

export default function FichaConvenioPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id;

    const [convenio, setConvenio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Nuevos estados para roles y modal de rescisión
    const [rolUsuario, setRolUsuario] = useState('');
    const [modalRescision, setModalRescision] = useState(false);
    const [fundamentoRescision, setFundamentoRescision] = useState('');
    const [enviandoRescision, setEnviandoRescision] = useState(false);
    const [errorRescision, setErrorRescision] = useState('');

    // Modal de decisión del revisor: 'aprobado' | 'borrador' | null
    const [accionRevision, setAccionRevision] = useState(null);
    const [fundamentoRevision, setFundamentoRevision] = useState('');
    const [enviandoRevision, setEnviandoRevision] = useState(false);
    const [errorRevision, setErrorRevision] = useState('');
    const [enviandoFirma, setEnviandoFirma] = useState(false);
    const [errorFirma, setErrorFirma] = useState('');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

    useEffect(() => {
        if (!id) return;

        const fetchDatos = async () => {
            setLoading(true);
            setError('');
            const token = localStorage.getItem('auth_token');

            try {
                // 1. Consultamos el rol del usuario logueado
                const resMe = await fetch(`${apiUrl}/me`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
                });
                if (resMe.ok) {
                    const userData = await resMe.json();
                    console.log("Datos del usuario /me:", userData); // <--- MIRA ESTO EN LA CONSOLA (F12)
                    setRolUsuario((userData.rol || '').toLowerCase());
                }

                // 2. Consultamos la información del convenio
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

        fetchDatos();
    }, [apiUrl, id]);

    const formatearFecha = (fechaStr) => {
        if (!fechaStr) return 'Sin registrar';
        const soloFecha = String(fechaStr).split('T')[0].split(' ')[0];
        const partes = soloFecha.split('-');
        if (partes.length !== 3) return fechaStr;
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    const obtenerEtiquetaHijo = (hijo) => {
        const tipo = (hijo.tipo_instrumento?.nombre || '').toLowerCase();
        if (tipo.includes('específico') || tipo.includes('especifico')) return 'Específico de';
        if (tipo.includes('adenda')) return 'Adenda de';
        if (tipo.includes('renovación') || tipo.includes('renovacion')) return 'Renovación de';
        return 'Relacionado';
    };

    const handleConfirmarRescision = async (e) => {
        e.preventDefault();
        if (!convenio) return;

        setEnviandoRescision(true);
        setErrorRescision('');
        const token = localStorage.getItem('auth_token');

        const textoFundamento = fundamentoRescision.trim()
            ? fundamentoRescision.trim()
            : 'Rescisión de convenio';

        try {
            const response = await fetch(`${apiUrl}/convenios/${convenio.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    estado: 'rescindido',
                    fundamento: textoFundamento.slice(0, 45), // Límite estricto de 45 caracteres de la API
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const msg = data?.errors ? Object.values(data.errors).flat().join(' ') : data?.message || 'No se pudo rescindir el convenio.';
                throw new Error(msg);
            }
            try {
                const hist = JSON.parse(localStorage.getItem('ultimos_convenios_vistos')) || [];
                const actualizados = hist.map(item => {
                    if (item.id === convenio.id) {
                        return { ...item, estado: 'rescindido' };
                    }
                    return item;
                });
                localStorage.setItem('ultimos_convenios_vistos', JSON.stringify(actualizados));
            } catch (e) {
                console.error(e);
            }


            alert('El convenio fue rescindido con éxito.');
            window.location.reload();
        } catch (err) {
            setErrorRescision(err.message);
        } finally {
            setEnviandoRescision(false);
        }
    };

    const recargarConvenio = async () => {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${apiUrl}/convenios/${id}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        });
        if (res.ok) setConvenio(await res.json());
    };

    const abrirModalRevision = (accion) => {
        setFundamentoRevision('');
        setErrorRevision('');
        setAccionRevision(accion);
    };

    const handleConfirmarRevision = async (e) => {
        e.preventDefault();
        if (!convenio || !accionRevision) return;

        setEnviandoRevision(true);
        setErrorRevision('');
        const token = localStorage.getItem('auth_token');

        const textoPorDefecto =
            accionRevision === 'aprobado' ? 'Aprobado en revisión' : 'Devuelto con observaciones';
        const fundamento = (fundamentoRevision.trim() || textoPorDefecto).slice(0, 45);

        try {
            const response = await fetch(`${apiUrl}/convenios/${convenio.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ estado: accionRevision, fundamento }),
            });

            const data = await response.json();

            if (!response.ok) {
                const msg = data?.errors
                    ? Object.values(data.errors).flat().join(' ')
                    : data?.message || 'No se pudo actualizar el convenio.';
                throw new Error(msg);
            }

            // Mantiene al día el estado en "últimos convenios accedidos"
            try {
                const hist = JSON.parse(localStorage.getItem('ultimos_convenios_vistos')) || [];
                localStorage.setItem(
                    'ultimos_convenios_vistos',
                    JSON.stringify(hist.map((item) =>
                        item.id === convenio.id ? { ...item, estado: accionRevision } : item
                    ))
                );
            } catch (e) {
                console.error(e);
            }

            setAccionRevision(null);
            await recargarConvenio();
        } catch (err) {
            setErrorRevision(err.message);
        } finally {
            setEnviandoRevision(false);
        }
    };

    const handleFirmarConvenio = async () => {
        if (!convenio) return;

        setEnviandoFirma(true);
        setErrorFirma('');
        const token = localStorage.getItem('auth_token');

        try {
            const response = await fetch(`${apiUrl}/convenios/${convenio.id}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    estado: 'firmado',
                    fundamento: 'Firmado por Administración',
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                const message = data?.errors
                    ? Object.values(data.errors).flat().join(' ')
                    : data?.message || 'No se pudo firmar el convenio.';
                throw new Error(message);
            }

            await recargarConvenio();
        } catch (err) {
            setErrorFirma(err.message);
        } finally {
            setEnviandoFirma(false);
        }
    };

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

    const docPrincipal = convenio.documentos?.[0];
    const fechaVencimiento = convenio.fecha_vencimiento || convenio.detalle_pasantia?.fecha_fin_pasantia;
    const unidadesRepresentantes = new Set(
        (convenio.representantes || [])
            .map((rep) => rep.unidad_responsable_id || rep.unidad?.id || rep.unidad_responsable?.id)
            .filter((unidadId) => unidadId !== undefined && unidadId !== null && unidadId !== '')
            .map(String)
    );
    const tieneDosUnidadesResponsables = unidadesRepresentantes.size >= 2;

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

            const rawBlob = await response.blob();
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
                <Link href="/convenios" className="text-decoration-none text-muted">
                    Convenios
                </Link>{' '}
                <span>›</span> <span>{convenio.codigo}</span>
            </div>

            {/* Cabecera */}
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                <div>
                    <div className="text-muted fw-semibold" style={{ fontSize: '0.8rem' }}>
                        {convenio.codigo}
                    </div>
                    <h1 className="page-title mb-2">{convenio.titulo}</h1>
                    <div className="d-flex align-items-center gap-2">
                        <StatusBadge estado={convenio.estado} />
                    </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="btn btn-sm bg-white border fw-semibold px-3 py-2"
                        style={{ color: '#374151', borderRadius: '8px', fontSize: '0.82rem' }}
                    >
                        Volver
                    </button>

                    {rolUsuario === 'revision' && (convenio.estado || '').toLowerCase() === 'revision' && (
                        <>
                            <button
                                type="button"
                                onClick={() => abrirModalRevision('borrador')}
                                className="btn btn-sm bg-white fw-semibold px-3 py-2"
                                style={{
                                    color: '#b91c1c',
                                    border: '1.5px solid #b91c1c',
                                    borderRadius: '8px',
                                    fontSize: '0.82rem',
                                }}
                            >
                                Devolver a borrador
                            </button>

                            <button
                                type="button"
                                onClick={() => abrirModalRevision('aprobado')}
                                className="btn btn-sm text-white fw-semibold px-3 py-2"
                                style={{
                                    backgroundColor: 'var(--unlpam-blue-btn)',
                                    border: '1.5px solid var(--unlpam-blue-btn)',
                                    borderRadius: '8px',
                                    fontSize: '0.82rem',
                                }}
                            >
                                Aprobar
                            </button>
                        </>
                    )}
                    {['administracion', 'administrador', 'admin'].includes(rolUsuario) &&
                        (convenio.estado || '').toLowerCase() === 'aprobado' && (
                            <button
                                type="button"
                                onClick={handleFirmarConvenio}
                                disabled={enviandoFirma}
                                className="btn btn-sm text-white fw-semibold px-3 py-2"
                                style={{
                                    backgroundColor: 'var(--unlpam-blue-btn)',
                                    border: '1.5px solid var(--unlpam-blue-btn)',
                                    borderRadius: '8px',
                                    fontSize: '0.82rem',
                                }}
                            >
                                {enviandoFirma ? 'Firmando...' : 'Firmar'}
                            </button>
                        )}
                    {/* Botón de Prescindir exclusivo para Gestión/Administración y solo si el convenio está firmado */}
                    {['gestion', 'gestor', 'administracion', 'admin'].includes(rolUsuario) && (convenio.estado || '').toLowerCase() === 'firmado' && (                        <button
                            type="button"
                            onClick={() => {
                                setFundamentoRescision('');
                                setErrorRescision('');
                                setModalRescision(true);
                            }}
                            className="btn btn-sm text-white fw-semibold px-3 py-2"
                            style={{
                                backgroundColor: '#b91c1c',
                                border: '1.5px solid #991b1b',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                            }}
                        >
                            Prescindir convenio
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => docPrincipal && handleDescargarDocumento(docPrincipal, false)}
                        disabled={!docPrincipal}
                        title={!docPrincipal ? 'Este convenio aún no tiene un PDF adjunto' : 'Descargar PDF principal'}
                        className="btn btn-sm bg-white fw-semibold px-3 py-2"
                        style={{
                            color: docPrincipal ? 'var(--unlpam-blue-btn)' : '#9ca3af',
                            border: `1.5px solid ${docPrincipal ? 'var(--unlpam-blue-btn)' : '#d1d5db'}`,
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            cursor: docPrincipal ? 'pointer' : 'not-allowed',
                        }}
                    >
                        Descargar PDF
                    </button>
                </div>
            </div>

            {errorFirma && <div className="alert alert-danger py-2 small" role="alert">{errorFirma}</div>}

            {/* Grilla de 2 columnas */}
            <div className="row g-3">
                {/* COLUMNA IZQUIERDA */}
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
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Firma Decano</div>
                                <div className="fw-semibold text-dark">
                                    {convenio.firma_decano ? 'Registrada' : 'Pendiente'}
                                </div>
                            </div>
                        </div>

                        {/* Detalle de pasantía */}
                        {convenio.detalle_pasantia && (
                            <div className="mt-3 pt-3 border-top">
                                <div className="fw-bold text-dark mb-2" style={{ fontSize: '0.82rem' }}>
                                    Detalles de la pasantía
                                </div>
                                <div className="row g-2" style={{ fontSize: '0.83rem' }}>
                                    <div className="col-6">
                                        <span className="text-muted">Inicio: </span>
                                        <span className="fw-semibold">{formatearFecha(convenio.detalle_pasantia.fecha_inicio)}</span>
                                    </div>
                                    <div className="col-6">
                                        <span className="text-muted">Fin: </span>
                                        <span className="fw-semibold">{formatearFecha(convenio.detalle_pasantia.fecha_fin)}</span>
                                    </div>
                                    {convenio.detalle_pasantia.carga_horaria_semanal && (
                                        <div className="col-6">
                                            <span className="text-muted">Carga horaria: </span>
                                            <span className="fw-semibold">{convenio.detalle_pasantia.carga_horaria_semanal}</span>
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
                                        className={`d-flex flex-wrap justify-content-between align-items-center gap-2 py-2 ${idx < convenio.representantes.length - 1 ? 'border-bottom' : ''}`}
                                    >
                                        <div>
                                            <div className="fw-semibold text-dark" style={{ fontSize: '0.86rem' }}>
                                                {rep.nombre} {rep.apellido || ''}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                                                {[rep.cargo, rep.email, rep.cuil && `CUIL: ${rep.cuil}`]
                                                    .filter(Boolean)
                                                    .join(' · ') || 'Parte interviniente'}
                                            </div>
                                        </div>
                                        <div className="text-end" style={{ fontSize: '0.78rem' }}>
                                            <div className="text-muted">Unidad responsable</div>
                                            <div className="fw-semibold text-dark">
                                                {rep.unidad?.nombre ||
                                                    rep.unidad_responsable?.nombre ||
                                                    rep.unidad_nombre ||
                                                    (rep.unidad_responsable_id
                                                        ? `Unidad #${rep.unidad_responsable_id}`
                                                        : 'Unidad no especificada')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted small">No hay partes registradas para este convenio.</div>
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA */}
                <div className="col-12 col-lg-5 d-flex flex-column gap-3">
                    {/* Tarjeta 3: Documentos */}
                    <div className="filter-card p-3 p-md-4 shadow-sm">
                        <h2 className="h6 fw-bold text-dark mb-3">Documentos</h2>

                        {convenio.documentos && convenio.documentos.length > 0 ? (
                            <div className="d-flex flex-column">
                                {convenio.documentos.map((doc, idx) => (
                                    <div
                                        key={doc.id || idx}
                                        className={`d-flex justify-content-between align-items-center py-2 ${
                                            idx < convenio.documentos.length - 1 ? 'border-bottom' : ''
                                        }`}
                                        style={{ gap: '12px' }}
                                    >
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div
                                                className="fw-semibold text-dark"
                                                style={{
                                                    fontSize: '0.82rem',
                                                    wordBreak: 'break-all',
                                                    overflowWrap: 'anywhere'
                                                }}
                                            >
                                                {doc.archivo || doc.nombre_archivo || `Documento_${idx + 1}.pdf`}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                                                {idx === 0 ? 'Principal' : 'Adjunto'} · PDF
                                            </div>
                                        </div>

                                        <div className="d-flex gap-2 text-nowrap" style={{ fontSize: '0.8rem' }}>
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
                                        <div className="text-muted" style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}>
                                            {convenio.padre.titulo}
                                        </div>
                                    </div>
                                )}

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
                                        <div className="text-muted" style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}>
                                            {hijo.titulo}
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
                                {convenio.historial_estados.slice().reverse().map((item, idx) => (
                                    <div
                                        key={item.id || idx}
                                        className="ps-3 py-1"
                                        style={{ borderLeft: '2px solid #d1d5db' }}
                                    >
                                        <div className="fw-semibold text-dark" style={{ fontSize: '0.84rem' }}>
                                            De <span className="text-capitalize">{item.estado_anterior}</span> a{' '}
                                            <span className="text-capitalize">{item.estado_nuevo}</span>
                                        </div>
                                        {item.fundamento && (
                                            <div className="text-secondary" style={{ fontSize: '0.78rem' }}>
                                                Fundamento: {item.fundamento}
                                            </div>
                                        )}
                                        <div className="text-muted" style={{ fontSize: '0.73rem' }}>
                                            {item.user?.name || 'Sistema'} · {formatearFecha(item.fecha_cambio)}
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

            {/* MODAL: Prescindir / Rescindir Convenio */}
            {modalRescision && (
                <div
                    className="modal d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                    onClick={() => !enviandoRescision && setModalRescision(false)}
                >
                    <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-danger text-white py-2">
                                <h5 className="modal-title fw-bold" style={{ fontSize: '0.95rem' }}>
                                    ⚠️ Prescindir de convenio
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setModalRescision(false)}
                                    disabled={enviandoRescision}
                                ></button>
                            </div>

                            <form onSubmit={handleConfirmarRescision}>
                                <div className="modal-body">
                                    <div className="p-2 rounded bg-light border mb-3" style={{ fontSize: '0.82rem' }}>
                                        <div className="text-muted fw-semibold">{convenio.codigo}</div>
                                        <div className="fw-bold text-dark">{convenio.titulo}</div>
                                    </div>

                                    {errorRescision && (
                                        <div className="alert alert-danger py-2 small">{errorRescision}</div>
                                    )}

                                    <div className="mb-2">
                                        <label className="form-label fw-semibold small text-danger">
                                            Fundamento de la rescisión (obligatorio, máx. 45 caracteres)
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            maxLength={45}
                                            required
                                            placeholder="Ej: Mutuo acuerdo entre las partes"
                                            value={fundamentoRescision}
                                            onChange={(e) => setFundamentoRescision(e.target.value)}
                                        />
                                        <div className="text-end text-muted" style={{ fontSize: '0.7rem' }}>
                                            {fundamentoRescision.length}/45
                                        </div>
                                        <div className="form-text" style={{ fontSize: '0.73rem' }}>
                                            Esta acción cambiará el estado del convenio a <strong>Rescindido</strong> y quedará registrado en el historial de auditoría.
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer py-2">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary fw-semibold"
                                        onClick={() => setModalRescision(false)}
                                        disabled={enviandoRescision}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-sm text-white fw-semibold px-3"
                                        style={{ backgroundColor: '#b91c1c' }}
                                        disabled={enviandoRescision}
                                    >
                                        {enviandoRescision ? 'Procesando...' : 'Confirmar rescisión'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Aprobar / Desaprobar Convenio */}
            {accionRevision && (
                <div
                    className="modal d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                    onClick={() => !enviandoRevision && setAccionRevision(null)}
                >
                    <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header py-2">
                                <h5 className="modal-title fw-bold" style={{ fontSize: '0.95rem' }}>
                                    {accionRevision === 'aprobado' ? 'Aprobar convenio' : 'Devolver a borrador'}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Cerrar"
                                    onClick={() => setAccionRevision(null)}
                                    disabled={enviandoRevision}
                                ></button>
                            </div>

                            <form onSubmit={handleConfirmarRevision}>
                                <div className="modal-body">
                                    <div className="p-2 rounded bg-light border mb-3" style={{ fontSize: '0.82rem' }}>
                                        <div className="text-muted fw-semibold">{convenio.codigo}</div>
                                        <div className="fw-bold text-dark">{convenio.titulo}</div>
                                    </div>

                                    {accionRevision === 'aprobado' && !tieneDosUnidadesResponsables && (
                                        <div className="alert alert-warning py-2 small">
                                            Para aprobar, el convenio debe tener representantes de al menos dos unidades responsables distintas.
                                        </div>
                                    )}

                                    {errorRevision && (
                                        <div className="alert alert-danger py-2 small" role="alert">{errorRevision}</div>
                                    )}

                                    <div className="mb-2">
                                        <label htmlFor="fundamento-revision" className="form-label fw-semibold small">
                                            {accionRevision === 'aprobado'
                                                ? 'Fundamento (opcional, máx. 45 caracteres)'
                                                : 'Observación para el gestor (obligatoria, máx. 45 caracteres)'}
                                        </label>
                                        <input
                                            id="fundamento-revision"
                                            type="text"
                                            className="form-control form-control-sm"
                                            maxLength={45}
                                            required={accionRevision === 'borrador'}
                                            placeholder={
                                                accionRevision === 'aprobado'
                                                    ? 'Ej: Cláusulas verificadas'
                                                    : 'Ej: Corregir cláusula de rescisión'
                                            }
                                            value={fundamentoRevision}
                                            onChange={(e) => setFundamentoRevision(e.target.value)}
                                        />
                                        <div className="text-end text-muted" style={{ fontSize: '0.7rem' }}>
                                            {fundamentoRevision.length}/45
                                        </div>
                                        <div className="form-text" style={{ fontSize: '0.73rem' }}>
                                            {accionRevision === 'aprobado'
                                                ? 'El convenio pasará a Aprobado y se avisará a gestión y administración.'
                                                : 'El convenio volverá a Borrador y se avisará a gestión.'}
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer py-2">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary fw-semibold"
                                        onClick={() => setAccionRevision(null)}
                                        disabled={enviandoRevision}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-sm text-white fw-semibold px-3"
                                        style={{
                                            backgroundColor: accionRevision === 'aprobado' ? 'var(--unlpam-blue-btn)' : '#b91c1c',
                                        }}
                                        disabled={enviandoRevision}
                                    >
                                        {enviandoRevision
                                            ? 'Procesando...'
                                            : accionRevision === 'aprobado'
                                            ? 'Confirmar aprobación'
                                            : 'Confirmar devolución'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
