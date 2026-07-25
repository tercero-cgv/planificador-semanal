export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cronograma } = req.body;
  if (!cronograma) return res.status(400).json({ error: 'Falta el texto del cronograma' });

  const system = `Eres un asistente que ayuda a Héctor Lozada Lacén, maestro de tercer grado, a preparar cronogramas de enseñanza para su planificador semanal.

Vas a recibir un cronograma o mapa curricular ya redactado (puede venir como texto plano, una tabla copiada, o una lista con varias sesiones/días por semana). Tu tarea es dividirlo en semanas de enseñanza y, para cada semana, extraer:
- "tema": un tema breve y concreto para esa semana (máximo 12 palabras), pensado para el campo "Tema de la semana" de un formulario de planificación.
- "destrezas": lista corta de destrezas o contenido clave de esa semana, separadas por comas, pensada para el campo "Destrezas o contenido clave".
- "continuidad": un resumen de 1-2 oraciones de lo que se cubrió la semana ANTERIOR, para dar continuidad al plan siguiente. Déjalo vacío ("") en la primera semana.

Si el cronograma trae varias sesiones o días por semana, combínalas en un solo resumen por semana — no generes una entrada por día ni por sesión individual.

También identifica, si aparecen en el texto:
- "unidad": el nombre de la unidad curricular.
- "materia": una de "Adquisición de la Lengua", "Matemática" o "Ciencias" (si no es clara por el contenido, usa "Matemática").

Devuelve SOLO JSON sin texto adicional, con este formato exacto:
{"unidad":"","materia":"","semanas":[{"semana":1,"tema":"","destrezas":"","continuidad":""}]}`;

  const prompt = `Extrae las semanas del siguiente cronograma y devuelve el JSON pedido:\n\n${cronograma}`;

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
        max_tokens: 4000,
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
