'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ROLES = [
  { value: 'administracion', label: 'Administración' },
  { value: 'gestion', label: 'Gestión' },
  { value: 'revision', label: 'Revisión' },
  { value: 'consulta', label: 'Consulta' },
  { value: 'decano', label: 'Decano' },
];

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

function mensajeDeError(data) {
  return data?.errors
    ? Object.values(data.errors).flat().join(' ')
    : data?.message || 'No se pudo crear el usuario.';
}

export default function NuevoUsuarioPage() {
  const router = useRouter();
  const [formulario, setFormulario] = useState({
    name: '',
    email: '',
    rol: 'consulta',
    telefono: '',
    password: '',
    password_confirmation: '',
  });
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('auth_token')) router.replace('/');
  }, [router]);

  const actualizarCampo = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  };

  const crearUsuario = async (event) => {
    event.preventDefault();
    setProcesando(true);
    setError('');
    setExito('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(`${apiUrl}/users/manage`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formulario,
          name: formulario.name.trim(),
          email: formulario.email.trim(),
          telefono: formulario.telefono.trim() || null,
        }),
      });

      const data = await response.json();
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        router.replace('/');
        return;
      }
      if (!response.ok) throw new Error(mensajeDeError(data));

      setFormulario({
        name: '',
        email: '',
        rol: 'consulta',
        telefono: '',
        password: '',
        password_confirmation: '',
      });
      setExito(`Se creó el usuario ${data.name}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="mx-auto" style={{ maxWidth: '720px' }}>
      <div className="mb-4">
        <Link href="/usuarios" className="text-decoration-none small fw-semibold">
          ← Volver a usuarios
        </Link>
        <h1 className="page-title mt-3 mb-1">Nuevo Usuario</h1>
        <p className="text-muted small mb-0">
          Completa los datos de acceso y asigna un rol al nuevo usuario.
        </p>
      </div>

      <div className="table-card p-4">
        {error && <div className="alert alert-danger py-2 small">{error}</div>}
        {exito && <div className="alert alert-success py-2 small">{exito}</div>}

        <form onSubmit={crearUsuario}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold small" htmlFor="nuevo-usuario-nombre">
                Nombre
              </label>
              <input
                id="nuevo-usuario-nombre"
                className="form-control"
                value={formulario.name}
                onChange={(event) => actualizarCampo('name', event.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold small" htmlFor="nuevo-usuario-email">
                Correo electrónico
              </label>
              <input
                id="nuevo-usuario-email"
                type="email"
                className="form-control"
                value={formulario.email}
                onChange={(event) => actualizarCampo('email', event.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold small" htmlFor="nuevo-usuario-rol">
                Rol
              </label>
              <select
                id="nuevo-usuario-rol"
                className="form-select"
                value={formulario.rol}
                onChange={(event) => actualizarCampo('rol', event.target.value)}
                required
              >
                {ROLES.map((rol) => (
                  <option key={rol.value} value={rol.value}>{rol.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold small" htmlFor="nuevo-usuario-telefono">
                Teléfono
              </label>
              <input
                id="nuevo-usuario-telefono"
                className="form-control"
                value={formulario.telefono}
                onChange={(event) => actualizarCampo('telefono', event.target.value)}
                maxLength={45}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold small" htmlFor="nuevo-usuario-password">
                Contraseña
              </label>
              <input
                id="nuevo-usuario-password"
                type="password"
                className="form-control"
                value={formulario.password}
                onChange={(event) => actualizarCampo('password', event.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold small" htmlFor="nuevo-usuario-password-confirm">
                Confirmar contraseña
              </label>
              <input
                id="nuevo-usuario-password-confirm"
                type="password"
                className="form-control"
                value={formulario.password_confirmation}
                onChange={(event) => actualizarCampo('password_confirmation', event.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <Link href="/usuarios" className="btn btn-sm btn-outline-secondary fw-semibold">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-sm btn-primary fw-semibold" disabled={procesando}>
              {procesando ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
