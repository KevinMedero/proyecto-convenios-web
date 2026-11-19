'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

const representanteVacio = () => ({
  nombre: '',
  apellido: '',
  cargo: '',
  email: '',
  dni: '',
  cuil: '',
  unidad_responsable_id: '',
});

const extraerLista = (respuesta) =>
  Array.isArray(respuesta) ? respuesta : Array.isArray(respuesta?.data) ? respuesta.data : [];

const leerRespuesta = async (response, mensajePorDefecto) => {
  const texto = await response.text();
  let data = null;
  if (texto) {
    try {
      data = JSON.parse(texto);
    } catch {
      throw new Error('El servidor devolvió una respuesta inválida.');
    }
  }

  if (!response.ok) {
    const mensaje = data?.errors
      ? Object.values(data.errors).flat().join(' ')
      : data?.message || mensajePorDefecto;
    throw new Error(mensaje);
  }
  return data;
};

const subirDocumento = async (apiUrl, token, convenioId, archivo) => {
  const formData = new FormData();
  formData.append('convenio_id', String(convenioId));
  formData.append('archivo', archivo);

  const response = await fetch(`${apiUrl}/documentos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: formData,
  });
  const documento = await leerRespuesta(response, 'No se pudo cargar el PDF.');
  if (!documento?.id) throw new Error('La API no devolvió el identificador del PDF cargado.');
  return Number(documento.id);
};

export default function CorregirConvenioPage() {
  const params = useParams();
  const router = useRouter();
  const inputDocumentoRef = useRef(null);
  const id = params?.id;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
  const [accesoPermitido, setAccesoPermitido] = useState(null);
  const [convenio, setConvenio] = useState(null);
  const [tiposInstrumento, setTiposInstrumento] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [revisorId, setRevisorId] = useState(null);
  const [fundamentoDevolucion, setFundamentoDevolucion] = useState('');
  const [form, setForm] = useState({
    titulo: '',
    tipoId: '',
    fechaVencimiento: '',
    fechaInicioPasantia: '',
    fechaFinPasantia: '',
    cargaHoraria: '',
    asignacionEstimulo: '',
  });
  const [representantes, setRepresentantes] = useState([]);
  const [archivoPdf, setArchivoPdf] = useState(null);
  const [documentoSubidoId, setDocumentoSubidoId] = useState(null);
  const [errorArchivo, setErrorArchivo] = useState('');
  const [fundamentoCorreccion, setFundamentoCorreccion] = useState('');
  const [loading, setLoading] = useState(true);
  const [catalogosLoading, setCatalogosLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let permitido = false;
    try {
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
      const rol = typeof userData.rol === 'string'
        ? userData.rol
        : userData.rol?.nombre || '';
      permitido = rol.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'gestion';
    } catch (err) {
      console.error('Error leyendo user_data', err);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Resolve the user's role after hydration.
    setAccesoPermitido(permitido);
  }, []);

  useEffect(() => {
    if (accesoPermitido === false) router.replace('/inicio');
  }, [accesoPermitido, router]);

  useEffect(() => {
    if (accesoPermitido !== true || !id) return;

    let activo = true;
    const cargarDatos = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('La sesión no está disponible. Inicia sesión nuevamente.');
        setLoading(false);
        setCatalogosLoading(false);
        return;
      }

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        };
        const [convenioResponse, tiposResponse, unidadesResponse] = await Promise.all([
          fetch(`${apiUrl}/convenios/${id}`, { headers }),
          fetch(`${apiUrl}/tipos-instrumento`, { headers }),
          fetch(`${apiUrl}/unidades`, { headers }),
        ]);
        const [datos, tiposData, unidadesData] = await Promise.all([
          leerRespuesta(convenioResponse, 'No se pudo cargar el convenio.'),
          leerRespuesta(tiposResponse, 'No se pudieron cargar los tipos de instrumento.'),
          leerRespuesta(unidadesResponse, 'No se pudieron cargar las unidades responsables.'),
        ]);

        if (!activo) return;

        const devoluciones = (datos.historial_estados || [])
          .filter((registro) =>
            registro.estado_anterior === 'revision' && registro.estado_nuevo === 'borrador'
          )
          .sort((a, b) => new Date(b.fecha_cambio) - new Date(a.fecha_cambio));
        const ultimaDevolucion = devoluciones[0];
        if (datos.estado !== 'borrador' || !ultimaDevolucion?.user_id) {
          setError('Este convenio no está disponible para corrección.');
          return;
        }

        setConvenio(datos);
        setRevisorId(Number(ultimaDevolucion.user_id));
        setFundamentoDevolucion(ultimaDevolucion.fundamento || '');
        setTiposInstrumento(extraerLista(tiposData));
        setUnidades(extraerLista(unidadesData));
        const detalle = datos.detalle_pasantia || {};
        setForm({
          titulo: datos.titulo || '',
          tipoId: String(datos.tipo_instrumento_id || ''),
          fechaVencimiento: datos.fecha_vencimiento || detalle.fecha_fin || '',
          fechaInicioPasantia: detalle.fecha_inicio || '',
          fechaFinPasantia: detalle.fecha_fin || '',
          cargaHoraria: detalle.carga_horaria_semanal || '',
          asignacionEstimulo: detalle.asignacion_estimulo || '',
        });
        setRepresentantes(
          (datos.representantes || []).map((representante) => ({
            nombre: representante.nombre || '',
            apellido: representante.apellido || '',
            cargo: representante.cargo || '',
            email: representante.email || '',
            dni: representante.dni || '',
            cuil: representante.cuil || '',
            unidad_responsable_id: String(
              representante.unidad_responsable_id ||
              representante.unidad?.id ||
              representante.unidad_responsable?.id ||
              ''
            ),
          }))
        );
      } catch (err) {
        if (activo) setError(err.message);
      } finally {
        if (activo) {
          setLoading(false);
          setCatalogosLoading(false);
        }
      }
    };

    cargarDatos();
    return () => {
      activo = false;
    };
  }, [accesoPermitido, apiUrl, id]);

  const tipoSeleccionado = tiposInstrumento.find(
    (tipo) => String(tipo.id) === String(form.tipoId)
  );
  const esPasantia = (tipoSeleccionado?.nombre || '').toLowerCase().includes('pasant');

  const actualizarCampo = (campo, valor) => {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  };

  const actualizarRepresentante = (indice, campo, valor) => {
    setRepresentantes((actuales) =>
      actuales.map((representante, i) =>
        i === indice ? { ...representante, [campo]: valor } : representante
      )
    );
  };

  const seleccionarDocumento = (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;

    if (!archivo.name.toLowerCase().endsWith('.pdf')) {
      setArchivoPdf(null);
      setErrorArchivo('El archivo debe ser un PDF.');
      return;
    }
    if (archivo.size > 20 * 1024 * 1024) {
      setArchivoPdf(null);
      setErrorArchivo('El PDF no puede superar los 20 MB.');
      return;
    }

    setErrorArchivo('');
    setArchivoPdf(archivo);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!convenio || !revisorId) return;
    if (!fundamentoCorreccion.trim()) {
      setError('Escribe el fundamento de la corrección para el revisor.');
      return;
    }

    const personas = representantes
      .filter((representante) =>
        Object.entries(representante).some(
          ([campo, valor]) => campo !== 'unidad_responsable_id' && valor.trim() !== ''
        )
      )
      .map((representante) => ({
        ...representante,
        nombre: representante.nombre.trim(),
        apellido: representante.apellido.trim(),
        cargo: representante.cargo.trim(),
        email: representante.email.trim(),
        dni: representante.dni.trim(),
        cuil: representante.cuil.trim(),
        unidad_responsable_id: representante.unidad_responsable_id
          ? Number(representante.unidad_responsable_id)
          : null,
      }));

    if (personas.some((persona) => !persona.unidad_responsable_id)) {
      setError('Selecciona una unidad responsable para cada representante.');
      return;
    }

    if (personas.length === 0) {
      setError('Agrega al menos un representante con una unidad responsable.');
      return;
    }

    const unidadResponsableId = personas[0].unidad_responsable_id;
    const unidadResponsableSecundariaId =
      personas.find((persona) => persona.unidad_responsable_id !== unidadResponsableId)
        ?.unidad_responsable_id ||
      personas[1]?.unidad_responsable_id ||
      unidadResponsableId;

    setGuardando(true);
    let idDocumento = documentoSubidoId;
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('La sesión no está disponible. Inicia sesión nuevamente.');

      if (archivoPdf && !idDocumento) {
        idDocumento = await subirDocumento(apiUrl, token, convenio.id, archivoPdf);
        setDocumentoSubidoId(idDocumento);
      }

      const payload = {
        titulo: form.titulo.trim(),
        tipo_instrumento_id: Number(form.tipoId),
        unidad_id: unidadResponsableId,
        unidad_responsable_id: unidadResponsableId,
        unidad_responsable_secundaria_id: unidadResponsableSecundariaId,
        fecha_vencimiento:
          form.fechaVencimiento || (esPasantia ? form.fechaFinPasantia : '') || null,
        representantes: personas,
        detalle_pasantia: esPasantia
          ? {
              fecha_inicio_pasantia: form.fechaInicioPasantia || null,
              fecha_fin_pasantia: form.fechaFinPasantia || null,
              carga_horaria_semanal: form.cargaHoraria || null,
              asignacion_estimulo: form.asignacionEstimulo || null,
            }
          : null,
        estado: 'revision',
        revisor_id: revisorId,
        fundamento: fundamentoCorreccion.trim(),
        ...(idDocumento && { documento_id: idDocumento }),
      };

      const response = await fetch(`${apiUrl}/convenios/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      await leerRespuesta(response, 'No se pudo confirmar la corrección.');
      router.push('/inicio');
    } catch (err) {
      setError(
        idDocumento
          ? `El PDF quedó cargado, pero no se pudo confirmar la corrección: ${err.message}`
          : err.message
      );
      setGuardando(false);
    }
  };

  if (accesoPermitido !== true) return null;
  if (loading) return <div className="text-muted py-4">Cargando convenio para corregir...</div>;

  return (
    <div className="mx-auto" style={{ maxWidth: '1000px' }}>
      <div className="mb-3" style={{ fontSize: '0.8rem', color: '#6b7280' }}>
        <Link href="/convenios" className="text-decoration-none text-muted">Convenios</Link>{' '}
        <span>›</span>{' '}
        <Link href={`/convenios/${id}`} className="text-decoration-none text-muted">
          {convenio?.codigo || `Convenio #${id}`}
        </Link>{' '}
        <span>›</span> <span>Corregir</span>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div className="text-muted fw-semibold small">{convenio?.codigo}</div>
          <h1 className="page-title mb-1">Corregir convenio</h1>
          <p className="text-muted small mb-0">
            Modifica los datos observados y vuelve a enviarlo al mismo revisor.
          </p>
        </div>
        <span className="badge rounded-pill bg-light text-secondary border px-3 py-2">
          Borrador devuelto
        </span>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {!convenio && !error && (
        <div className="alert alert-danger py-2 small">No se pudo cargar el convenio.</div>
      )}
      {!convenio && (
        <Link href="/inicio" className="btn btn-outline-secondary btn-sm">Volver al inicio</Link>
      )}

      {convenio && (
        <>
          {fundamentoDevolucion && (
            <div className="alert alert-warning small">
              <strong>Observación del revisor:</strong> {fundamentoDevolucion}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <section className="filter-card p-3 p-md-4 mb-3 shadow-sm">
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="badge rounded-circle bg-primary">1</span>
                <h2 className="h6 fw-bold text-dark mb-0">Datos generales</h2>
              </div>

              <div className="row g-3">
                <div className="col-12">
                  <label htmlFor="titulo" className="form-label fw-semibold small">
                    Título del convenio <span className="text-danger">*</span>
                  </label>
                  <input
                    id="titulo"
                    className="form-control"
                    value={form.titulo}
                    onChange={(e) => actualizarCampo('titulo', e.target.value)}
                    maxLength={255}
                    required
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label htmlFor="tipo" className="form-label fw-semibold small">
                    Tipo de instrumento <span className="text-danger">*</span>
                  </label>
                  <select
                    id="tipo"
                    className="form-select"
                    value={form.tipoId}
                    onChange={(e) => actualizarCampo('tipoId', e.target.value)}
                    required
                    disabled={catalogosLoading || tiposInstrumento.length === 0}
                  >
                    <option value="">Selecciona un tipo</option>
                    {tiposInstrumento.map((tipo) => (
                      <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                    ))}
                  </select>
                </div>

                {!esPasantia && (
                  <div className="col-12 col-md-6">
                    <label htmlFor="fechaVencimiento" className="form-label fw-semibold small">
                      Fecha de vencimiento
                    </label>
                    <input
                      id="fechaVencimiento"
                      type="date"
                      className="form-control"
                      value={form.fechaVencimiento}
                      onChange={(e) => actualizarCampo('fechaVencimiento', e.target.value)}
                    />
                  </div>
                )}
              </div>
            </section>

            {esPasantia && (
              <section className="filter-card p-3 p-md-4 mb-3 shadow-sm">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className="badge rounded-circle bg-primary">2</span>
                  <h2 className="h6 fw-bold text-dark mb-0">Datos de la pasantía</h2>
                </div>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label htmlFor="fechaInicio" className="form-label fw-semibold small">
                      Fecha de inicio
                    </label>
                    <input
                      id="fechaInicio"
                      type="date"
                      className="form-control"
                      value={form.fechaInicioPasantia}
                      onChange={(e) => actualizarCampo('fechaInicioPasantia', e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label htmlFor="fechaFin" className="form-label fw-semibold small">
                      Fecha de finalización
                    </label>
                    <input
                      id="fechaFin"
                      type="date"
                      className="form-control"
                      value={form.fechaFinPasantia}
                      min={form.fechaInicioPasantia || undefined}
                      onChange={(e) => actualizarCampo('fechaFinPasantia', e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label htmlFor="cargaHoraria" className="form-label fw-semibold small">
                      Carga horaria semanal
                    </label>
                    <input
                      id="cargaHoraria"
                      type="number"
                      min="0"
                      className="form-control"
                      value={form.cargaHoraria}
                      onChange={(e) => actualizarCampo('cargaHoraria', e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label htmlFor="asignacion" className="form-label fw-semibold small">
                      Asignación estímulo
                    </label>
                    <input
                      id="asignacion"
                      className="form-control"
                      maxLength={45}
                      value={form.asignacionEstimulo}
                      onChange={(e) => actualizarCampo('asignacionEstimulo', e.target.value)}
                    />
                  </div>
                </div>
              </section>
            )}

            <section className="filter-card p-3 p-md-4 mb-3 shadow-sm">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge rounded-circle bg-primary">{esPasantia ? '3' : '2'}</span>
                  <div>
                    <h2 className="h6 fw-bold text-dark mb-0">Representantes</h2>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Asigna cada representante a una unidad responsable. Las dos unidades
                      principales del convenio pueden coincidir.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary fw-semibold"
                  onClick={() => setRepresentantes((actuales) => [...actuales, representanteVacio()])}
                >
                  + Agregar representante
                </button>
              </div>

              {representantes.length === 0 ? (
                <div className="text-muted small py-2">
                  Agrega al menos un representante y asígnale una unidad responsable.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {representantes.map((representante, indice) => (
                    <div key={`representante-${indice}`} className="border rounded-3 p-3">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="fw-semibold small">Representante {indice + 1}</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-danger text-decoration-none"
                          onClick={() =>
                            setRepresentantes((actuales) => actuales.filter((_, i) => i !== indice))
                          }
                        >
                          Quitar
                        </button>
                      </div>
                      <div className="row g-3">
                        <div className="col-12">
                          <label
                            htmlFor={`representante-${indice}-unidad`}
                            className="form-label fw-semibold small"
                          >
                            Unidad responsable <span className="text-danger">*</span>
                          </label>
                          <select
                            id={`representante-${indice}-unidad`}
                            className="form-select"
                            value={representante.unidad_responsable_id}
                            onChange={(e) =>
                              actualizarRepresentante(indice, 'unidad_responsable_id', e.target.value)
                            }
                            required
                            disabled={catalogosLoading || unidades.length === 0}
                          >
                            <option value="">Selecciona una unidad</option>
                            {unidades.map((unidad) => (
                              <option key={unidad.id} value={unidad.id}>{unidad.nombre}</option>
                            ))}
                          </select>
                        </div>
                        {[
                          ['nombre', 'Nombre'],
                          ['apellido', 'Apellido'],
                          ['cargo', 'Cargo'],
                          ['email', 'Correo electrónico'],
                          ['dni', 'DNI'],
                          ['cuil', 'CUIL'],
                        ].map(([campo, etiqueta]) => (
                          <div key={campo} className="col-12 col-md-6">
                            <label
                              htmlFor={`representante-${indice}-${campo}`}
                              className="form-label fw-semibold small"
                            >
                              {etiqueta}
                            </label>
                            <input
                              id={`representante-${indice}-${campo}`}
                              type={campo === 'email' ? 'email' : 'text'}
                              maxLength={45}
                              className="form-control"
                              value={representante[campo]}
                              onChange={(e) =>
                                actualizarRepresentante(indice, campo, e.target.value)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="filter-card p-3 p-md-4 mb-3 shadow-sm">
              <h2 className="h6 fw-bold text-dark mb-2">Documentos PDF</h2>
              {convenio.documentos?.length > 0 && (
                <div className="small text-muted mb-3">
                  Documentos actuales (se conservan):
                  <ul className="mb-0 mt-1">
                    {convenio.documentos.map((documento) => (
                      <li key={documento.id}>
                        {documento.archivo || documento.nombre_archivo || `Documento ${documento.id}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="text-muted small mb-2">
                Puedes adjuntar el PDF corregido. Se añadirá al convenio y se asociará a este envío.
                Máximo 20 MB.
              </div>
              <input
                ref={inputDocumentoRef}
                type="file"
                accept=".pdf,application/pdf"
                className="d-none"
                onChange={seleccionarDocumento}
                disabled={guardando || !!documentoSubidoId}
              />
              {archivoPdf ? (
                <div className="small text-break">
                  {archivoPdf.name}
                  {documentoSubidoId && <span className="text-success ms-2">PDF cargado</span>}
                  {!documentoSubidoId && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger text-decoration-none"
                      onClick={() => {
                        setArchivoPdf(null);
                        setErrorArchivo('');
                      }}
                      disabled={guardando}
                    >
                      Quitar
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary fw-semibold"
                  onClick={() => inputDocumentoRef.current?.click()}
                  disabled={guardando}
                >
                  + Agregar PDF
                </button>
              )}
              {errorArchivo && <div className="form-text text-danger">{errorArchivo}</div>}
            </section>

            <section className="filter-card p-3 p-md-4 mb-3 shadow-sm">
              <label htmlFor="fundamentoCorreccion" className="form-label fw-semibold small">
                Fundamento de la corrección <span className="text-danger">*</span>
              </label>
              <textarea
                id="fundamentoCorreccion"
                className="form-control"
                rows={3}
                maxLength={45}
                required
                value={fundamentoCorreccion}
                onChange={(e) => setFundamentoCorreccion(e.target.value)}
                placeholder="Este fundamento será incluido en la notificación al revisor."
              />
              <div className="form-text text-end">
                {fundamentoCorreccion.length}/45 caracteres
              </div>
            </section>

            <div className="d-flex flex-wrap justify-content-end gap-2 mb-4">
              <Link href="/inicio" className="btn btn-outline-secondary fw-semibold px-4">
                Cancelar
              </Link>
              <button
                type="submit"
                className="btn text-white fw-semibold px-4"
                style={{ backgroundColor: 'var(--unlpam-blue-btn)' }}
                disabled={guardando || catalogosLoading}
              >
                {guardando ? 'Enviando...' : 'Confirmar corrección y enviar a revisión'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
