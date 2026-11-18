'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLES = [
  { value: 'administracion', label: 'Administración' },
  { value: 'gestion', label: 'Gestión' },
  { value: 'revision', label: 'Revisión' },
  { value: 'consulta', label: 'Consulta' },
  { value: 'decano', label: 'Decano' },
];

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

function mensajeDeError(data, fallback) {
  return data?.errors
    ? Object.values(data.errors).flat().join(' ')
    : data?.message || fallback;
}

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [errorAccion, setErrorAccion] = useState('');
  const [exito, setExito] = useState('');
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
  const [formulario, setFormulario] = useState({
    name: '',
    email: '',
    rol: 'consulta',
    telefono: '',
  });

  useEffect(() => {
    let cancelado = false;

    const cargarUsuarios = async () => {
      setCargando(true);
      setError('');

      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.replace('/');
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/users/manage`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          router.replace('/');
          return;
        }

        const data = await response.json();
        if (!response.ok) {
          throw new Error(mensajeDeError(data, 'No se pudieron cargar los usuarios.'));
        }

        if (!cancelado) setUsuarios(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargarUsuarios();
    return () => {
      cancelado = true;
    };
  }, [router]);

  const abrirEdicion = (usuario) => {
    setFormulario({
      name: usuario.name || '',
      email: usuario.email || '',
      rol: usuario.rol || 'consulta',
      telefono: usuario.telefono || '',
    });
    setErrorAccion('');
    setUsuarioEditando(usuario);
  };

  const cerrarModales = () => {
    if (procesando) return;
    setUsuarioEditando(null);
    setUsuarioAEliminar(null);
    setErrorAccion('');
  };

  const guardarCambios = async (event) => {
    event.preventDefault();
    if (!usuarioEditando) return;

    setProcesando(true);
    setErrorAccion('');
    setExito('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${apiUrl}/users/manage/${usuarioEditando.id}`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formulario,
          telefono: formulario.telefono.trim() || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(mensajeDeError(data, 'No se pudieron guardar los cambios.'));
      }

      setUsuarios((actuales) =>
        actuales.map((usuario) => (usuario.id === data.id ? data : usuario))
      );
      setUsuarioEditando(null);
      setExito('Los datos del usuario se actualizaron.');
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const eliminarUsuario = async () => {
    if (!usuarioAEliminar) return;

    setProcesando(true);
    setErrorAccion('');
    setExito('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${apiUrl}/users/manage/${usuarioAEliminar.id}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(mensajeDeError(data, 'No se pudo eliminar el usuario.'));
      }

      setUsuarios((actuales) =>
        actuales.filter((usuario) => usuario.id !== usuarioAEliminar.id)
      );
      setExito(`Se eliminó el usuario ${usuarioAEliminar.name}.`);
      setUsuarioAEliminar(null);
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="page-title mb-1">Usuarios</h1>
          <p className="text-muted small mb-0">
            Administración de las cuentas y sus roles.
          </p>
        </div>
        <span className="text-muted small">
          {usuarios.length} {usuarios.length === 1 ? 'usuario' : 'usuarios'}
        </span>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      {exito && <div className="alert alert-success py-2 small">{exito}</div>}

      {cargando ? (
        <div className="text-muted py-4 small">Cargando usuarios...</div>
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Correo electrónico</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Teléfono</th>
                  <th scope="col" className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td className="fw-semibold">{usuario.name}</td>
                    <td>{usuario.email}</td>
                    <td>
                      {ROLES.find((rol) => rol.value === usuario.rol)?.label || usuario.rol}
                    </td>
                    <td>{usuario.telefono || '—'}</td>
                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary fw-semibold"
                          onClick={() => abrirEdicion(usuario)}
                        >
                          Modificar
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger fw-semibold"
                          onClick={() => {
                            setErrorAccion('');
                            setUsuarioAEliminar(usuario);
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      No hay usuarios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {usuarioEditando && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={cerrarModales}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(event) => event.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <form onSubmit={guardarCambios}>
                <div className="modal-header">
                  <h2 className="modal-title fs-6 fw-bold">Modificar usuario</h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Cerrar"
                    onClick={cerrarModales}
                    disabled={procesando}
                  />
                </div>
                <div className="modal-body">
                  {errorAccion && <div className="alert alert-danger py-2 small">{errorAccion}</div>}
                  <div className="mb-3">
                    <label className="form-label fw-semibold small" htmlFor="usuario-nombre">Nombre</label>
                    <input
                      id="usuario-nombre"
                      className="form-control"
                      value={formulario.name}
                      onChange={(event) => setFormulario({ ...formulario, name: event.target.value })}
                      maxLength={255}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small" htmlFor="usuario-email">Correo electrónico</label>
                    <input
                      id="usuario-email"
                      type="email"
                      className="form-control"
                      value={formulario.email}
                      onChange={(event) => setFormulario({ ...formulario, email: event.target.value })}
                      maxLength={255}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small" htmlFor="usuario-rol">Rol</label>
                    <select
                      id="usuario-rol"
                      className="form-select"
                      value={formulario.rol}
                      onChange={(event) => setFormulario({ ...formulario, rol: event.target.value })}
                      required
                    >
                      {ROLES.map((rol) => (
                        <option key={rol.value} value={rol.value}>{rol.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label fw-semibold small" htmlFor="usuario-telefono">Teléfono</label>
                    <input
                      id="usuario-telefono"
                      className="form-control"
                      value={formulario.telefono}
                      onChange={(event) => setFormulario({ ...formulario, telefono: event.target.value })}
                      maxLength={45}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary fw-semibold"
                    onClick={cerrarModales}
                    disabled={procesando}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-sm btn-primary fw-semibold" disabled={procesando}>
                    {procesando ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {usuarioAEliminar && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={cerrarModales}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(event) => event.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h2 className="modal-title fs-6 fw-bold">Eliminar usuario</h2>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Cerrar"
                  onClick={cerrarModales}
                  disabled={procesando}
                />
              </div>
              <div className="modal-body">
                {errorAccion && <div className="alert alert-danger py-2 small">{errorAccion}</div>}
                <p className="mb-0">
                  ¿Seguro que querés eliminar a <strong>{usuarioAEliminar.name}</strong>?
                </p>
                <p className="text-muted small mt-2 mb-0">Esta acción no se puede deshacer.</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary fw-semibold"
                  onClick={cerrarModales}
                  disabled={procesando}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger fw-semibold"
                  onClick={eliminarUsuario}
                  disabled={procesando}
                >
                  {procesando ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
