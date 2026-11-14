'use client';

export default function Header({ user }) {
  // Normalizamos y formateamos el rol con mayúscula inicial
  const rolActual = (user?.rol || 'consulta').toLowerCase();
  const rolFormateado =
    rolActual === 'admin' || rolActual === 'administrador'
      ? 'Administrador'
      : rolActual.charAt(0).toUpperCase() + rolActual.slice(1);

  return (
    <header
      className="py-2 px-4 border-bottom d-flex justify-content-end align-items-center"
      style={{ borderColor: '#e6e3dc' }}
    >
      <div className="text-end" style={{ lineHeight: '1.25' }}>
        <div className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>
          {user?.name || user?.nombre || 'Usuario'}
        </div>
        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
          {rolFormateado} · {user?.unidad || 'Facultad de Ingeniería'}
        </div>
      </div>
    </header>
  );
}