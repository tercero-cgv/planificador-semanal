export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { system, prompt } = req.body;
  if (!system || !prompt) return res.status(400).json({ error: 'Faltan parámetros' });

  const systemFinal = system + `

FORMATO DE RESPUESTA OBLIGATORIO — USA EXACTAMENTE ESTE FORMATO:
No uses JSON. Usa marcadores de texto plano. Cada marcador en su propia línea.

###META_SEMANA###valor
###META_FECHA###valor
###META_MATERIA###valor
###META_TEMA###valor
###META_UNIDAD###valor
###META_TRANSVERSALES###item1|item2|item3
###META_GENERADORES###item1|item2

Para cada día usa este bloque:
###DIA###nombre_del_dia
###OBJETIVOS###texto aquí
###INICIO###texto aquí
###DESARROLLO###texto aquí
###CIERRE###texto aquí
###AVALUO###texto aquí
###MATERIALES###texto aquí
###REFLEXION###texto aquí
###FIN_DIA###

Genera un bloque DIA...FIN_DIA por cada día solicitado.
Puedes usar comillas, acentos y cualquier carácter dentro del texto — no hay restricciones.`;

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
        max_tokens: 8000,
        system: systemFinal,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const raw = data.content.map(b => b.text || '').join('');
    const plan = parseDelimited(raw);
    return res.status(200).json({ content: [{ type: 'text', text: JSON.stringify(plan) }] });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function getField(text, marker) {
  const pattern = new RegExp(`###${marker}###([\\s\\S]*?)(?=###[A-Z_]+###|$)`);
  const match = text.match(pattern);
  return match ? match[1].trim() : '';
}

function parseDelimited(raw) {
  const meta = {
    semana: getField(raw, 'META_SEMANA'),
    fecha: getField(raw, 'META_FECHA'),
    materia: getField(raw, 'META_MATERIA'),
    tema: getField(raw, 'META_TEMA'),
    unidad: getField(raw, 'META_UNIDAD'),
    transversales: getField(raw, 'META_TRANSVERSALES').split('|').map(s => s.trim()).filter(Boolean),
    generadores: getField(raw, 'META_GENERADORES').split('|').map(s => s.trim()).filter(Boolean)
  };

  const dias = [];
  const dayPattern = /###DIA###(\w+)\n([\s\S]*?)###FIN_DIA###/g;
  let match;
  while ((match = dayPattern.exec(raw)) !== null) {
    dias.push({
      dia: match[1].trim(),
      objetivos: getField(match[2], 'OBJETIVOS'),
      inicio: getField(match[2], 'INICIO'),
      desarrollo: getField(match[2], 'DESARROLLO'),
      cierre: getField(match[2], 'CIERRE'),
      avaluo: getField(match[2], 'AVALUO'),
      materiales: getField(match[2], 'MATERIALES'),
      reflexion: getField(match[2], 'REFLEXION')
    });
  }

  return { meta, dias };
}
