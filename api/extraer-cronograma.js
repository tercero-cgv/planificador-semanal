export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cronograma } = req.body;
  if (!cronograma) return res.status(400).json({ error: 'Falta el texto del cronograma' });

  const system = `Eres un asistente que ayuda a Héctor Lozada Lacén, maestro de tercer grado, a preparar cronogramas de enseñanza para su planificador semanal.

Vas a recibir un cronograma o mapa curricular ya redactado, con detalle DÍA POR DÍA (puede traer etiquetas como "Semana 1 - Día 1", "S1-D1", tablas copiadas, etc.). Lo que más le importa a Héctor es justamente ese detalle diario — NO lo resumas ni lo colapses por semana. Tu tarea es:

1. Agrupar los días en semanas de enseñanza (normalmente 5 días de clase por semana).
2. Mapear la secuencia de días de cada semana a los días reales lunes a viernes, en orden (el primer día de la semana = lunes, el segundo = martes, y así sucesivamente). Si una semana trae menos de 5 días, incluye solo los que traiga.
3. Para CADA día individual, extraer:
   - "dia": lunes/martes/miércoles/jueves/viernes según su posición en la semana.
   - "tema": el tema o destreza específica de ESE día (no el de toda la semana).
   - "destrezas": destrezas o contenido clave de ese día, separadas por comas.
   - "actividad": la actividad sugerida de ese día, tal como aparece en el cronograma (no la inventes ni la generalices).
   - "ejemplo": el ejemplo concreto asociado a esa actividad, si el cronograma lo trae.
   - "evaluacion": la evaluación o evidencia de ese día, si aparece.
   - "andamiaje": el andamiaje o apoyo sugerido de ese día, si aparece.
4. Para cada semana, agrega también "continuidad": un resumen de 1-2 oraciones de lo que se cubrió la semana ANTERIOR (vacío "" en la primera semana).

También identifica, si aparecen en el texto:
- "unidad": el nombre de la unidad curricular.
- "materia": una de "Adquisición de la Lengua", "Matemática" o "Ciencias" (si no es clara por el contenido, usa "Matemática").

No omitas días ni los combines entre sí — cada día del cronograma debe tener su propia entrada en "dias".

Devuelve SOLO JSON sin texto adicional, con este formato exacto:
{"unidad":"","materia":"","semanas":[{"semana":1,"continuidad":"","dias":[{"dia":"lunes","tema":"","destrezas":"","actividad":"","ejemplo":"","evaluacion":"","andamiaje":""}]}]}`;

  const prompt = `Extrae las semanas y los días del siguiente cronograma y devuelve el JSON pedido. Recuerda: el detalle día por día es lo importante, no lo resumas:\n\n${cronograma}`;

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
        max_tokens: 8000,
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
