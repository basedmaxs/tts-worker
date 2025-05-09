addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM'; // Voice ID ElevenLabs (Rachel)
const DEFAULT_SPEED = 1.0;
const DEFAULT_SIMILARITY = 0.75;
const DEFAULT_STYLE = 0.0;
const DEFAULT_STABILITY = 0.15;

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, xi-api-key'
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const { 
      text, 
      voice = DEFAULT_VOICE, 
      speed = DEFAULT_SPEED, 
      similarity = DEFAULT_SIMILARITY, 
      style = DEFAULT_STYLE,
      stability = DEFAULT_STABILITY 
    } = await request.json();
    const apiKey = request.headers.get('xi-api-key');

    if (!text) throw new Error('Text is required');
    if (!apiKey) throw new Error('API key is required');
    validateSpeed(speed);
    validateSimilarity(similarity);
    validateStyle(style);
    validateStability(stability);

    const audioResponse = await getTTS(text, voice, apiKey, similarity, style, stability);

    return new Response(audioResponse, {
      headers: { 'Content-Type': 'audio/mpeg', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

function validateSpeed(speed) {
  const minSpeed = 0.5;
  const maxSpeed = 2.0;
  const parsedSpeed = parseFloat(speed);
  if (isNaN(parsedSpeed) || parsedSpeed < minSpeed || parsedSpeed > maxSpeed) {
    throw new Error(`Speed must be a number between ${minSpeed} and ${maxSpeed}`);
  }
  if (!isValidStep(parsedSpeed, minSpeed, 0.05)) {
    throw new Error(`Speed must be in increments of 0.05`);
  }
}

function validateSimilarity(similarity) {
  const minSimilarity = 0.0;
  const maxSimilarity = 1.0;
  const parsedSimilarity = parseFloat(similarity);
  if (isNaN(parsedSimilarity) || parsedSimilarity < minSimilarity || parsedSimilarity > maxSimilarity) {
    throw new Error(`Similarity boost must be a number between ${minSimilarity} and ${maxSimilarity}`);
  }
  if (!isValidStep(parsedSimilarity, minSimilarity, 0.05)) {
    throw new Error(`Similarity boost must be in increments of 0.05`);
  }
}

function validateStyle(style) {
  const minStyle = 0.0;
  const maxStyle = 1.0;
  const parsedStyle = parseFloat(style);
  if (isNaN(parsedStyle) || parsedStyle < minStyle || parsedStyle > maxStyle) {
    throw new Error(`Style must be a number between ${minStyle} and ${maxStyle}`);
  }
  if (!isValidStep(parsedStyle, minStyle, 0.05)) {
    throw new Error(`Style must be in increments of 0.05`);
  }
}

function validateStability(stability) {
  const minStability = 0.0;
  const maxStability = 1.0;
  const parsedStability = parseFloat(stability);
  if (isNaN(parsedStability) || parsedStability < minStability || parsedStability > maxStability) {
    throw new Error(`Stability must be a number between ${minStability} and ${maxStability}`);
  }
  if (!isValidStep(parsedStability, minStability, 0.05)) {
    throw new Error(`Stability must be in increments of 0.05`);
  }
}

function isValidStep(value, min, step) {
  const steps = (value - min) / step;
  return Math.abs(steps - Math.round(steps)) < 0.0001;
}

async function getTTS(text, voice, apiKey, similarity, style, stability) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'accept': 'audio/mpeg',
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: parseFloat(stability),
        similarity_boost: parseFloat(similarity),
        style: parseFloat(style)
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`ElevenLabs API error: ${errorData.detail?.message || 'Unknown error'}`);
  }

  return response.body;
}
