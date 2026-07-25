export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { planADL, planMate } = req.body;
  if (!planADL || !planMate) return res.status(400).json({ error: 'Faltan planes' });

  const system = `Eres asistente de planificación de Héctor Lozada Lacén, maestro de tercer grado, Escuela Celso González Vaillant, Loíza, PR.

Tu tarea es generar los objetivos para la Hoja de Coordinación del Maestro Regular con el Maestro de Educación Especial de Salón Recurso.

INSTRUCCIONES:
- Reformula los objetivos del plan semanal de forma más corta, directa y adaptada para estudiantes de Educación Especial
- Usa lenguaje claro y accesible, sin frases de evaluación complejas
- Mantén el enfoque en las destrezas esenciales de cada día
- Máximo 2-3 objetivos por día por materia
- Formato: "a) verbo + contenido. b) verbo + contenido."
- NO copies los objetivos exactos del plan — simplifícalos para EE

Devuelve SOLO JSON sin texto adicional:
{
  "dias": [
    {
      "dia": "lunes",
      "objetivosADL": "a) ...\nb) ...",
      "objetivosMate": "a) ...\nb) ..."
    }
  ]
}`;

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
        model: 'claude-sonnet-5',
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
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
