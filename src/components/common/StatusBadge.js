'use client';

export default function StatusBadge({ estado }) {
  const est = (estado || '').toLowerCase();

  const estilos = {
    firmado: { texto: 'Firmado', bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
    revision: { texto: 'En revisión', bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
    aprobado: { texto: 'Aprobado', bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
    borrador: { texto: 'Borrador', bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' },
    rescindido: { texto: 'Rescindido', bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
    archivado: { texto: 'Archivado', bg: '#e5e7eb', color: '#4b5563', border: '#d1d5db' },
  };

  const info = estilos[est] || {
    texto: estado || 'Sin estado',
    bg: '#f3f4f6',
    color: '#374151',
    border: '#e5e7eb',
  };

  return (
    <span
      className="badge rounded-pill fw-semibold"
      style={{
        backgroundColor: info.bg,
        color: info.color,
        border: `1px solid ${info.border}`,
        fontSize: '0.72rem',
        padding: '0.32em 0.65em',
      }}
    >
      {info.texto}
    </span>
  );
}