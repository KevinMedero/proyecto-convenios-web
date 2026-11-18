'use client';

import { useEffect, useState } from 'react';
import SearchFilters from '@/components/common/SearchFilters';
import Pagination from '@/components/common/Pagination';
import ConveniosTable from '@/components/common/ConveniosTable';

export default function InicioConsulta() {
  // Estados de datos, catálogos y paginación
  const [convenios, setConvenios] = useState([]);
  const [tiposInstrumento, setTiposInstrumento] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [paginacion, setPaginacion] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados de los filtros (en Consulta el estado siempre es 'firmado')
  const [q, setQ] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [unidadId, setUnidadId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [pagina, setPagina] = useState(1);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

  // Carga los catálogos de tipos de instrumento y unidades al montar
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };

    Promise.all([
      fetch(`${apiUrl}/tipos-instrumento`, { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${apiUrl}/unidades`, { headers }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([tiposData, unidadesData]) => {
        setTiposInstrumento(Array.isArray(tiposData) ? tiposData : tiposData.data || []);
        setUnidades(Array.isArray(unidadesData) ? unidadesData : unidadesData.data || []);
      })
      .catch((err) => console.error('Error cargando catálogos:', err));
  }, [apiUrl]);

  // Consulta los convenios firmados cada vez que cambian los filtros o la página
  useEffect(() => {
    const fetchConvenios = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('auth_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

      try {
        const baseParams = new URLSearchParams();
        baseParams.append('estado', 'firmado');
        if (q.trim()) baseParams.append('q', q.trim());
        if (tipoId) baseParams.append('tipo_instrumento_id', tipoId);
        if (fechaDesde) baseParams.append('fecha_desde', fechaDesde);
        if (fechaHasta) baseParams.append('fecha_hasta', fechaHasta);

        // CASO A: Sin filtro de unidad -> paginación directa desde la API
        if (!unidadId) {
          baseParams.append('page', pagina);
          const response = await fetch(`${apiUrl}/convenios?${baseParams.toString()}`, { headers });
          if (!response.ok) throw new Error('No se pudieron cargar los convenios firmados.');

          const result = await response.json();
          setConvenios(result.data || []);
          setPaginacion({
            current_page: result.current_page || 1,
            last_page: result.last_page || 1,
            total: result.total || 0,
            from: result.from || 0,
            to: result.to || 0,
          });
          return;
        }

        // CASO B: Con filtro de unidad -> traemos en lotes de 50 y filtramos en el cliente
        const acumulado = [];
        let pagActual = 1;
        let ultimaPag = 1;

        do {
          const p = new URLSearchParams(baseParams);
          p.append('por_pagina', '50');
          p.append('page', pagActual);

          const res = await fetch(`${apiUrl}/convenios?${p.toString()}`, { headers });
          if (!res.ok) throw new Error('No se pudieron cargar los convenios firmados.');

          const json = await res.json();
          acumulado.push(...(json.data || []));
          ultimaPag = json.last_page || 1;
          pagActual += 1;
        } while (pagActual <= ultimaPag && pagActual <= 50);

        const filtradosPorUnidad = acumulado.filter((c) => {
          const unidadDirecta = String(c.unidad_responsable_id ?? c.unidad?.id ?? '');
          const enRepresentantes = (c.representantes || []).some(
            (r) => String(r.unidad_responsable_id ?? '') === String(unidadId)
          );
          return unidadDirecta === String(unidadId) || enRepresentantes;
        });

        const porPagina = 10;
        const total = filtradosPorUnidad.length;
        const lastPage = Math.max(1, Math.ceil(total / porPagina));
        const currentPage = Math.min(pagina, lastPage);
        const inicio = (currentPage - 1) * porPagina;
        const slice = filtradosPorUnidad.slice(inicio, inicio + porPagina);

        setConvenios(slice);
        setPaginacion({
          current_page: currentPage,
          last_page: lastPage,
          total,
          from: total === 0 ? 0 : inicio + 1,
          to: inicio + slice.length,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConvenios();
  }, [apiUrl, q, tipoId, unidadId, fechaDesde, fechaHasta, pagina]);

  // Restablece todos los filtros y vuelve a la página 1
  const handleLimpiarFiltros = () => {
    setQ('');
    setTipoId('');
    setUnidadId('');
    setFechaDesde('');
    setFechaHasta('');
    setPagina(1);
  };

  // Genera y descarga un archivo CSV compatible con Excel (UTF-8 con BOM y separado por ;)
  const handleExportarCSV = () => {
    // Evita inyección de fórmulas y escapa comillas dobles en cada celda
    const sanitizarCelda = (val) => {
      const texto = String(val ?? '').replace(/"/g, '""');
      const seguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
      return `"${seguro}"`;
    };

    const encabezados = ['Código', 'Título', 'Tipo de Instrumento', 'Unidad', 'Estado', 'Vigencia'];
    const filas = convenios.map((c) => {
      const fechaVenc = c.fecha_vencimiento || c.detalle_pasantia?.fecha_fin_pasantia;
      const vigencia = fechaVenc ? `Vence ${fechaVenc.split('T')[0].split('-').reverse().join('/')}` : 'Sin vencimiento registrado';
      return [
        sanitizarCelda(c.codigo),
        sanitizarCelda(c.titulo),
        sanitizarCelda(c.tipo_instrumento?.nombre || 'Sin especificar'),
        sanitizarCelda(c.unidad?.nombre || 'Ingeniería'),
        sanitizarCelda('Firmado'),
        sanitizarCelda(vigencia),
      ];
    });

    const contenidoCSV = [encabezados.join(';'), ...filas.map((f) => f.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'convenios_firmados_unlpam.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Título de la vista */}
      <h1 className="page-title mb-3">Convenios Firmados</h1>

      {/* Barra de filtros con estado bloqueado en 'firmado' */}
      <SearchFilters
        rol="consulta"
        q={q}
        setQ={setQ}
        tipoId={tipoId}
        setTipoId={setTipoId}
        estado="firmado"
        setEstado={() => {}}
        unidadId={unidadId}
        setUnidadId={setUnidadId}
        fechaDesde={fechaDesde}
        setFechaDesde={setFechaDesde}
        fechaHasta={fechaHasta}
        setFechaHasta={setFechaHasta}
        tiposInstrumento={tiposInstrumento}
        unidades={unidades}
        onLimpiar={handleLimpiarFiltros}
        onResetPagina={() => setPagina(1)}
      />

      {/* Contador de resultados y botón de exportación */}
      <div className="d-flex justify-content-between align-items-center mb-2 mt-3 px-1">
        <span className="text-muted" style={{ fontSize: '0.8rem' }}>
          {paginacion.total} convenios firmados disponibles
        </span>
        <button
          type="button"
          onClick={handleExportarCSV}
          className="btn btn-link btn-sm text-muted text-decoration-none p-0"
          style={{ fontSize: '0.8rem' }}
          disabled={convenios.length === 0}
        >
          Exportar CSV
        </button>
      </div>

      {/* Alerta de error de red o servidor */}
      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {/* Tabla principal de convenios */}
      <ConveniosTable
        convenios={convenios}
        loading={loading}
        unidades={unidades}
        mensajeCargando="Cargando convenios firmados..."
        mensajeVacio="No se encontraron convenios firmados con los filtros seleccionados."
      />

      {/* Controles de paginación */}
      <Pagination paginacion={paginacion} pagina={pagina} setPagina={setPagina} />
    </div>
  );
}