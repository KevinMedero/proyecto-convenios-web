'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const representanteVacio = () => ({
  nombre: '',
  apellido: '',
  cargo: '',
  email: '',
  dni: '',
  cuil: '',
});

const extraerLista = (respuesta) =>
  Array.isArray(respuesta) ? respuesta : Array.isArray(respuesta?.data) ? respuesta.data : [];

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

  const textoRespuesta = await response.text();
  let resultado = null;
  if (textoRespuesta) {
    try {
      resultado = JSON.parse(textoRespuesta);
    } catch {
      throw new Error('El servidor devolvió una respuesta inválida al cargar el PDF.');
    }
  }

  if (!response.ok) {
    const mensajeValidacion = resultado?.errors
      ? Object.values(resultado.errors).flat().join(' ')
      : resultado?.message || 'No se pudo cargar el PDF.';
    throw new Error(mensajeValidacion);
  }
};

export default function NuevoConvenioPage() {
  const router = useRouter();
  const inputDocumentoRef = useRef(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

  const [tiposInstrumento, setTiposInstrumento] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [catalogosLoading, setCatalogosLoading] = useState(true);
  const [catalogosError, setCatalogosError] = useState('');
  const [padreId, setPadreId] = useState('');
  const [form, setForm] = useState({
    titulo: '',
    tipoId: '',
    unidadId: '',
    unidadSecundariaId: '',
    fechaVencimiento: '',
    fechaInicioPasantia: '',
    fechaFinPasantia: '',
    cargaHoraria: '',
    asignacionEstimulo: '',
  });
  const [representantes, setRepresentantes] = useState([]);
  const [archivoPdf, setArchivoPdf] = useState(null);
  const [errorArchivo, setErrorArchivo] = useState('');
  const [convenioCreadoId, setConvenioCreadoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [accesoPermitido] = useState(() => {
    if (typeof window === 'undefined') return null;

    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    const rawRol = typeof userData.rol === 'string'
      ? userData.rol
      : userData.rol?.nombre || 'consulta';
    const rol = rawRol
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return ['administracion', 'administrador', 'admin'].includes(rol);
  });

  useEffect(() => {
    if (accesoPermitido === false) {
      router.replace('/inicio');
    }
  }, [accesoPermitido, router]);

  useEffect(() => {
    if (accesoPermitido !== true) return;

    let activo = true;

    const cargarDatos = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setCatalogosError('La sesión no está disponible. Inicia sesión nuevamente.');
        setCatalogosLoading(false);
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      };

      try {
        const [tiposResponse, unidadesResponse] = await Promise.all([
          fetch(`${apiUrl}/tipos-instrumento`, { headers }),
          fetch(`${apiUrl}/unidades`, { headers }),
        ]);

        if (!tiposResponse.ok || !unidadesResponse.ok) {
          throw new Error('No se pudieron cargar los catálogos para crear el convenio.');
        }

        const [tiposData, unidadesData] = await Promise.all([
          tiposResponse.json(),
          unidadesResponse.json(),
        ]);

        if (activo) {
          setTiposInstrumento(extraerLista(tiposData));
          setUnidades(extraerLista(unidadesData));
        }
      } catch (err) {
        if (activo) setCatalogosError(err.message);
      } finally {
        if (activo) setCatalogosLoading(false);
      }
    };

    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Read renewal context from the URL after hydration.
    setPadreId(params.get('padre_id') || '');
    cargarDatos();

    return () => {
      activo = false;
    };
  }, [apiUrl, accesoPermitido]);

  const tipoSeleccionado = tiposInstrumento.find(
    (tipo) => String(tipo.id) === String(form.tipoId)
  );
  const esPasantia = (tipoSeleccionado?.nombre || '').toLowerCase().includes('pasant');

  const actualizarCampo = (campo, valor) => {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  };

  const actualizarUnidadPrincipal = (valor) => {
    setForm((actual) => ({
      ...actual,
      unidadId: valor,
      unidadSecundariaId:
        String(actual.unidadSecundariaId) === String(valor) ? '' : actual.unidadSecundariaId,
    }));
  };

  const actualizarRepresentante = (indice, campo, valor) => {
    setRepresentantes((actuales) =>
      actuales.map((representante, i) =>
        i === indice ? { ...representante, [campo]: valor } : representante
      )
    );
  };

  const agregarRepresentante = () => {
    setRepresentantes((actuales) => [...actuales, representanteVacio()]);
  };

  const quitarRepresentante = (indice) => {
    setRepresentantes((actuales) => actuales.filter((_, i) => i !== indice));
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

  const reintentarCargaDocumento = async () => {
    if (!convenioCreadoId || !archivoPdf) return;

    setError('');
    setGuardando(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('La sesión no está disponible. Inicia sesión nuevamente.');
      await subirDocumento(apiUrl, token, convenioCreadoId, archivoPdf);
      router.push('/inicio');
    } catch (err) {
      setError(`El convenio se guardó, pero no se pudo cargar el PDF: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    let idConvenioCreado = null;

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setError('La sesión no está disponible. Inicia sesión nuevamente.');
      setGuardando(false);
      return;
    }

    if (
      !form.unidadId ||
      !form.unidadSecundariaId ||
      String(form.unidadId) === String(form.unidadSecundariaId)
    ) {
      setError('Selecciona dos unidades responsables distintas para el convenio.');
      setGuardando(false);
      return;
    }

    const personas = representantes
      .filter((representante) =>
        Object.values(representante).some((valor) => valor.trim() !== '')
      )
      .map((representante) => ({
        ...representante,
        nombre: representante.nombre.trim(),
        apellido: representante.apellido.trim(),
        cargo: representante.cargo.trim(),
        email: representante.email.trim(),
        dni: representante.dni.trim(),
        cuil: representante.cuil.trim(),
      }));

    const payload = {
      titulo: form.titulo.trim(),
      tipo_instrumento_id: Number(form.tipoId),
      unidad_id: Number(form.unidadId),
      unidad_responsable_secundaria_id: Number(form.unidadSecundariaId),
      estado: 'borrador',
      fecha_vencimiento:
        form.fechaVencimiento || (esPasantia ? form.fechaFinPasantia : '') || null,
      convenio_padre_id: padreId ? Number(padreId) : null,
      representantes: personas,
      ...(esPasantia && {
        detalle_pasantia: {
          fecha_inicio_pasantia: form.fechaInicioPasantia || null,
          fecha_fin_pasantia: form.fechaFinPasantia || null,
          carga_horaria_semanal: form.cargaHoraria || null,
          asignacion_estimulo: form.asignacionEstimulo || null,
        },
      }),
    };

    try {
      const response = await fetch(`${apiUrl}/convenios`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const textoRespuesta = await response.text();
      let resultado = null;
      if (textoRespuesta) {
        try {
          resultado = JSON.parse(textoRespuesta);
        } catch {
          throw new Error('El servidor devolvió una respuesta inválida al guardar el convenio.');
        }
      }

      if (!response.ok) {
        const mensajeValidacion = resultado?.errors
          ? Object.values(resultado.errors).flat().join(' ')
          : resultado?.message || 'No se pudo guardar el convenio.';
        throw new Error(mensajeValidacion);
      }

      idConvenioCreado = resultado?.id;
      if (archivoPdf) {
        if (!idConvenioCreado) {
          throw new Error('El convenio se guardó, pero la API no devolvió su identificador para asociar el PDF.');
        }
        setConvenioCreadoId(idConvenioCreado);
        await subirDocumento(apiUrl, token, idConvenioCreado, archivoPdf);
      }

      router.push('/inicio');
    } catch (err) {
      setError(
        idConvenioCreado && archivoPdf
          ? `El convenio se guardó, pero no se pudo cargar el PDF: ${err.message}`
          : err.message
      );
      setGuardando(false);
    }
  };

  if (accesoPermitido !== true) return null;

  return (
    <div className="mx-auto" style={{ maxWidth: '1000px' }}>
      <div className="mb-3" style={{ fontSize: '0.8rem', color: '#6b7280' }}>
        <Link href="/convenios" className="text-decoration-none text-muted">
          Convenios
        </Link>{' '}
        <span>›</span> <span>Nuevo convenio</span>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title mb-1">Nuevo convenio</h1>
          <p className="text-muted small mb-0">
            Completa los datos principales. El convenio se guardará como borrador.
          </p>
        </div>
        <span className="badge rounded-pill bg-light text-secondary border px-3 py-2">
          Borrador
        </span>
      </div>

      {padreId && (
        <div className="alert alert-info py-2 small">
          Este convenio se vinculará como renovación o derivado del convenio #{padreId}.
        </div>
      )}
      {catalogosError && <div className="alert alert-danger py-2 small">{catalogosError}</div>}
      {error && <div className="alert alert-danger py-2 small">{error}</div>}

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
                placeholder="Ej.: Convenio marco de cooperación"
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
                <option value="">
                  {catalogosLoading ? 'Cargando tipos...' : 'Selecciona un tipo'}
                </option>
                {tiposInstrumento.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label htmlFor="unidad" className="form-label fw-semibold small">
                Unidad responsable <span className="text-danger">*</span>
              </label>
              <select
                id="unidad"
                className="form-select"
                value={form.unidadId}
                onChange={(e) => actualizarUnidadPrincipal(e.target.value)}
                required
                disabled={catalogosLoading || unidades.length === 0}
              >
                <option value="">
                  {catalogosLoading ? 'Cargando unidades...' : 'Selecciona una unidad'}
                </option>
                {unidades.map((unidad) => (
                  <option key={unidad.id} value={unidad.id}>
                    {unidad.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6 offset-md-6">
              <label htmlFor="unidadSecundaria" className="form-label fw-semibold small">
                Segunda unidad responsable <span className="text-danger">*</span>
              </label>
              <select
                id="unidadSecundaria"
                className="form-select"
                value={form.unidadSecundariaId}
                onChange={(e) => actualizarCampo('unidadSecundariaId', e.target.value)}
                required
                disabled={catalogosLoading || unidades.length < 2}
              >
                <option value="">
                  {catalogosLoading
                    ? 'Cargando unidades...'
                    : 'Selecciona una segunda unidad'}
                </option>
                {unidades
                  .filter((unidad) => String(unidad.id) !== String(form.unidadId))
                  .map((unidad) => (
                    <option key={unidad.id} value={unidad.id}>
                      {unidad.nombre}
                    </option>
                  ))}
              </select>
              {!catalogosLoading && unidades.length < 2 && (
                <div className="form-text text-danger">
                  Se necesitan al menos dos unidades responsables registradas.
                </div>
              )}
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
                <div className="form-text">Deja el campo vacío si no tiene vencimiento.</div>
              </div>
            )}
          </div>
        </section>

        <section className="filter-card p-3 p-md-4 mb-3 shadow-sm">
          <div className="d-flex align-items-center gap-2 mb-3">
            <div>
              <h2 className="h6 fw-bold text-dark mb-0">Documento PDF</h2>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                Opcional. Se guardará junto al convenio (máximo 20 MB).
              </div>
            </div>
          </div>
          <input
            ref={inputDocumentoRef}
            type="file"
            accept=".pdf,application/pdf"
            className="d-none"
            onChange={seleccionarDocumento}
            disabled={guardando || !!convenioCreadoId}
          />
          {archivoPdf ? (
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small text-break">{archivoPdf.name}</span>
              {!convenioCreadoId && (
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
              disabled={guardando || !!convenioCreadoId}
            >
              + Agregar PDF
            </button>
          )}
          {errorArchivo && <div className="form-text text-danger">{errorArchivo}</div>}
          {convenioCreadoId && archivoPdf && (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary fw-semibold mt-2"
              onClick={reintentarCargaDocumento}
              disabled={guardando}
            >
              Reintentar carga del PDF
            </button>
          )}
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
                  value={form.asignacionEstimulo}
                  onChange={(e) => actualizarCampo('asignacionEstimulo', e.target.value)}
                  placeholder="Opcional"
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
                  Agrega las personas que representan a las partes del convenio.
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary fw-semibold"
              onClick={agregarRepresentante}
            >
              + Agregar representante
            </button>
          </div>

          {representantes.length === 0 ? (
            <div className="text-muted small py-2">
              No agregaste representantes. Puedes incorporarlos ahora o hacerlo más adelante.
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
                      onClick={() => quitarRepresentante(indice)}
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="row g-3">
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

        <div className="d-flex flex-wrap justify-content-end gap-2 mb-4">
          <Link href="/convenios" className="btn btn-outline-secondary fw-semibold px-4">
            Cancelar
          </Link>
          <button
            type="submit"
            className="btn text-white fw-semibold px-4"
            style={{ backgroundColor: 'var(--unlpam-blue-btn)' }}
            disabled={guardando || catalogosLoading || !!catalogosError || !!convenioCreadoId}
          >
            {guardando ? 'Guardando...' : convenioCreadoId ? 'Convenio guardado' : 'Guardar borrador'}
          </button>
        </div>
      </form>
    </div>
  );
}
