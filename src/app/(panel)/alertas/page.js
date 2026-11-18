'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/common/Pagination';

// Etiqueta y estilo de cada tipo que genera el observer
const TIPOS = {
  nuevo_convenio: { label: 'Nuevo', clase: 'badge-tipo badge-tipo-nuevo' },
  cambio_datos: { label: 'Cambio', clase: 'badge-tipo badge-tipo-cambio' },
  cancelado: { label: 'Cancelado', clase: 'badge-tipo badge-tipo-cancelado' },
};

export default function Alertas() {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [paginacion, setPaginacion] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [pagina, setPagina] = useState(1);
  const [recarga, setRecarga] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

  const llamar = async (ruta, metodo = 'GET') => {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      router.replace('/login');
      return null;
    }

    const response = await fetch(`${apiUrl}${ruta}`, {
      method: metodo,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      router.replace('/login');
      return null;
    }

    return response;
  };

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({ page: pagina });
        if (soloNoLeidas) params.set('no_leidas', '1');

        const response = await llamar(`/notificaciones?${params}`);
        if (!response) return;

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'No se pudieron cargar las alertas.');
        }

        const ultimaPagina = Math.max(data.last_page || 1, 1);
        setItems(data.data || []);
        setPaginacion({
          current_page: data.current_page || 1,
          last_page: ultimaPagina,
          total: data.total || 0,
          from: data.from || 0,
          to: data.to || 0,
        });
        setNoLeidas(data.no_leidas || 0);

        if (pagina > ultimaPagina) {
          setPagina(ultimaPagina);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, soloNoLeidas, recarga]);

    const marcarLeida = async (id) => {
        const response = await llamar(`/notificaciones/${id}/leida`, 'POST');
        if (response?.ok) {
            setNoLeidas((n) => Math.max(0, n - 1));
            window.dispatchEvent(new CustomEvent('alertas:actualizadas', { detail: { restar: 1 } }));
        }
        setRecarga((r) => r + 1);
    };

    const marcarTodas = async () => {
        const response = await llamar('/notificaciones/leidas', 'POST');
        if (response?.ok) {
            window.dispatchEvent(new CustomEvent('alertas:actualizadas', { detail: { reset: true } }));
        }
        setRecarga((r) => r + 1);
    };

  return (
    <div className="p-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="page-title mb-0">Alertas</h1>
        <button
          type="button"
          className="btn btn-unlpam btn-sm"
          onClick={marcarTodas}
          disabled={noLeidas === 0}
        >
          Marcar todas como leídas
        </button>
      </div>

      {/* Filtros */}
      <div className="filter-card p-3 mb-3 d-flex align-items-center gap-3">
        <div className="form-check mb-0">
          <input
            id="solo-no-leidas"
            type="checkbox"
            className="form-check-input"
            checked={soloNoLeidas}
            onChange={(e) => {
              setSoloNoLeidas(e.target.checked);
              setPagina(1);
            }}
          />
          <label htmlFor="solo-no-leidas" className="form-check-label">
            Solo no leídas
          </label>
        </div>
        <span className="text-muted small ms-auto">
          {noLeidas} sin leer
        </span>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="table-card">
        <table className="table table-borderless mb-0">
          <thead>
            <tr>
              <th scope="col">Estado</th>
              <th scope="col">Tipo</th>
              <th scope="col">Alerta</th>
              <th scope="col">Fecha</th>
              <th scope="col" className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  Cargando...
                </td>
              </tr>
            )}

            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  No hay alertas.
                </td>
              </tr>
            )}

            {!loading &&
              items.map((n) => {
                const tipo = TIPOS[n.tipo] ?? { label: n.tipo, clase: 'badge-tipo badge-tipo-cambio' };

                return (
                  <tr key={n.id} className={n.leida_en ? '' : 'alert-row-unread'}>
                    <td>
                      {n.leida_en ? (
                        <span className="text-muted">Leída</span>
                      ) : (
                        <span className="badge-no-leida">Nueva</span>
                      )}
                    </td>
                    <td>
                      <span className={tipo.clase}>{tipo.label}</span>
                    </td>
                    <td>
                      <div className="fw-semibold">{n.titulo}</div>
                      <div className="text-muted">{n.mensaje}</div>
                    </td>
                    <td className="text-nowrap">
                      {new Date(n.created_at).toLocaleString('es-AR')}
                    </td>
                    <td className="text-end text-nowrap">
                      {n.convenio_id && (
                        <Link
                          href={`/convenios/${n.convenio_id}`}
                          className="btn btn-sm btn-unlpam-outline me-2"
                        >
                          Ver convenio
                        </Link>
                      )}
                      {!n.leida_en && (
                        <button
                          type="button"
                          className="btn btn-sm btn-unlpam-outline"
                          onClick={() => marcarLeida(n.id)}
                        >
                          Marcar leída
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>


      {/* Controles de paginación */}
      <Pagination paginacion={paginacion} pagina={pagina} setPagina={setPagina} />
    </div>
  );
}