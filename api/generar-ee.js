export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { planADL, planMate } = req.body;
  if (!planADL || !planMate) return res.status(400).json({ error: 'Faltan planes' });

  const system = `Eres asistente de planificación de Héctor Lozada Lacén, maestro de tercer grado, Escuela Celso González Vaillant, Loíza, PR.

Tu tarea es generar objetivos simplificados para la Hoja de Coordinación de Educación Especial.

INSTRUCCIONES:
- Reformula los objetivos de forma más corta y directa para estudiantes de EE
- Máximo 2-3 objetivos por día por materia
- Formato: a) verbo + contenido. b) verbo + contenido.
- NO copies exacto — simplifica para EE

FORMATO DE RESPUESTA OBLIGATORIO — NO uses JSON. Usa este formato exacto:

###DIA###nombre_del_dia
###ADL###objetivos ADL aquí
###MATE###objetivos Matemática aquí
###FIN_DIA###

Genera un bloque por cada día. Puedes usar cualquier carácter dentro del texto.`;

  const diasADL = planADL.dias.map(d => `${d.dia}: ${d.objetivos}`).join('\n');
  const diasMate = planMate.dias.map(d => `${d.dia}: ${d.objetivos}`).join('\n');

  const prompt = `Genera objetivos EE para la semana ${planADL.meta.semana}.

OBJETIVOS ADL (${planADL.meta.tema}):
${diasADL}

OBJETIVOS MATEMÁTICA (${planMate.meta.tema}):
${diasMate}

Días a incluir: ${planADL.dias.map(d => d.dia).join(', ')}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const raw = data.content.map(b => b.text || '').join('');

    // Parse delimited format
    const dias = [];
    const dayPattern = /###DIA###(\w+)\n([\s\S]*?)###FIN_DIA###/g;
    let match;
    while ((match = dayPattern.exec(raw)) !== null) {
      const block = match[2];
      const adlMatch = block.match(/###ADL###([\s\S]*?)(?=###|$)/);
      const mateMatch = block.match(/###MATE###([\s\S]*?)(?=###|$)/);
      dias.push({
        dia: match[1].trim(),
        objetivosADL: adlMatch ? adlMatch[1].trim() : '',
        objetivosMate: mateMatch ? mateMatch[1].trim() : ''
      });
    }

    const result = { dias };
    return res.status(200).json({ content: [{ type: 'text', text: JSON.stringify(result) }] });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
