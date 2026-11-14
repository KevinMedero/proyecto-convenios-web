'use client';

export default function Pagination({ paginacion, pagina, setPagina }) {
  return (
    <div className="d-flex justify-content-between align-items-center px-1">
      <span className="text-muted" style={{ fontSize: '0.78rem' }}>
        Mostrando {paginacion.from || 0}–{paginacion.to || 0} de {paginacion.total}
      </span>

      <nav>
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${pagina <= 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setPagina(pagina - 1)}>
              ‹
            </button>
          </li>
          {Array.from({ length: paginacion.last_page }, (_, i) => i + 1).map((num) => (
            <li key={num} className={`page-item ${pagina === num ? 'active' : ''}`}>
              <button
                className="page-link"
                style={
                  pagina === num
                    ? { backgroundColor: 'var(--unlpam-blue-btn)', borderColor: 'var(--unlpam-blue-btn)' }
                    : {}
                }
                onClick={() => setPagina(num)}
              >
                {num}
              </button>
            </li>
          ))}
          <li className={`page-item ${pagina >= paginacion.last_page ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setPagina(pagina + 1)}>
              ›
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}