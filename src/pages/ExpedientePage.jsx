import { useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

import fetchExpediente from '../services/expedienteService';
import './ExpedientePage.css';

const parseDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return value || '';
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (value) => {
  const date = parseDate(value);
  if (!date) return value || '';
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

const getDateKey = (date) => {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getHoursWorked = (entrada, salida) => {
  const start = parseDate(entrada);
  const end = parseDate(salida);
  if (!start || !end) return null;
  const diffMs = end.getTime() - start.getTime();
  if (Number.isNaN(diffMs) || diffMs <= 0) return null;
  return diffMs / (1000 * 60 * 60);
};

const SERVICIO_FIELD_OPTIONS = [
  { key: 'fechaInput', label: 'Fecha servicio' },
  { key: 'horaInicio', label: 'Hora inicio' },
  { key: 'horaFin', label: 'Hora fin' },
  { key: 'statusServicio', label: 'Estatus servicio' },
  { key: 'aerolinea', label: 'Aerolínea' },
  { key: 'noVuelo', label: 'No. Vuelo' },
  { key: 'origenVuelo', label: 'Origen' },
  { key: 'destinoVuelo', label: 'Destino' },
  { key: 'tipoService', label: 'Tipo servicio' },
  { key: 'tipoSilla', label: 'Tipo silla' },
  { key: 'pnr', label: 'PNR' },
  { key: 'int_nac', label: 'Internacional/Nacional' },
  { key: 'usuarioInicio', label: 'Usuario inicio' },
  { key: 'noColaborador', label: 'No. colaborador' },
  { key: 'estacion', label: 'Estación' },
  { key: 'conexion', label: 'Conexión' },
  { key: 'noMostrador', label: 'Mostrador' },
  { key: 'sala', label: 'Sala' },
  { key: 'uh', label: 'UH' },
  { key: 'created_at', label: 'Creado en' },
  { key: 'updated_at', label: 'Actualizado en' },
  { key: 'encuesta.calificacion', label: 'Calificación encuesta' },
  { key: 'encuesta.agente', label: 'Agente encuesta' },
  { key: 'encuesta.comentarios', label: 'Comentarios encuesta' },
];

const BITACORA_FIELD_OPTIONS = [
  { key: 'fecha_registro', label: 'Fecha registro' },
  { key: 'entrada', label: 'Entrada' },
  { key: 'salida', label: 'Salida' },
  { key: 'horas_trabajadas', label: 'Horas trabajadas' },
  { key: 'status', label: 'Status' },
  { key: 'noSilla', label: 'Silla' },
  { key: 'register_by', label: 'Registrado por' },
  { key: 'observaciones', label: 'Observaciones' },
  { key: 'estacion', label: 'Estación' },
  { key: 'noColaborador', label: 'No. colaborador' },
];

const ExpedientePage = () => {
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const [noColaborador, setNoColaborador] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportDataset, setExportDataset] = useState('servicios');
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [selectedServicioFields, setSelectedServicioFields] = useState(
    SERVICIO_FIELD_OPTIONS.map((f) => f.key),
  );
  const [selectedBitacoraFields, setSelectedBitacoraFields] = useState(
    BITACORA_FIELD_OPTIONS.map((f) => f.key),
  );
  const [exportBitacoraDesde, setExportBitacoraDesde] = useState('');
  const [exportBitacoraHasta, setExportBitacoraHasta] = useState('');
  const [pdfSelectedDates, setPdfSelectedDates] = useState('');
  const [expediente, setExpediente] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [modalDate, setModalDate] = useState(null);
  const [modalServices, setModalServices] = useState([]);
  const [modalAmonestaciones, setModalAmonestaciones] = useState([]);
  const exportRef = useRef(null);
  const handleExportPdf = async () => {
    if (!expediente) {
      toast.info('Primero busca un expediente antes de exportar.');
      return;
    }
    if (!exportRef.current) return;
    try {
      setExporting(true);
      const canvas = await html2canvas(exportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `expediente-${operador?.noColaborador || noColaborador || 'reporte'}.pdf`;
      pdf.save(filename);
      toast.success('PDF generado');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo generar el PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportSelectedPdf = async () => {
    if (!expediente) {
      toast.info('Primero busca un expediente antes de exportar.');
      return;
    }
    const tokens = pdfSelectedDates.split(/[, \n\r\t]+/).filter(Boolean);
    const dateKeys = tokens
      .map((t) => {
        const d = parseDate(t);
        return getDateKey(d);
      })
      .filter(Boolean);

    if (!dateKeys.length) {
      toast.warning('Ingresa al menos una fecha (ej: 2025-10-25,2025-11-11).');
      return;
    }
    const dateSet = new Set(dateKeys);

    const servicios = (expediente?.servicios?.registros || []).filter((s) =>
      dateSet.has(s.fechaInput?.slice(0, 10)),
    );
    const bitacora = (expediente?.bitacora?.registros || []).filter((r) => {
      const key = getDateKey(parseDate(r.entrada || r.fecha_registro));
      return key ? dateSet.has(key) : false;
    });

    if (!servicios.length && !bitacora.length) {
      toast.info('No hay registros en las fechas seleccionadas.');
      return;
    }

    try {
      setExporting(true);
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 12;
      const colors = {
        bg: [15, 23, 42],
        card: [26, 32, 55],
        accent: [124, 58, 237],
        accent2: [59, 130, 246],
        text: [226, 232, 240],
        muted: [148, 163, 184],
      };

      const ensureSpace = (extra = 20) => {
        if (y + extra > 285) {
          doc.addPage();
          y = 12;
        }
      };

      const addPanel = (height) => {
        ensureSpace(height);
        doc.setFillColor(...colors.card);
        doc.setDrawColor(...colors.accent);
        doc.roundedRect(10, y, pageWidth - 20, height, 4, 4, 'FD');
        return y;
      };

      const addLabelValue = (label, value, x = 16) => {
        const safeValue = value === undefined || value === null ? 'N/D' : String(value);
        doc.setFontSize(10.5);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...colors.text);
        doc.text(label, x, y);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...colors.muted);
        doc.text(safeValue || 'N/D', x + 40, y);
        y += 6;
      };

      // Header panel
      const headerTop = addPanel(30);
      y = headerTop + 10;
      doc.setFontSize(15);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...colors.text);
      doc.text('Evidencia de días trabajados', 16, y);
      y += 7;
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      const operadorNombre =
        `${expediente?.operador?.nombre || ''} ${expediente?.operador?.apellidos || ''}`.trim() ||
        'N/D';
      doc.text(
        `Operador: ${operadorNombre} · Siglas: ${expediente?.operador?.siglas || 'N/D'} · Estación: ${
          expediente?.operador?.estacion || 'N/D'
        }`,
        16,
        y,
      );
      y = headerTop + 30;

      // Summary panel
      const summaryTop = addPanel(46);
      y = summaryTop + 10;
      addLabelValue('No. Colaborador', expediente?.operador?.noColaborador ?? noColaborador ?? 'N/D');
      addLabelValue('Fechas solicitadas', dateKeys.join(', '));
      addLabelValue('Generado por', user?.nombre || user?.email || 'N/D');
      addLabelValue('Generado en', new Date().toLocaleString('es-MX'));
      addLabelValue('Servicios en fechas', `${servicios.length}`);
      addLabelValue('Bitácora en fechas', `${bitacora.length}`);
      y = summaryTop + 46 + 6;

      const addSectionTitle = (title) => {
        ensureSpace(14);
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...colors.text);
        doc.text(title, 12, y);
        y += 6;
      };

      const addTag = (text, bg, fg, posX = pageWidth - 14) => {
        const content = text || 'N/D';
        const textWidth = doc.getTextWidth(content) + 6;
        const startX = posX - textWidth;
        doc.setFillColor(...bg);
        doc.roundedRect(startX, y - 6, textWidth, 7, 2, 2, 'F');
        doc.setTextColor(...fg);
        doc.setFontSize(9.5);
        doc.setFont(undefined, 'bold');
        doc.text(content, startX + 3, y - 1.2);
      };

      // Grid helpers para tarjetas compactas
      const cardWidth = (pageWidth - 30) / 2; // dos columnas
      const gridGap = 4;
      let gridY = y + 4;
      let gridCol = 0;
      const nextRow = (height) => {
        gridCol = 0;
        gridY += height + 6;
      };
      const reserveCard = (height) => {
        const neededHeight = height + 10;
        if (gridY + neededHeight > 285) {
          doc.addPage();
          gridY = 12;
          gridCol = 0;
        }
      };
      const cardX = () => 12 + gridCol * (cardWidth + gridGap);
      const placeCard = (height) => {
        reserveCard(height);
        const x = cardX();
        const top = gridY;
        doc.setFillColor(...colors.card);
        doc.setDrawColor(...colors.accent);
        doc.roundedRect(x, top, cardWidth, height, 4, 4, 'FD');
        return { top, x };
      };

      if (servicios.length) {
        addSectionTitle('Servicios');
        servicios.forEach((s, idx) => {
          const cardHeight = 28;
          const { top, x } = placeCard(cardHeight);
          let innerY = top + 9;
          doc.setFontSize(10.5);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(...colors.text);
          doc.text(
            `${idx + 1}. ${s.fechaInput?.slice(0, 10) || 'N/D'} · Vuelo ${s.noVuelo || 'N/D'}`,
            x + 4,
            innerY,
          );
          addTag(s.statusServicio || 'N/D', colors.accent2, [255, 255, 255], x + cardWidth - 2);
          innerY += 6;
          doc.setFontSize(9.8);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(...colors.muted);
          doc.text(
            `${s.tipoService || 'N/D'} · PNR: ${s.pnr || 'N/D'} · Silla: ${s.tipoSilla || 'N/D'}`,
            x + 4,
            innerY,
          );
          innerY += 5;
          doc.text(
            `Ori/Dest: ${s.origenVuelo || 'N/D'} -> ${s.destinoVuelo || 'N/D'}`,
            x + 4,
            innerY,
          );
          innerY += 5;
          doc.text(
            `Horario: ${formatTime(s.horaInicio) || 'N/D'} - ${formatTime(s.horaFin) || 'N/D'} · Est: ${
              s.estacion || 'N/D'
            }`,
            x + 4,
            innerY,
          );
          gridCol = (gridCol + 1) % 2;
          if (gridCol === 0) nextRow(cardHeight);
        });
        if (gridCol === 1) nextRow(28);
        y = gridY + 6;
      }

      // Reset grid for bitácora
      gridY = y + 4;
      gridCol = 0;

      if (bitacora.length) {
        addSectionTitle('Bitácora');
        bitacora.forEach((b, idx) => {
          const horas = getHoursWorked(b.entrada, b.salida);
          const obsLines = b.observaciones
            ? doc.splitTextToSize(`Obs: ${b.observaciones}`, cardWidth - 10)
            : [];
          const cardHeight = 22 + (obsLines.length ? obsLines.length * 4 : 0);
          const { top, x } = placeCard(cardHeight);
          let innerY = top + 9;
          doc.setFontSize(10.5);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(...colors.text);
          doc.text(`${idx + 1}. ${formatDate(b.entrada || b.fecha_registro)}`, x + 4, innerY);
          addTag(
            b.status || 'N/A',
            b.status?.toLowerCase().includes('sistema') ? [248, 113, 113] : colors.accent,
            [255, 255, 255],
            x + cardWidth - 2,
          );
          innerY += 6;
          doc.setFontSize(9.8);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(...colors.muted);
          doc.text(
            `Entrada: ${b.entrada || 'N/D'} · Salida: ${b.salida || 'N/D'} · Horas: ${
              horas !== null ? `${horas.toFixed(2)} h` : 'N/D'
            }`,
            x + 4,
            innerY,
          );
          innerY += 5;
          doc.text(
            `Silla: ${b.noSilla || 'N/A'} · Registró: ${b.register_by || 'N/A'} · Est: ${
              b.estacion || 'N/D'
            }`,
            x + 4,
            innerY,
          );
          innerY += 5;
          obsLines.forEach((line) => {
            doc.text(line, x + 4, innerY);
            innerY += 4;
          });
          gridCol = (gridCol + 1) % 2;
          if (gridCol === 0) nextRow(cardHeight);
        });
        if (gridCol === 1) nextRow(24);
        y = gridY + 4;
      }

      const filename = `evidencia-${expediente?.operador?.noColaborador ?? noColaborador ?? 'reporte'}.pdf`;
      doc.save(filename);
      toast.success('PDF de evidencias generado');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo generar el PDF de evidencias');
    } finally {
      setExporting(false);
    }
  };

  const toggleField = (key, dataset) => {
    if (dataset === 'servicios') {
      setSelectedServicioFields((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
      );
    } else {
      setSelectedBitacoraFields((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
      );
    }
  };

  const getFieldValue = (obj, path) => {
    if (path === 'horas_trabajadas') {
      const hours = getHoursWorked(obj.entrada, obj.salida);
      return hours !== null ? hours.toFixed(2) : '';
    }
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length; i += 1) {
      current = current?.[keys[i]];
      if (current === undefined || current === null) break;
    }
    return current ?? '';
  };

  const exportData = () => {
    if (!expediente) {
      toast.info('Primero busca un expediente antes de exportar.');
      return;
    }

    const isServicios = exportDataset === 'servicios';
    const fieldOptions = isServicios ? SERVICIO_FIELD_OPTIONS : BITACORA_FIELD_OPTIONS;
    const selectedKeys = isServicios ? selectedServicioFields : selectedBitacoraFields;
    const fields = fieldOptions.filter((f) => selectedKeys.includes(f.key));

    if (!fields.length) {
      toast.warning('Selecciona al menos un campo para exportar.');
      return;
    }

    let data = [];
    if (isServicios) {
      data = expediente?.servicios?.registros || [];
    } else {
      const start = exportBitacoraDesde ? parseDate(exportBitacoraDesde) : null;
      const end = exportBitacoraHasta ? parseDate(exportBitacoraHasta) : null;
      data = (expediente?.bitacora?.registros || []).filter((r) => {
        const refDate = parseDate(r.entrada || r.fecha_registro);
        if (!refDate) return true;
        if (start && refDate < start) return false;
        if (end && refDate > end) return false;
        return true;
      });
    }

    if (!data.length) {
      toast.info('No hay registros para exportar con los filtros seleccionados.');
      return;
    }

    const headerInfo = [
      [`Colaborador: ${expediente?.operador?.noColaborador ?? noColaborador ?? 'N/D'}`],
      [`Generado: ${new Date().toLocaleString('es-MX')}`],
      [],
    ];

    const headerRow = fields.map((f) => f.label);
    const rows = data.map((item) =>
      fields.map((f) => {
        const value = getFieldValue(item, f.key);
        if (value instanceof Date) return value.toISOString();
        return value;
      }),
    );

    const sheetData = [...headerInfo, headerRow, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

    const baseName = `expediente-${isServicios ? 'servicios' : 'bitacora'}-${
      expediente?.operador?.noColaborador ?? noColaborador ?? 'reporte'
    }`;
    const filename =
      exportFormat === 'csv' ? `${baseName}.csv` : `${baseName}.xlsx`;

    XLSX.writeFile(wb, filename, { bookType: exportFormat === 'csv' ? 'csv' : 'xlsx' });
    toast.success('Archivo exportado');
    setExportModalOpen(false);
  };

  const serviciosPorDia = useMemo(() => {
    const map = new Map();
    (expediente?.servicios?.resumenPorDia || []).forEach(({ fecha, total }) => {
      if (fecha) map.set(fecha, total);
    });
    return map;
  }, [expediente]);

  const serviciosDetallados = useMemo(() => {
    const grouped = {};
    (expediente?.servicios?.registros || []).forEach((servicio) => {
      const fecha = servicio.fechaInput?.slice(0, 10) || 'SIN_FECHA';
      if (!grouped[fecha]) grouped[fecha] = [];
      grouped[fecha].push(servicio);
    });
    return grouped;
  }, [expediente]);

  const amonestacionesDetalladas = useMemo(() => {
    const grouped = {};
    (expediente?.amonestaciones || []).forEach((amonestacion) => {
      const fecha = amonestacion.fechaInput?.slice(0, 10) || 'SIN_FECHA';
      if (!grouped[fecha]) grouped[fecha] = [];
      grouped[fecha].push(amonestacion);
    });
    return grouped;
  }, [expediente]);

  const bitacoraDetallada = useMemo(() => {
    const registros = expediente?.bitacora?.registros || [];
    return [...registros].sort((a, b) => {
      const dateA = parseDate(a?.entrada || a?.fecha_registro) || new Date(0);
      const dateB = parseDate(b?.entrada || b?.fecha_registro) || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [expediente]);

  const encuestaRating = useMemo(() => {
    const registros = expediente?.servicios?.registros || [];
    const calificaciones = registros
      .map((s) => s?.encuesta?.calificacion)
      .filter(Boolean)
      .map((c) => c.toString().trim().toUpperCase());

    if (!calificaciones.length) return null;
    const excelentes = calificaciones.filter((c) => c === 'EXCELENTE').length;
    const score = (excelentes / calificaciones.length) * 5;
    const rounded = Math.round(score * 2) / 2;
    return { score: rounded, total: calificaciones.length, excelentes };
  }, [expediente]);

  const renderStars = (value) => {
    const stars = [];
    for (let i = 1; i <= 5; i += 1) {
      if (value >= i) stars.push(<span key={i} className="star full">★</span>);
      else if (value >= i - 0.5) stars.push(<span key={i} className="star half">★</span>);
      else stars.push(<span key={i} className="star empty">☆</span>);
    }
    return stars;
  };

  const encuestaStats = useMemo(() => {
    const registros = expediente?.servicios?.registros || [];
    const total = registros.length;
    const conEncuesta = registros.filter((s) => s?.encuesta).length;
    const cobertura = total ? (conEncuesta / total) * 100 : 0;

    const statusCounts = registros.reduce((acc, servicio) => {
      const status = (servicio.statusServicio || 'SIN_STATUS').toUpperCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const statusList = Object.entries(statusCounts).map(([status, count]) => {
      const porcentaje = total ? (count / total) * 100 : 0;
      return { status, count, porcentaje };
    });

    return { total, conEncuesta, cobertura, statusList };
  }, [expediente]);

  const alertCards = useMemo(() => {
    const alerts = [];

    if (encuestaStats?.total) {
      if (encuestaStats.cobertura < 80) {
        alerts.push({
          type: 'warning',
          message: `Solicita encuesta al cierre: ${encuestaStats.conEncuesta}/${encuestaStats.total} (${encuestaStats.cobertura.toFixed(1)}%)`,
        });
      } else {
        alerts.push({
          type: 'success',
          message: `Cobertura de encuestas saludable: ${encuestaStats.cobertura.toFixed(1)}%`,
        });
      }
    }

    const totalTurnos = bitacoraDetallada.length;
    if (totalTurnos) {
      const closedBySystem = bitacoraDetallada.filter((r) =>
        (r.status || '').toLowerCase().includes('sistema'),
      ).length;
      const longShifts = bitacoraDetallada.filter(
        (r) => {
          const horas = getHoursWorked(r.entrada, r.salida);
          return horas !== null && horas > 10;
        },
      ).length;
      const shortShifts = bitacoraDetallada.filter(
        (r) => {
          const horas = getHoursWorked(r.entrada, r.salida);
          return horas !== null && horas < 9;
        },
      ).length;

      if (closedBySystem / totalTurnos > 0.5 || longShifts / totalTurnos > 0.5) {
        alerts.push({
          type: 'warning',
          message: `Por favor cierra tu turno: ${closedBySystem} cerrados por sistema, ${longShifts} con más de 10h.`,
        });
      }
      if (shortShifts > 0) {
        alerts.push({
          type: 'info',
          message: `Completa tus turnos: ${shortShifts} turnos con menos de 9h.`,
        });
      }
    }

    const servicios = expediente?.servicios?.registros || [];
    if (servicios.length) {
      const finishedStatuses = new Set(['CONCLUIDO', 'NOSHOW']);
      const noTerminados = servicios.filter(
        (s) => !finishedStatuses.has((s.statusServicio || '').toUpperCase()),
      ).length;
      if (noTerminados > 0) {
        const porcentaje = (noTerminados / servicios.length) * 100;
        alerts.push({
          type: 'warning',
          message: `Hay servicios sin concluir: ${noTerminados}/${servicios.length} (${porcentaje.toFixed(1)}%) con estatus distinto a CONCLUIDO/NOSHOW.`,
        });
      }
    }

    return alerts;
  }, [bitacoraDetallada, encuestaStats, expediente]);

  const coincidenciasVuelo = useMemo(() => {
    const registros = expediente?.servicios?.registros || [];
    const vuelosMap = new Map();

    registros.forEach((servicio) => {
      const vuelo = servicio.noVuelo;
      const fechaKey = servicio.fechaInput?.slice(0, 10);
      if (!vuelo || !fechaKey) return;
      if (!vuelosMap.has(vuelo)) {
        vuelosMap.set(vuelo, { fechas: new Set(), sample: servicio });
      }
      const entry = vuelosMap.get(vuelo);
      entry.fechas.add(fechaKey);
      if (!entry.sample) entry.sample = servicio;
    });

    const sequences = [];
    vuelosMap.forEach(({ fechas: fechasSet, sample }, vuelo) => {
      const fechas = Array.from(fechasSet).sort();
      let start = fechas[0];
      let prev = fechas[0];
      let streak = 1;

      const flush = () => {
        if (streak >= 2) {
          sequences.push({
            vuelo,
            inicio: start,
            fin: prev,
            dias: streak,
            origen: sample?.origenVuelo,
            destino: sample?.destinoVuelo,
          });
        }
      };

      for (let i = 1; i < fechas.length; i += 1) {
        const current = fechas[i];
        const prevDate = parseDate(prev);
        const currDate = parseDate(current);
        const diffDays = currDate && prevDate
          ? Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24))
          : 0;
        if (diffDays === 1) {
          streak += 1;
          prev = current;
        } else {
          flush();
          start = current;
          prev = current;
          streak = 1;
        }
      }
      flush();
    });

    return sequences.sort((a, b) => b.dias - a.dias);
  }, [expediente]);

  const calendarDays = useMemo(() => {
    if (!selectedMonth) return [];
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const days = [];

    const padStart = firstDayOfMonth.getDay();
    for (let i = 0; i < padStart; i += 1) {
      days.push({ date: null, label: '', key: `pad-start-${i}` });
    }

    for (let day = 1; day <= lastDayOfMonth.getDate(); day += 1) {
      const date = new Date(year, month, day);
      const key = getDateKey(date);
      const services = key ? serviciosDetallados[key] || [] : [];
      const amonestaciones = key ? amonestacionesDetalladas[key] || [] : [];
      days.push({
        date,
        label: day,
        key,
        totalServicios: key ? serviciosPorDia.get(key) || 0 : 0,
        services,
        amonestaciones,
      });
    }

    const remainder = days.length % 7;
    if (remainder !== 0) {
      const pad = 7 - remainder;
      for (let i = 0; i < pad; i += 1) {
        days.push({ date: null, label: '', key: `pad-end-${i}` });
      }
    }

    return days;
  }, [amonestacionesDetalladas, selectedMonth, serviciosPorDia, serviciosDetallados]);

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!noColaborador) {
      toast.warning('Ingresa un número de colaborador');
      return;
    }
    try {
      setLoading(true);
      const data = await fetchExpediente(token, noColaborador.trim(), {
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
      });
      setExpediente(data);
      const baseDate =
        fechaInicio ||
        data?.servicios?.resumenPorDia?.[0]?.fecha ||
        data?.bitacora?.resumenDiario?.[0]?.fecha ||
        new Date().toISOString().slice(0, 10);

      if (baseDate) {
        setSelectedMonth(new Date(baseDate));
      } else {
        setModalDate(null);
        setModalServices([]);
        setModalAmonestaciones([]);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'No fue posible generar el expediente');
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (delta) => {
    setSelectedMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + delta);
      return next;
    });
  };

  const operador = expediente?.operador;

  return (
    <section className="expediente-page" ref={exportRef}>
      <header className="expediente-header">
        <div>
          <h1>Expediente de operador</h1>
          <p>Consulta todo el historial de servicios, bitácora, amonestaciones y pulseras.</p>
          <button
            type="button"
            className="export-btn"
            onClick={handleExportPdf}
            disabled={!expediente || exporting}
          >
            {exporting ? 'Generando PDF...' : 'Exportar PDF'}
          </button>
          <button
            type="button"
            className="export-btn secondary"
            onClick={() => setExportModalOpen(true)}
            disabled={!expediente}
          >
            Exportar datos (Excel/CSV)
          </button>
          <div className="export-inline">
            <input
              type="text"
              placeholder="Fechas para evidencia (ej: 2025-10-25, 2025-11-11)"
              value={pdfSelectedDates}
              onChange={(e) => setPdfSelectedDates(e.target.value)}
              disabled={!expediente}
            />
            <button
              type="button"
              className="export-btn tertiary"
              onClick={handleExportSelectedPdf}
              disabled={!expediente || exporting}
            >
              {exporting ? 'Generando...' : 'PDF días seleccionados'}
            </button>
          </div>
        </div>
        <form className="expediente-form" onSubmit={handleSearch}>
          <label>
            No. colaborador
            <input
              type="text"
              value={noColaborador}
              onChange={(e) => setNoColaborador(e.target.value)}
              placeholder="Ej. 141"
              required
            />
          </label>
          <label>
            Fecha inicio
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              max={fechaFin || undefined}
            />
          </label>
          <label>
            Fecha fin
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              min={fechaInicio || undefined}
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
      </header>

      {expediente ? (
        <>
          <section className="expediente-summary">
            <div>
              <h2>
                {operador?.nombre} {operador?.apellidos}
                {operador?.siglas ? <span className="operador-siglas">({operador.siglas})</span> : null}
              </h2>
              <p>
                Colaborador #{operador?.noColaborador ?? noColaborador} · Estación{' '}
                {operador?.estacion || 'N/D'}
              </p>
              {encuestaRating ? (
                <div className="rating-row">
                  <div className="stars">{renderStars(encuestaRating.score)}</div>
                  <span className="rating-score">
                    {encuestaRating.score.toFixed(1)} / 5
                  </span>
                  <span className="rating-meta">
                    {encuestaRating.excelentes}/{encuestaRating.total} excelentes
                  </span>
                </div>
              ) : null}
              {encuestaStats?.total ? (
                <div className="survey-row">
                  <span className="survey-coverage">
                    Encuestas: {encuestaStats.conEncuesta}/{encuestaStats.total} (
                    {encuestaStats.cobertura.toFixed(1)}%)
                  </span>
                  {encuestaStats.cobertura < 80 ? (
                    <span className="survey-warning">
                      ¡Presta atención! Favor de solicitar encuesta al finalizar el servicio.
                    </span>
                  ) : (
                    <span className="survey-ok">Cobertura saludable 👍</span>
                  )}
                </div>
              ) : null}
              {encuestaStats?.statusList?.length ? (
                <div className="status-chart">
                  {encuestaStats.statusList.map(({ status, porcentaje, count }) => (
                    <div key={status} className="status-bar">
                      <div
                        className="status-bar-fill"
                        style={{ width: `${porcentaje}%` }}
                        aria-label={`${status}: ${porcentaje.toFixed(1)}%`}
                      />
                      <div className="status-bar-label">
                        <span>{status}</span>
                        <span>{porcentaje.toFixed(1)}% · {count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="summary-stats">
              <div>
                <span>Servicios</span>
                <strong>{expediente.servicios?.total ?? 0}</strong>
              </div>
              <div>
                <span>Bitácora</span>
                <strong>{expediente.bitacora?.total ?? 0}</strong>
              </div>
              <div>
                <span>Amonestaciones</span>
                <strong>{expediente.amonestaciones?.length ?? 0}</strong>
              </div>
              <div>
                <span>Pulseras</span>
                <strong>{expediente.pulseras?.length ?? 0}</strong>
              </div>
            </div>
          </section>

          {alertCards?.length ? (
            <section className="expediente-alerts">
              {alertCards.map((alert, idx) => (
                <div key={idx} className={`alert-card alert-${alert.type}`}>
                  {alert.message}
                </div>
              ))}
            </section>
          ) : null}

          {coincidenciasVuelo?.length ? (
            <section className="expediente-coincidencias">
              <header>
                <h3>Coincidencias (vuelos consecutivos)</h3>
                <p>Vuelos asignados en días seguidos al mismo operador.</p>
              </header>
              <div className="coincidencias-list">
                {coincidenciasVuelo.map((c) => (
                  <div key={`${c.vuelo}-${c.inicio}-${c.fin}`} className="coincidencia-card">
                    <div className="coincidencia-title">
                      <strong>Vuelo {c.vuelo}</strong>
                      {c.dias >= 3 ? <span className="badge-warning">3+ seguidos</span> : null}
                    </div>
                    {(c.origen || c.destino) ? (
                      <div className="coincidencia-ruta">
                        {c.origen || 'N/D'} → {c.destino || 'N/D'}
                      </div>
                    ) : null}
                    <div className="coincidencia-meta">
                      <span>{c.dias} días seguidos</span>
                      <span>
                        Del {formatDate(c.inicio)} al {formatDate(c.fin)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="expediente-calendar-card">
            <header>
              <div>
                <h3>Servicios por día</h3>
                <p>
                  {selectedMonth.toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
              <div className="calendar-controls">
                <button type="button" onClick={() => changeMonth(-1)}>
                  ◀
                </button>
                <button type="button" onClick={() => setSelectedMonth(new Date())}>
                  Hoy
                </button>
                <button type="button" onClick={() => changeMonth(1)}>
                  ▶
                </button>
              </div>
            </header>
            <div className="calendar-grid calendar-weekdays">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="calendar-grid calendar-days">
              {calendarDays.map((day) => {
                if (!day.date) {
                  return <div key={day.key} className="calendar-day placeholder" />;
                }
                const isoKey = getDateKey(day.date);
                const services = day.services || [];
                const amonestaciones = day.amonestaciones || [];
                const hasData = services.length || amonestaciones.length;
                const isSelected = isoKey === modalDate;
                return (
                  <button
                    type="button"
                    key={day.key}
                    className={`calendar-day ${isSelected ? 'selected' : ''} ${
                      hasData ? 'has-data' : ''
                    }`}
                    onClick={() => {
                      if (!hasData) {
                        toast.info('No hay registros para este día.');
                        return;
                      }
                      setModalDate(isoKey);
                      setModalServices(services);
                      setModalAmonestaciones(amonestaciones);
                    }}
                  >
                    <span className="day-number">{day.label}</span>
                    <div className="day-services">
                      {services.slice(0, 3).map((servicio) => (
                        <span key={servicio._id || servicio.pnr} className="day-service-chip">
                          {servicio.noVuelo}
                          <small>{servicio.tipoService}</small>
                        </span>
                      ))}
                      {services.length > 3 ? (
                        <span className="day-service-more">+{services.length - 3}</span>
                      ) : null}
                      {amonestaciones.slice(0, 2).map((amo) => (
                        <span key={amo._id} className="day-amon-chip">
                          ⚠ {amo.sancion || 'AMO'}
                        </span>
                      ))}
                      {amonestaciones.length > 2 ? (
                        <span className="day-amon-more">+{amonestaciones.length - 2}</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="expediente-bitacora">
            <header>
              <h3>Registros de bitácora</h3>
              <p>Total: {expediente.bitacora?.total ?? 0}</p>
            </header>
            <div className="bitacora-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Horas</th>
                    <th>Status</th>
                    <th>Silla</th>
                    <th>Registró</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {bitacoraDetallada.map((registro) => {
                    const horas = getHoursWorked(registro.entrada, registro.salida);
                    let hoursStatus = 'ok';
                    if (horas !== null) {
                      if (horas < 9) hoursStatus = 'low';
                      else if (horas > 10) hoursStatus = 'high';
                    }
                    const warn = hoursStatus !== 'ok';
                    return (
                      <tr key={registro._id} className={warn ? 'worked-hours-row-warning' : ''}>
                        <td>{formatDate(registro.entrada || registro.fecha_registro)}</td>
                        <td>{registro.entrada || 'N/D'}</td>
                        <td>{registro.salida || 'N/D'}</td>
                        <td className={`worked-hours-cell ${warn ? 'worked-hours-warning' : ''}`}>
                          {horas !== null ? `${horas.toFixed(2)} h` : 'N/D'}
                          {hoursStatus === 'low' ? (
                            <span className="worked-hours-badge low">Corto</span>
                          ) : null}
                          {hoursStatus === 'high' ? (
                            <span className="worked-hours-badge high">Largo</span>
                          ) : null}
                        </td>
                        <td>{registro.status || 'N/A'}</td>
                        <td>{registro.noSilla || 'N/A'}</td>
                        <td>{registro.register_by || 'N/A'}</td>
                        <td>{registro.observaciones || 'N/A'}</td>
                      </tr>
                    );
                  })}
                  {!bitacoraDetallada.length && (
                    <tr>
                      <td colSpan={8}>No hay registros de bitácora en el rango solicitado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          {modalDate && (
            <div className="expediente-servicios-modal" role="dialog" aria-modal="true">
              <div className="expediente-servicios-modal__content">
                <header>
                  <div>
                    <h3>Historial del {formatDate(modalDate)}</h3>
                    <p>
                      Servicios: {modalServices.length} · Amonestaciones:{' '}
                      {modalAmonestaciones.length}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalDate(null);
                      setModalServices([]);
                      setModalAmonestaciones([]);
                    }}
                  >
                    ✕
                  </button>
                </header>
                <div className="expediente-servicios-modal__list">
                  {modalServices.length ? (
                    <div className="modal-section">
                      <h4>Servicios</h4>
                      {modalServices.map((servicio) => (
                        <div key={servicio._id || servicio.pnr} className="servicio-card">
                          <div>
                            <strong>{servicio.noVuelo}</strong> · {servicio.aerolinea || 'N/D'}
                            <span className="servicio-status-badge">
                              {servicio.statusServicio || 'N/A'}
                            </span>
                          </div>
                          <div className="servicio-meta">
                            <span>{servicio.tipoService}</span>
                            <span>{servicio.tipoSilla}</span>
                          </div>
                          <div className="servicio-times">
                            <span>Inicio: {formatTime(servicio.horaInicio) || 'N/D'}</span>
                            <span>Fin: {formatTime(servicio.horaFin) || 'N/D'}</span>
                          </div>
                          <div className="servicio-extra">
                            <span>
                              Fecha servicio: {formatDate(servicio.fechaInput || modalDate)}
                              {formatTime(servicio.horaInicio || servicio.horaVuelo)
                                ? ` · Hora vuelo: ${formatTime(servicio.horaInicio || servicio.horaVuelo)}`
                                : ''}
                            </span>
                            <span>PNR: {servicio.pnr}</span>
                          </div>
                          {servicio.encuesta ? (
                            <div className="servicio-encuesta">
                              <div className="servicio-encuesta__row">
                                <span className="servicio-encuesta__label">Calificación:</span>
                                <span className="servicio-encuesta__value">
                                  {servicio.encuesta.calificacion || 'N/D'}
                                </span>
                              </div>
                              <div className="servicio-encuesta__row">
                                <span className="servicio-encuesta__label">Agente:</span>
                                <span className="servicio-encuesta__value">
                                  {servicio.encuesta.agente || 'N/D'}
                                </span>
                              </div>
                              {servicio.encuesta.comentarios ? (
                                <div className="servicio-encuesta__row wrap">
                                  <span className="servicio-encuesta__label">Comentarios:</span>
                                  <span className="servicio-encuesta__value">
                                    {servicio.encuesta.comentarios}
                                  </span>
                                </div>
                              ) : null}
                              {servicio.encuesta.firmaPasajero ? (
                                <div className="servicio-encuesta__firma">
                                  <span className="servicio-encuesta__label">Firma pasajero:</span>
                                  <img
                                    src={servicio.encuesta.firmaPasajero}
                                    alt="Firma del pasajero"
                                  />
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No hay servicios en esta fecha.</p>
                  )}
                  {modalAmonestaciones.length ? (
                    <div className="modal-section">
                      <h4>Amonestaciones</h4>
                      {modalAmonestaciones.map((amo) => (
                        <div key={amo._id} className="servicio-card amon-card">
                          <div>
                            <strong>{amo.sancion || 'Amonestación'}</strong>
                          </div>
                          <div className="servicio-meta">
                            <span>Motivo: {amo.motivo}</span>
                          </div>
                          <div className="servicio-extra">
                            <span>Registró: {amo.noColaboradorRegistro || 'N/D'}</span>
                            <span>Colaborador: {amo.noColaboradorAmonestado}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No hay amonestaciones en esta fecha.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="expediente-placeholder">
          Ingresa un número de colaborador para mostrar el expediente.
        </p>
      )}

      {exportModalOpen ? (
        <div className="export-modal" role="dialog" aria-modal="true">
          <div className="export-modal__content">
            <header className="export-modal__header">
              <h3>Exportar datos</h3>
              <button type="button" onClick={() => setExportModalOpen(false)}>
                ✕
              </button>
            </header>
            <div className="export-modal__grid">
              <div className="export-modal__section">
                <label className="export-modal__label">
                  Dataset
                  <select
                    value={exportDataset}
                    onChange={(e) => setExportDataset(e.target.value)}
                  >
                    <option value="servicios">Servicios</option>
                    <option value="bitacora">Bitácora</option>
                  </select>
                </label>
                <label className="export-modal__label">
                  Formato
                  <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="csv">CSV</option>
                  </select>
                </label>
              </div>

              {exportDataset === 'bitacora' ? (
                <div className="export-modal__section export-modal__range">
                  <label>
                    Desde
                    <input
                      type="date"
                      value={exportBitacoraDesde}
                      onChange={(e) => setExportBitacoraDesde(e.target.value)}
                    />
                  </label>
                  <label>
                    Hasta
                    <input
                      type="date"
                      value={exportBitacoraHasta}
                      onChange={(e) => setExportBitacoraHasta(e.target.value)}
                    />
                  </label>
                </div>
              ) : null}

              <div className="export-modal__fields">
                <div className="export-modal__fields-header">
                  <h4>Campos a incluir</h4>
                  <button
                    type="button"
                    onClick={() => {
                      if (exportDataset === 'servicios') {
                        setSelectedServicioFields(SERVICIO_FIELD_OPTIONS.map((f) => f.key));
                      } else {
                        setSelectedBitacoraFields(BITACORA_FIELD_OPTIONS.map((f) => f.key));
                      }
                    }}
                  >
                    Seleccionar todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (exportDataset === 'servicios') {
                        setSelectedServicioFields([]);
                      } else {
                        setSelectedBitacoraFields([]);
                      }
                    }}
                  >
                    Limpiar
                  </button>
                </div>
                <div className="export-modal__fields-list">
                  {(exportDataset === 'servicios' ? SERVICIO_FIELD_OPTIONS : BITACORA_FIELD_OPTIONS).map(
                    (field) => {
                      const selected =
                        exportDataset === 'servicios'
                          ? selectedServicioFields.includes(field.key)
                          : selectedBitacoraFields.includes(field.key);
                      return (
                        <label key={field.key} className="field-checkbox">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleField(field.key, exportDataset)}
                          />
                          {field.label}
                        </label>
                      );
                    },
                  )}
                </div>
              </div>
            </div>
            <footer className="export-modal__footer">
              <button type="button" onClick={() => setExportModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="export-primary" onClick={exportData}>
                Exportar
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ExpedientePage;
