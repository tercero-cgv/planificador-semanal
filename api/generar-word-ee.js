const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  CheckBox
} = require('docx');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { planADL, planMate, objetivosEE, maestraEE } = req.body;
    if (!planADL || !planMate || !objetivosEE) return res.status(400).json({ error: 'Faltan datos' });

    const TW = 9360;
    const border = { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' };
    const borders = { top: border, bottom: border, left: border, right: border };
    const margins = { top: 80, bottom: 80, left: 100, right: 100 };

    function t(text, bold, size, color) {
      return new TextRun({ text: String(text || ''), font: 'Arial', size: size || 18, bold: !!bold, color: color || '000000' });
    }

    function p(runs, center) {
      return new Paragraph({
        alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 40 },
        children: Array.isArray(runs) ? runs : [runs]
      });
    }

    function cell(content, width, shade, bold) {
      const lines = String(content || '').split('\n').filter(l => l.trim());
      const paras = lines.length
        ? lines.map(line => p(t(line, bold, 16)))
        : [p(t(''))];
      return new TableCell({
        borders, margins,
        width: { size: width, type: WidthType.DXA },
        shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
        verticalAlign: VerticalAlign.TOP,
        children: paras
      });
    }

    function headerCell(text, width, shade) {
      return new TableCell({
        borders, margins,
        width: { size: width, type: WidthType.DXA },
        shading: { fill: shade || 'D5E8D4', type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        children: [p(t(text, true, 17), true)]
      });
    }

    // Extraer datos
    const meta = planADL.meta;
    const metaMate = planMate.meta;
    const dias = objetivosEE.dias;

    // Estándares ADL marcados
    const estandaresADL = [
      'Comprensión auditiva y expresión oral',
      'Lectura de textos literarios informativos',
      'Dominio de la lengua',
      'Escritura y producción de textos'
    ];
    const estandaresMate = [
      'Numeración y Operación',
      'Algebra',
      'Geometría',
      'Medición'
    ];

    // Detectar cuáles estándares aplican según el plan
    const expectADL = planADL.dias[0]?.expectativas || '';
    const expectMate = planMate.dias[0]?.expectativas || '';

    function chk(condition) { return condition ? '☒' : '☐'; }

    const stdADLText = estandaresADL.map(e => {
      const marks = {
        'Comprensión auditiva y expresión oral': expectADL.includes('AO'),
        'Lectura de textos literarios informativos': expectADL.includes('LLI'),
        'Dominio de la lengua': expectADL.includes('3.L.'),
        'Escritura y producción de textos': expectADL.includes('3.E.')
      };
      return `${chk(marks[e])} ${e}`;
    }).join('\n');

    const stdMateText = estandaresMate.map(e => {
      const marks = {
        'Numeración y Operación': expectMate.includes('3.N.'),
        'Algebra': expectMate.includes('3.A.'),
        'Geometría': expectMate.includes('3.G.'),
        'Medición': expectMate.includes('3.M.')
      };
      return `${chk(marks[e])} ${e}`;
    }).join('\n');

    const half = TW / 2;
    const third = Math.floor(TW / 3);
    const dayW = Math.floor(TW / 5);

    const children = [
      // Título
      p([t('Hoja de Coordinación del Maestro Regular con el Maestro de', true, 22)], true),
      p([t('Educación Especial de Salón Recurso.', true, 22)], true),
      new Paragraph({ spacing: { after: 100 } }),

      // Info básica
      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [half, Math.floor(half * 0.4), Math.floor(half * 0.6)],
        rows: [
          new TableRow({ children: [
            new TableCell({
              borders, margins,
              width: { size: half, type: WidthType.DXA },
              rowSpan: 2,
              children: [
                p([t('Nombre del maestro:', true, 16)]),
                p(t('Héctor Lozada Lacén', false, 16))
              ]
            }),
            cell('Fecha:', Math.floor(half * 0.4), null, true),
            cell(meta.fecha || '', Math.floor(half * 0.6))
          ]}),
          new TableRow({ children: [
            cell('al', Math.floor(half * 0.4), null, true),
            cell('', Math.floor(half * 0.6))
          ]})
        ]
      }),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [half, half],
        rows: [
          new TableRow({ children: [
            new TableCell({
              borders, margins,
              width: { size: half, type: WidthType.DXA },
              children: [
                p([t('Grado: ', true, 16), t('Tercero', false, 16)]),
                p(t('☒ Español', false, 16)),
                p(t('☒ Matemáticas', false, 16))
              ]
            }),
            new TableCell({
              borders, margins,
              width: { size: half, type: WidthType.DXA },
              children: [
                p([t('Unidad Adquisición de la Lengua: ', true, 16), t(meta.unidad || '', false, 16)]),
                p([t('Unidad de Matemática: ', true, 16), t(metaMate.unidad || '', false, 16)])
              ]
            })
          ]}),
          new TableRow({ children: [
            new TableCell({
              borders, margins,
              width: { size: half, type: WidthType.DXA },
              children: [
                p([t('Tema: ', true, 16)]),
                p(t(meta.tema || '', false, 16))
              ]
            }),
            new TableCell({
              borders, margins,
              width: { size: half, type: WidthType.DXA },
              children: [
                p([t('Tema: ', true, 16)]),
                p(t(metaMate.tema || '', false, 16))
              ]
            })
          ]})
        ]
      }),

      new Paragraph({ spacing: { after: 60 } }),

      // Estándares
      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [half, half],
        rows: [
          new TableRow({ children: [
            headerCell('Estándares de Español', half, 'E8E8E8'),
            headerCell('Estándares de Matemáticas', half, 'E8E8E8')
          ]}),
          new TableRow({ children: [
            cell(stdADLText, half),
            cell(stdMateText, half)
          ]})
        ]
      }),

      new Paragraph({ spacing: { after: 60 } }),

      // Expectativas
      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [half, half],
        rows: [
          new TableRow({ children: [
            headerCell('Expectativas o indicadores de Español', half, 'E8E8E8'),
            headerCell('Expectativas o indicadores de Matemáticas', half, 'E8E8E8')
          ]}),
          new TableRow({ children: [
            cell(planADL.dias[0]?.expectativas || '', half),
            cell(planMate.dias[0]?.expectativas || '', half)
          ]})
        ]
      }),

      new Paragraph({ spacing: { after: 60 } }),

      // Tabla de objetivos por día
      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [Math.floor(TW * 0.12), Math.floor(TW * 0.44), Math.floor(TW * 0.44)],
        rows: [
          new TableRow({ children: [
            headerCell('Día', Math.floor(TW * 0.12), 'E8E8E8'),
            headerCell('Objetivos ADL', Math.floor(TW * 0.44), 'E8E8E8'),
            headerCell('Objetivos MATE', Math.floor(TW * 0.44), 'E8E8E8')
          ]}),
          ...dias.map(d => new TableRow({ children: [
            cell(d.dia.charAt(0).toUpperCase() + d.dia.slice(1), Math.floor(TW * 0.12), 'F5F5F5', true),
            cell(d.objetivosADL || '', Math.floor(TW * 0.44)),
            cell(d.objetivosMate || '', Math.floor(TW * 0.44))
          ]}))
        ]
      }),

      new Paragraph({ spacing: { after: 120 } }),

      // Nota EE
      p([t('** Atención especial en lectura para los estudiantes de Educación Especial.', true, 16, 'CC0000')]),

      new Paragraph({ spacing: { after: 200 } }),

      // Firmas
      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [half, half],
        rows: [
          new TableRow({ children: [
            new TableCell({
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              margins,
              width: { size: half, type: WidthType.DXA },
              children: [
                p(t('Firma del maestro regular: ____________________________', false, 16)),
                p(t('Héctor Lozada Lacén', false, 14))
              ]
            }),
            new TableCell({
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              margins,
              width: { size: half, type: WidthType.DXA },
              children: [
                p(t(`Maestra de Educación Especial: ____________________________`, false, 16)),
                p(t(maestraEE || 'Por asignar', false, 14))
              ]
            })
          ]})
        ]
      })
    ];

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Arial', size: 18 } } } },
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

    const buffer = await Packer.toBuffer(doc);
    const semana = planADL.meta.semana || '';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="HojaEE_Semana${semana}.docx"`);
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);

  } catch (e) {
    console.error('EE Word error:', e);
    return res.status(500).json({ error: e.message });
  }
};
