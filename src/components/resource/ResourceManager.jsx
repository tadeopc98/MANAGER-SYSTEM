import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

import useCrudResource from '../../hooks/useCrudResource';
import './ResourceManager.css';

const buildInitialForm = (fields) =>
  (fields || []).reduce((acc, field) => {
    acc[field.name] = field.defaultValue ?? '';
    return acc;
  }, {});

const buildInitialFilters = (filters = []) =>
  filters.reduce((acc, filter) => {
    if (filter.type === 'date-range') {
      acc[filter.name] = { start: '', end: '' };
    } else {
      acc[filter.name] = filter.defaultValue ?? '';
    }
    return acc;
  }, {});

const ResourceManager = ({ resource }) => {
  const { items, loading, error, refresh, createItem, updateItem, deleteItem } =
    useCrudResource(resource);
  const initialForm = useMemo(() => buildInitialForm(resource.fields), [resource]);
  const initialFilters = useMemo(() => buildInitialFilters(resource.filters), [resource]);
  const columns = useMemo(() => {
    if (resource.columns?.length) return resource.columns;
    return (resource.fields || []).map((field) => ({
      key: field.name,
      label: field.label,
    }));
  }, [resource]);
  const requiresIdInput = useMemo(
    () => (resource.fields || []).some((field) => field.name === resource.idField),
    [resource],
  );
  const showActions = !resource.readOnly;

  const [formData, setFormData] = useState(initialForm);
  const [advancedPayload, setAdvancedPayload] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [filterValues, setFilterValues] = useState(initialFilters);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedExportColumns, setSelectedExportColumns] = useState(
    columns.map((column) => column.key),
  );

  useEffect(() => {
    setFormData(initialForm);
    setAdvancedPayload('');
    setEditingId(null);
    setSearchTerm('');
    setFilterValues(initialFilters);
  }, [initialFilters, initialForm, resource.key]);

  useEffect(() => {
    setSelectedExportColumns(columns.map((column) => column.key));
  }, [columns, resource.key]);

  const filteredItems = useMemo(() => {
    let list = items;
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      list = list.filter((item) =>
        columns.some((column) => {
          const value = item[column.key];
          if (value === undefined || value === null) {
            return false;
          }
          return String(value).toLowerCase().includes(term);
        }),
      );
    }

    const filterDefinitions =
      resource.filters?.map((filter) => ({ filter, value: filterValues[filter.name] })) || [];

    const activeFilters = filterDefinitions.filter(({ filter, value }) => {
      if (filter.type === 'date-range') {
        return Boolean(value?.start || value?.end);
      }
      return value !== undefined && value !== null && String(value).trim() !== '';
    });

    if (!activeFilters.length) {
      return list;
    }

    const toTimestamp = (value, endOfDay = false) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      if (endOfDay) {
        date.setHours(23, 59, 59, 999);
      } else {
        date.setHours(0, 0, 0, 0);
      }
      return date.getTime();
    };

    return list.filter((item) =>
      activeFilters.every(({ filter, value }) => {
        const raw = item[filter.name];
        if (raw === undefined || raw === null) {
          return false;
        }

        if (filter.type === 'date-range') {
          const start = toTimestamp(value.start);
          const end = toTimestamp(value.end, true);
          const parsedDate = new Date(raw);
          if (!Number.isNaN(parsedDate.getTime())) {
            const rawTime = parsedDate.getTime();
            if (start && rawTime < start) return false;
            if (end && rawTime > end) return false;
            return true;
          }
          const rawDateStr = String(raw).slice(0, 10);
          if (value.start && rawDateStr < value.start) return false;
          if (value.end && rawDateStr > value.end) return false;
          return true;
        }

        return String(raw).toLowerCase().includes(String(value).toLowerCase());
      }),
    );
  }, [columns, filterValues, items, resource.filters, searchTerm]);

  const handleFilterChange = (name, value, rangePart) => {
    setFilterValues((prev) => {
      if (rangePart) {
        return {
          ...prev,
          [name]: {
            ...(prev[name] || { start: '', end: '' }),
            [rangePart]: value,
          },
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const displayedItems = filteredItems;

  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectRow = (item) => {
    setEditingId(item[resource.idField]);
    const next = { ...initialForm };
    (resource.fields || []).forEach((field) => {
      next[field.name] = item[field.name] ?? '';
    });
    setFormData(next);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar el registro seleccionado?')) return;
    try {
      await deleteItem(id);
      toast.success('Registro eliminado');
    } catch (err) {
      console.error(err);
      toast.error('No fue posible eliminar el registro');
    }
  };

  const resetForm = () => {
    setFormData(initialForm);
    setAdvancedPayload('');
    setEditingId(null);
  };

  const parseAdvancedPayload = () => {
    if (!advancedPayload.trim()) return null;
    try {
      const parsed = JSON.parse(advancedPayload);
      if (typeof parsed !== 'object') {
        throw new Error('El payload debe ser un objeto JSON');
      }
      return parsed;
    } catch (err) {
      toast.error(`JSON inválido: ${err.message}`);
      throw err;
    }
  };

  const buildPayload = () => {
    if (advancedPayload.trim()) {
      return parseAdvancedPayload();
    }
    const payload = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        payload[key] = value;
      }
    });
    return payload;
  };

  const hasDuplicate = (payload) => {
    const uniqueFields = resource.uniqueFields?.length
      ? resource.uniqueFields
      : [resource.idField];

    return items.some((item) => {
      if (editingId && item[resource.idField] === editingId) {
        return false;
      }
      return uniqueFields.some((field) => {
        if (!payload[field]) return false;
        return item[field] === payload[field];
      });
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = buildPayload();
      if (requiresIdInput && !payload[resource.idField]) {
        toast.error(`El campo ${resource.idField} es obligatorio`);
        return;
      }

      if (!editingId && hasDuplicate(payload)) {
        toast.warning('Ya existe un registro con los mismos datos únicos');
        return;
      }

      if (editingId) {
        await updateItem(editingId, payload);
        toast.success('Registro actualizado');
      } else {
        await createItem(payload);
        toast.success('Registro creado');
      }
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error('No fue posible guardar el registro');
    }
  };

  return (
    <section className="resource-manager">
      <header className="resource-manager__header">
        <div>
          <h1>{resource.label}</h1>
          <p>{resource.description}</p>
        </div>
        <div className="resource-manager__actions">
          <input
            type="search"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {columns.length ? (
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              disabled={!displayedItems.length}
            >
              Exportar
            </button>
          ) : null}
          <button type="button" onClick={refresh}>
            Recargar
          </button>
        </div>
      </header>

      <div className="resource-manager__grid">
        <div className="resource-table">
          {resource.filters?.length ? (
            <div className="resource-table__filters">
              {resource.filters.map((filter) => (
                <label key={filter.name}>
                  {filter.label}
                  {filter.type === 'select' ? (
                    <select
                      value={filterValues[filter.name]}
                      onChange={(e) => handleFilterChange(filter.name, e.target.value)}
                    >
                      <option value="">Todos</option>
                      {(filter.options || []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : filter.type === 'date-range' ? (
                    <div className="resource-filter-range">
                      <input
                        type="date"
                        value={filterValues[filter.name]?.start || ''}
                        onChange={(e) => handleFilterChange(filter.name, e.target.value, 'start')}
                      />
                      <span>→</span>
                      <input
                        type="date"
                        value={filterValues[filter.name]?.end || ''}
                        onChange={(e) => handleFilterChange(filter.name, e.target.value, 'end')}
                      />
                    </div>
                  ) : (
                    <input
                      type={filter.type ?? 'text'}
                      value={filterValues[filter.name]}
                      onChange={(e) => handleFilterChange(filter.name, e.target.value)}
                      placeholder={filter.placeholder}
                    />
                  )}
                </label>
              ))}
            </div>
          ) : null}
          <div className="resource-table__header">
            <h2>Registros ({displayedItems.length})</h2>
            <span>{loading ? 'Cargando...' : null}</span>
          </div>
          {error && <p className="resource-table__error">Error cargando datos</p>}
          <div className="resource-table__wrapper">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                  {showActions ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((item, index) => {
                  const rowId = item[resource.idField] ?? item._id ?? item.id ?? index;
                  return (
                    <tr key={rowId}>
                      {columns.map((column) => (
                        <td key={`${rowId}-${column.key}`}>{item[column.key] ?? '-'}</td>
                      ))}
                      {showActions ? (
                        <td className="resource-table__actions">
                          <button type="button" onClick={() => handleSelectRow(item)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleDelete(item[resource.idField])}
                          >
                            Eliminar
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
                {!displayedItems.length && !loading && (
                  <tr>
                    <td colSpan={columns.length + (showActions ? 1 : 0)} className="resource-table__empty">
                      No hay registros para mostrar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {resource.readOnly ? (
          <div className="resource-form read-only">
            <h2>Solo lectura</h2>
            <p>Este catálogo es informativo: los datos provienen de la API global.</p>
          </div>
        ) : (
          <div className="resource-form">
            <div className="resource-form__header">
              <h2>{editingId ? 'Editar registro' : 'Nuevo registro'}</h2>
              {editingId && (
                <button type="button" onClick={resetForm}>
                  Limpiar
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="resource-form__fields">
                {(resource.fields || []).map((field) => (
                  <label key={field.name}>
                    {field.label}
                    {field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.name]}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        required={field.required}
                        placeholder={field.placeholder}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={formData[field.name]}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        required={field.required}
                      >
                        <option value="">Selecciona...</option>
                        {(field.options || []).map((option) => (
                          <option value={option} key={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type ?? 'text'}
                        value={formData[field.name]}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        required={field.required}
                        placeholder={field.placeholder}
                      />
                    )}
                  </label>
                ))}
              </div>

              <label className="resource-form__advanced">
                Payload avanzado (JSON)
                <textarea
                  value={advancedPayload}
                  onChange={(e) => setAdvancedPayload(e.target.value)}
                  placeholder='{"campoExtra": "valor"}'
                />
                <small>
                  Si completas este apartado, el JSON reemplaza al formulario. Úsalo para
                  enviar estructuras personalizadas.
                </small>
              </label>

              <button type="submit" className="resource-form__submit">
                {editingId ? 'Actualizar' : 'Crear'}
              </button>
            </form>
          </div>
        )}
      </div>
      {isExportModalOpen && (
        <div className="resource-export-modal">
          <div className="resource-export-modal__content">
            <h3>Exportar a Excel</h3>
            <p>Selecciona las columnas a exportar:</p>
            <div className="resource-export-modal__list">
              {columns.map((column) => (
                <label key={column.key}>
                  <input
                    type="checkbox"
                    checked={selectedExportColumns.includes(column.key)}
                    onChange={() =>
                      setSelectedExportColumns((prev) =>
                        prev.includes(column.key)
                          ? prev.filter((key) => key !== column.key)
                          : [...prev, column.key],
                      )
                    }
                  />
                  {column.label}
                </label>
              ))}
            </div>
            <div className="resource-export-modal__actions">
              <button
                type="button"
                onClick={() => setSelectedExportColumns(columns.map((column) => column.key))}
              >
                Seleccionar todo
              </button>
              <button type="button" onClick={() => setSelectedExportColumns([])}>
                Limpiar
              </button>
              <div className="resource-export-modal__spacer" />
              <button
                type="button"
                onClick={() => {
                  const selectedColumns = columns.filter((column) =>
                    selectedExportColumns.includes(column.key),
                  );
                  if (!selectedColumns.length) {
                    toast.warning('Selecciona al menos una columna para exportar');
                    return;
                  }
                  if (!displayedItems.length) {
                    toast.info('No hay registros para exportar');
                    return;
                  }
                  const data = displayedItems.map((item) => {
                    const row = {};
                    selectedColumns.forEach((column) => {
                      row[column.label] = item[column.key] ?? '';
                    });
                    return row;
                  });
                  const worksheet = XLSX.utils.json_to_sheet(data);
                  const workbook = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(
                    workbook,
                    worksheet,
                    resource.label.substring(0, 31) || 'Datos',
                  );
                  const timestamp = new Date().toISOString().replace(/[:\-]/g, '').slice(0, 15);
                  XLSX.writeFile(workbook, `${resource.key}-${timestamp}.xlsx`);
                  setIsExportModalOpen(false);
                }}
              >
                Exportar
              </button>
              <button type="button" className="danger" onClick={() => setIsExportModalOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

ResourceManager.propTypes = {
  resource: PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    endpoint: PropTypes.string.isRequired,
    idField: PropTypes.string.isRequired,
    description: PropTypes.string,
    listEndpoint: PropTypes.string,
    readOnly: PropTypes.bool,
    uniqueFields: PropTypes.arrayOf(PropTypes.string),
    fields: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        type: PropTypes.string,
        required: PropTypes.bool,
        options: PropTypes.arrayOf(PropTypes.string),
        placeholder: PropTypes.string,
      }),
    ),
    columns: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
      }),
    ),
    filters: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        type: PropTypes.string,
        options: PropTypes.arrayOf(PropTypes.string),
        placeholder: PropTypes.string,
      }),
    ),
  }).isRequired,
};

export default ResourceManager;
