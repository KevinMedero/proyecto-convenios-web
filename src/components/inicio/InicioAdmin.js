'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Pagination from '@/components/common/Pagination';
import ConvenioActionCard from '@/components/common/ConvenioActionCard';

export default function InicioAdmin() {
  const [convenios, setConvenios] = useState([]);
  const [paginacion, setPaginacion] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    from: 0,
    to: 0,
  });
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

  useEffect(() => {
    let active = true;

    const fetchConvenios = async () => {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams({
          estado: 'aprobado',
          page: String(pagina),
        });
        const response = await fetch(`${apiUrl}/convenios?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('No se pudieron cargar los convenios pendientes de firma.');
        }

        const result = await response.json();
        const lista = Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : [];

        if (!active) return;

        setConvenios(lista);
        setPaginacion({
          current_page: result.current_page || pagina,
          last_page: result.last_page || 1,
          total: result.total ?? lista.length,
          from: lista.length === 0 ? 0 : (result.from || 1),
          to: lista.length === 0 ? 0 : (result.to || lista.length),
        });
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchConvenios();

    return () => {
      active = false;
    };
  }, [apiUrl, pagina]);

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="page-title mb-1">Panel de Administración</h1>
          <p className="text-muted small mb-0">
            Convenios aprobados que están listos para ser firmados.
          </p>
        </div>
        <Link
          href="/convenios/nuevo"
          className="btn btn-sm text-white fw-semibold px-3 py-2"
          style={{
            backgroundColor: 'var(--unlpam-blue-btn)',
            borderRadius: '6px',
            fontSize: '0.82rem',
          }}
        >
          + Nuevo convenio
        </Link>
      </div>

      <div className="filter-card p-3 mb-4 shadow-sm d-flex align-items-center gap-3">
        <div
          className="fw-bold"
          style={{ color: 'var(--unlpam-blue-btn)', fontSize: '1.6rem', lineHeight: 1 }}
        >
          {paginacion.total}
        </div>
        <div>
          <div className="fw-semibold text-dark">Pendientes de firma</div>
          <div className="text-muted" style={{ fontSize: '0.78rem' }}>
            Convenios aprobados que requieren registrar la firma.
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      <div className="d-flex justify-content-between align-items-center mb-2 mt-2">
        <h2 className="h6 fw-bold text-dark mb-0">Listos para ser firmados</h2>
        <span className="text-muted" style={{ fontSize: '0.8rem' }}>
          {paginacion.total} {paginacion.total === 1 ? 'convenio' : 'convenios'}
        </span>
      </div>

      {loading ? (
        <div className="text-muted py-4 small">Cargando convenios pendientes de firma...</div>
      ) : convenios.length === 0 ? (
        <div className="filter-card p-4 text-center text-muted small mb-3">
          No hay convenios listos para ser firmados.
        </div>
      ) : (
        <div className="d-flex flex-column gap-2 mb-3">
          {convenios.map((convenio) => (
            <ConvenioActionCard
              key={convenio.id}
              convenio={convenio}
              bordeColor="#eab308"
              badgeTexto="• Pendiente de firma"
              badgeBg="#fef3c7"
              badgeColor="#92400e"
              accionPrimariaTexto="Registrar firma"
            />
          ))}
        </div>
      )}

      <Pagination paginacion={paginacion} pagina={pagina} setPagina={setPagina} />
    </div>
  );
}
