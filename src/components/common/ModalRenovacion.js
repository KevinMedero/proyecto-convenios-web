'use client';

import { useState } from 'react';

export default function ModalRenovacion({ convenio, onClose, onRenovado }) {
  const [opcionPlazo, setOpcionPlazo] = useState('1_anio');
  const [observacion, setObservacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!convenio) return;

    setEnviando(true);
    setError('');
    const token = localStorage.getItem('auth_token');

    // Calcular la nueva fecha de vencimiento sumando el plazo seleccionado
    const fechaBaseStr =
      convenio.fecha_vencimiento ||
      convenio.detalle_pasantia?.fecha_fin_pasantia ||
      new Date().toISOString().split('T')[0];
    const fechaBase = new Date(fechaBaseStr);

    if (opcionPlazo === '6_meses') {
      fechaBase.setMonth(fechaBase.getMonth() + 6);
    } else if (opcionPlazo === '1_anio') {
      fechaBase.setFullYear(fechaBase.getFullYear() + 1);
    } else if (opcionPlazo === '2_anios') {
      fechaBase.setFullYear(fechaBase.getFullYear() + 2);
    }

    const nuevaFechaVencimiento = fechaBase.toISOString().split('T')[0];
    const fundamentoTexto = observacion.trim()
      ? observacion.trim()
      : `Prórroga por ${opcionPlazo.replace('_', ' ')}`;

    try {
      const response = await fetch(`${apiUrl}/convenios/${convenio.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado: convenio.estado, // Mantiene su estado actual (ej: firmado)
          fecha_vencimiento: nuevaFechaVencimiento,
          fundamento: fundamentoTexto.slice(0, 45), // Respeta el límite de 45 caracteres de la API
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data?.errors ? Object.values(data.errors).flat().join(' ') : data?.message || 'Error al renovar.';
        throw new Error(msg);
      }

      // Notificamos al componente padre que la renovación fue exitosa
      onRenovado(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="modal d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content border-0 shadow">
          <div className="modal-header">
            <h5 className="modal-title fw-bold" style={{ fontSize: '1rem' }}>
              Renovar vigencia del convenio
            </h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={enviando}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="p-2 rounded bg-light border mb-3" style={{ fontSize: '0.82rem' }}>
                <div className="text-muted fw-semibold">{convenio.codigo}</div>
                <div className="fw-bold text-dark">{convenio.titulo}</div>
                <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                  Vencimiento actual:{' '}
                  {convenio.fecha_vencimiento ||
                    convenio.detalle_pasantia?.fecha_fin_pasantia ||
                    'Sin registrar'}
                </div>
              </div>

              {error && <div className="alert alert-danger py-2 small">{error}</div>}

              <div className="mb-3">
                <label className="form-label fw-semibold small">Seleccionar período de prórroga</label>
                <select
                  className="form-select form-select-sm"
                  value={opcionPlazo}
                  onChange={(e) => setOpcionPlazo(e.target.value)}
                >
                  <option value="6_meses">Extender 6 meses</option>
                  <option value="1_anio">Extender 1 año</option>
                  <option value="2_anios">Extender 2 años</option>
                </select>
                <div className="form-text" style={{ fontSize: '0.73rem' }}>
                  Esto actualizará la fecha de vencimiento y registrará el cambio en el historial.
                </div>
              </div>

              <div className="mb-2">
                <label className="form-label fw-semibold small">Fundamento / Nota (máx. 45 caracteres)</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  maxLength={45}
                  placeholder="Ej: Ampliación de plazo anual"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                />
                <div className="text-end text-muted" style={{ fontSize: '0.7rem' }}>
                  {observacion.length}/45
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary fw-semibold"
                onClick={onClose}
                disabled={enviando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-sm text-white fw-semibold px-3"
                style={{ backgroundColor: 'var(--unlpam-blue-btn)' }}
                disabled={enviando}
              >
                {enviando ? 'Guardando...' : 'Confirmar renovación'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}