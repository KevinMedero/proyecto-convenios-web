'use client';

import Link from 'next/link';
import StatusBadge from '@/components/common/StatusBadge';

export default function ConvenioActionCard({
  convenio,
  bordeColor = '#d1d5db',
  badgeTexto = '',
  badgeBg = '#e5e7eb',
  badgeColor = '#374151',
  accionPrimariaTexto = '',
  accionPrimariaHref = '',
  onVerClick,
}) {
  return (
    <div
      className="bg-white rounded-3 shadow-sm px-3 py-3 d-flex flex-wrap justify-content-between align-items-center gap-3"
      style={{
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${bordeColor}`,
      }}
    >
      {/* Datos e insignias a la izquierda */}
      <div>
        <div className="text-muted fw-semibold" style={{ fontSize: '0.73rem' }}>
          {convenio.codigo}
        </div>
        <div className="fw-bold text-dark mb-1" style={{ fontSize: '0.92rem' }}>
          {convenio.titulo}
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <StatusBadge estado={convenio.estado} />
          {badgeTexto && (
            <span
              className="badge rounded-pill fw-semibold"
              style={{
                backgroundColor: badgeBg,
                color: badgeColor,
                fontSize: '0.72rem',
                padding: '0.32em 0.65em',
              }}
            >
              {badgeTexto}
            </span>
          )}
        </div>
      </div>

      {/* Botones a la derecha */}
      <div className="d-flex align-items-center gap-2">
        <Link
          href={`/convenios/${convenio.id}`}
          onClick={() => onVerClick && onVerClick(convenio)}
          className="btn btn-sm bg-white fw-semibold px-3 py-2 text-nowrap"
          style={{
            color: 'var(--unlpam-blue-btn)',
            border: '1.5px solid var(--unlpam-blue-btn)',
            borderRadius: '8px',
            fontSize: '0.8rem',
          }}
        >
          Ver convenio
        </Link>

        {accionPrimariaTexto && (
          accionPrimariaHref ? (
            <Link
              href={accionPrimariaHref}
              onClick={() => onVerClick && onVerClick(convenio)}
              className="btn btn-sm text-white fw-semibold px-3 py-2 text-nowrap"
              style={{
                backgroundColor: 'var(--unlpam-blue-btn)',
                border: '1.5px solid var(--unlpam-blue-btn)',
                borderRadius: '8px',
                fontSize: '0.8rem',
              }}
            >
              {accionPrimariaTexto}
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-sm text-white fw-semibold px-3 py-2 text-nowrap"
              style={{
                backgroundColor: 'var(--unlpam-blue-btn)',
                border: '1.5px solid var(--unlpam-blue-btn)',
                borderRadius: '8px',
                fontSize: '0.8rem',
              }}
            >
              {accionPrimariaTexto}
            </button>
          )
        )}
      </div>
    </div>
  );
}