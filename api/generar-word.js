const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageOrientation, HeadingLevel
} = require('docx');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plan } = req.body;
  if (!plan) return res.status(400).json({ error: 'Falta el plan' });

  try {
    const buffer = await generarDocx(plan);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Plan_Semana${plan.meta.semana}.docx"`);
    return res.status(200).send(buffer);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// ─── Helpers ──────────────────────────────────────────────────
const border = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function txt(text, opts = {}) {
  return new TextRun({ text: String(text || ''), font: 'Arial', size: opts.size || 18, bold: opts.bold || false, color: opts.color || '000000' });
}

function para(children, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before || 0, after: opts.after || 60 },
    children: Array.isArray(children) ? children : [children]
  });
}

function cell(content, opts = {}) {
  const children = typeof content === 'string'
    ? content.split('\n').filter(Boolean).map(line => para(txt(line, { size: opts.textSize || 16 })))
    : content;
  return new TableCell({
    borders,
    margins: cellMargins,
    width: { size: opts.width || 1000, type: WidthType.DXA },
    shading: opts.shade ? { fill: opts.shade, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.TOP,
    columnSpan: opts.span || 1,
    children: children.length ? children : [para(txt(''))]
  });
}

function headerCell(text, width) {
  return new TableCell({
    borders,
    margins: cellMargins,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: 'FFD966', type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    children: [para(txt(text, { bold: true, size: 16 }), { align: AlignmentType.CENTER })]
  });
}

function sectionRow(label, values, labelWidth, colWidth) {
  return new TableRow({
    children: [
      cell(label, { width: labelWidth, shade: 'E8F4E8', textSize: 16 }),
      ...values.map(v => cell(v, { width: colWidth, textSize: 15 }))
    ]
  });
}

// ─── Construcción del documento ───────────────────────────────
async function generarDocx(plan) {
  const { meta, dias } = plan;
  const children = [];

  // ── Título ────────────────────────────────────────────────
  children.push(para(txt('Plan Semanal del Maestro', { bold: true, size: 28 }), { align: AlignmentType.CENTER, after: 120 }));
  children.push(para(txt(`Semana ${meta.semana}`, { size: 18 }), { after: 80 }));

  // ── Tabla de encabezado (nombre, fecha, grado, materia, tema, unidad) ─
  const TW = 9360; // tabla = 9360 DXA (página carta 1" márgenes landscape sería mayor; usamos portrait)
  const half = TW / 2;

  children.push(new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths: [half, half],
    rows: [
      new TableRow({ children: [
        cell([para([txt('Nombre del maestro: ', { bold: true, size: 17 }), txt('Héctor Lozada Lacén', { size: 17 })])], { width: half }),
        cell([para([txt('Fecha: ', { bold: true, size: 17 }), txt(meta.fecha || '', { size: 17 })])], { width: half })
      ]}),
      new TableRow({ children: [
        cell([para([txt('Grado: ', { bold: true, size: 17 }), txt('Tercero', { size: 17 })])], { width: half }),
        cell([para([txt('Materia: ', { bold: true, size: 17 }), txt(meta.materia || '', { size: 17 })])], { width: half })
      ]}),
      new TableRow({ children: [
        cell([para([txt('Tema: ', { bold: true, size: 17 }), txt(meta.tema || '', { size: 17 })])], { width: half }),
        cell([para([txt('Unidad: ', { bold: true, size: 17 }), txt(meta.unidad || '', { size: 17 })])], { width: half })
      ]})
    ]
  }));

  children.push(para(txt('')));

  // ── Temas transversales y generadores ─────────────────────
  const transversalesTexto = (Array.isArray(meta.transversales) ? meta.transversales : []).map(t => `☒ ${t}`).join('\n');
  const generadoresTexto   = (Array.isArray(meta.generadores)   ? meta.generadores   : []).map(g => `☒ ${g}`).join('\n');

  children.push(new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths: [half, half],
    rows: [
      new TableRow({ children: [
        cell([para(txt('Temas transversales:', { bold: true, size: 17 }))], { width: half }),
        cell([para(txt('Temas generadores:', { bold: true, size: 17 }))], { width: half })
      ]}),
      new TableRow({ children: [
        cell(transversalesTexto, { width: half, textSize: 15 }),
        cell(generadoresTexto,   { width: half, textSize: 15 })
      ]})
    ]
  }));

  children.push(para(txt('')));

  // ── Tabla principal de días ───────────────────────────────
  const numDias = dias.length;
  const labelW  = 1100;
  const colW    = Math.floor((TW - labelW) / numDias);
  const colWidths = [labelW, ...Array(numDias).fill(colW)];

  // Ajustar último col para que sumen exacto
  const totalCols = colWidths.reduce((a,b) => a+b, 0);
  if (totalCols !== TW) colWidths[colWidths.length - 1] += (TW - totalCols);

  const secciones = [
    { key: 'estandares',  label: 'Estándares' },
    { key: 'expectativas',label: 'Expectativas' },
    { key: 'objetivos',   label: 'Objetivos' },
    { key: 'inicio',      label: 'Inicio' },
    { key: 'desarrollo',  label: 'Desarrollo' },
    { key: 'cierre',      label: 'Cierre' },
    { key: 'avaluo',      label: 'Evidencia de Avalúo' },
    { key: 'proyecto',    label: 'Proyecto Innovador' },
    { key: 'acomodos',    label: 'Acomodos Ed. Especial' },
    { key: 'diferenciada',label: 'Enseñanza Diferenciada' },
    { key: 'integracion', label: 'Integración con' },
    { key: 'materiales',  label: 'Materiales' },
    { key: 'reflexion',   label: 'Reflexión de la Praxis' }
  ];

  const mainRows = [];

  // Fila de encabezado de días
  mainRows.push(new TableRow({
    children: [
      new TableCell({
        borders, margins: cellMargins,
        width: { size: labelW, type: WidthType.DXA },
        children: [para(txt(''))]
      }),
      ...dias.map((d, i) => headerCell(d.dia.charAt(0).toUpperCase() + d.dia.slice(1), colWidths[i+1]))
    ]
  }));

  // Filas de contenido
  for (const sec of secciones) {
    mainRows.push(new TableRow({
      children: [
        new TableCell({
          borders, margins: cellMargins,
          width: { size: labelW, type: WidthType.DXA },
          shading: { fill: 'D5E8D4', type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.TOP,
          children: [para(txt(sec.label, { bold: true, size: 16 }))]
        }),
        ...dias.map((d, i) => {
          const raw = d[sec.key];
          const val = typeof raw === 'string' ? raw
            : Array.isArray(raw) ? raw.join('\n')
            : (raw != null ? String(raw) : '');
          const lines = val.split('\n');
          const paras = lines.map(line => para(txt(line, { size: 15 }), { after: 30 }));
          return new TableCell({
            borders, margins: cellMargins,
            width: { size: colWidths[i+1], type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            children: paras.length ? paras : [para(txt(''))]
          });
        })
      ]
    }));
  }

  children.push(new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths,
    rows: mainRows
  }));

  // ── Construir y devolver buffer ───────────────────────────
  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 18 } } }
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 720, right: 720, bottom: 720, left: 720 }
        }
      },
      children
    }]
  });

  return await Packer.toBuffer(doc);
}
