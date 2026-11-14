'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/common/StatusBadge';

export default function ConveniosTable({
  convenios = [],
  loading = false,
  mensajeCargando = 'Cargando convenios...',
  mensajeVacio = 'No se encontraron convenios con los filtros seleccionados.',
  onVerClick,
}) {
  // Estado interno para controlar qué filas padre están expandidas mostrando sus convenios hijos/adendas
  const [expandidos, setExpandidos] = useState({});

  const toggleExpandir = (id) => {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Devuelve la etiqueta según el tipo de instrumento del convenio hijo
  const obtenerEtiquetaRelacion = (hijo) => {
    const tipo = (hijo.tipo_instrumento?.nombre || '').toLowerCase();
    if (tipo.includes('específico') || tipo.includes('especifico')) return 'Específico de';
    if (tipo.includes('adenda')) return 'Adenda de';
    if (tipo.includes('renovación') || tipo.includes('renovacion')) return 'Renovación de';
    return 'Relacionado de';
  };

  // Formatea la vigencia del convenio
  const formatearVigencia = (conv) => {
    const fechaVenc = conv.fecha_vencimiento || conv.detalle_pasantia?.fecha_fin_pasantia;
    if (!fechaVenc) return 'Sin vencimiento registrado';

    const soloFecha = String(fechaVenc).split('T')[0].split(' ')[0];
    const [anio, mes, dia] = soloFecha.split('-');
    return `Vence ${dia}/${mes}/${anio}`;
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
              style={{ paddingLeft: `${nivel * 24}px` }}
            >
              {/* Flecha desplegable si este convenio tiene hijos */}
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
                <div className="fw-bold text-dark">{conv.titulo}</div>
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
            {conv.unidad?.nombre || 'Ingeniería'}
          </td>
          <td>
            <StatusBadge estado={conv.estado} />
          </td>
          <td className="text-secondary" style={{ fontSize: '0.8rem' }}>
            {formatearVigencia(conv)}
          </td>
          <td className="text-end">
            <Link
              href={`/convenios/${conv.id}`}
              onClick={() => onVerClick && onVerClick(conv)}
              className="text-decoration-none fw-semibold"
              style={{ color: 'var(--unlpam-blue-btn)', fontSize: '0.82rem' }}
            >
              Ver
            </Link>
          </td>
        </tr>

        {estaExpandido && hijos.map((hijo) => renderizarFilasConvenio(hijo, nivel + 1))}
      </Fragment>
    );
  };

  return (
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
                  {mensajeCargando}
                </td>
              </tr>
            ) : convenios.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-muted">
                  {mensajeVacio}
                </td>
              </tr>
            ) : (
              (conveniosRaiz.length > 0 ? conveniosRaiz : convenios).map((conv) =>
                renderizarFilasConvenio(conv, 0)
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}