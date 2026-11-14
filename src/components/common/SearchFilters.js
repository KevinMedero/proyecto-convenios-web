'use client';

export default function SearchFilters({
  rol = 'consulta',
  q,
  setQ,
  tipoId,
  setTipoId,
  estado,
  setEstado,
  unidadId,
  setUnidadId,
  fechaDesde,
  setFechaDesde,
  fechaHasta,
  setFechaHasta,
  tiposInstrumento = [],
  unidades = [],
  onLimpiar,
  onResetPagina,
}) {
  const rolNorm = rol.toLowerCase();
  const esConsulta = rolNorm === 'consulta';
  const esRevisor = rolNorm === 'revisor';
  const esGestor = rolNorm === 'gestor';

  // Consulta solo ve 'firmado' y Revisor solo ve 'revision'
  const estadoBloqueado = esConsulta || esRevisor;
  const valorEstadoActual = esConsulta ? 'firmado' : esRevisor ? 'revision' : estado;

  // Opciones cuando el selector está habilitado (Gestor no ve 'revision'; Administrador ve todos)
  const opcionesEstado = [
    { value: '', label: 'Todos' },
    { value: 'borrador', label: 'Borrador' },
    ...(!esGestor ? [{ value: 'revision', label: 'En revisión' }] : []),
    { value: 'aprobado', label: 'Aprobado' },
    { value: 'firmado', label: 'Firmado' },
    { value: 'rescindido', label: 'Rescindido' },
    { value: 'archivado', label: 'Archivado' },
  ];

  const handleCambio = (setter, valor) => {
    setter(valor);
    if (onResetPagina) onResetPagina();
  };

  return (
    <div className="filter-card p-3 mb-3 shadow-sm">
      <div className="row g-2 align-items-end">
        {/* Buscador más compacto (3 columnas) */}
        <div className="col-12 col-lg-3">
          <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: '0.75rem' }}>
            Buscar
          </label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Código, título o entidad"
            value={q}
            onChange={(e) => handleCambio(setQ, e.target.value)}
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
            onChange={(e) => handleCambio(setTipoId, e.target.value)}
          >
            <option value="">Todos</option>
            {tiposInstrumento.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Estado (bloqueado en Consulta/Revisor; habilitado en Gestor/Admin) */}
        <div className="col-6 col-md-3 col-lg-auto" style={{ minWidth: '115px' }}>
          <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: '0.75rem' }}>
            Estado
          </label>
          {estadoBloqueado ? (
            <select className="form-select form-select-sm bg-light" value={valorEstadoActual} disabled>
              <option value="firmado">Firmado</option>
              <option value="revision">En revisión</option>
            </select>
          ) : (
            <select
              className="form-select form-select-sm"
              value={valorEstadoActual}
              onChange={(e) => handleCambio(setEstado, e.target.value)}
            >
              {opcionesEstado.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Filtro por Unidad Responsable */}
        <div className="col-6 col-md-3 col-lg">
          <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: '0.75rem' }}>
            Unidad
          </label>
          <select
            className="form-select form-select-sm"
            value={unidadId}
            onChange={(e) => handleCambio(setUnidadId, e.target.value)}
          >
            <option value="">Todas</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Fecha Desde (ancho suficiente para ver dd/mm/aaaa completo) */}
        <div className="col-6 col-md-3 col-lg-auto" style={{ minWidth: '135px' }}>
          <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: '0.75rem' }}>
            {esConsulta ? 'Firma desde' : 'Fecha desde'}
          </label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={fechaDesde}
            onChange={(e) => handleCambio(setFechaDesde, e.target.value)}
          />
        </div>

        {/* Filtro Fecha Hasta (ancho suficiente para ver dd/mm/aaaa completo) */}
        <div className="col-6 col-md-3 col-lg-auto" style={{ minWidth: '135px' }}>
          <label className="form-label fw-semibold text-dark mb-1" style={{ fontSize: '0.75rem' }}>
            {esConsulta ? 'Firma hasta' : 'Fecha hasta'}
          </label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={fechaHasta}
            onChange={(e) => handleCambio(setFechaHasta, e.target.value)}
          />
        </div>

        {/* Botón Limpiar Filtros ajustado a su texto */}
        <div className="col-6 col-md-3 col-lg-auto text-end">
          <button
            type="button"
            onClick={onLimpiar}
            className="btn btn-link btn-sm text-decoration-none fw-semibold px-1 mb-1 text-nowrap"
            style={{ color: 'var(--unlpam-blue-btn)', fontSize: '0.78rem' }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );
}